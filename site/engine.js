import { ADAPTIVE, ALL_QUESTIONS, FIXED, FLOW, METHODS, UNSURE } from './questions.js';

export const MIN_COUNT = 1;
export const MAX_COUNT = 20;
export const TOTAL_QUESTIONS = FLOW.length;

export function validateCount(value) {
  const count = Number(value);
  if (!Number.isInteger(count) || count < MIN_COUNT || count > MAX_COUNT) throw new RangeError('候補の数は1〜20の整数で選んでください。');
  return count;
}

export function optionsFor(question) {
  return [...question.options, UNSURE];
}

export function buildProfile(answers = []) {
  const topics = Object.create(null);
  const methods = Object.create(null);
  const traces = [];
  const selectedIds = new Set();
  for (const answer of answers) {
    const question = ALL_QUESTIONS[answer.questionId];
    if (!question || !Array.isArray(answer.optionIds)) continue;
    for (const id of new Set(answer.optionIds)) {
      const item = question.options.find(option => option.id === id);
      if (!item) continue;
      selectedIds.add(id);
      for (const [tag, value] of Object.entries(item.topics)) topics[tag] = (topics[tag] || 0) + value;
      for (const [method, value] of Object.entries(item.methods)) methods[method] = (methods[method] || 0) + value;
      traces.push({ questionId: question.id, question: question.title, optionId: id, label: item.label, topics: item.topics, methods: item.methods });
    }
  }
  return { topics, methods, traces, selectedIds, hasTopicSignals: Object.keys(topics).length > 0 };
}

function overlap(a, b) {
  const sa = new Set(a), sb = new Set(b);
  const intersection = [...sa].filter(key => sb.has(key)).length;
  return intersection / Math.max(1, new Set([...sa, ...sb]).size);
}

function adaptiveQuestion(answers, profile) {
  const used = new Set(answers.map(answer => answer.questionId));
  const previous = answers.map(answer => ALL_QUESTIONS[answer.questionId]).filter(q => q?.topics);
  if (!profile.hasTopicSignals) {
    const neutralOrder = ['sampler', 'stories', 'animals', 'tech', 'social', 'space'];
    return ADAPTIVE.find(q => q.id === neutralOrder.find(id => !used.has(id)));
  }
  return ADAPTIVE.filter(q => !used.has(q.id) && !q.neutral).map((question, position) => {
    const affinity = question.topics.reduce((sum, tag) => sum + Math.log1p(profile.topics[tag] || 0), 0) / Math.sqrt(question.topics.length);
    const trigger = question.triggers.some(id => profile.selectedIds.has(id)) ? 3.2 : 0;
    const repetition = previous.reduce((sum, prior) => sum + overlap(prior.topics || [], question.topics), 0) * .65;
    return { question, score: affinity + trigger - repetition, position };
  }).sort((a, b) => b.score - a.score || a.position - b.position)[0]?.question;
}

export function getNextQuestion(answers = []) {
  if (answers.length >= FLOW.length) return null;
  const phase = FLOW[answers.length];
  return phase === 'adaptive' ? adaptiveQuestion(answers, buildProfile(answers)) : FIXED[phase];
}

export function normalizeAnswers(input) {
  if (!Array.isArray(input)) return [];
  const answers = [];
  for (const candidate of input.slice(0, TOTAL_QUESTIONS)) {
    const expected = getNextQuestion(answers);
    if (!candidate || candidate.questionId !== expected?.id || !Array.isArray(candidate.optionIds)) break;
    const valid = new Set(optionsFor(expected).map(option => option.id));
    const ids = [...new Set(candidate.optionIds)].filter(id => typeof id === 'string' && valid.has(id));
    if (!ids.length || ids.includes('unsure') && ids.length !== 1 || !expected.multiple && ids.length !== 1) break;
    answers.push({ questionId: expected.id, optionIds: ids });
  }
  return answers;
}

export function validateAnswer(question, selected) {
  const ids = [...new Set(selected)];
  const valid = new Set(optionsFor(question).map(option => option.id));
  return ids.length > 0 && ids.every(id => valid.has(id)) && (!ids.includes('unsure') || ids.length === 1) && (question.multiple || ids.length === 1);
}

export function topTopics(profile, topicMap, limit = 5) {
  return Object.entries(profile.topics).filter(([id]) => topicMap[id]).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit).map(([id]) => topicMap[id]);
}

function scoreLab(profile, lab) {
  const entries = Object.entries(lab.topics || {});
  const norm = Math.sqrt(entries.reduce((sum, [, value]) => sum + value * value, 0)) || 1;
  const topicScore = entries.reduce((sum, [tag, weight]) => sum + Math.log1p(profile.topics[tag] || 0) * weight, 0) / norm;
  const methodScore = (lab.methods || []).reduce((sum, method) => sum + Math.log1p(profile.methods[method] || 0), 0) / Math.sqrt(Math.max(1, lab.methods?.length || 0));
  return { score: topicScore + methodScore * .34, topicScore, methodScore };
}

