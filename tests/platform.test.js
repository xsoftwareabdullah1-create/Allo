const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const read = file => fs.readFileSync(path.join(__dirname, "..", file), "utf8");

test("Allo contains all workspace modules", () => {
  const html = read("public/index.html");
  for (const view of ["chat","models","running","explore","compare","prompts","embeddings","playground","settings"]) {
    assert.match(html, new RegExp('id="' + view + 'View"'));
    assert.match(html, new RegExp('data-view="' + view + '"'));
  }
});

test("Allo owns a GGUF model registry and downloader", () => {
  const runtime = read("runtime.js");
  assert.match(runtime, /class AlloRuntime/);
  assert.match(runtime, /huggingface\\.co/);
  assert.match(runtime, /\\.gguf/);
  assert.match(runtime, /spawn\\(SERVER_BIN/);
  assert.match(runtime, /async download/);
  assert.match(runtime, /async stop/);
});

test("server uses its own runtime and has no Ollama upstream", () => {
  const server = read("server.js");
  assert.match(server, /new AlloRuntime/);
  assert.match(server, /runtime\\.download/);
  assert.match(server, /runtime\\.request/);
  assert.doesNotMatch(server, /OLLAMA_BASE_URL|ollama:11434|ollama\\.com/);
});

test("production requires configured authentication", () => {
  const server = read("server.js");
  assert.match(server, /NODE_ENV === "production"/);
  assert.match(server, /ALLO_USERNAME/);
  assert.match(server, /ALLO_PASSWORD/);
  assert.match(server, /timingSafeEqual/);
});

test("frontend wires core workspace modules", () => {
  const js = read("public/app.js");
  for (const feature of ["renderCatalog","runOne","renderPrompts","embeddingRun","apiRun","pullModel","createModel","copyModel"]) assert.ok(js.includes(feature), "missing " + feature);
});

test("workspace persistence validates and atomically writes data", () => {
  const server = read("server.js");
  assert.match(server, /app\\.get\\("\\/api\\/workspace"/);
  assert.match(server, /app\\.put\\("\\/api\\/workspace"/);
  assert.match(server, /chats\\.length > 500/);
  assert.match(server, /prompts\\.length > 500/);
  assert.match(server, /fs\\.rename\\(temporary, STORE_FILE\\)/);
});

test("Docker builds and ships llama.cpp without Ollama", () => {
  const docker = read("Dockerfile");
  const compose = read("docker-compose.yml");
  assert.match(docker, /ggml-org\\/llama\\.cpp/);
  assert.match(docker, /llama-server/);
  assert.doesNotMatch(compose, /ollama\\/ollama|ollama_data|OLLAMA_BASE_URL/);
  assert.match(compose, /allo_data/);
});

test("API documents native GGUF model downloads", () => {
  const api = read("docs/API.md");
  assert.match(api, /Hugging Face/);
  assert.match(api, /GGUF/);
  assert.match(api, /\\/v1\\/chat\\/completions/);
});