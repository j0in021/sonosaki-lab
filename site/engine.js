import { QUESTION_BANK, ALL_QUESTIONS, FACETS, FACET_LABELS, BROAD_GROUPS, MAX_QUESTIONS } from './questions.js';
export { MAX_QUESTIONS };
export const MIN_COUNT=1, MAX_COUNT=20, MIN_REASONS=3;
// Three examples per checkpoint is a provisional usability boundary, not a statistical optimum.
export const EXAMPLES_PER_CHECKPOINT=3;
let context=null;
export function validateCount(value){const n=Number(value);if(!Number.isInteger(n)||n<1||n>20)throw new RangeError('候補の数は1〜20の整数で選んでください。');return n;}
export const optionsFor=question=>question.options;
export function validateAnswer(question,ids){return !!question&&Array.isArray(ids)&&ids.length===1&&question.options.some(o=>o.id===ids[0]);}
function rng(seed){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
export function shuffled(items,seed=0){const list=[...items],random=rng(seed);for(let i=list.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[list[i],list[j]]=[list[j],list[i]];}return list;}
const positive=a=>a?.optionIds?.[0]===a?.questionId+'_yes';
export function hasVerifiedEvidence(lab){
 return lab.eligible===true&&lab.review?.status==='verified'&&lab.evidence?.length===3&&FACETS.every(f=>lab.evidence?.some(e=>
  e.facet===f&&e.claim&&e.sourceLocator&&e.checkedAt&&/^https?:\/\//.test(e.sourceURL)&&
  ALL_QUESTIONS[e.questionId]?.labId===lab.id&&ALL_QUESTIONS[e.questionId]?.facet===f&&ALL_QUESTIONS[e.questionId]?.title===e.question&&
  ALL_QUESTIONS[e.questionId]?.lesson===lab.lesson?.intro&&
  ALL_QUESTIONS[e.questionId]?.sourceURL===lab.lesson?.sourceURL&&
  ['claim','sourceURL','sourceLocator','checkedAt','semanticKey'].every(k=>ALL_QUESTIONS[e.questionId]?.evidence?.[k]===e[k])))&&
  new Set(lab.evidence.map(e=>e.semanticKey)).size===3&&
  new Set(lab.evidence.map(e=>e.question.replace(/[\s？?。、]/g,''))).size===3;
}
export function configureCatalog(labs){
 const eligible=labs.filter(hasVerifiedEvidence).sort((a,b)=>a.id.localeCompare(b.id));
 context={labs,eligible};
 return {eligible:eligible.length};
}
export function buildProfile(answers=[]){
 const topics=Object.create(null),traces=[];
 for(const a of answers){const q=ALL_QUESTIONS[a.questionId];if(!validateAnswer(q,a.optionIds)||!positive(a))continue;
  if(q.stage==='evidence'){
   for(const t of q.topics)topics[t]=(topics[t]||0)+1;
   traces.push({questionId:q.id,label:q.title,topics:q.topics,facet:q.facet,labId:q.labId});
  }
 }
 return {topics,traces};
}
export function topTopics(profile,map,limit=5){return Object.entries(profile.topics).filter(([id])=>map[id]).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,limit).map(([id])=>map[id]);}
export function reasonsFor(profile,lab){
 if(!hasVerifiedEvidence(lab))return [];
 return FACETS.flatMap(facet=>{
  const evidence=lab.evidence.find(e=>e.facet===facet);
  const trace=profile.traces.find(t=>t.labId===lab.id&&t.questionId===evidence.questionId);
  return trace?[{...evidence,label:trace.label}]:[];
 });
}
export function qualifiedLabs(labs,answers){const p=buildProfile(answers);return labs.filter(l=>reasonsFor(p,l).length===MIN_REASONS);}
function distinctResearchers(labs){return new Set(labs.map(l=>l.leadResearcherKey||l.id)).size;}
function studyState(lab,answered){
 const seen=id=>answered.get(lab.id+'_'+id);
 for(const facet of FACETS){
  if(!seen(facet))return {started:facet!=='interest',next:ALL_QUESTIONS[lab.id+'_'+facet]};
  if(!positive(seen(facet)))return {started:true,complete:true};
 }
 return {started:true,complete:true};
}
export function assessmentState(answers=[],count=5,seed=0,continueAfterStop=false){
 validateCount(count);if(!context)throw new Error('研究データの準備ができていません。');
 const answered=new Map(answers.map(a=>[a.questionId,a]));
 const broad=QUESTION_BANK.filter(q=>q.stage==='broad');
 const remainingBroad=broad.filter(q=>!answered.has(q.id));
 const states=context.eligible.map(lab=>({lab,...studyState(lab,answered)}));
 const completed=states.filter(s=>s.complete).length;
 const qualifiedCount=distinctResearchers(qualifiedLabs(context.eligible,answers));
 const common={answered:answers.length,bankSize:MAX_QUESTIONS,coverage:broad.length-remainingBroad.length,totalGroups:BROAD_GROUPS.length,
  qualifiedCount,requestedCount:count,ready:qualifiedCount>=count,completedExamples:completed,totalExamples:states.length,exhausted:false,automaticStop:false,stopReason:null};
 const next=q=>({...common,next:q});
 const stop=reason=>({...common,next:null,automaticStop:true,exhausted:reason==='examples-exhausted',stopReason:reason});
 const active=states.find(s=>s.started&&!s.complete);
 if(active)return next(active.next);
 if(completed===states.length)return stop('examples-exhausted');
 if(common.ready&&!continueAfterStop)return stop('requested-evidence-ready');
 if(completed>0&&completed%EXAMPLES_PER_CHECKPOINT===0){
  const id='checkpoint_'+completed/EXAMPLES_PER_CHECKPOINT;
  if(!answered.has(id))return next(ALL_QUESTIONS[id]);
  if(!positive(answered.get(id))&&!continueAfterStop)return stop('user-pause');
 }
 const last=answers.at(-1),lastQuestion=ALL_QUESTIONS[last?.questionId];
 // A yes opens a related study immediately; a completed study opens another everyday interest.
 if(remainingBroad.length&&(!last||lastQuestion?.stage!=='broad'||!positive(last)))return next(remainingBroad[0]);
 const positiveGroups=new Set(broad.filter(q=>positive(answered.get(q.id))).map(q=>q.group));
 const candidates=shuffled(states.filter(s=>!s.started),seed^completed);
 // Broad interests order examples, never fabricate reasons or exclude another field.
 candidates.sort((a,b)=>Number(positiveGroups.has(b.lab.lesson.group))-Number(positiveGroups.has(a.lab.lesson.group)));
 return next(candidates[0].next);
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
 const count=validateCount(requestedCount);if(context?.labs!==labs)configureCatalog(labs);
 const profile=buildProfile(answers);
 let candidates=shuffled(qualifiedLabs(labs,answers).sort((a,b)=>a.id.localeCompare(b.id)),seed);
 const selected=[],researchers=new Set();
 for(const lab of candidates){const key=lab.leadResearcherKey||lab.id;if(researchers.has(key))continue;researchers.add(key);selected.push({...lab,reasons:reasonsFor(profile,lab)});if(selected.length===count)break;}
 return selected;
}
export function suggestedQuestion(lab){return lab.evidence?.find(e=>e.facet==='inquiry')?.question||'公式ページでは、どんな問いを扱っているだろう？';}
export function summaryText(results,answers,map){
 const labels=topTopics(buildProfile(answers),map).map(t=>t.label);
 const lines=['その先ラボで見つけた、気になる研究','','気になるテーマ：'+(labels.join('、')||'まだ確認中'),`答えた質問：${answers.length}問`,''];
 for(const [i,lab] of results.entries()){
  lines.push(`${i+1}. ${lab.name}（${lab.university}）`,lab.description,'推薦の根拠（異なる3つの回答と個別の研究内容）');
  for(const r of lab.reasons)lines.push(`・${FACET_LABELS[r.facet]}：「${r.label}」に、はい。研究との対応：${r.claim}。出典：${r.sourceURL}（${r.sourceLocator} / 確認日 ${r.checkedAt}）`);
  lines.push('公式ページ：'+lab.url,'');
 }
 if(!results.length)lines.push('3つの根拠がそろった推薦はまだありません。研究紹介を読むことから始められます。向き不向きの判定ではありません。','');
 lines.push('次にやってみること','・気になった理由を、自分の言葉で書く。','・同じテーマの他大学や公開講座も探す。','・先生や家族に、知ったことを話してみる。','','質問の区切りは運用上の目安です。統計的な最適問数・適性・配属を保証しません。');
 return lines.join('\n');
}
