# คำเก่า｜泰語學習與快速複習專案

> 專案監察文件（Single Source of Truth）  
> 最後更新：2026-08-13
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
| 泰語資料匯入 | 已完成 | 從整理後的 Markdown 產生網站資料；包含 18-6-2026 母音教材、Output/1 母音與低子音教材、泰文 24 小時說法及 2026 年 4–7 月課堂筆記 |
| 中文／泰文／拼音搜尋 | 已完成 | 支援忽略拼音音調符號及常見分隔符號 |
| 泰文起首子音篩選 | 已完成 | 包括部分前引字判斷 |
| 羅馬拼音起首篩選 | 已完成 | 支援 kh、ph、th、ch、bp、dt、ng 等組合 |
| 主題篩選與排序 | 已完成 | 可按主題、最近學習、泰文及中文排序 |
| 結果分頁 | 已完成 | 每頁最多 25 筆，支援頁碼、上一頁及下一頁 |
| Sidebar 獨立滾動 | 已完成 | 桌面版主題欄與主內容分開滾動；手機版維持自然單欄滾動 |
| 手機分類導覽 | 已完成 | 手機 Top Bar 提供分類按鈕，以左側滑出面板顯示檢視及完整主題列表；選取後自動關閉 |
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
| 即時翻譯頁面 | 已完成（第二版） | 使用 Azure Translator 提供穩定的泰中翻譯，Claude Haiku 4.5 僅非阻塞補充讀音與學習提示；泰中雙向、自動判斷、可編輯結果、泰文播放及收藏詞條；API keys 使用 Cloudflare Secrets |

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

### 分類命名規則

`category` 只描述可長期使用的學習內容主題；`source` 才記錄筆記名稱、日期、檔案、教材或匯入批次。可新增新分類，但必須符合以下規則：

- 使用穩定的語意主題，例如「交通與方向」、「健康與身體」、「購物與價格」。
- 不得包含年份、日期或日期範圍，例如「2026 年 4–7 月」。
- 不得使用課堂筆記、資料來源、匯入批次、檔名或功能收藏作為分類，例如「某月課堂筆記」、「Output/1」、「即時翻譯收藏」。
- 新分類應能合理容納多個不同來源的詞條；只有單一來源或單次活動的名稱應保留在 `source`。

生成器會驗證分類名稱，違規時直接停止生成並指出分類；網站新增詞條會拒絕違規名稱，從舊本機或雲端狀態讀到違規分類時則依詞條內容自動遷移。

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

## 8A. 擴大資料庫後的複習可靠性

快速複習的準確性不能只靠「最後一次評分」。內容、題目、答案和學習事件必須可以追溯：

1. `entries` 作為內容主檔，採不可變 ID；修正泰文、拼音或中文時建立 `entry_versions`，保留 `version`、來源、審核者及審核時間。舊事件仍指向原版本，避免日後改字造成歷史成績被改寫。
2. 每次作答寫入 append-only `review_events`，至少包含 `user_id`、`entry_id`、`entry_version`、`exercise_type`、`target_skill`、`result`、`response_ms`、`answered_at`、`client_event_id`。`client_event_id` 加唯一索引，避免離線同步重複計算。
3. `user_entry_progress` 只存可重算的快取（`due_at`、`stability`、`difficulty`、`retrievability`、`streak`、`last_event_at`、`algorithm_version`）。排程器以事件更新快取，必要時可以用相同演算法版本重建。
4. 題目產生必須排除同義重複、答案洩漏和無效干擾項；每題保存 `question_id` 及選項快照，才能在錯誤報告中重現當時題目。正式上線前先以現有簡單排程跑基準，再以 FSRS 或 SM-2 的固定版本做 A/B 比較，不要直接混用多套公式。
5. 可靠性指標至少包括：到期題完成率、答對率、隔日保留率、重複事件率、題目申訴率及同步衝突率。每次改演算法都增加 `algorithm_version`，不可靜默改變舊排程。

建議的資料庫邊界如下：內容表是全站共用；`review_events`、`user_entry_progress`、`favorites`、`study_sessions` 和 `user_learning_settings` 都以 `user_id` 為分區鍵。初期仍可把本地狀態匯出成事件，再批次建立彙總進度。

## 8B. 學生系統的隔離與資料模型

Supabase Auth 的 `auth.uid()` 是身份唯一來源，前端傳入的 `user_id` 不具信任性。所有學生資料表啟用 RLS，並要求 `user_id = auth.uid()`；教師／管理者日後透過明確的 `class_memberships` 角色政策讀取被授權學生，不能以「知道 ID」繞過隔離。

