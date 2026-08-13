import argparse
import json
import os
import re
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "web" / "data.js"


def load_entries():
    text = DATA.read_text(encoding="utf-8")
    match = re.search(r"window\.THAI_REVIEW_DATA = (.*);\s*$", text, re.S)
    if not match:
        raise RuntimeError("找不到 web/data.js 資料")
    return json.loads(match.group(1))["entries"]


def request(url, key, method="POST", body=None):
    payload = json.dumps(body, ensure_ascii=False).encode() if body is not None else None
    req = urllib.request.Request(url, data=payload, method=method, headers={
        "apikey": key, "authorization": f"Bearer {key}", "content-type": "application/json",
        "prefer": "resolution=merge-duplicates,return=minimal",
    })
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            return response.status
    except urllib.error.HTTPError as error:
        raise RuntimeError(f"Supabase 回應 {error.code}: {error.read().decode(errors='replace')}") from error


def main():
    parser = argparse.ArgumentParser(description="匯入 web/data.js 教材至 Supabase entries")
    parser.add_argument("--apply", action="store_true", help="實際寫入；預設只顯示匯入計劃")
    args = parser.parse_args()
    entries = load_entries()
    print(f"準備匯入 {len(entries)} 筆教材（其中 Output/1 來源 {sum(e['source'] == 'Output/1 母音與低子音教材' for e in entries)} 筆）")
    if not args.apply:
        print("乾跑完成；加上 --apply 才會寫入 Supabase。")
        return
    url, key = os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise SystemExit("請先設定 SUPABASE_URL 與 SUPABASE_SERVICE_ROLE_KEY")
    rows = [{**entry, "status": "published", "version": 1} for entry in entries]
    for start in range(0, len(rows), 100):
        status = request(f"{url}/rest/v1/entries", key, body=rows[start:start + 100])
        print(f"已寫入 {min(start + 100, len(rows))}/{len(rows)}（HTTP {status}）")


if __name__ == "__main__":
    main()
