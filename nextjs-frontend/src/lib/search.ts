export interface SearchRequest {
  query?: string;
  embedding?: number[];
  limit?: number;
  alpha?: number;
}

export interface SearchArticle {
  id: string;
  title: string;
  authors: string;
  year: string;
  url: string;
  abstract: string;
  score: number;
}

export interface SearchResponse {
  articles: SearchArticle[];
}

export async function searchArticles(
  request: SearchRequest,
): Promise<SearchResponse> {
  const response = await fetch("/api/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Search request failed: ${response.status} ${errorText}`);
  }

  return (await response.json()) as SearchResponse;
}
