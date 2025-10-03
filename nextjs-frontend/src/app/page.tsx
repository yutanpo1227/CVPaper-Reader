"use client";

import { useMemo, useState } from "react";

import { ArticleCard } from "@/components/article-card";
import { SearchForm } from "@/components/search-form";
import type { SearchArticle } from "@/lib/search";

type YearFilter = "all" | "2023" | "2024" | "2025";

const YEAR_FILTERS: Array<{ label: string; value: YearFilter }> = [
  { label: "All years", value: "all" },
  { label: "CVPR 2025", value: "2025" },
  { label: "CVPR 2024", value: "2024" },
  { label: "CVPR 2023", value: "2023" },
];

export default function Home() {
  const [articles, setArticles] = useState<SearchArticle[]>([]);
  const [yearFilter, setYearFilter] = useState<YearFilter>("all");

  const filteredArticles = useMemo(() => {
    if (yearFilter === "all") {
      return articles;
    }
    return articles.filter((article) => article.year === yearFilter);
  }, [articles, yearFilter]);

  const handleResults = (results: SearchArticle[]) => {
    setArticles(results);
    setYearFilter("all");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 text-slate-900 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 dark:text-slate-100">
      <div className="flex flex-col gap-5 px-6 pb-8 pt-4 sm:pt-6">
        <div className="space-y-2">
          <span className="inline-flex items-center rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-600 dark:border-indigo-900 dark:bg-indigo-500/10 dark:text-indigo-200">
            CVPR Papers Digest
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl dark:text-slate-100">
            CVPR Papers
          </h1>
          {/* <p className="max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            ハイブリッド検索で CVPR 2023-2025 の注目論文を横断チェック。テキストと埋め込みスコアを組み合わせたランキングで最新トレンドを素早くキャッチできます。
          </p> */}
        </div>

        <SearchForm onResults={handleResults} />

        <div className="flex flex-wrap gap-1.5 text-xs">
          {YEAR_FILTERS.map((filter) => {
            const isActive = yearFilter === filter.value;
            return (
              <button
                key={filter.value}
                type="button"
                onClick={() => setYearFilter(filter.value)}
                className={[
                  "rounded-full border px-3 py-1 font-medium transition",
                  isActive
                    ? "border-slate-900 bg-slate-900 text-white shadow-sm shadow-slate-400/40 dark:border-indigo-400 dark:bg-indigo-500"
                    : "border-slate-200 bg-white/80 text-slate-600 hover:border-indigo-200 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:border-indigo-400 dark:hover:text-indigo-200",
                ].join(" ")}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>

      <main className="px-6 pb-16">
        <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 font-semibold text-slate-700 shadow-sm shadow-slate-200/60 dark:bg-slate-900/60 dark:text-slate-200 dark:shadow-slate-950/40">
            {filteredArticles.length}
            {filteredArticles.length === 1 ? " result" : " results"}
          </span>
          <span className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Showing {yearFilter === "all" ? "all years" : filterLabel(yearFilter)} · Hybrid ranking
          </span>
        </div>

        {articles.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300/70 bg-white/70 p-12 text-center text-sm text-slate-500 shadow-sm shadow-slate-200/50 dark:border-slate-700/70 dark:bg-slate-900/50 dark:text-slate-400 dark:shadow-slate-950/40">
            キーワードを入力して検索を開始すると、ここに結果が表示されます。
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-red-200/70 bg-red-50/60 p-10 text-center text-sm text-red-600 shadow-sm dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
            選択中のフィルターに一致する論文がありません。別のキーワードやフィルターを試してください。
          </div>
        ) : (
          <div className="space-y-6">
            {filteredArticles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function filterLabel(filter: YearFilter): string {
  const match = YEAR_FILTERS.find((item) => item.value === filter);
  return match ? match.label : "all years";
}
