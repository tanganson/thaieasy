# คำเก่า｜泰語學習與快速複習專案

> 專案監察文件（Single Source of Truth）  
> 最後更新：2026-08-12  
> 文件狀態：持續維護

## 1. 專案目標

把既有泰語學習筆記整理成一個可搜尋、可持續更新及可快速複習的本地網站，並保留日後部署為正式網頁、接入使用者帳戶與資料庫的遷移空間。

目前的核心使用情境：

1. 以中文、泰文或羅馬拼音快速找回學過的詞句。
2. 依泰文起首子音、讀音聲母或主題瀏覽內容。
3. 收藏常用詞句並進行間隔複習。
4. 直接播放泰文發音。
5. 在本機新增個人詞句，無需登入或網路資料庫。

## 2. 目前狀態

| 項目 | 狀態 | 說明 |
| --- | --- | --- |
| 泰語資料匯入 | 已完成 | 從整理後的 Markdown 產生網站資料；包含 18-6-2026 母音教材、Output/1 母音與低子音教材及泰文 24 小時說法筆記 |
| 中文／泰文／拼音搜尋 | 已完成 | 支援忽略拼音音調符號及常見分隔符號 |
| 泰文起首子音篩選 | 已完成 | 包括部分前引字判斷 |
| 羅馬拼音起首篩選 | 已完成 | 支援 kh、ph、th、ch、bp、dt、ng 等組合 |
| 主題篩選與排序 | 已完成 | 可按主題、最近學習、泰文及中文排序 |
| 結果分頁 | 已完成 | 每頁最多 25 筆，支援頁碼、上一頁及下一頁 |
| Sidebar 獨立滾動 | 已完成 | 桌面版主題欄與主內容分開滾動；手機版維持自然單欄滾動 |
| 收藏 | 已完成 | 保存在瀏覽器本地儲存 |
| 快速複習 | 已完成 | 每輪最多 10 筆，支援忘記／困難／熟悉 |
| 複習排程 | 已完成（基礎版） | 忘記：10 分鐘；困難：1 天；熟悉：3 天 |
| 入門練習 | 已完成（第一版） | 保留快速複習，現階段只提供泰文選中文及中文選泰文；每輪 5 題、每題 3 個選項，錯題稍後重現 |
| 多元練習紀錄 | 已完成（第一版） | 保存詞條、題型、目標能力、正誤及作答時間，最多保留最近 5,000 筆 |
| 泰文發音 | 已完成 | 使用瀏覽器 Speech Synthesis，優先選擇 `th-TH` 語音 |
| 發音速度 | 已完成 | 0.7x、0.85x、1.0x |
| 個人新增詞句 | 已完成 | 保存在瀏覽器本地儲存 |
| PWA／加入主畫面 | 已完成（基礎版） | 已有 manifest 及 Service Worker |
| macOS 快速啟動 | 已完成 | `泰語複習.app` 會自動啟動本機伺服器，並以時間戳網址載入最新資料 |
| 薄弱字追蹤 | 規劃中 | 尚未實作薄弱分數、篩選及集中複習 |
| 資料匯出／匯入 | 規劃中 | 尚未提供 JSON 備份及還原介面 |
| 學習進度頁面 | 規劃中 | 等累積足夠複習資料後加入 |
| 正式資料庫 | 接入中 | Supabase Free project `thaieasy` 位於新加坡 `ap-southeast-1`；已加入使用者學習狀態 schema、RLS、Email Magic Link 登入及 localStorage 離線優先同步 |
| Cloudflare Pages 部署 | 已完成 | Production URL：`https://thaieasy.pages.dev`；專案 `thaieasy`，production branch `main` |

## 3. 專案結構

```text
Thai/
├── AGENTS.md                         # 專案工作規則
├── PROJECT.md                        # 本文件；專案狀態唯一依據
├── curriculum/                       # 課程規劃
├── history/                          # 課程或生成紀錄
├── output/
│   ├── markdown/                     # 筆記及網站主要資料來源
│   └── pdf/                          # 已生成的 PDF
├── scripts/
│   ├── build_thai_review_data.py     # Markdown -> web/data.js
│   ├── generate_daily_lesson.py      # 每日課程生成
│   └── generate_thai_*_pdf.py        # 專題 PDF 生成
├── web/
│   ├── index.html                    # 網站結構
│   ├── styles.css                    # 響應式介面樣式
│   ├── app.js                        # 搜尋、複習、儲存及發音邏輯
│   ├── data.js                       # 自動產生的網站詞句資料
│   ├── manifest.webmanifest          # PWA 設定
│   ├── sw.js                         # 離線快取
│   └── assets/                       # 網站圖片資源
└── 泰語複習.app/                     # macOS 快速啟動器
```

