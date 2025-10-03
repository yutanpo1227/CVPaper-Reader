## Supabase セットアップ計画

### 背景/目的
- 論文アブストラクトと埋め込みを格納するためにSupabase（Postgres + pgvector）を用意する。
- `Articles`テーブルと`abstract_embedding`ベクトル列を作成し、ハイブリッド検索の下地を作る。

### スコープ
- 含む: Supabaseプロジェクト作成、環境変数定義、スキーマDDL、索引作成、RLS設計方針。
- 含まない: フロント/バックの実装細部、クローラー本体。

### 実施手順
1. Supabase プロジェクト作成（Organization/Project）
2. APIキー（anon, service_role）とURLを取得
3. `.env`雛形の定義（frontend と crawler 用）
4. pgvector拡張を有効化し、`Articles`テーブルを作成
5. ベクトル列のインデックス作成（IVFFLAT推奨）
6. RLSポリシー: 読み取りは公開、書き込みはサーバー/クローラーのservice_roleのみ
7. ハイブリッド検索用に`tsvector`生成列とGINインデックスを追加（タイトル/アブストラクト）

### 実装/設定メモ
- 環境変数（例）
```
# crawler 用 (.env)
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# frontend 用 (.env.local)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

- DDL（概略）
```
create extension if not exists vector;

create table if not exists public."Articles" (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  authors text not null,
  year text not null,
  url text not null,
  abstract text not null,
  abstract_embedding vector(1024),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ベクトル近傍探索用（IVFFLAT）
create index if not exists articles_embedding_idx
  on public."Articles" using ivfflat (abstract_embedding vector_cosine_ops)
  with (lists = 100);

-- ハイブリッド検索用 tsvector 生成列
alter table public."Articles"
  add column if not exists ft tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(title,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(abstract,'')), 'B')
  ) stored;

create index if not exists articles_ft_idx
  on public."Articles" using gin (ft);

-- 更新トリガ（updated_at）
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;$$;

drop trigger if exists set_articles_updated_at on public."Articles";
create trigger set_articles_updated_at
before update on public."Articles"
for each row execute procedure set_updated_at();
```

- RLS 方針
```
alter table public."Articles" enable row level security;

-- 読み取り（anon許容: 公開検索用）
create policy if not exists articles_select_all on public."Articles"
for select using (true);

-- 書き込み（service_role のみ）
create policy if not exists articles_write_service on public."Articles"
for all to service_role using (true) with check (true);
```

### 検証観点
- `Articles` 作成とインデックスが完了している。
- サンプルレコードを手動挿入し、`ft @@ to_tsquery('simple', 'query')` が動く。
- ベクトル近傍検索がエラーなく実行できる（後続で確認）。

### 完了条件（DoD）
- Supabase プロジェクトと環境変数が整理されている。
- `Articles` スキーマ、`ft`列、インデックス、RLS方針が適用済み。
- 手動テストで全文検索が成功。


