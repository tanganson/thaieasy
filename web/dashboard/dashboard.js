const config = window.THAI_EASY_SUPABASE;
const client = config && window.supabase?.createClient(config.url, config.publishableKey);
const roleLabels = { student: "學生", teacher: "老師", content_editor: "內容編輯", support_admin: "支援管理員", admin: "管理員", super_admin: "最高管理員" };
const resultLabels = { again: "忘記", hard: "困難", good: "熟悉", correct: "答對", incorrect: "答錯" };
const state = { role: null, profile: null, student: null, teacher: null, selectedGroupId: null };
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[char]));
const formatDate = (value, withTime = false) => value ? new Intl.DateTimeFormat("zh-HK", withTime ? { dateStyle:"short", timeStyle:"short" } : { dateStyle:"medium" }).format(new Date(value)) : "未開始";
const relativeActivity = (value) => {
  if (!value) return "從未活動";
  const days = Math.max(0, Math.floor((Date.now() - new Date(value)) / 86400000));
  if (days === 0) return "今天";
  if (days === 1) return "昨天";
  return `${days} 天前`;
};

function icons() { window.lucide?.createIcons(); }
function notify(message, error = false) {
  const notice = $("#notice");
  notice.textContent = message;
  notice.classList.toggle("is-error", error);
  notice.hidden = false;
  window.clearTimeout(notify.timer);
  notify.timer = window.setTimeout(() => { notice.hidden = true; }, 5000);
}

