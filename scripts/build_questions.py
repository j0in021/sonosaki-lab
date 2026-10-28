"""Generate binary questions only from individual evidence, never from broad tags."""
import json
import hashlib
from pathlib import Path
from evidence_data import reviewed_entries
root=Path(__file__).resolve().parents[1]
topics=json.loads((root/'site/data/topics.json').read_text())
groups={
'culture':'呪術廻戦や、不思議な言い伝えが好き？',
'expression':'ゲームや物語、映像などの表現が好き？',
'human':'人の感じ方や学び方、体の仕組みが気になる？',
'society':'社会のルールや、お金、人のつながりが気になる？',
'place':'街や建物、災害への備えが気になる？',
'nature':'自然や海、地球の変化が気になる？',
'life':'動物や植物、細胞の仕組みが気になる？',
'matter':'材料や化学反応、エネルギーが気になる？',
'universe':'星や宇宙、自然のルールが気になる？',
'logic':'数字やデータの規則を探すことが好き？',
'technology':'AIやロボット、通信の仕組みが気になる？'}
bank=[]
def add(id,title,stage,**kwargs):
    bank.append(dict(id=id,title=title,stage=stage,facet=None,topics=[],note='',multiple=False,**{})|kwargs|{'options':[{'id':id+'_yes','label':'はい'},{'id':id+'_no','label':'いいえ'}]})
for group,title in groups.items():
    add('broad_'+group,title,'broad',group=group,topics=[t['id'] for t in topics if t['group']==group],note='まだ知らない分野でも大丈夫。あとから研究例を見られます。この答えだけで候補を除外しません。')
for id,e in sorted(reviewed_entries().items()):
    common=dict(labId=id,group=e['group'],topics=e['topics'],lessonTitle=e['title'],sourceURL=e['sourceURL'])
    for r in e['evidence']:
        add(id+'_'+r['facet'],r['question'],'evidence',**common,facet=r['facet'],evidence={k:r[k] for k in ['claim','sourceURL','sourceLocator','checkedAt','semanticKey']},lesson=e['intro'],note='今できるかではなく、気になるかで答えてね。分かりにくければ「研究のヒント」を開けます。')
for i in range(1,(len(reviewed_entries())+2)//3+1):
    add('checkpoint_'+str(i),'別の研究例も、もう少し見てみる？','checkpoint',note='ここで区切っても大丈夫。いいえで現在の結果と紹介一覧へ進めます。')
serialized=json.dumps(bank,ensure_ascii=False,indent=2)
revision=hashlib.sha256(serialized.encode()+(root/'data/evidence-ledger.json').read_bytes()).hexdigest()
(root/'site/question-bank.js').write_text('// Generated from individually reviewed evidence.\nexport const BANK_REVISION = '+json.dumps(revision)+';\nexport const QUESTION_BANK = '+serialized+';\n')
print(json.dumps({'studies':len(reviewed_entries()),'questions':len(bank)}))
