// Mandatory publication gate. Local development and automated tests can run while it is closed.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { hasVerifiedEvidence } from '../site/engine.js';
const data=JSON.parse(fs.readFileSync(new URL('../site/data/catalog.json',import.meta.url)));
assert.equal(data.source.rows,2988,'Original source coverage must be preserved');
assert.equal(data.labs.length,2826,'Do not delete pending records to pass the release gate');
const verified=data.labs.filter(l=>hasVerifiedEvidence(l));
assert(verified.length>0,'No reviewed candidates');
for(const lab of data.labs){
 assert.equal(lab.eligible,hasVerifiedEvidence(lab),'Eligibility must match individual evidence');
 if(lab.eligible)assert.equal(lab.review.status,'verified');
 else assert(lab.review.nextAction,'Pending records must explain the next review');
}
console.log(`Release gate passed: ${verified.length} individually reviewed candidates; ${data.labs.length-verified.length} explicitly pending records excluded from recommendations.`);
