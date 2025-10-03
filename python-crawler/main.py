"""Entrypoint for running the CVPR crawler."""

from __future__ import annotations

import argparse
import asyncio
from collections.abc import Sequence
from pathlib import Path

from loguru import logger

from config import SettingsError, get_settings
from crawler import CvprCrawler
from embedding import EmbeddingJobResult, EmbeddingService
from logging_config import configure_logging
from supabase_client import SupabaseClientError, SupabaseVectorClient


def parse_years(raw_years: Sequence[str]) -> Sequence[int]:
    try:
        return [int(year) for year in raw_years]
    except ValueError as exc:  # pragma: no cover - CLI validation
        raise argparse.ArgumentTypeError("years は整数で指定してください") from exc


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="CVPR 2023-2025 crawler")
    parser.add_argument(
        "--years",
        nargs="+",
        default=[2023, 2024, 2025],
        type=int,
        help="クロール対象の年 (複数指定可能)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="各年あたり取得する論文数の上限 (テスト用)",
    )
    parser.add_argument(
        "--concurrency",
        type=int,
        default=5,
        help="同時接続数 (デフォルト: 5)",
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=30.0,
        help="HTTP タイムアウト (秒)",
    )
    parser.add_argument(
        "--upsert",
        action="store_true",
        help="クロール結果を Supabase に upsert します",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=100,
        help="Supabase upsert のバッチサイズ",
    )
    parser.add_argument(
        "--embedding-failure-log",
        type=Path,
        default=Path("embedding_failures.json"),
        help="埋め込み失敗レコードを書き出す JSON ファイル",
    )
    parser.add_argument(
        "--no-embedding-failure-log",
        action="store_true",
        help="埋め込み失敗ログのファイル出力を無効化",
    )
    return parser


async def run_crawler(
    args: argparse.Namespace,
    supabase_client: SupabaseVectorClient | None,
    embedding_service: EmbeddingService | None,
    embedding_failure_log: Path | None,
) -> None:
    crawler = CvprCrawler(
        years=args.years,
        concurrency=args.concurrency,
        request_timeout=args.timeout,
    )

    logger.info(
        "クロールを開始します (years={years}, limit={limit})",
        years=args.years,
        limit=args.limit,
    )
    result = await crawler.crawl(limit=args.limit)
    logger.info("クロール完了: {summary}", summary=result.summary())

    sample_titles = [article.title for article in result.articles[:3]]
    if sample_titles:
        logger.info("サンプルタイトル: {titles}", titles=sample_titles)

    articles_for_upsert = result.articles
    embedding_result: EmbeddingJobResult | None = None
    if embedding_service and result.articles:
        logger.info("埋め込み生成を開始します (1 abstract = 1 chunk)")
        embedding_result = embedding_service.embed_articles(
            result.articles,
            failure_log=embedding_failure_log,
        )
        success = embedding_result.processed
        failed = len(embedding_result.failed)
        logger.info(
            "埋め込み生成完了: processed={success}, failed={failed}",
            success=success,
            failed=failed,
        )
        if failed:
            if embedding_failure_log:
                logger.warning(
                    "埋め込みに失敗したレコードがあります。failure_log={path}",
                    path=embedding_failure_log,
                )
            else:
                logger.warning("埋め込みに失敗したレコードがありますが、ログ出力は無効化されています。")
        articles_for_upsert = [
            article for article in result.articles if article.abstract_embedding is not None
        ]

    if supabase_client and articles_for_upsert:
        try:
            supabase_client.upsert_articles_chunked(
                articles_for_upsert,
                batch_size=args.batch_size,
            )
        except SupabaseClientError as exc:
            logger.error("Supabase upsert に失敗しました: {}", exc)
            raise SystemExit(1) from exc
        logger.info(
            "Supabase upsert 完了: inserted_or_updated={count}",
            count=len(articles_for_upsert),
        )
    elif args.upsert and not articles_for_upsert:
        logger.warning("upsert対象のレコードがありません (embedding 失敗の可能性)。")


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    configure_logging()

    supabase_client: SupabaseVectorClient | None = None
    embedding_service: EmbeddingService | None = None
    embedding_failure_log: Path | None = None

    if args.upsert:
        try:
            settings = get_settings()
        except SettingsError as exc:
            logger.error("設定の読み込みに失敗しました: {}", exc)
            raise SystemExit(1) from exc

        supabase_client = SupabaseVectorClient.from_settings(settings)
        embedding_service = EmbeddingService(model_name=settings.embedding_model_name)
        if not args.no_embedding_failure_log:
            embedding_failure_log = args.embedding_failure_log

        logger.info("Supabase クライアントを初期化しました: {url}", url=settings.supabase_url)

    asyncio.run(
        run_crawler(
            args,
            supabase_client=supabase_client,
            embedding_service=embedding_service,
            embedding_failure_log=embedding_failure_log,
        )
    )


if __name__ == "__main__":  # pragma: no cover - script entry
    main()
