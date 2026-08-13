const STORAGE_KEY = "thai-review-state-v1";
const PAGE_SIZE = 25;
const PRACTICE_SIZE = 5;
const THAI_CONSONANTS = new Set(
  "กขฃคฅฆงจฉชซฌญฎฏฐฑฒณดตถทธนบปผฝพฟภมยรลวศษสหฬอฮ".split("")
);

const elements = {
  search: document.querySelector("#search-input"),
  categoryFilter: document.querySelector("#category-filter"),
  initialFilter: document.querySelector("#initial-filter"),
  romanFilter: document.querySelector("#roman-filter"),
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
};

let installPrompt = null;
let currentUser = null;
let syncTimer = null;
let authMode = "login";
let translationDirection = "auto";
const supabaseSettings = window.THAI_EASY_SUPABASE;
const supabaseClient =
  typeof window.supabase?.createClient === "function"
    ? window.supabase.createClient(supabaseSettings?.url, supabaseSettings?.publishableKey)
    : null;

const persisted = loadState();
const state = {
  entries: [...window.THAI_REVIEW_DATA.entries, ...persisted.customEntries],
  categories: [...window.THAI_REVIEW_DATA.categories],
  query: "",
  category: "",
  initial: "",
  roman: "",
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
    return {
      favorites: stored.favorites || [],
      reviews: stored.reviews || {},
      customEntries: stored.customEntries || [],
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
  state.customEntries = nextState.customEntries || [];
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

function romanInitial(pronunciation) {
  const value = normalize(pronunciation).replace(/[^a-z]/g, "");
  const clusters = ["kh", "ph", "th", "ch", "bp", "dt", "ng"];
  return clusters.find((cluster) => value.startsWith(cluster)) || value[0] || "?";
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

  const initials = uniqueSorted(state.entries.map((entry) => initialConsonant(entry.thai)));
  elements.initialFilter.innerHTML = "";
  initials.forEach((initial) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `initial-button${state.initial === initial ? " is-active" : ""}`;
    button.dataset.initial = initial;
    button.textContent = initial;
    button.title = `顯示起首子音 ${initial}`;
    elements.initialFilter.append(button);
  });

  const romanInitials = uniqueSorted(state.entries.map((entry) => romanInitial(entry.pronunciation)));
  elements.romanFilter.innerHTML = "";
  romanInitials.forEach((initial) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `roman-button${state.roman === initial ? " is-active" : ""}`;
    button.dataset.roman = initial;
    button.textContent = initial;
    elements.romanFilter.append(button);
  });

  elements.categoryOptions.innerHTML = uniqueSorted(state.entries.map((entry) => entry.category))
    .map((category) => `<option value="${category}"></option>`)
    .join("");
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
    if (state.roman && romanInitial(entry.pronunciation) !== state.roman) return false;
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
  if (state.roman) filters.push(`讀音：${state.roman}`);
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
  state.roman = "";
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
  const entry = {
    id: `custom-${Date.now()}`,
    meaning: formData.get("meaning").trim(),
    thai: formData.get("thai").trim(),
    pronunciation: formData.get("pronunciation").trim(),
    category: formData.get("category").trim(),
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
  elements.translationSubmit.disabled = true;
  setTranslationStatus("正在翻譯...");
  try {
    const response = await fetch("/api/translate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text, direction: detectTranslationDirection(text) }) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "翻譯失敗");
    const result = payload.result || {};
    elements.translationThai.value = result.thai || "";
    elements.translationChinese.value = result.traditionalChinese || "";
    elements.translationPronunciation.value = result.pronunciation || "";
    elements.translationNotes.value = [result.partOfSpeech, result.tone, result.notes].filter(Boolean).join(" · ");
    elements.translationResult.hidden = false;
    elements.translationSpeak.dataset.thai = result.thai || "";
    setTranslationStatus("翻譯完成，請先確認內容");
  } catch (error) {
    setTranslationStatus(error.message || "翻譯失敗，請稍後再試", true);
  } finally {
    elements.translationSubmit.disabled = false;
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
  const entry = { id: `translated-${Date.now()}`, meaning, thai, pronunciation: elements.translationPronunciation.value.trim(), category: "即時翻譯收藏", source: "即時翻譯", originalText: elements.translationInput.value.trim(), translationDirection: detectTranslationDirection(elements.translationInput.value.trim()), createdAt: new Date().toISOString() };
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
  const button = event.target.closest("[data-initial]");
  if (!button) return;
  state.initial = state.initial === button.dataset.initial ? "" : button.dataset.initial;
  renderFilters();
  renderFirstPage();
});

elements.romanFilter.addEventListener("click", (event) => {
  const button = event.target.closest("[data-roman]");
  if (!button) return;
  state.roman = state.roman === button.dataset.roman ? "" : button.dataset.roman;
  renderFilters();
  renderFirstPage();
});

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

document.querySelector("#clear-initial").addEventListener("click", () => {
  state.initial = "";
  state.roman = "";
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
