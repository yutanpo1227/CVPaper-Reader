# CVPaper Reader

CVPaper Reader は、CVPR 2023〜2025 の公開論文をクロールして Supabase ベクトルデータベースに保存し、Next.js フロントエンドからハイブリッド検索（テキスト + ベクトル）できるようにするフルスタックアプリケーションです。

## プロジェクト構成

```
.
├── python-crawler      # CVPR OpenAccess から論文メタデータを収集し Supabase へ upsert
├── nextjs-frontend     # ハイブリッド検索 UI（Next.js + Tailwind + Supabase RPC）
├── supabase            # スキーマ、マイグレーション、ローカル CLI 設定
└── todo / AGENTS.md    # 開発メモ
```

## 事前準備

| ツール            | バージョンの目安 | 用途                              |
|-------------------|------------------|-----------------------------------|
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | 最新版 | Supabase ローカル開発環境のコンテナ実行 |
| [Supabase CLI](https://supabase.com/docs/guides/cli)             | v2.15+ | DB 起動 / マイグレーション適用        |
| [Node.js](https://nodejs.org/)                                   | 20.x   | Next.js フロントエンド               |
| [npm](https://www.npmjs.com/)                                    | Node に同梱 | パッケージ管理                     |
| [uv](https://github.com/astral-sh/uv)                            | 0.4+   | Python 依存管理 & 実行              |
| Python                                                           | 3.12   | クローラー実行                      |

> ℹ️  Supabase CLI は `supabase start` 時に Docker を利用するため、Docker Desktop を事前に起動しておいてください。

## クイックスタート

1. リポジトリの取得

```bash
git clone https://github.com/yutanpo1227/CVPaper-Reader.git
cd CVPaper-Reader
```

2. Supabase ローカル環境の起動

supabase cliをインストールしてください。
macOSでは以下のコマンドを実行
```bash
brew install supabase/tap/supabase
```

supabaseを起動します。
```bash
supabase start
```
初回実行後、以下の情報が `supabase/.temp` 配下に出力されます（`supabase status` でも確認可能）。

| 変数名                         | 例                               |
|--------------------------------|----------------------------------|
| `SUPABASE_URL`                | `http://127.0.0.1:54321`         |
| `SUPABASE_ANON_KEY`           | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `SUPABASE_SERVICE_ROLE_KEY`   | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `SUPABASE_DB_URL`             | `postgresql://postgres:postgres@localhost:54322/postgres` |`

またシードデータとしてCVPR2023~2025の論文データが入っています。

3. フロントエンドの起動
`.env.local`を作成します。
```bash
cp nextjs-frontend/.env.local.example nextjs-frontend/.env.local
```

`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` を先ほどの Supabase ローカルの値で更新します。

ローカルサーバーを起動します。
```bash
cd nextjs-frontend
npm install
npm run dev
```
`http://localhost:3000` で起動します。


## セットアップ手順（ローカル開発）

### 1. リポジトリの取得

```bash
git clone https://github.com/yutanpo1227/CVPaper-Reader.git
cd CVPaper-Reader
```

### 2. Supabase ローカル環境の起動
supabase cliをインストールしてください。
macOSでは以下のコマンドを実行
```bash
brew install supabase/tap/supabase
```

ローカルでsupabaseを起動します。
```bash
supabase start
```

初回実行後、以下の情報が `supabase/.temp` 配下に出力されます（`supabase status` でも確認可能）。

| 変数名                         | 例                               |
|--------------------------------|----------------------------------|
| `SUPABASE_URL`                | `http://127.0.0.1:54321`         |
| `SUPABASE_ANON_KEY`           | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `SUPABASE_SERVICE_ROLE_KEY`   | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `SUPABASE_DB_URL`             | `postgresql://postgres:postgres@localhost:54322/postgres` |

ローカル DB のスキーマとサンプルデータは以下で適用 / 再作成できます。

```bash
# 既存コンテナをリセットしてマイグレーション + seed.sql を適用
supabase db reset

# 変更を差分反映したい場合
supabase migrarion up
```

> ✅ `supabase/migrations/20240504121000_search_articles.sql` に `search_articles` 関数と URL ユニークインデックスが含まれています。リセット後に RPC が見つからない場合は `select pg_notify('pgrst','reload schema');` を一度実行して PostgREST のスキーマキャッシュを刷新してください。

### 3. 環境変数の設定

#### フロントエンド (`nextjs-frontend/.env.local`)

```bash
cp nextjs-frontend/.env.local.example nextjs-frontend/.env.local
```

`SUPABASE_URL` / `ANON_KEY` を Supabase ローカル（または本番環境）の値で更新します。

#### クローラー (`python-crawler/.env`)

```bash
cp python-crawler/.env.example python-crawler/.env
```

以下を `.env` に設定します。

```dotenv
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=<supabase_service_role_key>
EMBEDDING_MODEL_NAME=intfloat/multilingual-e5-large  # 省略時も同じ値が使用される
```

### 4. 依存のインストール

#### フロントエンド

```bash
cd nextjs-frontend
npm install
```

#### クローラー

```bash
cd python-crawler
uv sync
```

## 日常開発フロー

### Supabase の再構築・確認

- スキーマ更新後は `supabase db push` または `psql -f supabase/schema.sql` で反映。
- RPC が見つからない場合は `supabase/functions` でメタデータを再読み込み、もしくは PostgREST に `select pg_notify('pgrst','reload schema');` を送信。

### クローラーの実行

```bash
cd python-crawler

# 最新論文を取得して Supabase に upsert（埋め込み生成込）
uv run python main.py --upsert --years 2023 2024 2025

# テスト用（upsert なし）
uv run python main.py --years 2024 --limit 5
```

- 既存データと同一の URL は `on_conflict="url"` により最新メタデータで更新されます。
- 失敗ログはデフォルトで `embedding_failures.json` に書き出されます（`--no-embedding-failure-log` で抑止可能）。
- Ruff による静的解析 / フォーマット:
  - `uv run --extra dev ruff check .`
  - `uv run ruff format .`

### フロントエンド開発

```bash
cd nextjs-frontend
npm run dev          # http://localhost:3000
npm run lint         # Biome / ESLint
npm run format       # Prettier
```

`/api/search` は以下の入力形式を想定しています。

```json
POST /api/search
{
  "query": "diffusion",          // 省略可（embedding を直接渡す場合）
  "embedding": [ ... 1024 要素 ... ],
  "limit": 20,
  "alpha": 0.5                    // テキスト vs ベクトルの重み (0.0〜1.0)
}
```

`query` が指定された場合はサーバー側で `Xenova/multilingual-e5-large` を利用して問い合わせベクトルを生成します。

### ハイブリッド検索の確認

1. Supabase に `Articles` データが入っていることを確認（`supabase db reset` 直後は seed データ 2 件）。
2. フロントエンドでキーワード検索を実行。重みを調整したい場合は `alpha` の UI を適宜拡張してください。
3. API の直接検証例:

   ```bash
   curl -X POST http://localhost:3000/api/search \
     -H "Content-Type: application/json" \
     -d '{"query":"pose estimation","limit":5}'
   ```

## トラブルシューティング

| 症状 | 対処 |
|------|------|
| `search_articles` が見つからない (REST / Studio) | `supabase db reset` or `supabase db push` 後に `select pg_notify('pgrst','reload schema');` を実行し PostgREST キャッシュを更新。Studio では “Refresh metadata”。|
| URL 重複で upsert が失敗 | `articles_url_key` が作られているか確認し、重複データを削除: `delete from "Articles" ... where row_number() over (partition by url order by updated_at desc) > 1;` |
| Supabase CLI が `pgcrypto` 等の NOTICE を出す | 既に存在する拡張やポリシーに対するメッセージなので無視して問題ありません。|
| `curl ... search_articles` が 404 を返す | `SUPABASE_SERVICE_ROLE_KEY` / `apikey` を正しく設定しているかを確認。|

## 参考ドキュメント

- [Supabase CLI ローカル開発ガイド](https://supabase.com/docs/guides/cli)
- [pgvector ドキュメント](https://github.com/pgvector/pgvector)
- [sentence-transformers: intfloat/multilingual-e5-large](https://huggingface.co/intfloat/multilingual-e5-large)

---

この README はプロジェクト全体の共通的な手順をまとめています。個別の詳細は `python-crawler/README.md` と `nextjs-frontend/README.md` も参照してください。

