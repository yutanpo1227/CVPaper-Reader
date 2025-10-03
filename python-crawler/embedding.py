"""Embedding generation utilities for CVPR crawler."""

from __future__ import annotations

import json
from collections.abc import Sequence
from dataclasses import dataclass, field
from pathlib import Path
import torch
import numpy as np
from loguru import logger
from sentence_transformers import SentenceTransformer

from models import Article


PASSAGE_PREFIX = "passage: "


class EmbeddingError(RuntimeError):
    """Raised when embedding generation fails."""


@dataclass(slots=True)
class EmbeddingJobResult:
    """Embeddings generation result summary."""

    processed: int = 0
    failed: list[dict[str, str]] = field(default_factory=list)

    def record_failure(self, article: Article, error: Exception) -> None:
        self.failed.append(
            {
                "title": article.title,
                "url": article.url,
                "error": str(error),
            }
        )

    def dump_failures(self, path: Path) -> None:
        if not self.failed:
            return
        data = {"failures": self.failed}
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        logger.warning("Embedding 失敗レコードを {path} に書き出しました。", path=path)


MODEL_ALIASES = {
    "multilingual-e5-large": "intfloat/multilingual-e5-large",
    "sentence-transformers/multilingual-e5-large": "intfloat/multilingual-e5-large",
}


class EmbeddingService:
    """Handles multilingual-e5-large embedding generation."""

    def __init__(self, model_name: str) -> None:
        self.device = "cuda" if torch.cuda.is_available() else "mps" if torch.backends.mps.is_available() else "cpu"
        self._model_name = MODEL_ALIASES.get(model_name, model_name)
        if self._model_name != model_name:
            logger.warning(
                "Embedding モデル名 {original} を {resolved} に置き換えました。",
                original=model_name,
                resolved=self._model_name,
            )
        self._model: SentenceTransformer | None = None

    def _load_model(self) -> SentenceTransformer:
        if self._model is None:
            logger.info("SentenceTransformer モデルを読み込みます: {model}", model=self._model_name)
            self._model = SentenceTransformer(self._model_name, device=self.device)
        return self._model

    def embed_articles(
        self,
        articles: Sequence[Article],
        failure_log: Path | None = None,
    ) -> EmbeddingJobResult:
        model = self._load_model()
        result = EmbeddingJobResult()

        if not articles:
            return result

        for index, article in enumerate(articles, start=1):
            text = f"{PASSAGE_PREFIX}{article.abstract}"
            try:
                embedding = model.encode(
                    text,
                    batch_size=1,
                    normalize_embeddings=True,
                    show_progress_bar=False,
                    convert_to_numpy=True,
                )
            except Exception as exc:  # pragma: no cover - third party library errors
                logger.error(
                    "埋め込み生成に失敗しました: index={index} error={error}",
                    index=index,
                    error=exc,
                )
                result.record_failure(article, exc)
                continue

            if not isinstance(embedding, np.ndarray):
                logger.error(
                    "想定外の埋め込みフォーマットを受け取りました: index={index}",
                    index=index,
                )
                result.record_failure(article, EmbeddingError("invalid embedding format"))
                continue

            vector = embedding.tolist()
            article.abstract_embedding = vector
            result.processed += 1

        if failure_log:
            result.dump_failures(failure_log)

        return result
