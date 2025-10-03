## フロントの検索API計画（ハイブリッド検索）

### 背景/目的
- 次の2種類の検索を組み合わせ、関連度の高い順に返す。
  - テキスト全文検索（`tsvector`/`tsquery`）
  - ベクトル近傍検索（`pgvector` cosine）

### スコープ
- 含む: Next.js App Router に`/api/search` を実装、Supabase RPC/SQL の選択、スコア正規化/融合。
- 含まない: UI表示（別タスク）。

### 実施手順
1. SQL/RPC の設計
   - A: 単一SQLで両スコアを出し線形結合 `score = a*text + b*vector`
   - B: それぞれTopKを取得後クライアントで融合（RRFなど）
   - 初期はAを採用（単純/コスト少）
2. エンドポイント: `nextjs-frontend/src/app/api/search/route.ts`
3. 入力: `q: string`, `limit?: number`, `alpha?: number`（重み）
4. 出力: articles配列（タイトル/著者/年/URL/スコア）

### SQL 例（概略: A案）
```
with q as (
  select
    to_tsquery('simple', replace(:q, ' ', ' & ')) as tsq,
    (select embedding from websearch_embed(:q)) as qvec
)
select
  a.*, 
  (0.5 * ts_rank(a.ft, (select tsq from q)) +
   0.5 * (1 - (a.abstract_embedding <=> (select qvec from q)))) as score
from public."Articles" a
where a.ft @@ (select tsq from q)
order by score desc
limit :limit;
```

注: `websearch_embed(:q)` は実際にはフロントで e5 により埋め込みを生成して送るか、サーバーでAPIを叩く。初期はクエリ埋め込みのみフロントで生成して送信する方針。

### 検証観点
- 同一クエリで全文/ベクトル単独よりも精度が向上している感覚値。
- `alpha` 調整でランキングが変化する。

### 完了条件（DoD）
- `/api/search` がリクエストを受け、Supabaseから結果を取得して返す。
- 例外時にエラーレスポンス（400/500）が返る。


