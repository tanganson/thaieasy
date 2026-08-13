const STORAGE_KEY = "thai-review-state-v1";
const PAGE_SIZE = 25;
const PRACTICE_SIZE = 5;
const THAI_CONSONANTS = new Set(
  "กขฃคฅฆงจฉชซฌญฎฏฐฑฒณดตถทธนบปผฝพฟภมยรลวศษสหฬอฮ".split("")
);
const THAI_SOUND_INDEX = {
  consonant: [
    ["ก","กอ ไก่","gor gai"],["ข","ขอ ไข่","khor khai"],["ฃ","ฃอ ขวด","khor khuat"],["ค","คอ ควาย","khor khwai"],["ฅ","ฅอ คน","khor khon"],["ฆ","ฆอ ระฆัง","khor ra-khang"],["ง","งอ งู","ngor ngu"],["จ","จอ จาน","jor jaan"],["ฉ","ฉอ ฉิ่ง","chor ching"],["ช","ชอ ช้าง","chor chang"],["ซ","ซอ โซ่","sor so"],["ฌ","ฌอ เฌอ","chor choe"],["ญ","ญอ หญิง","yor ying"],["ฎ","ฎอ ชฎา","dor cha-da"],["ฏ","ฏอ ปฏัก","dtor pa-tak"],["ฐ","ฐอ ฐาน","thor thaan"],["ฑ","ฑอ มณโฑ","thor mon-tho"],["ฒ","ฒอ ผู้เฒ่า","thor phu-thao"],["ณ","ณอ เณร","nor nen"],["ด","ดอ เด็ก","dor dek"],["ต","ตอ เต่า","dtor dtao"],["ถ","ถอ ถุง","thor thung"],["ท","ทอ ทหาร","thor tha-han"],["ธ","ธอ ธง","thor thong"],["น","นอ หนู","nor nu"],["บ","บอ ใบไม้","bor bai-mai"],["ป","ปอ ปลา","bpor bpla"],["ผ","ผอ ผึ้ง","phor phueng"],["ฝ","ฝอ ฝา","for fa"],["พ","พอ พาน","phor phan"],["ฟ","ฟอ ฟัน","for fan"],["ภ","ภอ สำเภา","phor sam-phao"],["ม","มอ ม้า","mor maa"],["ย","ยอ ยักษ์","yor yak"],["ร","รอ เรือ","ror ruea"],["ล","ลอ ลิง","lor ling"],["ว","วอ แหวน","wor waen"],["ศ","ศอ ศาลา","sor sa-la"],["ษ","ษอ ฤๅษี","sor rue-si"],["ส","สอ เสือ","sor suea"],["ห","หอ หีบ","hor hip"],["ฬ","ฬอ จุฬา","lor ju-la"],["อ","ออ อ่าง","or ang"],["ฮ","ฮอ นกฮูก","hor nok-huk"]
  ].map(([symbol,name,roman]) => ({ symbol,name,roman,speech:name })),
  vowel: [
    ["-ะ","สระ อะ","sa-ra a","ะ"],["-า","สระ อา","sa-ra aa","า"],["-ิ","สระ อิ","sa-ra i","ิ"],["-ี","สระ อี","sa-ra ii","ี"],["-ึ","สระ อึ","sa-ra ue","ึ"],["-ื","สระ อือ","sa-ra uue","ื"],["-ุ","สระ อุ","sa-ra u","ุ"],["-ู","สระ อู","sa-ra uu","ู"],["เ-ะ","สระ เอะ","sa-ra e","เ"],["เ-","สระ เอ","sa-ra ee","เ"],["แ-ะ","สระ แอะ","sa-ra ae","แ"],["แ-","สระ แอ","sa-ra aae","แ"],["โ-ะ","สระ โอะ","sa-ra o","โ"],["โ-","สระ โอ","sa-ra oo","โ"],["เ-าะ","สระ เอาะ","sa-ra aw","เ"],["-อ","สระ ออ","sa-ra aaw","อ"],["เ-อะ","สระ เออะ","sa-ra oe","เ"],["เ-อ","สระ เออ","sa-ra ooe","เ"],["เ-ีย","สระ เอีย","sa-ra ia","เ"],["เ-ือ","สระ เอือ","sa-ra uea","เ"],["-ัว","สระ อัว","sa-ra ua","ัว"],["ไ-","สระ ไอ ไม้มลาย","sa-ra ai mai-ma-lai","ไ"],["ใ-","สระ ใอ ไม้ม้วน","sa-ra ai mai-muan","ใ"],["เ-า","สระ เอา","sa-ra ao","เ"]
  ].map(([symbol,name,roman,match]) => ({ symbol,name,roman,match,speech:name }))
};

