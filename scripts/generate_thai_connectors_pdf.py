from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    FrameBreak,
    KeepTogether,
    ListFlowable,
    ListItem,
    NextPageTemplate,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


OUTPUT = "output/pdf/thai_connectors_30min_practice.pdf"
FONT_PATH = "/Library/Fonts/Arial Unicode.ttf"


pdfmetrics.registerFont(TTFont("ArialUnicode", FONT_PATH))


PAGE_W, PAGE_H = A4
MARGIN_X = 17 * mm
MARGIN_TOP = 16 * mm
MARGIN_BOTTOM = 15 * mm
GUTTER = 8 * mm
COL_W = (PAGE_W - (2 * MARGIN_X) - GUTTER) / 2


def p(text, style):
    return Paragraph(text, style)


styles = getSampleStyleSheet()
base = dict(
    fontName="ArialUnicode",
    wordWrap="CJK",
)

title = ParagraphStyle(
    "Title",
    parent=styles["Title"],
    fontName="ArialUnicode",
    fontSize=23,
    leading=29,
    alignment=TA_CENTER,
    textColor=colors.HexColor("#1F4E79"),
    spaceAfter=4 * mm,
)
subtitle = ParagraphStyle(
    "Subtitle",
    parent=styles["Normal"],
    **base,
    fontSize=10.5,
    leading=15,
    alignment=TA_CENTER,
    textColor=colors.HexColor("#555555"),
    spaceAfter=6 * mm,
)
section = ParagraphStyle(
    "Section",
    parent=styles["Heading2"],
    fontName="ArialUnicode",
    fontSize=13.5,
    leading=18,
    textColor=colors.white,
    backColor=colors.HexColor("#1F4E79"),
    borderPadding=(5, 7, 4),
    spaceBefore=4 * mm,
    spaceAfter=3 * mm,
    keepWithNext=True,
)
small_section = ParagraphStyle(
    "SmallSection",
    parent=styles["Heading3"],
    fontName="ArialUnicode",
    fontSize=11.5,
    leading=15,
    textColor=colors.HexColor("#1F4E79"),
    spaceBefore=2.5 * mm,
    spaceAfter=1.5 * mm,
    keepWithNext=True,
)
body = ParagraphStyle(
    "Body",
    parent=styles["Normal"],
    **base,
    fontSize=9.4,
    spaceAfter=1.4 * mm,
)
thai = ParagraphStyle(
    "Thai",
    parent=styles["Normal"],
    fontName="ArialUnicode",
    fontSize=10.7,
    leading=17,
    textColor=colors.HexColor("#111111"),
    wordWrap="CJK",
    spaceAfter=0.8 * mm,
)
roman = ParagraphStyle(
    "Roman",
    parent=styles["Normal"],
    fontName="ArialUnicode",
    fontSize=8.7,
    leading=12,
    textColor=colors.HexColor("#666666"),
    spaceAfter=0.6 * mm,
)
zh = ParagraphStyle(
    "Chinese",
    parent=styles["Normal"],
    fontName="ArialUnicode",
    fontSize=8.7,
    leading=12,
    textColor=colors.HexColor("#333333"),
    wordWrap="CJK",
    spaceAfter=2.6 * mm,
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
    spaceAfter=3.5 * mm,
    wordWrap="CJK",
)
line_style = ParagraphStyle(
    "Line",
    parent=styles["Normal"],
    fontName="ArialUnicode",
    fontSize=8.8,
    leading=12,
    textColor=colors.HexColor("#777777"),
    spaceAfter=1.8 * mm,
)
footer_style = ParagraphStyle(
    "Footer",
    parent=styles["Normal"],
    fontName="ArialUnicode",
    fontSize=8,
    textColor=colors.HexColor("#777777"),
    alignment=TA_CENTER,
)


def page_canvas(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor("#D8E2EA"))
    canvas.setLineWidth(0.5)
    y = 12 * mm
    canvas.line(MARGIN_X, y, PAGE_W - MARGIN_X, y)
    footer = Paragraph(f"Thai connectors practice  |  page {doc.page}", footer_style)
    footer.wrapOn(canvas, PAGE_W - 2 * MARGIN_X, 8 * mm)
    footer.drawOn(canvas, MARGIN_X, 5.8 * mm)
    canvas.restoreState()


def block(label, thai_text, roman_text, zh_text, template_thai=None, template_roman=None, prompt=None):
    items = [
        p(label, small_section),
        p(thai_text, thai),
        p(roman_text, roman),
        p(zh_text, zh),
    ]
    if template_thai:
        items.append(p("替換練習", body))
        items.append(p(template_thai, thai))
        items.append(p(template_roman, roman))
    if prompt:
        items.append(p(prompt, line_style))
    return KeepTogether(items)


