const fs = require("node:fs/promises");
const path = require("node:path");
const { spawn } = require("node:child_process");

const DATA_DIR = path.join(__dirname, "data");
const MODELS_DIR = path.join(DATA_DIR, "models");
const REGISTRY_FILE = path.join(DATA_DIR, "models.json");
const SERVER_BIN = process.env.ALLO_LLAMACPP_BIN || "llama-server";
const BASE_PORT = Number(process.env.ALLO_RUNTIME_PORT || 12000);
const MAX_LOADED = Math.max(1, Number(process.env.ALLO_MAX_LOADED_MODELS || 1));
const MAX_MODEL_BYTES = Number(process.env.ALLO_MAX_MODEL_BYTES || 50 * 1024 ** 3);

class AlloRuntime {
  constructor() {
    this.models = new Map();
    this.processes = new Map();
    this.nextPort = BASE_PORT;
    this.downloads = new Map();
  }

  async init() {
    await fs.mkdir(MODELS_DIR, { recursive: true });
    try {
      const saved = JSON.parse(await fs.readFile(REGISTRY_FILE, "utf8"));
      for (const item of saved.models || []) {
        if (item && typeof item.id === "string" && typeof item.file === "string") {
          const absolute = path.resolve(MODELS_DIR, item.file);
          if (absolute.startsWith(MODELS_DIR + path.sep)) {
            try {
              await fs.access(absolute);
              this.models.set(item.id, { ...item, path: absolute });
            } catch {}
          }
        }
      }
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    return this;
  }

  async save() {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const models = [...this.models.values()].map(({ path: _path, ...item }) => item);
    const temp = REGISTRY_FILE + "." + process.pid + ".tmp";
    await fs.writeFile(temp, JSON.stringify({ version: 1, models }, null, 2), { mode: 0o600 });
    await fs.rename(temp, REGISTRY_FILE);
  }

  list() {
    return [...this.models.values()].map(m => ({
      name: m.id,
      model: m.id,
      size: m.size || 0,
      modified_at: m.addedAt,
      details: { format: "gguf", family: m.family || "unknown", parameter_size: m.parameterSize || "unknown", quantization_level: m.quantization || "unknown" }
    }));
  }

  running() {
    return [...this.processes.entries()].map(([id, p]) => ({
      name: id, model: id, size: this.models.get(id)?.size || 0,
      expires_at: null, port: p.port, details: { format: "gguf" }
    }));
  }

  get(id) {
    const item = this.models.get(id);
    if (!item) {
      const error = new Error("Model not found. Download a GGUF model from Hugging Face first.");
      error.status = 404;
      throw error;
    }
    return item;
  }

  parseModelReference(input) {
    if (typeof input !== "string" || input.length > 500) throw new Error("Enter a Hugging Face repository ID, optionally followed by :filename.gguf.");
    const [repo, ...fileParts] = input.trim().split(":");
    if (!/^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/.test(repo || "")) {
      throw new Error("Use a Hugging Face repository ID such as Qwen/Qwen2.5-0.5B-Instruct-GGUF.");
    }
    const filename = fileParts.join(":");
    if (filename && (!filename.toLowerCase().endsWith(".gguf") || filename.includes("..") || filename.includes("/") || filename.includes("\\"))) {
      throw new Error("The optional model filename must be a single .gguf file name.");
    }
    return { repo, filename };
  }

  async findGguf(repo, requestedFilename) {
    if (requestedFilename) return requestedFilename;
    const url = "https://huggingface.co/api/models/" + repo + "/tree/main?recursive=true&expand=false";
    const response = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error("Hugging Face model listing failed (" + response.status + "). Check the repository ID and access permissions.");
    const files = await response.json();
    const gguf = files.filter(x => x.type === "file" && typeof x.path === "string" && x.path.toLowerCase().endsWith(".gguf"));
    if (!gguf.length) throw new Error("This repository has no GGUF model file. Allo's bundled runtime currently loads GGUF models.");
    const preferred = gguf.find(x => /q4_k_m/i.test(x.path)) || gguf.find(x => /q4_0/i.test(x.path)) || gguf[0];
    if (preferred.path.includes("..") || preferred.path.startsWith("/")) throw new Error("Invalid model file path returned by the registry.");
    return preferred.path;
  }

  async download(reference, onProgress = () => {}) {
    const { repo, filename: requested } = this.parseModelReference(reference);
    const filename = await this.findGguf(repo, requested);
    const id = repo + ":" + filename;
    if (this.models.has(id)) {
      onProgress({ status: "Model already downloaded", completed: this.models.get(id).size, total: this.models.get(id).size });
      return this.models.get(id);
    }
    if (this.downloads.has(id)) throw new Error("This model is already being downloaded.");
    const task = this.downloadFile(repo, filename, id, onProgress);
    this.downloads.set(id, task);
    try { return await task; } finally { this.downloads.delete(id); }
  }

  async downloadFile(repo, filename, id, onProgress) {
    const safeRepo = repo.split("/").map(encodeURIComponent).join("/");
    const safeFile = filename.split("/").map(encodeURIComponent).join("/");
    const url = "https://huggingface.co/" + safeRepo + "/resolve/main/" + safeFile + "?download=true";
    const response = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(60 * 60 * 1000) });
    if (!response.ok || !response.body) throw new Error("Model download failed (" + response.status + "). The repository may be gated or require authentication.");
    const declared = Number(response.headers.get("content-length") || 0);
    if (declared > MAX_MODEL_BYTES) throw new Error("Model exceeds ALLO_MAX_MODEL_BYTES.");
    const relative = path.join(repo.replace("/", "__"), filename);
    const destination = path.resolve(MODELS_DIR, relative);
    if (!destination.startsWith(MODELS_DIR + path.sep)) throw new Error("Invalid model destination.");
    await fs.mkdir(path.dirname(destination), { recursive: true });
    const temporary = destination + "." + process.pid + ".part";
    const handle = await fs.open(temporary, "w", 0o600);
    let completed = 0;
    try {
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        completed += value.byteLength;
        if (completed > MAX_MODEL_BYTES) throw new Error("Model exceeds ALLO_MAX_MODEL_BYTES.");
        await handle.write(value);
        onProgress({ status: "Downloading " + filename, completed, total: declared });
      }
      await handle.sync();
    } catch (error) {
      await handle.close();
      await fs.rm(temporary, { force: true });
      throw error;
    }
    await handle.close();
    await fs.rename(temporary, destination);
    const stat = await fs.stat(destination);
    const item = {
      id, repo, filename, file: relative, size: stat.size,
      addedAt: new Date().toISOString(), family: "GGUF"
    };
    this.models.set(id, { ...item, path: destination });
    await this.save();
    onProgress({ status: "Download complete", completed: stat.size, total: stat.size });
    return this.models.get(id);
  }

  async start(id) {
    const item = this.get(id);
    if (this.processes.has(id)) {
      this.processes.get(id).lastUsed = Date.now();
      return this.processes.get(id);
    }
    if (this.processes.size >= MAX_LOADED) {
      const oldest = [...this.processes.entries()].sort((a, b) => a[1].lastUsed - b[1].lastUsed)[0];
      if (oldest) await this.stop(oldest[0]);
    }
    const port = this.nextPort++;
    const child = spawn(SERVER_BIN, [
      "--model", item.path,
      "--host", "127.0.0.1",
      "--port", String(port),
      "--ctx-size", String(Number(process.env.ALLO_CONTEXT_SIZE || 4096)),
      "--n-gpu-layers", process.env.ALLO_GPU_LAYERS || "0",
      "--parallel", "1",
      "--no-webui"
    ], { stdio: ["ignore", "ignore", "pipe"] });
    const record = { child, port, lastUsed: Date.now(), stderr: "" };
    child.stderr.on("data", chunk => { record.stderr = (record.stderr + chunk.toString()).slice(-4000); });
    child.on("error", error => { record.spawnError = error; });
    child.on("exit", () => { if (this.processes.get(id) === record) this.processes.delete(id); });
    this.processes.set(id, record);
    try {
      await this.waitUntilReady(id, record);
      return record;
    } catch (error) {
      await this.stop(id);
      throw new Error("Could not start the Allo model runtime: " + error.message + (record.stderr ? " — " + record.stderr.slice(-1000) : ""));
    }
  }

  async waitUntilReady(id, record) {
    const deadline = Date.now() + Number(process.env.ALLO_MODEL_START_TIMEOUT || 180000);
    while (Date.now() < deadline) {
      if (record.spawnError) throw new Error(record.spawnError.message);
      if (record.child.exitCode !== null) throw new Error("llama-server exited during startup.");
      try {
        const response = await fetch("http://127.0.0.1:" + record.port + "/health", { signal: AbortSignal.timeout(1500) });
        if (response.ok) return;
      } catch {}
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    throw new Error("Model startup timed out.");
  }

  async stop(id) {
    const record = this.processes.get(id);
    if (!record) return;
    this.processes.delete(id);
    record.child.kill("SIGTERM");
    await Promise.race([
      new Promise(resolve => record.child.once("exit", resolve)),
      new Promise(resolve => setTimeout(resolve, 5000))
    ]);
    if (record.child.exitCode === null) record.child.kill("SIGKILL");
  }

  async request(id, endpoint, body) {
    const record = await this.start(id);
    record.lastUsed = Date.now();
    const response = await fetch("http://127.0.0.1:" + record.port + endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(Number(process.env.ALLO_INFERENCE_TIMEOUT || 15 * 60 * 1000))
    });
    return response;
  }

  async remove(id) {
    const item = this.get(id);
    await this.stop(id);
    await fs.rm(item.path, { force: true });
    this.models.delete(id);
    await this.save();
  }

  async copy(source, destination) {
    const item = this.get(source);
    if (typeof destination !== "string" || !destination.trim() || destination.length > 200) throw new Error("Enter a valid destination model name.");
    const id = destination.trim();
    if (this.models.has(id)) throw new Error("A model with that name already exists.");
    const relative = path.join("copies", Buffer.from(id).toString("hex") + ".gguf");
    const target = path.resolve(MODELS_DIR, relative);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.copyFile(item.path, target);
    const stat = await fs.stat(target);
    this.models.set(id, { ...item, id, repo: "local", filename: path.basename(target), file: relative, path: target, size: stat.size, addedAt: new Date().toISOString() });
    await this.save();
  }

  async close() {
    await Promise.all([...this.processes.keys()].map(id => this.stop(id)));
  }
}

module.exports = { AlloRuntime };