const elements = {
  search: document.querySelector("#search-input"),
  categoryFilter: document.querySelector("#category-filter"),
  initialFilter: document.querySelector("#initial-filter"),
  soundTypeTabs: document.querySelector("#sound-type-tabs"),
  soundDetail: document.querySelector("#sound-detail"),
  soundDetailThai: document.querySelector("#sound-detail-thai"),
  soundDetailName: document.querySelector("#sound-detail-name"),
  soundDetailRoman: document.querySelector("#sound-detail-roman"),
  soundDetailAudio: document.querySelector("#sound-detail-audio"),
  viewFilter: document.querySelector("#view-filter"),
  resultList: document.querySelector("#result-list"),
  resultCount: document.querySelector("#result-count"),
  resultCaption: document.querySelector("#result-caption"),
  pagination: document.querySelector("#pagination"),
  paginationPages: document.querySelector("#pagination-pages"),
  pageSummary: document.querySelector("#page-summary"),
  previousPage: document.querySelector("#previous-page"),
  nextPage: document.querySelector("#next-page"),
  emptyState: document.querySelector("#empty-state"),
  activeFilters: document.querySelector("#active-filters"),
  template: document.querySelector("#entry-template"),
  totalStat: document.querySelector("#total-stat"),
  reviewStat: document.querySelector("#review-stat"),
  favoriteStat: document.querySelector("#favorite-stat"),
  sort: document.querySelector("#sort-select"),
  entryDialog: document.querySelector("#entry-dialog"),
  entryForm: document.querySelector("#entry-form"),
  categoryOptions: document.querySelector("#category-options"),
  reviewDialog: document.querySelector("#review-dialog"),
  reviewPosition: document.querySelector("#review-position"),
  reviewProgress: document.querySelector("#review-progress-bar"),
  reviewCategory: document.querySelector("#review-category"),
  reviewMeaning: document.querySelector("#review-meaning"),
  reviewAnswer: document.querySelector("#review-answer"),
  reviewThai: document.querySelector("#review-thai"),
  reviewPronunciation: document.querySelector("#review-pronunciation"),
  reviewAudio: document.querySelector("#review-audio"),
  revealAnswer: document.querySelector("#reveal-answer"),
  reviewRatings: document.querySelector("#review-ratings"),
  installButton: document.querySelector("#install-button"),
  speechRate: document.querySelector("#speech-rate"),
  practiceDialog: document.querySelector("#practice-dialog"),
  practicePosition: document.querySelector("#practice-position"),
  practiceProgress: document.querySelector("#practice-progress-bar"),
  practiceScore: document.querySelector("#practice-score"),
  practiceType: document.querySelector("#practice-type"),
  practiceSkill: document.querySelector("#practice-skill"),
  practiceInstruction: document.querySelector("#practice-instruction"),
  practicePrompt: document.querySelector("#practice-prompt"),
  practiceAudio: document.querySelector("#practice-audio"),
  practiceOptions: document.querySelector("#practice-options"),
  practiceInputForm: document.querySelector("#practice-input-form"),
  practiceInput: document.querySelector("#practice-input"),
  practiceFeedback: document.querySelector("#practice-feedback"),
  practiceFeedbackTitle: document.querySelector("#practice-feedback-title"),
  practiceFeedbackAnswer: document.querySelector("#practice-feedback-answer"),
  practiceNext: document.querySelector("#practice-next"),
  accountButton: document.querySelector("#account-button"),
  accountLabel: document.querySelector("#account-label"),
  authDialog: document.querySelector("#auth-dialog"),
  authForm: document.querySelector("#auth-form"),
  authEmail: document.querySelector("#auth-email"),
  authPassword: document.querySelector("#auth-password"),
  authPasswordConfirm: document.querySelector("#auth-password-confirm"),
  authTitle: document.querySelector("#auth-title"),
  authCopy: document.querySelector("#auth-copy"),
  passwordField: document.querySelector("#password-field"),
  confirmPasswordField: document.querySelector("#confirm-password-field"),
  authLinks: document.querySelector("#auth-links"),
  authStatus: document.querySelector("#auth-status"),
  authSubmitButton: document.querySelector("#auth-submit-button"),
  switchAuthMode: document.querySelector("#switch-auth-mode"),
  forgotPasswordButton: document.querySelector("#forgot-password-button"),
  signOutButton: document.querySelector("#sign-out-button"),
  translateButton: document.querySelector("#translate-button"),
  translationDialog: document.querySelector("#translation-dialog"),
  translationForm: document.querySelector("#translation-form"),
  translationInput: document.querySelector("#translation-input"),
  translationCount: document.querySelector("#translation-count"),
  translationStatus: document.querySelector("#translation-status"),
  translationSubmit: document.querySelector("#translation-submit"),
  translationResult: document.querySelector("#translation-result"),
  translationThai: document.querySelector("#translation-thai"),
  translationChinese: document.querySelector("#translation-chinese"),
  translationPronunciation: document.querySelector("#translation-pronunciation"),
  translationNotes: document.querySelector("#translation-notes"),
  translationSpeak: document.querySelector("#translation-speak"),
  translationSave: document.querySelector("#translation-save"),
  translationProvider: document.querySelector("#translation-provider"),
  mobileFilterButton: document.querySelector("#mobile-filter-button"),
  closeMobileFilters: document.querySelector("#close-mobile-filters"),
  filterBackdrop: document.querySelector("#filter-backdrop"),
  mobileMenuButton: document.querySelector("#mobile-menu-button"),
  topActions: document.querySelector("#top-actions"),
};

let installPrompt = null;
let currentUser = null;
let syncTimer = null;
let authMode = "login";
let translationDirection = "auto";
let translationRequestId = 0;
const supabaseSettings = window.THAI_EASY_SUPABASE;
const supabaseClient =
  typeof window.supabase?.createClient === "function"
    ? window.supabase.createClient(supabaseSettings?.url, supabaseSettings?.publishableKey)
    : null;

const HIDDEN_CATEGORIES = new Set(["2026 年 4–7 月課堂筆記", "即時翻譯收藏"]);
const FORBIDDEN_CATEGORY_PATTERNS = [/(?:19|20)\d{2}/, /\d{1,2}\s*[年/-]\s*\d{1,2}/, /(?:課堂|上課|匯入|新增|整理|來源|批次|即時翻譯).*(?:筆記|收藏|資料)?/, /(?:筆記|收藏|匯入批次|資料來源)$/];

function isValidCategory(category) {
  const value = String(category || "").trim();
  return Boolean(value) && value.length <= 24 && !FORBIDDEN_CATEGORY_PATTERNS.some((pattern) => pattern.test(value));
}

function inferEntryCategory(meaning, thai = "") {
  const value = `${meaning} ${thai}`;
  const rules = [
    ["日期", /今天|明天|昨天|今年|明年|去年|星期|生日|這個月|上個月|下個月/],
    ["飲食與點餐", /吃|飯|早餐|午餐|晚餐|夜宵|茶|奶|餐廳|點菜|盤子|雞|豬肉|牛肉|魚丸|粿條|麵/],
    ["時間與頻率", /分鐘|秒|多久|平時|假期|休息日|等一下|時間/],
    ["自我介紹與人物", /人|家人|家庭|女生|男生|老公|朋友|老師|愛情|我是|你是|他是/],
    ["地點與旅遊", /哪裡|這裡|附近|山|停車|外面|回家|到家|城市|國家|旅遊/],
    ["拍照、影片與教學", /拍照|照片|影片|教|學|功課|畢業|下課/],
    ["感受與狀態", /開心|傷心|累|忙|有空|沒空|簡單|困難|喜歡|愛|飽|快|慢/],
    ["疑問詞與常用句型", /甚麼|什麼|怎麼|可以|還有|這個|為甚麼|嗎|誰/],
  ];
  return rules.find(([, pattern]) => pattern.test(value))?.[0] || "日常動作與工作";
}

function migrateEntryCategories(entries) {
  return entries.map((entry) => HIDDEN_CATEGORIES.has(entry.category) || !isValidCategory(entry.category)
    ? { ...entry, category: inferEntryCategory(entry.meaning, entry.thai) }
    : entry);
}

