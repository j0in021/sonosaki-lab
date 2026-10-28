"""Generate an individual review queue. Generating a row is NOT verifying its research."""
import csv,json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
data=json.loads((root/'site/data/catalog.json').read_text())
def safe(value):
    text=str(value)
    return "'"+text if text.startswith(('=','+','-','@')) else text
with (root/'data/individual-review-queue.csv').open('w',encoding='utf-8-sig',newline='') as f:
    w=csv.writer(f,lineterminator="\n");w.writerow(['ID','大学','名称','元CSV行','確認状態','不足理由','公式URL','元の分野表記','元の説明確認状態','次の確認','個別根拠確認日'])
    for lab in data['labs']:
        records=lab.get('sourceRecords',[])
        w.writerow(map(safe,[lab['id'],lab['university'],lab['name'],';'.join(map(str,lab['sourceRowIds'])),lab['review']['status'],';'.join(lab['review']['issues']),lab['url'],';'.join(dict.fromkeys(r['field'] for r in records)),';'.join(dict.fromkeys(r['descriptionStatus'] for r in records)),lab['review']['nextAction'],lab['review']['checkedAt'] or '']))
summary={'catalogRecords':len(data['labs']),'verified':sum(l['eligible'] for l in data['labs']),'pending':sum(not l['eligible'] for l in data['labs']),'publicationAllowed':any(l['eligible'] for l in data['labs']),'requirement':'User authorized publication of reviewed-only recommendations with pending records explicitly labeled.'}
(root/'data/review-progress.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(summary))
