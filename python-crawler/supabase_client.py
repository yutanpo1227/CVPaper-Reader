"""Thin wrapper around Supabase Python client."""

from __future__ import annotations

from collections.abc import Iterable, Iterator, Sequence

from loguru import logger
from supabase import Client, create_client
from tenacity import retry, stop_after_attempt, wait_exponential

from config import Settings
from models import Article, UpsertPayload


class SupabaseClientError(RuntimeError):
    """Raised when Supabase operations fail."""


class SupabaseVectorClient:
    """Client helper for interacting with Supabase tables."""

    def __init__(self, client: Client) -> None:
        self._client = client

    @classmethod
    def from_settings(cls, settings: Settings) -> SupabaseVectorClient:
        client = create_client(str(settings.supabase_url), settings.supabase_service_role_key)
        return cls(client)

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=8))
    def upsert_articles(self, articles: Sequence[Article]) -> None:
        """Upsert articles into Supabase."""

        payload = UpsertPayload(articles=list(articles))
        records = payload.to_records()
        if not records:
            logger.debug("Upsert対象のレコードが空のため処理をスキップします。")
            return

        logger.info("Supabase に {count} 件のレコードを upsert します。", count=len(records))
        response = (
            self._client.table("Articles")
            .upsert(records, on_conflict="url")
            .execute()
        )

        if getattr(response, "error", None):
            logger.error("Supabase upsert でエラーが発生しました: {}", response.error)
            raise SupabaseClientError(str(response.error))

        logger.debug("Supabase upsert 完了: {}", response.data)

    def upsert_articles_chunked(self, articles: Sequence[Article], batch_size: int = 100) -> None:
        """Upsert articles in batches to avoid payload limits."""

        for index, chunk in enumerate(_chunked(articles, batch_size), start=1):
            logger.debug(
                "バッチ {batch} (size={size}) をアップサートします。",
                batch=index,
                size=len(chunk),
            )
            self.upsert_articles(chunk)

    def list_articles(self, limit: int = 5) -> Iterable[Article]:
        """Fetch a limited number of articles for health checks."""

        response = self._client.table("Articles").select("*").limit(limit).execute()
        if getattr(response, "error", None):
            logger.error("Supabase select でエラーが発生しました: {}", response.error)
            raise SupabaseClientError(str(response.error))

        items = response.data or []
        logger.debug("取得したレコード数: {}", len(items))
        return [Article.model_validate(item) for item in items]


def _chunked(items: Sequence[Article], size: int) -> Iterator[Sequence[Article]]:
    if size <= 0:
        raise ValueError("batch_size must be positive")
    for start in range(0, len(items), size):
        yield items[start : start + size]