`泰語複習.app` 會檢查 `http://127.0.0.1:4173/data.js`；服務未啟動時，會以 `/usr/bin/python3` 在背景提供 `web/`。開啟網址時加入當前時間戳，避免瀏覽器只切回未重新載入的舊分頁。

## 4. 資料來源與更新流程

目前網站內容的主要來源是 Google 文件整理筆記、`18-6-2026` 資料夾內 40 張 `02-*.jpg` 母音教材，以及 `/Users/anson/Output/1/` 內 73 張 `01-*.jpg` 母音與低子音教材的人工核對轉錄：

```text
output/markdown/thai_google_doc_organized_notes.md
        ↓ scripts/build_thai_review_data.py
web/data.js
        ↓ 瀏覽器載入
網站詞句列表
```

重新產生網站資料：

```bash
python3 scripts/build_thai_review_data.py
```

`web/data.js` 是生成檔案，不應直接作為長期人工編輯來源。修改整理筆記後，應重新執行生成程式，並確認輸出的詞句數量與網站顯示一致。

Markdown 可用 `<!-- source: 來源名稱 -->` 切換後續詞句的 `source` 欄位。未指定時預設為「Google 文件整理筆記」。`18-6-2026` 資料夾其餘 816 張活動／人物照片不屬於泰語教材，沒有匯入。

## 5. 現有資料模型

### 5.1 詞句資料

```json
{
  "id": "note-001-...",
  "meaning": "中文意思",
  "thai": "泰文",
  "pronunciation": "羅馬拼音",
  "category": "主題",
  "source": "Google 文件整理筆記／18-6-2026 母音教材"
}
```

個人新增詞句使用 `custom-<timestamp>` 作為 ID，並將 `source` 設為「個人新增」。

### 5.2 本地學習狀態

瀏覽器儲存鍵：`thai-review-state-v1`

```json
{
  "favorites": ["entry-id"],
  "reviews": {
    "entry-id": {
      "rating": "again | hard | good",
      "reviewedAt": 0,
      "dueAt": "ISO-8601"
    }
  },
  "customEntries": []
}
```

第一版多元練習另在相同狀態中保存 `practiceRecords`：

```json
{
  "id": "practice-<timestamp>-<index>",
  "entryId": "entry-id",
  "exerciseType": "thai_to_meaning | meaning_to_thai | listening_choice | meaning_to_thai_input",
  "targetSkill": "閱讀辨認 | 主動回想 | 聽力辨認 | 拼寫回想",
  "correct": true,
  "answeredAt": "ISO-8601"
}
```

入門練習紀錄與原有 `reviews` 分開，因此不會改變快速複習的忘記／困難／熟悉排程。資料模型仍保留聽力與輸入題型，現階段暫停出題，待基礎熟練度提高後再逐步開放。

注意：清除瀏覽器網站資料、更換瀏覽器或更換裝置，可能會失去上述個人資料。目前尚未提供自動備份。

## 6. 未來資料庫相容設計

在接入資料庫前，應先把內容和學習活動分開：

| 資料集合／資料表 | 用途 | 關鍵欄位 |
| --- | --- | --- |
| `entries` | 泰文內容 | `id`, `thai`, `pronunciation`, `meaning`, `category`, `source`, `createdAt`, `updatedAt` |
| `review_records` | 每次複習事件 | `id`, `entryId`, `rating`, `reviewedAt`, `dueAt` |
| `entry_progress` | 每字彙總狀態 | `entryId`, `weaknessScore`, `reviewCount`, `correctStreak`, `lastReviewedAt` |
| `favorites` | 使用者收藏 | `entryId`, `createdAt`；部署後再加入 `userId` |

本地階段應優先完成 JSON 匯出／匯入，讓現有 `localStorage` 資料可以備份，並可直接轉換為日後的資料庫匯入格式。

## 7. 薄弱字功能規劃

第一階段不另開頁面，直接整合到現有搜尋及複習流程：

- 複習評分累積薄弱分數。
- 新增「薄弱」篩選及「集中複習薄弱字」。
- 列表以簡單狀態顯示薄弱、學習中及已掌握。
- 保存每次評分，而不只保留最後一次結果。

建議初始計分：忘記 `+3`、困難 `+1`、熟悉 `-1`；連續答對逐步降低薄弱度。實作前需確定分數上下限、狀態門檻及舊有複習資料的遷移方式。

## 8. 學習進度頁面條件

先從第一天保存完整複習事件，達到以下條件中的至少兩項後，再加入獨立「學習進度」頁面：

