# Computer Visonに関する論文をまとめて検索できるアプリケーション

## ディレクトリ構造

- python-crawler: Pythonで作成されたクローラー
- nextjs-frontend: Next.jsで作成されたフロントエンド

## python-crawler

- CVPR2023~2025の論文をクロール
- ベクトルデータベースに論文のアブストラクトをエンべディングして格納
    - メタデータとして、論文のタイトル、著者、出版年、URL、アブストラクトを格納
    - ベクトルとして、論文のアブストラクトをエンベディングして格納

上記を自動で実行するプログラムを作成

### 技術スタック

- uv: Pythonのパッケージマネージャー
- supabase: ベクトルデータベース
- multilingual-e5-large: 多言語のテキストをエンベディングするモデル

## nextjs-frontend

- フロントエンド
- ベクトルデータベースから論文のアブストラクトをハイブリッド検索(テキスト検索とベクトル検索)できる
- タイトル、著者、出版年、URLをカード形式で表示する(スコアが高い順に表示)

### 技術スタック

- Next.js: フロントエンド
- Tailwind CSS: スタイリング
- Shadcn UI: コンポーネントライブラリ
- Supabase: ベクトルデータベース
- multilingual-e5-large: 多言語のテキストをエンベディングするモデル

## データスキーマ
Articles
- id: uuid
- title: string
- authors: string
- year: string
- url: string(unique)
- abstract: string
- abstract_embedding: vector
- created_at: timestamp
- updated_at: timestamp