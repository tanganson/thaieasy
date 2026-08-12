from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "thai_24_hour_time.pdf"
FONT_PATH = "/Library/Fonts/Arial Unicode.ttf"

INK = colors.HexColor("#18252B")
TEAL = colors.HexColor("#087E8B")
PALE_TEAL = colors.HexColor("#E8F4F3")
CORAL = colors.HexColor("#EF6A5B")
PALE_CORAL = colors.HexColor("#FFF0EC")
MIST = colors.HexColor("#F4F7F6")
WHITE = colors.white
LINE = colors.HexColor("#CEDAD8")


TIME_GROUPS = [
    (
        "00:00-05:00  午夜與凌晨",
        [
            ("00:00", "เที่ยงคืน", "thîang kheuun", "午夜／晚上 12 點"),
            ("01:00", "ตีหนึ่ง", "tii nʉ̀ng", "凌晨 1 點"),
            ("02:00", "ตีสอง", "tii sǎawng", "凌晨 2 點"),
            ("03:00", "ตีสาม", "tii sǎam", "凌晨 3 點"),
            ("04:00", "ตีสี่", "tii sìi", "凌晨 4 點"),
            ("05:00", "ตีห้า", "tii hâa", "凌晨 5 點"),
        ],
    ),
    (
        "06:00-11:00  早上",
        [
            ("06:00", "หกโมงเช้า", "hòk moong cháao", "早上 6 點"),
            ("07:00", "เจ็ดโมงเช้า", "jèt moong cháao", "早上 7 點"),
            ("08:00", "แปดโมงเช้า", "pàet moong cháao", "早上 8 點"),
            ("09:00", "เก้าโมงเช้า", "gâo moong cháao", "早上 9 點"),
            ("10:00", "สิบโมงเช้า", "sìp moong cháao", "上午 10 點"),
            ("11:00", "สิบเอ็ดโมงเช้า", "sìp-èt moong cháao", "上午 11 點"),
        ],
    ),
    (
        "12:00-18:00  中午與下午",
        [
            ("12:00", "เที่ยง", "thîang", "中午 12 點"),
            ("13:00", "บ่ายโมง", "bàai moong", "下午 1 點"),
            ("14:00", "บ่ายสองโมง", "bàai sǎawng moong", "下午 2 點"),
            ("15:00", "บ่ายสามโมง", "bàai sǎam moong", "下午 3 點"),
            ("16:00", "บ่ายสี่โมง", "bàai sìi moong", "下午 4 點"),
            ("17:00", "ห้าโมงเย็น", "hâa moong yen", "下午／傍晚 5 點"),
            ("18:00", "หกโมงเย็น", "hòk moong yen", "傍晚 6 點"),
        ],
    ),
    (
        "19:00-23:00  晚上",
        [
            ("19:00", "หนึ่งทุ่ม", "nʉ̀ng thûm", "晚上 7 點"),
            ("20:00", "สองทุ่ม", "sǎawng thûm", "晚上 8 點"),
            ("21:00", "สามทุ่ม", "sǎam thûm", "晚上 9 點"),
            ("22:00", "สี่ทุ่ม", "sìi thûm", "晚上 10 點"),
            ("23:00", "ห้าทุ่ม", "hâa thûm", "晚上 11 點"),
        ],
    ),
]


def styles():
    base = {"fontName": "ArialUnicode"}
    return {
        "title": ParagraphStyle("title", **base, fontSize=25, leading=31, alignment=TA_CENTER, spaceAfter=4 * mm, textColor=INK),
        "subtitle": ParagraphStyle("subtitle", **base, fontSize=10.5, leading=16, alignment=TA_CENTER, textColor=colors.HexColor("#52666C")),
        "section": ParagraphStyle("section", **base, fontSize=16, leading=21, textColor=TEAL, spaceAfter=3 * mm),
        "cell": ParagraphStyle("cell", **base, fontSize=10.5, leading=14, textColor=INK),
        "thai": ParagraphStyle("thai", **base, fontSize=15, leading=19, textColor=TEAL),
        "roman": ParagraphStyle("roman", **base, fontSize=9, leading=12, textColor=colors.HexColor("#52666C")),
        "small": ParagraphStyle("small", **base, fontSize=9.5, leading=14, textColor=INK),
        "callout": ParagraphStyle("callout", **base, fontSize=11, leading=17, textColor=INK),
        "footer": ParagraphStyle("footer", **base, fontSize=8, textColor=colors.HexColor("#718187"), alignment=TA_CENTER),
    }