- 累積至少 50 次複習。
- 已複習至少 30 個不同詞句。
- 累積至少 7 天使用紀錄。
- 薄弱字達到 10 個以上。

預計顯示：7／30 天複習量、掌握狀態分布、最薄弱詞句、最薄弱泰文聲母、主題掌握程度及連續學習天數。

## 9. 執行與驗證

本地測試伺服器：

```bash
python3 -m http.server 4173 --directory web
```

瀏覽網址：`http://localhost:4173/`

最低驗證項目：

```bash
node --check web/app.js
node --check web/sw.js
```

涉及介面修改時，還要檢查桌面及手機版面、搜尋、篩選、對話框、發音、複習流程及水平溢出。涉及 PWA 檔案時，應同步更新 Service Worker 的快取版本。

最近一次已知驗證（2026-08-12）：

- 保留原有快速複習流程，另提供獨立「入門練習」入口；每輪 5 題，採 3 選 1 的泰文／中文雙向辨認。
- 入門練習題目優先涵蓋到期及長期未見詞條；答錯詞條會在本輪稍後重新出現，作答紀錄和快速複習紀錄分開保存。
- PWA 核心資源版本提升至 `v=6`，Service Worker 快取提升至 `thai-review-shell-v6`。
- 完整核對 `/Users/anson/Output/1/` 的 73 張 `01-*.jpg`，內容為母音 เ-ะ／เ-／แ-、低子音 ส、詞語、搭配詞與閱讀句子。
- 新資料以「Output/1 母音與低子音教材」標記來源，共新增 61 筆，並排除網站已有的基本數字和明顯重複詞條。

前次介面與資料驗證（2026-08-11）：

- `web/app.js` 語法檢查通過。
- `web/sw.js` 語法檢查通過。
- 資料生成腳本成功產生 206 筆詞句，其中 32 筆來源為「18-6-2026 母音教材」。
- 206 筆資料的 `id`、泰文及中文均非空，ID 沒有重複；新分類「泰語母音與閱讀練習」已加入分類列表。
- 頁面載入後總數及結果數均為 206；「泰語母音與閱讀練習」分類顯示並篩出 32 筆。
- 全部 206 筆資料分為 9 頁，第一頁及第二頁各只渲染 25 筆；32 筆母音分類分為 2 頁。
- 桌面版 Sidebar 可獨立滾動且不帶動主頁，390px 手機版取消內層 Sidebar 滾動並無水平溢出。
- 搜尋「ลุงชอบยืนมองทะเลมาก」只顯示對應的 1 筆教材句子，瀏覽器沒有 console 或 page error。
- 206 筆結果均由相同列表元件提供發音按鈕。
- 從 `泰語複習.app` 啟動時可自動建立 `127.0.0.1:4173` 服務，並以時間戳網址載入 206 筆最新資料。
- 搜尋「好吃」顯示 2 筆結果及 2 個發音按鈕。
- 複習答案顯示後可使用發音按鈕。
- 桌面及 390px 手機版沒有水平溢出。

## 10. 已知限制

- 個人資料只存在目前瀏覽器，尚未提供跨裝置同步。
- 尚未提供 JSON 備份、還原及資料版本遷移。
- 瀏覽器發音依賴裝置安裝的泰文語音，品質可能不同。
- Service Worker 採簡單 cache-first 策略，更新版本需要人工提升快取名稱。
- 目前只有最後一次複習結果，尚未保存完整複習事件歷史。
- 尚未建立自動化測試套件。

## 11. 路線圖

### 下一階段

1. 建立可遷移的本地資料版本及 JSON 匯出／匯入。
2. 保存完整複習事件，加入薄弱分數與狀態。
3. 加入「薄弱」篩選及集中複習模式。
4. 實際使用 1 至 2 星期並檢查計分是否符合學習感受。

### 資料累積後

1. 建立學習進度頁面。
2. 決定部署平台、登入方式及資料庫。
3. 編寫本地 JSON／localStorage 到正式資料庫的遷移工具。
4. 視需要改用真人錄音或雲端泰文語音。

## 12. 文件更新規則

每次修改專案時，必須在同一次更新中：

1. 更新本文件頂部的「最後更新」日期。
2. 更新「目前狀態」及受影響的資料模型、流程或限制。
3. 更新「最近一次已知驗證」。
4. 在下方更新紀錄加入日期、改動、影響檔案及驗證結果。
5. 未完成的功能必須標示為「規劃中」或「未開始」。

## 13. 更新紀錄

### 2026-08-12

