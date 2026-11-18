# Development

## Requirements

- Node.js 20 or newer
- npm
- An Ollama server for end-to-end inference testing

## Install

```bash
npm install
cp .env.example .env
npm run dev
```

Set `OLLAMA_BASE_URL` to the reachable Ollama URL. In a local non-production development environment, Basic authentication is optional. Never use that configuration on a public host.

## Validation

```bash
node --check server.js
node --check public/app.js
npm test
```

## Project layout

- `server.js` — Express server, authentication and API proxy.
- `public/index.html` — application views and navigation.
- `public/styles.css` — responsive interface.
- `public/app.js` — chat, model management and workspace modules.
- `tests/` — Node built-in test suite.
- `docs/` — architecture and API documentation.

## Contribution rules

- Keep the Ollama proxy allowlist explicit.
- Do not commit API keys, passwords, model weights or local environment files.
- Preserve streaming responses; do not buffer long model output unnecessarily.
- Add tests for new API routes and user-facing modules.
- Keep the interface usable on narrow mobile screens.
