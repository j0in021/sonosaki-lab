import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {QUESTION_BANK,ALL_QUESTIONS,FACETS,MAX_QUESTIONS,BROAD_GROUPS} from '../site/questions.js';
import {configureCatalog,assessmentState,getNextQuestion,normalizeAnswers,recommend,validateCount,buildProfile,reasonsFor,summaryText,expectedInformationGain,shuffled,recommendationPool} from '../site/engine.js';
const catalog=JSON.parse(fs.readFileSync(new URL('../site/data/catalog.json',import.meta.url)));
const topics=JSON.parse(fs.readFileSync(new URL('../site/data/topics.json',import.meta.url)));
const map=Object.fromEntries(topics.map(t=>[t.id,t]));
const answer=(q,yes,count=5)=>({questionId:q.id,optionIds:[q.id+(yes?'_yes':'_no')],targetCount:count});
function journey(tags=[],count=5,seed=123,all=null){
 configureCatalog(catalog.labs);const answers=[];
 while(true){const q=getNextQuestion(answers,count,seed);if(!q)break;answers.push(answer(q,all??q.topics.some(t=>tags.includes(t)),count));assert(answers.length<=MAX_QUESTIONS);}
 return answers;
}
test('Every source row remains traceable; eligible records all have three evidence facets',()=>{
 assert.equal(new Set(catalog.labs.flatMap(l=>l.sourceRowIds)).size,2988);
 assert.equal(catalog.labs.filter(l=>l.eligible).length,2562);
 for(const lab of catalog.labs.filter(l=>l.eligible)){
  const witnesses=QUESTION_BANK.filter(q=>q.stage==='topic'&&q.topics.some(t=>lab.topics[t]));
  assert.deepEqual([...new Set(witnesses.map(q=>q.facet))].sort(),[...FACETS].sort(),lab.id);
  assert(lab.sources.description||lab.sources.directory[0]);
 }
});
test('Every question is strictly yes/no and every topic has distinct interest, inquiry, activity prompts',()=>{
 const ids=new Set();for(const q of QUESTION_BANK){assert(!ids.has(q.id));ids.add(q.id);assert.deepEqual(q.options.map(o=>o.label),['はい','いいえ']);assert.deepEqual(q.options[1].topics,{});for(const tag of q.topics)assert(map[tag]);}
 for(const t of topics)assert.deepEqual(QUESTION_BANK.filter(q=>q.stage==='topic'&&q.topics.includes(t.id)).map(q=>q.facet),FACETS);
 assert.equal(BROAD_GROUPS.length,11);
});
test('Narrative transitions do not count as recommendation evidence',()=>{
 configureCatalog(catalog.labs);const answers=[];
 while(getNextQuestion(answers)?.id!=='broad_culture'){
  const q=getNextQuestion(answers);assert(q);answers.push(answer(q,false));
 }
 const q=getNextQuestion(answers);answers.push(answer(q,true));
 assert.equal(getNextQuestion(answers).id,'story_curse');answers.push(answer(getNextQuestion(answers),true));
 assert.equal(getNextQuestion(answers).id,'story_history');answers.push(answer(getNextQuestion(answers),true));
 assert.equal(getNextQuestion(answers).id,'story_people');answers.push(answer(getNextQuestion(answers),true));
 assert.equal(recommend(catalog.labs,answers,5).length,0);
});
test('No displayed recommendation has fewer than three source-linked, distinct-facet yes answers',()=>{
 for(const tags of [['religion','folklore','history'],['ai','software','robots'],['medicine','cells'],['quantum']]){
  const a=journey(tags);const results=recommend(catalog.labs,a,5,123);assert(results.length>0);
  for(const lab of results){assert.equal(lab.reasons.length,3);assert.equal(new Set(lab.reasons.map(r=>r.facet)).size,3);assert.equal(new Set(lab.reasons.map(r=>r.questionId)).size,3);for(const r of lab.reasons){assert(a.some(x=>x.questionId===r.questionId&&x.optionIds[0]===r.questionId+'_yes'));assert(lab.topics[r.topicId]);assert.match(r.sourceURL,/^https?:\/\//);}}
 }
});
test('There is no fixed twenty-question stop, every broad field is checked, and model-gain stop is explicit',()=>{
 const counts=[];for(const tags of [['history','religion','folklore'],['ai','software','robots']]){const a=journey(tags);const state=assessmentState(a,5,123);assert.equal(state.coverage,11);assert(state.ready);assert(state.maxGain<=.01);assert.equal(getNextQuestion(a,5,123),null);counts.push(a.length);}
 assert.notEqual(counts[0],counts[1]);assert(counts.some(n=>n>20));
});
test('All-no exhausts finitely and never receives invented reasons or padded recommendations',()=>{
 const a=journey([],5,123,false);assert.equal(a.length,MAX_QUESTIONS);assert.equal(new Set(a.map(x=>x.questionId)).size,MAX_QUESTIONS);assert.equal(recommend(catalog.labs,a,20).length,0);assert(assessmentState(a).exhausted);assert(!assessmentState(a).ready);
});
test('Requested counts and researcher deduplication hold whenever sufficient three-reason candidates exist',()=>{
 const a=journey(['ai','software','robots']);for(const n of [1,3,5,10,20]){const r=recommend(catalog.labs,a,n,21);assert.equal(r.length,n);const keys=r.map(l=>l.leadResearcherKey||l.id);assert.equal(new Set(keys).size,n);}
});
test('Equal profiles are not permanently ordered by ID, CSV position, or university',()=>{
 const a=journey(['quantum']);const pool=recommendationPool(catalog.labs,a);assert(pool.length>1);
 const firsts=new Set(Array.from({length:100},(_,seed)=>recommend(catalog.labs,a,1,seed)[0].id));assert(firsts.size>1);
 const original=recommend(catalog.labs,a,5,9);configureCatalog(catalog.labs);const shuffledInput=shuffled(catalog.labs,8);const result=recommend(shuffledInput,a,5,9);assert(result.every(l=>l.reasons.length===3));assert.deepEqual(result.map(l=>l.id),original.map(l=>l.id));
 configureCatalog(catalog.labs);
});
test('Invalid states are rejected, saved branches replay, and changed result count preserves the recorded path',()=>{
 for(const v of [0,-1,1.5,21,'3abc',null,''])assert.throws(()=>validateCount(v),RangeError);
 const a=journey(['history']);assert.deepEqual(normalizeAnswers(a,5,123),a);assert.deepEqual(normalizeAnswers(a,20,123),a);
 assert.deepEqual(normalizeAnswers([{questionId:a[0].questionId,optionIds:['<script>']}]),[]);
 const changed=structuredClone(a);changed[1].questionId='nonexistent';assert.equal(normalizeAnswers(changed,5,123).length,1);
 const q=ALL_QUESTIONS[a[0].questionId];assert.deepEqual(normalizeAnswers([{questionId:q.id,optionIds:[q.id+'_yes',q.id+'_no']}]),[]);
});
test('Expected information is zero for a non-discriminating split; text memo includes all three reasons',()=>{
 configureCatalog(catalog.labs);const weights=Array.from({length:566},(_,i)=>i===0?1:0);assert(Math.abs(expectedInformationGain(QUESTION_BANK[0],weights))<1e-10);
 const a=journey(['folklore','religion']);const r=recommend(catalog.labs,a,3,2);const memo=summaryText(r,a,map);assert(memo.includes('異なる3つの回答'));for(const x of r)for(const reason of x.reasons)assert(memo.includes(reason.label));
});

test('A student can continue after model stopping; continuation history replays',()=>{
 const a=journey(['history','religion','folklore']);
 assert.equal(getNextQuestion(a,5,123),null);
 const next=getNextQuestion(a,5,123,true);assert(next);
 a.push({...answer(next,true),continued:true});
 assert.deepEqual(normalizeAnswers(a,5,123),a);
});
