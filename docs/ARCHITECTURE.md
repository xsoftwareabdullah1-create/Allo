# Allo architecture

Allo is an independent, self-hosted AI platform. It is not an Ollama wrapper and does not require an Ollama daemon or API.

## Current production components
- **Browser UI** — static HTML, CSS and JavaScript in `public/`.
- **Allo server** — Express app in `server.js`; authentication, workspace persistence, model APIs and OpenAI-compatible routes.
- **Runtime manager** — `runtime.js`; downloads GGUF files, maintains the local registry, launches and stops inference processes, and tracks loaded models.
- **Current inference backend** — llama.cpp `llama-server`, compiled into the Docker image. This is an implementation dependency today, not the intended permanent product boundary.
- **Storage** — `data/models` for model files, `data/models.json` for registry metadata, and `data/workspace.json` for chats and prompts.

## Polyglot target architecture
The repository is moving toward explicit language boundaries rather than mixing languages arbitrarily:

| Technology | Responsibility |
|---|---|
| C++ | Native inference engine, tensor execution, scheduling and device backends |
| C | Stable ABI, low-level platform and hardware interfaces |
| CMake | Native builds, feature flags and platform toolchains |
| Go | Long-running control-plane services, process supervision and distribution tooling |
| TypeScript | Web application, typed API client and developer SDK |
| Objective-C / Swift | Apple platform and system-framework integration |
| Kotlin / Java | Android application and platform integration |
| Python | Model conversion, evaluation, fine-tuning and ML tooling |

Not every language is required in every binary. Platform-specific components are built only on supported operating systems.

## Native engine status
`engine/` currently provides:
- A versioned C ABI header usable by C, C++, Go/cgo and native language bindings.
- A C++ shared library with engine metadata and diagnostic functions.
- A CMake build and native contract test.

This is an ABI foundation only. Model loading, tokenization, tensor operations, sampling, KV cache, quantization kernels, GPU execution and token streaming are not implemented in this library yet. The root application still uses llama.cpp for actual inference.

## Request flow today
1. Browser sends an authenticated request to the Node.js Allo server.
2. For downloads, Allo resolves a GGUF file in a Hugging Face repository and streams it into local storage.
3. For inference, Allo starts a local llama.cpp process for the selected model if one is not loaded.
4. Allo sends the chat request to that process and adapts streaming chunks for the UI/API.
5. Registry and workspace data are persisted under `/app/data`.

## Migration principles
1. Keep the public API stable while backends change behind an adapter boundary.
2. Add a backend only after build, ABI, model-load, generation and cancellation tests pass.
3. Keep model format and hardware capabilities explicit.
4. Do not claim a feature is supported until an end-to-end test exercises it.
5. Preserve data directories and credential encryption across upgrades.
