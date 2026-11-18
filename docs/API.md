# Allo API reference

All requests are made to the Allo server. In production, use Basic authentication for the web interface. SDK clients can use `Authorization: Bearer YOUR_ALLO_API_KEY` when `ALLO_API_KEY` is configured.

## Native Ollama proxy

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/tags` | List installed models |
| GET | `/api/ps` | List loaded models |
| GET | `/api/version` | Runtime version |
| POST | `/api/chat` | Chat completion |
| POST | `/api/generate` | Text generation |
| POST | `/api/pull` | Download a model |
| POST | `/api/push` | Publish a model to a registry |
| POST | `/api/push` | Push a model to a registry |
| POST | `/api/show` | Model metadata and template |
| POST | `/api/copy` | Copy a model tag |
| POST | `/api/create` | Create a model from a Modelfile |
| POST | `/api/delete` | Delete a model |
| POST | `/api/embed` | Generate embeddings |
| POST | `/api/embed` | Generate embeddings |
| POST | `/api/embeddings` | Legacy embeddings endpoint |

## OpenAI-compatible proxy

| Method | Path |
|---|---|
| GET | `/v1/models` |
| POST | `/v1/chat/completions` |
| POST | `/v1/completions` |
| POST | `/v1/embeddings` |

Example using an OpenAI-compatible SDK:

```js
import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://YOUR_ALLO_HOST/v1",
  apiKey: process.env.ALLO_API_KEY
});

const result = await client.chat.completions.create({
  model: "llama3.2:1b",
  messages: [{ role: "user", content: "Hello" }]
});

console.log(result.choices[0].message.content);
```

## Notes

Allo forwards request bodies to Ollama. Model names must exist on the connected Ollama server. Streaming is supported by the proxy; client SDKs should consume streamed responses when `stream: true` is requested.

For full request and response schemas, see the [Ollama API documentation](https://docs.ollama.com/api).
