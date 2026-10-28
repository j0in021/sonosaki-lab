"""Apply individually reviewed evidence. Keywords never grant recommendation eligibility."""
import json
from pathlib import Path
from urllib.parse import urlparse
ROOT=Path(__file__).resolve().parents[1]
FACETS=('interest','inquiry','activity')

def reviewed_entries(path=None):
    entries=json.loads((path or ROOT/'data/evidence-ledger.json').read_text())['entries']
    topics=json.loads((ROOT/'site/data/topics.json').read_text())
    topic_ids={t['id'] for t in topics}
    groups={t['group'] for t in topics}
    result={}
    for e in entries:
        assert e['labId'] not in result, 'Duplicate evidence review'
        assert e['status']=='verified'
        assert e['topics'] and set(e['topics'])<=topic_ids, (e['labId'],'unknown topic')
        assert e['group'] in groups, (e['labId'],'unknown group')
        assert set(x['facet'] for x in e['evidence'])==set(FACETS) and len(e['evidence'])==3
        for field in ['title','intro','simplerExplanation','checkedAt','reviewer','group','sourceURL']:
            assert e.get(field), (e['labId'],field)
        if 'officialURL' in e:
            assert urlparse(e['officialURL']).scheme in ('http','https')
            assert 'locked' not in e['officialURL'].lower()
        for r in e['evidence']:
            for field in ['question','claim','sourceURL','sourceLocator','checkedAt','semanticKey']:
                assert r.get(field), (e['labId'],field)
            assert urlparse(r['sourceURL']).scheme in ('http','https')
            assert 'locked' not in r['sourceURL'].lower()
        assert len({x['semanticKey'] for x in e['evidence']})==3
        assert len({x['question'] for x in e['evidence']})==3
        if 'achievementReview' in e:
            achievement=e['achievementReview']
            assert all(achievement.get(k) for k in ['text','type','sourceURL','sourceLocator','checkedAt'])
            assert urlparse(achievement['sourceURL']).scheme in ('http','https')
            assert 'locked' not in achievement['sourceURL'].lower()
        result[e['labId']]=e
    return result

def apply_reviews(labs):
    reviewed=reviewed_entries()
    observations={o['labId']:o for o in json.loads((ROOT/'data/review-observations.json').read_text())['observations'] if o['result']=='insufficient-specific-evidence'}
    assert set(reviewed)<=set(l['id'] for l in labs), 'Unknown reviewed ID'
    for lab in labs:
        # A review of the three recommendation facets does not verify a legacy outcome.
        if 'legacyAchievement' not in lab:
            lab['legacyAchievement']={'text':lab.get('achievement'),'type':lab.get('achievementType'),
              'sourceURL':lab['sources'].get('achievement')}
        lab['achievement']=None
        lab['achievementType']=None
        lab['sources']['achievement']=None
        lab.pop('achievementReview',None)
        prior=lab.get('legacyEligible',lab['eligible'])
        lab['legacyEligible']=prior
        e=reviewed.get(lab['id'])
        issues=[]
        statuses=[r['descriptionStatus'] for r in lab.get('sourceRecords',[])]
        if statuses and all(s in ('個別テーマ未確認','所属分野のみ確認') for s in statuses): issues.append('individual-description-unconfirmed')
        if not lab['description']: issues.append('description-missing')
        if not lab['topics']: issues.append('topic-mapping-missing')
        if not lab['url']: issues.append('official-url-missing')
        if not e: issues.append('individual-three-facet-evidence-unreviewed')
        lab['review']={'status':'verified' if e else 'pending','issues':issues,
          'nextAction': '個別の公式資料で対象・問い・取り組みの対応を確認し、根拠台帳へ出典箇所と確認日を記録する。' if not e else '確認済みの内容・出典の変更時に再確認する。',
          'checkedAt':e['checkedAt'] if e else None}
        lab['eligible']=bool(e)
        lab['evidence']=[]
        if not e and lab['id'] in observations:
            observation=observations[lab['id']]
            lab['review'].update(status='needs-more-evidence',sourceCheckedAt=observation['checkedAt'],nextAction=observation['nextAction'])
            lab['review']['issues'].append('specific-inquiry-and-activity-missing-in-reviewed-source')
            lab['topics']={t:1 for t in observation['confirmedTopics']}
            lab['description']=observation['correctedDescription']
        if e:
            lab['description']=e['intro']
            if 'officialURL' in e: lab['url']=e['officialURL']
            lab['topics']={t:1 for t in e['topics']}
            lab['checkedAt']=e['checkedAt']
            lab['sources']['description']=e['sourceURL']
            lab['lesson']={k:e[k] for k in ['title','intro','simplerExplanation','sourceURL','group']}
            lab['evidence']=[dict(r,questionId=lab['id']+'_'+r['facet']) for r in e['evidence']]
            if 'achievementReview' in e:
                achievement=e['achievementReview']
                lab['achievement']=achievement['text']
                lab['achievementType']=achievement['type']
                lab['sources']['achievement']=achievement['sourceURL']
                lab['achievementReview']=achievement
    return labs
