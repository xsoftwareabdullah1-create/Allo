# Allo architecture

Allo is a browser-based control plane for an Ollama inference server. It does not implement model inference or store model weights itself.

## Components

- **Browser UI** — static HTML, CSS and JavaScript in `public/`; chat history and prompt snippets are stored in the current browser's local storage.
- **Allo server** — Express application in `server.js`; serves the UI, applies authentication, validates allowed proxy routes and streams upstream responses.
- **Workspace store** — `data/workspace.json` persists chats and prompt templates; mount `/app/data` as a persistent volume.
- **Inference runtime** — Ollama, configured with `OLLAMA_BASE_URL`. Model weights and running model processes live on the Ollama host.
- **Container deployment** — Docker Compose can run both Allo and Ollama with a persistent model volume.

## Request flow

1. The browser calls a same-origin Allo endpoint.
2. The Allo server checks the user's Basic credentials or configured Bearer API key.
3. Only explicitly allowlisted Ollama API paths are forwarded.
4. Streaming response chunks are relayed to the browser without buffering the entire completion.
5. The browser renders the response and updates its local chat history.

## API surfaces

- `/api/*` — selected native Ollama endpoints.
- `/v1/*` — selected OpenAI-compatible Ollama endpoints for SDK integrations.
- `/api/workspace` — authenticated chat and prompt persistence endpoint.
- `/health` — Allo process health check.

## Security

- Set `NODE_ENV=production` and configure `ALLO_USERNAME` and `ALLO_PASSWORD`.
- Set a separate `ALLO_API_KEY` for SDK clients that authenticate with Bearer tokens.
- Terminate public traffic with HTTPS at a trusted reverse proxy.
- Do not expose the Ollama port publicly. The Compose file binds it to loopback on the host.
- Keep secrets in an untracked `.env` file or deployment secret manager.
- The proxy allowlist is intentional. Do not turn it into an unrestricted URL-forwarding endpoint.
- Do not put API credentials into browser JavaScript or commit real secrets.

## Current boundaries

Allo is a single-user deployment with browser-local chat and prompt storage. It does not yet provide multi-user accounts, server-side conversation sync, team permissions, billing, hosted inference, or a remote model registry of its own.
