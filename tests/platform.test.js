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


test("model creation creates safe aliases without duplicating the GGUF file",()=>{const runtime=read("runtime.js"),server=read("server.js");assert.ok(runtime.includes("async alias(source, destination)"));assert.ok(runtime.includes("stillReferenced"));assert.ok(server.includes('app.post("/api/create", async (req, res) =>'));assert.ok(!server.includes('app.post("/api/create", (_req, res) => res.status(501)'));});

test("runtime reports a clear missing llama-server diagnostic", () => {
  const runtime = read("runtime.js");
  const server = read("server.js");
  assert.ok(runtime.includes("async resolveServerBinary()"));
  assert.ok(runtime.includes("llama-server executable not found"));
  assert.ok(runtime.includes("ALLO_LLAMACPP_BIN"));
  assert.ok(server.includes("runtime.binaryStatus()"));
  assert.ok(server.includes('app.get("/health"'));
  assert.ok(server.includes("localInferenceReady: binary.available"));
  assert.ok(server.includes("res.status(200).json({ ok: true, app: \"Allo\""));
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
  for (const id of ["cohere","nvidia","qwen","kimi","zai","siliconflow","novita","inference","bedrock","cloudflare","vercel","sambanova","hyperbolic","deepinfra","minimax"]) assert.ok(providers.includes(id), "missing provider " + id);
  assert.ok(!providers.includes("huggingface:{"), "Hugging Face must not be listed as a cloud provider");
  for (const token of ["async models(id,overrides={})","inputPricePerMillion","outputPricePerMillion","estimatedCostUsd","monthlyBudgetUsd"]) assert.ok(providers.includes(token));
  assert.ok(server.includes('app.get("/api/providers/:id/models"'));
  assert.ok(server.includes('app.get("/api/billing"'));
  assert.ok(html.includes('id="discoverModels"'));
  assert.ok(html.includes('id="billingProviders"'));
  assert.ok(js.includes('api("billing")'));
  assert.ok(js.includes('api("providers/"+id+"/models",{method:"POST"'));
});

test("Explore view is a provider directory and no longer exposes Hugging Face catalog import UI", () => {
  const html = read("public/index.html");
  const js = read("public/app.js");
  assert.ok(html.includes('id="exploreView"'));
  assert.ok(js.includes("async function renderCatalog()"));
  assert.ok(js.includes("providerData.filter"));
  assert.ok(!html.includes('value="huggingface"'));
  assert.ok(!html.includes("huggingface.co/models?library=gguf"));
});


test("Settings exposes direct API keys and billing navigation and cache-busted light assets", () => {
 const html=read("public/index.html");
 const app=read("public/app.js");
 const css=read("public/styles.css");
 assert.ok(html.includes('data-target-section="providerSettings"'));
 assert.ok(html.includes('data-target-section="billingPanel"'));
 assert.ok(html.includes('id="providerSettings"'));
 assert.ok(html.includes('id="billingPanel"'));
 assert.ok(html.includes("styles.css?v=20261119-encryption-ui1"));
 assert.ok(html.includes("app.js?v=20261119-encryption-ui1"));
 assert.ok(app.includes("target.scrollIntoView"));
 assert.ok(css.includes("html,body,.app-shell,.main,#chatView,.view"));
});


test("Allo API keys can be created, listed and revoked without storing plaintext",()=>{const server=read("server.js"),html=read("public/index.html"),js=read("public/app.js");for(const route of ['app.get("/api/keys"','app.post("/api/keys"','app.delete("/api/keys/:id"'])assert.ok(server.includes(route));assert.ok(server.includes('createHash("sha256")'));assert.ok(server.includes('crypto.randomBytes(32)'));assert.ok(html.includes('id="createApiKey"'));assert.ok(html.includes('id="apiKeyList"'));assert.ok(js.includes('api("keys",{method:"POST"'));});
test("Provider model discovery has visible mobile-selectable results and latest model defaults",()=>{const providers=read("providers.js"),html=read("public/index.html"),js=read("public/app.js");assert.ok(html.includes('id="providerModelSelect"'));assert.ok(js.includes('api("providers/"+id+"/models",{method:"POST"'));assert.ok(js.includes("list.append(o)"));for(const model of ["gpt-6.2-astra","gemini-3.8-flash","qwen4-max"])assert.ok(providers.includes(model));});