const persisted = loadState();
persisted.customEntries = migrateEntryCategories(persisted.customEntries);
const state = {
  entries: [...window.THAI_REVIEW_DATA.entries, ...persisted.customEntries],
  categories: [...window.THAI_REVIEW_DATA.categories],
  query: "",
  category: "",
  initial: "",
  soundType: "consonant",
  vowel: "",
  view: "all",
  sort: "recent",
  page: 1,
  favorites: new Set(persisted.favorites),
  reviews: persisted.reviews,
  customEntries: persisted.customEntries,
  reviewQueue: [],
  reviewIndex: 0,
  practiceRecords: persisted.practiceRecords,
  practiceQueue: [],
  practiceIndex: 0,
  practiceCorrect: 0,
  practiceAnswered: false,
};

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    const customEntries = migrateEntryCategories(stored.customEntries || []);
    if (customEntries.some((entry, index) => entry.category !== stored.customEntries?.[index]?.category)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...stored, customEntries }));
    }
    return {
      favorites: stored.favorites || [],
      reviews: stored.reviews || {},
      customEntries,
      practiceRecords: stored.practiceRecords || [],
    };
  } catch {
    return { favorites: [], reviews: {}, customEntries: [], practiceRecords: [] };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(serializedState()));
  scheduleCloudSync();
}

function serializedState() {
  return {
    favorites: [...state.favorites],
    reviews: state.reviews,
    customEntries: state.customEntries,
    practiceRecords: state.practiceRecords,
  };
}

function applyPersistedState(nextState) {
  state.favorites = new Set(nextState.favorites || []);
  state.reviews = nextState.reviews || {};
  state.customEntries = migrateEntryCategories(nextState.customEntries || []);
  state.practiceRecords = nextState.practiceRecords || [];
  state.entries = [...window.THAI_REVIEW_DATA.entries, ...state.customEntries];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(serializedState()));
  renderFilters();
  renderResults();
}

function setSyncStatus(message) {
  elements.authStatus.textContent = message;
}

function renderAccountState() {
  const signedIn = Boolean(currentUser);
  elements.accountButton.classList.toggle("is-synced", signedIn);
  elements.accountLabel.textContent = signedIn ? "已同步" : "登入同步";
  elements.authEmail.hidden = signedIn;
  elements.passwordField.hidden = signedIn;
  elements.confirmPasswordField.hidden = signedIn || authMode === "login";
  elements.authLinks.hidden = signedIn || authMode === "recovery";
  elements.authSubmitButton.hidden = signedIn;
  elements.signOutButton.hidden = !signedIn;
  if (signedIn) setSyncStatus(`已登入 ${currentUser.email}`);
}

function setAuthMode(mode) {
  authMode = mode;
  const profiles = {
    login: {
      title: "登入同步進度",
      copy: "使用電郵和密碼登入。登入狀態會保留，不需要每次收取驗證郵件。",
      submit: "登入",
    },
    signup: {
      title: "建立同步帳戶",
      copy: "首次註冊需要驗證一次電郵；完成後便可直接使用密碼登入。",
      submit: "註冊",
    },
    recovery: {
      title: "設定新密碼",
      copy: "輸入至少 8 個字元的新密碼，完成後會保持登入。",
      submit: "儲存新密碼",
    },
  };
  const profile = profiles[mode];
  elements.authTitle.textContent = profile.title;
  elements.authCopy.textContent = profile.copy;
  elements.authSubmitButton.textContent = profile.submit;
  elements.passwordField.hidden = false;
  elements.authSubmitButton.hidden = false;
  elements.confirmPasswordField.hidden = mode === "login";
  elements.authEmail.hidden = mode === "recovery";
  elements.authLinks.hidden = mode === "recovery";
  elements.authPassword.autocomplete = mode === "login" ? "current-password" : "new-password";
  elements.switchAuthMode.textContent = mode === "signup" ? "已有帳戶？登入" : "首次註冊";
  elements.authPassword.value = "";
  elements.authPasswordConfirm.value = "";
  setSyncStatus("");
}

function authErrorMessage(error) {
  const message = error?.message || "發生未知錯誤";
  if (/invalid login credentials/i.test(message)) return "電郵或密碼不正確";
  if (/email not confirmed/i.test(message)) return "請先完成電郵驗證";
  if (/user already registered/i.test(message)) return "此電郵已註冊，請直接登入或設定密碼";
  if (/rate limit/i.test(message)) return "郵件發送次數已達上限，請稍後再試";
  if (/password/i.test(message) && /least/i.test(message)) return "密碼至少需要 8 個字元";
  return message;
}

async function syncToCloud() {
  if (!supabaseClient || !currentUser || !navigator.onLine) return;
  setSyncStatus("正在同步...");
  const { error } = await supabaseClient.from("user_learning_states").upsert({
    user_id: currentUser.id,
    state: serializedState(),
    updated_at: new Date().toISOString(),
  });
  setSyncStatus(error ? "同步失敗，本機資料仍已保存" : "進度已同步");
}

function scheduleCloudSync() {
  if (!currentUser) return;
  window.clearTimeout(syncTimer);
  syncTimer = window.setTimeout(syncToCloud, 500);
}

async function loadCloudState() {
  if (!supabaseClient || !currentUser) return;
  setSyncStatus("正在讀取雲端進度...");
  const { data, error } = await supabaseClient
    .from("user_learning_states")
    .select("state")
    .eq("user_id", currentUser.id)
    .maybeSingle();
  if (error) {
    setSyncStatus("無法讀取雲端進度，本機資料不受影響");
    return;
  }
  if (data?.state) {
    applyPersistedState(data.state);
    setSyncStatus("已載入雲端進度");
  } else {
    await syncToCloud();
  }
}

async function initializeAuth() {
  if (!supabaseClient) return;
  const recoveryCallback = window.location.hash.includes("type=recovery");
  const { data } = await supabaseClient.auth.getSession();
  currentUser = data.session?.user || null;
  renderAccountState();
  if (currentUser) await loadCloudState();
  if (recoveryCallback) {
    setAuthMode("recovery");
    elements.authDialog.showModal();
  }
  supabaseClient.auth.onAuthStateChange((event, session) => {
    const nextUser = session?.user || null;
    const changed = nextUser?.id !== currentUser?.id;
    currentUser = nextUser;
    renderAccountState();
    if (event === "PASSWORD_RECOVERY") {
      setAuthMode("recovery");
      elements.authDialog.showModal();
    }
    if (changed && currentUser) window.setTimeout(loadCloudState, 0);
  });
}

function shuffled(values) {
  return [...values].sort(() => Math.random() - 0.5);
}

function normalize(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s\-–—_/／、，。？！?!.]/g, "");
}