- 修正 Supabase Email Magic Link 回跳到無服務的 `localhost`：Auth Site URL 改為 `https://thaieasy.pages.dev`，並允許正式 Pages 網址及本機 `4173` 開發網址作 redirect。
- 舊確認郵件仍包含原本 localhost URL，必須從網站重新寄出登入連結；新郵件會回到正式網站。

- 新增 Supabase `user_learning_states` migration 與 RLS：每位登入者只能讀寫自己的 JSON 學習狀態。
- 新增 Email Magic Link 登入、登出和同步狀態介面；收藏、複習、個人詞句及練習紀錄繼續先保存於 `localStorage`，登入後同步至 Supabase，離線仍可使用。
- 首次登入時若雲端已有資料則下載，否則把現有本機狀態上傳；Supabase 前端只使用公開 publishable key，不包含 secret 或 service-role key。
- 核心資源更新至 `v=9`，Service Worker 快取提升至 `thai-review-shell-v9`。
- 建立 Cloudflare Pages 專案 `thaieasy` 並部署 `web/`，production URL 為 `https://thaieasy.pages.dev`。
- 驗證：production GET 載入「泰簡單」及 `v=9` 資源；Service Worker 回傳 `thai-review-shell-v9`；Supabase migration 成功，未登入使用公開 publishable key 查詢時 RLS 回傳空結果且不洩露資料。

- 建立並連結 Supabase Free project `thaieasy`，project ref 為 `pxrmizrtermsxowsqwil`，區域為 `ap-southeast-1`（新加坡），狀態驗證為 `ACTIVE_HEALTHY`。
- 目前只完成雲端資料庫基礎設施與本地 CLI link；尚未建立正式 schema、登入或前端同步，學習資料仍只保存在瀏覽器 `localStorage`。
- 敏感的資料庫密碼保存在本機受限權限檔案，不納入 Git；Supabase access token 不寫入專案。
- 驗證：`supabase projects list` 顯示新 project ACTIVE_HEALTHY，`supabase link` 成功。

- 建立 Git 版本控制基線；新增 `.gitignore`，排除 macOS `.DS_Store`、`tmp/` 渲染檢查檔及 Python 快取，保留課程、筆記、PDF、網站與本機啟動器。

- 新增「泰文 24 小時說法」筆記：涵蓋 00:00 至 23:00 的 24 個整點說法，以及「現在幾點？」和「現在是下午 3 點」兩個問答句；完整教學稿保留於 `output/markdown/thai_24_hour_time.md`，並把 26 個可複習詞條匯入網站資料。
- 核心資源更新至 `v=8`，Service Worker 快取提升至 `thai-review-shell-v8`。
- 影響檔案：`output/markdown/thai_google_doc_organized_notes.md`、`web/data.js`、`web/index.html`、`web/sw.js`、`PROJECT.md`；驗證：重新生成資料後核對詞條總數、分類、來源、必填欄位、重複 ID 及 JavaScript 語法。

- 首頁主標題由「找回以前學過的字」改為「泰簡單」；核心資源更新至 `v=7`，Service Worker 快取提升至 `thai-review-shell-v7`。
- 影響檔案：`web/index.html`、`web/sw.js`、`PROJECT.md`；驗證：標題文字、JavaScript 語法及快取版本檢查通過。

- 依目前學習程度將「多元練習」改為「入門練習」：每輪由 10 題減為 5 題，每題由 4 個選項減為 3 個，只出泰文選中文及中文選泰文，暫停聽力與泰文輸入題。
- 新增錯題回補：首次答錯的詞條會插入本輪稍後位置再練一次；重試不會無限追加。
- 保留原有快速複習及多元題型資料結構，歷史作答紀錄無需遷移；核心資源更新至 `v=6`，Service Worker 快取提升至 `thai-review-shell-v6`。
- 影響檔案：`web/index.html`、`web/app.js`、`web/sw.js`、`PROJECT.md`。
- 驗證：每輪初始 5 題、3 個選項、3:2 雙向題型比例、錯題稍後重現、重試不循環追加、作答紀錄保存，以及原有快速複習回歸測試。

- 修正多元練習「聽音選字」題目的歧義：移除會被誤認為題目內容的泰文 `ฟัง`，改為「播放題目發音，再選出你聽到的泰文」及帶有「點擊重播」標籤的獨立播放按鈕。
- 核心資源更新至 `v=5`，Service Worker 快取提升至 `thai-review-shell-v5`；影響檔案：`web/index.html`、`web/app.js`、`web/styles.css`、`web/sw.js`、`PROJECT.md`。
- 驗證：聽力題不再顯示目標以外的泰文提示，發音自動播放及手動重播正常，桌面及手機版題意清楚且無水平溢出。

