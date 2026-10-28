import assert from 'node:assert/strict';
import {readFile, access} from 'node:fs/promises';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const root = resolve(import.meta.dirname, '..');
const site = resolve(root, 'site');
const html = await readFile(resolve(site,'index.html'),'utf8');
assert.match(html, /lang="ja"/);
assert.match(html, /name="viewport"/);
for(const match of html.matchAll(/(?:src|href)="\.\/([^"#]+)"/g)) await access(resolve(site,match[1]));
for(const file of ['app.js','questions.js','question-bank.js','engine.js','session.js']) {
 const result=spawnSync(process.execPath,['--check',resolve(site,file)],{encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);
}
const app=await readFile(resolve(site,'app.js'),'utf8');
assert(!/https?:\/\/localhost|\/Users\/|API_KEY|token\s*[:=]/i.test(app));
assert(app.includes("new URL(path, import.meta.url)"),'Data loads relative to project Pages path');
const data=JSON.parse(await readFile(resolve(site,'data/catalog.json'),'utf8'));
const topics=JSON.parse(await readFile(resolve(site,'data/topics.json'),'utf8'));
const topicIds=new Set(topics.map(t=>t.id));
const groups=new Set(topics.map(t=>t.group));
for(const lab of data.labs) {
 assert(Object.keys(lab.topics).every(t=>topicIds.has(t)),`${lab.id}: unknown topic`);
 if(lab.eligible) assert(groups.has(lab.lesson?.group),`${lab.id}: unknown exploration group`);
 for(const url of [lab.url,...lab.sources.directory,lab.sources.description,lab.sources.achievement,...lab.evidence.map(e=>e.sourceURL)].filter(Boolean)) {
 assert(['http:','https:'].includes(new URL(url).protocol),url);
 assert(!/locked/i.test(decodeURI(url)), 'Forbidden source excluded');
 }
}
console.log(`Static checks passed: ${data.stats.eligible} reviewed entries; assets, topic IDs and URL formats valid. Publication requires release:check.`);
