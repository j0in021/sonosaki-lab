import { QUESTION_BANK, ALL_QUESTIONS, FACETS, FACET_LABELS, BROAD_GROUPS, MAX_QUESTIONS } from './questions.js';
export { MAX_QUESTIONS };
export const MIN_COUNT=1, MAX_COUNT=20, MIN_REASONS=3;
// Policy assumptions for an uncalibrated preference model, NOT measured reliability.
export const MODEL_POLICY=Object.freeze({responseConsistency:.75,informationThresholdBits:.01,minReasons:3});
let context=null;
const entropy=p=>p<=0||p>=1?0:-p*Math.log2(p)-(1-p)*Math.log2(1-p);
export function validateCount(value){const n=Number(value);if(!Number.isInteger(n)||n<1||n>20)throw new RangeError('候補の数は1〜20の整数で選んでください。');return n;}
export const optionsFor=question=>question.options;
export function validateAnswer(question,ids){return !!question&&Array.isArray(ids)&&ids.length===1&&question.options.some(o=>o.id===ids[0]);}
function rng(seed){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function hash(text){let h=2166136261;for(const c of text){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
export function shuffled(items,seed=0){const list=[...items],random=rng(seed);for(let i=list.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[list[i],list[j]]=[list[j],list[i]];}return list;}
export function configureCatalog(labs){
 const eligible=labs.filter(l=>l.eligible&&l.id&&l.url&&Object.keys(l.topics||{}).length);
 const byKey=new Map();
 for(const lab of eligible){const key=Object.keys(lab.topics).sort().join('|');if(!byKey.has(key))byKey.set(key,{key,tags:new Set(Object.keys(lab.topics)),labs:[]});byKey.get(key).labs.push(lab);}
 const profiles=[...byKey.values()];
 const relevant=Object.fromEntries(QUESTION_BANK.map(q=>[q.id,profiles.map(p=>q.topics.some(t=>p.tags.has(t)))]));
 context={labs,eligible,profiles,relevant,cache:new Map()};
 return {eligible:eligible.length,profiles:profiles.length};
}
export function buildProfile(answers=[]){
 const topics=Object.create(null),traces=[];
 for(const a of answers){const q=ALL_QUESTIONS[a.questionId];if(!q||!validateAnswer(q,a.optionIds)||a.optionIds[0]!==q.id+'_yes')continue;
  // Broad/hobby answers guide navigation, but cannot supply a research recommendation reason.
  if(q.stage==='topic')for(const t of q.topics)topics[t]=(topics[t]||0)+1;
  traces.push({questionId:q.id,label:q.title,topics:q.topics,facet:q.facet,stage:q.stage});
 }
 return {topics,traces,hasTopicSignals:Object.keys(topics).length>0};
}
export function topTopics(profile,map,limit=5){return Object.entries(profile.topics).filter(([id])=>map[id]).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,limit).map(([id])=>map[id]);}
export function reasonsFor(profile,lab){
 const matching=profile.traces.filter(t=>t.stage==='topic'&&t.topics.some(id=>lab.topics[id]));
 const reasons=[];
 for(const facet of FACETS){const trace=matching.find(t=>t.facet===facet);if(trace)reasons.push({questionId:trace.questionId,facet,label:trace.label,topicId:trace.topics.find(id=>lab.topics[id]),sourceURL:lab.sources.description||lab.sources.directory[0]});}
 return reasons;
}
function model(answers,consistency=MODEL_POLICY.responseConsistency){
 if(!context)throw new Error('研究データの準備ができていません。');
 const {profiles,relevant}=context;
 const logs=profiles.map(()=>0);
 const yes=Math.log(consistency),no=Math.log(1-consistency);
 for(const a of answers){const q=ALL_QUESTIONS[a.questionId];if(!q||!validateAnswer(q,a.optionIds))continue;const positive=a.optionIds[0]===q.id+'_yes';for(let i=0;i<profiles.length;i++)logs[i]+=relevant[q.id][i]===positive?yes:no;}
 const peak=Math.max(...logs);
 // Every eligible record has equal prior mass. Grouping identical attributes only speeds calculation.
 const masses=logs.map((log,i)=>Math.exp(log-peak)*profiles[i].labs.length);
 const total=masses.reduce((a,b)=>a+b,0);
 const weights=masses.map(x=>x/total);
 return {logs,weights};
}
export function expectedInformationGain(question,weights,consistency=MODEL_POLICY.responseConsistency){
 const relevant=context.relevant[question.id];let mass=0;for(let i=0;i<weights.length;i++)if(relevant[i])mass+=weights[i];
 const predictedYes=(1-consistency)+(2*consistency-1)*mass;
 return Math.max(0,entropy(predictedYes)-entropy(consistency));
}
function distinctResearchers(labs){return new Set(labs.map(l=>l.leadResearcherKey||l.id)).size;}
export function qualifiedLabs(labs,answers){const p=buildProfile(answers);return labs.filter(l=>l.eligible&&reasonsFor(p,l).length>=MIN_REASONS);}
function computeState(answers,count,seed,continueAfterStop=false){
 const {profiles}=context;
 const profile=buildProfile(answers),used=new Set(answers.map(a=>a.questionId));
 const remaining=QUESTION_BANK.filter(q=>!used.has(q.id));
 const {logs,weights}=model(answers);
 const qualified=qualifiedLabs(context.eligible,answers),qualifiedCount=distinctResearchers(qualified);
 const remainingBroad=remaining.filter(q=>q.stage==='broad');
 const information=remaining.map(q=>({q,gain:expectedInformationGain(q,weights)}));
 const maxGain=Math.max(0,...information.map(x=>x.gain));
 const exhausted=remaining.length===0;
 const ready=qualifiedCount>=count;
 const automaticStop=exhausted||(!continueAfterStop&&!remainingBroad.length&&ready&&maxGain<=MODEL_POLICY.informationThresholdBits);
 const common={answered:answers.length,bankSize:MAX_QUESTIONS,coverage:BROAD_GROUPS.length-remainingBroad.length,totalGroups:BROAD_GROUPS.length,qualifiedCount,requestedCount:count,ready,exhausted,maxGain,automaticStop,stopReason:exhausted?'bank-exhausted':automaticStop?'model-information-low':null};
 if(automaticStop)return {...common,next:null};
 // Keep the story transition readable when the culture entry is relevant; never counts as evidence.
 const previous=answers.at(-1),previousQ=ALL_QUESTIONS[previous?.questionId];
 let forced;
 if(previous?.optionIds[0]===previousQ?.id+'_yes'){
  if(previousQ.id==='broad_culture')forced=remaining.find(q=>q.id==='story_curse');
  else if(previousQ.stage==='story')forced=remaining.find(q=>q.parent===previousQ.id);
 }
 if(forced)return {...common,next:forced};
 // Cover every broad field before declaring completion. Ordering uses information, without fixed ID order.
 let pool=remainingBroad.length?information.filter(x=>x.q.stage==='broad'):information;
 if(!remainingBroad.length&&!ready){
  // Evidence acquisition is a second objective: high information alone could ignore a missing facet.
  const missingByProfile=profiles.map(p=>new Set(FACETS.filter(f=>!reasonsFor(profile,p.labs[0]).some(r=>r.facet===f))));
  pool=pool.map(item=>{
   if(item.q.stage!=='topic')return {...item,utility:item.gain};
   let verification=0;
   for(let i=0;i<profiles.length;i++){
    if(!context.relevant[item.q.id][i])continue;
    if(missingByProfile[i].has(item.q.facet))verification+=weights[i];
   }
   return {...item,utility:item.gain+.15*verification};
  });
 }
 const order=shuffled(pool,seed^hash(answers.map(a=>a.questionId+':'+a.optionIds[0]).join('|')));
 order.sort((a,b)=>{const delta=(b.utility??b.gain)-(a.utility??a.gain);return Math.abs(delta)<1e-12?0:delta;});
 return {...common,next:order[0]?.q||null};
}
export function assessmentState(answers=[],count=5,seed=0,continueAfterStop=false){
 validateCount(count);if(!context)throw new Error('研究データの準備ができていません。');
 const key=seed+':'+count+':'+continueAfterStop+':'+answers.map(a=>a.questionId+':'+a.optionIds?.[0]).join('|');
 if(context.cache.has(key))return context.cache.get(key);
 const result=computeState(answers,count,seed,continueAfterStop);if(context.cache.size>1000)context.cache.clear();context.cache.set(key,result);return result;
}
export const getNextQuestion=(answers=[],count=5,seed=0,continueAfterStop=false)=>assessmentState(answers,count,seed,continueAfterStop).next;
export function normalizeAnswers(input,count=5,seed=0){
 if(!Array.isArray(input)||!context)return [];
 const answers=[];
 for(const a of input.slice(0,MAX_QUESTIONS)){
  let targetCount;try{targetCount=validateCount(a?.targetCount??count);}catch{break;}
  const expected=getNextQuestion(answers,targetCount,seed,a?.continued===true);
  if(!a||a.questionId!==expected?.id||!validateAnswer(expected,a.optionIds))break;
  answers.push({...a,questionId:a.questionId,optionIds:[...a.optionIds]});
 }
 return answers;
}
export function recommend(labs,answers,requestedCount,seed=0){
 const count=validateCount(requestedCount);
 if(context?.labs!==labs)configureCatalog(labs);
 const profile=buildProfile(answers),{logs}=model(answers);
 const logById=new Map(context.profiles.flatMap((p,i)=>p.labs.map(l=>[l.id,logs[i]])));
 const candidates=shuffled(qualifiedLabs(labs,answers).sort((a,b)=>a.id.localeCompare(b.id)),seed);
 // Shuffle first: equal-evidence profiles have equal opportunity, regardless of CSV order or ID.
 candidates.sort((a,b)=>{const delta=logById.get(b.id)-logById.get(a.id);return Math.abs(delta)<1e-8?0:delta;});
 const selected=[],researchers=new Set();
 for(const lab of candidates){const key=lab.leadResearcherKey||lab.id;if(researchers.has(key))continue;researchers.add(key);selected.push({...lab,reasons:reasonsFor(profile,lab),exploratory:false});if(selected.length===count)break;}
 return selected;
}
export function recommendationPool(labs,answers){
 if(context?.labs!==labs)configureCatalog(labs);
 const {logs}=model(answers);const qualified=qualifiedLabs(labs,answers),ids=new Set(qualified.map(l=>l.id));
 const peak=Math.max(-Infinity,...context.profiles.filter(p=>p.labs.some(l=>ids.has(l.id))).map(p=>logs[context.profiles.indexOf(p)]));
 return context.profiles.flatMap((p,i)=>Math.abs(logs[i]-peak)<1e-8?p.labs.filter(l=>ids.has(l.id)):[]);
}
export function suggestedQuestion(lab,map,profile){const tags=Object.keys(lab.topics).filter(id=>map[id]);tags.sort((a,b)=>(profile.topics[b]||0)-(profile.topics[a]||0));return map[tags[0]]?.question||'この研究で、どんな問いを探れるだろう？';}
export function summaryText(results,answers,map){
 const profile=buildProfile(answers),labels=topTopics(profile,map).map(t=>t.label);
 const lines=['その先ラボで見つけた、気になる研究','','気になるテーマ：'+(labels.join('、')||'まだ確認中'),`答えた質問：${answers.length}問`,''];
 for(const [i,lab] of results.entries()){
  lines.push(`${i+1}. ${lab.name}（${lab.university}）`,lab.description,'推薦の根拠（異なる3つの回答）');
  for(const r of lab.reasons)lines.push(`・${FACET_LABELS[r.facet]}：「${r.label}」に、はい。対応分野：${map[r.topicId]?.label||r.topicId}。出典：${r.sourceURL}`);
  lines.push('問いの例：'+suggestedQuestion(lab,map,profile));if(lab.achievement)lines.push('成果の例：'+lab.achievement);lines.push('公式ページ：'+lab.url,'');
 }
 if(!results.length)lines.push('根拠が3種類そろった候補は、まだありません。合わない・向いていないという判定ではありません。','');
 lines.push('次にやってみること','・気になった理由を、自分の言葉で書く。','・同じテーマを研究する他の大学や公開講座も探す。','・学部の授業や入試の公式案内も確かめる。','','固定20問は廃止。質問選択は未校正の仮定モデルであり、統計的な最適性・適性・入学・配属を保証するものではありません。');
 return lines.join('\n');
}
