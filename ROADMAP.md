# Allo Roadmap

This roadmap describes intended direction, not guaranteed delivery dates.

## Product principles
1. Local-first: inference runs on infrastructure controlled by the user.
2. Transparent: model format, hardware requirements and data flow are documented.
3. Safe by default: protect model files, runtime processes and workspace data.
4. Useful before flashy: reliability comes before visual effects.
5. Extensible: model capabilities and runtime backends remain explicit.

## Now — native runtime
- [x] Remove the Ollama server dependency.
- [x] Bundle llama.cpp server in the Docker build.
- [x] Download GGUF models from public Hugging Face repositories.
- [x] Persist model registry and weights locally.
- [x] Start and stop local inference processes on demand.
- [x] Stream local chat responses through Allo APIs.
- [ ] Docker build verification in CI.
- [ ] Download resume, checksums and integrity verification.
- [ ] Hardware detection and memory-aware model recommendations.
- [ ] GPU-enabled build profiles.

## Next — model runtime capabilities
- [ ] Embedding model mode and vector APIs.
- [ ] Vision models with multimodal projector support.
- [ ] Gated Hugging Face authentication.
- [ ] Runtime process metrics, logs and cancellation.
- [ ] Model metadata, quantization and context inspection.
- [ ] Concurrent model scheduling with memory budgets.

## Later — platform capabilities
- [ ] Document ingestion and local RAG.
- [ ] Agent workflows with explicit tool permissions and approval.
- [ ] Additional model formats and inference backends.
- [ ] Multi-user accounts, roles and isolated workspaces.
- [ ] Database-backed history and backups.
- [ ] Plugin and tool integration framework.

Reliability, data integrity and security take priority over adding more providers or decorative features.