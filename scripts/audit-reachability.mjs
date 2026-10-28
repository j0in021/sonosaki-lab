import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {configureCatalog,getNextQuestion,assessmentState,buildProfile,reasonsFor,recommendationPool,shuffled,qualifiedLabs,recommend} from '../site/engine.js';
const root=resolve(import.meta.dirname,'..');
const catalog=JSON.parse(fs.readFileSync(resolve(root,'site/data/catalog.json')));
const {labs}=catalog;
configureCatalog(labs);
const grouped=new Map();for(const lab of labs.filter(l=>l.eligible)){const key=Object.keys(lab.topics).sort().join('|');if(!grouped.has(key))grouped.set(key,[]);grouped.get(key).push(lab);}
const entries=[],paths=[];let maximum=0;
for(const group of grouped.values()){
 const target=group[0],answers=[];
 while(true){
  const state=assessmentState(answers,1,0);
  if(state.coverage===11&&reasonsFor(buildProfile(answers),target).length===3)break;
  const q=getNextQuestion(answers,1,0);assert(q,`Stopped before witness evidence: ${target.id}`);
  const yes=q.topics.some(t=>target.topics[t]);
  answers.push({questionId:q.id,optionIds:[q.id+(yes?'_yes':'_no')],targetCount:1});
 }
 const pathId='profile-'+paths.length;paths.push({id:pathId,seed:0,requestedCount:1,answers});
 const topPool=recommendationPool(labs,answers),poolIds=new Set(topPool.map(l=>l.id));
 const shuffledIds=qualifiedLabs(labs,answers).map(l=>l.id).sort((a,b)=>a.localeCompare(b));
 const selectionSeeds=new Map();
 for(let seed=0;seed<20000&&group.some(l=>!selectionSeeds.has(l.id));seed++){const id=shuffled(shuffledIds,seed).find(id=>poolIds.has(id));if(id&&!selectionSeeds.has(id))selectionSeeds.set(id,seed);}
 for(const lab of group){assert(selectionSeeds.has(lab.id),`No observed selection witness: ${lab.id}`);const selectionSeed=selectionSeeds.get(lab.id);assert.equal(recommend(labs,answers,1,selectionSeed)[0].id,lab.id);assert(poolIds.has(lab.id),`Unreachable record: ${lab.id}`);const reasons=reasonsFor(buildProfile(answers),lab);entries.push({id:lab.id,reachable:true,witnessQuestionIds:reasons.map(r=>r.questionId),distinctFacets:reasons.map(r=>r.facet),legalPathId:pathId,recommendationSeed:selectionSeed,selectedAsFirstResult:true,topTiePoolSize:topPool.length});}
 maximum=Math.max(maximum,answers.length);
}
const bins=Array(20).fill(0),draws=20000;for(let seed=0;seed<draws;seed++)bins[shuffled(Array.from({length:20},(_,i)=>i),seed)[0]]++;
const expected=draws/bins.length;
const sourceHashes=Object.fromEntries(['site/engine.js','site/question-bank.js','site/data/catalog.json'].map(name=>[name,createHash('sha256').update(fs.readFileSync(resolve(root,name))).digest('hex')]));
const report={schemaVersion:1,sourceHashes,paths,kind:'synthetic-witness-audit',notUserData:true,catalogSourceSha256:catalog.source.sha256,policy:'Equal per-record prior; no university/CSV/ID preference; equal-score candidates shuffled; same researcher deduplicated only after drawing.',eligible:entries.length,reachable:entries.filter(e=>e.reachable).length,uniqueTopicProfiles:grouped.size,maxWitnessPathLength:maximum,nonEligible:labs.filter(l=>!l.eligible).map(l=>({id:l.id,reason:'Original catalogue lacks sufficiently confirmed description, topic mapping or URL; not passed off as a grounded recommendation.'})),tieSimulation:{draws,cohortSize:20,observedFirstPositions:bins,expectedFirstPositions:expected,pearsonChiSquare:bins.reduce((sum,n)=>sum+(n-expected)**2/expected,0),note:'A synthetic implementation check of tie shuffling, not evidence of equal real-world exposure or calibrated student preferences.'},entries};
const target=resolve(root,'site/data/reachability-audit.json');
if(process.argv.includes('--check'))assert.equal(fs.readFileSync(target,'utf8'),JSON.stringify(report),'Reachability audit is stale; run npm run audit.');else fs.writeFileSync(target,JSON.stringify(report));
console.log(JSON.stringify({eligible:report.eligible,reachable:report.reachable,profiles:report.uniqueTopicProfiles,maxWitnessPathLength:maximum,notEligible:report.nonEligible.length,tieSimulation:report.tieSimulation}));
