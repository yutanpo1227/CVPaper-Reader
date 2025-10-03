# Next.js Frontend

Supabase に保存した論文情報をハイブリッド検索してカード表示するフロントエンドです。最終的に Vercel へデプロイする想定で構築します。

## セットアップ
1. 依存関係をインストール
   ```bash
   npm install
   ```
2. Supabase の anon キーと URL を `nextjs-frontend/.env.local` に設定
   ```bash
   cp nextjs-frontend/.env.local.example nextjs-frontend/.env.local
   ```
3. 開発サーバーを起動
   ```bash
   npm run dev
   ```
   ブラウザで http://localhost:3000 を開いて動作を確認します。

## Supabase との連携
- Supabase 側では `supabase/schema.sql` を適用して `Articles` テーブルと索引を作成しておきます。
- フロント側は anon キーで読み取り専用アクセスを行います。

## デプロイ想定
- Vercel でプロジェクトを作成し、環境変数 `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` を設定します。
- Supabase プロジェクトの RLS により読み取りは公開、書き込みは serverless 関数（service role）経由で行う構成にします。

## Search API
- `POST /api/search`
  - Body:
    ```json
    {
      "query": "diffusion",
      "embedding": [0.1, 0.2, ...],
      "limit": 10,
      "alpha": 0.5
    }
    ```
    - `embedding` は `multilingual-e5-large` で生成した 1024 次元ベクトルを想定。未指定の場合はサーバー側で `query` を埋め込みに変換します。
    - `alpha` は テキストスコアとベクトルスコアの重み (0-1)。未指定は 0.5。
  - レスポンス: `articles` 配列（Supabase から返却されたメタデータ + `score`）。

開発時はブラウザや `curl` などで以下のように呼び出せます。
```bash
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query":"diffusion","limit":5}'
```

- UI からはトップページでキーワードと件数を指定して検索できます。