function speakThai(text) {
  if (!("speechSynthesis" in window)) {
    window.alert("此瀏覽器不支援語音播放。");
    return;
  }
  const voices = window.speechSynthesis.getVoices();
  const thaiVoice = voices.find((voice) => voice.lang.toLowerCase().startsWith("th"));
  if (!thaiVoice && voices.length && !voices.some((voice) => voice.lang.toLowerCase().startsWith("th"))) {
    window.alert("此裝置沒有可用的泰文語音，請先在系統語音設定中加入泰文。\n\n目前仍可查看讀音拼音。\n\n");
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "th-TH";
  utterance.rate = Number(elements.speechRate.value);
  if (thaiVoice) utterance.voice = thaiVoice;
  window.speechSynthesis.speak(utterance);
}

function initialConsonant(thai) {
  const consonants = [...thai].filter((character) => THAI_CONSONANTS.has(character));
  const [first, second] = consonants;
  const hoNamFollowers = new Set("งญนมยรลว".split(""));
  if (first === "ห" && hoNamFollowers.has(second)) return second;
  if (first === "อ" && second === "ย") return second;
  if (first) return first;
  return "·";
}

function reviewInfo(entry) {
  const record = state.reviews[entry.id];
  if (!record) return { due: true, label: "尚未複習" };
  const due = new Date(record.dueAt) <= new Date();
  if (due) return { due: true, label: "今天複習" };
  const date = new Date(record.dueAt);
  return {
    due: false,
    label: `${date.getMonth() + 1}/${date.getDate()} 再複習`,
  };
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b, "th"));
}

function renderFilters() {
  const categoryCounts = state.entries.reduce((map, entry) => {
    map[entry.category] = (map[entry.category] || 0) + 1;
    return map;
  }, {});

  elements.categoryFilter.innerHTML = "";
  uniqueSorted(state.entries.map((entry) => entry.category)).forEach((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `category-button${state.category === category ? " is-active" : ""}`;
    button.dataset.category = category;
    button.innerHTML = `<span>${category}</span><span>${categoryCounts[category]}</span>`;
    elements.categoryFilter.append(button);
  });

  elements.initialFilter.innerHTML = "";
  THAI_SOUND_INDEX[state.soundType].forEach((sound) => {
    const button = document.createElement("button");
    button.type = "button";
    const active = state.soundType === "consonant" ? state.initial === sound.symbol : state.vowel === sound.symbol;
    button.className = `initial-button${active ? " is-active" : ""}`;
    button.dataset.sound = sound.symbol;
    button.textContent = sound.symbol;
    button.title = `${sound.name} · ${sound.roman}`;
    elements.initialFilter.append(button);
  });

  elements.categoryOptions.innerHTML = uniqueSorted(state.entries.map((entry) => entry.category))
    .map((category) => `<option value="${category}"></option>`)
    .join("");
}

function setMobileFilters(open) {
  document.body.classList.toggle("filters-open", open);
  elements.mobileFilterButton.setAttribute("aria-expanded", String(open));
}

function setMobileMenu(open) {
  elements.topActions.classList.toggle("is-open", open);
  elements.mobileMenuButton.setAttribute("aria-expanded", String(open));
}

function getFilteredEntries() {
  const query = normalize(state.query);
  let entries = state.entries.filter((entry) => {
    if (query) {
      const searchable = normalize(
        `${entry.meaning} ${entry.thai} ${entry.pronunciation} ${entry.category}`
      );
      if (!searchable.includes(query)) return false;
    }
    if (state.category && entry.category !== state.category) return false;
    if (state.initial && initialConsonant(entry.thai) !== state.initial) return false;
    if (state.vowel) {
      const sound = THAI_SOUND_INDEX.vowel.find((item) => item.symbol === state.vowel);
      if (sound && !entry.thai.includes(sound.match)) return false;
    }
    if (state.view === "favorite" && !state.favorites.has(entry.id)) return false;
    if (state.view === "due" && !reviewInfo(entry).due) return false;
    return true;
  });

  entries = entries.sort((a, b) => {
    if (state.sort === "thai") return a.thai.localeCompare(b.thai, "th");
    if (state.sort === "meaning") return a.meaning.localeCompare(b.meaning, "zh-Hant");
    const aTime = state.reviews[a.id]?.reviewedAt || 0;
    const bTime = state.reviews[b.id]?.reviewedAt || 0;
    return bTime - aTime || state.entries.indexOf(a) - state.entries.indexOf(b);
  });

  return entries;
}

function renderResults() {
  const entries = getFilteredEntries();
  const pageCount = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  state.page = Math.min(state.page, pageCount);
  const pageStart = (state.page - 1) * PAGE_SIZE;
  const visibleEntries = entries.slice(pageStart, pageStart + PAGE_SIZE);
  elements.resultList.innerHTML = "";
  elements.resultCount.textContent = entries.length;
  elements.resultCaption.textContent = resultCaption();
  elements.emptyState.hidden = entries.length > 0;

  visibleEntries.forEach((entry) => {
    const fragment = elements.template.content.cloneNode(true);
    const row = fragment.querySelector(".entry-row");
    const favoriteButton = fragment.querySelector(".favorite-button");
    const info = reviewInfo(entry);

    row.dataset.entryId = entry.id;
    fragment.querySelector("h3").textContent = entry.thai;
    fragment.querySelector(".initial-badge").textContent = initialConsonant(entry.thai);
    fragment.querySelector(".entry-pronunciation").textContent = entry.pronunciation;
    fragment.querySelector(".entry-meaning strong").textContent = entry.meaning;
    fragment.querySelector(".category-tag").textContent = entry.category;
    fragment.querySelector(".review-state").textContent = info.label;
    favoriteButton.classList.toggle("is-active", state.favorites.has(entry.id));
    favoriteButton.setAttribute("aria-pressed", state.favorites.has(entry.id));
    favoriteButton.title = state.favorites.has(entry.id) ? "取消收藏" : "收藏";
    const audioButton = fragment.querySelector(".audio-button");
    audioButton.dataset.thai = entry.thai;
    audioButton.dataset.pronunciation = entry.pronunciation;
    elements.resultList.append(fragment);
  });

  renderPagination(entries.length, pageCount, pageStart);
  renderActiveFilters();
  updateStats();
  window.lucide?.createIcons();
}

function paginationItems(pageCount, currentPage) {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, index) => index + 1);

  const pages = new Set([1, pageCount, currentPage - 1, currentPage, currentPage + 1]);
  const ordered = [...pages].filter((page) => page >= 1 && page <= pageCount).sort((a, b) => a - b);
  const items = [];
  ordered.forEach((page, index) => {
    if (index && page - ordered[index - 1] > 1) items.push("ellipsis");
    items.push(page);
  });
  return items;
}

