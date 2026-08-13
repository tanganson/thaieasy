const MAX_INPUT_LENGTH = 500;
const MODEL = "claude-haiku-4-5";
const CLAUDE_API_URL = "https://api.cloudvein.cc/v1/messages";
const DEFAULT_AZURE_ENDPOINT = "https://api.cognitive.microsofttranslator.com";
const RETRYABLE_STATUSES = new Set([403, 429, 500, 502, 503, 504]);

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
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