def connector_table():
    data = [
        [p("功能", body), p("泰文", body), p("羅馬音", body), p("中文", body)],
        [p("和", body), p("และ", thai), p("lae", roman), p("和", body)],
        [p("但是", body), p("แต่ / แต่ว่า", thai), p("dtae / dtae waa", roman), p("但是", body)],
        [p("然後", body), p("แล้วก็", thai), p("laew gor", roman), p("然後", body)],
        [p("因為", body), p("เพราะว่า", thai), p("phraw waa", roman), p("因為", body)],
        [p("所以", body), p("ก็เลย", thai), p("gor loey", roman), p("所以、於是", body)],
        [p("如果...就...", body), p("ถ้า...ก็...", thai), p("thaa...gor...", roman), p("如果...就...", body)],
        [p("或者、還是", body), p("หรือว่า", thai), p("rue waa", roman), p("或者、還是", body)],
        [p("還、再", body), p("อีก", thai), p("iik", roman), p("還、再", body)],
    ]
    table = Table(data, colWidths=[24 * mm, 39 * mm, 37 * mm, 34 * mm], repeatRows=1)
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
    return table


story = []
story.append(p("泰文連接詞 30 分鐘練習", title))
story.append(p("目標: 把連接詞變成你能開口說的句子。每句先慢讀，再正常速度讀，最後替換成自己的生活內容。", subtitle))
story.append(p("發音提示: aa = 長啊，ii = 長衣，ue = 嘴型較扁的「呃」。羅馬音是輔助，下一步要慢慢回到泰文原字。", note))
story.append(p("0 到 3 分鐘: 暖身朗讀", section))
story.append(connector_table())
story.append(Spacer(1, 3 * mm))
story.append(p("讀法: 第一輪看泰文和羅馬音慢讀，第二輪只看泰文讀，第三輪看中文說泰文。", body))

story.append(PageBreak())
story.append(p("3 到 10 分鐘: 和、但是、然後", section))
story.append(
    block(
        "1. และ = 和",
        "วันนี้ฉันเรียนภาษาไทยและดื่มกาแฟ",
        "wan nii chan riian phaa-saa thai lae duem gaa-fae",
        "今天我學泰文和喝咖啡。",
        "วันนี้ฉัน ______ และ ______",
        "wan nii chan ______ lae ______",
        "自己造句: 今天我 ______ 和 ______。",
    )
)
story.append(
    block(
        "2. แต่ / แต่ว่า = 但是",
        "ฉันอยากเรียนภาษาไทย แต่ว่าวันนี้ยุ่งมาก",
        "chan yaak riian phaa-saa thai dtae waa wan nii yung maak",
        "我想學泰文，但是今天很忙。",
        "ฉันอยาก ______ แต่ว่า ______",
        "chan yaak ______ dtae waa ______",
        "自己造句: 我想 ______，但是 ______。",
    )
)
story.append(
    block(
        "3. แล้วก็ = 然後",
        "ฉันตื่นนอน แล้วก็อาบน้ำ",
        "chan dteun non laew gor aap naam",
        "我起床，然後洗澡。",
        "ฉัน ______ แล้วก็ ______",
        "chan ______ laew gor ______",
        "自己造句: 我 ______，然後 ______。",
    )
)

story.append(PageBreak())
story.append(p("10 到 17 分鐘: 因為、所以", section))
story.append(
    block(
        "4. เพราะว่า = 因為",
        "ฉันเหนื่อย เพราะว่าวันนี้ทำงานเยอะ",
        "chan neuay phraw waa wan nii tham-ngaan yuh",
        "我累，因為今天工作很多。",
        "ฉัน ______ เพราะว่า ______",
        "chan ______ phraw waa ______",
        "自己造句: 我 ______，因為 ______。",
    )
)
story.append(
    block(
        "5. ก็เลย = 所以、於是",
        "วันนี้ฝนตก ก็เลยไม่ไปข้างนอก",
        "wan nii fon tok gor loey mai pai khaang nork",
        "今天下雨，所以不出門。",
        "วันนี้ ______ ก็เลย ______",
        "wan nii ______ gor loey ______",
        "自己造句: 今天 ______，所以 ______。",
    )
)
story.append(
    block(
        "6. 因果合體",
        "เพราะว่าวันนี้ยุ่งมาก ก็เลยไม่ได้เรียนภาษาไทย",
        "phraw waa wan nii yung maak gor loey mai dai riian phaa-saa thai",
        "因為今天很忙，所以沒有學泰文。",
        "เพราะว่า ______ ก็เลย ______",
        "phraw waa ______ gor loey ______",
        "自己造句: 因為 ______，所以 ______。",
    )
)

