"""Data models shared across the crawler."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field, HttpUrl

EmbeddingVector = list[float]


class Article(BaseModel):
    """Represents a CVPR paper entry stored in Supabase."""

    id: UUID | None = None
    title: str
    authors: str
    year: str
    url: HttpUrl
    abstract: str
    abstract_embedding: EmbeddingVector | None = Field(default=None, repr=False)

    model_config = {"populate_by_name": True, "from_attributes": True}

    def to_supabase_record(self) -> dict[str, Any]:
        """Convert the article into a Supabase insertable dictionary."""

        record = self.model_dump(mode="json", exclude_none=True)
        return record


class UpsertPayload(BaseModel):
    """Wrapper payload for bulk Supabase upserts."""

    articles: list[Article] = Field(default_factory=list)

    def to_records(self) -> list[dict[str, Any]]:
        """Return Supabase-ready dictionaries."""

        return [article.to_supabase_record() for article in self.articles if article]