- 保留既有「快速複習」，新增獨立「多元練習」功能：泰文選中文、中文選泰文、聽音選字，以及熟練後出現的泰文輸入題，每輪 10 題。
- 新增多元練習作答紀錄，保存詞條、題型、目標能力、正誤與時間；紀錄與原有複習排程分離，並限制最多 5,000 筆。
- 題目優先從到期與長期未見詞條選取，選擇題干擾項優先使用同分類或相同起首子音詞條。
- 核心資源更新至 `v=4`，Service Worker 快取提升至 `thai-review-shell-v4`。
- 影響檔案：`web/index.html`、`web/app.js`、`web/styles.css`、`web/sw.js`、`PROJECT.md`。
- 驗證：JavaScript 語法、桌面與手機版面、四種題型、正誤回饋、作答紀錄持久化，以及既有快速複習回歸測試。

- 完整檢視 `/Users/anson/Output/1/` 的 73 張教材圖片，整理母音、低子音、詞語、搭配詞與閱讀句子至主要 Markdown 資料源。
- 新增「母音與低子音閱讀練習」分類，來源標記為「Output/1 母音與低子音教材」；排除已存在的基本數字與重複詞條。
- 影響檔案：`output/markdown/thai_google_doc_organized_notes.md`、`web/data.js`、`PROJECT.md`。
- 驗證：重新產生網站資料，檢查總筆數、來源筆數、必填欄位、ID 唯一性、Python 與 JavaScript 語法，並確認新分類可由網站資料載入。

### 2026-08-11

- 結果列表新增每頁 25 筆分頁，包含頁碼、上一頁／下一頁、目前顯示範圍，搜尋、主題、聲母、檢視及排序變更時自動回到第一頁。
- 桌面 Sidebar 改為獨立垂直滾動區，與主內容頁面滾動分離；760px 以下回復自然單欄滾動。
- 核心資源加入 `v=3` 版本參數，Service Worker 快取提升至 `thai-review-shell-v3`，確保 App 立即載入新版介面。
- 影響檔案：`web/index.html`、`web/app.js`、`web/styles.css`、`web/sw.js`、`PROJECT.md`。
- 驗證：全部資料共 9 頁、每頁不超過 25 筆；分頁、搜尋與 32 筆母音分類回頁行為正常；桌面 Sidebar 獨立滾動，桌面及手機無水平溢出。

- 修正 `泰語複習.app` 只切回既有 `file://` 分頁而不重新載入的問題：啟動器現在會自動啟動本機伺服器，並用時間戳網址強制取得最新資料。
- 重新編譯 App 內的 `main.scpt`；影響檔案：`泰語複習啟動器.applescript`、`泰語複習.app/Contents/Resources/Scripts/main.scpt`、`PROJECT.md`。
- 驗證：從 App 入口啟動後，伺服器回傳 206 筆資料，首頁顯示 206 個結果及 32 筆「泰語母音與閱讀練習」。

- 核對 `/Users/anson/Desktop/18-6-2026/` 的 856 張圖片，確認 `02-1.jpg` 至 `02-40.jpg` 為泰語母音教材，其餘 816 張為非教材活動／人物照片。
- 從 40 張教材人工轉錄 32 筆母音、詞語及閱讀練習至主要 Markdown 資料源，新增「泰語母音與閱讀練習」分類；資料總數由 174 筆增至 206 筆。
- 資料生成器新增 Markdown 來源標記支援，匯入資料可保留「18-6-2026 母音教材」來源；更新 Service Worker 快取至 `thai-review-shell-v2`。
- 影響檔案：`output/markdown/thai_google_doc_organized_notes.md`、`scripts/build_thai_review_data.py`、`web/data.js`、`web/sw.js`、`PROJECT.md`。
- 驗證：成功重建 206 筆資料；確認 32 筆新資料來源、分類、必填欄位與 ID 唯一性，通過 JavaScript 及 Python 語法檢查，並以 Chrome 實測總數、分類篩選及新句搜尋。

### 2026-08-11（專案文件建立）

- 建立 `PROJECT.md`，集中記錄專案目標、現況、架構、資料模型、限制、路線圖及驗證狀態。
- 更新 `AGENTS.md`，規定後續每次專案修改必須同步維護本文件。
- 記錄現有 174 筆詞句、搜尋與篩選、收藏、快速複習、瀏覽器泰文發音、PWA 及 macOS 啟動器狀態。
- 記錄薄弱字、JSON 匯出／匯入、學習進度頁面及資料庫仍屬後續規劃。
- 驗證：對照現有 `web/` 程式、資料生成腳本及先前完成的桌面／手機測試結果。