建議新增以下表（取代長期依賴單一 JSON）：

| 表 | 用途 |
| --- | --- |
| `profiles` | 顯示名稱、母語、時區及建立時間 |
| `user_learning_settings` | 每日分鐘數、每日新詞上限、目標技能、羅馬拼音顯示、通知及自訂範圍 |
| `study_plans` / `study_plan_items` | 學生選定的課程、主題或自訂詞庫快照 |
| `review_events` | 不可變作答紀錄，可離線同步 |
| `user_entry_progress` | 每位學生對每個 entry 的排程與能力彙總 |
| `study_sessions` | 一次學習開始／結束、裝置及統計 |

### 老師群組（one-to-many）

老師與群組採 `teacher 1 -> many groups`：一位老師可以建立及管理多個班級／學習群組；每個群組保存名稱、邀請碼、課程設定及建立者。群組與學生之間使用 membership 表，而不是把 `group_id` 直接寫進學生帳戶，因為同一學生日後可能同時參加多個群組。

| 表 | 關係及用途 | 主要欄位 |
| --- | --- | --- |
| `teacher_profiles` | 一位老師一個公開教學身份 | `user_id`、`display_name`、`created_at` |
| `learning_groups` | 一位老師可有多個群組 | `id`、`owner_teacher_id`、`name`、`invite_code`、`status`、`created_at` |
| `group_memberships` | 群組與學生的成員關係 | `group_id`、`student_id`、`role`、`status`、`joined_at`、`left_at` |
| `group_plans` | 群組共用的課程／範圍 | `group_id`、`plan_snapshot`、`version`、`published_at` |

`learning_groups.owner_teacher_id` 必須只能指向具教師身份的帳戶；RLS 允許群組擁有者管理群組和成員，學生只能讀取自己所在群組及被發布的計劃。老師查看學生表現時只提供彙總（完成率、掌握分布、薄弱主題），除非學生明確授權，不直接暴露完整作答內容。若產品最後要求嚴格的一對多（學生只能屬於一個群組），可在 `group_memberships` 加 `unique(student_id) where status = 'active'`；預設先保留多群組能力。

每個同步請求使用冪等事件 ID和伺服器時間；衝突時採事件合併，不能用整包 JSON 的最後寫入覆蓋另一裝置。帳戶刪除以 cascade 清除個人資料，內容主檔不跟著刪除。

## 8C. 學生可設定的學習範圍

設定介面分成「目標」和「範圍」兩層，預設提供安全的入門選項：

- 目標：旅行生存、日常對話、閱讀、聽力、口說；可選一個主目標及最多兩個次目標。
- 範圍：課程階段／週、主題、來源、收藏、薄弱字、自訂詞條；支援包含及排除，並顯示預計詞條數。
- 節奏：每日 5／10／15／30 分鐘、每日新內容上限 3／5／10、是否顯示羅馬拼音。
- 模式：跟隨路線（自動解鎖）、自由練習（只在所選範圍抽題）、考前衝刺（提高指定日期前的到期題比例）。

每次開始學習先產生 `study_plan` 快照；之後內容分類改名不會改變學生當時的範圍。若範圍太窄導致沒有足夠題目，明確提示並只放寬同一主題的舊題，不暗中加入未選內容。

## 8D. 「由淺入深」的可計算定義

難度不是單一標籤，也不只按詞頻。每個詞條／句子使用五個維度評分（0–4）：字形負擔、發音負擔、詞彙頻率、句法複雜度、溝通任務負擔；另保存前置條件（例如數字、量詞先於購物句）。內容難度可計算為加權分數，但學生解鎖依「能力掌握」而非分數本身。

初始內部級別：`A0 生存辨認`、`A1 基本回應`、`A2 日常互動`、`B1 敘事與意見`、`B2 自然變化`。升級條件採最近 20 次相關事件：辨認正確率至少 85%、主動回想至少 75%、連續兩次在不同題型答對，且沒有高優先級前置技能未掌握。新級別先以 10% challenge 題試探；錯誤率超過 35% 就降回上一級的混合複習。

自學者的預設路線沿用 365 天五階段和每週節奏：60% 已學複習、30% 新內容、10% 挑戰。完成單元不等於永久掌握；只有在間隔後仍達到門檻才標記為 `mastered`。學生可隨時跳級，但先做短 placement test，結果只調整起始隊列，不刪除未掌握內容。

