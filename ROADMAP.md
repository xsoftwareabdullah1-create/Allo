# Allo Roadmap

This roadmap describes intended direction, not guaranteed delivery dates. Priorities may change as the project is tested with real users.

## Product principles

1. Local-first: users choose where inference runs.
2. Transparent: explain what data leaves the browser and where it is stored.
3. Safe by default: protect model endpoints and workspace data.
4. Useful before flashy: reliability comes before visual effects.
5. Extensible: keep provider and storage boundaries understandable.

## Now — reliability foundation

- [x] Core Ollama workspace and model operations
- [x] Streaming chat and vision image inputs
- [x] OpenAI-compatible proxy endpoints
- [x] Single-user authentication and persistent workspace
- [x] Contributor, security and architecture documentation
- [ ] Automated HTTP integration tests with a mock Ollama server
- [ ] Request timeout, cancellation and upstream disconnect handling
- [ ] Security headers, request limits and structured errors
- [ ] Accessibility and mobile usability audit
- [ ] Reproducible dependency installation and dependency review

## Next — everyday AI workspace

- [ ] Searchable chat history, rename, pin and export
- [ ] Import/export workspace backup with schema versioning
- [ ] Safe Markdown rendering and code-copy actions
- [ ] Model capability labels and hardware guidance
- [ ] Live model registry search with source attribution
- [ ] Per-model generation defaults
- [ ] Document chat with local retrieval (RAG), citations and source management

## Later — extensible platform

- [ ] Provider adapter interface beyond Ollama
- [ ] Optional remote OpenAI-compatible provider configuration
- [ ] Agent workflows with explicit tool permission and execution approval
- [ ] Multi-user accounts, roles and isolated workspaces
- [ ] Database-backed storage and migrations
- [ ] Audit log, admin settings and operational metrics
- [ ] Plugin and tool integration framework

Security, data integrity and core workflow bugs take priority over new integrations. Open an issue with a concrete use case to help shape the roadmap.