async function api(path, options = {}) {
  const { data } = await client.auth.getSession();
  if (!data.session) throw new Error("請先登入會員帳戶");
  const response = await fetch(path, {
    ...options,
    headers: { "content-type":"application/json", authorization:`Bearer ${data.session.access_token}`, ...(options.headers || {}) },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "服務暫時無法處理請求");
  return payload;
}

function showLogin(message = "") {
  $("#dashboard-app").hidden = true;
  $("#auth-screen").hidden = false;
  $("#login-status").textContent = message;
}

function navItems(role) {
  if (role === "student") return [
    ["overview", "layout-dashboard", "總覽"], ["weak", "circle-alert", "薄弱詞句"], ["notes", "notebook-pen", "個人筆記"],
  ];
  if (role === "teacher") return [
    ["overview", "layout-dashboard", "總覽"], ["students", "users", "學生表現"], ["groups", "school", "群組管理"],
  ];
  return [];
}

function setupShell(profile) {
  state.profile = profile;
  state.role = profile.role;
  $("#auth-screen").hidden = true;
  $("#dashboard-app").hidden = false;
  $("#user-name").textContent = profile.display_name || "泰簡單會員";
  $("#user-role").textContent = roleLabels[profile.role] || profile.role;
  $("#user-avatar").textContent = (profile.display_name || roleLabels[profile.role] || "學").slice(0, 1);
  $("#sidebar-role").textContent = profile.role === "teacher" ? "老師中心" : profile.role === "student" ? "學生中心" : "個人中心";
  $("#dashboard-nav").innerHTML = navItems(profile.role).map(([view, icon, label], index) => `<button class="nav-button${index === 0 ? " is-active" : ""}" data-view="${view}"><i data-lucide="${icon}"></i><span>${label}</span></button>`).join("");
  icons();
}

function emptyMessage(message) { return `<p class="empty-state">${escapeHtml(message)}</p>`; }

function renderActivityChart(activity) {
  const max = Math.max(1, ...activity.map((day) => day.count));
  const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
  $("#activity-chart").innerHTML = activity.map((day) => {
    const height = day.count ? Math.max(8, Math.round((day.count / max) * 100)) : 3;
    return `<div class="chart-day" title="${escapeHtml(day.date)}：${day.count} 次"><div class="chart-bar" style="height:${height}%"></div><span>${weekdays[new Date(`${day.date}T12:00:00Z`).getUTCDay()]}</span></div>`;
  }).join("");
  $("#week-total").textContent = `${activity.reduce((sum, day) => sum + day.count, 0)} 次`;
}

function weakWordMarkup(item) {
  const entry = item.entry || {};
  return `<article class="weak-item"><div><strong class="thai" lang="th">${escapeHtml(entry.thai || "—")}</strong><strong>${escapeHtml(entry.meaning || "未命名詞句")}</strong><small>${escapeHtml(entry.pronunciation || entry.category || "")}</small></div><span class="weak-score">薄弱 ${Number(item.weakness_score || 0).toFixed(0)}</span></article>`;
}

function topicMarkup(topics) {
  if (!topics.length) return emptyMessage("尚未累積薄弱主題。");
  const max = Math.max(...topics.map((item) => item.weakness), 1);
  return topics.map((item) => `<div class="topic-row"><span>${escapeHtml(item.category)}</span><i class="topic-track"><i style="width:${Math.max(5, item.weakness / max * 100)}%"></i></i><strong>${item.count}</strong></div>`).join("");
}

function renderStudent(data) {
  state.student = data;
  $("#loading-state").hidden = true;
  $("#student-dashboard").hidden = false;
  $("#teacher-dashboard").hidden = true;
  $("#role-message").hidden = true;
  $("#header-eyebrow").textContent = "My learning";
  $("#header-title").textContent = `你好，${data.profile.display_name || "同學"}`;
  $("#header-copy").textContent = data.summary.dueCount ? `今天有 ${data.summary.dueCount} 個詞句等待複習。` : "今天的複習已經清空，可以新增筆記或開始練習。";
  $("#student-library").textContent = data.summary.librarySize;
  $("#student-due").textContent = data.summary.dueCount;
  $("#student-accuracy").textContent = data.summary.accuracy === null ? "—" : `${data.summary.accuracy}%`;
  $("#student-streak").textContent = data.summary.streakDays;
  const recommendationIcons = { review:"clock-3", weak:"circle-alert", start:"play", note:"notebook-pen" };
  $("#recommendation-list").innerHTML = data.recommendations.length ? data.recommendations.map((item) => `<article class="recommendation-item"><span><i data-lucide="${recommendationIcons[item.type] || "arrow-right"}"></i></span><div><strong>${escapeHtml(item.title)}</strong><small>${item.type === "weak" ? "優先處理反覆出錯內容" : "保持穩定學習節奏"}</small></div><a href="${escapeHtml(item.href)}">前往</a></article>`).join("") : emptyMessage("目前沒有急需處理的項目。");
  renderActivityChart(data.activity);
  $("#recent-activity").innerHTML = data.recentEvents.length ? data.recentEvents.map((event) => `<article class="activity-item"><span class="result-dot${["good","correct"].includes(event.result) ? " good" : ""}"></span><div><strong>${escapeHtml(event.entry?.thai || event.entry?.meaning || "學習活動")}</strong><small>${escapeHtml(resultLabels[event.result] || event.result)} · ${escapeHtml(event.target_skill || "快速複習")}</small></div><time>${formatDate(event.answered_at, true)}</time></article>`).join("") : emptyMessage("完成快速複習後，活動會顯示在這裡。");
  $("#weak-count").textContent = `${data.summary.weakCount} 個`;
  $("#weak-list").innerHTML = data.summary.weakWords.length ? data.summary.weakWords.map(weakWordMarkup).join("") : emptyMessage("目前沒有明顯薄弱詞句。");
  $("#topic-list").innerHTML = topicMarkup(data.summary.weakTopics);
  $("#note-list").innerHTML = data.notes.length ? data.notes.map((note) => `<article class="note-item"><p class="thai" lang="th">${escapeHtml(note.thai)}</p><h3>${escapeHtml(note.meaning)}</h3><p>${escapeHtml(note.pronunciation || "尚未填寫讀音")}</p><footer><span>${escapeHtml(note.category)}</span><time>${formatDate(note.created_at)}</time></footer></article>`).join("") : emptyMessage("還沒有個人筆記。加入今天新學到的第一個詞句吧。");
  icons();
}

function groupNames(student) {
  return student.groupIds.map((id) => state.teacher.groups.find((group) => group.id === id)?.name).filter(Boolean).join("、");
}

function renderAttention() {
  const students = state.teacher.students.slice(0, 6);
  $("#attention-list").innerHTML = students.length ? students.map((student, index) => `<article class="attention-item"><span>${index + 1}</span><div><strong>${escapeHtml(student.displayName)}</strong><small>${student.dueCount} 個待複習 · ${student.weakCount} 個薄弱 · ${relativeActivity(student.lastActivityAt)}</small></div><button data-student-detail="${student.id}">查看</button></article>`).join("") : emptyMessage("群組尚未有學生。先在群組管理加入學生。");
}

function renderStudentTable() {
  const query = $("#student-search").value.trim().toLocaleLowerCase();
  const students = state.teacher.students.filter((student) => !query || `${student.displayName} ${groupNames(student)}`.toLocaleLowerCase().includes(query));
  $("#student-table-body").innerHTML = students.map((student) => `<tr><td><span class="student-cell"><strong>${escapeHtml(student.displayName)}</strong><small>${escapeHtml(groupNames(student) || "未分組")}</small></span></td><td>${student.librarySize}</td><td>${student.accuracy === null ? "—" : `${student.accuracy}%`}</td><td class="status-value${student.dueCount ? " bad" : ""}">${student.dueCount}</td><td class="status-value${student.weakCount ? " bad" : ""}">${student.weakCount}</td><td>${relativeActivity(student.lastActivityAt)}</td><td><button class="row-action" data-student-detail="${student.id}" title="查看詳情" aria-label="查看學生詳情"><i data-lucide="panel-right"></i></button></td></tr>`).join("");
  $("#student-table-empty").hidden = students.length > 0;
  icons();
}

function renderGroups() {
  const groups = state.teacher.groups;
  if (!state.selectedGroupId && groups.length) state.selectedGroupId = groups[0].id;
  $("#teacher-group-list").innerHTML = groups.length ? groups.map((group) => `<button class="group-button${group.id === state.selectedGroupId ? " is-active" : ""}" data-group-id="${group.id}"><span><strong>${escapeHtml(group.name)}</strong><small>${group.status === "active" ? "使用中" : "已封存"}</small></span><b>${group.studentCount}</b></button>`).join("") : emptyMessage("你目前未獲分配學習群組。");
  const group = groups.find((item) => item.id === state.selectedGroupId);
  if (!group) { $("#teacher-group-detail").innerHTML = emptyMessage("選擇群組查看學生。"); return; }
  const students = state.teacher.students.filter((student) => student.groupIds.includes(group.id));
  $("#teacher-group-detail").innerHTML = `<header><div><h3>${escapeHtml(group.name)}</h3><p>${students.length} 位學生 · 建立於 ${formatDate(group.created_at)}</p></div><span class="invite-code">${escapeHtml(group.invite_code)}</span></header><div class="member-list">${students.length ? students.map((student) => `<div class="member-row"><div><strong>${escapeHtml(student.displayName)}</strong><small>${student.librarySize} 個詞句 · ${relativeActivity(student.lastActivityAt)}</small></div><button data-remove-student="${student.id}" data-group-id="${group.id}">移除</button></div>`).join("") : emptyMessage("這個群組尚未有學生。")}</div>`;
  $("#add-student-group").innerHTML = groups.filter((item) => item.status === "active").map((item) => `<option value="${item.id}"${item.id === group.id ? " selected" : ""}>${escapeHtml(item.name)}</option>`).join("");
}

function renderTeacher(data) {
  state.teacher = data;
  $("#loading-state").hidden = true;
  $("#teacher-dashboard").hidden = false;
  $("#student-dashboard").hidden = true;
  $("#role-message").hidden = true;
  $("#header-eyebrow").textContent = "Teaching overview";
  $("#header-title").textContent = `你好，${data.profile.display_name || "老師"}`;
  $("#header-copy").textContent = data.summary.attentionCount ? `目前有 ${data.summary.attentionCount} 位學生值得優先跟進。` : "目前沒有需要特別跟進的學生。";
  $("#teacher-groups").textContent = data.summary.groupCount;
  $("#teacher-students").textContent = data.summary.studentCount;
  $("#teacher-due").textContent = data.summary.dueCount;
  $("#teacher-attention").textContent = data.summary.attentionCount;
  renderAttention();
  $("#group-summary-list").innerHTML = data.groups.length ? data.groups.map((group) => `<article class="group-summary-item"><div><strong>${escapeHtml(group.name)}</strong><small>${group.status === "active" ? "使用中" : "已封存"} · 邀請碼 ${escapeHtml(group.invite_code)}</small></div><span>${group.studentCount} 人</span></article>`).join("") : emptyMessage("你目前未獲分配群組。");
  renderStudentTable();
  renderGroups();
  icons();
}

function renderRoleMessage() {
  $("#loading-state").hidden = true;
  $("#student-dashboard").hidden = true;
  $("#teacher-dashboard").hidden = true;
  $("#role-message").hidden = false;
  $("#header-title").textContent = "會員帳戶";
  $("#header-copy").textContent = "目前角色請使用相應的管理工具。";
  icons();
}

async function loadDashboard() {
  $("#loading-state").hidden = false;
  try {
    const me = await api("/api/dashboard/me");
    setupShell(me.profile);
    if (me.profile.role === "student") renderStudent(await api("/api/dashboard/student"));
    else if (me.profile.role === "teacher") renderTeacher(await api("/api/dashboard/teacher"));
    else renderRoleMessage();
  } catch (error) {
    $("#loading-state").hidden = true;
    notify(error.message, true);
  }
}

function switchView(view) {
  $$(".nav-button").forEach((button) => button.classList.toggle("is-active", button.dataset.view === view));
  const scope = state.role === "teacher" ? $("#teacher-dashboard") : $("#student-dashboard");
  scope.querySelectorAll(".dashboard-view").forEach((panel) => panel.classList.toggle("is-active", panel.dataset.panel === view));
  const titles = state.role === "teacher" ? { overview:["Teaching overview","教學總覽"], students:["Students","學生表現"], groups:["Groups","群組管理"] } : { overview:["My learning","學習總覽"], weak:["Focus","薄弱詞句"], notes:["My vocabulary","個人筆記"] };
  const title = titles[view];
  if (title) { $("#header-eyebrow").textContent = title[0]; $("#header-title").textContent = title[1]; }
  window.scrollTo({ top:0, behavior:"smooth" });
}

function openStudentDetail(studentId) {
  const student = state.teacher.students.find((item) => item.id === studentId);
  if (!student) return;
  $("#detail-student-name").textContent = student.displayName;
  $("#detail-metrics").innerHTML = [
    [student.librarySize,"學習詞句"], [student.reviewedWords,"已複習詞句"], [student.accuracy === null ? "—" : `${student.accuracy}%`,"答對率"], [student.dueCount,"待複習"], [student.weakCount,"薄弱詞句"], [student.streakDays,"連續天數"],
  ].map(([value,label]) => `<div><strong>${value}</strong><small>${label}</small></div>`).join("");
  $("#detail-weak-list").innerHTML = student.weakWords.length ? student.weakWords.slice(0, 6).map(weakWordMarkup).join("") : emptyMessage("沒有明顯薄弱詞句。");
  $("#detail-topic-list").innerHTML = topicMarkup(student.weakTopics);
  $("#student-dialog").showModal();
}

$("#login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!client) { $("#login-status").textContent = "會員服務尚未設定"; return; }
  const button = event.submitter;
  button.disabled = true;
  $("#login-status").textContent = "正在登入...";
  const { error } = await client.auth.signInWithPassword({ email:$("#login-email").value.trim(), password:$("#login-password").value });
  button.disabled = false;
  if (error) { $("#login-status").textContent = "電郵或密碼不正確"; return; }
  await loadDashboard();
});

