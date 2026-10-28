// Every question has exactly two answers. "No" is neutral, never a claim of inability.
export const METHODS = ['read','people','experiment','code','math','create','outdoor'];
export const FLOW = Array.from({length:20},(_,i)=>[8,16].includes(i)?'method':'adaptive');
const make=(id,title,note,topics={},methods={},extra={})=>({id,title,note,multiple:false,topics:Object.keys(topics),...extra,options:[{id:`${id}_yes`,label:'はい',detail:'',topics,methods},{id:`${id}_no`,label:'いいえ',detail:'',topics:{},methods:{}}]});
const screen=(id,title,note,tags)=>make(id,title,note,tags,{}, {stage:'screen'});
const deep=(id,title,note,tags,methods,parents)=>make(id,title,note,tags,methods,{stage:'deep',parents});
export const ADAPTIVE=[
 screen('curse','呪術廻戦や、不思議な言い伝えが好き？','作品を見たことがなくても、不思議な話が気になるなら「はい」でOK。',{folklore:2,religion:2,literature:1,mind:1}),
 screen('games','ゲームや謎解きは、つい夢中になる？','遊ぶのも、ルールや仕組みを考えるのも。',{games:3,software:1,design:1}),
 screen('nature','動物や植物を見て「どうして？」と思うことがある？','ペット、虫、花、森。身近な生き物も研究の入口。',{animals:3,ecology:2,agriculture:1}),
 screen('tech','AIやロボット、未来の道具にワクワクする？','詳しくなくても、「使ってみたい」「作れたら面白そう」で大丈夫。',{ai:2,robots:2,software:1,materials:1}),
 screen('mind','人の気持ちや、自分の心の仕組みが気になる？','性格、記憶、恋愛、思い込み。身近な「なぜ？」から。',{mind:3,brain:1,learning:1}),
 screen('society','ニュースを見て、社会のルールに疑問を感じる？','不公平、お金、政治。正解を知っている必要はないよ。',{society:2,law:2,politics:1,economy:1}),
 screen('creative','物語・絵・音楽など、表現する世界が好き？','作ることも、作品を見ることも、研究につながる。',{art:2,literature:2,media:1,design:1}),
 screen('space','宇宙や深海、地球のまだ知らない世界が気になる？','遠い星も、足もとの地球も、分からないことがたくさん。',{space:2,oceans:2,earth:2,physics:1}),
 screen('food','食べ物や健康、スポーツの「なぜ？」が気になる？','おいしさ、体の仕組み、うまくなるコツにも研究がある。',{food:2,medicine:2,sports:2}),
 screen('history','昔の人の暮らしや、外国の言葉・文化を知りたい？','知らない時代や場所の人に出会う感覚から。',{history:2,language:2,folklore:1}),
 screen('city','街や建物、地球環境の未来を考えるのが好き？','住みやすさ、災害への備え、気候の変化など。',{urban:2,architecture:2,environment:2,disaster:1}),
 screen('logic','数字やパズルの規則を見つけると、うれしい？','数学の成績ではなく、「考えてみたいか」で選んでね。',{maths:3,statistics:2,physics:1}),
 deep('magic_history','歴史の中で、呪術は何だったのか気になる？','「呪いが本当に使えるか」ではなく、人が何を信じ、どう暮らしていたかを考える入口。',{religion:4,history:3,folklore:2},{read:1},['curse']),
 deep('folklore_people','古い資料より、人から伝承を聞いて集めてみたい？','たとえば、その土地の人に昔からの言い伝えを聞く。「いいえ」でも、資料から探る道があるよ。',{folklore:5,society:1},{people:3,outdoor:1},['magic_history']),
 deep('belief','なぜ人は不思議な話を信じるのか、気になる？','怖さや思い込みを、心や社会の仕組みから調べる研究も。',{mind:4,religion:2,society:1},{experiment:1,people:1},['curse']),
 deep('games_history','昔のゲームや、作った人の話を残すことに興味がある？','ゲームを文化や歴史として調べる道。',{games:4,history:3,media:2},{read:2,people:2},['games']),
 deep('games_build','遊びたくなるゲームの仕組みを、自分でも作ってみたい？','ルール、プログラム、見せ方を考えて試す。',{games:3,software:3,design:2},{create:3,code:2},['games']),
 deep('animal_behavior','動物が仲間とどう伝え合うのか、観察してみたい？','鳴き声や動きから、生き物の世界をのぞく。',{animals:4,ecology:2,brain:1},{outdoor:3,experiment:1},['nature']),
 deep('plant_food','植物が育つ仕組みを知って、食や環境に役立てたい？','育ち方や細胞の働きなど、さまざまな大きさで考えられる。',{agriculture:3,ecology:2,cells:2,food:2},{experiment:3,outdoor:1},['nature']),
 deep('robot_life','生き物の動きをまねした、小さなロボットを作ってみたい？','昆虫や柔らかい体をヒントに、機械を考える。',{robots:5,animals:2,materials:2},{create:3,experiment:2},['tech','animal_behavior']),
 deep('ai_words','AIが言葉や画像を理解する仕組みを知りたい？','便利さだけでなく、間違う理由も研究の対象になる。',{ai:5,software:2,language:1},{code:3,math:1},['tech']),
 deep('mind_experiment','思い込みの起き方を、実験で確かめてみたい？','人に同じ課題を試してもらい、感じ方の違いを比べる。',{mind:5,brain:2},{experiment:3,people:1},['mind','belief']),
 deep('learning','「分かった！」を増やす学び方を考えてみたい？','教え方、環境、使う道具で学びがどう変わるか。',{learning:5,mind:2},{people:2,experiment:1},['mind']),
 deep('fair_rules','不公平を減らすルールや仕組みを考えてみたい？','法律や政策、経済を通して、社会のあり方を考える。',{law:3,politics:3,economy:2,society:3},{read:2,people:1},['society']),
 deep('stories_future','SFのように、物語から未来の社会を考えてみたい？','技術を作る前に、どんな暮らしを望むか想像する研究も。',{literature:3,art:2,philosophy:3,design:2,society:2},{create:2,read:2},['creative','tech']),
 deep('language_meaning','同じ気持ちでも、言葉や文化で伝わり方が違うのが気になる？','言葉の仕組み、翻訳、文化の違いを調べる。',{language:5,folklore:2,literature:1},{read:2,people:1},['history','creative']),
 deep('space_origins','星や宇宙がどう生まれたか、知りたい？','観測や計算から、直接行けない世界の手がかりを探す。',{space:5,physics:3,maths:1},{math:2,code:1},['space']),
 deep('ocean_earth','海や地球を実際に調べて、起きている変化を知りたい？','観測する、試料を調べる、データを比べる道がある。',{oceans:4,earth:3,environment:2},{outdoor:3,experiment:2},['space','city']),
 deep('health_cells','体の小さな細胞や遺伝子から、病気の仕組みを知りたい？','体全体からは見えない、小さな世界を調べる。',{medicine:3,cells:4,genes:3},{experiment:3},['food']),
 deep('sport_motion','スポーツの動きを測って、上達するコツを探したい？','感覚だけでなく、体の動きやデータから考える。',{sports:5,measurement:2,mind:1},{experiment:2,code:1},['food']),
 deep('city_design','人が過ごしやすい街や建物を、自分でも考えてみたい？','人の動きや暮らしを知って、空間を工夫する。',{urban:4,architecture:4,design:2},{create:3,people:1,outdoor:1},['city']),
 deep('clean_energy','新しい材料やエネルギーで、環境の問題に取り組みたい？','小さな材料の工夫が、暮らしの道具につながることも。',{energy:4,materials:3,chemistry:2,environment:2},{experiment:3,create:1},['city','tech']),
 deep('math_hidden','見えない規則を、数式やデータで見つけてみたい？','きれいな理論も、現実のデータの謎も研究になる。',{maths:4,statistics:4,physics:1},{math:3,code:1},['logic']),
 deep('vr','VRで別の立場を体験すると、感じ方が変わるか気になる？','技術と、人の心や学びの接点を考える。',{vr:5,mind:3,learning:2},{experiment:2,create:1},['tech','mind'])
];
export const METHOD_QUESTIONS=[
 make('method_people','調べるとき、人に話を聞いてみたい？','今できるかではなく、大学でやってみたいかで選んでね。',{}, {people:3},{stage:'method'}),
 make('method_read','本や古い資料を、じっくり読み解いてみたい？','言葉や記録から、まだ知らない意味を探す時間。',{}, {read:3},{stage:'method'}),
 make('method_create','まず作って、動かしながら考えてみたい？','作品、試作品、プログラムなど。得意でなくても大丈夫。',{}, {create:3,code:1},{stage:'method'}),
 make('method_experiment','条件を変えた実験で「本当？」を確かめたい？','やってみる前に、結果が分からなくても大丈夫。',{}, {experiment:3},{stage:'method'}),
 make('method_outdoor','外に出て、その場所で観察してみたい？','街、森、海など、その場で起きていることを知る時間。',{}, {outdoor:3},{stage:'method'}),
 make('method_math','数式やデータを使って、じっくり考えてみたい？','成績や経験ではなく、興味があるかで選んでね。',{}, {math:3,code:1},{stage:'method'})
];
export const FIXED={};
export const ALL_QUESTIONS=Object.fromEntries([...ADAPTIVE,...METHOD_QUESTIONS].map(q=>[q.id,q]));
