"use client";

import { useState, useTransition } from "react";

import { type SearchArticle, searchArticles } from "@/lib/search";

interface SearchFormProps {
  onResults: (articles: SearchArticle[]) => void;
}

export function SearchForm({ onResults }: SearchFormProps) {
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(10);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    startTransition(() => {
      setError(null);
      searchArticles({ query, limit })
        .then((response) => {
          onResults(response.articles);
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : "検索に失敗しました");
        });
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-2xl rounded-xl border border-white/50 bg-white/75 p-3 shadow-md shadow-slate-200/30 backdrop-blur-sm dark:border-slate-700/50 dark:bg-slate-900/70 dark:shadow-slate-950/30"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <svg
              aria-hidden="true"
              focusable="false"
              width={18}
              height={18}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx={11} cy={11} r={7} />
              <line x1={21} y1={21} x2={16.65} y2={16.65} />
            </svg>
          </span>
          <input
            id="query"
            className="w-full rounded-lg border border-slate-200 bg-white px-9 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-900/40"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search CVPR papers, e.g. diffusion, pose estimation"
          />
        </div>

        <div className="flex items-center gap-2">
          <label
            htmlFor="limit"
            className="text-xs font-semibold uppercase tracking-wide text-slate-400"
          >
            件数
          </label>
          <select
            id="limit"
            value={limit}
            onChange={(event) => setLimit(Number(event.target.value))}
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-indigo-400"
          >
            {[5, 10, 20, 30, 50, 100].map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-lg bg-slate-900 mx-2 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-sm shadow-indigo-200 transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-indigo-300 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-indigo-500 dark:hover:bg-indigo-400"
          disabled={isPending}
        >
          {isPending ? "検索中..." : "検索"}
        </button>
      </div>

      {error ? (
        <p className="mt-2 text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
