const config = window.THAI_EASY_SUPABASE;
const client = config && window.supabase?.createClient(config.url, config.publishableKey);
const roles = ["student", "teacher", "content_editor", "support_admin", "admin", "super_admin"];
const roleLabels = { student:"學生", teacher:"老師", content_editor:"內容編輯", support_admin:"支援管理員", admin:"管理員", super_admin:"最高管理員" };
const actionLabels = { "user.invite":"建立帳號", "user.update":"更新帳號", "user.password_reset":"寄出密碼設定", "user.delete":"永久刪除帳號", "group.create":"建立群組", "group.member_add":"加入群組", "group.member_remove":"移除群組" };
const state = { actor:null, users:[], groups:[], memberships:[], audit:[], selectedGroupId:null };
state.entries = [];

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const formatDate = (value) => value ? new Intl.DateTimeFormat("zh-HK", { dateStyle:"medium", timeStyle:"short" }).format(new Date(value)) : "從未";
const userById = (id) => state.users.find((user) => user.id === id);
const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));

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
  const token = data.session?.access_token;
  if (!token) throw new Error("請先登入管理帳號");
  const response = await fetch(path, {
    ...options,
    headers: { "content-type":"application/json", authorization:`Bearer ${token}`, ...(options.headers || {}) },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "管理服務回應錯誤");
  return payload;
}

async function signInWithAccountId(accountId, password) {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "content-type":"application/json" },
    body: JSON.stringify({ accountId:accountId.trim().toLocaleLowerCase(), password }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "帳號 ID 或密碼不正確");
  const { error } = await client.auth.setSession(payload.session);
  if (error) throw error;
}

function setView(view) {
  const profiles = { overview:["Workspace","營運總覽"], accounts:["Membership","帳號管理"], groups:["Learning groups","學習群組"], content:["Content library","教材管理"], audit:["Governance","審計紀錄"] };
  $$(".nav-button").forEach((button) => button.classList.toggle("is-active", button.dataset.view === view));
  $$(".admin-view").forEach((panel) => panel.classList.toggle("is-active", panel.dataset.panel === view));
  $("#view-eyebrow").textContent = profiles[view][0];
  $("#view-title").textContent = profiles[view][1];
}

function roleOptions(includeAll = false) {
  return `${includeAll ? '<option value="">全部角色</option>' : ""}${roles.map((role) => `<option value="${role}">${roleLabels[role]}</option>`).join("")}`;
}

function renderOverview() {
  $("#metric-users").textContent = state.users.length;
  $("#metric-active").textContent = state.users.filter((user) => user.status === "active").length;
  $("#metric-teachers").textContent = state.users.filter((user) => user.role === "teacher" && user.status === "active").length;
  $("#metric-groups").textContent = state.groups.filter((group) => group.status === "active").length;
  const attention = state.users.filter((user) => user.status === "suspended" || !user.emailConfirmedAt).slice(0, 6);
  $("#attention-list").innerHTML = attention.length ? attention.map((user) => `<div class="attention-item"><span>${user.status === "suspended" ? "!" : "?"}</span><div><strong>${escapeHtml(user.display_name || user.email)}</strong><small>${user.status === "suspended" ? "帳號已停用" : "尚未確認電郵"}</small></div><button data-edit-user="${user.id}">處理</button></div>`).join("") : '<p class="table-empty">目前沒有需要處理的帳號。</p>';
  const max = Math.max(1, ...roles.map((role) => state.users.filter((user) => user.role === role).length));
  $("#role-breakdown").innerHTML = roles.map((role) => { const count = state.users.filter((user) => user.role === role).length; return `<div class="role-row"><span>${roleLabels[role]}</span><i><b style="width:${count / max * 100}%"></b></i><strong>${count}</strong></div>`; }).join("");
}

