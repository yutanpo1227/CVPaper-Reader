"""Application configuration helpers."""

from __future__ import annotations

import os
from functools import lru_cache
from typing import Any

from dotenv import load_dotenv
from loguru import logger
from pydantic import AnyHttpUrl, BaseModel, ValidationError

load_dotenv()


class SettingsError(RuntimeError):
    """Raised when environment settings are missing or invalid."""


class Settings(BaseModel):
    """Runtime configuration derived from environment variables."""

    supabase_url: AnyHttpUrl
    supabase_service_role_key: str
    embedding_model_name: str = "intfloat/multilingual-e5-large"

    model_config = {"frozen": True}

    def as_dict(self) -> dict[str, Any]:
        """Return settings as a plain dictionary."""

        return self.model_dump()


def _build_settings() -> Settings:
    """Create settings instance from environment variables."""

    raw_config = {
        "supabase_url": os.getenv("SUPABASE_URL"),
        "supabase_service_role_key": os.getenv("SUPABASE_SERVICE_ROLE_KEY"),
        "embedding_model_name": os.getenv("EMBEDDING_MODEL_NAME", "intfloat/multilingual-e5-large"),
    }

    try:
        settings = Settings(**raw_config)
    except ValidationError as exc:  # pragma: no cover - configuration errors need to surface
        logger.error("環境変数のバリデーションに失敗しました: {}", exc)
        raise SettingsError("環境変数の設定を見直してください。") from exc

    missing = [
        key
        for key, value in raw_config.items()
        if key != "embedding_model_name" and value in (None, "")
    ]
    if missing:
        logger.error("必須の環境変数が未設定です: {}", ", ".join(missing))
        raise SettingsError(f"Missing required environment variables: {', '.join(missing)}")

    return settings


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return cached settings instance."""

    return _build_settings()
