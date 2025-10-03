export const runtime = "edge";

import { type NextRequest, NextResponse } from "next/server";

import { embedQuery } from "@/lib/embeddings";
import { getSupabaseClient } from "@/lib/supabase";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const DEFAULT_ALPHA = 0.5;

interface SearchRequestBody {
  query?: unknown;
  embedding?: unknown;
  limit?: unknown;
  alpha?: unknown;
}

function parseLimit(raw: unknown): number {
  const value =
    typeof raw === "number" && Number.isFinite(raw) ? raw : DEFAULT_LIMIT;
  const normalized = Math.floor(value);
  if (normalized <= 0) {
    return 1;
  }
  if (normalized > MAX_LIMIT) {
    return MAX_LIMIT;
  }
  return normalized;
}

function parseAlpha(raw: unknown): number {
  if (typeof raw !== "number" || Number.isNaN(raw)) {
    return DEFAULT_ALPHA;
  }
  if (raw < 0) {
    return 0;
  }
  if (raw > 1) {
    return 1;
  }
  return raw;
}

function parseEmbedding(raw: unknown): number[] | null {
  if (!Array.isArray(raw)) {
    return null;
  }

  const values: number[] = [];
  for (const item of raw) {
    const num = typeof item === "number" ? item : Number(item);
    if (Number.isNaN(num)) {
      return null;
    }
    values.push(num);
  }

  return values.length > 0 ? values : null;
}

export async function POST(request: NextRequest) {
  let body: SearchRequestBody;

  try {
    body = (await request.json()) as SearchRequestBody;
  } catch (_error) {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  const query = typeof body.query === "string" ? body.query.trim() : "";
  let embedding = parseEmbedding(body.embedding ?? null);
  const limit = parseLimit(body.limit);
  const alpha = parseAlpha(body.alpha);

  if (!query && !embedding) {
    return NextResponse.json(
      { error: "query もしくは embedding のいずれかを指定してください" },
      { status: 400 },
    );
  }

  if (!embedding && query) {
    try {
      embedding = await embedQuery(query);
    } catch (embedError) {
      return NextResponse.json(
        {
          error: "Failed to generate embedding",
          details:
            embedError instanceof Error
              ? embedError.message
              : String(embedError),
        },
        { status: 500 },
      );
    }
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("search_articles", {
    query_text: query || null,
    query_embedding: embedding ?? null,
    match_count: limit,
    alpha,
  });

  if (error) {
    return NextResponse.json(
      { error: "Supabase search failed", details: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ articles: data ?? [] });
}