function filteredUsers() {
  const query = $("#account-search").value.trim().toLocaleLowerCase();
  const role = $("#role-filter").value;
  const status = $("#status-filter").value;
  return state.users.filter((user) => (!query || `${user.account_id} ${user.email} ${user.display_name}`.toLocaleLowerCase().includes(query)) && (!role || user.role === role) && (!status || user.status === status));
}

function renderAccounts() {
  const users = filteredUsers();
  $("#accounts-empty").hidden = users.length > 0;
  $("#accounts-body").innerHTML = users.map((user) => `<tr><td><span class="member-cell"><strong>${escapeHtml(user.display_name || "未設定名稱")}</strong><small>@${escapeHtml(user.account_id)} · ${escapeHtml(user.email)}</small></span></td><td><span class="role-pill">${roleLabels[user.role] || user.role}</span></td><td><span class="status-pill ${user.status}">${user.status === "active" ? "有效" : "已停用"}</span></td><td>${formatDate(user.lastSignInAt)}</td><td>${formatDate(user.createdAt)}</td><td><button class="row-action" data-edit-user="${user.id}" title="管理帳號" aria-label="管理 ${escapeHtml(user.account_id || user.email)}"><i data-lucide="more-horizontal"></i></button></td></tr>`).join("");
  icons();
}

function renderGroups() {
  $("#group-list").innerHTML = state.groups.length ? state.groups.map((group) => { const count = state.memberships.filter((item) => item.group_id === group.id && item.status === "active").length; const owner = userById(group.owner_teacher_id); return `<button class="group-item ${state.selectedGroupId === group.id ? "is-active" : ""}" data-group-id="${group.id}"><div><strong>${escapeHtml(group.name)}</strong><small>${escapeHtml(owner?.display_name || owner?.email || "未知老師")}</small></div><span>${count} 人</span></button>`; }).join("") : '<p class="table-empty">尚未建立學習群組。</p>';
  renderGroupDetail();
}

function renderGroupDetail() {
  const group = state.groups.find((item) => item.id === state.selectedGroupId);
  if (!group) { $("#group-detail").innerHTML = '<div class="empty-selection"><i data-lucide="panel-right"></i><p>選擇群組查看成員</p></div>'; icons(); return; }
  const members = state.memberships.filter((item) => item.group_id === group.id && item.status === "active");
  const canManage = ["admin", "super_admin"].includes(state.actor.role);
  $("#group-detail").innerHTML = `<div class="group-detail-header"><div><h2>${escapeHtml(group.name)}</h2><p>邀請碼 <span class="group-code">${group.invite_code}</span></p></div>${canManage ? `<button class="primary-button" data-add-member="${group.id}"><i data-lucide="user-plus"></i>加入成員</button>` : ""}</div><div class="member-list">${members.length ? members.map((member) => { const user=userById(member.user_id); return `<div class="member-row"><div><strong>${escapeHtml(user?.display_name || user?.email || member.user_id)}</strong><small>${escapeHtml(user?.email || "")}</small></div><span class="role-pill">${member.member_role === "assistant" ? "助教" : "學生"}</span>${canManage ? `<button data-remove-member="${member.user_id}" data-group-id="${group.id}">移除</button>` : ""}</div>`; }).join("") : '<p class="table-empty">這個群組尚未有成員。</p>'}</div>`;
  icons();
}

function renderAudit() {
  $("#audit-body").innerHTML = state.audit.map((log) => { const actor=userById(log.actor_user_id), target=userById(log.target_user_id); return `<tr><td>${formatDate(log.created_at)}</td><td>${actionLabels[log.action] || escapeHtml(log.action)}</td><td>${escapeHtml(actor?.display_name || actor?.email || "系統")}</td><td>${escapeHtml(target?.display_name || target?.email || "-")}</td><td>${escapeHtml(log.reason)}</td></tr>`; }).join("");
}

