// Keep the question being edited, including the context that originally selected it.
export function editAnswer(answers, index) {
  if (!Number.isInteger(index) || index < 0 || index >= answers.length) return null;
  return { answers: answers.slice(0, index), editing: structuredClone(answers[index]) };
}

export function savedIds(values) {
  return [...new Set((Array.isArray(values) ? values : []).filter(id =>
    typeof id === 'string' && /^[a-z0-9-]+$/.test(id)))];
}

export function writeSession(storage, key, state, version) {
  try {
    storage.setItem(key, JSON.stringify({ version, bankRevision: state.bankRevision, count: state.count, seed: state.seed,
      recommendationSeed: state.recommendationSeed, keepExploring: state.keepExploring,
      answers: state.answers, editing: state.editing, saved: savedIds([...state.saved]) }));
    return true;
  } catch { return false; }
}
