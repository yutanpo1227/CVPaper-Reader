## CVPR 2023-2025 クローラー計画

### 背景/目的
- CVPR 2023〜2025 の論文（タイトル/著者/年/URL/アブストラクト）を収集し、重複排除と正規化を行う。

### スコープ
- 含む: 公式Proceedings/論文ページのスクレイピング手順、抽出、正規化、重複判定（タイトル類似）。
- 含まない: 埋め込み生成、DB書き込み（次フェーズ）。

### 実施手順
1. 収集対象URLの決定（CVPR公式/IEEE/OpenAccess）。可用性とHTML構造を調査。
2. フェッチ: `httpx` + リトライ（`tenacity`）、レート制御（スリープ/簡易キュー）。
3. 解析: `BeautifulSoup` + `lxml`、タイトル/著者/URL/アブストラクトのセレクタ確定。
4. 正規化: ホワイトスペース/Unicode正規化、URL正規化（https, trailing slash統一）。
5. 既知重複の排除: タイトルの正規化キー + 距離（Levenshtein 近似: Python標準で代替は類似度閾値）。
6. 年の付与: 収集ソース単位で固定、またはページ内表記から抽出。

### 実装/設定メモ
- クローラ設計
```
class CvprCrawler:
    def __init__(self, years: list[int]):
        ...
    async def fetch_index(self, year: int) -> list[str]:
        ...  # 論文ページURL一覧
    async def fetch_paper(self, url: str) -> Article:
        ...  # 単一論文の抽出
    async def run(self) -> list[Article]:
        ...
```

- レート制御例: 1〜2 req/sec 目安、失敗時指数バックオフ。

### 検証観点
- 年ごとに数百〜数千件のURLを取得できる。
- サンプル10件で `Article` として必須項目が埋まる。
- 重複が目視で減っている（同一タイトル異URLの統合）。

### 完了条件（DoD）
- 2023/2024/2025 の論文URLから必要フィールドを抽出できる関数が完成。
- 例外処理・リトライ・簡易レート制御が実装済み。