function renderPagination(totalEntries, pageCount, pageStart) {
  elements.pagination.hidden = totalEntries <= PAGE_SIZE;
  elements.previousPage.disabled = state.page === 1;
  elements.nextPage.disabled = state.page === pageCount;
  elements.pageSummary.textContent = totalEntries
    ? `${pageStart + 1}–${Math.min(pageStart + PAGE_SIZE, totalEntries)} / ${totalEntries}`
    : "0 / 0";
  elements.paginationPages.innerHTML = paginationItems(pageCount, state.page)
    .map((item) => {
      if (item === "ellipsis") return '<span class="pagination-ellipsis" aria-hidden="true">…</span>';
      const current = item === state.page ? ' class="is-active" aria-current="page"' : "";
      return `<button type="button" data-page="${item}" aria-label="第 ${item} 頁"${current}>${item}</button>`;
    })
    .join("");
}

function changePage(page) {
  const pageCount = Math.max(1, Math.ceil(getFilteredEntries().length / PAGE_SIZE));
  const nextPage = Math.min(Math.max(page, 1), pageCount);
  if (nextPage === state.page) return;
  state.page = nextPage;
  renderResults();
  document.querySelector(".result-section").scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderFirstPage() {
  state.page = 1;
  renderResults();
}

function resultCaption() {
  if (state.view === "favorite") return "收藏內容";
  if (state.view === "due") return "今天待複習";
  if (state.query) return `搜尋「${state.query}」`;
  return "全部筆記";
}

function renderActiveFilters() {
  const filters = [];
  if (state.category) filters.push(`主題：${state.category}`);
  if (state.initial) filters.push(`聲母：${state.initial}`);
  if (state.vowel) filters.push(`韻母：${state.vowel}`);
  elements.activeFilters.innerHTML = filters
    .map((filter) => `<span class="filter-chip">${filter}</span>`)
    .join("");
}

function updateStats() {
  elements.totalStat.textContent = state.entries.length;
  elements.reviewStat.textContent = state.entries.filter((entry) => reviewInfo(entry).due).length;
  elements.favoriteStat.textContent = state.favorites.size;
}

function resetFilters() {
  state.query = "";
  state.category = "";
  state.initial = "";
  state.vowel = "";
  state.view = "all";
  state.page = 1;
  elements.search.value = "";
  document.querySelectorAll("#view-filter button").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === "all");
  });
  renderFilters();
  renderResults();
}

function toggleFavorite(entryId) {
  if (state.favorites.has(entryId)) state.favorites.delete(entryId);
  else state.favorites.add(entryId);
  saveState();
  renderResults();
}

function openReview() {
  const due = state.entries.filter((entry) => reviewInfo(entry).due);
  state.reviewQueue = (due.length ? due : state.entries)
    .sort(() => Math.random() - 0.5)
    .slice(0, 10);
  state.reviewIndex = 0;
  renderReviewCard();
  elements.reviewDialog.showModal();
}

function renderReviewCard() {
  const entry = state.reviewQueue[state.reviewIndex];
  if (!entry) {
    elements.reviewDialog.close();
    renderResults();
    return;
  }
  elements.reviewPosition.textContent = `${state.reviewIndex + 1} / ${state.reviewQueue.length}`;
  elements.reviewProgress.style.width = `${((state.reviewIndex + 1) / state.reviewQueue.length) * 100}%`;
  elements.reviewCategory.textContent = entry.category;
  elements.reviewMeaning.textContent = entry.meaning;
  elements.reviewThai.textContent = entry.thai;
  elements.reviewPronunciation.textContent = entry.pronunciation;
  elements.reviewAudio.dataset.thai = entry.thai;
  elements.reviewAnswer.hidden = true;
  elements.revealAnswer.hidden = false;
  elements.reviewRatings.hidden = true;
}

function rateReview(rating) {
  const entry = state.reviewQueue[state.reviewIndex];
  const days = { again: 0, hard: 1, good: 3 }[rating];
  const dueAt = new Date();
  if (rating === "again") dueAt.setMinutes(dueAt.getMinutes() + 10);
  else dueAt.setDate(dueAt.getDate() + days);
  state.reviews[entry.id] = {
    rating,
    reviewedAt: Date.now(),
    dueAt: dueAt.toISOString(),
  };
  saveState();
  state.reviewIndex += 1;
  renderReviewCard();
}

const PRACTICE_TYPES = {
  thai_to_meaning: { label: "泰文選中文", skill: "閱讀辨認", instruction: "選出正確的中文意思" },
  meaning_to_thai: { label: "中文選泰文", skill: "主動回想", instruction: "選出正確的泰文" },
  listening_choice: { label: "聽音選字", skill: "聽力辨認", instruction: "播放題目發音，再選出你聽到的泰文" },
  meaning_to_thai_input: { label: "輸入泰文", skill: "拼寫回想", instruction: "根據中文輸入泰文" },
};

function practiceHistory(entryId) {
  return state.practiceRecords.filter((record) => record.entryId === entryId);
}

function choosePracticeType(entry, index) {
  return index < 3 ? "thai_to_meaning" : "meaning_to_thai";
}

function buildPracticeQuestion(entry, index) {
  const type = choosePracticeType(entry, index);
  if (type === "meaning_to_thai_input") return { entry, type, options: [] };
  const answerKey = type === "thai_to_meaning" ? "meaning" : "thai";
  const distractors = shuffled(
    state.entries.filter(
      (candidate) =>
        candidate.id !== entry.id &&
        candidate[answerKey] !== entry[answerKey] &&
        (candidate.category === entry.category || initialConsonant(candidate.thai) === initialConsonant(entry.thai))
    )
  );
  const fallback = shuffled(
    state.entries.filter(
      (candidate) => candidate.id !== entry.id && candidate[answerKey] !== entry[answerKey]
    )
  );
  const options = [];
  [...distractors, ...fallback].forEach((candidate) => {
    if (options.length < 2 && !options.some((option) => option[answerKey] === candidate[answerKey])) {
      options.push(candidate);
    }
  });
  return { entry, type, options: shuffled([entry, ...options]) };
}

function openPractice() {
  const due = state.entries.filter((entry) => reviewInfo(entry).due);
  const seenIds = new Set(state.practiceRecords.slice(-80).map((record) => record.entryId));
  const longUnseen = state.entries.filter((entry) => !seenIds.has(entry.id));
  const pool = [...due, ...longUnseen, ...state.entries];
  const unique = [];
  const used = new Set();
  shuffled(pool).forEach((entry) => {
    if (!used.has(entry.id) && unique.length < PRACTICE_SIZE) {
      unique.push(entry);
      used.add(entry.id);
    }
  });
  state.practiceQueue = unique.map(buildPracticeQuestion);
  state.practiceIndex = 0;
  state.practiceCorrect = 0;
  renderPracticeQuestion();
  elements.practiceDialog.showModal();
}

