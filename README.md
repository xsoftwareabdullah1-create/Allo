# Allo

<p align="center">
  <strong>Your AI workspace. Your models. Your infrastructure.</strong><br>
  A self-hosted web control plane for Ollama, built for local-first AI workflows.
</p>

<p align="center">
  <a href="https://github.com/xsoftwareabdullah1-create/Allo/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/xsoftwareabdullah1-create/Allo/actions/workflows/ci.yml/badge.svg"></a>
  <a href="LICENSE"><img alt="MIT License" src="https://img.shields.io/badge/license-MIT-blue.svg"></a>
  <img alt="Node.js 20+" src="https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white">
  <img alt="Ollama" src="https://img.shields.io/badge/runtime-Ollama-black?logo=ollama">
</p>

Allo brings model operations and everyday AI work into one interface. Chat with local models, inspect and manage them, compare responses, save prompts, generate embeddings, and connect API clients through an OpenAI-compatible endpoint.

**Important distinction:** Allo is the workspace and control plane. [Ollama](https://ollama.com) remains the inference runtime that loads model weights and generates responses.

## What you can do

| Area | Current capabilities |
|---|---|
| Chat workspace | Streaming chat, vision image attachments, system prompts, temperature, context size, keep-alive and tool schemas |
| Model operations | List, inspect, pull, copy, create, push and delete models |
| Model discovery | Searchable curated model catalogue with one-click pull |
| Runtime monitor | Inspect models currently loaded by Ollama |
| Model comparison | Send one prompt to two models and compare responses |
| Prompt library | Save, reuse and delete prompt templates |
| Embeddings | Generate and inspect embeddings |
| API playground | Send requests to supported native Ollama endpoints |
| Developer API | OpenAI-compatible models, chat completions, completions and embeddings |
| Workspace sync | Persist chats and prompts on the Allo server |

## Quick start — Docker Compose

Requirements: Docker Engine with the Compose plugin.

```bash
git clone https://github.com/xsoftwareabdullah1-create/Allo.git
cd Allo
cp .env.example .env
```

Edit `.env` and set unique credentials before starting:

```env
NODE_ENV=production
PORT=3000
OLLAMA_BASE_URL=http://ollama:11434
ALLO_USERNAME=choose-a-username
ALLO_PASSWORD=replace-with-a-long-random-password
ALLO_API_KEY=replace-with-a-separate-random-api-key
```

Start the stack:

```bash
docker compose up -d --build
```

Open [http://localhost:3000](http://localhost:3000), sign in, then pull a model from Explore. `llama3.2:1b` is a relatively small starting point; actual resource requirements depend on the model and hardware.

Docker Compose stores model weights in `ollama_data` and Allo workspace data in `allo_data`. The Compose configuration does not publish the Ollama port to the public network.

## Run with Node.js

Requirements: Node.js 20+ and an Ollama server reachable from the Allo process.

```bash
npm install
OLLAMA_BASE_URL=http://127.0.0.1:11434 npm start
```

Open [http://localhost:3000](http://localhost:3000). For production, set `NODE_ENV=production`, `ALLO_USERNAME` and `ALLO_PASSWORD`. Allo refuses to start in production without web login credentials.

PowerShell:

```powershell
$env:OLLAMA_BASE_URL="http://127.0.0.1:11434"
npm start
```

## Configuration

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP port for the Allo web application |
| `OLLAMA_BASE_URL` | `http://127.0.0.1:11434` | Base URL of the Ollama-compatible inference server |
| `NODE_ENV` | — | Set to `production` for production startup safeguards |
| `ALLO_USERNAME` | — | Basic-auth username; required in production |
| `ALLO_PASSWORD` | — | Basic-auth password; required in production |
| `ALLO_API_KEY` | — | Optional Bearer token for API clients |

Do not commit secrets. For public deployments, terminate HTTPS at a trusted reverse proxy, use strong unique credentials, restrict network access, and never expose the Ollama port directly to the internet. See [Security](SECURITY.md).

## OpenAI SDK compatibility

Allo exposes selected OpenAI-compatible endpoints under `/v1`:

```js
import OpenAI from "openai";
const client = new OpenAI({
  baseURL: "https://YOUR_ALLO_HOST/v1",
  apiKey: process.env.ALLO_API_KEY
});
const result = await client.chat.completions.create({
  model: "llama3.2:1b",
  messages: [{ role: "user", content: "Explain local AI." }]
});
console.log(result.choices[0].message.content);
```

See [API reference](docs/API.md) for supported routes and behavior.

## Architecture

```text
Browser UI -> Allo Node.js server -> Ollama native API
                                -> Ollama OpenAI-compatible API
                 |
                 +-> workspace.json
```

The browser talks to Allo. Allo proxies an explicit endpoint allowlist and stores a single shared workspace in a JSON file. It is not currently a multi-tenant service. See [architecture](docs/ARCHITECTURE.md) and [provider architecture](docs/PROVIDER-ARCHITECTURE.md).

## Development

```bash
npm install
npm test
node --check server.js
node --check public/app.js
```

See [development guide](docs/DEVELOPMENT.md), [contribution guide](CONTRIBUTING.md), [security policy](SECURITY.md) and [roadmap](ROADMAP.md).

## Current scope and limitations

- Allo is a control plane, not an inference engine; an Ollama-compatible server is required.
- Authentication is currently single-user Basic authentication, not user accounts, teams or role-based access control.
- Workspace persistence is a single shared JSON store, not a multi-tenant database.
- The Explore catalogue is curated, not a live mirror of every model registry.
- Tool schemas can be sent to Ollama, but returned tool calls are displayed rather than automatically executed.
- CI checks syntax and repository tests; a green run does not prove live Ollama integration or every model has been tested.

## Project direction

The goal is to make Allo a dependable, polished and extensible local-AI workspace. Planned work is tracked in [ROADMAP.md](ROADMAP.md). Bug reports and focused feature requests are welcome.

## License

MIT. See [LICENSE](LICENSE).
