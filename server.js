const express = require("express");
const path = require("path");
const fs = require("node:fs/promises");
const crypto = require("node:crypto");
const { AlloRuntime } = require("./runtime");
const { ProviderHub } = require("./providers");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const AUTH_USER = process.env.ALLO_USERNAME;
const AUTH_PASS = process.env.ALLO_PASSWORD;
const API_KEY = process.env.ALLO_API_KEY;
if (process.env.NODE_ENV === "production" && (!AUTH_USER || !AUTH_PASS)) {
  throw new Error("Set ALLO_USERNAME and ALLO_PASSWORD before running Allo in production.");
}

const runtime = new AlloRuntime();
const providers = new ProviderHub(path.join(__dirname, "data"));
const DATA_DIR = path.join(__dirname, "data");
const STORE_FILE = path.join(DATA_DIR, "workspace.json");

app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Frame-Options", "DENY");
  next();
});
if (AUTH_USER && AUTH_PASS) {
  app.use((req, res, next) => {
    const header = req.headers.authorization || "";
    if (API_KEY && header.startsWith("Bearer ")) {
      const supplied = Buffer.from(header.slice(7));
      const expected = Buffer.from(API_KEY);
      if (supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected)) return next();
    }
    const basic = header.startsWith("Basic ") ? Buffer.from(header.slice(6), "base64").toString("utf8") : "";
    const a = Buffer.from(basic);
    const b = Buffer.from(AUTH_USER + ":" + AUTH_PASS);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      res.setHeader("WWW-Authenticate", 'Basic realm="Allo", charset="UTF-8"');
      return res.status(401).send("Authentication required");
    }
    next();
  });
}
app.use(express.json({ limit: "25mb" }));
app.use(express.static(path.join(__dirname, "public")));

async function readWorkspace() {
  try {
    const raw = await fs.readFile(STORE_FILE, "utf8");
    const data = JSON.parse(raw);
    return { chats: Array.isArray(data.chats) ? data.chats : [], prompts: Array.isArray(data.prompts) ? data.prompts : [] };
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    return { chats: [], prompts: [] };
  }
}
async function writeWorkspace(data) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const temporary = STORE_FILE + "." + process.pid + "." + crypto.randomUUID() + ".tmp";
  await fs.writeFile(temporary, JSON.stringify(data), { mode: 0o600 });
  await fs.rename(temporary, STORE_FILE);
}

app.get("/api/providers", (_req, res) => res.json({ providers: providers.list(), encryptionReady: Boolean(process.env.ALLO_ENCRYPTION_KEY) }));
app.get("/api/providers/:id/models", async (req,res)=>{try{res.json({models:await providers.models(req.params.id)});}catch(error){res.status(error.status||502).json({error:error.message});}});
app.get("/api/billing", (_req,res)=>res.json(providers.billing()));
app.put("/api/providers/:id", async (req, res) => {
  try { res.json({ ok: true, provider: await providers.configure({ ...req.body, provider: req.params.id }) }); }
  catch (error) { res.status(error.status || 400).json({ error: error.message }); }
});
app.delete("/api/providers/:id", async (req, res) => {
  try { await providers.remove(req.params.id); res.json({ ok: true }); }
  catch (error) { res.status(error.status || 400).json({ error: error.message }); }
});
app.post("/api/providers/:id/test", async (req, res) => {
  try { const result = await providers.request(req.params.id, [{ role: "user", content: "Reply with exactly: Allo connection successful." }], { max_tokens: 32, temperature: 0 }); res.json({ ok: true, model: result.model, reply: result.message.content }); }
  catch (error) { res.status(error.status || 500).json({ error: error.message }); }
});
app.post("/api/providers/chat", async (req, res) => {
  try {
    const result = await providers.request(req.body?.provider, req.body?.messages || [], req.body?.options || {});
    res.json(result);
  } catch (error) { res.status(error.status || 500).json({ error: error.message }); }
});

