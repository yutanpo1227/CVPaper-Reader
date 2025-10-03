## 埋め込み生成とUpsert 計画

### 背景/目的
- `multilingual-e5-large` を用いてアブストラクトをベクトル化し、Supabase にUpsertする。
- バッチ処理によりAPI制限/コストを抑えつつ、失敗時の再実行を容易にする。

### スコープ
- 含む: 埋め込み生成、バッチ化、再実行戦略、Supabase Upsert、整合性担保。
- 含まない: フロントの検索実装。

### 実施手順
1. 埋め込みクライアントの選定（`sentence-transformers` or API 経由）。
2. `batch_size` と並列度の決定（例: 16〜64、GPU/CPU環境に応じ調整）。
3. 正規化（L2 normalize）と `vector(1024)` への収め方確認。
4. Upsert キー: タイトル + 年のハッシュ、または URL をユニークキーとする。
5. 再実行: 失敗記録テーブルorローカルJSONログで再試行可能に。

### 実装/設定メモ
- 依存（例）
```
pip install sentence-transformers torch --extra-index-url https://download.pytorch.org/whl/cpu
```

- 疑似コード
```
from sentence_transformers import SentenceTransformer
import numpy as np

model = SentenceTransformer("intfloat/multilingual-e5-large")

def embed_texts(texts: list[str]) -> list[list[float]]:
    embeddings = model.encode([f"query: {t}" for t in texts], normalize_embeddings=True)
    return embeddings.tolist()

def upsert_articles(articles: list[Article]):
    # supabase python client で upsert
    ...
```

- Supabase Upsert 例（概略）
```
supabase.table("Articles").upsert(
  [article.model_dump() for article in articles],
  on_conflict="url"
)
```

### 検証観点
- サンプル10件で埋め込み長が1024であること。
- Upsertが重複を作らず、更新は `updated_at` が更新されること。

### 完了条件（DoD）
- バッチ埋め込み + Upsert のスクリプトが再実行可能に整う。
- 失敗時の再試行手段が用意されている。


