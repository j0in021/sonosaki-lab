const option = (id, label, detail, topics = {}, methods = {}) => ({ id, label, detail, topics, methods });

export const METHODS = {
  read: '本や資料を読み解く', people: '人の話を聞く', experiment: '実験して確かめる',
  code: 'プログラムやデータを使う', math: '数式や筋道で考える', create: '作って試す', outdoor: '現地に出て観察する',
};

export const FIXED = {
  hooks: {
    id: 'hooks', title: 'どれなら、つい見ちゃう？', note: '好きなものも、ちょっと気になるものも。いくつ選んでもOK。', multiple: true,
    options: [
      option('hook_curse', '呪術廻戦・ふしぎな伝承', '呪い、言い伝え、なぜか信じたくなる話', { religion: 1.7, folklore: 1.7, literature: .8, mind: .5 }),
      option('hook_games', 'ゲーム・謎解き', '遊ぶのも、仕組みを考えるのも', { games: 2, maths: .8, ai: .5, design: .5 }),
      option('hook_story', 'アニメ・映画・物語', '世界観、キャラクター、心に残る言葉', { media: 1.6, literature: 1.6, art: .6, mind: .5 }),
      option('hook_animals', '動物・植物・自然', '生き物の行動や、育つ仕組み', { animals: 1.5, ecology: 1.3, agriculture: 1, cells: .4 }),
      option('hook_space', '宇宙・星・深海', 'まだよく分からない、遠くて大きな世界', { space: 1.8, oceans: 1.1, physics: .7, earth: .6 }),
      option('hook_tech', 'AI・ロボット・ガジェット', '便利な道具や、未来っぽい技術', { ai: 1.5, robots: 1.5, software: .8, design: .6 }),
      option('hook_mind', '人の心・人間関係', '性格、記憶、恋愛、どうしてそう思うのか', { mind: 1.8, brain: 1, society: .8 }),
      option('hook_art', '音楽・絵・ものづくり', '聴く、見る、描く、手を動かす', { art: 1.8, design: 1.4, materials: .5 }),
      option('hook_history', '歴史・言葉・外国の暮らし', '昔の人の考えや、知らない文化', { history: 1.7, language: 1.2, folklore: .8, politics: .4 }),
      option('hook_social', '社会の「なんで？」', 'お金、ルール、不公平、ニュース', { society: 1.5, law: 1.1, economy: 1.1, politics: 1 }),
      option('hook_food', '食べ物・健康・スポーツ', 'おいしさ、体の仕組み、うまくなるコツ', { food: 1.3, medicine: 1, sports: 1.2, brain: .4 }),
      option('hook_city', '街・建物・地球の未来', '居心地のよさ、環境、災害への備え', { urban: 1.3, architecture: 1.2, environment: 1.3, disaster: .7 }),
    ],
  },
  methods: {
    id: 'methods', title: '調べるなら、どんな時間を過ごしてみたい？', note: '今できるかどうかは関係なし。「やってみたい」で選んでね。', multiple: true,
    options: [
      option('method_read', '本や古い資料を読み解く', '残された言葉や記録から、手がかりを探す', {}, { read: 2 }),
      option('method_people', '人から話を聞いて集める', '体験や言い伝え、いろいろな考え方を聞く', {}, { people: 2 }),
      option('method_experiment', '実験して「本当？」を確かめる', '条件を変えて、起きることを比べる', {}, { experiment: 2 }),
      option('method_code', 'プログラムやデータで探る', '大量の情報から、見えなかった規則を探す', {}, { code: 2 }),
      option('method_math', '数式や筋道でじっくり考える', 'なぜそう言えるのか、納得するまで考える', {}, { math: 2 }),
      option('method_create', 'まず作って、動かしてみる', '試作品、作品、アプリなどでアイデアを試す', {}, { create: 2 }),
      option('method_outdoor', '外に出て観察する', '街、森、海など、その場所で起きることを見る', {}, { outdoor: 2 }),
    ],
  },
  values: {
    id: 'values', title: '研究の先で、どんなことが起きたらうれしい？', note: 'どれも大学での研究につながる、大切なきっかけ。', multiple: true,
    options: [
      option('value_mystery', '分からなかった仕組みが見える', 'すぐに役立たなくても、「そういうことか！」を知りたい', { physics: .5, maths: .5, philosophy: .5, history: .4, cells: .4 }),
      option('value_care', 'だれかの毎日が、少し楽になる', '困りごとや、つらさを減らす手がかりにしたい', { medicine: .7, design: .5, learning: .5, society: .4 }),
      option('value_new', 'まだないものが生まれる', '新しい道具、作品、体験を作ってみたい', { robots: .6, design: .6, art: .5, materials: .5 }),
      option('value_save', '残したいものが、未来に続く', '自然、文化、言葉、記憶を次の世代へつなぎたい', { ecology: .6, history: .5, literature: .5, environment: .5 }),
      option('value_society', '人や社会の見方が変わる', '当たり前を問い直したり、選択肢を増やしたりしたい', { society: .6, politics: .5, philosophy: .5, media: .4 }),
    ],
  },
  scale: {
    id: 'scale', title: 'いま、いちばんのぞいてみたい世界は？', note: '大きさが違っても、研究の面白さに上下はない。', multiple: false,
    options: [
      option('scale_small', '目に見えない、小さな世界', '細胞、分子、材料の中、量子の世界', { cells: .7, genes: .6, chemistry: .6, quantum: .6, materials: .5 }),
      option('scale_person', 'ひとりの頭や体の中', '感じ方、記憶、言葉、健康、動き', { mind: .7, brain: .6, medicine: .5, language: .5, sports: .5 }),
      option('scale_society', '人が集まって暮らす世界', '文化、街、歴史、ルール、お金', { society: .6, history: .5, law: .5, urban: .5, economy: .5, folklore: .5 }),
      option('scale_world', '地球の自然、その先の宇宙', '生態系、気候、海、地層、星', { environment: .6, ecology: .5, oceans: .5, earth: .5, space: .6 }),
    ],
  },
  day: {
    id: 'day', title: '最後に。研究室で1日過ごせるなら？', note: 'いまの気分でOK。ここまでの答えから、候補を探すよ。', multiple: true,
    options: [
      option('day_talk', '話を聞いて、世界の見え方を変えたい', '今まで知らなかった考え方や、だれかの経験に出会う', {}, { people: 1, read: .5 }),
      option('day_test', '自分で試して、驚いてみたい', '実験や観察で、予想と違うことに出会う', {}, { experiment: 1, outdoor: .5 }),
      option('day_build', '何かを作って、動かしてみたい', '自分のアイデアが形になる瞬間を見てみる', {}, { create: 1, code: .5 }),
      option('day_think', 'まだ答えのない問いを考えたい', '資料、データ、数式と向き合って、答えを探す', {}, { math: 1, read: .5, code: .5 }),
    ],
  },
};

