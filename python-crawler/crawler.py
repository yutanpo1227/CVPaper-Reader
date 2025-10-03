"""CVPR crawler implementation."""

from __future__ import annotations

import asyncio
import re
import unicodedata
from collections import Counter
from collections.abc import Sequence
from dataclasses import dataclass, field
from urllib.parse import urljoin

import certifi
import httpx
from bs4 import BeautifulSoup
from httpx import HTTPError
from loguru import logger

from models import Article

BASE_URL = "https://openaccess.thecvf.com"
USER_AGENT = "Mozilla/5.0 (compatible; CVPaperReader/0.1; +https://github.com/)"
LISTING_TEMPLATE = "https://openaccess.thecvf.com/CVPR{year}?day=all"
DEFAULT_CONCURRENCY = 5
DEFAULT_TIMEOUT = 30.0


@dataclass(slots=True)
class CrawlResult:
    """Result of a crawl run."""

    articles: list[Article] = field(default_factory=list)
    failures: list[str] = field(default_factory=list)
    duplicates: list[str] = field(default_factory=list)
    per_year_counts: Counter[str] = field(default_factory=Counter)

    def summary(self) -> str:
        year_stats = ", ".join(
            f"{year}:{count}" for year, count in sorted(self.per_year_counts.items())
        )
        return (
            f"total={len(self.articles)} articles, "
            f"failures={len(self.failures)}, duplicates={len(self.duplicates)}, "
            f"year_counts={{ {year_stats} }}"
        )


class CvprCrawler:
    """Crawler for CVPR open access proceedings."""

    def __init__(
        self,
        years: Sequence[int],
        concurrency: int = DEFAULT_CONCURRENCY,
        request_timeout: float = DEFAULT_TIMEOUT,
    ) -> None:
        self._years = sorted(set(years))
        self._timeout = httpx.Timeout(request_timeout)
        self._headers = {"User-Agent": USER_AGENT}
        self._semaphore = asyncio.Semaphore(concurrency)

    async def crawl(self, limit: int | None = None) -> CrawlResult:
        """Fetch paper metadata for configured years."""

        result = CrawlResult()
        seen_titles: dict[str, Article] = {}

        async with httpx.AsyncClient(
            headers=self._headers,
            timeout=self._timeout,
            verify=certifi.where(),
        ) as client:
            for year in self._years:
                listing_url = LISTING_TEMPLATE.format(year=year)
                try:
                    listing_html = await self._fetch_listing(client, listing_url)
                except HTTPError as exc:
                    logger.error(
                        "{year} 年のリスト取得に失敗しました: {error}",
                        year=year,
                        error=exc,
                    )
                    result.failures.append(listing_url)
                    continue

                papers = self._parse_listing(listing_html)
                logger.info("{year} 年の候補論文数: {count}", year=year, count=len(papers))

                tasks = [
                    asyncio.create_task(self._fetch_article(client, title, href, year))
                    for title, href in papers
                ]

                collected = 0
                stop_fetching = False
                for task in asyncio.as_completed(tasks):
                    article, failure_url = await task
                    if failure_url:
                        result.failures.append(failure_url)

                    if not article:
                        continue

                    key = _normalize_title(article.title)
                    if key in seen_titles:
                        result.duplicates.append(article.title)
                        continue

                    seen_titles[key] = article
                    result.articles.append(article)
                    result.per_year_counts[str(year)] += 1
                    collected += 1

                    if limit and collected >= limit:
                        logger.info(
                            "{year} 年の取得を limit={limit} で打ち切ります。",
                            year=year,
                            limit=limit,
                        )
                        stop_fetching = True
                        break

                if stop_fetching:
                    for task in tasks:
                        if not task.done():
                            task.cancel()
                    await asyncio.gather(*tasks, return_exceptions=True)

        return result

    async def _fetch_listing(self, client: httpx.AsyncClient, url: str) -> str:
        async with self._semaphore:
            resp = await client.get(url)
        resp.raise_for_status()
        return resp.text

    def _parse_listing(self, html: str) -> list[tuple[str, str]]:
        soup = BeautifulSoup(html, "lxml")
        anchors = soup.select("dt.ptitle > a")
        papers: list[tuple[str, str]] = []
        for anchor in anchors:
            title = _clean_text(anchor.text)
            href = anchor.get("href")
            if not href:
                continue
            papers.append((title, href))
        return papers

    async def _fetch_article(
        self,
        client: httpx.AsyncClient,
        title: str,
        href: str,
        year: int,
    ) -> tuple[Article | None, str | None]:
        url = urljoin(BASE_URL, href)
        try:
            async with self._semaphore:
                resp = await client.get(url)
            resp.raise_for_status()
        except HTTPError as exc:
            logger.warning("論文ページ取得に失敗しました: {url} ({error})", url=url, error=exc)
            return None, url

        article = self._parse_article_page(resp.text, url=url, title=title, year=year)
        if not article:
            logger.warning("論文ページの解析に失敗したためスキップします: {url}", url=url)
            return None, url

        return article, None

    def _parse_article_page(
        self,
        html: str,
        url: str,
        title: str,
        year: int,
    ) -> Article | None:
        soup = BeautifulSoup(html, "lxml")

        abstract_node = soup.select_one("#abstract")
        authors_node = soup.select_one("#authors")

        if not abstract_node or not authors_node:
            return None

        abstract = _clean_text(abstract_node.get_text(" ", strip=True))
        authors_text = authors_node.get_text(" ", strip=True)
        authors = _extract_authors(authors_text)

        if not abstract:
            logger.debug("抽出された abstract が空のためスキップ: {url}", url=url)
            return None

        return Article(
            title=title,
            authors=authors,
            year=str(year),
            url=url,
            abstract=abstract,
        )


def _clean_text(value: str) -> str:
    normalized = unicodedata.normalize("NFKC", value)
    normalized = normalized.replace("\xa0", " ")
    normalized = re.sub(r"\s+", " ", normalized)
    return normalized.strip()


def _extract_authors(raw_text: str) -> str:
    cleaned = _clean_text(raw_text)
    parts = cleaned.split(";", 1)
    authors = parts[0].strip()
    authors = re.sub(r"^Proceedings.*", "", authors).strip(", ")
    return authors


def _normalize_title(title: str) -> str:
    cleaned = _clean_text(title).lower()
    cleaned = re.sub(r"[^a-z0-9]+", " ", cleaned)
    return cleaned.strip()
