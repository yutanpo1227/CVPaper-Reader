# Supabase Setup

このディレクトリには Supabase プロジェクトの初期セットアップに必要なスキーマと手順をまとめています。最終的に Vercel + Supabase へデプロイすることを想定し、まずはローカルから順次整えてください。

## 前提
- Supabase アカウントと Organization が作成済みであること
- Supabase CLI を利用する場合は `supabase login` が完了していること

## 手順概要
1. **プロジェクト作成**: Supabase ダッシュボードで新規プロジェクトを作成
2. **API 情報取得**: Project Settings → API から `Project URL` / `anon` / `service_role` を取得
3. **環境変数の整備**
   - `python-crawler/.env.example`
   - `nextjs-frontend/.env.local.example`
4. **スキーマ適用**: `schema.sql` または `supabase/migrations` を Supabase SQL Editor か CLI で適用
5. **RLS 確認**: Policies タブで `SELECT` が anon に公開、書き込みは service_role に限定されていることを確認
6. **検証**: テストデータを挿入・検索して全文検索とベクトル検索が動作することを後続ステップで確認

## ローカル実行 (Supabase CLI)
- 初期化済みの `supabase/config.toml` と `supabase/migrations` を用意しています。
- 下記コマンドでローカルスタックを起動できます。

```bash
supabase start
```

- 停止する場合は `supabase stop` を利用してください。

## SQL / マイグレーションの適用
- Supabase の SQL Editor に `schema.sql` の内容を貼り付けて実行するか、CLI で以下のように適用します。

```bash
supabase db push --file supabase/schema.sql
# または
supabase db reset
```

※ pgvector の IVFFLAT インデックスはデータ件数がある程度揃ってから `analyze` を行うことを推奨します。

## 確認ポイント
- `public."Articles"` テーブルが作成されている
- `abstract_embedding` 列と `ft` の生成列が存在する
- `articles_embedding_idx` / `articles_ft_idx` のインデックスが作成済み
- RLS ポリシーが `anon` 読み取り許可、`service_role` のみ書き込み許可になっている

以上で Supabase 側の初期セットアップは完了です。

## サンプルデータ
- `supabase/seed.sql` に CVPR 論文2件分のメタデータと 1024 次元ベクトル埋め込みを格納しています。
- `supabase db reset` を実行すると自動で投入されるため、ローカル検索の動作検証に利用できます。

