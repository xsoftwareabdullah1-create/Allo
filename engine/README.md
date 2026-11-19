# Allo Native Engine

This directory establishes Allo's independent, language-neutral native engine ABI.

## Build

```sh
cmake -S engine -B build/engine -DCMAKE_BUILD_TYPE=Release
cmake --build build/engine --config Release
ctest --test-dir build/engine --output-on-failure
```

## Current status

The C/C++ shared library and C ABI metadata/diagnostic contract are implemented. **This is not yet an inference engine**: model loading, tokenization, tensor execution, sampling, KV cache, device backends and streaming generation are not implemented here. The existing production inference path remains the separately built llama.cpp runtime in the root Dockerfile. Future backends must implement the ABI and pass contract tests before the Node.js gateway can select them.

CMake is used for portable native builds. The exported C ABI is intended to let Go, TypeScript/Node native bindings, Swift and Objective-C clients integrate without depending on C++ ABI details.
