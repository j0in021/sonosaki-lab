import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

test('review import rejects known corruptions before generation',()=>{
 const result=spawnSync('python3',['-c',`
import copy,json,tempfile,sys
from pathlib import Path
sys.path.insert(0,'scripts')
from evidence_data import reviewed_entries
entry=json.loads(Path('data/evidence-ledger.json').read_text())['entries'][0]
def check(value):
    with tempfile.TemporaryDirectory() as d:
        p=Path(d)/'review.json'
        p.write_text(json.dumps({'entries':[value]}))
        return reviewed_entries(p)
assert len(check(entry))==1
cases=[]
x=copy.deepcopy(entry);x['simplerExplanation']=x['intro'];cases.append(x)
x=copy.deepcopy(entry);x['evidence'][0]['question']='研究しますことが気になる？';cases.append(x)
x=copy.deepcopy(entry);x['evidence'][0]['question']='調べたい';cases.append(x)
x=copy.deepcopy(entry);x['evidence'][1]['question']=x['evidence'][0]['question'];cases.append(x)
x=copy.deepcopy(entry);x['evidence'][1]['facet']=x['evidence'][0]['facet'];cases.append(x)
x=copy.deepcopy(entry);del x['evidence'][0]['sourceLocator'];cases.append(x)
for i,x in enumerate(cases):
    try:check(x)
    except AssertionError:continue
    raise AssertionError('Accepted corruption '+str(i))
print('Rejected six known corruption patterns')
`],{cwd:new URL('../',import.meta.url),encoding:'utf8'});
 assert.equal(result.status,0,result.stderr||result.stdout);
});
