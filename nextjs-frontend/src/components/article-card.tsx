import Link from "next/link";

import type { SearchArticle } from "@/lib/search";

function formatScore(score: number | null | undefined): string {
  if (typeof score !== "number" || Number.isNaN(score)) {
    return "-";
  }
  return score.toFixed(3);
}

interface ArticleCardProps {
  article: SearchArticle;
}

export function ArticleCard({ article }: ArticleCardProps) {
  return (
    <article className="group relative overflow-hidden rounded-3xl border border-slate-200/60 bg-white/90 p-6 shadow-sm shadow-slate-200/60 transition duration-200 hover:-translate-y-1 hover:border-indigo-200/80 hover:shadow-xl dark:border-slate-800/80 dark:bg-slate-900/70 dark:shadow-slate-950/60">
      <span className="absolute inset-y-4 left-4 w-1 rounded-full bg-gradient-to-b from-indigo-500 via-purple-500 to-pink-500" />

      <div className="flex flex-wrap items-center gap-3 pl-6 text-xs font-semibold uppercase tracking-wide text-slate-400">
        <span className="rounded-full bg-indigo-50 px-2 py-1 text-indigo-600 shadow-sm shadow-indigo-100 dark:bg-indigo-500/20 dark:text-indigo-200">
          Score {formatScore(article.score)}
        </span>
        <span className="text-slate-400">CVPR {article.year}</span>
      </div>

      <header className="mt-4 space-y-3 pl-6">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900 transition group-hover:text-indigo-600 dark:text-slate-100 dark:group-hover:text-indigo-300">
          {article.title}
        </h2>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          {article.authors}
        </p>
      </header>

      <p className="mt-4 line-clamp-4 pl-6 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        {article.abstract}
      </p>

      <footer className="mt-6 flex flex-wrap items-center gap-4 pl-6 text-sm text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1">
          <svg
            aria-hidden="true"
            focusable="false"
            width={16}
            height={16}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M16 21v-2a4 4 0 0 0-8 0v2" />
            <circle cx={12} cy={7} r={4} />
          </svg>
          {article.authors.split(",").length} authors
        </span>
        <span className="inline-flex items-center gap-1">
          <svg
            aria-hidden="true"
            focusable="false"
            width={16}
            height={16}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 4a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
            <path d="M16 2v4" />
            <path d="M8 2v4" />
            <path d="M3 10h18" />
          </svg>
          {article.year}
        </span>
        <Link
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 transition hover:text-indigo-500 dark:text-indigo-300 dark:hover:text-indigo-200"
        >
          Read paper
          <svg
            aria-hidden="true"
            focusable="false"
            width={16}
            height={16}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="7 17 17 7" />
            <polyline points="7 7 17 7 17 17" />
          </svg>
        </Link>
      </footer>
    </article>
  );
}