function renderPracticeQuestion() {
  const question = state.practiceQueue[state.practiceIndex];
  if (!question) {
    elements.practiceDialog.close();
    renderResults();
    return;
  }
  const profile = PRACTICE_TYPES[question.type];
  const isThaiPrompt = question.type === "thai_to_meaning";
  const isListening = question.type === "listening_choice";
  const isInput = question.type === "meaning_to_thai_input";
  state.practiceAnswered = false;
  elements.practicePosition.textContent = `${state.practiceIndex + 1} / ${state.practiceQueue.length}`;
  elements.practiceProgress.style.width = `${((state.practiceIndex + 1) / state.practiceQueue.length) * 100}%`;
  elements.practiceScore.textContent = `${state.practiceCorrect} 答對`;
  elements.practiceType.textContent = profile.label;
  elements.practiceSkill.textContent = profile.skill;
  elements.practiceInstruction.textContent = profile.instruction;
  elements.practicePrompt.textContent = isListening ? "" : isThaiPrompt ? question.entry.thai : question.entry.meaning;
  elements.practicePrompt.hidden = isListening;
  elements.practicePrompt.lang = isThaiPrompt ? "th" : "zh-Hant";
  elements.practiceAudio.hidden = !isListening;
  elements.practiceAudio.dataset.thai = question.entry.thai;
  elements.practiceOptions.hidden = isInput;
  elements.practiceInputForm.hidden = !isInput;
  elements.practiceFeedback.hidden = true;
  elements.practiceInput.value = "";
  const answerKey = question.type === "thai_to_meaning" ? "meaning" : "thai";
  elements.practiceOptions.innerHTML = question.options
    .map(
      (option, optionIndex) =>
        `<button type="button" data-entry-id="${option.id}"><span>${optionIndex + 1}</span><strong lang="${answerKey === "thai" ? "th" : "zh-Hant"}">${option[answerKey]}</strong></button>`
    )
    .join("");
  window.lucide?.createIcons();
  if (isListening) setTimeout(() => speakThai(question.entry.thai), 180);
  if (isInput) setTimeout(() => elements.practiceInput.focus(), 100);
}

function submitPracticeAnswer(answer) {
  if (state.practiceAnswered) return;
  const question = state.practiceQueue[state.practiceIndex];
  const isInput = question.type === "meaning_to_thai_input";
  const correct = isInput
    ? normalize(answer) === normalize(question.entry.thai)
    : answer === question.entry.id;
  state.practiceAnswered = true;
  if (correct) state.practiceCorrect += 1;
  if (!correct && !question.isRetry) {
    const retryAt = Math.min(state.practiceIndex + 3, state.practiceQueue.length);
    state.practiceQueue.splice(retryAt, 0, {
      ...buildPracticeQuestion(question.entry, 0),
      isRetry: true,
    });
  }
  state.practiceRecords.push({
    id: `practice-${Date.now()}-${state.practiceIndex}`,
    entryId: question.entry.id,
    exerciseType: question.type,
    targetSkill: PRACTICE_TYPES[question.type].skill,
    correct,
    answeredAt: new Date().toISOString(),
  });
  if (state.practiceRecords.length > 5000) state.practiceRecords.splice(0, state.practiceRecords.length - 5000);
  saveState();
  elements.practiceScore.textContent = `${state.practiceCorrect} 答對`;
  elements.practiceFeedback.hidden = false;
  elements.practiceFeedback.classList.toggle("is-correct", correct);
  elements.practiceFeedback.classList.toggle("is-wrong", !correct);
  elements.practiceFeedbackTitle.textContent = correct ? "答對了" : "再留意這個答案";
  elements.practiceFeedbackAnswer.textContent = `${question.entry.thai} · ${question.entry.pronunciation} · ${question.entry.meaning}`;
  elements.practiceOptions.querySelectorAll("button").forEach((button) => {
    button.disabled = true;
    button.classList.toggle("is-correct", button.dataset.entryId === question.entry.id);
    if (!correct && button.dataset.entryId === answer) button.classList.add("is-wrong");
  });
  elements.practiceNext.textContent = state.practiceIndex + 1 === state.practiceQueue.length ? "完成練習" : "下一題";
}

function nextPracticeQuestion() {
  state.practiceIndex += 1;
  renderPracticeQuestion();
}

function addEntry(formData) {
  const requestedCategory = formData.get("category").trim();
  const categoryInput = elements.entryForm.elements.category;
  if (!isValidCategory(requestedCategory)) {
    categoryInput.setCustomValidity("分類必須描述內容主題，不能使用年份、日期範圍、課堂筆記、匯入批次或收藏來源名稱。");
    categoryInput.reportValidity();
    return;
  }
  categoryInput.setCustomValidity("");
  const entry = {
    id: `custom-${Date.now()}`,
    meaning: formData.get("meaning").trim(),
    thai: formData.get("thai").trim(),
    pronunciation: formData.get("pronunciation").trim(),
    category: requestedCategory,
    source: "個人新增",
  };
  state.customEntries.push(entry);
  state.entries.push(entry);
  if (!state.categories.includes(entry.category)) state.categories.push(entry.category);
  saveState();
  elements.entryForm.reset();
  elements.entryDialog.close();
  renderFilters();
  renderResults();
}

function detectTranslationDirection(text) {
  if (translationDirection !== "auto") return translationDirection;
  return /[\u0E00-\u0E7F]/.test(text) ? "th-zh" : "zh-th";
}

function setTranslationStatus(message, isError = false) {
  elements.translationStatus.textContent = message;
  elements.translationStatus.classList.toggle("is-error", isError);
}

function openTranslation() {
  elements.translationForm.reset();
  elements.translationResult.hidden = true;
  elements.translationSave.disabled = false;
  setTranslationStatus("");
  elements.translationCount.textContent = "0 / 500";
  document.querySelectorAll("[data-direction]").forEach((button) => button.classList.toggle("is-active", button.dataset.direction === translationDirection));
  elements.translationDialog.showModal();
  elements.translationInput.focus();
}