export const ADAPTIVE = [
  { id: 'sampler', title: 'この中なら、どの「なぜ？」をのぞいてみたい？', note: 'まだ好きな分野がなくても、小さな引っかかりから始められる。', topics: [], triggers: [], neutral: true, multiple: true, options: [
    option('sampler_people', '人はどうして、信じたり、夢を見たりする？', '心や文化の不思議', { mind: 2, brain: 1, religion: 1, folklore: 1 }),
    option('sampler_life', '生き物はどうやって、今の姿になった？', '生命や自然の不思議', { animals: 2, cells: 1, ecology: 1, genes: 1 }),
    option('sampler_social', '当たり前のルールは、変えられる？', '社会や暮らしの不思議', { society: 2, law: 1, politics: 1, economy: 1 }),
    option('sampler_make', 'まだない道具や体験は、作れる？', 'ものづくりや技術の不思議', { robots: 1, design: 2, ai: 1, physics: 1 }),
  ] },
  { id: 'magic', title: '「呪い」やおまじない。どこが気になる？', note: '物語の「好き」が、歴史や人の心の研究につながることも。', topics: ['religion', 'folklore', 'mind', 'literature'], triggers: ['hook_curse'], multiple: true, options: [
    option('magic_past', '歴史の中で、実際には何だった？', '昔の記録や、信仰の成り立ちを知りたい', { religion: 3, history: 2, folklore: 1 }),
    option('magic_people', '地域に残る、不思議な話を集めたい', '人から聞ける言い伝えや、儀式に興味がある', { folklore: 3, religion: 2, society: 1 }, { people: 1 }),
    option('magic_mind', 'どうして、人は信じてしまう？', '思い込みや、怖いと感じる心の仕組みが気になる', { mind: 3, brain: 1, philosophy: 1 }),
    option('magic_story', '物語として、どう生み出された？', '言葉や絵、演出、キャラクターの表現を見たい', { literature: 3, media: 2, art: 1 }),
  ] },
  { id: 'folklore', title: '昔の人の暮らしを知るなら、何を手がかりにしたい？', note: '同じテーマでも、調べ方によって見えてくるものが変わる。', topics: ['folklore', 'history', 'religion'], triggers: ['magic_past', 'magic_people', 'hook_history'], multiple: true, options: [
    option('folk_records', '古い本や記録を、じっくり読みたい', '当時の言葉をたどって、意味を考える', { history: 2, religion: 2, language: 1 }, { read: 1.4 }),
    option('folk_listen', '人から話を聞いて、集めたい', '伝承や体験を、その土地の人に聞いてみる', { folklore: 3, society: 1 }, { people: 1.4, outdoor: .6 }),
    option('folk_objects', '遺跡や道具を、実際に見たい', '物に残る痕跡から、暮らしを想像する', { history: 3, art: 1 }, { outdoor: 1.2, experiment: .3 }),
    option('folk_compare', '地域や時代の違いを、比べたい', '似ているところや違うところから、理由を探す', { folklore: 2, history: 2, society: 1 }, { read: .6, people: .6 }),
  ] },
  { id: 'games', title: 'ゲームの、どんな裏側をのぞいてみたい？', note: 'ゲームを作る研究も、ゲームそのものを調べる研究もある。', topics: ['games', 'ai', 'design', 'maths'], triggers: ['hook_games'], multiple: true, options: [
    option('game_ai', '敵やキャラクターの賢さ', 'プレイヤーに合わせて、どう動けば面白い？', { ai: 3, software: 2, games: 1 }, { code: .8 }),
    option('game_player', 'つい遊び続けたくなる理由', '人の気持ちと、遊びのルールを知りたい', { games: 3, mind: 2, design: 1 }, { people: .8 }),
    option('game_history', '昔のゲームや、作り手の話', '遊びの文化を集めて、未来へ残したい', { games: 3, history: 2, media: 1 }, { read: .6, people: .6 }),
    option('game_rules', '公平で、面白いルール', '駆け引きや、数学的な仕組みが気になる', { maths: 2, economy: 2, games: 1, law: 1 }, { math: .8 }),
  ] },
  { id: 'stories', title: '物語が好きなのは、どんな瞬間？', note: '作品の「中」だけでなく、作品と社会の関係も研究できる。', topics: ['literature', 'media', 'art', 'philosophy'], triggers: ['hook_story', 'magic_story'], multiple: true, options: [
    option('story_words', '言葉の意味や、伏線に気づいたとき', '小説や詩を、細かく読み解いてみたい', { literature: 3, language: 2 }, { read: 1 }),
    option('story_visual', '映像や絵の見せ方に、心が動いたとき', '表現や演出の仕組みを知りたい', { media: 3, art: 2, design: 1 }, { create: .7 }),
    option('story_questions', '「これって正しい？」と考えたとき', '正義、命、自分とは何かを考えたい', { philosophy: 3, law: 1, society: 1 }, { read: .8 }),
    option('story_future', 'まだない世界を想像したとき', 'SFから、技術や社会の未来を考えたい', { literature: 2, design: 2, society: 2, ai: 1 }, { create: .8 }),
  ] },
  { id: 'mind', title: '人の心について、どの「なぜ？」が気になる？', note: '話を聞く、実験する、脳を調べる。入口はいろいろ。', topics: ['mind', 'brain', 'learning', 'society'], triggers: ['hook_mind', 'magic_mind'], multiple: true, options: [
    option('mind_bias', '思い込みや、勘違いが生まれる理由', '同じものを見ても、答えが違うのはなぜ？', { mind: 3, statistics: 1 }, { experiment: 1 }),
    option('mind_brain', '記憶や夢が生まれる仕組み', '頭の中で、何が起きているんだろう', { brain: 3, cells: 1, mind: 1 }, { experiment: 1 }),
    option('mind_social', '人との関わりで、自分が変わる理由', '集団や人間関係を調べたい', { mind: 2, society: 3 }, { people: 1 }),
    option('mind_learn', '「分かった！」を増やす方法', '学び方や、教え方を考えたい', { learning: 3, mind: 2, design: 1 }),
  ] },
  { id: 'animals', title: '生き物の、何をもっと知りたい？', note: '観察から入っても、ものづくりへ進む道もある。', topics: ['animals', 'ecology', 'cells', 'agriculture'], triggers: ['hook_animals'], multiple: true, options: [
    option('animal_behavior', '不思議な行動や、進化の理由', 'なぜその動きをするのか、見て調べたい', { animals: 3, ecology: 1, mind: 1 }, { outdoor: 1 }),
    option('animal_nature', '自然の中の、いろいろなつながり', '森や海の生き物を守るには？', { ecology: 3, environment: 2, oceans: 1 }, { outdoor: 1 }),
    option('animal_small', '小さな細胞や、遺伝子の働き', '体の仕組みを、もっと細かく見たい', { cells: 3, genes: 3, animals: 1 }, { experiment: 1 }),
    option('animal_robot', '生き物みたいに動く機械', '羽や脚の仕組みを、ロボットに使ってみたい', { robots: 3, design: 2, animals: 1, materials: 1 }, { create: 1 }),
  ] },
  { id: 'food', title: '食べ物を研究するなら、どこが気になる？', note: '台所の「なんで？」も、大学の研究の入口になる。', topics: ['food', 'agriculture', 'medicine', 'chemistry'], triggers: ['hook_food'], multiple: true, options: [
    option('food_taste', 'おいしさや、食感の秘密', '成分や、作り方を変えると何が起きる？', { food: 3, chemistry: 2, mind: 1 }),
    option('food_body', '食べたものが、体で働く仕組み', '栄養、腸、健康のつながりを知りたい', { food: 3, medicine: 2, cells: 1 }),
    option('food_grow', '環境にやさしく、食料を育てる方法', '植物、土、水から考えたい', { agriculture: 3, ecology: 2, environment: 1 }, { outdoor: .8 }),
    option('food_society', '食べ物が届く仕組みや、食文化', '値段や流通、暮らしとの関係が気になる', { economy: 2, society: 2, folklore: 1, food: 1 }),
  ] },
  { id: 'space', title: '遠くて大きな世界の、どの謎を追ってみたい？', note: '宇宙や海を調べるには、観測も計算も機械づくりも必要。', topics: ['space', 'physics', 'oceans', 'earth'], triggers: ['hook_space'], multiple: true, options: [
    option('space_origin', '宇宙や星の始まり', '今届く光や粒から、過去を読み解きたい', { space: 3, physics: 2 }, { math: .7, experiment: .7 }),
    option('space_machine', 'まだ行けない場所を調べる道具', '探査機や、観測する機械を作りたい', { space: 2, robots: 2, measurement: 2 }, { create: 1 }),
    option('space_life', '地球以外にも生命はいる？', '惑星や生命の成り立ちを考えたい', { space: 2, genes: 1, cells: 1, chemistry: 1 }),
    option('space_ocean', '深海や、地球の内側', '身近な星にも、知らない世界が広がっている', { oceans: 3, earth: 2, animals: 1 }, { outdoor: .8 }),
  ] },
  { id: 'tech', title: '未来の技術なら、何を触ってみたい？', note: '「便利そう」から、仕組みの研究へ一歩。', topics: ['ai', 'robots', 'software', 'vr', 'security'], triggers: ['hook_tech', 'game_ai'], multiple: true, options: [
    option('tech_ai', '言葉や画像を理解するAI', 'どう学び、どこで間違えるのか知りたい', { ai: 3, language: 1, software: 1 }),
    option('tech_robot', '人と一緒に動くロボット', '上手につかむ、歩く、助ける機械を作りたい', { robots: 3, design: 1, sports: 1 }, { create: 1 }),
    option('tech_vr', '別の場所や立場を体験するVR', '新しい体験と、人の心の変化が気になる', { vr: 3, mind: 2, design: 1 }),
    option('tech_secure', '情報や通信を守る仕組み', '秘密を守る、間違いを防ぐ方法を考えたい', { security: 3, networks: 2, maths: 1 }, { code: 1 }),
  ] },
  { id: 'social', title: 'ニュースの中で、いちばん引っかかるのは？', note: '社会を知る研究は、データにも、言葉にも、人の経験にも向き合う。', topics: ['society', 'law', 'politics', 'economy'], triggers: ['hook_social'], multiple: true, options: [
    option('social_fair', '公平なルールって、どう決まる？', '法律や権利について考えたい', { law: 3, philosophy: 2 }),
    option('social_money', '値段や、貧しさの違いはなぜ？', 'お金、仕事、市場の仕組みを知りたい', { economy: 3, statistics: 1, society: 1 }),
    option('social_voice', '声の大きさに、なぜ差がある？', '選挙や、みんなで決める仕組みが気になる', { politics: 3, society: 2 }),
    option('social_life', '暮らし方や、家族の形はどう変わる？', '人の話や、社会の変化を調べたい', { society: 3, folklore: 1, history: 1 }, { people: 1 }),
  ] },
  { id: 'city', title: '街を変えられるなら、どこを変えてみたい？', note: '街の研究は、建物だけではない。人の動きや暮らしにも目を向ける。', topics: ['urban', 'architecture', 'disaster', 'design'], triggers: ['hook_city'], multiple: true, options: [
    option('city_space', '居心地のいい建物や、集まれる場所', '空間の形や使い方を考えたい', { architecture: 3, design: 2 }),
    option('city_move', '混雑や、移動の不便さ', '人や物の流れを変える仕組みが気になる', { urban: 3, statistics: 1, software: 1 }),
    option('city_safe', '災害があっても、守られる暮らし', '危険を調べて、備える方法を考えたい', { disaster: 3, earth: 1, urban: 1 }),
    option('city_green', '自然やエネルギーとの付き合い方', '環境への負担が少ない街にしたい', { environment: 2, energy: 2, urban: 1 }),
  ] },
  { id: 'climate', title: '地球の未来に関わるなら、どんな入口がいい？', note: '仕組みを知ることも、道具や制度を考えることも、研究になる。', topics: ['environment', 'ecology', 'energy', 'earth'], triggers: ['city_green', 'animal_nature'], multiple: true, options: [
    option('climate_system', '気候や、水の動きの仕組み', '観測や計算で、変化を追ってみたい', { environment: 3, earth: 1, statistics: 1 }),
    option('climate_life', '生き物や森、海を守ること', '自然の現場に行って調べたい', { ecology: 3, oceans: 1, animals: 1 }, { outdoor: 1 }),
    option('climate_energy', '新しい材料や、エネルギーの技術', 'ものづくりから、無駄を減らしたい', { energy: 3, materials: 2, chemistry: 1 }, { create: 1 }),
    option('climate_rules', '人や会社が動ける、社会の仕組み', 'ルールやお金、協力の方法を考えたい', { politics: 2, economy: 2, law: 1, environment: 1 }),
  ] },
  { id: 'sport', title: '「もっと上手くなる」を研究するなら？', note: '得意な競技がなくても、体の動きは研究の材料になる。', topics: ['sports', 'brain', 'medicine'], triggers: ['hook_food'], multiple: true, options: [
    option('sport_move', '上手な人の、体の動き', '力や姿勢を測って、コツを探りたい', { sports: 3, measurement: 2, physics: 1 }),
    option('sport_mind', '緊張や集中、練習と記憶', '心や脳の働きが気になる', { mind: 2, brain: 2, sports: 1 }),
    option('sport_help', 'けがの予防や、体を助ける道具', '健康やリハビリに関わりたい', { medicine: 2, design: 2, robots: 1, sports: 1 }),
    option('sport_social', 'だれでも参加できる仕組み', '学校や地域、ルールから考えたい', { society: 2, learning: 2, law: 1, sports: 1 }),
  ] },
  { id: 'art', title: '音や形を、どんなふうに追ってみたい？', note: '感性と、科学や技術が出会う研究もある。', topics: ['art', 'design', 'media'], triggers: ['hook_art'], multiple: true, options: [
    option('art_feel', 'なぜ美しい、心地いいと感じる？', '感覚や、体験する人の心を知りたい', { art: 2, mind: 2, brain: 1 }),
    option('art_history', '作品が生まれた時代や、文化', '資料や作品を読み解いてみたい', { art: 3, history: 2 }, { read: 1 }),
    option('art_make', '表現や道具を、自分でも作りたい', '形、動き、音、触った感じを工夫したい', { design: 3, art: 2, vr: 1 }, { create: 1 }),
    option('art_science', '音や光は、そもそも何？', '目や耳に届く仕組みを測ってみたい', { physics: 2, measurement: 2, art: 1 }),
  ] },
  { id: 'language', title: '言葉の、どんな不思議が気になる？', note: '外国語の点数ではなく、言葉そのものへの興味で選んでね。', topics: ['language', 'literature', 'learning'], triggers: ['hook_history', 'story_words'], multiple: true, options: [
    option('language_meaning', '同じ言葉でも、意味が変わること', '伝わり方や、文の仕組みを知りたい', { language: 3, philosophy: 1, mind: 1 }),
    option('language_learn', 'どうしたら、別の言葉を身に付けられる？', '学ぶ人や、教え方を調べたい', { language: 2, learning: 3, mind: 1 }),
    option('language_ai', 'コンピューターは、意味を分かっている？', '言葉を扱うAIの仕組みを見たい', { ai: 3, language: 2, software: 1 }),
    option('language_culture', '言葉に残る、文化や歴史', '翻訳や、物語、地域の暮らしを知りたい', { literature: 2, folklore: 2, history: 1, language: 1 }),
  ] },
  { id: 'puzzle', title: '難しい謎に出会ったら、どう向き合いたい？', note: '答えを当てるより、「どう考えるか」も研究の面白さ。', topics: ['maths', 'statistics', 'physics', 'software'], triggers: ['game_rules'], multiple: true, options: [
    option('puzzle_proof', '必ず正しい理由を、証明したい', '数や図形の規則を、とことん考えたい', { maths: 3, philosophy: 1 }, { math: 1 }),
    option('puzzle_data', 'たくさんの例から、規則を探したい', 'データと偶然の違いを知りたい', { statistics: 3, ai: 1 }, { code: .8 }),
    option('puzzle_physics', '自然の出来事を、ひとつの法則で説明したい', '目の前の現象の奥にある仕組みを知りたい', { physics: 3, quantum: 2 }, { experiment: .8 }),
    option('puzzle_compute', '速く正確に解く手順を、作りたい', 'コンピューターの得意や限界を知りたい', { software: 3, maths: 2 }, { code: 1 }),
  ] },
  { id: 'health', title: '健康や病気について、何を知りたい？', note: '医師になること以外にも、健康に関わる研究はたくさん。', topics: ['medicine', 'cells', 'genes', 'mind'], triggers: ['food_body', 'value_care'], multiple: true, options: [
    option('health_inside', '病気が起きる、小さな仕組み', '細胞、遺伝子、体を守る働きを調べたい', { medicine: 2, cells: 2, genes: 2 }, { experiment: .8 }),
    option('health_tools', '治療や検査を助ける、新しい道具', '薬、材料、機械を作ってみたい', { medicine: 2, materials: 2, measurement: 2 }, { create: .8 }),
    option('health_life', '心の健康や、毎日の支え方', '困っている人の体験を知りたい', { mind: 2, medicine: 2, society: 1 }, { people: 1 }),
    option('health_system', '必要な人に、医療が届く仕組み', '社会や制度、データから考えたい', { medicine: 1, economy: 2, politics: 2, statistics: 1 }),
  ] },
];

export const FLOW = ['hooks', 'adaptive', 'adaptive', 'methods', 'adaptive', 'values', 'adaptive', 'scale', 'day'];
export const ALL_QUESTIONS = Object.fromEntries([...Object.values(FIXED), ...ADAPTIVE].map(q => [q.id, q]));
export const UNSURE = { id: 'unsure', label: 'まだわからない', detail: '選ばずに進んでも大丈夫', topics: {}, methods: {} };