story.append(PageBreak())
story.append(p("17 到 23 分鐘: 如果、還是、再", section))
story.append(
    block(
        "7. ถ้า...ก็... = 如果...就...",
        "ถ้าวันนี้มีเวลา ฉันก็อยากเรียนภาษาไทย",
        "thaa wan nii mii wee-laa chan gor yaak riian phaa-saa thai",
        "如果今天有時間，我就想學泰文。",
        "ถ้า ______ ฉันก็ ______",
        "thaa ______ chan gor ______",
        "自己造句: 如果 ______，我就 ______。",
    )
)
story.append(
    block(
        "8. หรือว่า = 或者、還是",
        "คุณอยากดื่มกาแฟหรือว่าชา",
        "khun yaak duem gaa-fae rue waa chaa",
        "你想喝咖啡還是茶？",
        "คุณอยาก ______ หรือว่า ______",
        "khun yaak ______ rue waa ______",
        "自己造句: 你想 ______ 還是 ______？",
    )
)
story.append(
    block(
        "9. อีก = 還、再",
        "ฉันอยากเรียนอีก",
        "chan yaak riian iik",
        "我還想再學。",
        "ฉันอยาก ______ อีก",
        "chan yaak ______ iik",
        "自己造句: 我還想再 ______。",
    )
)

story.append(p("23 到 27 分鐘: 進階認識", section))
story.append(
    block(
        "10. แม้ว่า...แต่... = 雖然...但是...",
        "แม้ว่าภาษาไทยยาก แต่ฉันอยากเรียน",
        "mae waa phaa-saa thai yaak dtae chan yaak riian",
        "雖然泰文難，但是我想學。",
        "แม้ว่า ______ แต่ ______",
        "mae waa ______ dtae ______",
        "先跟讀即可，不用急著熟練。",
    )
)
story.append(
    block(
        "11. นอกจาก...ยัง... = 除了...還...",
        "นอกจากเรียนภาษาไทย ฉันยังเรียนการออกเสียง",
        "nork jaak riian phaa-saa thai chan yang riian gaan ork siiang",
        "除了學泰文，我還學發音。",
        "นอกจาก ______ ฉันยัง ______",
        "nork jaak ______ chan yang ______",
        "先認得句型，下一課再加強。",
    )
)

story.append(p("27 到 30 分鐘: 最後小口說", section))
final_lines = [
    ("วันนี้ฉันเรียนภาษาไทยและดื่มกาแฟ", "wan nii chan riian phaa-saa thai lae duem gaa-fae", "今天我學泰文和喝咖啡。"),
    ("ฉันอยากเรียนอีก แต่ว่าวันนี้ยุ่งมาก", "chan yaak riian iik dtae waa wan nii yung maak", "我還想再學，但是今天很忙。"),
    ("เพราะว่าวันนี้ทำงานเยอะ ก็เลยเหนื่อย", "phraw waa wan nii tham-ngaan yuh gor loey neuay", "因為今天工作很多，所以累。"),
    ("ถ้าพรุ่งนี้มีเวลา ฉันก็อยากเรียนอีก", "thaa phrung nii mii wee-laa chan gor yaak riian iik", "如果明天有時間，我就還想再學。"),
    ("แม้ว่าภาษาไทยยาก แต่ฉันชอบ", "mae waa phaa-saa thai yaak dtae chan chorp", "雖然泰文難，但是我喜歡。"),
]
for th, ro, cn in final_lines:
    story.append(p(th, thai))
    story.append(p(ro, roman))
    story.append(p(cn, zh))

story.append(p("完成標準: 今天只要能自己說出 6 個核心句型就算成功: และ, แต่ว่า, แล้วก็, เพราะว่า, ก็เลย, ถ้า...ก็...", note))


doc = BaseDocTemplate(
    OUTPUT,
    pagesize=A4,
    leftMargin=MARGIN_X,
    rightMargin=MARGIN_X,
    topMargin=MARGIN_TOP,
    bottomMargin=MARGIN_BOTTOM,
)
frame = Frame(
    MARGIN_X,
    MARGIN_BOTTOM + 7 * mm,
    PAGE_W - 2 * MARGIN_X,
    PAGE_H - MARGIN_TOP - MARGIN_BOTTOM - 7 * mm,
    id="normal",
)
doc.addPageTemplates([PageTemplate(id="normal", frames=[frame], onPage=page_canvas)])
doc.build(story)
print(OUTPUT)