async function translateText() {
  const text = elements.translationInput.value.trim();
  if (!text) return setTranslationStatus("請先輸入泰文或中文", true);
  const requestId = ++translationRequestId;
  elements.translationSubmit.disabled = true;
  setTranslationStatus("正在翻譯...");
  try {
    const response = await fetch("/api/translate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text, direction: detectTranslationDirection(text) }) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "翻譯失敗");
    const result = payload.result || {};
    const providerLabel = payload.provider === "azure-translator" ? "Azure 翻譯" : "翻譯服務";
    elements.translationProvider.textContent = providerLabel;
    elements.translationThai.value = result.thai || "";
    elements.translationChinese.value = result.traditionalChinese || "";
    elements.translationPronunciation.value = "";
    elements.translationNotes.value = "正在補充讀音與學習提示...";
    elements.translationResult.hidden = false;
    elements.translationSpeak.dataset.thai = result.thai || "";
    setTranslationStatus("Azure 翻譯完成，正在補充學習資料...");
    enrichTranslation(result, requestId).catch(() => {});
  } catch (error) {
    setTranslationStatus(error.message || "翻譯失敗，請稍後再試", true);
  } finally {
    elements.translationSubmit.disabled = false;
  }
}

async function enrichTranslation(result, requestId) {
  try {
    const response = await fetch("/api/translate/enrich", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ thai: result.thai, traditionalChinese: result.traditionalChinese }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "學習補充載入失敗");
    if (requestId !== translationRequestId) return;
    const details = payload.details || {};
    elements.translationPronunciation.value = details.pronunciation || "";
    elements.translationNotes.value = [details.partOfSpeech, details.tone, details.notes].filter(Boolean).join(" · ");
    elements.translationProvider.textContent = payload.enrichmentModel ? "Azure 翻譯 · Claude 學習補充" : "Azure 翻譯";
    setTranslationStatus(payload.enrichmentModel ? "翻譯及學習資料已完成" : "翻譯完成；暫時未能取得學習補充");
  } catch {
    if (requestId !== translationRequestId) return;
    elements.translationNotes.value = "";
    elements.translationProvider.textContent = "Azure 翻譯";
    setTranslationStatus("Azure 翻譯完成；暫時未能取得學習補充");
  }
}

function saveTranslationEntry() {
  const thai = elements.translationThai.value.trim();
  const meaning = elements.translationChinese.value.trim();
  if (!thai || !meaning) return setTranslationStatus("泰文和中文都需要填寫", true);
  const duplicate = state.entries.find((entry) => entry.thai === thai && entry.meaning === meaning);
  if (duplicate) {
    state.favorites.add(duplicate.id);
    saveState();
    setTranslationStatus("已存在相同詞條，已替你收藏");
    renderResults();
    return;
  }
  const entry = { id: `translated-${Date.now()}`, meaning, thai, pronunciation: elements.translationPronunciation.value.trim(), category: inferEntryCategory(meaning, thai), source: "即時翻譯", originalText: elements.translationInput.value.trim(), translationDirection: detectTranslationDirection(elements.translationInput.value.trim()), createdAt: new Date().toISOString() };
  state.customEntries.push(entry);
  state.entries.push(entry);
  state.favorites.add(entry.id);
  saveState();
  renderFilters();
  renderResults();
  setTranslationStatus("已收藏到你的詞條");
  elements.translationSave.disabled = true;
}

elements.search.addEventListener("input", (event) => {
  state.query = event.target.value;
  renderFirstPage();
});

elements.categoryFilter.addEventListener("click", (event) => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  state.category = state.category === button.dataset.category ? "" : button.dataset.category;
  renderFilters();
  renderFirstPage();
});

elements.initialFilter.addEventListener("click", (event) => {
  const button = event.target.closest("[data-sound]");
  if (!button) return;
  const sound = THAI_SOUND_INDEX[state.soundType].find((item) => item.symbol === button.dataset.sound);
  if (state.soundType === "consonant") state.initial = state.initial === sound.symbol ? "" : sound.symbol;
  else state.vowel = state.vowel === sound.symbol ? "" : sound.symbol;
  elements.soundDetail.hidden = false;
  elements.soundDetailThai.textContent = sound.symbol;
  elements.soundDetailName.textContent = sound.name;
  elements.soundDetailRoman.textContent = sound.roman;
  elements.soundDetailAudio.dataset.speech = sound.speech;
  renderFilters();
  renderFirstPage();
});
elements.soundTypeTabs.addEventListener("click", (event) => {
  const button = event.target.closest("[data-sound-type]");
  if (!button) return;
  state.soundType = button.dataset.soundType;
  state.initial = "";
  state.vowel = "";
  elements.soundDetail.hidden = true;
  elements.soundTypeTabs.querySelectorAll("button").forEach((item) => item.classList.toggle("is-active", item === button));
  renderFilters();
  renderFirstPage();
});
elements.soundDetailAudio.addEventListener("click", () => speakThai(elements.soundDetailAudio.dataset.speech));

elements.viewFilter.addEventListener("click", (event) => {
  const button = event.target.closest("[data-view]");
  if (!button) return;
  state.view = button.dataset.view;
  elements.viewFilter.querySelectorAll("button").forEach((item) => {
    item.classList.toggle("is-active", item === button);
  });
  renderFirstPage();
});

elements.resultList.addEventListener("click", (event) => {
  const audioButton = event.target.closest(".audio-button");
  if (audioButton) {
    event.stopPropagation();
    speakThai(audioButton.dataset.thai);
    return;
  }
  const button = event.target.closest(".favorite-button");
  if (!button) return;
  const row = button.closest(".entry-row");
  toggleFavorite(row.dataset.entryId);
});

elements.sort.addEventListener("change", (event) => {
  state.sort = event.target.value;
  renderFirstPage();
});

elements.pagination.addEventListener("click", (event) => {
  const pageButton = event.target.closest("[data-page]");
  if (pageButton) changePage(Number(pageButton.dataset.page));
});

elements.previousPage.addEventListener("click", () => changePage(state.page - 1));
elements.nextPage.addEventListener("click", () => changePage(state.page + 1));

document.querySelector("#clear-category").addEventListener("click", () => {
  state.category = "";
  renderFilters();
  renderFirstPage();
});

elements.mobileFilterButton.addEventListener("click", () => {
  setMobileMenu(false);
  setMobileFilters(!document.body.classList.contains("filters-open"));
});
elements.closeMobileFilters.addEventListener("click", () => setMobileFilters(false));
elements.filterBackdrop.addEventListener("click", () => {
  setMobileFilters(false);
  setMobileMenu(false);
});
elements.mobileMenuButton.addEventListener("click", () => {
  setMobileFilters(false);
  setMobileMenu(!elements.topActions.classList.contains("is-open"));
});
elements.topActions.addEventListener("click", (event) => {
  if (event.target.closest("button")) setMobileMenu(false);
});
document.addEventListener("click", (event) => {
  if (!elements.topActions.classList.contains("is-open")) return;
  if (elements.topActions.contains(event.target) || elements.mobileMenuButton.contains(event.target)) return;
  setMobileMenu(false);
});
elements.categoryFilter.addEventListener("click", () => {
  if (window.matchMedia("(max-width: 760px)").matches) setMobileFilters(false);
});

