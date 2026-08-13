const MAX_INPUT_LENGTH = 500;
const MODEL = "claude-haiku-4-5";
const API_URL = "https://api.cloudvein.cc/v1/messages";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

async function translate(request, env) {
  if (!env.ANTHROPIC_API_KEY) return json({ error: "翻譯服務尚未設定 API key" }, 503);
  let body;
  try { body = await request.json(); } catch { return json({ error: "請提供有效的 JSON 請求" }, 400); }
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const direction = body.direction === "zh-th" ? "zh-th" : "th-zh";
  if (!text) return json({ error: "請先輸入要翻譯的內容" }, 400);
  if (text.length > MAX_INPUT_LENGTH) return json({ error: `每次最多輸入 ${MAX_INPUT_LENGTH} 個字元` }, 413);
  const sourceInstruction = direction === "zh-th" ? "把繁體中文翻譯成自然、日常的泰文。" : "把泰文翻譯成自然、準確的繁體中文。";
  const prompt = `你是泰語學習助手。${sourceInstruction}\n只回傳一個 JSON object，不要 Markdown，不要額外說明：\n{"thai":"泰文結果","traditionalChinese":"繁體中文結果","pronunciation":"泰文羅馬拼音，無法可靠判斷時留空","partOfSpeech":"詞性或短語","tone":"語氣／使用情境","notes":"一句簡短學習提示"}\n原文：${text}`;
  let upstream;
  try {
    upstream = await fetch(API_URL, { method: "POST", headers: { "content-type": "application/json", "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model: MODEL, max_tokens: 800, temperature: 0, messages: [{ role: "user", content: prompt }] }) });
  } catch { return json({ error: "無法連線至翻譯 API，請稍後再試", upstreamStatus: "network" }, 502); }
  if (!upstream.ok) {
    const status = upstream.status;
    let error = "翻譯服務回應錯誤，請稍後再試";
    if (status === 401) error = "翻譯 API key 無效或已撤銷";
    else if (status === 403) error = "翻譯 API key 沒有使用此模型的權限";
    else if (status === 404) error = "找不到指定的 Claude 模型，請檢查模型設定";
    else if (status === 429) error = "翻譯 API 額度不足或請求過於頻繁";
    return json({ error, upstreamStatus: status }, status === 429 ? 429 : 502);
  }
  try {
    const payload = await upstream.json();
    const raw = payload.content?.find((part) => part.type === "text")?.text || "";
    const cleaned = raw.replace(/^```json\s*|\s*```$/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start < 0 || end <= start) throw new Error("missing JSON");
    const result = JSON.parse(cleaned.slice(start, end + 1));
    if (typeof result.thai !== "string" || typeof result.traditionalChinese !== "string") throw new Error("invalid result");
    return json({ model: MODEL, input: text, direction, result });
  } catch { return json({ error: "翻譯結果格式不完整，請再試一次" }, 502); }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/translate") {
      if (request.method !== "POST") return json({ error: "只接受 POST 請求" }, 405);
      return translate(request, env);
    }
    return env.ASSETS.fetch(request);
  },
};
