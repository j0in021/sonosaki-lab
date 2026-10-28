import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {configureCatalog,getNextQuestion,normalizeAnswers,recommend,shuffled,buildProfile,reasonsFor} from '../site/engine.js';
const root=resolve(import.meta.dirname,'..');
const catalog=JSON.parse(fs.readFileSync(resolve(root,'site/data/catalog.json')));
const entries=[],paths=[];
configureCatalog(catalog.labs);
for(const target of catalog.labs.filter(l=>l.eligible)){
 const answers=[];
 while(reasonsFor(buildProfile(answers),target).length<3){
  const q=getNextQuestion(answers,1,0);assert(q,`Cannot reach ${target.id}`);
  const yes=q.stage==='checkpoint'||q.stage==='broad'&&q.group===target.lesson.group||q.labId===target.id;
  answers.push({questionId:q.id,optionIds:[q.id+(yes?'_yes':'_no')],targetCount:1});
 }
 assert.deepEqual(normalizeAnswers(answers,1,0),answers);
 assert.equal(recommend(catalog.labs,answers,1,0)[0].id,target.id);
 const id='path-'+paths.length;paths.push({id,seed:0,requestedCount:1,answers});
 entries.push({id:target.id,legalPathId:id,selectedAsFirstResult:true,recommendationSeed:0,evidence:reasonsFor(buildProfile(answers),target).map(r=>({questionId:r.questionId,facet:r.facet,claim:r.claim,sourceURL:r.sourceURL,sourceLocator:r.sourceLocator,checkedAt:r.checkedAt}))});
}
const bins=Array(20).fill(0),draws=20000;for(let seed=0;seed<draws;seed++)bins[shuffled(Array.from({length:20},(_,i)=>i),seed)[0]]++;
const expected=draws/bins.length;
const sourceHashes=Object.fromEntries(['site/engine.js','site/question-bank.js','site/data/catalog.json','data/evidence-ledger.json'].map(name=>[name,createHash('sha256').update(fs.readFileSync(resolve(root,name))).digest('hex')]));
const report={schemaVersion:2,kind:'individual-evidence-reachability',notUserData:true,sourceHashes,eligible:entries.length,reachable:entries.length,completeCatalogReview:catalog.labs.every(l=>l.review.status==='verified'),maxWitnessPathLength:Math.max(0,...paths.map(p=>p.answers.length)),paths,entries,nonEligible:catalog.labs.filter(l=>!l.eligible).map(l=>({id:l.id,name:l.name,sourceRowIds:l.sourceRowIds,status:l.review.status,issues:l.review.issues,nextAction:l.review.nextAction})),tieSimulation:{draws,cohortSize:20,observedFirstPositions:bins,expectedFirstPositions:expected,pearsonChiSquare:bins.reduce((sum,n)=>sum+(n-expected)**2/expected,0)}};
const target=resolve(root,'site/data/reachability-audit.json');
if(process.argv.includes('--check'))assert.equal(fs.readFileSync(target,'utf8'),JSON.stringify(report),'Audit is stale; run npm run audit.');else fs.writeFileSync(target,JSON.stringify(report));
console.log(JSON.stringify({eligible:report.eligible,reachable:report.reachable,pending:report.nonEligible.length,maxWitnessPathLength:report.maxWitnessPathLength,completeCatalogReview:report.completeCatalogReview}));