function renderContent() {
  const rows = state.entries;
  $("#content-empty").hidden = rows.length > 0;
  $("#content-body").innerHTML = rows.map((entry) => `<tr><td lang="th">${escapeHtml(entry.thai)}</td><td>${escapeHtml(entry.meaning)}</td><td>${escapeHtml(entry.category)}</td><td>${escapeHtml(entry.source)}</td><td>${escapeHtml(entry.status)}</td><td>v${entry.version}</td><td><button class="row-action" data-edit-entry="${escapeHtml(entry.id)}" title="編輯教材" aria-label="編輯教材"><i data-lucide="pencil"></i></button></td></tr>`).join("");
  icons();
}

function renderAll() { renderOverview(); renderAccounts(); renderGroups(); renderAudit(); renderContent(); icons(); }

async function loadData() {
  const mePayload = await api("/api/admin/me");
  state.actor = mePayload.profile;
  const canManageGroups = ["admin", "super_admin"].includes(state.actor.role);
  const [usersPayload, groupsPayload, auditPayload] = await Promise.all([
    api("/api/admin/users"),
    canManageGroups ? api("/api/admin/groups") : Promise.resolve({ groups:[], memberships:[] }),
    api("/api/admin/audit"),
  ]);
  state.users = usersPayload.users;
  state.groups = groupsPayload.groups;
  state.memberships = groupsPayload.memberships;
  state.audit = auditPayload.logs;
  if (["content_editor", "admin", "super_admin"].includes(state.actor.role)) {
    const contentStatus = $("#content-status-filter")?.value || "";
    const contentPayload = await api(`/api/admin/entries${contentStatus ? `?status=${encodeURIComponent(contentStatus)}` : ""}`);
    state.entries = contentPayload.entries;
  } else state.entries = [];
  $("#actor-name").textContent = state.actor.display_name || "管理員";
  $("#actor-role").textContent = roleLabels[state.actor.role];
  $("#actor-avatar").textContent = (state.actor.display_name || "管").slice(0, 1);
  $("#delete-user").hidden = state.actor.role !== "super_admin";
  $("#invite-user").hidden = !["admin", "super_admin"].includes(state.actor.role);
  $("#create-group").hidden = !["admin", "super_admin"].includes(state.actor.role);
  document.querySelector('[data-view="groups"]').hidden = !["admin", "super_admin"].includes(state.actor.role);
  document.querySelector('[data-view="content"]').hidden = !["content_editor", "admin", "super_admin"].includes(state.actor.role);
  renderAll();
}

function openEntryDialog(entry) {
  $("#entry-id").value = entry.id; $("#entry-thai").value = entry.thai; $("#entry-pronunciation").value = entry.pronunciation || "";
  $("#entry-meaning").value = entry.meaning; $("#entry-category").value = entry.category; $("#entry-source").value = entry.source || ""; $("#entry-status").value = entry.status; $("#entry-reason").value = ""; $("#entry-form-status").textContent = ""; $("#entry-dialog").showModal();
}

async function saveEntry(event) {
  event.preventDefault();
  const id = $("#entry-id").value;
  const body = { thai:$("#entry-thai").value, pronunciation:$("#entry-pronunciation").value, meaning:$("#entry-meaning").value, category:$("#entry-category").value, source:$("#entry-source").value, status:$("#entry-status").value, reason:$("#entry-reason").value };
  try { const result = await api(`/api/admin/entries/${encodeURIComponent(id)}`, { method:"PATCH", body:JSON.stringify(body) }); $("#entry-dialog").close(); notify(`教材已更新至 v${result.entry.version}`); await loadData(); } catch (error) { $("#entry-form-status").textContent = error.message; }
}

async function enterAdmin() {
  try {
    await loadData();
    $("#auth-screen").hidden = true;
    $("#admin-app").hidden = false;
    icons();
  } catch (error) {
    $("#auth-screen").hidden = false;
    $("#admin-app").hidden = true;
    $("#login-status").textContent = error.message;
  }
}

