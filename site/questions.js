import { QUESTION_BANK, BANK_REVISION } from './question-bank.js';
export { QUESTION_BANK, BANK_REVISION };
export const ALL_QUESTIONS = Object.fromEntries(QUESTION_BANK.map(question=>[question.id,question]));
export const FACETS = ['interest','inquiry','activity'];
export const FACET_LABELS = {interest:'気になるテーマ',inquiry:'知りたい問い',activity:'やってみたい取り組み'};
export const BROAD_GROUPS = QUESTION_BANK.filter(q=>q.stage==='broad').map(q=>q.group);
export const MAX_QUESTIONS = QUESTION_BANK.length;