async function signOut() { await client.auth.signOut(); showLogin("已登出會員帳戶"); }
$("#sign-out").addEventListener("click", signOut);
$("#header-sign-out").addEventListener("click", signOut);
$("#refresh-button").addEventListener("click", loadDashboard);
$("#dashboard-nav").addEventListener("click", (event) => { const button = event.target.closest("[data-view]"); if (button) switchView(button.dataset.view); });
$("#student-search").addEventListener("input", renderStudentTable);
$("#open-note-dialog").addEventListener("click", () => { $("#note-status").textContent = ""; $("#note-dialog").showModal(); });
$("#note-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = event.submitter;
  button.disabled = true;
  $("#note-status").textContent = "正在儲存...";
  try {
    await api("/api/dashboard/student/notes", { method:"POST", body:JSON.stringify({ thai:$("#note-thai").value, meaning:$("#note-meaning").value, pronunciation:$("#note-pronunciation").value, category:$("#note-category").value }) });
    $("#note-dialog").close();
    $("#note-form").reset();
    $("#note-category").value = "日常用語";
    notify("個人筆記已加入學習庫");
    await loadDashboard();
    switchView("notes");
  } catch (error) { $("#note-status").textContent = error.message; }
  finally { button.disabled = false; }
});
$("#open-add-student").addEventListener("click", () => {
  if (!state.teacher?.groups.some((group) => group.status === "active")) { notify("你目前沒有可管理的使用中群組", true); return; }
  $("#add-student-status").textContent = "";
  $("#add-student-dialog").showModal();
});
$("#add-student-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = event.submitter;
  button.disabled = true;
  $("#add-student-status").textContent = "正在加入...";
  try {
    const groupId = $("#add-student-group").value;
    await api(`/api/dashboard/teacher/groups/${groupId}/students`, { method:"POST", body:JSON.stringify({ email:$("#add-student-email").value, reason:$("#add-student-reason").value }) });
    $("#add-student-dialog").close();
    $("#add-student-form").reset();
    state.selectedGroupId = groupId;
    notify("學生已加入群組");
    await loadDashboard();
    switchView("groups");
  } catch (error) { $("#add-student-status").textContent = error.message; }
  finally { button.disabled = false; }
});
document.addEventListener("click", async (event) => {
  const close = event.target.closest("[data-close-dialog]");
  if (close) document.querySelector(`#${close.dataset.closeDialog}`).close();
  const detail = event.target.closest("[data-student-detail]");
  if (detail) openStudentDetail(detail.dataset.studentDetail);
  const group = event.target.closest("[data-group-id].group-button");
  if (group) { state.selectedGroupId = group.dataset.groupId; renderGroups(); }
  const remove = event.target.closest("[data-remove-student]");
  if (remove) {
    const student = state.teacher.students.find((item) => item.id === remove.dataset.removeStudent);
    const reason = window.prompt(`請填寫把「${student?.displayName || "學生"}」移出群組的原因（至少 3 個字元）：`);
    if (!reason) return;
    try {
      await api(`/api/dashboard/teacher/groups/${remove.dataset.groupId}/students/${remove.dataset.removeStudent}`, { method:"DELETE", body:JSON.stringify({ reason }) });
      notify("學生已從群組移除");
      await loadDashboard();
      switchView("groups");
    } catch (error) { notify(error.message, true); }
  }
});

async function initialize() {
  icons();
  if (!client) { showLogin("會員服務載入失敗"); return; }
  const { data } = await client.auth.getSession();
  if (!data.session) { showLogin(); return; }
  await loadDashboard();
}

initialize();
