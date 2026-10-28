import { ALL_QUESTIONS, METHODS, UNSURE } from './questions.js';
import { TOTAL_QUESTIONS, MAX_COUNT, buildProfile, getNextQuestion, normalizeAnswers, optionsFor, recommend, summaryText, suggestedQuestion, topTopics, validateAnswer, validateCount } from './engine.js';

const KEY = 'sonosaki-lab:v1';
const main = document.querySelector('#main');
const dialog = document.querySelector('#info-dialog');
const dialogContent = document.querySelector('#dialog-content');
const groups = new Set(['culture', 'expression', 'human', 'society', 'place', 'nature', 'life', 'matter', 'universe', 'logic', 'technology']);
const hookIcons = ['spark', 'puzzle', 'book', 'leaf', 'planet', 'code', 'eye', 'brush', 'clock', 'people', 'bowl', 'city'];
let catalogue = null, topicMap = {}, loading = true, loadError = '', memoResults = [], toastTimer;
const state = { phase: 'start', count: 5, answers: [], draft: [], saved: new Set(), storage: true, countError: '' };

const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const icon = (name, extra = '') => `<svg class="icon ${extra}" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
function safeLink(url) {
  try { const parsed = new URL(url); return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : ''; } catch { return ''; }
}
function externalLink(url, label, className = '') {
  const safe = safeLink(url);
  return safe ? `<a class="${className}" href="${escape(safe)}" target="_blank" rel="noopener noreferrer">${escape(label)}<span class="sr-only">（新しいタブで開きます）</span></a>` : '';
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify({ version: 1, count: state.count, answers: state.answers, saved: [...state.saved].slice(0, 100) })); }
  catch { state.storage = false; }
}
function restore() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw || raw.length > 50000) return;
    const stored = JSON.parse(raw);
    if (stored.version !== 1) return;
    try { state.count = validateCount(stored.count); } catch { state.count = 5; }
    state.answers = normalizeAnswers(stored.answers);
    if (Array.isArray(stored.saved)) state.saved = new Set(stored.saved.filter(id => typeof id === 'string' && /^[a-z0-9-]+$/.test(id)).slice(0, 100));
  } catch { state.storage = false; }
}
function focusHeading() {
  requestAnimationFrame(() => {
    main.querySelector('h1')?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
}
function notify(text) {
  const toast = document.querySelector('#toast');
  toast.textContent = text;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 2600);
}
function updateSavedCount() { document.querySelector('#saved-count').textContent = state.saved.size; }
function dataLine() {
  if (loading) return '研究テーマを読み込んでいます…';
  if (loadError) return 'データを読み込めませんでした。もう一度お試しください。';
  return `${catalogue.stats.eligible.toLocaleString('ja-JP')}件の研究室・教員テーマから、興味に近い入口を。`;
}
function renderStart() {
  state.countError = '';
  state.phase = 'start';
  document.title = 'その先ラボ — 好きから、大学の研究へ。';
  const hasHistory = state.answers.length > 0;
  main.innerHTML = `
    <section class="landing-hero">
      <div class="hero-copy">
        <p class="audience">まだ志望校がない、高校生のあなたへ。</p>
        <h1 tabindex="-1">その「好き」、<br>大学で研究できる。</h1>
        <p class="hero-description">呪術廻戦、ゲーム、動物、人の心。<br>何となく気になることから、<br class="desktop-break">大学でやってみたいことを探してみよう。</p>
        <div class="start-panel">
          <label class="count-label" for="start-count">まず、出会いたい候補の数は？</label>
          <div class="count-controls"><div class="count-presets" aria-label="候補の数の例">${[3, 5, 10].map(n => `<button data-count-preset="${n}" aria-pressed="${state.count === n}">${n}<span>件</span></button>`).join('')}</div><div class="custom-count"><input id="start-count" data-start-count type="number" min="1" max="20" step="1" inputmode="numeric" value="${state.count}" aria-describedby="count-hint count-error"><span>件</span></div></div>
          <p class="field-hint" id="count-hint">1〜20件で選べます。あとから変更もできます。</p>
          <p class="field-error" id="count-error" aria-live="polite"></p>
          <button class="button button-primary start-button" data-action="start" ${loading || loadError ? 'disabled' : ''}>好きの先を、探してみる ${icon('arrow')}</button>
          ${hasHistory ? `<button class="resume-button" data-action="resume">${state.answers.length >= TOTAL_QUESTIONS ? '前回の結果をひらく' : `${state.answers.length}問目までの続きから`}</button>` : ''}
          <p class="time-note">9つの質問 / 3分くらい / 「まだわからない」もOK</p>
        </div>
        <p class="data-line" role="status">${escape(dataLine())}</p>
        ${loadError ? '<button class="text-button reload-button" data-action="reload">もう一度読み込む</button>' : ''}
      </div>
      <div class="interest-board" aria-label="好きから研究へ進む例">
        <div class="board-asterisk">${icon('spark')}</div>
        <p class="board-note">たとえば、こんな寄り道。</p>
        <div class="interest-ticket ticket-origin"><span class="ticket-icon">${icon('spark')}</span><div><small>好きなもの</small><strong>呪術廻戦が好き。</strong></div></div>
        <div class="branch-stem"><i></i><i></i></div>
        <div class="branch-label">どこが気になる？</div>
        <div class="board-paths">
          <div class="interest-ticket ticket-history">${icon('book')}<strong>昔の呪術って<br>何だったんだろう？</strong><span>歴史・宗教学</span></div>
          <div class="interest-ticket ticket-mind">${icon('eye')}<strong>どうして人は<br>信じるんだろう？</strong><span>心理学・認知科学</span></div>
        </div>
        <div class="ticket-small">${icon('people')}<span>人に話を聞いて、<br>伝承を集める研究も。</span></div>
        <p class="board-caption">「好き」の理由は、ひとつじゃない。</p>
      </div>
    </section>
    <section class="how-it-works" aria-label="探し方"><div><span class="step-dot">1</span><p>気になるものを選ぶ</p></div><span class="path-connector" aria-hidden="true"></span><div><span class="step-dot">2</span><p>好きの理由をたどる</p></div><span class="path-connector" aria-hidden="true"></span><div><span class="step-dot">3</span><p>研究室の世界をのぞく</p></div></section>
    <section class="opening-note"><h2>大学を決める前に、<br class="mobile-only">やってみたいことに出会おう。</h2><p>東大の幅広い研究を出発点に、国内外の個性的な研究も紹介します。<br>気になったテーマを見つけたら、同じ研究をしているほかの大学にも広げてみてね。</p></section>`;
}

function renderQuiz() {
  state.phase = 'quiz';
  const question = getNextQuestion(state.answers);
  if (!question) return renderResults();
  const step = state.answers.length;
  const profile = buildProfile(state.answers);
  const interests = topTopics(profile, topicMap, 4);
  document.title = `${step + 1}つ目の質問 — その先ラボ`;
  main.innerHTML = `
    <div class="quiz-shell">
      <div class="quiz-progress"><button class="back-button" data-action="back">${step ? '前の質問へ' : '最初の画面へ'}</button><span>${step + 1}<small> / ${TOTAL_QUESTIONS} 問</small></span></div>
      <progress class="progress-track" value="${step + 1}" max="${TOTAL_QUESTIONS}" aria-label="質問の進み具合"></progress>
      <section class="question-section" aria-labelledby="question-title"><p class="question-stage">${step === 0 ? 'まずは、好きなものから。' : step === TOTAL_QUESTIONS - 1 ? 'もうすぐ、研究に出会える。' : '気になる理由を、もう少し。'}</p><h1 id="question-title" tabindex="-1">${escape(question.title)}</h1><p class="question-note">${escape(question.note)}</p><span class="choice-rule">${question.multiple ? 'いくつ選んでもOK' : 'ひとつ選んでね'}</span>
      <div class="question-options ${question.id === 'hooks' ? 'hook-options' : ''}" role="group" aria-labelledby="question-title">${question.options.map((item, i) => `<button class="option-choice" data-option="${item.id}" aria-pressed="${state.draft.includes(item.id)}"><span class="option-art">${question.id === 'hooks' ? icon(hookIcons[i]) : `<span>${String.fromCharCode(65 + i)}</span>`}</span><span class="option-text"><strong>${escape(item.label)}</strong><span>${escape(item.detail)}</span></span><span class="option-check">${icon('check')}</span></button>`).join('')}</div>
      <button class="unsure-choice" data-option="unsure" aria-pressed="${state.draft.includes('unsure')}">${icon('spark')} ${UNSURE.label}<span>選ばずに進んでも大丈夫</span></button>
      </section>
      <div class="quiz-bottom"><div class="current-interests">${interests.length ? `<span>いま、気になっていること</span><div>${interests.map(t => `<span class="small-topic group-${groups.has(t.group) ? t.group : 'culture'}">${escape(t.label)}</span>`).join('')}</div>` : '<p>「好き」がまだなくても、<br>ここから見つけていけば大丈夫。</p>'}</div><div class="quiz-actions"><button class="text-button" data-action="skip">この質問はとばす</button><button class="button button-primary" data-action="next" ${validateAnswer(question, state.draft) ? '' : 'disabled'}>${step === TOTAL_QUESTIONS - 1 ? `${state.count}件の候補を見る` : '次へ進む'} ${icon('arrow')}</button></div></div>
    </div>`;
}

function primaryTopic(lab, profile) {
  return Object.keys(lab.topics).filter(id => topicMap[id]).sort((a, b) => (profile.topics[b] || 0) * lab.topics[b] - (profile.topics[a] || 0) * lab.topics[a] || lab.topics[b] - lab.topics[a]).map(id => topicMap[id])[0];
}
function labCard(lab, index, profile) {
  const topic = primaryTopic(lab, profile);
  const color = groups.has(topic?.group) ? topic.group : 'culture';
  const saved = state.saved.has(lab.id);
  const moreQuery = `${topic?.label || lab.name} 研究室 大学`;
  const departments = [...new Set([...lab.faculty.slice(0, 1), ...lab.departments.slice(0, 1)])].join(' / ');
  const descriptionSource = lab.sources.description || lab.sources.directory[0];
  const sourceURLs = [...new Set([descriptionSource, lab.sources.achievement].filter(Boolean))];
  return `<article class="lab-card group-${color}" data-lab-id="${lab.id}">
    <div class="lab-number"><span>${String(index + 1).padStart(2, '0')}</span></div>
    <div class="lab-body"><div class="lab-meta"><span class="lab-topic">${escape(topic?.label || '研究テーマ')}</span><span>${escape(lab.kind)}</span><span>${escape(lab.country)}</span></div><p class="lab-university">${escape(lab.university)}</p><h2>${escape(lab.name)}</h2><p class="lab-description">${escape(lab.description)}</p>
    <div class="match-reasons"><strong>${lab.exploratory ? '新しい興味を見つける、発見枠' : 'あなたが選んだ、こんな入口から'}</strong>${!lab.exploratory && lab.reasons.length ? `<p>${lab.reasons.map(reason => `「${escape(reason)}」`).join('、')}</p>` : '<p>まだ絞らずに、知らなかった分野ものぞいてみよう。</p>'}</div>
    <details class="research-details"><summary>研究の紹介・成果と出典を見る</summary><div><p class="detail-label">${lab.achievementType === 'publication' ? '本や論文にまとめた成果の例' : 'どんな成果が紹介されている？'}</p><p>${lab.achievement ? escape(lab.achievement) : '具体的な成果の説明は、このデータでは未確認です。気になったら、公式ページの研究紹介やニュースを見てみよう。'}</p>${departments ? `<p class="department">掲載分野：${escape(departments)}</p>` : ''}<p class="source-links">${sourceURLs.map((url, i) => externalLink(url, i === 0 ? '紹介内容の出典' : '成果の出典')).join(' / ')}</p><p class="checked-date">掲載情報の確認日：${escape(lab.checkedAt)}。教員の所属や募集状況は変わることがあります。</p></div></details>
    <div class="lab-links">${externalLink(lab.url, '公式ページでのぞいてみる', 'official-link')}${externalLink(`https://www.google.com/search?q=${encodeURIComponent(moreQuery)}`, '同じテーマの大学も探す', 'other-university-link')}</div></div>
    <aside class="question-sticky"><span>たとえば、こんな問い</span><p>${escape(suggestedQuestion(lab, topicMap, profile))}</p><small>研究の入口としての例です</small><button class="save-lab" data-save="${lab.id}" aria-pressed="${saved}" aria-label="${escape(lab.name)}を気になるテーマに${saved ? '保存済み' : '保存'}">${icon('heart')} ${saved ? '気になるに保存済み' : '気になるに保存'}</button></aside>
  </article>`;
}

function renderResults() {
  if (!catalogue) return renderStart();
  state.phase = 'results';
  let results;
  try { results = recommend(catalogue.labs, state.answers, state.count); }
  catch (error) { main.innerHTML = `<section class="error-view"><h1 tabindex="-1">候補を表示できませんでした</h1><p>${escape(error.message)}</p><button class="button button-primary" data-action="home">最初の画面へ戻る</button></section>`; return; }
  memoResults = results;
  const profile = buildProfile(state.answers);
  const interests = topTopics(profile, topicMap, 5);
  document.title = `${state.count}件の研究と出会う — その先ラボ`;
  main.innerHTML = `<section class="results-intro"><p class="results-complete">${icon('spark')} 好きの先で、見つけたもの。</p><h1 tabindex="-1">こんな研究の世界が<br>ありました。</h1><p>気になるものがひとつあれば、それだけでいい。<br>ここから、大学でやってみたいことを想像してみよう。</p><div class="result-interests">${interests.length ? interests.map(topic => `<span class="small-topic group-${groups.has(topic.group) ? topic.group : 'culture'}">${escape(topic.label)}</span>`).join('') : '<span class="small-topic group-culture">いろいろな分野をのぞく、自由探索</span>'}</div>
    <div class="results-tools"><div><strong id="result-count-label">${results.length}件の候補</strong><label for="result-count">件数を変える</label><select id="result-count" data-result-count>${Array.from({ length: MAX_COUNT }, (_, i) => `<option value="${i + 1}" ${state.count === i + 1 ? 'selected' : ''}>${i + 1}件</option>`).join('')}</select></div><button class="button button-secondary" data-action="memo">先生に見せるメモを保存</button></div>
    <details class="answers-details"><summary>選んだ答えを見直す</summary><ol>${state.answers.map((answer, i) => { const q = ALL_QUESTIONS[answer.questionId]; return `<li><span>${escape(q.title)}</span><strong>${answer.optionIds.map(id => id === 'unsure' ? UNSURE.label : q.options.find(o => o.id === id)?.label || '').map(escape).join('、')}</strong><button data-edit-step="${i}">${i + 1}問目から見直す</button></li>`; }).join('')}</ol></details>
    </section><section class="results-list" aria-labelledby="result-count-label">${results.map((lab, index) => labCard(lab, index, profile)).join('')}</section>
    <section class="next-step"><div class="next-step-star">${icon('spark')}</div><div><h2>「ここ、ちょっと気になる。」<br>その理由を、ひとこと残そう。</h2><p>同じテーマの大学を探す。公開講座を聞いてみる。<br>先生や家族に、このメモを見せてみる。小さな次の一歩でOK。</p><div><button class="button button-primary" data-action="memo">結果をメモにする</button><button class="text-button" data-action="restart">別の「好き」でもう一度</button></div></div></section>
    <p class="results-footnote">ここにあるのは、大学の研究を知るための見本です。研究室のほか、教室・教員の研究テーマや研究センターを含みます。学部の授業や配属、入試は各大学の公式案内も確かめてみてね。</p>`;
}

function render() {
  updateSavedCount();
  if (state.phase === 'quiz') renderQuiz();
  else if (state.phase === 'results') renderResults();
  else renderStart();
}
function chooseOption(id) {
  const question = getNextQuestion(state.answers);
  if (!question || !optionsFor(question).some(option => option.id === id)) return;
  if (id === 'unsure' || !question.multiple) state.draft = [id];
  else state.draft = state.draft.includes(id) ? state.draft.filter(item => item !== id) : [...state.draft.filter(item => item !== 'unsure'), id];
  main.querySelectorAll('[data-option]').forEach(button => button.setAttribute('aria-pressed', state.draft.includes(button.dataset.option)));
  const next = main.querySelector('[data-action="next"]');
  if (next) next.disabled = !validateAnswer(question, state.draft);
}
function advance(skip = false) {
  const question = getNextQuestion(state.answers);
  const ids = skip ? ['unsure'] : state.draft;
  if (!question || !validateAnswer(question, ids)) return;
  state.answers.push({ questionId: question.id, optionIds: [...ids] });
  state.draft = [];
  state.phase = state.answers.length >= TOTAL_QUESTIONS ? 'results' : 'quiz';
  save(); render(); focusHeading();
}
function editStep(step) {
  if (!Number.isInteger(step) || step < 0 || step >= state.answers.length) return;
  state.draft = [...state.answers[step].optionIds];
  state.answers = state.answers.slice(0, step);
  state.phase = 'quiz'; save(); render(); focusHeading();
}
function toggleSaved(id) {
  if (!catalogue?.labs.some(lab => lab.id === id)) return;
  const isSaved = state.saved.has(id);
  if (isSaved) state.saved.delete(id); else state.saved.add(id);
  save(); updateSavedCount();
  main.querySelectorAll('[data-save]').forEach(button => {
    if (button.dataset.save !== id) return;
    button.setAttribute('aria-pressed', !isSaved);
    const lab = catalogue.labs.find(item => item.id === id);
    button.setAttribute('aria-label', `${lab.name}を気になるテーマに${!isSaved ? '保存済み' : '保存'}`);
    button.innerHTML = icon('heart') + (!isSaved ? ' 気になるに保存済み' : ' 気になるに保存');
  });
  notify(isSaved ? '気になるから外しました' : state.storage ? 'このブラウザーの「気になる」に保存しました' : 'この画面の「気になる」に保存しました');
}
function showDialog(content) {
  dialogContent.innerHTML = content;
  if (!dialog.open) dialog.showModal();
}
function showAbout() {
  showDialog(`<span class="dialog-symbol">${icon('spark')}</span><h2 id="dialog-title">好きの先を、のぞくために。</h2><p>その先ラボは、志望校がまだ決まっていない高校生が、大学でどんなことを研究できるか知るためのツールです。</p><h3>質問から、何を探しているの？</h3><p>好きなもの、その理由、やってみたい調べ方と近い研究テーマを紹介します。「まだわからない」も選べます。向き不向きや合格の可能性を決めるテストではありません。</p><h3>紹介しているデータ</h3><p>東京大学の公式一覧をもとに作った2,988行のCSVを使い、重複などを整理しています。研究内容を説明できる東大のテーマと、国内外の${catalogue?.stats.additionalUniversities || 4}大学の研究を合わせた${catalogue?.stats.eligible.toLocaleString('ja-JP') || '—'}件を候補にしています。</p><p>教員の研究テーマや研究センターは、その種類を表示しています。表示する数は1〜20件で選べ、選んだ数だけ紹介します。</p><h3>説明と成果について</h3><p>研究分野を分かりやすく言い換えた説明を含みます。「たとえば、こんな問い」は研究に興味を持つための例で、その研究室が今まさに取り組んでいる課題とは限りません。</p><p>成果は出典を確認できたものだけを紹介しています。未確認は、成果がないという意味ではありません。同じ教員の別の所属で紹介された成果を含む場合もあります。</p><p>情報の確認日：${escape(catalogue?.checkedAt || '2026-10-28')}。所属・研究内容・募集状況は変わることがあります。</p><h3>大学選びにつなげるには</h3><p>東大は、幅広い研究を知るための出発点です。同じテーマを研究するほかの大学や、学部の授業、入試の公式案内にも広げてみてください。</p><h3>回答の保存</h3><p>回答と「気になる」は、保存が使える場合、このブラウザー内にだけ残ります。アカウント登録や、回答の外部送信はありません。</p>`);
}
function showSaved() {
  const labs = catalogue?.labs.filter(lab => state.saved.has(lab.id)) || [];
  showDialog(`<h2 id="dialog-title">あなたの「気になる」</h2>${labs.length ? `<p>あとで公式ページをのぞいたり、だれかに話してみたり。</p><ul class="saved-list">${labs.map(lab => `<li><span>${escape(lab.university)}</span>${externalLink(lab.url, lab.name)}<p>${escape(lab.description)}</p></li>`).join('')}</ul>` : '<p>結果の「気になるに保存」を押すと、ここに残せます。小さな興味を、集めてみよう。</p>'}`);
}
function downloadMemo() {
  if (!memoResults.length) return;
  const content = '\ufeff' + summaryText(memoResults, state.answers, topicMap);
  const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'その先ラボ_気になる研究メモ.txt';
  anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  notify('研究メモをダウンロードしました');
}

document.addEventListener('click', event => {
  const target = event.target.closest('button');
  if (!target || target.disabled) return;
  if (target.dataset.option) return chooseOption(target.dataset.option);
  if (target.dataset.save) return toggleSaved(target.dataset.save);
  if (target.hasAttribute('data-edit-step')) return editStep(Number(target.dataset.editStep));
  if (target.dataset.countPreset) {
    state.count = validateCount(target.dataset.countPreset); state.countError = ''; save(); renderStart();
    main.querySelector(`[data-count-preset="${state.count}"]`)?.focus(); return;
  }
  switch (target.dataset.action) {
    case 'home': state.phase = 'start'; state.draft = []; render(); focusHeading(); break;
    case 'start': if (!catalogue || state.countError) break; state.answers = []; state.draft = []; state.phase = 'quiz'; save(); render(); focusHeading(); break;
    case 'resume': if (!catalogue) break; state.draft = []; state.phase = state.answers.length >= TOTAL_QUESTIONS ? 'results' : 'quiz'; render(); focusHeading(); break;
    case 'restart': state.answers = []; state.draft = []; state.phase = 'start'; save(); render(); focusHeading(); break;
    case 'back': if (!state.answers.length) { state.phase = 'start'; render(); focusHeading(); } else editStep(state.answers.length - 1); break;
    case 'next': advance(); break;
    case 'skip': advance(true); break;
    case 'about': showAbout(); break;
    case 'saved': showSaved(); break;
    case 'close-dialog': dialog.close(); break;
    case 'memo': downloadMemo(); break;
    case 'reload': loadData(); break;
  }
});
document.addEventListener('input', event => {
  if (!event.target.matches('[data-start-count]')) return;
  const input = event.target;
  try { state.count = validateCount(input.value); state.countError = ''; save(); }
  catch (error) { state.countError = error.message; }
  input.setAttribute('aria-invalid', !!state.countError);
  document.querySelector('#count-error').textContent = state.countError;
  document.querySelectorAll('[data-count-preset]').forEach(button => button.setAttribute('aria-pressed', Number(button.dataset.countPreset) === state.count && !state.countError));
  const start = main.querySelector('[data-action="start"]');
  if (start) start.disabled = loading || !!loadError || !!state.countError;
});
document.addEventListener('change', event => {
  if (!event.target.matches('[data-result-count]')) return;
  try { state.count = validateCount(event.target.value); save(); renderResults(); main.querySelector('[data-result-count]')?.focus(); }
  catch (error) { notify(error.message); }
});
dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });

async function loadData() {
  loading = true; loadError = ''; render();
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 25000);
  try {
    const responses = await Promise.all(['data/catalog.json', 'data/topics.json'].map(path => fetch(new URL(path, import.meta.url), { signal: controller.signal })));
    if (responses.some(response => !response.ok)) throw new Error('Data request failed');
    const [data, topics] = await Promise.all(responses.map(response => response.json()));
    if (data.schemaVersion !== 1 || !Array.isArray(data.labs) || data.labs.filter(lab => lab.eligible).length < MAX_COUNT) throw new Error('Incomplete catalogue');
    catalogue = data; topicMap = Object.fromEntries(topics.map(topic => [topic.id, topic]));
    const ids = new Set(catalogue.labs.map(lab => lab.id)); state.saved = new Set([...state.saved].filter(id => ids.has(id)));
  } catch { loadError = '研究テーマを読み込めませんでした'; }
  finally { clearTimeout(timeout); loading = false; render(); }
}

restore();
loadData();
