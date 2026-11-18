const express = require("express");
const path = require("path");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const OLLAMA_BASE_URL = (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(/\/$/, "");
const AUTH_USER = process.env.ALLO_USERNAME;
const AUTH_PASS = process.env.ALLO_PASSWORD;
if (process.env.NODE_ENV === "production" && (!AUTH_USER || !AUTH_PASS)) {
  throw new Error("Set ALLO_USERNAME and ALLO_PASSWORD before running Allo in production.");
}

const ALLOWED = new Set(["GET /api/tags","GET /api/ps","GET /api/version","POST /api/chat","POST /api/generate","POST /api/pull","POST /api/show","POST /api/delete","POST /api/copy","POST /api/create","POST /api/embeddings","POST /api/embed","POST /api/push"]);

app.disable("x-powered-by");
if (AUTH_USER && AUTH_PASS) {
  app.use((req, res, next) => {
    const header = req.headers.authorization || "";
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
app.all("/v1/:endpoint", async (req, res) => {
  const method = req.method.toUpperCase();
  const endpoint = req.params.endpoint;
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
