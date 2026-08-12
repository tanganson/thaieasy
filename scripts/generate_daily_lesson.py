import argparse
import hashlib
import html
import json
from datetime import date
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    KeepTogether,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
CURRICULUM_PATH = ROOT / "curriculum" / "thai_365_curriculum.json"
BANK_PATH = ROOT / "curriculum" / "thai_lesson_bank.json"
HISTORY_PATH = ROOT / "history" / "generated_lessons.jsonl"
MARKDOWN_DIR = ROOT / "output" / "markdown"
PDF_DIR = ROOT / "output" / "pdf"
FONT_PATH = "/Library/Fonts/Arial Unicode.ttf"


def load_json(path):
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def read_history():
    if not HISTORY_PATH.exists():
        return []
    records = []
    with HISTORY_PATH.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                records.append(json.loads(line))
    return records


def sentence_hash(text):
    normalized = " ".join(text.split())
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()[:16]


def day_in_range(day, range_text):
    if "-" not in range_text:
        return day == int(range_text)
    start, end = [int(x) for x in range_text.split("-", 1)]
    return start <= day <= end


def find_week(curriculum, day):
    if day == 365:
        return {
            "week": 53,
            "days": "365",
            "phase": "Final",
            "domain": "Final communication assessment",
            "outcome": "Complete a 10-minute practical communication simulation.",
        }
    for item in curriculum["weekly_roadmap"]:
        if day_in_range(day, item["days"]):
            return item
    raise ValueError(f"Day {day} is outside the 365-day curriculum.")


def find_starter_task(curriculum, day):
    for item in curriculum["starter_days"]:
        if item["day"] == day:
            return item
    return None


def build_fallback_lesson(day, curriculum, week):
    task = find_starter_task(curriculum, day)
    scene = task["scene"] if task else week["domain"]
    task_text = task["task"] if task else week["outcome"]
    return {
        "title_zh": f"Day {day}: {scene}",
        "scene_zh": scene,
        "task_zh": task_text,
        "focus_patterns": [],
        "warm_up": [],
        "core_sentences": [],
        "vocabulary": [],
        "substitution_practice": [],
        "dialogue": [],
        "speaking_mission": {
            "prompt_zh": f"用泰語完成今日任務：{task_text}",
            "target_thai": "",
            "target_romanization": "",
            "target_zh": task_text,
        },
        "challenge_sentence": None,
    }


def get_lesson(day, curriculum, bank, week):
    lesson = bank["daily_lessons"].get(str(day))
    if lesson:
        return lesson
    return build_fallback_lesson(day, curriculum, week)


def lesson_slug(lesson):
    scene = lesson.get("scene_zh", "daily").lower()
    replacements = {
        "打招呼": "greetings",
        "禮貌": "politeness",
        "第一次開口說泰語": "first_thai",
        "greetings": "greetings",
        "cafe": "cafe",
    }
    for key, value in replacements.items():
        if key in scene:
            return value
    return "daily"


def collect_sentence_hashes(lesson):
    texts = []
    for key in ("warm_up", "core_sentences", "dialogue"):
        for item in lesson.get(key, []):
            if item.get("thai"):
                texts.append(item["thai"])
    mission = lesson.get("speaking_mission") or {}
    if mission.get("target_thai"):
        texts.append(mission["target_thai"])
    challenge = lesson.get("challenge_sentence") or {}
    if challenge.get("thai"):
        texts.append(challenge["thai"])
    unique_hashes = []
    seen = set()
    for text in texts:
        hashed = sentence_hash(text)
        if hashed not in seen:
            unique_hashes.append(hashed)
            seen.add(hashed)
    return unique_hashes


def render_sentence_md(item):
    lines = [item["thai"], item["romanization"], item["zh"]]
    if item.get("note_zh"):
        lines.append(f"提示：{item['note_zh']}")
    return "\n".join(lines)


