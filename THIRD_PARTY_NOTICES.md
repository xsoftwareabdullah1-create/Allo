# Third-party notices

## llama.cpp

Allo's Docker image builds the `llama-server` executable from the upstream [ggml-org/llama.cpp](https://github.com/ggml-org/llama.cpp) source repository. llama.cpp is distributed under the MIT License. Its copyright and license terms remain with its upstream authors; see the upstream repository's `LICENSE` file.

Allo does not vendor the llama.cpp source into this repository. The Docker build downloads the upstream source at image-build time and compiles the inference executable.

## Node.js dependencies

The web server uses Express. See the npm package metadata and upstream project for its license and notices.