function openUserDialog(user = null) {
  $("#editing-user-id").value = user?.id || "";
  $("#user-dialog-title").textContent = user ? "管理會員帳號" : "建立帳號";
  $("#user-dialog-eyebrow").textContent = user ? "Account control" : "New account";
  $("#user-email-field").hidden = Boolean(user);
  $("#user-status-field").hidden = !user;
  $("#danger-actions").hidden = !user;
  $("#user-email").value = user?.email || "";
  $("#user-account-id").value = user?.account_id || "";
  $("#user-display-name").value = user?.display_name || "";
  $("#user-role").value = user?.role || "student";
  $("#user-status").value = user?.status || "active";
  $("#user-reason").value = "";
  $("#user-form-status").textContent = "";
  $("#save-user").textContent = user ? "儲存變更" : "建立並寄出邀請";
  $("#delete-user").hidden = !user || state.actor.role !== "super_admin" || user.role === "super_admin";
  $("#user-dialog").showModal();
}

async function saveUser(event) {
  event.preventDefault();
  const id = $("#editing-user-id").value;
  const body = { accountId:$("#user-account-id").value, displayName:$("#user-display-name").value, role:$("#user-role").value, reason:$("#user-reason").value };
  if (id) body.status = $("#user-status").value; else body.email = $("#user-email").value;
  try {
    $("#save-user").disabled = true;
    const payload = await api(id ? `/api/admin/users/${id}` : "/api/admin/users", { method:id ? "PATCH" : "POST", body:JSON.stringify(body) });
    $("#user-dialog").close();
    notify(payload.message || "帳號已更新");
    await loadData();
  } catch (error) { $("#user-form-status").textContent = error.message; }
  finally { $("#save-user").disabled = false; }
}

async function passwordReset() {
  const id = $("#editing-user-id").value;
  try { const payload=await api(`/api/admin/users/${id}/reset-password`, { method:"POST", body:JSON.stringify({reason:$("#user-reason").value}) }); notify(payload.message); }
  catch (error) { $("#user-form-status").textContent = error.message; }
}

async function deleteUser() {
  const id = $("#editing-user-id").value;
  if (!window.confirm("這會永久刪除帳號及個人資料，無法復原。確定繼續？")) return;
  try { const payload=await api(`/api/admin/users/${id}`, { method:"DELETE", body:JSON.stringify({reason:$("#user-reason").value}) }); $("#user-dialog").close(); notify(payload.message); await loadData(); }
  catch (error) { $("#user-form-status").textContent = error.message; }
}

function openGroupDialog() {
  const teachers = state.users.filter((user) => user.role === "teacher" && user.status === "active");
  $("#group-owner").innerHTML = teachers.map((user) => `<option value="${user.id}">${escapeHtml(user.display_name || user.email)}</option>`).join("");
  $("#group-form").reset();
  $("#group-form-status").textContent = teachers.length ? "" : "請先建立有效的老師帳號";
  $("#group-dialog").showModal();
}

async function createGroup(event) {
  event.preventDefault();
  try { await api("/api/admin/groups", { method:"POST", body:JSON.stringify({name:$("#group-name").value,ownerTeacherId:$("#group-owner").value,reason:$("#group-reason").value}) }); $("#group-dialog").close(); notify("群組已建立"); await loadData(); }
  catch (error) { $("#group-form-status").textContent = error.message; }
}

function openMemberDialog(groupId) {
  const activeMembers = new Set(state.memberships.filter((item) => item.group_id === groupId && item.status === "active").map((item) => item.user_id));
  const candidates = state.users.filter((user) => user.status === "active" && !activeMembers.has(user.id) && !["admin","super_admin"].includes(user.role));
  $("#member-group-id").value = groupId;
  $("#member-user").innerHTML = candidates.map((user) => `<option value="${user.id}">${escapeHtml(user.display_name || user.email)} · ${roleLabels[user.role]}</option>`).join("");
  $("#member-reason").value = "";
  $("#member-form-status").textContent = candidates.length ? "" : "沒有可加入的有效帳號";
  $("#member-dialog").showModal();
}

