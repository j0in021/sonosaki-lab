import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { FLOW, ALL_QUESTIONS } from '../site/questions.js';
import { getNextQuestion, normalizeAnswers, recommend, validateCount, buildProfile, summaryText } from '../site/engine.js';

const catalogue = JSON.parse(fs.readFileSync(new URL('../site/data/catalog.json', import.meta.url)));
const topics = JSON.parse(fs.readFileSync(new URL('../site/data/topics.json', import.meta.url)));
const topicMap = Object.fromEntries(topics.map(topic => [topic.id, topic]));

function journey(preferences = {}) {
  const answers=[];
  while(answers.length<FLOW.length) {
    const question=getNextQuestion(answers);
    assert.ok(question,'Every step has a question');
    const positive=Object.entries(question.options[0].topics).some(([tag])=>preferences[tag]>0);
    const id=`${question.id}_${positive?'yes':'no'}`;
    answers.push({questionId:question.id,optionIds:[id]});
  }
  return answers;
}

test('The full CSV is traceable and additions have official sources', () => {
  assert.equal(catalogue.source.rows, 2988);
  const ids = new Set(catalogue.labs.map(lab => lab.id));
  assert.equal(ids.size, catalogue.labs.length);
  const sourceRows = new Set(catalogue.labs.flatMap(lab => lab.sourceRowIds));
  assert.equal(sourceRows.size, 2988);
  assert.equal(catalogue.stats.additionalUniversities, 4);
  assert.ok(catalogue.stats.eligible > 2000);
  for (const lab of catalogue.labs) {
    assert.ok(lab.description);
    assert.ok(lab.sources.directory.length);
    assert.match(lab.url, /^https?:\/\//);
    if (lab.achievement) assert.match(lab.sources.achievement, /^https?:\/\//);
    if (lab.kind === '教員の研究テーマ') assert.match(lab.name, /先生の研究$/);
    for (const tag of Object.keys(lab.topics)) assert.ok(topicMap[tag], `Unknown topic ${tag}`);
  }
});

test('Every question option uses declared topics and methods', () => {
  const ids = new Set();
  for (const question of Object.values(ALL_QUESTIONS)) {
    assert.equal(question.options.length,2);
    assert.deepEqual(question.options.map(o=>o.label),['はい','いいえ']);
    assert.deepEqual(question.options[1].topics,{});
    assert.equal(question.multiple,false);
    for (const option of question.options) {
      assert.equal(ids.has(option.id), false, `Duplicate option ${option.id}`);
      ids.add(option.id);
      for (const tag of Object.keys(option.topics)) assert.ok(topicMap[tag], `${question.id}: ${tag}`);
    }
  }
});

test('Anime curiosity can lead to folklore, without requiring science-fiction to be real', () => {
  const first = { questionId: 'curse', optionIds: ['curse_yes'] };
  assert.equal(getNextQuestion([first]).id, 'magic_history');
  const second = { questionId: 'magic_history', optionIds: ['magic_history_yes'] };
  assert.equal(getNextQuestion([first, second]).id, 'folklore_people');
  const answers = journey({ folklore: 4, religion: 2, history: 1 }, 'hook_curse', 'method_people');
  const result = recommend(catalogue.labs, answers, 5);
  assert.equal(result.length, 5);
  assert.ok(result.some(lab => lab.topics.folklore || lab.topics.religion));
  assert.ok(result.every(lab => lab.reasons.length > 0));
});

test('All no is a valid, finite, varied exploration', () => {
  const answers = journey();
  assert.equal(answers.length, 20);
  assert.equal(new Set(answers.map(answer => answer.questionId)).size, 20);
  assert.equal(getNextQuestion(answers), null);
  assert.deepEqual(normalizeAnswers(answers), answers);
  const result = recommend(catalogue.labs, answers, 10);
  assert.equal(result.length, 10);
  assert.ok(result.every(lab => lab.exploratory));
  assert.ok(new Set(result.flatMap(lab => Object.keys(lab.topics))).size > 12);
});

test('Every supported result count returns exactly that count, with no duplicate researcher', () => {
  const paths = [journey(), journey({ ai: 3, software: 2, robots: 1 }, 'hook_tech', 'method_code'), journey({ history: 4, religion: 2 }, 'hook_history', 'method_read')];
  for (const answers of paths) for (const count of [1, 2, 3, 5, 8, 10, 20]) {
    const result = recommend(catalogue.labs, answers, count);
    assert.equal(result.length, count);
    assert.equal(new Set(result.map(lab => lab.id)).size, count);
    const researchers = result.map(lab => lab.leadResearcherKey).filter(Boolean);
    assert.equal(new Set(researchers).size, researchers.length);
  }
});

test('Changing the answers changes the recommendations, not only the explanation', () => {
  const history = journey({ history: 4, folklore: 3, religion: 2 }, 'hook_history', 'method_read');
  const tech = journey({ software: 4, ai: 3, robots: 2 }, 'hook_tech', 'method_code');
  const a = recommend(catalogue.labs, history, 8);
  const b = recommend(catalogue.labs, tech, 8);
  assert.ok(a.filter(lab => b.some(other => other.id === lab.id)).length <= 2);
  assert.ok(b.some(lab => lab.topics.software || lab.topics.ai));
  assert.ok(buildProfile(history).topics.history > 0);
});

test('Bad counts, forged options and stale branches cannot become valid saved state', () => {
  for (const value of [0, -1, 1.5, 21, '3abc', Infinity, null, '']) assert.throws(() => validateCount(value), RangeError);
  assert.equal(validateCount('5'), 5);
  assert.deepEqual(normalizeAnswers([{questionId:'curse',optionIds:['<script>']}]),[]);
  assert.deepEqual(normalizeAnswers([{questionId:'curse',optionIds:['curse_yes','curse_no']}]),[]);
  const answers=[{questionId:'curse',optionIds:['curse_yes']},{questionId:'magic_history',optionIds:['magic_history_yes']},{questionId:'tech',optionIds:['tech_yes']}];
  assert.equal(normalizeAnswers(answers).length,2);
});

test('Every topic profile and mixed binary path can finish and generate a useful memo',()=>{
 for(const question of Object.values(ALL_QUESTIONS)) {
  const answers=journey(question.options[0].topics);
  assert.deepEqual(normalizeAnswers(answers),answers);
  const result=recommend(catalogue.labs,answers,3);
  const memo=summaryText(result,answers,topicMap);
  assert.ok(memo.includes(result[0].url));
  assert.ok(memo.includes('同じテーマを研究する他の大学'));
 }
 for(let seed=0;seed<30;seed++) {
  const answers=[];
  for(let i=0;i<FLOW.length;i++) {
   const q=getNextQuestion(answers); const yes=(seed*17+i*7)%5<2;
   answers.push({questionId:q.id,optionIds:[`${q.id}_${yes?'yes':'no'}`]});
  }
  assert.equal(new Set(answers.map(a=>a.questionId)).size,20);
  assert.deepEqual(normalizeAnswers(answers),answers);
 }
});

test('Every yes answer also completes twenty distinct binary questions',()=>{
 const answers=[];
 for(let i=0;i<FLOW.length;i++) {
  const q=getNextQuestion(answers);
  answers.push({questionId:q.id,optionIds:[`${q.id}_yes`]});
 }
 assert.equal(getNextQuestion(answers),null);
 assert.equal(new Set(answers.map(a=>a.questionId)).size,20);
 assert.deepEqual(normalizeAnswers(answers),answers);
 assert.equal(recommend(catalogue.labs,answers,20).length,20);
});
