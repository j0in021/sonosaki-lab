import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { FLOW, ALL_QUESTIONS } from '../site/questions.js';
import { getNextQuestion, normalizeAnswers, recommend, validateCount, buildProfile, summaryText } from '../site/engine.js';

const catalogue = JSON.parse(fs.readFileSync(new URL('../site/data/catalog.json', import.meta.url)));
const topics = JSON.parse(fs.readFileSync(new URL('../site/data/topics.json', import.meta.url)));
const topicMap = Object.fromEntries(topics.map(topic => [topic.id, topic]));

function journey(preferences = {}, hook = 'unsure', method = 'unsure') {
  const answers = [];
  while (answers.length < FLOW.length) {
    const question = getNextQuestion(answers);
    assert.ok(question, 'Every step has an answerable question');
    let id = 'unsure';
    if (question.id === 'hooks') id = hook;
    else if (question.id === 'methods') id = method;
    else if (Object.keys(preferences).length) {
      const candidates = question.options.map(option => ({ option, score: Object.entries(option.topics).reduce((sum, [tag, weight]) => sum + (preferences[tag] || 0) * weight, 0) })).sort((a, b) => b.score - a.score);
      if (candidates[0].score > 0) id = candidates[0].option.id;
    }
    answers.push({ questionId: question.id, optionIds: [id] });
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
    assert.ok(question.options.length >= 4);
    for (const option of question.options) {
      assert.equal(ids.has(option.id), false, `Duplicate option ${option.id}`);
      ids.add(option.id);
      for (const tag of Object.keys(option.topics)) assert.ok(topicMap[tag], `${question.id}: ${tag}`);
    }
  }
});

test('Anime curiosity can lead to folklore, without requiring science-fiction to be real', () => {
  const first = { questionId: 'hooks', optionIds: ['hook_curse'] };
  assert.equal(getNextQuestion([first]).id, 'magic');
  const second = { questionId: 'magic', optionIds: ['magic_people'] };
  assert.equal(getNextQuestion([first, second]).id, 'folklore');
  const answers = journey({ folklore: 4, religion: 2, history: 1 }, 'hook_curse', 'method_people');
  const result = recommend(catalogue.labs, answers, 5);
  assert.equal(result.length, 5);
  assert.ok(result.some(lab => lab.topics.folklore || lab.topics.religion));
  assert.ok(result.every(lab => lab.reasons.length > 0));
});

test('All unsure is a valid, finite, varied exploration', () => {
  const answers = journey();
  assert.equal(answers.length, 9);
  assert.equal(new Set(answers.map(answer => answer.questionId)).size, 9);
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
  assert.deepEqual(normalizeAnswers([{ questionId: 'hooks', optionIds: ['<script>'] }]), []);
  assert.deepEqual(normalizeAnswers([{ questionId: 'hooks', optionIds: ['unsure', 'hook_curse'] }]), []);
  const answers = [{ questionId: 'hooks', optionIds: ['hook_curse'] }, { questionId: 'magic', optionIds: ['magic_people'] }, { questionId: 'tech', optionIds: ['tech_ai'] }];
  assert.equal(normalizeAnswers(answers).length, 2);
});

test('Every starting interest can finish and generate a useful memo', () => {
  for (const hook of ALL_QUESTIONS.hooks.options) {
    const answers = journey(hook.topics, hook.id, 'method_read');
    assert.deepEqual(normalizeAnswers(answers), answers);
    const result = recommend(catalogue.labs, answers, 3);
    const memo = summaryText(result, answers, topicMap);
    assert.ok(memo.includes(result[0].url));
    assert.ok(memo.includes('同じテーマを研究する他の大学'));
  }
});
