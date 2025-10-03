import { env, pipeline } from "@xenova/transformers";

const MODEL_NAME = "Xenova/multilingual-e5-large";
const QUERY_PREFIX = "query: ";

let embedderPromise: Promise<unknown> | null = null;

env.allowLocalModels = false;

async function getEmbedder(): Promise<
  (input: string, options?: Record<string, unknown>) => Promise<unknown>
> {
  if (!embedderPromise) {
    embedderPromise = pipeline("feature-extraction", MODEL_NAME) as Promise<unknown>;
  }
  const p = (await embedderPromise) as unknown as (
    input: string,
    options?: Record<string, unknown>
  ) => Promise<unknown>;
  return p;
}

export async function embedQuery(text: string): Promise<number[]> {
  const embedder = await getEmbedder();
  const result = (await embedder(QUERY_PREFIX + text, {
    pooling: "mean",
    normalize: true,
  } as Record<string, unknown>)) as { data?: Float32Array } | { [key: string]: unknown };

  const tensorData = (result as { data?: Float32Array }).data as Float32Array;
  const data = Array.from(tensorData);
  return data;
}