test("Provider discovery accepts unsaved API key and base URL from the settings form",()=>{const server=read("server.js"),providers=read("providers.js"),js=read("public/app.js");assert.ok(server.includes('app.post("/api/providers/:id/models"'));assert.ok(providers.includes("async models(id,overrides={})"));assert.ok(js.includes('method:"POST",body:JSON.stringify({apiKey:$("providerApiKey").value,baseUrl:$("providerBaseUrl").value})'));});


test("current cloud model aliases are documented in provider presets",()=>{const providers=read("providers.js"),ui=read("public/app.js");for(const id of ["gpt-6.2-astra","claude-opus-5-5","gemini-3.8-flash","deepseek-flash"])assert.ok(providers.includes(id)&&ui.includes(id),"missing current model "+id);});

test("Allo companion modes, usage graph, API key export and logo are present",()=>{
 const html=read("public/index.html"),js=read("public/app.js"),css=read("public/styles.css");
 for(const mode of ["general","reasoning","coding","research","creative","study","concise"])assert.ok(html.includes('value="'+mode+'"'));
 assert.ok(js.includes("companionInstructions"));
 assert.ok(html.includes('id="usageChart"'));
 assert.ok(js.includes('className="usage-bar-row"'));
 assert.ok(js.includes('Export .txt'));
 assert.ok(js.includes('allo-api-key-'));
 assert.ok(html.includes('<svg viewBox="0 0 40 40">'));
 assert.ok(css.includes(".usage-chart"));
});

test("Provider encryption provisions a persistent key without requiring ALLO_ENCRYPTION_KEY",()=>{
 const providers=read("providers.js"),server=read("server.js");
 assert.ok(providers.includes('this.keyFile=path.join(dataDir,"provider-encryption.key")'));
 assert.ok(providers.includes('crypto.randomBytes(32).toString("hex")'));
 assert.ok(providers.includes('flag:"wx",mode:0o600'));
 assert.ok(providers.includes('get encryptionReady(){return Boolean(this.key);}'));
 assert.ok(server.includes("encryptionReady: providers.encryptionReady"));
});
test("API key management uses a dedicated modal with one-time secret controls",()=>{
 const html=read("public/index.html"),js=read("public/app.js"),css=read("public/styles.css");
 for(const id of ["apiKeyModal","openCreateApiKey","newApiKeyName","createApiKey","closeApiKeyModal"])assert.ok(html.includes('id="'+id+'"'));
 assert.ok(js.includes('apiKeyModal.querySelector("[data-close-api-modal]")'));
 assert.ok(js.includes("Copy API key"));
 assert.ok(js.includes("Export .txt"));
 assert.ok(css.includes(".api-key-modal-panel"));
});

test("OpenAI-compatible API lists configured cloud models and routes cloud chat requests",()=>{
 const server=read("server.js");
 assert.ok(server.includes('providers.list().filter(p => p.configured)'));
 assert.ok(server.includes('providers.request(providerId,'));
 assert.ok(server.includes('chat.completion'));
 assert.ok(server.includes('Cloud provider streaming is not enabled'));
});

test("Allo includes additional documented inference providers from the wider model ecosystem",()=>{const providers=read("providers.js"),html=read("public/index.html");for(const id of ["huggingface","volcengine","hunyuan","qianfan","mimo","stepfun","baichuan","modelscope","nebius","arcee","atlascloud","longcat","requesty"])assert.ok(providers.includes(id)&&html.includes('value="'+id+'"'),"missing provider "+id);});

test("Explore page renders live model catalogue cards with model name, publisher logo and model details",()=>{const app=read("public/app.js"),html=read("public/index.html"),css=read("public/styles.css");assert.ok(app.includes("loadModelCatalog"));assert.ok(app.includes("modelAvatar"));assert.ok(app.includes("huggingface.co/avatars/"));assert.ok(app.includes("model.name"));assert.ok(html.includes('id="catalogGrid"'));assert.ok(html.includes('id="providerCatalogGrid"'));assert.ok(css.includes(".model-avatar"));});
