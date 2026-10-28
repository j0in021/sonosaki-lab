// Mechanical checks for every published record; semantic correctness requires source review.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {hasVerifiedEvidence} from '../site/engine.js';
import {ALL_QUESTIONS} from '../site/questions.js';
const root=new URL('../',import.meta.url);
execFileSync('python3',['-c','from scripts.evidence_data import reviewed_entries; reviewed_entries()'],{cwd:root,stdio:'pipe'});
const ledger=JSON.parse(fs.readFileSync(new URL('data/evidence-ledger.json',root))).entries;
const catalog=JSON.parse(fs.readFileSync(new URL('site/data/catalog.json',root)));
const entries=new Map(ledger.map(e=>[e.labId,e]));
assert.equal(entries.size,ledger.length,'Duplicate reviewed identity');
assert.equal(new Set(catalog.labs.map(l=>l.id)).size,catalog.labs.length,'Duplicate catalogue identity');
let checked=0;
for(const lab of catalog.labs){
 const entry=entries.get(lab.id);
 assert.equal(lab.eligible,!!entry,`${lab.id}: eligibility disagrees with reviewed ledger`);
 if(!entry){
  assert.equal(lab.evidence.length,0);assert(lab.review.nextAction);
  assert.equal(lab.achievement,null,'Pending record exposes unreviewed achievement');
  assert.notEqual(lab.review.status,'verified','Pending record labelled verified');
  continue;
 }
 checked++;
 assert(hasVerifiedEvidence(lab),`${lab.id}: mismatched individual question/evidence`);
 assert.deepEqual(lab.lesson,Object.fromEntries(['title','intro','simplerExplanation','sourceURL','group'].map(k=>[k,entry[k]])),'Stale generated lesson');
 assert.notEqual(entry.intro.trim(),entry.simplerExplanation.trim(),'Repeated alternate explanation');
 const seen=new Set();
 for(const evidence of lab.evidence){
  const original=entry.evidence.find(e=>e.facet===evidence.facet);
  for(const field of ['question','claim','sourceURL','sourceLocator','checkedAt','semanticKey'])assert.equal(evidence[field],original[field],`${lab.id}: stale ${field}`);
  assert(!/(ます|です)こと/.test(evidence.question),'Mechanical question suffix');
  assert(/[？?]$/.test(evidence.question),'Question punctuation missing');
  const normalized=evidence.question.replace(/[\s？?。、]/g,'');assert(!seen.has(normalized),'Duplicate question');seen.add(normalized);
  assert.equal(ALL_QUESTIONS[evidence.questionId].sourceURL,entry.sourceURL);
 }
 assert.equal(lab.achievement,entry.achievementReview?.text??null,'Unreviewed achievement exposed');
}
assert.equal(checked,ledger.length,'Reviewed ID missing from catalogue');
assert.equal(checked,catalog.stats.eligible,'Stale reviewed count');
assert.equal(catalog.labs.length-checked,catalog.stats.pendingReview,'Stale pending count');
console.log(`Content integrity passed for all ${catalog.labs.length} records (${checked} reviewed). Source identity and meaning still require individual review.`);
