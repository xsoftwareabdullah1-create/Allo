# Inference engine architecture

## Current runtime
Allo bundles llama.cpp's `llama-server` executable in its Docker image. The runtime manager downloads GGUF files, maintains a local registry, starts inference processes on demand and adapts responses for the Allo UI/API. There is no Ollama server dependency.

## Why llama.cpp
GGUF is a practical format for local quantized inference across CPU and supported accelerator backends. Building llama.cpp into the Allo image provides a local inference executable without requiring users to install or operate an Ollama daemon.

Allo does not claim that its current code independently implements transformer kernels. The project owns the orchestration and application layer; llama.cpp supplies the low-level inference engine under its upstream license.

## Planned engine work
- GPU-specific build profiles and hardware detection.
- Embedding model process mode.
- Vision models with explicit multimodal projector support.
- Runtime health, memory estimates and process metrics.
- Download resume, checksums and model metadata validation.
- Additional backends behind an explicit capability interface.

## Security requirements
- Fetch model files only from the Hugging Face host; do not accept arbitrary download URLs.
- Validate repository IDs and file paths before writing to disk.
- Bound model download size and persist partial downloads separately.
- Never expose local runtime ports to the public network.
- Keep API credentials server-side.
- Treat model files as untrusted input and keep runtime processes isolated.