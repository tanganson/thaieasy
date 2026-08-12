import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "output" / "markdown" / "thai_google_doc_organized_notes.md"
OUTPUT = ROOT / "web" / "data.js"

ENTRY_RE = re.compile(r"^-\s+(.+?)｜(.+?)｜(.+?)\s*$")
HEADING_RE = re.compile(r"^##\s+(?:\d+\.\s+)?(.+?)\s*$")
SOURCE_RE = re.compile(r"^<!--\s*source:\s*(.+?)\s*-->$")


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
        entries.append(
            {
                "id": entry_id,
                "meaning": meaning,
                "thai": thai,
                "pronunciation": pronunciation,
                "category": category,
                "source": source,
            }
        )

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
