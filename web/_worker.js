const MAX_INPUT_LENGTH = 500;
const MODEL = "claude-haiku-4-5";
const CLAUDE_API_URL = "https://api.cloudvein.cc/v1/messages";
const DEFAULT_AZURE_ENDPOINT = "https://api.cognitive.microsofttranslator.com";
const RETRYABLE_STATUSES = new Set([403, 429, 500, 502, 503, 504]);
const ADMIN_ROLES = new Set(["content_editor", "support_admin", "admin", "super_admin"]);
const ALL_ROLES = new Set(["student", "teacher", "content_editor", "support_admin", "admin", "super_admin"]);
const ROLE_LEVEL = { student: 0, teacher: 1, content_editor: 1, support_admin: 2, admin: 3, super_admin: 4 };
const MAX_ADMIN_BODY = 16_384;
const PRODUCTION_HOST = "thaieasy.pages.dev";

function redirectPreviewToProduction(url) {
  if (!url.hostname.endsWith(`.${PRODUCTION_HOST}`)) return null;
  url.hostname = PRODUCTION_HOST;
  return Response.redirect(url.toString(), 308);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

function supabaseHeaders(env, extra = {}) {
  return {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    "content-type": "application/json",
    ...extra,
  };
}

async function parseJsonBody(request, maxLength = MAX_ADMIN_BODY) {
  const length = Number(request.headers.get("content-length") || 0);
  if (length > maxLength) throw new Response(JSON.stringify({ error: "請求內容過大" }), { status: 413, headers: { "content-type": "application/json" } });
  const text = await request.text();
  if (text.length > maxLength) throw new Response(JSON.stringify({ error: "請求內容過大" }), { status: 413, headers: { "content-type": "application/json" } });
  try { return text ? JSON.parse(text) : {}; } catch { throw new Response(JSON.stringify({ error: "請提供有效的 JSON 請求" }), { status: 400, headers: { "content-type": "application/json" } }); }
}

async function supabaseRequest(env, path, options = {}) {
  const response = await fetch(`${env.SUPABASE_URL}${path}`, {
    ...options,
    headers: supabaseHeaders(env, options.headers || {}),
  });
  const text = await response.text();
  let payload = null;
  if (text) {
    try { payload = JSON.parse(text); } catch { payload = { message: text }; }
  }
  return { response, payload };
}

async function requireAdmin(request, env, minimumRole = "support_admin") {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return { error: json({ error: "管理服務尚未完成設定" }, 503) };
  const authorization = request.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ")) return { error: json({ error: "請先登入管理帳號" }, 401) };
  const userResponse = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization },
  });
  if (!userResponse.ok) return { error: json({ error: "登入狀態已失效，請重新登入" }, 401) };
  const user = await userResponse.json();
  const profileResult = await supabaseRequest(env, `/rest/v1/profiles?user_id=eq.${encodeURIComponent(user.id)}&select=user_id,display_name,role,status&limit=1`);
  const profile = profileResult.payload?.[0];
  if (!profile || profile.status !== "active") return { error: json({ error: "帳號已停用或未建立會員資料" }, 403) };
  if (!ADMIN_ROLES.has(profile.role) || ROLE_LEVEL[profile.role] < ROLE_LEVEL[minimumRole]) return { error: json({ error: "你沒有此管理權限" }, 403) };
  return { user, profile };
}

function cleanReason(value) {
  return typeof value === "string" ? value.trim().slice(0, 500) : "";
}

function randomInviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join("");
}

async function audit(env, actorUserId, action, reason, details = {}) {
  const result = await supabaseRequest(env, "/rest/v1/admin_audit_logs", {
    method: "POST",
    headers: { prefer: "return=minimal" },
    body: JSON.stringify({ actor_user_id: actorUserId, action, reason, ...details }),
  });
  if (!result.response.ok) throw new Error("audit_log_failed");
}

