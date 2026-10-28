import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {QUESTION_BANK,ALL_QUESTIONS,FACETS,MAX_QUESTIONS} from '../site/questions.js';
import {configureCatalog,getNextQuestion,assessmentState,normalizeAnswers,recommend,validateCount,buildProfile,reasonsFor,summaryText,shuffled} from '../site/engine.js';
import {editAnswer,savedIds,writeSession} from '../site/session.js';
const catalog=JSON.parse(fs.readFileSync(new URL('../site/data/catalog.json',import.meta.url)));
const topics=JSON.parse(fs.readFileSync(new URL('../site/data/topics.json',import.meta.url)));
const map=Object.fromEntries(topics.map(t=>[t.id,t]));
const yes=(q,value,count=5,continued=false)=>({questionId:q.id,optionIds:[q.id+(value?'_yes':'_no')],targetCount:count,continued});
function journey(choose,count=5,seed=123,exploreAll=false){
 configureCatalog(catalog.labs);const answers=[];
 while(true){
  let q=getNextQuestion(answers,count,seed),continued=false;
  if(!q&&exploreAll&&assessmentState(answers,count,seed).stopReason==='requested-evidence-ready'){
   q=getNextQuestion(answers,count,seed,true);continued=!!q;
  }
  if(!q)break;answers.push(yes(q,choose(q),count,continued));assert(answers.length<=MAX_QUESTIONS);
 }
 return answers;
}
test('Original records are retained, with explicit per-record review issues',()=>{
 assert.equal(new Set(catalog.labs.flatMap(l=>l.sourceRowIds)).size,2988);
 assert.equal(catalog.labs.length,2826);
 for(const lab of catalog.labs){assert(lab.review);if(!lab.eligible){assert(lab.review.issues.includes('individual-three-facet-evidence-unreviewed'));assert(lab.review.nextAction);}}
 assert(catalog.labs.some(l=>l.review.issues.includes('individual-description-unconfirmed')));
 assert(catalog.labs.some(l=>l.review.issues.includes('topic-mapping-missing')));
});
test('Only individually documented questions can supply three distinct evidence facets',()=>{
 const ids=new Set();for(const q of QUESTION_BANK){assert(!ids.has(q.id));ids.add(q.id);assert.deepEqual(q.options.map(o=>o.label),['はい','いいえ']);}
 for(const lab of catalog.labs.filter(l=>l.eligible)){
  assert.equal(lab.review.status,'verified');assert.equal(lab.evidence.length,3);
  assert.deepEqual(lab.evidence.map(e=>e.facet),FACETS);
  for(const e of lab.evidence){assert(e.claim&&e.sourceLocator&&e.checkedAt);assert.equal(ALL_QUESTIONS[e.questionId].labId,lab.id);}
 }
});
test('Reviewing recommendation reasons does not certify an unreviewed legacy achievement',()=>{
 const ledger=JSON.parse(fs.readFileSync(new URL('../data/evidence-ledger.json',import.meta.url)));
 const reviews=new Map(ledger.entries.map(e=>[e.labId,e.achievementReview]));
 assert(catalog.labs.some(l=>l.eligible&&l.legacyAchievement?.text&&!reviews.get(l.id)));
 for(const lab of catalog.labs){
  const review=reviews.get(lab.id);
  if(review){assert.equal(lab.achievement,review.text);assert.equal(lab.sources.achievement,review.sourceURL);}
  else{assert.equal(lab.achievement,null);assert.equal(lab.achievementType,null);assert.equal(lab.sources.achievement,null);}
 }
});
test('Generic games and sports answers cannot recommend market design, plant motion, or sports law',()=>{
 configureCatalog(catalog.labs);
 for(const [id,tag] of [['utokyo-a6157ef84202','games'],['utokyo-3e0d96953758','sports'],['utokyo-c38bfde32a4e','sports']]){
  const fabricatedLegacy=FACETS.map(f=>({questionId:`topic_${tag}_${f}`,optionIds:[`topic_${tag}_${f}_yes`]}));
  assert.equal(reasonsFor(buildProfile(fabricatedLegacy),catalog.labs.find(l=>l.id===id)).length,0);
  assert.equal(recommend(catalog.labs,fabricatedLegacy,20).length,0);
 }
 const a=journey(q=>q.topics.includes('robots')||q.stage==='checkpoint',20);
 assert(!recommend(catalog.labs,a,20).some(l=>l.id==='utokyo-a6157ef84202'));
});
test('All reviewed records have a legal positive path, without counting broad or comprehension answers',()=>{
 for(const lab of catalog.labs.filter(l=>l.eligible)){
  const a=journey(q=>q.labId===lab.id||q.stage==='checkpoint',1);
  const r=recommend(catalog.labs,a,1,123);assert.equal(r[0]?.id,lab.id);
  assert.deepEqual(normalizeAnswers(a,1,123),a);
  for(const e of r[0].reasons){assert.equal(ALL_QUESTIONS[e.questionId].stage,'evidence');assert(a.some(x=>x.questionId===e.questionId&&x.optionIds[0]===e.questionId+'_yes'));}
 }
});
test('An everyday yes immediately opens a related individual question; no explores another doorway',()=>{
 configureCatalog(catalog.labs);
 const first=getNextQuestion([],5,123);assert.equal(first.stage,'broad');
 const bridge=getNextQuestion([yes(first,true)],5,123);assert.equal(bridge.stage,'bridge');
 const follow=getNextQuestion([yes(first,true),yes(bridge,true)],5,123);
 assert.equal(follow.stage,'evidence');assert.equal(follow.group,first.group);assert.equal(follow.facet,'interest');assert(follow.topics.some(t=>bridge.topics.includes(t)));
 assert.equal(getNextQuestion([yes(first,false)],5,123).stage,'broad');
 assert(!QUESTION_BANK.some(q=>q.stage.startsWith('understanding')));
});
test('Every study asks interest, inquiry, activity in order; missing yes cannot be padded',()=>{
 const a=journey(()=>true,20,123,true);
 for(const lab of catalog.labs.filter(l=>l.eligible))assert.deepEqual(a.filter(x=>ALL_QUESTIONS[x.questionId].labId===lab.id).map(x=>ALL_QUESTIONS[x.questionId].facet||'understand'),FACETS);
 assert.deepEqual(normalizeAnswers(a,20,123),a);
 assert.equal(assessmentState(a,20,123).stopReason,'examples-exhausted');
 const r=recommend(catalog.labs,a,20);assert.equal(r.length,Math.min(20,catalog.stats.eligible));
 for(const lab of r)assert.equal(new Set(lab.reasons.map(e=>e.semanticKey)).size,3);
});
test('No-interest and theme-only paths reach an explicit pause after three examples, rather than 155 questions',()=>{
 for(const choose of [()=>false,q=>q.facet==='interest'||q.stage==='broad']){
  const a=journey(choose,5);const s=assessmentState(a,5,123);
  assert.equal(s.stopReason,'user-pause');assert.equal(s.completedExamples,3);assert(a.length<=22);assert.equal(recommend(catalog.labs,a,5).length,0);
 }
});
test('User can resume a pause, and the resumption plus all following answers replay',()=>{
 const a=journey(()=>false,5);const q=getNextQuestion(a,5,123,true);assert(q);a.push(yes(q,true,5,true));
 assert.deepEqual(normalizeAnswers(a,5,123),a);
 const next=getNextQuestion(a,5,123);assert.equal(next.facet,'inquiry');
});
test('Requested counts, same-condition shuffle, input-order invariance, and diversity retain grounded candidates',()=>{
 const a=journey(q=>q.id!=='compare_breadth',20,123,true),available=catalog.stats.eligible;
 for(const n of [1,3,5,20])assert.equal(recommend(catalog.labs,a,n).length,Math.min(n,available));
 const initial=recommend(catalog.labs,a,5,7).map(l=>l.id);
 assert.deepEqual(recommend(shuffled(catalog.labs,42),a,5,7).map(l=>l.id),initial);
 const firsts=new Set(Array.from({length:Math.max(1000,available*50)},(_,seed)=>recommend(catalog.labs,a,1,seed)[0].id));
 assert.equal(firsts.size,available);
 const diverse=journey(()=>true,20,123,true);
 const diverseResults=recommend(catalog.labs,diverse,20,7);
 assert.equal(diverseResults.length,Math.min(20,available));
 assert(diverseResults.every(l=>l.reasons.length===3));
 configureCatalog(catalog.labs);
});
test('Editing preserves the selected question and its recorded context after the count changes, including reload',()=>{
 const a=journey(()=>true,20);const index=a.findIndex(x=>ALL_QUESTIONS[x.questionId].facet==='activity');
 const edited=editAnswer(a,index);assert.equal(edited.editing.questionId,a[index].questionId);assert.equal(edited.editing.targetCount,20);
 const memory={};const storage={setItem:(k,v)=>memory[k]=v};
 assert(writeSession(storage,'key',{count:1,seed:123,recommendationSeed:0,answers:edited.answers,editing:edited.editing,saved:new Set()},4));
 const restored=JSON.parse(memory.key);
 assert.equal(restored.editing.questionId,a[index].questionId);
 const changed={...restored.editing,optionIds:[restored.editing.questionId+'_no']};
 assert.deepEqual(normalizeAnswers([...restored.answers,changed],1,123),[...restored.answers,changed]);
});
test('Saving 101+ candidates is lossless; storage failures are reported, not represented as success',()=>{
 const ids=Array.from({length:2826},(_,i)=>`lab-${i}`),memory={};const state={saved:new Set(ids),answers:[],count:5};
 assert(writeSession({setItem:(k,v)=>memory[k]=v},'key',state,4));
 assert.deepEqual(savedIds(JSON.parse(memory.key).saved),ids);
 assert.equal(writeSession({setItem:()=>{throw new Error('quota');}},'key',state,4),false);
});
test('Invalid states are rejected and memos include individual source locators',()=>{
 for(const v of [0,-1,1.5,21,'3abc',null,''])assert.throws(()=>validateCount(v),RangeError);
 const a=journey(()=>true,5);assert.deepEqual(normalizeAnswers(a,20,123),a);
 assert.deepEqual(normalizeAnswers([{questionId:a[0].questionId,optionIds:['invalid']}],5,123),[]);
 const r=recommend(catalog.labs,a,3),memo=summaryText(r,a,map);
 for(const lab of r)for(const e of lab.reasons){assert(memo.includes(e.claim));assert(memo.includes(e.sourceLocator));}
});
