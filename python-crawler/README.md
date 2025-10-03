# Python Crawler

CVPR 2023-2025 の論文メタデータを Supabase に保存するクローラーです。定期的な自動実行は想定しておらず、必要に応じて手動で実行します。

## セットアップ
1. 依存をインストールします。
   ```bash
   cd python-crawler
   uv pip install --editable .
   ```
   初回実行時は `torch` や `sentence-transformers` など大きな依存がダウンロードされます (CPU 用 Wheel を自動取得)。デフォルトの埋め込みモデルは `intfloat/multilingual-e5-large` です。
2. `.env` を作成し、Supabase の URL や service role キーを設定します。
   ```bash
   cp .env.example .env
   ```
3. ローカル Supabase を起動している場合は `supabase db reset` で最新スキーマを適用します。

## 実行
- クロールのみ（結果はコンソールに出力）
  ```bash
  uv run python main.py --years 2023 2024 --limit 10
  ```
- Supabase へ upsert（埋め込み生成も同時に実行）
  ```bash
  uv run python main.py --upsert --batch-size 200
  ```

主な CLI オプション:
- `--years`: クロール対象年（デフォルト: 2023 2024 2025）
- `--limit`: 各年あたり取得する最大件数（テスト用）
- `--concurrency`: HTTP 同時実行数（デフォルト: 5）
- `--timeout`: HTTP タイムアウト秒数（デフォルト: 30.0）
- `--upsert`: Supabase へ upsert する場合に指定（同時に埋め込み生成が行われます）
- `--batch-size`: Supabase upsert のバッチサイズ（デフォルト: 100）
- `--embedding-failure-log`: 埋め込み失敗レコードを書き出す JSON ファイル（デフォルト: `embedding_failures.json`）
- `--no-embedding-failure-log`: 埋め込み失敗ログの出力を無効化

埋め込み生成はアブストラクト全体を 1 チャンクとして処理し、失敗したレコードは `embedding_failures.json` に記録されるため再実行時に参照してください。

## Supabase 依存
あらかじめ `supabase/schema.sql` あるいは `supabase/migrations` を Supabase プロジェクトに適用し、`Articles` テーブルと RLS を構成しておきます。

## コードスタイル / Lint
- Ruff を使用して静的解析とフォーマットを実施します。
- 開発用依存のインストール:
  ```bash
  uv pip install --editable ".[dev]"
  ```
- Lint 実行: `uv run --extra dev ruff check .`
- フォーマット実行: `uv run ruff format .`
