const express = require("express");
const path = require("path");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const OLLAMA_BASE_URL = (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(/\/$/, "");
const ALLOWED = new Set(["GET /api/tags","GET /api/ps","GET /api/version","POST /api/chat","POST /api/generate","POST /api/pull","POST /api/show","POST /api/delete","POST /api/copy","POST /api/create","POST /api/embeddings"]);

app.disable("x-powered-by");
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

app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.listen(PORT, "0.0.0.0", () => console.log(`Allo running on http://localhost:${PORT} → ${OLLAMA_BASE_URL}`));
