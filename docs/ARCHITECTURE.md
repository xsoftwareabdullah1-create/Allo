# Allo architecture

Allo is a self-hosted AI application with its own model registry, downloader and inference-process manager. It does not require an Ollama daemon or API.

## Components
- **Browser UI** — static HTML, CSS and JavaScript in `public/`.
- **Allo server** — Express app in `server.js`; authentication, workspace persistence, model APIs and OpenAI-compatible routes.
- **Native runtime manager** — `runtime.js`; downloads GGUF files, maintains the local registry, launches and stops llama.cpp processes, and tracks loaded models.
- **Inference engine** — llama.cpp `llama-server`, compiled into the Docker image.
- **Storage** — `data/models` for model files, `data/models.json` for registry metadata, and `data/workspace.json` for chats and prompts.
- **Container image** — Docker build compiles llama.cpp and packages it with Allo.

## Request flow
1. Browser sends an authenticated request to Allo.
2. For downloads, Allo resolves a GGUF file in a Hugging Face repository and streams it into local storage.
3. For inference, Allo starts a local llama.cpp process for the selected model if one is not loaded.
4. Allo sends the chat request to that local process and adapts streaming chunks for the UI/API.
5. Registry and workspace data are persisted under `/app/data`.

## Runtime boundaries
Allo owns model discovery, download orchestration, local registry, process lifecycle, API authentication, workspace and UI. llama.cpp is the bundled inference engine. No Ollama container, daemon, URL or API is used.

The initial runtime is CPU-first. GPU acceleration, embedding mode, multimodal vision and additional model formats require separate capability work.