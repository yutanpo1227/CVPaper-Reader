"""Logging configuration for the crawler."""

from __future__ import annotations

import sys

from loguru import logger


def configure_logging() -> None:
    """Setup structured logging for the application."""

    logger.remove()
    logger.add(
        sys.stdout,
        level="INFO",
        format="{time:YYYY-MM-DD HH:mm:ss} | {level:<8} | {message}",
    )