def render_markdown(day, lesson_date, curriculum, week, lesson):
    lines = [
        f"# {lesson['title_zh']}",
        "",
        f"- 日期：{lesson_date}",
        f"- 週次：Week {week['week']} / {week['domain']}",
        f"- 今日場景：{lesson['scene_zh']}",
        f"- 今日任務：{lesson['task_zh']}",
        "",
        "## 0-3 分鐘：暖身複習",
        "",
    ]
    if lesson.get("warm_up"):
        for item in lesson["warm_up"]:
            lines.append(render_sentence_md(item))
            lines.append("")
    else:
        lines.append("今天是這個主題的 scaffold，尚未填入完整暖身內容。")
        lines.append("")

    lines.extend(["## 3-10 分鐘：核心句子", ""])
    for idx, item in enumerate(lesson.get("core_sentences", []), start=1):
        lines.append(f"### {idx}. {item['zh']}")
        lines.append("")
        lines.append(render_sentence_md(item))
        lines.append("")

    lines.extend(["## 10-18 分鐘：替換練習", ""])
    for drill in lesson.get("substitution_practice", []):
        lines.append(f"### {drill['label_zh']}")
        lines.append(drill["thai_template"])
        lines.append(drill["romanization_template"])
        lines.append(drill["zh_prompt"])
        if drill.get("options"):
            lines.append("可替換：" + " / ".join(drill["options"]))
        lines.append("")

    lines.extend(["## 18-25 分鐘：小對話", ""])
    for turn in lesson.get("dialogue", []):
        lines.append(f"**{turn['speaker']}**")
        lines.append(render_sentence_md(turn))
        lines.append("")

    lines.extend(["## 25-30 分鐘：口說任務", ""])
    mission = lesson.get("speaking_mission") or {}
    lines.append(mission.get("prompt_zh", "完成今日口說任務。"))
    if mission.get("target_thai"):
        lines.append("")
        lines.append(mission["target_thai"])
        lines.append(mission["target_romanization"])
        lines.append(mission["target_zh"])
    lines.append("")

    challenge = lesson.get("challenge_sentence")
    if challenge:
        lines.extend(["## 挑戰句", "", render_sentence_md(challenge), ""])

    lines.extend(["## 單字", ""])
    for item in lesson.get("vocabulary", []):
        lines.append(f"- {item['thai']} / {item['romanization']} / {item['zh']}")

    return "\n".join(lines).strip() + "\n"


def p(text, style):
    return Paragraph(html.escape(text), style)


