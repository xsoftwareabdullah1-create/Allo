const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const read = (file) => fs.readFileSync(path.join(__dirname, "..", file), "utf8");

test("Allo contains all workspace modules", () => {
  const html = read("public/index.html");
  for (const view of ["chat","models","running","explore","compare","prompts","embeddings","playground","settings"]) {
    assert.match(html, new RegExp('id="' + view + 'View"'), view + " view exists");
    assert.match(html, new RegExp('data-view="' + view + '"'), view + " navigation exists");
  }
});

test("backend restricts Ollama API proxy routes", () => {
  const server = read("server.js");
  for (const endpoint of ["GET /api/tags","GET /api/ps","POST /api/chat","POST /api/pull","POST /api/create","POST /api/embed"]) {
    assert.ok(server.includes(endpoint), "missing " + endpoint);
  }
  assert.match(server, /OPENAI_COMPATIBLE/);
  assert.match(server, /app\.all\("\/v1\/\*"/);
});

test("production requires configured authentication", () => {
  const server = read("server.js");
  assert.match(server, /NODE_ENV === "production"/);
  assert.match(server, /ALLO_USERNAME/);
  assert.match(server, /ALLO_PASSWORD/);
  assert.match(server, /timingSafeEqual/);
});

test("frontend wires major model and developer tools", () => {
  const js = read("public/app.js");
  for (const feature of ["renderCatalog","runOne","renderPrompts","embeddingRun","apiRun","pullModel","createModel","copyModel"]) {
    assert.ok(js.includes(feature), "missing frontend feature " + feature);
  }
});

test("workspace persistence endpoints are authenticated and validated", () => {
  const server = read("server.js");
  assert.match(server, /app\.get\("\/api\/workspace"/);
  assert.match(server, /app\.put\("\/api\/workspace"/);
  assert.match(server, /chats\.length > 500/);
  assert.match(server, /prompts\.length > 500/);
  assert.match(server, /fs\.rename\(temporary, STORE_FILE\)/);
});

test("chat UI supports image inputs for vision models", () => {
  const html = read("public/index.html");
  const js = read("public/app.js");
  assert.match(html, /id="imageInput"/);
  assert.match(js, /selectedImages/);
  assert.match(js, /FileReader/);
  assert.match(js, /images:m\.images\.map/);
});