app.get("/health", async (_req, res) => { const binary = await runtime.binaryStatus(); res.status(binary.available ? 200 : 503).json({ ok: binary.available, app: "Allo", engine: "llama.cpp", runtime: binary, models: runtime.models.size, loaded: runtime.processes.size }); });
app.get("/api/config", async (_req, res) => res.json({
  provider: "Allo Native GGUF Runtime",
  engine: "llama.cpp",
  endpoint: "/api",
  configured: true,
  modelFormat: "GGUF",
  loadedModels: runtime.processes.size,
  maxLoadedModels: Number(process.env.ALLO_MAX_LOADED_MODELS || 1),
  runtime: await runtime.binaryStatus()
}));
app.get("/api/workspace", async (_req, res) => {
  try { res.json(await readWorkspace()); }
  catch (error) { res.status(500).json({ error: "Could not read workspace data", detail: error.message }); }
});
app.put("/api/workspace", async (req, res) => {
  const chats = req.body?.chats;
  const prompts = req.body?.prompts;
  if (!Array.isArray(chats) || !Array.isArray(prompts) || chats.length > 500 || prompts.length > 500) {
    return res.status(400).json({ error: "Workspace must contain chat and prompt arrays (maximum 500 each)." });
  }
  try {
    await writeWorkspace({ chats, prompts, updatedAt: new Date().toISOString() });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: "Could not save workspace data", detail: error.message });
  }
});

function sendRuntimeError(res, error) {
  const status = error.status || 500;
  if (!res.headersSent) res.status(status).json({ error: error.message || "Allo runtime error" });
  else res.end();
}
function chatPayload(body) {
  return {
    model: body.model,
    messages: body.messages || [{ role: "user", content: body.prompt || "" }],
    temperature: body.options?.temperature,
    max_tokens: body.options?.num_predict,
    stream: body.stream !== false,
    tools: body.tools
  };
}
async function pipeRuntimeChat(req, res, body) {
  const upstream = await runtime.request(body.model, "/v1/chat/completions", chatPayload(body));
  if (!upstream.ok) {
    const detail = await upstream.text();
    return res.status(upstream.status).json({ error: detail || "Inference failed" });
  }
  if (body.stream === false) {
    const data = await upstream.json();
    const choice = data.choices?.[0] || {};
    return res.json({
      model: body.model,
      message: choice.message || { role: "assistant", content: "" },
      done: true,
      total_duration: data.usage?.total_tokens
    });
  }
  res.status(200);
  res.setHeader("Content-Type", "application/x-ndjson");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no");
  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finished = false;
  const emit = (payload) => { if (!res.destroyed) res.write(JSON.stringify(payload) + "\n"); };
  res.on("close", () => { if (!finished) reader.cancel().catch(() => {}); });
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();
      for (const line of lines) {
        const raw = line.trim();
        if (!raw.startsWith("data:")) continue;
        const data = raw.slice(5).trim();
        if (!data || data === "[DONE]") continue;
        let chunk;
        try { chunk = JSON.parse(data); } catch { continue; }
        const delta = chunk.choices?.[0]?.delta;
        if (delta?.content) emit({ model: body.model, message: { role: "assistant", content: delta.content }, done: false });
        if (delta?.tool_calls) emit({ model: body.model, message: { role: "assistant", tool_calls: delta.tool_calls }, done: false });
      }
    }
    emit({ model: body.model, message: { role: "assistant", content: "" }, done: true });
    finished = true;
    res.end();
  } catch (error) {
    finished = true;
    if (!res.destroyed) emit({ error: error.message, done: true });
    if (!res.destroyed) res.end();
  }
}

app.get("/api/tags", (_req, res) => res.json({ models: runtime.list() }));
app.get("/api/ps", (_req, res) => res.json({ models: runtime.running() }));
app.get("/api/version", (_req, res) => res.json({ version: "Allo Native Runtime 1.0", engine: "llama.cpp" }));

app.post("/api/pull", async (req, res) => {
  const reference = req.body?.model;
  if (typeof reference !== "string" || !reference.trim()) return res.status(400).json({ error: "model must be a Hugging Face repository ID, optionally followed by :filename.gguf." });
  res.status(200);
  res.setHeader("Content-Type", "application/x-ndjson");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  try {
    await runtime.download(reference, progress => {
      if (!res.destroyed) res.write(JSON.stringify(progress) + "\n");
    });
    if (!res.destroyed) res.end();
  } catch (error) {
    if (!res.destroyed) {
      res.write(JSON.stringify({ error: error.message }) + "\n");
      res.end();
    }
  }
});

