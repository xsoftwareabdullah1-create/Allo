const express = require("express");
const path = require("path");
const fs = require("node:fs/promises");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const OLLAMA_BASE_URL = (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(/\/$/, "");
const AUTH_USER = process.env.ALLO_USERNAME;
const AUTH_PASS = process.env.ALLO_PASSWORD;
const API_KEY = process.env.ALLO_API_KEY;
if (process.env.NODE_ENV === "production" && (!AUTH_USER || !AUTH_PASS)) {
  throw new Error("Set ALLO_USERNAME and ALLO_PASSWORD before running Allo in production.");
}

const ALLOWED = new Set(["GET /api/tags","GET /api/ps","GET /api/version","POST /api/chat","POST /api/generate","POST /api/pull","POST /api/show","POST /api/delete","POST /api/copy","POST /api/create","POST /api/embeddings","POST /api/embed","POST /api/push"]);

app.disable("x-powered-by");
if (AUTH_USER && AUTH_PASS) {
  app.use((req, res, next) => {
    const header = req.headers.authorization || "";
    if (API_KEY && header.startsWith("Bearer ")) {
      const suppliedKey = Buffer.from(header.slice(7));
      const expectedKey = Buffer.from(API_KEY);
      if (suppliedKey.length === expectedKey.length && require("crypto").timingSafeEqual(suppliedKey, expectedKey)) return next();
    }
    const supplied = header.startsWith("Basic ") ? Buffer.from(header.slice(6), "base64").toString("utf8") : "";
    const expected = AUTH_USER + ":" + AUTH_PASS;
    const a = Buffer.from(supplied);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !require("crypto").timingSafeEqual(a, b)) {
      res.setHeader("WWW-Authenticate", 'Basic realm="Allo", charset="UTF-8"');
      return res.status(401).send("Authentication required");
    }
    next();
  });
}
app.use(express.json({ limit: "25mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/health", (_req, res) => res.json({ ok: true, app: "Allo", upstream: OLLAMA_BASE_URL }));
app.get("/api/config", (_req, res) => res.json({ provider: "Ollama-compatible", endpoint: "/api", configured: true }));

const DATA_DIR = path.join(__dirname, "data");
const STORE_FILE = path.join(DATA_DIR, "workspace.json");
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
  const temporary = STORE_FILE + ".tmp";
  await fs.writeFile(temporary, JSON.stringify(data), { mode: 0o600 });
  await fs.rename(temporary, STORE_FILE);
}
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


app.all("/api/:endpoint", async (req, res) => {
  const method = req.method.toUpperCase();
  const endpoint = req.params.endpoint;
  const key = method + " /api/" + endpoint;
  if (!ALLOWED.has(key)) return res.status(404).json({ error: "Unsupported API endpoint" });
  try {
    const upstream = await fetch(OLLAMA_BASE_URL + "/api/" + endpoint, {
      method,
      headers: { "Content-Type": "application/json", "Accept": req.headers.accept || "application/json" },
      body: method === "GET" ? undefined : JSON.stringify(req.body || {})
    });
    res.status(upstream.status);
    const contentType = upstream.headers.get("content-type") || "application/json";
    res.setHeader("Content-Type", contentType);
    if (!upstream.body) return res.end();
    if (contentType.includes("ndjson") || contentType.includes("stream")) {
      const reader = upstream.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!res.write(Buffer.from(value))) await new Promise(resolve => res.once("drain", resolve));
      }
      return res.end();
    }
    const data = await upstream.text();
    return res.send(data);
  } catch (error) {
    return res.status(502).json({
      error: "Could not reach the Ollama server.",
      detail: error.cause?.code === "ECONNREFUSED" ? "Connection refused. Start Ollama and check OLLAMA_BASE_URL." : error.message,
      endpoint: OLLAMA_BASE_URL
    });
  }
});


const OPENAI_COMPATIBLE = new Set(["GET /v1/models","POST /v1/chat/completions","POST /v1/completions","POST /v1/embeddings"]);
app.all("/v1/*", async (req, res) => {
  const method = req.method.toUpperCase();
  const endpoint = req.path.slice("/v1/".length);
  const key = method + " /v1/" + endpoint;
  if (!OPENAI_COMPATIBLE.has(key)) return res.status(404).json({ error: "Unsupported OpenAI-compatible endpoint" });
  try {
    const upstream = await fetch(OLLAMA_BASE_URL + "/v1/" + endpoint, {
      method,
      headers: { "Content-Type": "application/json", "Accept": req.headers.accept || "application/json" },
      body: method === "GET" ? undefined : JSON.stringify(req.body || {})
    });
    res.status(upstream.status);
    const contentType = upstream.headers.get("content-type") || "application/json";
    res.setHeader("Content-Type", contentType);
    if (!upstream.body) return res.end();
    const reader = upstream.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!res.write(Buffer.from(value))) await new Promise(resolve => res.once("drain", resolve));
    }
    return res.end();
  } catch (error) {
    return res.status(502).json({ error: "Could not reach the OpenAI-compatible Ollama endpoint.", detail: error.message });
  }
});

app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.listen(PORT, "0.0.0.0", () => console.log(`Allo running on http://localhost:${PORT} → ${OLLAMA_BASE_URL}`));