async function listAdminUsers(request, env, admin) {
  const url = new URL(request.url);
  const page = Math.max(1, Math.min(1000, Number(url.searchParams.get("page")) || 1));
  const perPage = 50;
  const usersResult = await supabaseRequest(env, `/auth/v1/admin/users?page=${page}&per_page=${perPage}`);
  if (!usersResult.response.ok) return json({ error: "無法讀取會員帳號" }, 502);
  const users = usersResult.payload?.users || [];
  const profilesResult = await supabaseRequest(env, "/rest/v1/profiles?select=user_id,display_name,role,status,timezone,created_at,updated_at");
  if (!profilesResult.response.ok) return json({ error: "無法讀取會員資料" }, 502);
  const profiles = new Map((profilesResult.payload || []).map((profile) => [profile.user_id, profile]));
  const search = (url.searchParams.get("search") || "").trim().toLocaleLowerCase();
  const merged = users.map((user) => ({
    id: user.id,
    email: user.email || "",
    emailConfirmedAt: user.email_confirmed_at,
    lastSignInAt: user.last_sign_in_at,
    bannedUntil: user.banned_until,
    createdAt: user.created_at,
    ...(profiles.get(user.id) || { display_name: "", role: "student", status: "active" }),
  })).filter((user) => !search || `${user.email} ${user.display_name}`.toLocaleLowerCase().includes(search));
  return json({ actor: admin.profile, users: merged, page, total: usersResult.payload?.total || merged.length });
}

async function inviteAdminUser(request, env, admin) {
  if (ROLE_LEVEL[admin.profile.role] < ROLE_LEVEL.admin) return json({ error: "只有管理員可以建立帳號" }, 403);
  const body = await parseJsonBody(request);
  const email = typeof body.email === "string" ? body.email.trim().toLocaleLowerCase() : "";
  const displayName = typeof body.displayName === "string" ? body.displayName.trim().slice(0, 80) : "";
  const role = ALL_ROLES.has(body.role) ? body.role : "student";
  const reason = cleanReason(body.reason);
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return json({ error: "請輸入有效電郵地址" }, 400);
  if (reason.length < 3) return json({ error: "請填寫建立原因" }, 400);
  if (ROLE_LEVEL[role] >= ROLE_LEVEL.admin && admin.profile.role !== "super_admin") return json({ error: "只有最高管理員可以建立管理角色" }, 403);
  const inviteResult = await supabaseRequest(env, "/auth/v1/invite", {
    method: "POST",
    body: JSON.stringify({ email, data: { display_name: displayName }, redirect_to: `${new URL(request.url).origin}/` }),
  });
  if (!inviteResult.response.ok) return json({ error: inviteResult.payload?.msg || inviteResult.payload?.message || "無法建立邀請" }, inviteResult.response.status === 422 ? 409 : 502);
  const userId = inviteResult.payload?.id;
  const profileResult = await supabaseRequest(env, `/rest/v1/profiles?user_id=eq.${encodeURIComponent(userId)}`, {
    method: "PATCH",
    headers: { prefer: "return=representation" },
    body: JSON.stringify({ display_name: displayName, role }),
  });
  if (!profileResult.response.ok) return json({ error: "帳號已建立，但角色設定失敗" }, 500);
  await audit(env, admin.user.id, "user.invite", reason, { target_user_id: userId, after_state: { email, displayName, role } });
  return json({ user: { id: userId, email, displayName, role }, message: "邀請郵件已寄出" }, 201);
}