async function addMember(event) {
  event.preventDefault();
  const groupId=$("#member-group-id").value;
  try { await api(`/api/admin/groups/${groupId}/members`, { method:"POST", body:JSON.stringify({userId:$("#member-user").value,memberRole:$("#member-role").value,reason:$("#member-reason").value}) }); $("#member-dialog").close(); notify("成員已加入群組"); await loadData(); state.selectedGroupId=groupId; renderGroups(); }
  catch (error) { $("#member-form-status").textContent = error.message; }
}

async function removeMember(groupId, userId) {
  const reason=window.prompt("請輸入移除原因（會保存於審計紀錄）：");
  if (!reason) return;
  try { await api(`/api/admin/groups/${groupId}/members/${userId}`, { method:"DELETE", body:JSON.stringify({reason}) }); notify("成員已移除"); await loadData(); state.selectedGroupId=groupId; renderGroups(); }
  catch (error) { notify(error.message,true); }
}

$("#role-filter").innerHTML = roleOptions(true);
$("#user-role").innerHTML = roleOptions();
$("#login-account-id").addEventListener("input", (event) => { event.target.value = event.target.value.toLocaleLowerCase(); });
$("#user-account-id").addEventListener("input", (event) => { event.target.value = event.target.value.toLocaleLowerCase(); });
$("#login-form").addEventListener("submit", async (event) => { event.preventDefault(); $("#login-status").textContent="正在登入..."; try { await signInWithAccountId($("#login-account-id").value,$("#login-password").value); await enterAdmin(); } catch(error) { $("#login-status").textContent=error.message || "帳號 ID、密碼或帳號權限不正確"; } });
$("#sign-out").addEventListener("click", async () => { await client.auth.signOut(); location.reload(); });
$("#refresh-button").addEventListener("click", async () => { try { await loadData(); notify("資料已更新"); } catch(error){notify(error.message,true);} });
$("#content-status-filter")?.addEventListener("change", () => loadData());
$("#content-body")?.addEventListener("click", (event) => { const button = event.target.closest("[data-edit-entry]"); if (button) openEntryDialog(state.entries.find((entry) => entry.id === button.dataset.editEntry)); });
$("#entry-form")?.addEventListener("submit", saveEntry);
$$(".nav-button").forEach((button) => button.addEventListener("click", () => setView(button.dataset.view)));
$("#account-search").addEventListener("input", renderAccounts);
$("#role-filter").addEventListener("change", renderAccounts);
$("#status-filter").addEventListener("change", renderAccounts);
$("#invite-user").addEventListener("click", () => openUserDialog());
$("#user-form").addEventListener("submit", saveUser);
$("#reset-password").addEventListener("click", passwordReset);
$("#delete-user").addEventListener("click", deleteUser);
$("#create-group").addEventListener("click", openGroupDialog);
$("#group-form").addEventListener("submit", createGroup);
$("#member-form").addEventListener("submit", addMember);
document.addEventListener("click", (event) => { const close=event.target.closest("[data-close-dialog]"); if(close) document.querySelector(`#${close.dataset.closeDialog}`).close(); const edit=event.target.closest("[data-edit-user]"); if(edit) openUserDialog(userById(edit.dataset.editUser)); const group=event.target.closest("[data-group-id].group-item"); if(group){state.selectedGroupId=group.dataset.groupId;renderGroups();} const add=event.target.closest("[data-add-member]"); if(add) openMemberDialog(add.dataset.addMember); const remove=event.target.closest("[data-remove-member]"); if(remove) removeMember(remove.dataset.groupId,remove.dataset.removeMember); });

icons();
if (!client) $("#login-status").textContent = "Supabase 會員服務未載入";
else client.auth.getSession().then(({data}) => { if(data.session) enterAdmin(); });
