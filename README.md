# Allo

**A self-hosted AI workspace for Ollama-compatible model servers.**

Allo provides a responsive web interface for chatting with local models and managing the models installed on your Ollama server.

## Features

- Streaming chat with conversation context
- Model discovery, pull progress, details and deletion
- Running-model list and stop requests
- Ollama API connection status and health check
- Mobile-responsive dark interface
- Node.js API proxy to avoid browser CORS issues
- Configurable Ollama server endpoint

## Requirements

- Node.js 20+
- An Ollama server reachable from the machine running Allo

## Run locally

```bash
npm install
OLLAMA_BASE_URL=http://127.0.0.1:11434 npm start
```

Open http://localhost:3000.

On Windows PowerShell:

```powershell
$env:OLLAMA_BASE_URL="http://127.0.0.1:11434"
npm start
```

## Configuration

Set `OLLAMA_BASE_URL` on the Allo server. It defaults to `http://127.0.0.1:11434`. If Ollama runs on another computer, set this to that server's reachable address.

For a public deployment, set `NODE_ENV=production`, `ALLO_USERNAME`, and `ALLO_PASSWORD`. Allo requires credentials in production and protects the web interface and API with HTTP Basic Authentication. Use HTTPS, strong credentials, network restrictions, and keep the Ollama API on a trusted network.

## API

Allo proxies the following Ollama API endpoints: `/api/tags`, `/api/ps`, `/api/version`, `/api/chat`, `/api/generate`, `/api/pull`, `/api/show`, `/api/delete`, `/api/copy`, `/api/create`, and `/api/embeddings`.

Official API reference: https://docs.ollama.com/api

## Deployment

Deploy on a Node.js host that supports long-lived HTTP streaming. Set `OLLAMA_BASE_URL` to an Ollama endpoint reachable from that host. A static-only host cannot run the included proxy. For a public deployment, configure authentication, HTTPS, network restrictions and request limits first.

## License

MIT