def build_pdf(output_path, day, lesson_date, week, lesson):
    pdfmetrics.registerFont(TTFont("ArialUnicode", FONT_PATH))
    styles = getSampleStyleSheet()
    base = {"fontName": "ArialUnicode", "wordWrap": "CJK"}
    title = ParagraphStyle(
        "Title",
        parent=styles["Title"],
        fontName="ArialUnicode",
        fontSize=22,
        leading=28,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#1F4E79"),
        spaceAfter=4 * mm,
    )
    subtitle = ParagraphStyle(
        "Subtitle",
        parent=styles["Normal"],
        **base,
        fontSize=9.5,
        leading=14,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#555555"),
        spaceAfter=5 * mm,
    )
    section = ParagraphStyle(
        "Section",
        parent=styles["Heading2"],
        fontName="ArialUnicode",
        fontSize=13,
        leading=17,
        textColor=colors.white,
        backColor=colors.HexColor("#1F4E79"),
        borderPadding=(5, 7, 4),
        spaceBefore=3 * mm,
        spaceAfter=3 * mm,
        keepWithNext=True,
    )
    label = ParagraphStyle(
        "Label",
        parent=styles["Heading3"],
        fontName="ArialUnicode",
        fontSize=10.5,
        leading=14,
        textColor=colors.HexColor("#1F4E79"),
        spaceBefore=2 * mm,
        spaceAfter=1 * mm,
    )
    thai = ParagraphStyle(
        "Thai",
        parent=styles["Normal"],
        fontName="ArialUnicode",
        fontSize=10.8,
        leading=16,
        textColor=colors.HexColor("#111111"),
        wordWrap="CJK",
        spaceAfter=0.7 * mm,
    )
    roman = ParagraphStyle(
        "Roman",
        parent=styles["Normal"],
        fontName="ArialUnicode",
        fontSize=8.6,
        leading=11,
        textColor=colors.HexColor("#666666"),
        spaceAfter=0.5 * mm,
    )
    zh = ParagraphStyle(
        "Chinese",
        parent=styles["Normal"],
        fontName="ArialUnicode",
        fontSize=8.8,
        leading=12,
        textColor=colors.HexColor("#333333"),
        wordWrap="CJK",
        spaceAfter=2.2 * mm,
    )
    note = ParagraphStyle(
        "Note",
        parent=styles["Normal"],
        fontName="ArialUnicode",
        fontSize=8.6,
        leading=12,
        textColor=colors.HexColor("#555555"),
        backColor=colors.HexColor("#F4F8FB"),
        borderColor=colors.HexColor("#C9DDEC"),
        borderWidth=0.8,
        borderPadding=(5, 6, 5),
        spaceAfter=3 * mm,
        wordWrap="CJK",
    )
    footer_style = ParagraphStyle(
        "Footer",
        parent=styles["Normal"],
        fontName="ArialUnicode",
        fontSize=8,
        textColor=colors.HexColor("#777777"),
        alignment=TA_CENTER,
    )

    page_w, page_h = A4
    margin_x = 17 * mm
    margin_top = 16 * mm
    margin_bottom = 15 * mm

    def page_canvas(canvas, doc):
        canvas.saveState()
        canvas.setStrokeColor(colors.HexColor("#D8E2EA"))
        canvas.setLineWidth(0.5)
        y = 12 * mm
        canvas.line(margin_x, y, page_w - margin_x, y)
        footer = Paragraph(
            f"365-day Thai communication | Day {day} | page {doc.page}",
            footer_style,
        )
        footer.wrapOn(canvas, page_w - 2 * margin_x, 8 * mm)
        footer.drawOn(canvas, margin_x, 5.8 * mm)
        canvas.restoreState()

    def sentence_block(item, prefix=None):
        items = []
        if prefix:
            items.append(p(prefix, label))
        items.append(p(item["thai"], thai))
        items.append(p(item["romanization"], roman))
        items.append(p(item["zh"], zh))
        if item.get("note_zh"):
            items.append(p(f"提示: {item['note_zh']}", roman))
        return KeepTogether(items)

    story = [
        p(lesson["title_zh"], title),
        p(
            f"{lesson_date} | Week {week['week']} | {week['domain']} | 今日任務: {lesson['task_zh']}",
            subtitle,
        ),
        p(
            "使用方式: 先慢讀泰文和羅馬音，再只看泰文讀，最後用自己的生活內容替換。",
            note,
        ),
        p("0-3 分鐘: 暖身複習", section),
    ]
    if lesson.get("warm_up"):
        for item in lesson["warm_up"]:
            story.append(sentence_block(item))
    else:
        story.append(p("今天是 scaffold 課，尚未填入完整暖身內容。", zh))

    story.append(p("3-10 分鐘: 核心句子", section))
    for idx, item in enumerate(lesson.get("core_sentences", []), start=1):
        story.append(sentence_block(item, f"{idx}. {item['zh']}"))

    story.append(p("10-18 分鐘: 替換練習", section))
    for drill in lesson.get("substitution_practice", []):
        story.append(p(drill["label_zh"], label))
        story.append(p(drill["thai_template"], thai))
        story.append(p(drill["romanization_template"], roman))
        story.append(p(drill["zh_prompt"], zh))
        if drill.get("options"):
            story.append(p("可替換: " + " / ".join(drill["options"]), roman))
        story.append(Spacer(1, 1.5 * mm))

    story.append(p("單字", section))
    vocab_data = [[p("泰文", zh), p("羅馬音", zh), p("中文", zh)]]
    for item in lesson.get("vocabulary", []):
        vocab_data.append([p(item["thai"], thai), p(item["romanization"], roman), p(item["zh"], zh)])
    table = Table(vocab_data, colWidths=[50 * mm, 50 * mm, 55 * mm], repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (-1, -1), "ArialUnicode"),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1F4E79")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#FAFCFD")),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#D5E0E8")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    story.append(table)

    story.append(p("18-25 分鐘: 小對話", section))
    for turn in lesson.get("dialogue", []):
        story.append(sentence_block(turn, f"{turn['speaker']}"))

    story.append(p("25-30 分鐘: 口說任務", section))
    mission = lesson.get("speaking_mission") or {}
    story.append(p(mission.get("prompt_zh", "完成今日口說任務。"), zh))
    if mission.get("target_thai"):
        story.append(p(mission["target_thai"], thai))
        story.append(p(mission["target_romanization"], roman))
        story.append(p(mission["target_zh"], zh))

    challenge = lesson.get("challenge_sentence")
    if challenge:
        story.append(p("挑戰句", section))
        story.append(sentence_block(challenge))

    doc = BaseDocTemplate(
        str(output_path),
        pagesize=A4,
        leftMargin=margin_x,
        rightMargin=margin_x,
        topMargin=margin_top,
        bottomMargin=margin_bottom,
    )
    frame = Frame(
        margin_x,
        margin_bottom + 7 * mm,
        page_w - 2 * margin_x,
        page_h - margin_top - margin_bottom - 7 * mm,
        id="normal",
    )
    doc.addPageTemplates([PageTemplate(id="normal", frames=[frame], onPage=page_canvas)])
    doc.build(story)


