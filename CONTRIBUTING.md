# Contributing to Allo

Contributions should improve reliability, usability, security or extensibility.

## Before you start

1. Read the README, `docs/ARCHITECTURE.md` and `ROADMAP.md`.
2. Search existing issues before opening a new one.
3. For substantial changes, open an issue first to agree on scope.
4. Never commit credentials, private prompts, model weights or personal data.

## Development setup

Requirements: Node.js 20+ and an Ollama server for live inference testing.

```bash
git clone https://github.com/xsoftwareabdullah1-create/Allo.git
cd Allo
npm install
npm test
npm start
```

Set `OLLAMA_BASE_URL` if Ollama is not at `http://127.0.0.1:11434`.

## Pull request expectations

- Keep changes focused and explain the user problem they solve.
- Preserve the explicit Ollama endpoint allowlist.
- Validate and bound external input.
- Handle upstream errors and streaming disconnects cleanly.
- Keep secrets out of source, logs, screenshots and fixtures.
- Add or update tests for changed behavior.
- Update docs when routes, configuration, limitations or setup steps change.
- Run `npm test`, `node --check server.js` and `node --check public/app.js`.

## Code style

The current project uses plain JavaScript, CommonJS on the server and browser-native JavaScript with no frontend build step. Follow existing conventions unless a proposal explicitly changes the stack.

Avoid unnecessary dependencies. Do not silently add telemetry, analytics or cloud data transfer; such features require clear documentation and user control.