## 8E. 建議落地順序

1. 先完成 localStorage JSON 匯出／匯入及事件格式，讓現有單人資料可回復。
2. 將 `reviews` 寫入本地 `review_events`，由事件重建 `user_entry_progress`，加入冪等 ID 和 `algorithm_version`。
3. 建立 Supabase 正規化表與 RLS，保留 `user_learning_states` 作為過渡讀取來源，完成一次性遷移後再停止整包覆蓋。
4. 加入學習設定、範圍快照和 placement test；最後建立教師群組、邀請碼／審核加入、群組課程發布及彙總進度頁面。

這個順序先解決「數據變大仍可信」的基礎，再增加學生體驗；任何新題型都必須先定義 `target_skill`、評分規則及通過門檻，才可進入正式排程。

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

最近一次已知驗證（2026-08-13）：

- 從 2026 年 4–7 月課堂附件整理新增詞語及例句，排除現有重複項、純文法註記及無法可靠確認泰文拼寫的內容。
- 新資料統一標記來源為「2026 年 4–7 月課堂筆記」，分類為「2026 年 4–7 月課堂筆記」。
- PWA 核心資源版本提升至 `v=14`，Service Worker 快取提升至 `thai-review-shell-v14`。

前次已知驗證（2026-08-12）：

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
- 即時翻譯需要網路及 CloudVein API key；翻譯文字會傳送至第三方 CloudVein 相容 API。目前未加入登入強制、IP 速率限制或 Turnstile，正式公開前應在 Cloudflare 層加入防濫用及用量告警。

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

### 2026-08-13

- 統一手機功能視窗的可視高度：使用 `100dvh` 及 iPhone safe-area，所有 Modal 均限制在當前可見畫面內；固定頭尾操作區，中間內容在必要時獨立捲動，不再超出 Safari 畫面。
- 快速複習的三個評分按鈕在手機維持單列，並壓縮標題、答案與間距以便一頁完成；翻譯結果操作列固定於視窗內底部。手機所有輸入框字體至少 16px，避免 iOS Safari 聚焦時自動放大。核心資源提升至 `v=23`，Service Worker 快取提升至 `thai-review-shell-v23`。驗證：390×700 下翻譯輸入為 16px、視窗無水平溢出；快速複習及入門練習 Modal 均位於 12–688px，底部操作完整可見且無 console error。

- 移除羅馬拼音「按讀音」起首篩選，改為完整泰文字音索引：固定顯示 44 個聲母及 24 個常用短／長／複合韻母，不再因詞庫尚未包含某字音而缺項。
- 點選聲母或韻母後顯示泰文名稱、羅馬讀音及播放按鈕，例如 `ก · กอ ไก่ · gor gai`、`ม · มอ ม้า · mor maa`；聲母按起首子音篩選，韻母按泰文拼寫模式篩選。核心資源提升至 `v=22`，Service Worker 快取提升至 `thai-review-shell-v22`。

- 修正手機「功能」面板展開時整頁反黑：功能選單不再使用遮罩或鎖定背景，頁面維持正常亮度，點擊面板外區域即可關閉；分類抽屜仍保留遮罩以維持導覽焦點。核心資源提升至 `v=21`，Service Worker 快取提升至 `thai-review-shell-v21`。

- 新增微信公眾平台網站所有權驗證檔 `133591e4cfaf0599b6665ba58671e4a4.txt` 至網站根目錄；部署後以公開網址確認 HTTP 200 及純文字內容完全一致。

- 手機版改為拇指可及的固定底部操作列，「分類」及「功能」兩個 56px 入口移至畫面最下方；頂部只保留較緊湊的品牌列。
- 分類改為由底部展開的 78vh 抽屜，功能改為貼近底部的兩欄操作面板；兩者支援遮罩、背景鎖定、iPhone safe-area 及內容底部避讓。核心資源提升至 `v=20`，Service Worker 快取提升至 `thai-review-shell-v20`。驗證：390×844 底部列位於 775–844px，分類抽屜及功能面板均在底欄上方、14 個主題完整載入且無水平溢出；1440×900 桌面工具列維持原位，無 console error。

- 建立正式分類治理規則：分類只能描述穩定學習主題，年份／日期範圍、課堂筆記、資料來源、匯入批次及功能收藏名稱一律禁止；來源資訊保留在 `source`。
- 資料生成器新增 fail-fast 驗證，未來違規分類會直接阻止生成；前端新增詞條使用相同規則，舊本機或雲端違規分類會依內容自動遷移。核心資源提升至 `v=19`，Service Worker 快取提升至 `thai-review-shell-v19`。

