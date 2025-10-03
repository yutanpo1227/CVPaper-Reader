import { env, pipeline } from "@xenova/transformers";

const MODEL_NAME = "Xenova/multilingual-e5-large";
const QUERY_PREFIX = "query: ";

let embedderPromise: Promise<unknown> | null = null;

env.allowLocalModels = false;
env.useBrowserCache = false;

// Force ONNX runtime to use the WASM backend so it works on serverless/Edge runtimes like Vercel.
// The CDN paths are recommended by @xenova/transformers for bundler environments.
type OnnxBackendConfig = {
  default?: string;
  wasm?: {
    wasmPaths?: Record<string, string>;
  };
};

const onnxBackend = (env.backends.onnx ?? {}) as OnnxBackendConfig;
onnxBackend.default = "wasm";
onnxBackend.wasm = onnxBackend.wasm ?? {};
onnxBackend.wasm.wasmPaths = {
  "ort-wasm.wasm":
    "https://cdn.jsdelivr.net/npm/@xenova/transformers/dist/onnx/ort-wasm.wasm",
  "ort-wasm-simd.wasm":
    "https://cdn.jsdelivr.net/npm/@xenova/transformers/dist/onnx/ort-wasm-simd.wasm",
  "ort-wasm-threaded.wasm":
    "https://cdn.jsdelivr.net/npm/@xenova/transformers/dist/onnx/ort-wasm-threaded.wasm",
  "ort-wasm-simd-threaded.wasm":
    "https://cdn.jsdelivr.net/npm/@xenova/transformers/dist/onnx/ort-wasm-simd-threaded.wasm",
};
env.backends.onnx = onnxBackend;

async function getEmbedder(): Promise<
  (input: string, options?: Record<string, unknown>) => Promise<unknown>
> {
  if (!embedderPromise) {
    embedderPromise = pipeline(
      "feature-extraction",
      MODEL_NAME,
    ) as Promise<unknown>;
  }
  const p = (await embedderPromise) as unknown as (
    input: string,
    options?: Record<string, unknown>,
  ) => Promise<unknown>;
  return p;
}

export async function embedQuery(text: string): Promise<number[]> {
  const embedder = await getEmbedder();
  const result = (await embedder(QUERY_PREFIX + text, {
    pooling: "mean",
    normalize: true,
  } as Record<string, unknown>)) as
    | { data?: Float32Array }
    | { [key: string]: unknown };

  const tensorData = (result as { data?: Float32Array }).data as Float32Array;
  const data = Array.from(tensorData);
  return data;
}
