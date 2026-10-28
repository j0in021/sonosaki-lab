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
for(const file of ['app.js','questions.js','question-bank.js','engine.js']) {
 const result=spawnSync(process.execPath,['--check',resolve(site,file)],{encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);
}
const app=await readFile(resolve(site,'app.js'),'utf8');
assert(!/https?:\/\/localhost|\/Users\/|API_KEY|token\s*[:=]/i.test(app));
assert(app.includes("new URL(path, import.meta.url)"),'Data loads relative to project Pages path');
const data=JSON.parse(await readFile(resolve(site,'data/catalog.json'),'utf8'));
for(const lab of data.labs) for(const url of [lab.url,...lab.sources.directory,lab.sources.description,lab.sources.achievement].filter(Boolean)) {
 assert(['http:','https:'].includes(new URL(url).protocol),url);
 assert(!/locked/i.test(decodeURI(url)), 'Forbidden source excluded');
}
console.log(`Static site ready: ${data.stats.eligible} eligible entries, local assets and source URLs valid.`);
