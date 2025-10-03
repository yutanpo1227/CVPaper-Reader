## Python 環境/依存・スキーマ・型定義 計画

### 背景/目的
- `python-crawler` を `uv` で管理し、確実に再現可能な実行環境を整備する。
- Supabase とやり取りする型（DTO）を統一し、スキーマとの齟齬を防ぐ。

### スコープ
- 含む: `uv` セットアップ、依存ライブラリ、設定ファイル、型/DTO、簡易ユーティリティ。
- 含まない: 具体的クロールロジック、埋め込み生成の実装。

### 実施手順
1. `python-crawler/pyproject.toml` を更新（`uv`用、依存定義）
2. 依存: `httpx`, `beautifulsoup4`, `lxml`, `pydantic`, `python-dotenv`, `supabase`, `tenacity`, `loguru`
3. 型定義: `models.py` に `Article` DTO と `UpsertPayload` を定義
4. 設定: `.env` 読み込み（URL, SERVICE_KEY）
5. クライアント: Supabase 挿入/更新ヘルパ `supabase_client.py`
6. ログ: `loguru` を使った構成（JSON ログ化は任意）

### 実装/設定メモ
- 依存（例）
```
[project]
name = "python-crawler"
requires-python = ">=3.11"
dependencies = [
  "httpx",
  "beautifulsoup4",
  "lxml",
  "pydantic",
  "python-dotenv",
  "supabase",
  "tenacity",
  "loguru",
]
```

- DTO 例（概要）
```
from pydantic import BaseModel, HttpUrl
from typing import Optional, List

class Article(BaseModel):
    id: Optional[str] = None
    title: str
    authors: str
    year: str
    url: HttpUrl
    abstract: str
    abstract_embedding: Optional[list[float]] = None

class UpsertPayload(BaseModel):
    articles: list[Article]
```

- 実行方法
```
uv run python python-crawler/main.py
```

### 検証観点
- `uv run python` で起動し、`dotenv` から環境変数が読める。
- 型検証で必須項目の欠落が検知される。

### 完了条件（DoD）
- 依存が明確化され、最小スケルトンが実行可能。
- 型/DTOが定義され、以降の実装で再利用可能。


