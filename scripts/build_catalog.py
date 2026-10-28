"""Import the supplied CSV into a public, source-linked research catalogue.

Usage: python3 scripts/build_catalog.py --csv /path/to/source.csv
Only the catalogue is published. Scraped pages and the input CSV are not copied.
"""
import argparse
import collections
import csv
import hashlib
import json
from pathlib import Path
import re
from urllib.parse import unquote, urlparse, urlunparse

ROOT = Path(__file__).resolve().parents[1]


def norm(value):
    return re.sub(r"[\s　]+", "", value or "")


def safe_url(value):
    if not value:
        return ""
    parts = urlparse(value)
    if parts.scheme not in {"http", "https"} or "locked" in unquote(value).lower():
        return ""
    return value


def canonical(value):
    if not value:
        return ""
    p = urlparse(value)
    path = re.sub(r"/index\.(?:html?|php)$", "", p.path.rstrip("/"))
    return urlunparse(("https", p.netloc.removeprefix("www."), path, "", p.query, p.fragment))


def person_label(value):
    value = re.sub(r"[（(][^）)]*[）)]", "", value)
    value = re.sub(r"^(?:センター長|副センター長|専攻長)[ /：:]*", "", value)
    value = re.sub(r"^(?:特任|連携|客員)?(?:教授|准教授|講師|助教)[ ：:]*", "", value)
    value = re.split(r"[;/／]|(?:特任|連携|客員)?(?:教授|准教授|講師|助教)", value)[0].strip(" ：:")
    return value[:52] or "教員"


