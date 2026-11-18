# Provider Architecture

## Current implementation

Allo currently targets an Ollama-compatible server. The server uses one configured `OLLAMA_BASE_URL` and proxies a strict allowlist of native `/api/*` and OpenAI-compatible `/v1/*` routes.

The browser talks to Allo, not directly to Ollama. This keeps the upstream address in server configuration and provides one place for authentication and request policy.

## Why an adapter boundary matters

Supporting additional inference providers should not spread provider-specific URL and payload assumptions across the browser UI. A future provider layer should expose a capability-oriented contract:

- list models
- inspect model capabilities
- create streaming and non-streaming chat completions
- create text completions where supported
- create embeddings where supported
- manage model weights only when the provider supports those operations

Unsupported capabilities must be explicit. A provider that cannot manage local weights should not display Ollama-only actions.

## Proposed adapter contract

This is a design target, not an implemented API:

```js
{
  id: "ollama",
  capabilities: { chat: true, streaming: true, embeddings: true, modelManagement: true },
  listModels(),
  chat(request, { signal }),
  embeddings(request),
  inspectModel(name)
}
```

## Security requirements

- Provider credentials belong on the server and must never be returned to browser configuration endpoints.
- Provider base URLs must be administrator-controlled and validated to avoid SSRF.
- Never forward browser-supplied arbitrary URLs.
- Apply request size limits, timeouts, cancellation and normalized errors.
- Clearly identify remote destinations; never silently transmit prompts or files to a remote provider.

## Migration approach

1. Keep current Ollama behavior stable behind its adapter.
2. Define capability tests before adding a second provider.
3. Add one provider at a time with mocked HTTP integration tests.
4. Document data flow, credential storage and unsupported operations for each provider.