def time_table(rows, s):
    data = [[
        Paragraph("時間", s["cell"]),
        Paragraph("泰文說法", s["cell"]),
        Paragraph("發音", s["cell"]),
        Paragraph("中文", s["cell"]),
    ]]
    for time, thai, roman, chinese in rows:
        data.append([
            Paragraph(f"<b>{time}</b>", s["cell"]),
            Paragraph(thai, s["thai"]),
            Paragraph(roman, s["roman"]),
            Paragraph(chinese, s["cell"]),
        ])
    table = Table(data, colWidths=[28 * mm, 53 * mm, 54 * mm, 41 * mm], repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), TEAL),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 1), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, 0), 6),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
        ("BACKGROUND", (0, 1), (-1, -1), WHITE),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, MIST]),
        ("GRID", (0, 0), (-1, -1), 0.5, LINE),
    ]))
    return table


def page_frame(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(TEAL)
    canvas.rect(0, A4[1] - 9 * mm, A4[0], 9 * mm, stroke=0, fill=1)
    canvas.setStrokeColor(LINE)
    canvas.line(18 * mm, 13 * mm, A4[0] - 18 * mm, 13 * mm)
    canvas.setFont("ArialUnicode", 8)
    canvas.setFillColor(colors.HexColor("#718187"))
    canvas.drawCentredString(A4[0] / 2, 8.5 * mm, f"泰文 24 小時說法筆記  |  {doc.page}")
    canvas.restoreState()


def build_pdf():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    pdfmetrics.registerFont(TTFont("ArialUnicode", FONT_PATH))
    s = styles()
    doc = BaseDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        leftMargin=17 * mm,
        rightMargin=17 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
        title="泰文 24 小時說法筆記",
        author="Thai Study Notes",
    )
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="main")
    doc.addPageTemplates([PageTemplate(id="notes", frames=[frame], onPage=page_frame)])

    story = [
        Spacer(1, 5 * mm),
        Paragraph("泰文 24 小時說法筆記", s["title"]),
        Paragraph("從午夜到深夜，一次掌握泰文日常整點說法", s["subtitle"]),
        Spacer(1, 7 * mm),
    ]

    for index, (title, rows) in enumerate(TIME_GROUPS):
        if index == 2:
            story.append(PageBreak())
        story.extend([
            KeepTogether([
                Paragraph(title, s["section"]),
                time_table(rows, s),
            ]),
            Spacer(1, 7 * mm),
        ])

    story.extend([
        PageBreak(),
        Paragraph("快速記憶", s["section"]),
        Table([
            [Paragraph("00:00 / 12:00", s["cell"]), Paragraph("เที่ยงคืน 是午夜；เที่ยง 是中午。", s["callout"])],
            [Paragraph("01:00-05:00", s["cell"]), Paragraph("ตี + 數字：ตีสาม = 凌晨 3 點。", s["callout"])],
            [Paragraph("06:00-11:00", s["cell"]), Paragraph("數字 + โมงเช้า：เก้าโมงเช้า = 早上 9 點。", s["callout"])],
            [Paragraph("13:00-16:00", s["cell"]), Paragraph("บ่าย + 數字 + โมง：บ่ายสามโมง = 下午 3 點。", s["callout"])],
            [Paragraph("17:00-18:00", s["cell"]), Paragraph("數字 + โมงเย็น：หกโมงเย็น = 傍晚 6 點。", s["callout"])],
            [Paragraph("19:00-23:00", s["cell"]), Paragraph("數字 + ทุ่ม：สามทุ่ม = 晚上 9 點。", s["callout"])],
        ], colWidths=[42 * mm, 134 * mm], style=TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), PALE_TEAL),
            ("BACKGROUND", (1, 0), (1, -1), WHITE),
            ("BOX", (0, 0), (-1, -1), 0.7, LINE),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, LINE),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 9),
            ("RIGHTPADDING", (0, 0), (-1, -1), 9),
            ("TOPPADDING", (0, 0), (-1, -1), 9),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
        ])),
        Spacer(1, 9 * mm),
        Paragraph("問時間", s["section"]),
        Table([
            [
                Paragraph("ตอนนี้กี่โมงครับ/คะ", s["thai"]),
                Paragraph("dtawn-níi gìi moong khráp/kha<br/>現在幾點？", s["callout"]),
            ],
            [
                Paragraph("ตอนนี้บ่ายสามโมงครับ/ค่ะ", s["thai"]),
                Paragraph("dtawn-níi bàai sǎam moong khráp/kha<br/>現在是下午 3 點。", s["callout"]),
            ],
        ], colWidths=[82 * mm, 94 * mm], style=TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), PALE_CORAL),
            ("BOX", (0, 0), (-1, -1), 0.8, CORAL),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#F2B3AA")),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 11),
            ("RIGHTPADDING", (0, 0), (-1, -1), 11),
            ("TOPPADDING", (0, 0), (-1, -1), 12),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
        ])),
        Spacer(1, 8 * mm),
        Paragraph("小提醒：泰文口語時間以時段分組，因此同一個數字在不同時段會搭配 ตี、โมงเช้า、บ่าย、โมงเย็น 或 ทุ่ม。", s["small"]),
    ])
    doc.build(story)
    print(OUTPUT)


if __name__ == "__main__":
    build_pdf()
