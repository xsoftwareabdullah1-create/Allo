const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

const PROVIDERS = {
  openai: { name: "OpenAI", kind: "openai", baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" },
  anthropic: { name: "Anthropic Claude", kind: "anthropic", baseUrl: "https://api.anthropic.com/v1", model: "claude-3-5-haiku-latest" },
  google: { name: "Google Gemini", kind: "gemini", baseUrl: "https://generativelanguage.googleapis.com/v1beta", model: "gemini-2.5-flash" },
  deepseek: { name: "DeepSeek", kind: "openai", baseUrl: "https://api.deepseek.com/v1", model: "deepseek-chat" },
  groq: { name: "Groq", kind: "openai", baseUrl: "https://api.groq.com/openai/v1", model: "llama-3.3-70b-versatile" },
  openrouter: { name: "OpenRouter", kind: "openai", baseUrl: "https://openrouter.ai/api/v1", model: "openrouter/auto" },
  together: { name: "Together AI", kind: "openai", baseUrl: "https://api.together.xyz/v1", model: "meta-llama/Llama-3.3-70B-Instruct-Turbo" },
  fireworks: { name: "Fireworks AI", kind: "openai", baseUrl: "https://api.fireworks.ai/inference/v1", model: "accounts/fireworks/models/llama-v3p3-70b-instruct" },
  mistral: { name: "Mistral AI", kind: "openai", baseUrl: "https://api.mistral.ai/v1", model: "mistral-small-latest" },
  xai: { name: "xAI Grok", kind: "openai", baseUrl: "https://api.x.ai/v1", model: "grok-3-mini" },
  cerebras: { name: "Cerebras", kind: "openai", baseUrl: "https://api.cerebras.ai/v1", model: "llama-3.3-70b" },
  perplexity: { name: "Perplexity", kind: "openai", baseUrl: "https://api.perplexity.ai", model: "sonar" },
  custom: { name: "Custom OpenAI-compatible", kind: "openai", baseUrl: "", model: "" }
};

class ProviderHub {
  constructor(dataDir) {
    this.file = path.join(dataDir, "providers.enc");
    this.key = process.env.ALLO_ENCRYPTION_KEY ? crypto.createHash("sha256").update(process.env.ALLO_ENCRYPTION_KEY).digest() : null;
    this.configs = {};
  }
  async init() {
    if (!this.key) return;
    try {
      const saved = JSON.parse(await fs.readFile(this.file, "utf8"));
      const decipher = crypto.createDecipheriv("aes-256-gcm", this.key, Buffer.from(saved.iv, "base64"));
      decipher.setAuthTag(Buffer.from(saved.tag, "base64"));
      this.configs = JSON.parse(Buffer.concat([decipher.update(Buffer.from(saved.data, "base64")), decipher.final()]).toString("utf8"));
    } catch (error) { if (error.code !== "ENOENT") throw new Error("Could not decrypt provider settings. Check ALLO_ENCRYPTION_KEY."); }
  }
  async save() {
    if (!this.key) { const error = new Error("Set ALLO_ENCRYPTION_KEY on the server before saving provider API keys."); error.status = 503; throw error; }
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", this.key, iv);
    const encrypted = Buffer.concat([cipher.update(JSON.stringify(this.configs), "utf8"), cipher.final()]);
    const temp = this.file + "." + process.pid + ".tmp";
    await fs.writeFile(temp, JSON.stringify({ iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), data: encrypted.toString("base64") }), { mode: 0o600 });
    await fs.rename(temp, this.file);
  }
  list() {
    return Object.entries(PROVIDERS).map(([id, p]) => ({ id, name: p.name, kind: p.kind, baseUrl: this.configs[id]?.baseUrl || p.baseUrl, model: this.configs[id]?.model || p.model, configured: Boolean(this.configs[id]?.apiKey), hasKey: Boolean(this.configs[id]?.apiKey) }));
  }
  async configure(input) {
    const id = String(input.provider || "");
    if (!PROVIDERS[id]) { const error = new Error("Unknown provider."); error.status = 400; throw error; }
    const previous = this.configs[id] || {};
    const apiKey = typeof input.apiKey === "string" && input.apiKey.trim() ? input.apiKey.trim() : previous.apiKey;
    if (!apiKey) { const error = new Error("API key is required."); error.status = 400; throw error; }
    const baseUrl = id === "custom" ? String(input.baseUrl || "").trim() : (String(input.baseUrl || PROVIDERS[id].baseUrl).trim());
    if (!baseUrl || !/^https:\/\//i.test(baseUrl)) { const error = new Error("Provider URL must use HTTPS."); error.status = 400; throw error; }
    const model = String(input.model || previous.model || PROVIDERS[id].model).trim();
    if (!model) { const error = new Error("Model ID is required."); error.status = 400; throw error; }
    this.configs[id] = { apiKey, baseUrl: baseUrl.replace(/\/+$/, ""), model };
    await this.save();
    return this.list().find(p => p.id === id);
  }
  async remove(id) { delete this.configs[id]; await this.save(); }
  async request(id, messages, options = {}) {
    const preset = PROVIDERS[id], config = this.configs[id];
    if (!preset || !config?.apiKey) { const error = new Error("Configure this provider in Settings first."); error.status = 400; throw error; }
    let url, headers, payload;
    if (preset.kind === "anthropic") {
      url = config.baseUrl + "/messages";
      headers = { "x-api-key": config.apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" };
      const system = messages.filter(m => m.role === "system").map(m => m.content).join("\n");
      payload = { model: config.model, max_tokens: options.max_tokens || 2048, messages: messages.filter(m => m.role !== "system"), ...(system ? { system } : {}), temperature: options.temperature ?? 0.7 };
    } else if (preset.kind === "gemini") {
      url = config.baseUrl + "/models/" + encodeURIComponent(config.model) + ":generateContent?key=" + encodeURIComponent(config.apiKey);
      headers = { "content-type": "application/json" };
      const system = messages.filter(m => m.role === "system").map(m => m.content).join("\n");
      payload = { contents: messages.filter(m => m.role !== "system").map(m => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: String(m.content || "") }] })), generationConfig: { temperature: options.temperature ?? 0.7, maxOutputTokens: options.max_tokens || 2048 }, ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}) };
    } else {
      url = config.baseUrl + "/chat/completions";
      headers = { authorization: "Bearer " + config.apiKey, "content-type": "application/json" };
      payload = { model: config.model, messages, temperature: options.temperature ?? 0.7, max_tokens: options.max_tokens || 2048 };
    }
    const response = await fetch(url, { method: "POST", headers, body: JSON.stringify(payload), signal: AbortSignal.timeout(120000) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { const error = new Error(data.error?.message || data.message || data.error || ("Provider request failed: HTTP " + response.status)); error.status = response.status; throw error; }
    let content = "";
    if (preset.kind === "anthropic") content = (data.content || []).filter(x => x.type === "text").map(x => x.text).join("");
    else if (preset.kind === "gemini") content = (data.candidates?.[0]?.content?.parts || []).map(x => x.text || "").join("");
    else content = data.choices?.[0]?.message?.content || "";
    return { model: config.model, message: { role: "assistant", content }, done: true, usage: data.usage || data.usageMetadata || null };
  }
}
module.exports = { ProviderHub, PROVIDERS };
