import { editAnswer, savedIds, writeSession } from './session.js';
import { ALL_QUESTIONS, FACET_LABELS, BANK_REVISION } from './questions.js';
import { MAX_QUESTIONS, MAX_COUNT, configureCatalog, assessmentState, buildProfile, getNextQuestion, normalizeAnswers, optionsFor, recommend, summaryText, suggestedQuestion, topTopics, validateAnswer, validateCount } from './engine.js';

const KEY = 'sonosaki-lab:evidence-v4';
const main = document.querySelector('#main');
const dialog = document.querySelector('#info-dialog');
const dialogContent = document.querySelector('#dialog-content');
const groups = new Set(['culture', 'expression', 'human', 'society', 'place', 'nature', 'life', 'matter', 'universe', 'logic', 'technology']);
const hookIcons = ['spark', 'puzzle', 'book', 'leaf', 'planet', 'code', 'eye', 'brush', 'clock', 'people', 'bowl', 'city'];
let catalogueQuery='', cataloguePage=0, dialogKind=null;
let catalogue = null, topicMap = {}, loading = true, loadError = '', memoResults = [], toastTimer;
const state = { bankRevision: BANK_REVISION, editing: null, keepExploring: false, migrated: false, recommendationSeed: crypto.getRandomValues(new Uint32Array(1))[0], seed: crypto.getRandomValues(new Uint32Array(1))[0], phase: 'start', count: 5, answers: [], draft: [], saved: new Set(), storage: true, countError: '' };

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
  try { state.storage = writeSession(localStorage, KEY, state, 4); } catch { state.storage=false; }
}
function currentQuestion() {
  return state.editing ? ALL_QUESTIONS[state.editing.questionId] : getNextQuestion(state.answers, state.count, state.seed, state.keepExploring);
}
function restore() {
  try {
    let raw = localStorage.getItem(KEY);
    if (!raw) {
      const previousRaw = localStorage.getItem('sonosaki-lab:adaptive-v3') || localStorage.getItem('sonosaki-lab:yesno-v2');
      if (previousRaw && previousRaw.length <= 2000000) {
        const previous = JSON.parse(previousRaw);
        if ([2,3].includes(previous.version)) { raw = JSON.stringify({version:4,count:previous.count,saved:previous.saved,answers:[],seed:state.seed}); state.migrated=true; }
      }
    }
    if (!raw) return;
    const stored = JSON.parse(raw);
    if (stored.version !== 4) return;
    state.keepExploring = stored.keepExploring === true;
    state.editing = stored.editing || null;
    if (Number.isInteger(stored.recommendationSeed) && stored.recommendationSeed >= 0 && stored.recommendationSeed <= 4294967295) state.recommendationSeed = stored.recommendationSeed;
    try { state.count = validateCount(stored.count); } catch { state.count = 5; }
    state.seed = Number.isInteger(stored.seed) && stored.seed >= 0 && stored.seed <= 4294967295 ? stored.seed : state.seed;
    state.answers = Array.isArray(stored.answers) ? stored.answers.slice(0, MAX_QUESTIONS) : [];
    if (stored.bankRevision !== BANK_REVISION) { state.answers=[]; state.editing=null; state.migrated=true; }
    if (Array.isArray(stored.saved)) state.saved = new Set(savedIds(stored.saved));
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
  return `${catalogue.stats.entries.toLocaleString('ja-JP')}件の研究紹介を収録。推薦は個別確認済みの${catalogue.stats.eligible}件が対象です。未確認の紹介は照合待ちと表示します。`;
}
function renderStart() {
  state.countError = '';
  state.phase = 'start';
  document.title = 'その先ラボ — 好きから、大学の研究へ。';
  const hasHistory = state.answers.length > 0 || !!state.editing;
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
          ${hasHistory ? `<button class="resume-button" data-action="resume">${state.answers.length}問目までの続き・結果へ</button>` : ''}
          <p class="time-note">はい・いいえで答える / 研究例を読んでから考えられます</p>${state.migrated ? '<p class="migration-note">質問が新しくなりました。「気になる」は引き継ぎ、回答は最初から始めます。</p>' : ''}
        </div>
        <p class="data-line" role="status">${escape(dataLine())}</p><button class="text-button" data-action="catalogue">回答せずに研究紹介を読む</button>
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
    <section class="how-it-works" aria-label="探し方"><div><span class="step-dot">1</span><p>はい・いいえで答える</p></div><span class="path-connector" aria-hidden="true"></span><div><span class="step-dot">2</span><p>好きの理由をたどる</p></div><span class="path-connector" aria-hidden="true"></span><div><span class="step-dot">3</span><p>研究室の世界をのぞく</p></div></section>
    <section class="opening-note"><h2>大学を決める前に、<br class="mobile-only">やってみたいことに出会おう。</h2><p>東大の幅広い研究を出発点に、国内外の個性的な研究も紹介します。<br>気になったテーマを見つけたら、同じ研究をしているほかの大学にも広げてみてね。</p></section>`;
}

function renderQuiz() {
  state.phase = 'quiz';
  const question = currentQuestion();
  if (!question) return renderResults();
  const step = state.answers.length;
  const comprehension = question.stage.startsWith('understanding');
  const checkpoint = question.stage === 'checkpoint';
  const captions = comprehension ? ['イメージできた', question.stage === 'understanding' ? '説明をもう少し' : '別の例へ進む'] : checkpoint ? ['もう少し見てみる','ここで区切る'] : ['ちょっと気になる','今はそうでもない'];
  const progress = assessmentState(state.answers, state.count, state.seed, state.keepExploring);
  const interests = topTopics(buildProfile(state.answers), topicMap, 4);
  document.title = `${step + 1}問目 — その先ラボ`;
  main.innerHTML = `<div class="quiz-shell binary-shell">
    <div class="quiz-progress"><button class="back-button" data-action="back">${step ? '前の質問へ' : '最初の画面へ'}</button><span>${step + 1}<small> 問目・回答に合わせて探索中</small></span></div>
    <div class="coverage-progress"><progress class="progress-track" value="${progress.coverage}" max="${progress.totalGroups}" aria-label="広い分野の確認状況"></progress><span>${progress.totalGroups}分野のうち${progress.coverage}分野の入口を確認</span></div>
    <section class="question-section" aria-labelledby="question-title"><p class="question-stage">${step === 0 ? 'まずは、こんな「好き」から。' :  '研究の世界を、のぞいてみよう。'}</p>${question.lesson ? `<aside class="lesson-card"><span>大学では、こんな研究も。</span><h2>${escape(question.lessonTitle)}</h2><p>${escape(question.lesson)}</p>${externalLink(question.sourceURL,'研究内容の公式紹介')}</aside>` : ''}<h1 id="question-title" tabindex="-1">${escape(question.title)}</h1><p class="question-note">${escape(question.note)}</p>
    <div class="binary-options" role="group" aria-labelledby="question-title">${question.options.map((item,i)=>`<button class="binary-choice ${i === 0 ? 'answer-yes' : 'answer-no'}" data-option="${item.id}" aria-pressed="${state.draft.includes(item.id)}"><span aria-hidden="true">${i === 0 ? '○' : '−'}</span><strong>${item.label}</strong><small>${captions[i]}</small></button>`).join('')}</div>
    <p class="binary-help">今の気分で選んでね。答えを押すと次の質問に進みます。<br>「いいえ」は、向いていないという意味ではありません。</p></section>
    <div class="quiz-bottom"><div class="current-interests">${interests.length ? `<span>いま、気になっていること</span><div>${interests.map(t=>`<span class="small-topic group-${groups.has(t.group)?t.group:'culture'}">${escape(t.label)}</span>`).join('')}</div>` : '<p>まだ「はい」がなくても大丈夫。<br>いろいろな入口をのぞいていこう。</p>'}</div><div class="adaptive-controls"><span class="binary-remaining">個別の3根拠がそろった候補：${progress.qualifiedCount}件</span><button class="button button-secondary" data-action="view-results">${progress.ready ? `${state.count}件の候補と根拠を見る` : 'いまの確認状況を見る'}</button></div></div></div>`;
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
    <div class="match-reasons"><strong>この研究とのつながりを確認した3つの理由</strong><ol>${lab.reasons.map(r=>`<li><span class="evidence-facet">${escape(FACET_LABELS[r.facet])}</span><p>「${escape(r.label)}」に、はい</p><p class="evidence-claim">研究内容との対応：${escape(r.claim)}</p><small>${externalLink(r.sourceURL,'個別の対応を確認した出典')} / ${escape(r.sourceLocator)} / ${escape(r.checkedAt)}</small></li>`).join('')}</ol></div>
    <details class="research-details"><summary>研究の紹介・成果と出典を見る</summary><div><p class="detail-label">${lab.achievementType === 'publication' ? '本や論文にまとめた成果の例' : 'どんな成果が紹介されている？'}</p><p>${lab.achievement ? escape(lab.achievement) : '具体的な成果の説明は、このデータでは未確認です。気になったら、公式ページの研究紹介やニュースを見てみよう。'}</p>${departments ? `<p class="department">掲載分野：${escape(departments)}</p>` : ''}<p class="source-links">${sourceURLs.map((url, i) => externalLink(url, i === 0 ? '紹介内容の出典' : '成果の出典')).join(' / ')}</p><p class="checked-date">掲載情報の確認日：${escape(lab.checkedAt)}。教員の所属や募集状況は変わることがあります。</p></div></details>
    <div class="lab-links">${externalLink(lab.url, '公式ページでのぞいてみる', 'official-link')}${externalLink(`https://www.google.com/search?q=${encodeURIComponent(moreQuery)}`, '同じテーマの大学も探す', 'other-university-link')}</div></div>
    <aside class="question-sticky"><span>たとえば、こんな問い</span><p>${escape(suggestedQuestion(lab, topicMap, profile))}</p><small>公式の研究紹介から考える入口です。学生の活動や配属を保証しません</small><button class="save-lab" data-save="${lab.id}" aria-pressed="${saved}" aria-label="${escape(lab.name)}を気になるテーマに${saved ? '保存済み' : '保存'}">${icon('heart')} ${saved ? '気になるに保存済み' : '気になるに保存'}</button></aside>
  </article>`;
}

function renderResults() {
  if (!catalogue) return renderStart();
  state.phase = 'results';
  let results;
  try { results = recommend(catalogue.labs, state.answers, state.count, state.recommendationSeed); }
  catch (error) { main.innerHTML = `<section class="error-view"><h1 tabindex="-1">候補を表示できませんでした</h1><p>${escape(error.message)}</p><button class="button button-primary" data-action="home">最初の画面へ戻る</button></section>`; return; }
  memoResults = results;
  const profile = buildProfile(state.answers);
  const progress = assessmentState(state.answers, state.count, state.seed, state.keepExploring);
  const interests = topTopics(profile, topicMap, 5);
  document.title = results.length ? `${results.length}件の研究と出会う — その先ラボ` : '研究とのつながりを確認中 — その先ラボ';
  main.innerHTML = `<section class="results-intro"><p class="results-complete">${icon('spark')} 好きの先で、見つけたもの。</p><h1 tabindex="-1">${results.length ? '3つの理由から、<br>こんな研究へ。' : '知った研究を、<br>次の一歩に。'}</h1><p>${results.length ? '気になるものがひとつあれば、それだけでいい。<br>大学でやってみたいことを想像してみよう。' : '推薦の条件に合わなくても、研究を知ることから始められます。<br>興味が見つからないことは、向いていないという意味ではありません。'}</p><div class="result-interests">${interests.length ? interests.map(topic => `<span class="small-topic group-${groups.has(topic.group) ? topic.group : 'culture'}">${escape(topic.label)}</span>`).join('') : '<span class="small-topic group-culture">研究テーマとのつながりを確認中</span>'}</div>
    <div class="results-tools"><div><strong id="result-count-label">${results.length}件 / 希望${state.count}件</strong><label for="result-count">件数を変える</label><select id="result-count" data-result-count>${Array.from({ length: MAX_COUNT }, (_, i) => `<option value="${i + 1}" ${state.count === i + 1 ? 'selected' : ''}>${i + 1}件</option>`).join('')}</select></div><button class="button button-secondary" data-action="memo">先生に見せるメモを保存</button></div>
    ${results.length<state.count ? `<div class="evidence-notice" role="status"><strong>希望の${state.count}件に対し、3種類の根拠がそろった候補は${results.length}件です。</strong><p>足りない理由を作って候補を増やすことはしません。${progress.exhausted ? '現在用意できた研究例をひと区切りまで見ました。紹介一覧や公式ページからも広げられます。' : '別の研究例を読むことも、ここで区切ることもできます。'}</p></div>` : ''}
    ${!progress.exhausted ? `<button class="button button-secondary continue-button" data-action="continue">${progress.automaticStop ? 'ほかの入口も、もう少し探す' : '質問を続けて、もう少し探す'}</button>` : ''}
    <p class="adaptive-note">${state.answers.length}問に回答。${progress.completedExamples}件の研究例を確認。${progress.stopReason==='user-pause'?'あなたが選んだ区切りです。':'本人の回答と個別研究の対応がそろった候補を表示しています。'}区切りの間隔や質問数の最適性は、利用者テストで検証予定です。</p>
    <button class="button button-secondary" data-action="catalogue">研究紹介を読む（推薦とは別の一覧）</button><details class="answers-details"><summary>選んだ答えを見直す</summary><ol>${state.answers.map((answer, i) => { const q = ALL_QUESTIONS[answer.questionId]; return `<li><span>${escape(q.title)}</span><strong>${answer.optionIds.map(id => q.options.find(o => o.id === id)?.label || '').map(escape).join('、')}</strong><button data-edit-step="${i}">${i + 1}問目から見直す</button></li>`; }).join('')}</ol></details>
    </section><section class="results-list" aria-labelledby="result-count-label">${results.map((lab, index) => labCard(lab, index, profile)).join('')}</section>
    <section class="next-step"><div class="next-step-star">${icon('spark')}</div><div><h2>「ここ、ちょっと気になる。」<br>その理由を、ひとこと残そう。</h2><p>同じテーマの大学を探す。公開講座を聞いてみる。<br>先生や家族に、このメモを見せてみる。小さな次の一歩でOK。</p><div><button class="button button-primary" data-action="memo">結果をメモにする</button><button class="text-button" data-action="restart">別の「好き」でもう一度</button></div></div></section>
    <p class="results-footnote">ここにあるのは、大学の研究を知るための見本です。研究室のほか、教室・教員の研究テーマや研究センターを含みます。学部の授業や配属、入試は各大学の公式案内も確かめてみてね。</p>`;
}

function render() {
  updateSavedCount();
  if (state.phase === 'quiz') renderQuiz();
  else if (state.phase === 'results') renderResults();
  else renderStart();
  if (!state.storage) main.insertAdjacentHTML('afterbegin','<p class="evidence-notice" role="status">ブラウザーに保存できていません。この画面では使えますが、閉じると変更が失われる場合があります。</p>');
}
function chooseOption(id) {
  const question = currentQuestion();
  if (!question || !optionsFor(question).some(option => option.id === id)) return;
  state.draft = [id];
  advance();
}
function advance() {
  const question = currentQuestion();
  const ids = state.draft;
  if (!question || !validateAnswer(question, ids)) return;
  state.answers.push({ questionId: question.id, optionIds: [...ids], targetCount: state.editing?.targetCount ?? state.count, continued: state.editing?.continued ?? state.keepExploring });
  state.editing = null;
  state.keepExploring = false;
  state.draft = [];
  state.phase = getNextQuestion(state.answers,state.count,state.seed,state.keepExploring) ? 'quiz' : 'results';
  save(); render(); focusHeading();
}
function editStep(step) {
  if (!Number.isInteger(step) || step < 0 || step >= state.answers.length) return;
  const edit = editAnswer(state.answers, step);
  state.draft = [...edit.editing.optionIds];
  state.answers = edit.answers;
  state.editing = edit.editing;
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
  if (dialog.open && dialogKind==='saved') showSaved();
  else if (dialog.open && dialogKind==='catalogue') showCatalogue();
  if (dialog.open) (dialogContent.querySelector(`[data-save="${id}"]`) || dialogContent.querySelector('[data-save]') || dialog.querySelector('[data-action="close-dialog"]'))?.focus();
  notify(!state.storage ? 'ブラウザーへの保存に失敗しました。変更はこの画面内だけで保持しています' : isSaved ? '気になるから外しました' : 'このブラウザーの「気になる」に保存しました');
}
function showDialog(content) {
  dialogContent.innerHTML = content;
  if (!dialog.open) dialog.showModal();
}
function showAbout() {
  dialogKind='about';
  showDialog(`<h2 id="dialog-title">研究を知って、関心を探すために。</h2><p>質問ははい／いいえ。研究例を読んで内容をイメージできたか確認してから、対象・問い・取り組みへの関心を尋ねます。理解確認のいいえを、興味がないという意味には使いません。</p><h3>推薦と研究紹介の違い</h3><p>推薦は、異なる3つの肯定回答と、その研究室の公式内容との対応を確認できる場合だけ行います。タグや大学名だけで根拠を作りません。希望1〜20件に満たない場合は実数を表示します。</p><p>紹介一覧には全${catalogue?.stats.entries||0}件を残しています。個別根拠の確認済みは${catalogue?.stats.eligible||0}件、未確認は${catalogue?.stats.pendingReview||0}件です。推薦するのは個別確認済みの研究だけです。未確認の項目は照合待ちと表示し、推薦には使いません。</p><h3>質問数と公平さ</h3><p>全11分野の入口を見た後、関心に近い研究例から読めます。どの分野もいいえだけで完全除外しません。3例ごとに続行するか選べます。この間隔は仮の運用値で、統計的な最適値ではありません。同じ条件の候補は抽選し、希望に応じて違う分野を先に並べます。</p><p>全候補の到達・根拠の形式を機械検査しますが、意味の正しさは個別資料で別に確認します。実利用時の表示回数を等しくする保証はありません。</p><h3>保存と出典</h3><p>回答と気になるはこのブラウザー内だけに保存します。外部送信・解析タグはありません。保存ができない場合は通知します。過去版の回答は新しい質問に使い回さず、保存候補だけ引き継ぎます。</p><p>研究内容の出典箇所と確認日を各理由に示します。研究例は学生の活動・配属・募集を保証するものではありません。成果が未確認の場合は成果なしと断定しません。</p>`);
}
function showSaved() {
  dialogKind="saved";
  const labs = catalogue?.labs.filter(lab => state.saved.has(lab.id)) || [];
  showDialog(`<h2 id="dialog-title">あなたの「気になる」</h2>${labs.length ? `<p>あとで公式ページをのぞいたり、だれかに話してみたり。</p><ul class="saved-list">${labs.map(lab => `<li><span>${escape(lab.university)} / ${lab.eligible?'個別の対応確認済み':'旧データの説明（個別照合待ち）'}</span>${externalLink(lab.url, lab.name)}<p>${escape(lab.description)}</p><button class="text-button" data-save="${lab.id}">気になるから外す</button></li>`).join('')}</ul>` : '<p>結果の「気になるに保存」を押すと、ここに残せます。小さな興味を、集めてみよう。</p>'}`);
}

function showCatalogue() {
  dialogKind='catalogue';
  const query=catalogueQuery.trim().toLocaleLowerCase();
  const labs=(catalogue?.labs||[]).filter(lab=>[lab.name,lab.university,...lab.faculty,...lab.departments].join(' ').toLocaleLowerCase().includes(query));
  const pageCount=Math.max(1,Math.ceil(labs.length/30));
  cataloguePage=Math.min(cataloguePage,pageCount-1);
  const page=labs.slice(cataloguePage*30,(cataloguePage+1)*30);
  showDialog(`<h2 id="dialog-title">研究紹介を、自由に読む</h2><p>推薦結果とは別の一覧です。未確認の紹介文は、個別研究の根拠として使用しません。</p><label for="catalogue-search">大学・研究室・学部名で探す</label><input id="catalogue-search" data-catalogue-search value="${escape(catalogueQuery)}" type="search"><p role="status">${labs.length}件 / ${cataloguePage+1}ページ目（全${pageCount}ページ）</p><ul class="saved-list">${page.map(lab=>`<li><span>${escape(lab.university)} / ${lab.eligible?'個別の対応確認済み':'個別照合待ち'}</span>${externalLink(lab.url,lab.name)}<p>${escape(lab.description)}</p>${!lab.eligible?`<small>旧データの説明（個別照合待ち）。次の確認：${escape(lab.review.nextAction)}</small>`:''}<button class="text-button" data-save="${lab.id}" aria-pressed="${state.saved.has(lab.id)}">${state.saved.has(lab.id)?'気になるから外す':'気になるに保存'}</button></li>`).join('')}</ul><div class="catalogue-pages"><button data-action="catalogue-prev" ${cataloguePage===0?'disabled':''}>前のページ</button><button data-action="catalogue-next" ${cataloguePage+1>=pageCount?'disabled':''}>次のページ</button></div>`);
}

function downloadMemo() {
  if (!catalogue) return;
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
    case 'start': if (!catalogue || state.countError) break; state.editing=null; state.keepExploring=false; state.migrated=false; state.seed = crypto.getRandomValues(new Uint32Array(1))[0]; state.recommendationSeed = crypto.getRandomValues(new Uint32Array(1))[0]; state.answers = []; state.draft = []; state.phase = 'quiz'; save(); render(); focusHeading(); break;
    case 'resume': if (!catalogue) break; state.draft = state.editing ? [...state.editing.optionIds] : []; state.phase = currentQuestion() ? 'quiz' : 'results'; render(); focusHeading(); break;
    case 'view-results': state.phase='results'; render(); focusHeading(); break;
    case 'continue': if (!catalogue) break; if (assessmentState(state.answers,state.count,state.seed,state.keepExploring).automaticStop) state.keepExploring=true; state.phase='quiz'; save(); render(); focusHeading(); break;
    case 'restart': state.editing=null; state.keepExploring=false; state.answers = []; state.draft = []; state.phase = 'start'; save(); render(); focusHeading(); break;
    case 'back': if (!state.answers.length) { state.phase = 'start'; render(); focusHeading(); } else editStep(state.answers.length - 1); break;
    case 'about': showAbout(); break;
    case 'catalogue': catalogueQuery=''; cataloguePage=0; showCatalogue(); break;
    case 'catalogue-prev': cataloguePage=Math.max(0,cataloguePage-1); showCatalogue(); break;
    case 'catalogue-next': cataloguePage++; showCatalogue(); break;
    case 'saved': showSaved(); break;
    case 'close-dialog': dialog.close(); break;
    case 'memo': downloadMemo(); break;
    case 'reload': loadData(); break;
  }
});
document.addEventListener('input', event => {
  if (event.target.matches('[data-catalogue-search]')) { const caret=event.target.selectionStart; catalogueQuery=event.target.value; cataloguePage=0; showCatalogue(); const input=dialogContent.querySelector('[data-catalogue-search]'); input.focus(); input.setSelectionRange(caret,caret); return; }
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
    if (data.schemaVersion !== 2 || !Array.isArray(data.labs)) throw new Error('Incomplete catalogue');
    catalogue = data; configureCatalog(catalogue.labs); state.answers = normalizeAnswers(state.answers,state.count,state.seed); topicMap = Object.fromEntries(topics.map(topic => [topic.id, topic]));
    if (state.editing) {
      const expected = getNextQuestion(state.answers,state.editing.targetCount ?? state.count,state.seed,state.editing.continued === true);
      if (expected?.id !== state.editing.questionId) state.editing=null;
    }
    const ids = new Set(catalogue.labs.map(lab => lab.id)); state.saved = new Set([...state.saved].filter(id => ids.has(id)));
  } catch { loadError = '研究テーマを読み込めませんでした'; }
  finally { clearTimeout(timeout); loading = false; render(); }
}

restore();
loadData();