def unit_key(name):
    return re.sub(r"(?:研究室|教室|研)$", "", norm(name))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", type=Path, required=True)
    args = parser.parse_args()
    if "locked" in str(args.csv).lower():
        raise SystemExit("This path is excluded.")
    with args.csv.open(encoding="utf-8-sig", newline="") as stream:
        records = list(csv.DictReader(stream))
    topics = json.loads((ROOT / "site/data/topics.json").read_text())
    patterns = {t["id"]: re.compile(t["pattern"], re.I) for t in topics}
    descriptions = {t["id"]: t for t in topics}
    named_at = collections.defaultdict(set)
    for row in records:
        name, link = row["研究室・教室・分野名"], safe_url(row["研究室・教員URL"])
        if link and name:
            named_at[canonical(link)].add(unit_key(name))
    grouped = {}
    excluded = 0
    for index, row in enumerate(records, 2):
        if any("locked" in str(v).lower() for v in row.values()):
            excluded += 1
            continue
        name = row["研究室・教室・分野名"].strip()
        researcher = row["教員（原文）"].strip()
        link = safe_url(row["研究室・教員URL"])
        directory_urls = [safe_url(u.strip()) for u in row["出典URL"].split(" ; ")]
        directory_urls = list(filter(None, directory_urls))
        link = link or (directory_urls[0] if directory_urls else "")
        # A common listing URL is not an identity. Keep individual faculty separate.
        identity_link = canonical(safe_url(row["研究室・教員URL"]))
        if identity_link and len(named_at[identity_link]) <= 1:
            key = identity_link
        else:
            key = "|".join((identity_link, unit_key(name), norm(person_label(researcher))))
        if not key.strip("|"):
            key = str(index)
        entry = grouped.setdefault(key, {
            "id": "utokyo-" + hashlib.sha256(key.encode()).hexdigest()[:12],
            "university": "東京大学", "country": "日本", "name": name or person_label(researcher) + "先生の研究",
            "kind": "研究室" if "研究室" in name or re.search(r"\s研$", name) else "教室・研究分野" if name else "教員の研究テーマ",
            "faculty": [], "departments": [], "researchers": researcher,
            "description": row["研究内容（やさしい説明）"],
            "achievement": None, "achievementType": None,
            "url": link, "sources": {"directory": [], "description": "", "achievement": None},
            "topics": {}, "methods": [], "checkedAt": row["確認日"], "sourceRowIds": [],
            "eligible": False, "_hasName": bool(name), "_descriptionQuality": 0,
            "leadResearcherKey": ("東京大学|" + norm(re.sub(r"[A-Za-z].*$", "", person_label(researcher)))) if researcher and re.search(r"[一-龥ぁ-んァ-ヶ]", person_label(researcher)) else ("東京大学|" + norm(person_label(researcher)).lower()) if researcher else "",
        })
        if name and not entry["_hasName"]:
            entry.update(name=name, kind="研究室" if "研究室" in name else "教室・研究分野", _hasName=True)
        for field, target in [("一覧区分（学部）", "faculty"), ("専攻・学科・コース", "departments")]:
            for part in row[field].split(" ; "):
                if part and part not in entry[target]:
                    entry[target].append(part)
        entry["sourceRowIds"].append(index)
        entry["sources"]["directory"] = list(dict.fromkeys(entry["sources"]["directory"] + directory_urls))
        basis = row["研究内容の確認状況"]
        quality = 0 if basis in {"個別テーマ未確認", "所属分野のみ確認"} else 2 if basis == "個別ページの研究紹介" else 1
        if quality > entry["_descriptionQuality"]:
            entry["description"] = row["研究内容（やさしい説明）"]
            entry["sources"]["description"] = safe_url(row["研究内容の根拠URL"].split(" ; ")[0])
            entry["_descriptionQuality"] = quality
        achievement_status = row["成果の確認状況"]
        outcome_type = "research" if achievement_status.startswith("具体的な研究成果") else "publication" if achievement_status.startswith("著作・") else None
        if outcome_type and (not entry["achievement"] or outcome_type == "research" and entry["achievementType"] != "research"):
            entry["achievement"] = row["成果の例（やさしい説明）"]
            entry["achievementType"] = outcome_type
            entry["sources"]["achievement"] = safe_url(row["成果の根拠URL"])
        # Match original field names rather than researcher names or general navigation text.
        field_text = row["研究分野・テーマ"] + " " + name
        matched = {tag: min(3, 1 + len(rx.findall(field_text))) for tag, rx in patterns.items() if rx.search(field_text)}
        if "文化人類" in field_text or "社会人類" in field_text:
            matched.pop("animals", None)
        if re.search(r"市場設計|マーケットデザイン|market design|mechanism design", field_text, re.I) and not re.search(r"製品|建築|インタフェース", field_text):
            matched.pop("design", None)
        if not matched and quality > 0:
            # A plain-language explanation can provide a topic when the original label is a surname only.
            matched = {tag: 0.7 for tag, rx in patterns.items() if rx.search(entry["description"])}
        for tag, weight in matched.items():
            entry["topics"][tag] = max(weight, entry["topics"].get(tag, 0))
        methods = set(entry["methods"])
        for tag in matched:
            methods.update(descriptions[tag]["methods"])
        entry["methods"] = sorted(methods)
        entry["eligible"] = entry["eligible"] or quality > 0 and bool(matched) and bool(link)
    labs = []
    for entry in grouped.values():
        entry.pop("_hasName")
        entry.pop("_descriptionQuality")
        entry["faculty"] = entry["faculty"][:8]
        entry["departments"] = entry["departments"][:8]
        labs.append(entry)
    extras = json.loads((ROOT / "site/data/extra-labs.json").read_text())
    labs.extend(extras)
    output = {
        "schemaVersion": 1, "checkedAt": "2026-10-28",
        "source": {"name": args.csv.name, "sha256": hashlib.sha256(args.csv.read_bytes()).hexdigest(), "rows": len(records)},
        "stats": {"sourceRows": len(records), "entries": len(labs), "eligible": sum(l["eligible"] for l in labs), "additionalUniversities": len({e["university"] for e in extras}), "excluded": excluded},
        "labs": labs,
    }
    target = ROOT / "site/data/catalog.json"
    target.write_text(json.dumps(output, ensure_ascii=False, separators=(",", ":")))
    print(json.dumps(output["stats"], ensure_ascii=False))


if __name__ == "__main__":
    main()