app.post("/api/chat", async (req, res) => {
  if (!req.body?.model) return res.status(400).json({ error: "model is required" });
  try { await pipeRuntimeChat(req, res, req.body); }
  catch (error) { sendRuntimeError(res, error); }
});
app.post("/api/generate", async (req, res) => {
  if (req.body?.keep_alive === 0 && req.body?.model) {
    await runtime.stop(req.body.model);
    return res.json({ done: true, stopped: req.body.model });
  }
  try {
    const body = { ...req.body, messages: [{ role: "user", content: req.body.prompt || "" }] };
    await pipeRuntimeChat(req, res, body);
  } catch (error) { sendRuntimeError(res, error); }
});
app.post("/api/show", (req, res) => {
  try {
    const model = runtime.get(req.body?.model);
    res.json({ modelfile: "GGUF model downloaded from Hugging Face", parameters: "", template: "", details: { format: "gguf", family: model.family, parameter_size: "unknown", quantization_level: "unknown" }, model_info: model });
  } catch (error) { sendRuntimeError(res, error); }
});
app.post("/api/delete", async (req, res) => {
  try { await runtime.remove(req.body?.model); res.json({ ok: true }); }
  catch (error) { sendRuntimeError(res, error); }
});
app.post("/api/copy", async (req, res) => {
  try { await runtime.copy(req.body?.source, req.body?.destination); res.json({ ok: true }); }
  catch (error) { sendRuntimeError(res, error); }
});
app.post("/api/create", (_req, res) => res.status(501).json({ error: "Custom Modelfiles are not supported by the GGUF runtime yet. Download a GGUF model from Hugging Face instead." }));
app.post("/api/push", (_req, res) => res.status(501).json({ error: "Registry publishing is not available yet. Allo currently downloads GGUF files from Hugging Face." }));
app.post("/api/embed", (_req, res) => res.status(501).json({ error: "Embedding model mode is not enabled in this first native runtime release. It is on the runtime roadmap." }));
app.post("/api/embeddings", (_req, res) => res.status(501).json({ error: "Embedding model mode is not enabled in this first native runtime release. It is on the runtime roadmap." }));

app.get("/v1/models", (_req, res) => res.json({ object: "list", data: runtime.list().map(m => ({ id: m.name, object: "model", created: Math.floor(Date.parse(m.modified_at) / 1000), owned_by: "allo" })) }));
app.post("/v1/chat/completions", async (req, res) => {
  try {
    const upstream = await runtime.request(req.body?.model, "/v1/chat/completions", req.body);
    res.status(upstream.status);
    const type = upstream.headers.get("content-type") || "application/json";
    res.setHeader("Content-Type", type);
    if (!upstream.body) return res.end();
    const reader = upstream.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!res.write(Buffer.from(value))) await new Promise(resolve => res.once("drain", resolve));
    }
    res.end();
  } catch (error) { sendRuntimeError(res, error); }
});
app.post("/v1/completions", async (req, res) => {
  try {
    const upstream = await runtime.request(req.body?.model, "/completion", req.body);
    res.status(upstream.status);
    res.setHeader("Content-Type", upstream.headers.get("content-type") || "application/json");
    res.send(await upstream.text());
  } catch (error) { sendRuntimeError(res, error); }
});
app.post("/v1/embeddings", (_req, res) => res.status(501).json({ error: "Embedding model support is planned for a later native runtime release." }));

app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

async function start() {
  await providers.init();
  await runtime.init();
  const server = app.listen(PORT, "0.0.0.0", () => console.log("Allo native runtime listening on port " + PORT));
  const shutdown = async () => {
    server.close();
    await runtime.close();
    process.exit(0);
  };
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
}
start().catch(error => { console.error("Allo startup failed:", error); process.exit(1); });

module.exports = { app };
