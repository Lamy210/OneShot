# アーキテクチャ設計

## システム構成図

```mermaid
graph TD;
  Caddy["Caddy (SSL/Proxy)"] --> Frontend["Frontend (Next.js)"]
  Frontend --> Backend["Backend (Express + tRPC)"]
  Backend --> PostgreSQL["PostgreSQL (DB)"]
  Backend --> Redis["Redis (Cache)"]
  Backend --> MinIO["MinIO (Storage)"]
  Backend --> Keycloak["Keycloak (認証)"]
  Backend --> Stripe["Stripe (決済)"]
  Backend --> Prometheus["Prometheus (監視)"]
  Backend --> Loki["Loki (ログ管理)"]
  Prometheus --> Grafana["Grafana (可視化)"]
  Loki --> Grafana
```

## 各サービスの役割

- **Caddy**: SSL終端・リバースプロキシ
- **Frontend (Next.js)**: ユーザー向けWeb UI
- **Backend (Express + tRPC)**: APIサーバー・ビジネスロジック
- **PostgreSQL**: メインDB
- **Redis**: キャッシュ・セッション管理
- **MinIO**: ファイルストレージ
- **Keycloak**: 認証・認可
- **Stripe**: 決済処理
- **Prometheus/Grafana**: 監視・可視化
- **Loki**: ログ集約 