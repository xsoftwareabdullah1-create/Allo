# Build Allo's bundled CPU inference runtime from llama.cpp.
FROM node:22-bookworm AS build-runtime
RUN apt-get update && apt-get install -y --no-install-recommends build-essential cmake git libcurl4-openssl-dev libssl-dev && rm -rf /var/lib/apt/lists/*
RUN git clone --depth 1 https://github.com/ggml-org/llama.cpp.git /opt/llama.cpp \
 && cmake -S /opt/llama.cpp -B /opt/llama.cpp/build -DCMAKE_BUILD_TYPE=Release -DCMAKE_INSTALL_PREFIX=/opt/llama-install -DGGML_NATIVE=OFF -DGGML_OPENMP=ON -DLLAMA_BUILD_SERVER=ON -DLLAMA_BUILD_TESTS=OFF -DLLAMA_BUILD_EXAMPLES=OFF \
 && cmake --build /opt/llama.cpp/build --config Release --target llama-server -j2 \
 && cmake --install /opt/llama.cpp/build

FROM node:22-bookworm-slim
ENV NODE_ENV=production
ENV PORT=3000
ENV ALLO_LLAMACPP_BIN=/opt/llama-install/bin/llama-server
ENV LD_LIBRARY_PATH=/opt/llama-install/lib
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 libcurl4 libssl3 && rm -rf /var/lib/apt/lists/*
COPY --from=build-runtime /opt/llama-install /opt/llama-install
RUN /opt/llama-install/bin/llama-server --version
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
RUN mkdir -p /app/data/models && chown -R node:node /app
USER node
EXPOSE 3000
VOLUME ["/app/data"]
CMD ["npm","start"]
