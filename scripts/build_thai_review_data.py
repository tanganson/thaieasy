import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "output" / "markdown" / "thai_google_doc_organized_notes.md"
OUTPUT = ROOT / "web" / "data.js"

ENTRY_RE = re.compile(r"^-\s+(.+?)｜(.+?)｜(.+?)\s*$")
HEADING_RE = re.compile(r"^##\s+(?:\d+\.\s+)?(.+?)\s*$")
SOURCE_RE = re.compile(r"^<!--\s*source:\s*(.+?)\s*-->$")
LESSON_SOURCE = "2026 年 4–7 月課堂筆記"

CATEGORY_RULES = [
    ("日期", "今天 明天 昨天 今年 明年 去年 這個月 上個月 下個月 星期 生日"),
    ("飲食與點餐", "吃 飯 早餐 午餐 晚餐 夜宵 茶 奶 餐廳 點菜 盤子 雞 豬肉 牛肉 魚丸 粿條 麵"),
    ("時間與頻率", "分鐘 秒 多久 平時 假期 休息日 等一下 先"),
    ("自我介紹與人物", "這個人 自己人 他 家人 家庭 女生 男生 老公 那個人 誰 愛情"),
    ("地點與旅遊", "山 停車 停車場 門 外面 回來 到家 回家"),
    ("拍照、影片與教學", "聽 歌 下課 畢業 功課"),
    ("感受與狀態", "簡單 有空 沒空 吃飽 心理準備 太多 快 慢 通過 合格"),
    ("疑問詞與常用句型", "這個 甚麼時候 怎麼辦 還有 都可以 說得"),
]


def infer_lesson_category(meaning):
    for category, keywords in CATEGORY_RULES:
        if any(keyword in meaning for keyword in keywords.split()):
            return category
    return "日常動作與工作"


def slugify(value):
    normalized = re.sub(r"\s+", "-", value.strip().lower())
    return re.sub(r"[^\w\u0E00-\u0E7F-]", "", normalized)


def parse_notes():
    entries = []
    category = "其他"
    category_order = []
    source = "Google 文件整理筆記"

    for line in SOURCE.read_text(encoding="utf-8").splitlines():
        source_match = SOURCE_RE.match(line)
        if source_match:
            source = source_match.group(1).strip()
            continue

        heading = HEADING_RE.match(line)
        if heading:
            category = heading.group(1)
            if category not in category_order and category not in {"學習方法"}:
                category_order.append(category)
            continue

        match = ENTRY_RE.match(line)
        if not match:
            continue

        meaning, thai, pronunciation = (part.strip() for part in match.groups())
        if "／" in thai and category not in {"數字與數量"}:
            continue
        entry_id = f"note-{len(entries) + 1:03d}-{slugify(thai)[:24]}"
        entry_category = infer_lesson_category(meaning) if source == LESSON_SOURCE else category
        entries.append(
            {
                "id": entry_id,
                "meaning": meaning,
                "thai": thai,
                "pronunciation": pronunciation,
                "category": entry_category,
                "source": source,
            }
        )

    category_order = [item for item in category_order if item != "2026 年 4–7 月課堂筆記"]
    return entries, category_order


def main():
    entries, categories = parse_notes()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    payload = {"entries": entries, "categories": categories}
    OUTPUT.write_text(
        "window.THAI_REVIEW_DATA = "
        + json.dumps(payload, ensure_ascii=False, indent=2)
        + ";\n",
        encoding="utf-8",
    )
    print(f"Generated {len(entries)} entries in {OUTPUT}")


if __name__ == "__main__":
    main()
