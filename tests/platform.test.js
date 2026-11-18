const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const read = file => fs.readFileSync(path.join(__dirname, "..", file), "utf8");

test("Allo contains all workspace modules", () => {
  const html = read("public/index.html");
  for (const view of ["chat","models","running","explore","compare","prompts","embeddings","playground","settings"]) {
    assert.ok(html.includes('id="' + view + 'View"'));
    assert.ok(html.includes('data-view="' + view + '"'));
  }
});

test("Allo owns a GGUF model registry and downloader", () => {
  const runtime = read("runtime.js");
  for (const token of ["class AlloRuntime", "huggingface.co", ".gguf", "spawn(SERVER_BIN", "async download", "async stop"]) assert.ok(runtime.includes(token), "missing " + token);
});

test("server uses its own runtime and has no Ollama upstream", () => {
  const server = read("server.js");
  for (const token of ["new AlloRuntime", "runtime.download", "runtime.request"]) assert.ok(server.includes(token));
  assert.ok(!server.includes("OLLAMA_BASE_URL"));
  assert.ok(!server.includes("ollama:11434"));
});

test("production requires configured authentication", () => {
  const server = read("server.js");
  assert.ok(server.includes('NODE_ENV === "production"'));
  assert.ok(server.includes("ALLO_USERNAME"));
  assert.ok(server.includes("ALLO_PASSWORD"));
  assert.ok(server.includes("timingSafeEqual"));
});

test("frontend wires core workspace modules", () => {
  const js = read("public/app.js");
  for (const feature of ["renderCatalog","runOne","renderPrompts","embeddingRun","apiRun","pullModel","createModel","copyModel"]) assert.ok(js.includes(feature), "missing " + feature);
});

test("workspace persistence validates and atomically writes data", () => {
  const server = read("server.js");
  assert.ok(server.includes('app.get("/api/workspace"'));
  assert.ok(server.includes('app.put("/api/workspace"'));
  assert.ok(server.includes("chats.length > 500"));
  assert.ok(server.includes("prompts.length > 500"));
  assert.ok(server.includes("fs.rename(temporary, STORE_FILE)"));
});

test("Docker builds and ships llama.cpp without Ollama", () => {
  const docker = read("Dockerfile");
  const compose = read("docker-compose.yml");
  assert.ok(docker.includes("ggml-org/llama.cpp"));
  assert.ok(docker.includes("llama-server"));
  assert.ok(!compose.includes("ollama/ollama"));
  assert.ok(!compose.includes("ollama_data"));
  assert.ok(!compose.includes("OLLAMA_BASE_URL"));
  assert.ok(compose.includes("allo_data"));
});

test("API documents native GGUF model downloads", () => {
  const api = read("docs/API.md");
  assert.ok(api.includes("Hugging Face"));
  assert.ok(api.includes("GGUF"));
  assert.ok(api.includes("/v1/chat/completions"));
});