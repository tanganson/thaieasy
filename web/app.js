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
  authStatus: document.querySelector("#auth-status"),
  sendLinkButton: document.querySelector("#send-link-button"),
  signOutButton: document.querySelector("#sign-out-button"),
};

let installPrompt = null;
let currentUser = null;
let syncTimer = null;
const supabaseSettings = window.THAI_EASY_SUPABASE;
const supabaseClient = window.supabase?.createClient(
  supabaseSettings?.url,
  supabaseSettings?.publishableKey
);

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
  elements.sendLinkButton.hidden = signedIn;
  elements.signOutButton.hidden = !signedIn;
  if (signedIn) setSyncStatus(`已登入 ${currentUser.email}`);
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
  const { data } = await supabaseClient.auth.getSession();
  currentUser = data.session?.user || null;
  renderAccountState();
  if (currentUser) await loadCloudState();
  supabaseClient.auth.onAuthStateChange((_event, session) => {
    const nextUser = session?.user || null;
    const changed = nextUser?.id !== currentUser?.id;
    currentUser = nextUser;
    renderAccountState();
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

elements.accountButton.addEventListener("click", () => {
  renderAccountState();
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
  elements.sendLinkButton.disabled = true;
  setSyncStatus("正在寄出登入連結...");
  const { error } = await supabaseClient.auth.signInWithOtp({
    email: elements.authEmail.value.trim(),
    options: { emailRedirectTo: `${window.location.origin}${window.location.pathname}` },
  });
  elements.sendLinkButton.disabled = false;
  setSyncStatus(error ? `無法寄出：${error.message}` : "登入連結已寄出，請查看電郵");
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
