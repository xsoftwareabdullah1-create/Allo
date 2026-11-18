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
  for (const token of ["class AlloRuntime", "huggingface.co", ".gguf", "spawn(serverBin", "async download", "async stop"]) assert.ok(runtime.includes(token), "missing " + token);
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
test("first-run onboarding explains and installs a real local model", () => {
  const html = read("public/index.html");
  const js = read("public/app.js");
  assert.ok(js.includes("function renderWelcome()"));
  assert.ok(js.includes("async function installStarterModel()"));
  assert.ok(js.includes("Qwen/Qwen2.5-0.5B-Instruct-GGUF"));
  assert.ok(js.includes('api("pull"'));
  assert.ok(html.includes("What can I help you with?"));
});

test("assistant messages render escaped markdown and code blocks", () => {
  const js = read("public/app.js");
  assert.ok(js.includes("function renderAssistantMarkdown(value)"));
  assert.ok(js.includes('escapeHtml(value||"")'));
  assert.ok(js.includes("code-block"));
  assert.ok(js.includes("content.innerHTML=renderAssistantMarkdown(m.content)"));
});


test("runtime reports a clear missing llama-server diagnostic", () => {
  const runtime = read("runtime.js");
  const server = read("server.js");
  assert.ok(runtime.includes("async resolveServerBinary()"));
  assert.ok(runtime.includes("llama-server executable not found"));
  assert.ok(runtime.includes("ALLO_LLAMACPP_BIN"));
  assert.ok(server.includes("runtime.binaryStatus()"));
  assert.ok(server.includes("binary.available ? 200 : 503"));
});

test("universal provider gateway includes major cloud providers and encrypted credential storage", () => {
  const providers = read("providers.js");
  const server = read("server.js");
  for (const id of ["openai","anthropic","google","deepseek","groq","openrouter","together","fireworks","mistral","xai","cerebras","perplexity","custom"]) assert.ok(providers.includes(id), "missing provider " + id);
  for (const token of ["aes-256-gcm","ALLO_ENCRYPTION_KEY","providers.enc"]) assert.ok(providers.includes(token));
  for (const route of ['/api/providers",','/api/providers/:id",','/api/providers/:id/test",','/api/providers/chat",']) assert.ok(server.includes(route), "missing provider route " + route);
  assert.ok(!providers.includes("localStorage"));
});

test("chat UI supports selecting a cloud provider without requiring a local model", () => {
  const html = read("public/index.html");
  const js = read("public/app.js");
  assert.ok(html.includes('id="providerSelect"'));
  assert.ok(html.includes('id="providerApiKey"'));
  assert.ok(js.includes('api("providers/chat"'));
  assert.ok(js.includes('!model&&!$("providerSelect").value'));
});

test("Allo exposes expanded provider discovery and billing controls", () => {
  const providers = read("providers.js");
  const server = read("server.js");
  const html = read("public/index.html");
  const js = read("public/app.js");
  for (const id of ["cohere","nvidia","huggingface","qwen","kimi","zai","siliconflow","novita","inference","bedrock","cloudflare","vercel","sambanova","hyperbolic","deepinfra","minimax"]) assert.ok(providers.includes(id), "missing provider " + id);
  for (const token of ["async models(id,overrides={})","inputPricePerMillion","outputPricePerMillion","estimatedCostUsd","monthlyBudgetUsd"]) assert.ok(providers.includes(token));
  assert.ok(server.includes('app.get("/api/providers/:id/models"'));
  assert.ok(server.includes('app.get("/api/billing"'));
  assert.ok(html.includes('id="discoverModels"'));
  assert.ok(html.includes('id="billingProviders"'));
  assert.ok(js.includes('api("billing")'));
  assert.ok(js.includes('api("providers/"+id+"/models",{method:"POST"'));
});

test("Explore models uses a live Hugging Face GGUF catalogue instead of only a fixed list", () => {
  const server = read("server.js");
  const js = read("public/app.js");
  assert.ok(server.includes('app.get("/api/catalog"'));
  assert.ok(server.includes('filter: "gguf"'));
  assert.ok(server.includes('https://huggingface.co/api/models?'));
  assert.ok(js.includes('api("catalog"'));
  assert.ok(js.includes("Searching live Hugging Face GGUF models"));
  assert.ok(js.includes("Download model"));
});


test("Settings exposes direct API keys and billing navigation and cache-busted light assets", () => {
 const html=read("public/index.html");
 const app=read("public/app.js");
 const css=read("public/styles.css");
 assert.ok(html.includes('data-target-section="providerSettings"'));
 assert.ok(html.includes('data-target-section="billingPanel"'));
 assert.ok(html.includes('id="providerSettings"'));
 assert.ok(html.includes('id="billingPanel"'));
 assert.ok(html.includes("styles.css?v=20261118-light2"));
 assert.ok(html.includes("app.js?v=20261118-api-create3"));
 assert.ok(app.includes("target.scrollIntoView"));
 assert.ok(css.includes("html,body,.app-shell,.main,#chatView,.view"));
});


test("Allo API keys can be created, listed and revoked without storing plaintext",()=>{const server=read("server.js"),html=read("public/index.html"),js=read("public/app.js");for(const route of ['app.get("/api/keys"','app.post("/api/keys"','app.delete("/api/keys/:id"'])assert.ok(server.includes(route));assert.ok(server.includes('createHash("sha256")'));assert.ok(server.includes('crypto.randomBytes(32)'));assert.ok(html.includes('id="createApiKey"'));assert.ok(html.includes('id="apiKeyList"'));assert.ok(js.includes('api("keys",{method:"POST"'));});
test("Provider model discovery has visible mobile-selectable results and latest model defaults",()=>{const providers=read("providers.js"),html=read("public/index.html"),js=read("public/app.js");assert.ok(html.includes('id="providerModelSelect"'));assert.ok(js.includes('api("providers/"+id+"/models")'));assert.ok(js.includes('list.append(o)'));for(const model of ['gpt-6.2-astra','gemini-3.8-flash','qwen4-max'])assert.ok(providers.includes(model));});


test("Provider discovery accepts unsaved API key and base URL from the settings form",()=>{const server=read("server.js"),providers=read("providers.js"),js=read("public/app.js");assert.ok(server.includes('app.post("/api/providers/:id/models"'));assert.ok(providers.includes("async models(id,overrides={})"));assert.ok(js.includes('method:"POST",body:JSON.stringify({apiKey:$("providerApiKey").value,baseUrl:$("providerBaseUrl").value})'));});
