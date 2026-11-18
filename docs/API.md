# Allo API reference

All endpoints are served by Allo. Production web access uses Basic authentication; SDK clients may use `Authorization: Bearer YOUR_ALLO_API_KEY` when configured.

## Native Allo endpoints
| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Allo and runtime health |
| GET | `/api/config` | Runtime configuration summary |
| GET | `/api/tags` | List locally downloaded GGUF models |
| GET | `/api/ps` | List currently loaded inference processes |
| GET | `/api/version` | Allo runtime version |
| POST | `/api/pull` | Download a GGUF model from Hugging Face |
| POST | `/api/chat` | Streaming or non-streaming chat |
| POST | `/api/generate` | Prompt generation or stop a loaded model |
| POST | `/api/show` | Inspect local model metadata |
| POST | `/api/delete` | Delete a local model |
| POST | `/api/copy` | Copy a local model file |
| GET | `/api/workspace` | Read saved chats and prompts |
| PUT | `/api/workspace` | Save chats and prompts |

## Download request
```json
{ "model": "Qwen/Qwen2.5-0.5B-Instruct-GGUF", "stream": true }
```

Choose a specific file:
```json
{ "model": "owner/repository:folder/model.Q4_K_M.gguf", "stream": true }
```

The response is newline-delimited JSON progress events with `status`, `completed` and `total` fields.

## OpenAI-compatible endpoints
| Method | Path | Status |
|---|---|---|
| GET | `/v1/models` | Implemented |
| POST | `/v1/chat/completions` | Implemented |
| POST | `/v1/completions` | Experimental |
| POST | `/v1/embeddings` | Not yet implemented (501) |

Use the exact local model ID returned by `GET /v1/models`.

## Runtime notes
Allo downloads GGUF model files from Hugging Face and starts a local `llama-server` process on demand. It does not proxy requests to an Ollama server. The Docker image builds the inference executable from llama.cpp source.

The initial release is CPU-first and chat-focused. Embeddings, vision, gated Hugging Face authentication and model publishing are planned but not implemented.
## Universal cloud provider gateway
Allo can connect multiple hosted providers without Ollama. Supported presets include OpenAI, Anthropic Claude, Google Gemini, DeepSeek, Groq, OpenRouter, Together AI, Fireworks AI, Mistral, xAI, Cerebras and Perplexity, plus a custom OpenAI-compatible HTTPS endpoint.

Configure a persistent server environment variable named `ALLO_ENCRYPTION_KEY` before saving provider credentials. Use a long random secret (for example, `openssl rand -hex 32`) and keep it unchanged across restarts. Provider API keys are encrypted with AES-256-GCM in `data/providers.enc`; keys are never returned by the provider-list API. If this secret is lost or changed, saved provider credentials cannot be decrypted. Cloud providers may charge for usage and require their own API keys.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/providers` | List provider presets and connection status (never returns keys) |
| PUT | `/api/providers/:id` | Save an API key, model ID and optional base URL |
| DELETE | `/api/providers/:id` | Remove saved provider credentials |
| POST | `/api/providers/:id/test` | Send a short test request |
| POST | `/api/providers/chat` | Send a non-streaming chat request through a configured provider |

Example provider configuration: `PUT /api/providers/openai` with `{ "apiKey": "YOUR_KEY", "model": "gpt-4o-mini" }`. The `custom` provider additionally requires an HTTPS `baseUrl` and model ID. Chat requests use `{ "provider": "openai", "messages": [{ "role": "user", "content": "Hello" }] }`.