document.querySelector("#clear-initial").addEventListener("click", () => {
  state.initial = "";
  state.vowel = "";
  elements.soundDetail.hidden = true;
  renderFilters();
  renderFirstPage();
});

document.querySelector("#reset-filters").addEventListener("click", resetFilters);
document.querySelector(".brand").addEventListener("click", (event) => {
  event.preventDefault();
  resetFilters();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

document.querySelector("#add-entry-button").addEventListener("click", () => {
  elements.entryDialog.showModal();
});

elements.entryForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addEntry(new FormData(elements.entryForm));
});
elements.entryForm.elements.category.addEventListener("input", (event) => event.target.setCustomValidity(""));

function closeEntryDialog() {
  elements.entryForm.reset();
  elements.entryDialog.close();
}

document.querySelector("#close-entry-dialog").addEventListener("click", closeEntryDialog);
document.querySelector("#cancel-entry-dialog").addEventListener("click", closeEntryDialog);

document.querySelector("#start-review-button").addEventListener("click", openReview);
document.querySelector("#close-review").addEventListener("click", () => elements.reviewDialog.close());
document.querySelector("#start-practice-button").addEventListener("click", openPractice);
document.querySelector("#close-practice").addEventListener("click", () => elements.practiceDialog.close());
elements.revealAnswer.addEventListener("click", () => {
  elements.reviewAnswer.hidden = false;
  elements.revealAnswer.hidden = true;
  elements.reviewRatings.hidden = false;
});

elements.reviewAudio.addEventListener("click", () => speakThai(elements.reviewAudio.dataset.thai));

elements.reviewRatings.addEventListener("click", (event) => {
  const button = event.target.closest("[data-rating]");
  if (button) rateReview(button.dataset.rating);
});

elements.practiceAudio.addEventListener("click", () => speakThai(elements.practiceAudio.dataset.thai));
elements.practiceOptions.addEventListener("click", (event) => {
  const button = event.target.closest("[data-entry-id]");
  if (button) submitPracticeAnswer(button.dataset.entryId);
});
elements.practiceInputForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (elements.practiceInput.value.trim()) submitPracticeAnswer(elements.practiceInput.value.trim());
});
elements.practiceNext.addEventListener("click", nextPracticeQuestion);

document.addEventListener("keydown", (event) => {
  if (event.key === "/" && document.activeElement !== elements.search) {
    event.preventDefault();
    elements.search.focus();
  }
  if (event.key === "Escape" && elements.search.value) {
    state.query = "";
    elements.search.value = "";
    renderFirstPage();
  }
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;
  elements.installButton.hidden = false;
  window.lucide?.createIcons();
});

elements.installButton.addEventListener("click", async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  elements.installButton.hidden = true;
});

elements.translateButton.addEventListener("click", openTranslation);
document.querySelector("#close-translation-dialog").addEventListener("click", () => elements.translationDialog.close());
document.querySelectorAll("[data-direction]").forEach((button) => button.addEventListener("click", () => {
  translationDirection = button.dataset.direction;
  document.querySelectorAll("[data-direction]").forEach((item) => item.classList.toggle("is-active", item === button));
}));
elements.translationInput.addEventListener("input", () => { elements.translationCount.textContent = `${elements.translationInput.value.length} / 500`; });
elements.translationForm.addEventListener("submit", (event) => { event.preventDefault(); translateText(); });
elements.translationSpeak.addEventListener("click", () => speakThai(elements.translationThai.value.trim()));
elements.translationSave.addEventListener("click", saveTranslationEntry);

elements.accountButton.addEventListener("click", () => {
  if (!currentUser) setAuthMode("login");
  renderAccountState();
  if (!supabaseClient) setSyncStatus("同步服務載入失敗，請重新整理頁面");
  elements.authDialog.showModal();
});

document.querySelector("#close-auth-dialog").addEventListener("click", () => {
  elements.authDialog.close();
});

elements.authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!supabaseClient) {
    setSyncStatus("同步服務尚未設定");
    return;
  }
  const password = elements.authPassword.value;
  const confirmation = elements.authPasswordConfirm.value;
  if (password.length < 8) {
    setSyncStatus("密碼至少需要 8 個字元");
    return;
  }
  if (authMode !== "login" && password !== confirmation) {
    setSyncStatus("兩次輸入的密碼不一致");
    return;
  }
  elements.authSubmitButton.disabled = true;
  setSyncStatus(authMode === "login" ? "正在登入..." : "正在處理...");
  let result;
  if (authMode === "signup") {
    result = await supabaseClient.auth.signUp({
      email: elements.authEmail.value.trim(),
      password,
      options: { emailRedirectTo: `${window.location.origin}${window.location.pathname}` },
    });
  } else if (authMode === "recovery") {
    result = await supabaseClient.auth.updateUser({ password });
  } else {
    result = await supabaseClient.auth.signInWithPassword({
      email: elements.authEmail.value.trim(),
      password,
    });
  }
  elements.authSubmitButton.disabled = false;
  if (result.error) {
    setSyncStatus(authErrorMessage(result.error));
    return;
  }
  if (authMode === "signup" && !result.data.session) {
    setSyncStatus("驗證郵件已寄出；完成一次驗證後即可使用密碼登入");
  } else if (authMode === "recovery") {
    setSyncStatus("新密碼已儲存，帳戶已登入");
  } else {
    setSyncStatus("登入成功，正在同步進度...");
  }
});

elements.switchAuthMode.addEventListener("click", () => {
  setAuthMode(authMode === "signup" ? "login" : "signup");
});

elements.forgotPasswordButton.addEventListener("click", async () => {
  if (!supabaseClient || !elements.authEmail.value.trim()) {
    setSyncStatus("請先輸入電郵地址");
    return;
  }
  elements.forgotPasswordButton.disabled = true;
  setSyncStatus("正在寄出密碼設定郵件...");
  const { error } = await supabaseClient.auth.resetPasswordForEmail(
    elements.authEmail.value.trim(),
    { redirectTo: `${window.location.origin}${window.location.pathname}` }
  );
  elements.forgotPasswordButton.disabled = false;
  setSyncStatus(error ? authErrorMessage(error) : "密碼設定郵件已寄出，請查看電郵");
});

elements.signOutButton.addEventListener("click", async () => {
  if (!supabaseClient) return;
  await supabaseClient.auth.signOut();
  currentUser = null;
  renderAccountState();
  setSyncStatus("已登出；本機資料仍會保留");
});

window.addEventListener("online", scheduleCloudSync);

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

renderFilters();
renderResults();
window.lucide?.createIcons();
initializeAuth();
