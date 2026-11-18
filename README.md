# Allo

**A self-hosted AI workspace and model control plane powered by Ollama.**

Allo gives you one web interface to chat with local models, discover and manage models, compare model outputs, create reusable prompts, generate embeddings and use Ollama through native or OpenAI-compatible APIs.

> Allo is the web application and control plane. Ollama is the inference runtime that stores model weights and performs generation.

## Workspace

| Module | Capabilities |
|---|---|
| Chat | Streaming conversations, model selection, system instructions, temperature, context size and keep-alive controls |
| Model management | Installed model list, metadata, pull, copy, create, push and delete |
| Explore | Searchable featured model catalogue with one-click pull |
| Running | Inspect models currently loaded by the Ollama server |
| Compare | Run the same prompt against two installed models side by side |
| Prompt library | Save, reuse and delete prompt templates with server-side persistence |
| Embeddings | Generate and inspect vectors with installed embedding models |
| API playground | Send requests to selected native Ollama endpoints |
| API compatibility | Proxy OpenAI-compatible models, chat completions, completions and embeddings |
| Settings | Connection status, server health and deployment configuration |

## Quick start with Docker Compose

1. Clone the repository.
2. Copy `.env.example` to `.env`.
3. Replace the example username, password and API key with strong unique secrets.
4. Start Allo and Ollama:

```bash
docker compose up -d --build
```

Open http://localhost:3000 and sign in with the credentials from `.env`.

Pull your first model in **Explore models** or **Model library**. For example, `llama3.2:1b` is a small starting point; hardware requirements vary by model.

Docker Compose persists downloaded model weights in the `ollama_data` volume. The Ollama port is bound to localhost on the host rather than exposed publicly.

## Run without Docker

Requirements: Node.js 20+ and an Ollama server reachable from the machine running Allo.

```bash
npm install
OLLAMA_BASE_URL=http://127.0.0.1:11434 npm start
```

Open http://localhost:3000.

PowerShell:

```powershell
$env:OLLAMA_BASE_URL="http://127.0.0.1:11434"
npm start
```

For production, configure `NODE_ENV=production`, `ALLO_USERNAME`, and `ALLO_PASSWORD`. The server refuses to start in production without web login credentials.

## Configuration

| Variable | Purpose |
|---|---|
| `PORT` | Allo HTTP port; defaults to `3000` |
| `OLLAMA_BASE_URL` | Ollama server URL; defaults to `http://127.0.0.1:11434` |
| `NODE_ENV` | Set to `production` for production safeguards |
| `ALLO_USERNAME` | Web login username; required in production |
| `ALLO_PASSWORD` | Web login password; required in production |
| `ALLO_API_KEY` | Optional separate Bearer token for API clients |

Keep secrets in `.env` or a deployment secret manager. Do not commit real credentials. Put public deployments behind HTTPS. Do not expose the Ollama inference port directly to the internet.

## OpenAI SDK compatibility

Allo proxies selected OpenAI-compatible Ollama endpoints under `/v1`. Configure an SDK with your Allo URL and the `ALLO_API_KEY` Bearer token:

```js
import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://YOUR_ALLO_HOST/v1",
  apiKey: process.env.ALLO_API_KEY
});

const response = await client.chat.completions.create({
  model: "llama3.2:1b",
  messages: [{ role: "user", content: "Explain local AI." }]
});

console.log(response.choices[0].message.content);
```

## Native API routes

Allo allowlists selected Ollama endpoints, including `/api/tags`, `/api/ps`, `/api/version`, `/api/chat`, `/api/generate`, `/api/pull`, `/api/push`, `/api/show`, `/api/copy`, `/api/create`, `/api/delete`, `/api/embed`, and `/api/embeddings`.

See [API documentation](docs/API.md) and the [official Ollama API reference](https://docs.ollama.com/api).

## Development and tests

```bash
npm install
npm test
node --check server.js
node --check public/app.js
```

See [development guide](docs/DEVELOPMENT.md) and [architecture](docs/ARCHITECTURE.md).

## Current limitations

- Single-user web login; no multi-user roles or team workspaces yet.
- Chat history and prompt templates sync to the Allo server's JSON workspace store; this is a single-user store, not a multi-tenant database.
- The featured model catalogue is a curated list, not a live mirror of the full Ollama library.
- Model execution requires an Ollama server and compatible hardware.
- Public deployment requires HTTPS and secure secret management.

## License

MIT
