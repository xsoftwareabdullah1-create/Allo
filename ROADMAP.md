# Allo Roadmap

This roadmap describes intended direction, not guaranteed delivery dates. Checked items are implemented in the repository; unchecked items are not yet complete.

## Product principles
1. Independent platform: no Ollama daemon, API or copied Ollama implementation.
2. Local-first: inference runs on infrastructure controlled by the user.
3. Transparent: model format, hardware requirements and data flow are documented.
4. Safe by default: protect model files, runtime processes and workspace data.
5. Extensible: keep inference backends behind a stable, tested ABI.

## Foundation — current
- [x] Remove the Ollama server dependency.
- [x] Own model registry, GGUF downloader and runtime process manager.
- [x] OpenAI-compatible local chat and model-list API.
- [x] C/C++ native engine ABI scaffold.
- [x] CMake build and native ABI contract test.
- [x] CI job for native C/C++ build and contract test.
- [ ] Replace current llama.cpp production backend with the independent Allo engine.
- [ ] TypeScript frontend/API SDK migration.
- [ ] Go control-plane and process supervisor.
- [ ] Objective-C/Swift Apple platform adapter.
- [ ] Kotlin/Java Android integration.

## Native inference engine
- [ ] GGUF parser and safe model loader.
- [ ] Tokenizer and vocabulary support.
- [ ] Tensor graph and CPU execution backend.
- [ ] Quantized kernels and memory-mapped weights.
- [ ] KV cache, batching and scheduler.
- [ ] Streaming generation, cancellation and structured errors.
- [ ] Metal backend for Apple devices.
- [ ] CUDA and Vulkan backends where available.
- [ ] Model compatibility and numerical regression suite.

## Model platform
- [x] Download public GGUF models from Hugging Face.
- [x] Persist model registry and weights locally.
- [ ] Resumable downloads, checksums and integrity verification.
- [ ] Model metadata, context and quantization inspection.
- [ ] More model formats and importers.
- [ ] Model packaging, templates and reproducible configuration.
- [ ] Publishing and registry distribution.

## AI capabilities
- [ ] Embeddings and vector APIs.
- [ ] Vision and multimodal input.
- [ ] Audio input/output and speech models.
- [ ] Document ingestion and local RAG.
- [ ] Agent workflows with explicit tool permissions and approval.
- [ ] Fine-tuning and LoRA workflows.

## Platform and operations
- [ ] Hardware detection and memory-aware model recommendations.
- [ ] GPU-enabled build profiles.
- [ ] Multi-model scheduling with memory budgets.
- [ ] Multi-user accounts, roles and isolated workspaces.
- [ ] Database-backed history, backups and migrations.
- [ ] Plugin and tool integration framework.
- [ ] Windows, Linux, macOS, Android and container packaging.

Reliability, data integrity, security and tested inference take priority over adding decorative features or unsupported capability claims.
