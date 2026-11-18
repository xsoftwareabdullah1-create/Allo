# Development

## Requirements
- Node.js 20 or newer
- npm
- A local `llama-server` executable for inference testing; Docker builds and bundles it automatically.

## Install
```bash
npm install
cp .env.example .env
ALLO_LLAMACPP_BIN=/path/to/llama-server npm run dev
```

Allo stores downloaded GGUF files under `data/models`. The model registry and workspace are stored under `data/`. No Ollama server or external inference API is required.

## Test
```bash
npm test
node --check server.js
node --check runtime.js
node --check public/app.js
```

## Runtime notes
- Public GGUF repositories are resolved through the Hugging Face model tree API.
- The first Docker build compiles llama.cpp from source.
- CPU inference is the default; GPU support needs a matching build and host configuration.
- Use small quantized models for development machines with limited memory.

## Contribution rules
- Keep model repository and file-path validation strict.
- Never accept arbitrary download URLs from browser input.
- Preserve download size limits and atomic registry writes.
- Handle process startup failures, request cancellation and streaming errors.
- Do not commit API keys, passwords, model weights or local environment files.
- Add tests for new runtime behavior and document unsupported model capabilities.