- 移除「2026 年 4–7 月課堂筆記」及「即時翻譯收藏」作為主題分類，但完整保留詞條及原始 `source`；112 筆課堂內容按日期、飲食、人物、時間、地點等既有主題重新分類。
- 既有即時翻譯收藏在本機或雲端狀態載入時自動遷移並持久保存，新收藏依中文及泰文內容歸入現有主題。核心資源提升至 `v=18`，Service Worker 快取提升至 `thai-review-shell-v18`。驗證：405 筆總數及 112 筆課堂內容完整保留，兩個舊分類均為 0；課堂內容分布於 9 個既有主題，必填欄位、ID、Python／JavaScript 語法及 Git diff 檢查通過。

- 即時翻譯改為兩階段回應：`/api/translate` 只等待 Azure 並立即顯示泰中翻譯，`/api/translate/enrich` 再於背景取得 Claude 讀音、詞性、語氣及提示；Claude 延遲或失敗不再阻塞翻譯結果。
- 前端在 Azure 完成後立即解鎖翻譯結果並顯示學習資料載入狀態，補充完成後更新欄位及 provider 標籤。核心資源提升至 `v=17`，Service Worker 快取提升至 `thai-review-shell-v17`。

- 修正即時翻譯介面仍顯示舊「Claude Haiku」標籤的誤導：標題改為 Azure Translator，結果標籤依 API 的 `provider` 與 `enrichmentModel` 動態顯示「Azure 翻譯」或「Azure 翻譯 · Claude 學習補充」。正式 API 已確認主翻譯 provider 為 `azure-translator`。
- 核心資源提升至 `v=16`，Service Worker 快取提升至 `thai-review-shell-v16`；影響檔案：`web/index.html`、`web/app.js`、`web/sw.js`、`PROJECT.md`。驗證：正式端點「您好」回傳 Azure provider 及泰文 `สวัสดีครับ`，JavaScript 語法及 Git diff 格式通過。

- 美化 Top Bar：桌面版把次要工具整理成一致工具列並突出快速複習；手機版改為品牌、分類及功能兩個清晰入口，完整操作收納在兩欄功能選單，避免按鈕擠壓或消失。
- 手機版新增左側滑出分類面板，包含全部／待複習／收藏及完整主題列表，支援遮罩、關閉按鈕、選取主題後自動收起及背景捲動鎖定。
- 核心資源提升至 `v=15`，Service Worker 快取提升至 `thai-review-shell-v15`；影響檔案：`web/index.html`、`web/styles.css`、`web/app.js`、`web/sw.js`、`PROJECT.md`。驗證：390px 手機版分類面板、主題選取自動關閉、功能選單、背景捲動鎖定及水平溢出通過；1440px 桌面 Top Bar 無重疊，瀏覽器無 console error。

- 補充教師群組模型：採「一位老師可管理多個群組」的 one-to-many 關係，以 `teacher_profiles`、`learning_groups`、`group_memberships` 及 `group_plans` 分離身份、群組、成員和課程發布；學生進度仍歸學生本人，老師預設只看彙總資料。另記錄可選的嚴格單群組約束及邀請／審核流程。驗證：`git diff --check` 通過，未新增 migration。

- 補充擴大資料庫及學生系統架構規格：以內容版本、不可變 `review_events`、可重算的個人進度快取及冪等同步確保快速複習可追溯；定義 Supabase RLS 的學生隔離、學習範圍／計劃快照、每日節奏及 placement test；將難度拆為字形、發音、頻率、句法和任務五個維度，並以跨題型掌握門檻控制由淺入深與跳級。驗證：對照現有 `user_learning_states` migration、365 天課程比例、現有本地狀態及資料庫相容設計，確認規格與目前功能及遷移順序一致；尚未新增資料庫 migration 或前端功能。

- 即時翻譯主供應商由 CloudVein Claude 切換至 Azure Translator（East Asia）；Azure 結果作為唯一翻譯內容，Claude 只補充泰文讀音、詞性、語氣及學習提示，補充服務失敗時仍會回傳基本翻譯。
- Azure API key、region 及 endpoint 已透過 Wrangler CLI 加密保存於 Cloudflare Pages production secrets，沒有寫入前端、`.env` 或 Git；Worker 對 Azure 暫時性錯誤保留三次重試及清晰錯誤訊息。
- 影響檔案：`web/_worker.js`、`.dev.vars.example`、`PROJECT.md`；驗證：Worker JavaScript 語法、Git diff 格式、正式環境泰中雙向 API 及 provider 欄位。