def write_history(record):
    HISTORY_PATH.parent.mkdir(parents=True, exist_ok=True)
    existing = read_history()
    updated = False
    for idx, item in enumerate(existing):
        if item.get("date") == record["date"] and item.get("day_number") == record["day_number"]:
            existing[idx] = record
            updated = True
            break
    if updated:
        with HISTORY_PATH.open("w", encoding="utf-8") as f:
            for item in existing:
                f.write(json.dumps(item, ensure_ascii=False) + "\n")
        return "updated"
    with HISTORY_PATH.open("a", encoding="utf-8") as f:
        f.write(json.dumps(record, ensure_ascii=False) + "\n")
    return "recorded"


def main():
    parser = argparse.ArgumentParser(description="Generate one daily Thai communication lesson.")
    parser.add_argument("--day", type=int, required=True, help="Curriculum day number, 1-365.")
    parser.add_argument("--date", default=date.today().isoformat(), help="Lesson date, YYYY-MM-DD.")
    parser.add_argument("--record-history", action="store_true", help="Append a history record for deduplication.")
    args = parser.parse_args()

    curriculum = load_json(CURRICULUM_PATH)
    bank = load_json(BANK_PATH)
    week = find_week(curriculum, args.day)
    lesson = get_lesson(args.day, curriculum, bank, week)
    slug = lesson_slug(lesson)

    MARKDOWN_DIR.mkdir(parents=True, exist_ok=True)
    PDF_DIR.mkdir(parents=True, exist_ok=True)
    markdown_path = MARKDOWN_DIR / f"day_{args.day:03d}_{args.date}_{slug}.md"
    pdf_path = PDF_DIR / f"day_{args.day:03d}_{args.date}_{slug}.pdf"

    markdown = render_markdown(args.day, args.date, curriculum, week, lesson)
    markdown_path.write_text(markdown, encoding="utf-8")
    build_pdf(pdf_path, args.day, args.date, week, lesson)

    hashes = collect_sentence_hashes(lesson)
    record = {
        "date": args.date,
        "day_number": args.day,
        "week": week["week"],
        "phase": week["phase"],
        "domain": week["domain"],
        "task": lesson["task_zh"],
        "sentence_hashes": hashes,
        "vocab_ids": [item["thai"] for item in lesson.get("vocabulary", [])],
        "grammar_ids": lesson.get("focus_patterns", []),
        "review_due_days": [args.day + offset for offset in curriculum["spaced_review_days"] if args.day + offset <= 365],
        "difficulty": "beginner_1",
    }
    history_status = "not_recorded"
    if args.record_history:
        history_status = write_history(record)

    print(json.dumps({
        "markdown": str(markdown_path),
        "pdf": str(pdf_path),
        "history": history_status
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
