## デプロイ/運用 計画

### 背景/目的
- 継続的にアプリを提供し、データ更新を安定運用する。

### スコープ
- 含む: フロントのホスティング、Secrets管理、crawlerの実行基盤、コスト/レート制御。
- 含まない: 大規模監視SaaSの選定。

### 実施手順
1. フロント: Vercel or Supabase Hosting。環境変数はプロジェクトSecretsで管理。
2. Crawler: GitHub Actions で定期実行 or Supabase Edge Functions/CRON も検討。
3. Secrets: `SUPABASE_URL`/`ANON_KEY`/`SERVICE_ROLE_KEY` を環境に注入。
4. コスト: 埋め込み生成はバッチ/キャッシュ、不要再計算を避ける。
5. バックアップ: Postgres の自動バックアップを確認。

### 検証観点
- 本番環境で `/api/search` が応答する。
- 定期ジョブが成功し続ける（失敗時に通知）。

### 完了条件（DoD）
- フロントの公開URLとSecrets設定が揃う。
- スケジュール実行が安定し、データが更新される。