- 整理使用者提供的 2026 年 4–7 月課堂筆記，只匯入現有詞庫缺少且可可靠確認泰文的詞語與例句；新增獨立分類及來源標記，避免把重複內容、拼音草稿及純文法說明當成詞條。
- 核心資源提升至 `v=14`，Service Worker 快取提升至 `thai-review-shell-v14`；影響檔案：`output/markdown/thai_google_doc_organized_notes.md`、`web/data.js`、`web/index.html`、`web/sw.js`、`PROJECT.md`。
- 驗證：重新生成網站資料，檢查新來源數量、必填欄位、重複 ID、JavaScript 語法及 Git diff 格式。

- 新增「即時翻譯」入口，支援自動判斷及手動選擇泰文／繁體中文方向；結果可編輯、播放泰文並收藏為「即時翻譯收藏」個人詞條。
- 新增 Cloudflare Pages Advanced Mode Worker `/api/translate`，以 `claude-haiku-4-5` 呼叫 CloudVein 的 Anthropic 相容 Messages API；限制每次 500 字元，使用固定 JSON 結果及結構化錯誤回應，API key 僅從 `ANTHROPIC_API_KEY` secret 讀取。
- 翻譯收藏沿用現有 `customEntries` 及 `favorites`，未登入保存在本機，登入後透過既有 Supabase 學習狀態同步；相同泰文及中文詞條不重複新增。
- CloudVein 偶爾回傳 Markdown 或非標準 JSON；Worker 會先擷取並驗證 JSON，必要時以同一模型最多修復兩次，再回傳給前端，避免用家需要手動重試。所有修復結果仍必須通過欄位驗證。
- CloudVein 偶爾會間歇性回傳 403、429 或 5xx；Worker 對這些暫時性狀態最多自動重試兩次，使用短暫遞增延遲，三次均失敗才向用家顯示「服務暫時繁忙」。
- 核心資源提升至 `v=13`，Service Worker 快取提升至 `thai-review-shell-v13`。
- 影響檔案：`web/_worker.js`、`.dev.vars.example`、`.gitignore`、`web/index.html`、`web/app.js`、`web/styles.css`、`web/sw.js`、`PROJECT.md`。
- 驗證：`node --check` 及 `git diff --check` 通過；Cloudflare Secret 已確認為 encrypted；production 首頁、`v=13` 資源及 `thai-review-shell-v13` 已確認。正式端點實測 `สวัสดี` 翻成「你好」、讀音 `sa-wàt-dee`，以及「沒關係」翻成 `ไม่เป็นไร`、讀音 `mai pen rai`，兩個方向均回傳 HTTP 200。針對「今天沒有下雨」連續測試三次均回傳 HTTP 200，其中一次成功觸發非標準 JSON 自動修復。
- 再現 CloudVein 間歇性 403 及格式修復失敗後，production 重新實測「今天沒有下雨」成功回傳 `วันนี้ไม่มีฝนตก`、讀音 `wan-nee mai mee fon tok` 及完整學習欄位；暫時性 403 現在顯示為服務繁忙，不再誤報永久權限問題。

### 2026-08-12

- 修正「登入同步」無反應及部分瀏覽器顯示 0 筆資料：Supabase Browser SDK 改為隨專案部署，不再依賴外部 CDN；SDK 不可用時顯示明確錯誤。
- Service Worker 從 cache-first 改為 network-first、離線時才使用快取，避免新版 HTML 與舊版 JavaScript／資料檔混用；修正版資源使用全新 `v=12` URL，快取提升至 `thai-review-shell-v12`，繞過裝置上已存在的錯誤 SDK 快取。

- 將 Email Magic Link 登入改為完整的電郵＋密碼會員流程：支援登入、首次註冊、忘記／設定密碼、從 recovery 回呼設定新密碼，以及登出；Supabase session 會自動保留。
- 既有 Magic Link 建立的帳戶可使用「忘記／設定密碼」建立第一個密碼；首次註冊只需驗證一次電郵，日後不再每次寄出登入郵件。
- Supabase 密碼最低長度提升至 8 個字元；介面加入中文錯誤提示。核心資源更新至 `v=10`，Service Worker 快取提升至 `thai-review-shell-v10`。

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
