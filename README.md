# Allo

<p align="center">
  <strong>Your AI. Your models. Your runtime.</strong><br>
  A self-hosted AI platform that downloads and runs GGUF models without an Ollama server.
</p>

<p align="center">
  <a href="https://github.com/xsoftwareabdullah1-create/Allo/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/xsoftwareabdullah1-create/Allo/actions/workflows/ci.yml/badge.svg"></a>
  <a href="LICENSE"><img alt="MIT License" src="https://img.shields.io/badge/license-MIT-blue.svg"></a>
  <img alt="Node.js 22" src="https://img.shields.io/badge/Node.js-22-339933?logo=node.js&logoColor=white">
  <img alt="GGUF" src="https://img.shields.io/badge/models-GGUF-blue">
</p>

Allo manages its own model library, downloads model files from Hugging Face, stores them locally, starts and stops inference processes, and serves chat through its own API. It does **not** connect to or require an Ollama server.

The inference executable is built into the Allo Docker image from the open-source [llama.cpp](https://github.com/ggml-org/llama.cpp) project. The Models page can also create lightweight aliases of installed models; aliases share the source GGUF file instead of duplicating its disk usage. Allo owns the application layer: model downloads, local storage, process lifecycle, authentication, workspace and APIs. It does not claim to independently reimplement transformer inference mathematics from scratch.

## Features
- Local GGUF model library with persistent storage.
- Download GGUF files directly from Hugging Face repositories.
- Automatic selection of a Q4_K_M or Q4_0 file when available.
- Native llama.cpp inference process management.
- Streaming chat, Markdown-formatted answers and local model selection.
- First-run onboarding that downloads a starter AI model with one click.
- Model inspection, deletion and local file copy.
- OpenAI-compatible chat and model-list API.
- Persistent chat and prompt workspace.
- No Ollama daemon, container or API dependency. Local GGUF inference does not require a cloud key.

## Quick start — Docker
Requirements: Docker Engine with Compose plugin. The first build compiles the bundled CPU llama.cpp server and can take several minutes. Model downloads require additional disk space and RAM.

```bash
git clone https://github.com/xsoftwareabdullah1-create/Allo.git
cd Allo
cp .env.example .env
```

Edit `.env` and set strong unique credentials:

```env
NODE_ENV=production
PORT=3000
ALLO_USERNAME=choose-a-username
ALLO_PASSWORD=replace-with-a-long-random-password
ALLO_API_KEY=replace-with-a-separate-random-api-key
ALLO_ENCRYPTION_KEY=replace-with-a-long-random-32-byte-secret
ALLO_MAX_LOADED_MODELS=1
ALLO_CONTEXT_SIZE=4096
ALLO_GPU_LAYERS=0
```

Build and start:

```bash
docker compose up -d --build
```

Open [http://localhost:3000](http://localhost:3000) and sign in. On first launch, choose **Download starter model**. Allo downloads a small Qwen 2.5 0.5B GGUF model (roughly 490 MB for the recommended Q4_K_M quantization) from Hugging Face; after the download completes, select it in Chat and send your first message. You can also open **Models** to install a larger model. The starter model is intentionally small and is useful for trying the runtime, not a top-tier reasoning model. The model weights are not bundled in the Git repository because they are large files.

```text
Qwen/Qwen2.5-0.5B-Instruct-GGUF
```

Allo selects a GGUF file and downloads it into its persistent model store. To choose a specific file, use `owner/repository:folder/model-file.Q4_K_M.gguf`. A small quantized model is a better starting point for machines with limited RAM.

## Run without Docker
Requirements: Node.js 20+ and a locally installed `llama-server` executable from llama.cpp. If startup reports `spawn llama-server ENOENT`, the inference executable is missing or not on `PATH`; Allo now reports this explicitly at `/health` and `/api/config`. Install/build llama.cpp, then set `ALLO_LLAMACPP_BIN` to the full path of the executable. For hosted deployments, use the repository Dockerfile or Docker Compose so the inference engine is built into the image; a generic Node-only deployment will not contain `llama-server` automatically.

```bash
npm install
ALLO_LLAMACPP_BIN=/path/to/llama-server npm start
```

Allo stores model files in `data/models`, the model registry in `data/models.json`, and workspace data in `data/workspace.json`.

## Runtime configuration
| Variable | Default | Purpose |
|---|---:|---|
| `PORT` | `3000` | Allo web/API port |
| `ALLO_LLAMACPP_BIN` | `llama-server` | llama.cpp server executable |
| `ALLO_MAX_LOADED_MODELS` | `1` | Maximum inference processes kept loaded |
| `ALLO_CONTEXT_SIZE` | `4096` | Context window passed to llama-server |
| `ALLO_GPU_LAYERS` | `0` | GPU offload layers; bundled Docker image is CPU-first |
| `ALLO_MAX_MODEL_BYTES` | `53687091200` | Maximum download size (50 GiB) |
| `ALLO_MODEL_START_TIMEOUT` | `180000` | Model startup timeout in milliseconds |
| `ALLO_INFERENCE_TIMEOUT` | `900000` | Inference request timeout in milliseconds |
| `ALLO_USERNAME` | — | Web login username; required in production |
| `ALLO_PASSWORD` | — | Web login password; required in production |
| `ALLO_API_KEY` | — | Optional Bearer token for SDK clients |

Downloaded weights and workspace data persist in the Docker volume `allo_data`. Do not delete this volume unless you intend to delete the downloaded models and workspace.

## OpenAI-compatible API
Allo exposes `GET /v1/models` and `POST /v1/chat/completions` for local models:

```js
import OpenAI from "openai";
const client = new OpenAI({ baseURL: "http://localhost:3000/v1", apiKey: process.env.ALLO_API_KEY });
const result = await client.chat.completions.create({
  model: "Qwen/Qwen2.5-0.5B-Instruct-GGUF:Qwen2.5-0.5B-Instruct-Q4_K_M.gguf",
  messages: [{ role: "user", content: "Hello from Allo" }]
});
console.log(result.choices[0].message.content);
```

Use the exact model ID returned by `GET /v1/models`. See [API docs](docs/API.md).

## Architecture
```text
Browser / SDK -> Allo Node.js application
                    |-- model registry and workspace
                    |-- Hugging Face GGUF downloader
                    +-- llama-server process manager
                              |
                              +-- local GGUF files and CPU inference
```

Allo has no Ollama dependency. llama.cpp is the bundled inference engine; Allo owns model management and orchestration.

## Current limitations
- The bundled Docker runtime is CPU-first; GPU acceleration is not configured in this initial build.
- GGUF models are supported; other model formats are not.
- One model is loaded by default. Increase `ALLO_MAX_LOADED_MODELS` only if the host has sufficient RAM.
- The currently implemented inference path supports text chat and OpenAI-compatible chat completions. Embeddings, vision, model publishing and custom Modelfiles are not implemented yet.
- Public/private gated Hugging Face repository authentication is not implemented.
- Authentication is single-user Basic authentication, not multi-user accounts.
- The project does not claim to have authored the underlying inference engine from scratch; llama.cpp is included under its upstream license.

## Development
```bash
npm install
npm test
node --check server.js
node --check runtime.js
node --check public/app.js
```

See [architecture](docs/ARCHITECTURE.md), [API reference](docs/API.md), [security policy](SECURITY.md), [contribution guide](CONTRIBUTING.md), [roadmap](ROADMAP.md) and [third-party notices](THIRD_PARTY_NOTICES.md).

## License
MIT for Allo's code. The bundled llama.cpp component retains its upstream license; see the [llama.cpp repository](https://github.com/ggml-org/llama.cpp) for details.

## Connect cloud AI providers
Allo also supports a multi-provider gateway for OpenAI, Claude, Gemini, DeepSeek, Groq, OpenRouter, Together AI, Fireworks, Mistral, xAI, Cerebras, Perplexity and custom OpenAI-compatible HTTPS APIs. Choose a provider in the chat model selector, then configure its API key and model in Settings.

Before saving a provider key, set `ALLO_ENCRYPTION_KEY` on the server to a persistent random secret (generate one with `openssl rand -hex 32`). Allo encrypts provider credentials at rest using AES-256-GCM. Keep this secret backed up and unchanged; losing it makes existing provider keys unreadable. Cloud API usage may be paid and requires provider credentials. The built-in local GGUF runtime remains available without cloud keys.

## Cloud AI providers and billing
Allo includes provider presets for OpenAI, Claude, Gemini, DeepSeek, Groq, OpenRouter, Together, Fireworks, Mistral, xAI, Cerebras, Perplexity, Cohere, NVIDIA NIM, Hugging Face Inference, Qwen/DashScope, Moonshot Kimi, Z.ai/GLM, SiliconFlow, Novita, Inference.net, AWS Bedrock, Cloudflare Workers AI, Vercel AI Gateway, SambaNova, Hyperbolic, DeepInfra and MiniMax. A custom OpenAI-compatible HTTPS endpoint can connect additional gateways and self-hosted servers. Aggregators can expose large and changing model catalogs; use Settings → Discover available models to query the selected provider. Discovery uses each provider’s model-list API (OpenAI-compatible `/models`, Anthropic `/models`, or Gemini `/models`). Choose a returned model, then click Save provider before chatting. Current starter defaults include GPT-6.2 Astra, Claude Opus 5.5, Gemini 3.8 Flash and DeepSeek Flash; actual access depends on your provider account and key.

Set `ALLO_ENCRYPTION_KEY` in `.env` before saving cloud credentials. Generate a persistent value using `openssl rand -hex 32`; never rotate or lose it without first migrating encrypted credentials. Allo tracks request and token usage returned by providers. For estimated USD cost, enter current input/output price per million tokens from each provider's pricing page and optionally set a monthly budget. These are estimates only, not provider invoices or live account balances. Actual billing, credits, taxes and account limits are controlled by each provider. Local GGUF use has no cloud API billing.