async function updateAdminUser(request, env, admin, userId) {
  const body = await parseJsonBody(request);
  const reason = cleanReason(body.reason);
  if (reason.length < 3) return json({ error: "請填寫變更原因" }, 400);
  const currentResult = await supabaseRequest(env, `/rest/v1/profiles?user_id=eq.${encodeURIComponent(userId)}&select=*&limit=1`);
  const current = currentResult.payload?.[0];
  if (!current) return json({ error: "找不到會員資料" }, 404);
  if (userId !== admin.user.id && ROLE_LEVEL[current.role] >= ROLE_LEVEL[admin.profile.role]) return json({ error: "不能管理同級或更高權限帳號" }, 403);
  const updates = {};
  if (typeof body.displayName === "string" && body.displayName.trim().slice(0, 80) !== current.display_name) updates.display_name = body.displayName.trim().slice(0, 80);
  if (body.role !== undefined && body.role !== current.role) {
    if (!ALL_ROLES.has(body.role)) return json({ error: "角色無效" }, 400);
    if (ROLE_LEVEL[admin.profile.role] < ROLE_LEVEL.admin) return json({ error: "只有管理員可以變更角色" }, 403);
    if (admin.profile.role !== "super_admin" && (ROLE_LEVEL[body.role] >= ROLE_LEVEL.admin || ROLE_LEVEL[current.role] >= ROLE_LEVEL.admin)) return json({ error: "只有最高管理員可以變更管理角色" }, 403);
    if (userId === admin.user.id && body.role !== current.role) return json({ error: "不能變更自己的角色" }, 400);
    updates.role = body.role;
  }
  if (body.status !== undefined && body.status !== current.status) {
    if (!new Set(["active", "suspended"]).has(body.status)) return json({ error: "帳號狀態無效" }, 400);
    if (userId === admin.user.id && body.status === "suspended") return json({ error: "不能停用自己的帳號" }, 400);
    if (ROLE_LEVEL[current.role] >= ROLE_LEVEL[admin.profile.role]) return json({ error: "不能停用同級或更高權限帳號" }, 403);
    updates.status = body.status;
    const authResult = await supabaseRequest(env, `/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
      method: "PUT",
      body: JSON.stringify({ ban_duration: body.status === "suspended" ? "876000h" : "none" }),
    });
    if (!authResult.response.ok) return json({ error: "無法更新登入狀態" }, 502);
  }
  if (!Object.keys(updates).length) return json({ error: "沒有可更新的欄位" }, 400);
  const updateResult = await supabaseRequest(env, `/rest/v1/profiles?user_id=eq.${encodeURIComponent(userId)}`, {
    method: "PATCH",
    headers: { prefer: "return=representation" },
    body: JSON.stringify(updates),
  });
  if (!updateResult.response.ok) return json({ error: "無法更新會員資料" }, 502);
  await audit(env, admin.user.id, "user.update", reason, { target_user_id: userId, before_state: current, after_state: updateResult.payload?.[0] || updates });
  return json({ user: updateResult.payload?.[0] });
}

async function resetAdminUserPassword(request, env, admin, userId) {
  const body = await parseJsonBody(request);
  const reason = cleanReason(body.reason);
  if (reason.length < 3) return json({ error: "請填寫重設原因" }, 400);
  const profileResult = await supabaseRequest(env, `/rest/v1/profiles?user_id=eq.${encodeURIComponent(userId)}&select=role&limit=1`);
  const targetProfile = profileResult.payload?.[0];
  if (!targetProfile) return json({ error: "找不到會員資料" }, 404);
  if (userId !== admin.user.id && ROLE_LEVEL[targetProfile.role] >= ROLE_LEVEL[admin.profile.role]) return json({ error: "不能管理同級或更高權限帳號" }, 403);
  const userResult = await supabaseRequest(env, `/auth/v1/admin/users/${encodeURIComponent(userId)}`);
  const email = userResult.payload?.user?.email || userResult.payload?.email;
  if (!userResult.response.ok || !email) return json({ error: "找不到會員帳號" }, 404);
  const resetResponse = await fetch(`${env.SUPABASE_URL}/auth/v1/recover`, {
    method: "POST",
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, "content-type": "application/json" },
    body: JSON.stringify({ email, redirect_to: `${new URL(request.url).origin}/` }),
  });
  if (!resetResponse.ok) return json({ error: "無法寄出密碼設定郵件" }, 502);
  await audit(env, admin.user.id, "user.password_reset", reason, { target_user_id: userId, metadata: { email } });
  return json({ message: "密碼設定郵件已寄出" });
}

async function deleteAdminUser(request, env, admin, userId) {
  if (admin.profile.role !== "super_admin") return json({ error: "只有最高管理員可以永久刪除帳號" }, 403);
  if (userId === admin.user.id) return json({ error: "不能刪除自己的帳號" }, 400);
  const body = await parseJsonBody(request);
  const reason = cleanReason(body.reason);
  if (reason.length < 3) return json({ error: "請填寫刪除原因" }, 400);
  const currentResult = await supabaseRequest(env, `/rest/v1/profiles?user_id=eq.${encodeURIComponent(userId)}&select=*&limit=1`);
  const current = currentResult.payload?.[0] || null;
  if (current?.role === "super_admin") return json({ error: "不能由後台刪除另一個最高管理員" }, 403);
  const result = await supabaseRequest(env, `/auth/v1/admin/users/${encodeURIComponent(userId)}`, { method: "DELETE" });
  if (!result.response.ok) return json({ error: "無法刪除會員帳號" }, 502);
  await audit(env, admin.user.id, "user.delete", reason, { before_state: current, metadata: { deleted_user_id: userId } });
  return json({ message: "帳號及個人資料已永久刪除" });
}

async function listGroups(env, admin) {
  if (ROLE_LEVEL[admin.profile.role] < ROLE_LEVEL.admin) return json({ error: "只有管理員可以查看所有學習群組" }, 403);
  const groupsResult = await supabaseRequest(env, "/rest/v1/learning_groups?select=id,name,invite_code,status,created_at,updated_at,owner_teacher_id");
  const membershipsResult = await supabaseRequest(env, "/rest/v1/group_memberships?select=group_id,user_id,member_role,status,joined_at");
  if (!groupsResult.response.ok || !membershipsResult.response.ok) return json({ error: "無法讀取群組資料" }, 502);
  return json({ actor: admin.profile, groups: groupsResult.payload || [], memberships: membershipsResult.payload || [] });
}

async function createGroup(request, env, admin) {
  if (ROLE_LEVEL[admin.profile.role] < ROLE_LEVEL.admin) return json({ error: "只有管理員可以建立群組" }, 403);
  const body = await parseJsonBody(request);
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
  const ownerTeacherId = typeof body.ownerTeacherId === "string" ? body.ownerTeacherId : "";
  const reason = cleanReason(body.reason);
  if (!name || !ownerTeacherId || reason.length < 3) return json({ error: "請填寫群組名稱、老師及建立原因" }, 400);
  const ownerResult = await supabaseRequest(env, `/rest/v1/profiles?user_id=eq.${encodeURIComponent(ownerTeacherId)}&select=user_id,role,status&limit=1`);
  const owner = ownerResult.payload?.[0];
  if (!owner || owner.role !== "teacher" || owner.status !== "active") return json({ error: "群組擁有者必須是有效老師帳號" }, 400);
  let groupResult;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    groupResult = await supabaseRequest(env, "/rest/v1/learning_groups", {
      method: "POST",
      headers: { prefer: "return=representation" },
      body: JSON.stringify({ name, owner_teacher_id: ownerTeacherId, invite_code: randomInviteCode() }),
    });
    if (groupResult.response.ok || groupResult.response.status !== 409) break;
  }
  if (!groupResult?.response.ok) return json({ error: "無法建立學習群組" }, 502);
  const group = groupResult.payload?.[0];
  await audit(env, admin.user.id, "group.create", reason, { after_state: group, metadata: { group_id: group?.id } });
  return json({ group }, 201);
}

async function addGroupMember(request, env, admin, groupId) {
  if (ROLE_LEVEL[admin.profile.role] < ROLE_LEVEL.admin) return json({ error: "只有管理員可以管理群組成員" }, 403);
  const body = await parseJsonBody(request);
  const userId = typeof body.userId === "string" ? body.userId : "";
  const memberRole = body.memberRole === "assistant" ? "assistant" : "student";
  const reason = cleanReason(body.reason);
  if (!userId || reason.length < 3) return json({ error: "請選擇帳號並填寫原因" }, 400);
  const memberResult = await supabaseRequest(env, `/rest/v1/profiles?user_id=eq.${encodeURIComponent(userId)}&select=role,status&limit=1`);
  const member = memberResult.payload?.[0];
  const allowedRoles = memberRole === "assistant" ? new Set(["teacher", "content_editor"]) : new Set(["student"]);
  if (!member || member.status !== "active" || !allowedRoles.has(member.role)) return json({ error: memberRole === "assistant" ? "助教必須是有效老師或內容編輯帳號" : "群組學生必須是有效學生帳號" }, 400);
  const result = await supabaseRequest(env, "/rest/v1/group_memberships?on_conflict=group_id,user_id", {
    method: "POST",
    headers: { prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({ group_id: groupId, user_id: userId, member_role: memberRole, status: "active" }),
  });
  if (!result.response.ok) return json({ error: "無法加入群組成員" }, 502);
  await audit(env, admin.user.id, "group.member_add", reason, { target_user_id: userId, after_state: result.payload?.[0], metadata: { group_id: groupId } });
  return json({ membership: result.payload?.[0] });
}

async function removeGroupMember(request, env, admin, groupId, userId) {
  if (ROLE_LEVEL[admin.profile.role] < ROLE_LEVEL.admin) return json({ error: "只有管理員可以管理群組成員" }, 403);
  const body = await parseJsonBody(request);
  const reason = cleanReason(body.reason);
  if (reason.length < 3) return json({ error: "請填寫移除原因" }, 400);
  const result = await supabaseRequest(env, `/rest/v1/group_memberships?group_id=eq.${encodeURIComponent(groupId)}&user_id=eq.${encodeURIComponent(userId)}`, {
    method: "PATCH",
    headers: { prefer: "return=representation" },
    body: JSON.stringify({ status: "removed" }),
  });
  if (!result.response.ok) return json({ error: "無法移除群組成員" }, 502);
  await audit(env, admin.user.id, "group.member_remove", reason, { target_user_id: userId, after_state: result.payload?.[0], metadata: { group_id: groupId } });
  return json({ membership: result.payload?.[0] });
}

async function listAuditLogs(request, env) {
  const url = new URL(request.url);
  const limit = Math.max(1, Math.min(200, Number(url.searchParams.get("limit")) || 100));
  const result = await supabaseRequest(env, `/rest/v1/admin_audit_logs?select=id,actor_user_id,target_user_id,action,reason,before_state,after_state,metadata,created_at&order=created_at.desc&limit=${limit}`);
  if (!result.response.ok) return json({ error: "無法讀取審計紀錄" }, 502);
  return json({ logs: result.payload || [] });
}

async function listContentEntries(request, env, admin) {
  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const filter = status ? `&status=eq.${encodeURIComponent(status)}` : "";
  const result = await supabaseRequest(env, `/rest/v1/entries?select=*&order=updated_at.desc${filter}`);
  if (!result.response.ok) return json({ error: "無法讀取教材" }, 502);
  return json({ entries: result.payload || [], actor: admin.profile });
}

async function updateContentEntry(request, env, admin, entryId) {
  const body = await parseJsonBody(request);
  const reason = cleanReason(body.reason);
  if (reason.length < 3) return json({ error: "請提供至少 3 個字元的修改原因" }, 400);
  const current = await supabaseRequest(env, `/rest/v1/entries?id=eq.${encodeURIComponent(entryId)}&select=*&limit=1`);
  const entry = current.payload?.[0];
  if (!current.response.ok || !entry) return json({ error: "找不到教材" }, 404);
  const allowed = ["thai", "pronunciation", "meaning", "category", "source", "status"];
  const updates = Object.fromEntries(allowed.filter((key) => typeof body[key] === "string").map((key) => [key, body[key].trim()]));
  if (updates.status && !["draft", "published", "archived"].includes(updates.status)) return json({ error: "教材狀態不正確" }, 400);
  if (!Object.keys(updates).length) return json({ error: "沒有可更新內容" }, 400);
  updates.version = Number(entry.version) + 1;
  updates.updated_by = admin.user.id;
  updates.updated_at = new Date().toISOString();
  const result = await supabaseRequest(env, `/rest/v1/entries?id=eq.${encodeURIComponent(entryId)}`, {
    method: "PATCH", headers: { prefer: "return=representation" }, body: JSON.stringify(updates),
  });
  if (!result.response.ok) return json({ error: "教材更新失敗" }, 502);
  await audit(env, admin.user.id, "entry.update", reason, { metadata: { entry_id: entryId, version: updates.version }, before_state: entry, after_state: result.payload?.[0] });
  return json({ entry: result.payload?.[0] });
}

async function adminApi(request, env, pathname) {
  const isContent = pathname === "/api/admin/entries" || pathname.startsWith("/api/admin/entries/");
  const auth = await requireAdmin(request, env, isContent ? "content_editor" : "support_admin");
  if (auth.error) return auth.error;
  if (pathname === "/api/admin/me" && request.method === "GET") return json({ user: auth.user, profile: auth.profile });
  if (pathname === "/api/admin/users" && request.method === "GET") return listAdminUsers(request, env, auth);
  if (pathname === "/api/admin/users" && request.method === "POST") return inviteAdminUser(request, env, auth);
  const userMatch = pathname.match(/^\/api\/admin\/users\/([0-9a-f-]+)$/i);
  if (userMatch && request.method === "PATCH") return updateAdminUser(request, env, auth, userMatch[1]);
  if (userMatch && request.method === "DELETE") return deleteAdminUser(request, env, auth, userMatch[1]);
  const resetMatch = pathname.match(/^\/api\/admin\/users\/([0-9a-f-]+)\/reset-password$/i);
  if (resetMatch && request.method === "POST") return resetAdminUserPassword(request, env, auth, resetMatch[1]);
  if (pathname === "/api/admin/groups" && request.method === "GET") return listGroups(env, auth);
  if (pathname === "/api/admin/groups" && request.method === "POST") return createGroup(request, env, auth);
  const memberMatch = pathname.match(/^\/api\/admin\/groups\/([0-9a-f-]+)\/members$/i);
  if (memberMatch && request.method === "POST") return addGroupMember(request, env, auth, memberMatch[1]);
  const removeMemberMatch = pathname.match(/^\/api\/admin\/groups\/([0-9a-f-]+)\/members\/([0-9a-f-]+)$/i);
  if (removeMemberMatch && request.method === "DELETE") return removeGroupMember(request, env, auth, removeMemberMatch[1], removeMemberMatch[2]);
  if (pathname === "/api/admin/audit" && request.method === "GET") return listAuditLogs(request, env);
  if (pathname === "/api/admin/entries" && request.method === "GET") return listContentEntries(request, env, auth);
  const entryMatch = pathname.match(/^\/api\/admin\/entries\/([^/]+)$/);
  if (entryMatch && request.method === "PATCH") return updateContentEntry(request, env, auth, entryMatch[1]);
  return json({ error: "找不到管理 API" }, 404);
}

function parseResult(raw) {
  const cleaned = raw.replace(/^```(?:json)?\s*|\s*```$/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const result = JSON.parse(cleaned.slice(start, end + 1));
    return result && typeof result === "object" ? result : null;
  } catch {
    return null;
  }
}

async function fetchWithRetry(url, options) {
  let response;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    response = await fetch(url, options);
    if (!RETRYABLE_STATUSES.has(response.status) || attempt === 2) break;
    await new Promise((resolve) => setTimeout(resolve, attempt === 0 ? 250 : 750));
  }
  return response;
}

async function callAzureTranslator(env, text, direction) {
  const endpoint = (env.AZURE_TRANSLATOR_ENDPOINT || DEFAULT_AZURE_ENDPOINT).replace(/\/$/, "");
  const [from, to] = direction === "zh-th" ? ["zh-Hant", "th"] : ["th", "zh-Hant"];
  const url = `${endpoint}/translate?api-version=3.0&from=${from}&to=${to}`;
  const response = await fetchWithRetry(url, {
    method: "POST",
    headers: {
      "content-type": "application/json; charset=UTF-8",
      "Ocp-Apim-Subscription-Key": env.AZURE_TRANSLATOR_KEY,
      "Ocp-Apim-Subscription-Region": env.AZURE_TRANSLATOR_REGION,
    },
    body: JSON.stringify([{ Text: text }]),
  });
  if (!response.ok) return { response };
  const payload = await response.json();
  const translatedText = payload?.[0]?.translations?.[0]?.text;
  return { response, translatedText: typeof translatedText === "string" ? translatedText.trim() : "" };
}

async function enrichLearningDetails(env, thai, traditionalChinese) {
  if (!env.ANTHROPIC_API_KEY) return {};
  const prompt = `你是泰語學習助手。以下翻譯已由 Azure Translator 確定，不要改寫。只回傳 JSON：\n{"pronunciation":"泰文羅馬拼音，無法可靠判斷時留空","partOfSpeech":"詞性或短語","tone":"語氣／使用情境","notes":"一句簡短繁體中文學習提示"}\n泰文：${thai}\n繁體中文：${traditionalChinese}`;
  try {
    const response = await fetchWithRetry(CLAUDE_API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model: MODEL, max_tokens: 400, temperature: 0, messages: [{ role: "user", content: prompt }] }),
    });
    if (!response.ok) return {};
    const payload = await response.json();
    const raw = payload.content?.filter((part) => part.type === "text").map((part) => part.text).join("\n") || "";
    return parseResult(raw) || {};
  } catch {
    return {};
  }
}

async function translate(request, env) {
  if (!env.AZURE_TRANSLATOR_KEY || !env.AZURE_TRANSLATOR_REGION) {
    return json({ error: "Azure 翻譯服務尚未完成設定" }, 503);
  }
  let body;
  try { body = await request.json(); } catch { return json({ error: "請提供有效的 JSON 請求" }, 400); }
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const direction = body.direction === "zh-th" ? "zh-th" : "th-zh";
  if (!text) return json({ error: "請先輸入要翻譯的內容" }, 400);
  if (text.length > MAX_INPUT_LENGTH) return json({ error: `每次最多輸入 ${MAX_INPUT_LENGTH} 個字元` }, 413);

  let azure;
  try {
    azure = await callAzureTranslator(env, text, direction);
  } catch {
    return json({ error: "無法連線至 Azure Translator，請稍後再試", upstreamStatus: "network" }, 502);
  }
  if (!azure.response.ok) {
    const status = azure.response.status;
    let error = "Azure Translator 回應錯誤，請稍後再試";
    if (status === 401 || status === 403) error = "Azure Translator 金鑰或區域設定無效";
    else if (status === 429) error = "Azure Translator 免費額度不足或請求過於頻繁";
    return json({ error, upstreamStatus: status }, status === 429 ? 429 : 502);
  }
  if (!azure.translatedText) return json({ error: "Azure Translator 沒有回傳翻譯結果" }, 502);

  const thai = direction === "zh-th" ? azure.translatedText : text;
  const traditionalChinese = direction === "zh-th" ? text : azure.translatedText;
  return json({
    provider: "azure-translator",
    input: text,
    direction,
    result: {
      thai,
      traditionalChinese,
      pronunciation: "",
      partOfSpeech: "",
      tone: "",
      notes: "",
    },
  });
}

async function enrich(request, env) {
  let body;
  try { body = await request.json(); } catch { return json({ error: "請提供有效的 JSON 請求" }, 400); }
  const thai = typeof body.thai === "string" ? body.thai.trim() : "";
  const traditionalChinese = typeof body.traditionalChinese === "string" ? body.traditionalChinese.trim() : "";
  if (!thai || !traditionalChinese) return json({ error: "缺少泰文或中文翻譯內容" }, 400);
  if (thai.length > MAX_INPUT_LENGTH || traditionalChinese.length > MAX_INPUT_LENGTH) return json({ error: "學習補充內容過長" }, 413);
  const details = await enrichLearningDetails(env, thai, traditionalChinese);
  return json({ enrichmentModel: Object.keys(details).length ? MODEL : null, details });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const productionRedirect = redirectPreviewToProduction(url);
    if (productionRedirect) return productionRedirect;
    if (url.pathname.startsWith("/api/admin/")) {
      try { return await adminApi(request, env, url.pathname); }
      catch (error) {
        if (error instanceof Response) return error;
        console.error(JSON.stringify({ event: "admin_api_error", path: url.pathname, message: error instanceof Error ? error.message : "unknown" }));
        return json({ error: "管理服務暫時無法處理請求" }, 500);
      }
    }
    if (url.pathname === "/api/translate") {
      if (request.method !== "POST") return json({ error: "只接受 POST 請求" }, 405);
      return translate(request, env);
    }
    if (url.pathname === "/api/translate/enrich") {
      if (request.method !== "POST") return json({ error: "只接受 POST 請求" }, 405);
      return enrich(request, env);
    }
    return env.ASSETS.fetch(request);
  },
};