function reasonsFor(profile, lab) {
  const scores = profile.traces.map(trace => {
    const topic = Object.entries(trace.topics).reduce((sum, [id, weight]) => sum + weight * (lab.topics[id] || 0), 0);
    const method = Object.entries(trace.methods).reduce((sum, [id, weight]) => sum + (lab.methods.includes(id) ? weight * .35 : 0), 0);
    return { label: trace.label, relevance: topic + method, hasTopic: topic > 0, questionId: trace.questionId };
  }).filter(trace => trace.relevance > 0).sort((a, b) => Number(b.hasTopic) - Number(a.hasTopic) || b.relevance - a.relevance);
  const chosen = [];
  for (const item of scores) {
    if (chosen.length && chosen[0].questionId === item.questionId) continue;
    chosen.push(item);
    if (chosen.length === 2) break;
  }
  return chosen.map(item => item.label);
}

export function recommend(labs, answers, requestedCount) {
  const count = validateCount(requestedCount);
  const profile = buildProfile(answers);
  const unique = [...new Map(labs.filter(lab => lab.eligible && lab.id && lab.url && Object.keys(lab.topics || {}).length).map(lab => [lab.id, lab])).values()];
  if (unique.length < count) throw new RangeError('指定された数の候補を読み込めませんでした。件数を減らすか、再読み込みしてください。');
  const scoredAll = unique.map(lab => ({ lab, ...scoreLab(profile, lab) })).sort((a, b) => b.score - a.score || a.lab.id.localeCompare(b.lab.id));
  const researcherKeys = new Set();
  const scored = scoredAll.filter(item => {
    const key = item.lab.leadResearcherKey;
    if (!key) return true;
    if (researcherKeys.has(key)) return false;
    researcherKeys.add(key);
    return true;
  });
  if (scored.length < count) throw new RangeError('重複を除いた候補が足りません。表示件数を減らしてください。');
  const positive = scored.filter(item => item.topicScore > 0);
  const pool = profile.hasTopicSignals && positive.length >= count ? positive : scored;
  pool.sort((a, b) => b.score - a.score || a.lab.id.localeCompare(b.lab.id));
  const selected = [];
  const peak = pool[0]?.score || 1;
  const remaining = [...pool];
  while (selected.length < count) {
    let winner = 0, winnerValue = -Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const item = remaining[i];
      const tags = Object.keys(item.lab.topics);
      const similarity = selected.length ? Math.max(...selected.map(other => overlap(tags, Object.keys(other.lab.topics)))) : 0;
      // In free exploration, deterministic diversity matters more than arbitrary row order.
      const score = item.score - similarity * peak * (profile.hasTopicSignals ? .16 : 1);
      if (score > winnerValue) { winnerValue = score; winner = i; }
    }
    selected.push(remaining.splice(winner, 1)[0]);
  }
  return selected.map(item => ({ ...item.lab, reasons: reasonsFor(profile, item.lab), exploratory: !profile.hasTopicSignals || item.topicScore <= 0 }));
}

export function suggestedQuestion(lab, topicMap, profile) {
  const topics = Object.keys(lab.topics).filter(id => topicMap[id]);
  topics.sort((a, b) => (profile.topics[b] || 0) * lab.topics[b] - (profile.topics[a] || 0) * lab.topics[a] || lab.topics[b] - lab.topics[a]);
  return topicMap[topics[0]]?.question || 'この研究を通して、どんな新しい問いに出会えるだろう？';
}

export function summaryText(results, answers, topicMap) {
  const profile = buildProfile(answers);
  const labels = topTopics(profile, topicMap).map(topic => topic.label);
  const lines = ['その先ラボで見つけた、気になる研究', '', labels.length ? '気になるテーマ：' + labels.join('、') : 'いろいろな分野を見てみる自由探索', ''];
  for (const [index, lab] of results.entries()) {
    lines.push(`${index + 1}. ${lab.name}（${lab.university}）`, lab.description, '考えてみたい問いの例：' + suggestedQuestion(lab, topicMap, profile));
    if (lab.achievement) lines.push('紹介されている成果の例：' + lab.achievement);
    lines.push('公式ページ：' + lab.url, '');
  }
  lines.push('次にやってみること', '・気になった研究を1つ選び、なぜ気になったか自分の言葉で書く。', '・同じテーマを研究する他の大学や、公開講座・オープンキャンパスも調べる。', '・研究室名だけでなく、学部の授業や入試の公式案内も確かめる。', '', '研究テーマを知るための見本です。入学・配属を約束するものではありません。');
  return lines.join('\n');
}

export { METHODS };
