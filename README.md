# OneShot Platform

**一発完結の依頼マッチングプラットフォーム**

技術者とクリエイターのためのシンプルで安全な依頼システムです。複雑な交渉不要で、明確な依頼内容により確実に成果を獲得できます。

## 🚀 クイックスタート

### 前提条件

- Docker & Docker Compose
- Node.js 18+
- pnpm 8+

### セットアップ

1. **リポジトリのクローン**
   ```bash
   git clone https://github.com/your-org/oneshot-platform.git
   cd oneshot-platform
   ```

2. **環境変数の設定**
   ```bash
   cp .env.example .env.local
   # .env.local を編集して実際の値を設定
   ```

3. **自動セットアップの実行**
   ```bash
   ./scripts/bootstrap.sh
   ```

4. **アプリケーションへのアクセス**
   - メインサイト: http://localhost (または設定したドメイン)
   - 管理画面: http://localhost:8080 (Keycloak)
   - 監視: http://localhost:9090 (Prometheus), http://localhost:3001 (Grafana)

## 📋 機能概要

### 主要機能

- **依頼投稿・管理**: カテゴリ別の案件投稿と検索
- **安全決済**: Stripe Connect によるエスクロー決済
- **ユーザー認証**: Keycloak による RBAC 認証・認可
- **コンテンツモデレーション**: NGワード自動検出とAIモデレーション
- **リアルタイム監視**: Prometheus + Grafana によるメトリクス監視
- **ログ管理**: Loki + Grafana による集約ログ管理

### 技術スタック

- **フロントエンド**: Next.js 14 (App Router), React, Tailwind CSS
- **バックエンド**: Express.js, tRPC, Prisma ORM
- **データベース**: PostgreSQL, Redis
- **認証**: Keycloak (OpenID Connect)
- **決済**: Stripe Connect
- **ストレージ**: MinIO (S3互換)
- **監視**: Prometheus, Grafana, Loki, Jaeger
- **インフラ**: Docker, Kubernetes, Caddy (リバースプロキシ)

## 🏗️ アーキテクチャ

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│   Caddy     │────│  Frontend    │────│  Backend    │
│ (SSL/Proxy) │    │  (Next.js)   │    │ (Express)   │
└─────────────┘    └──────────────┘    └─────────────┘
                                              │
                   ┌──────────────┬─────────────┬──────────────┐
                   │              │             │              │
            ┌──────────┐  ┌─────────────┐ ┌──────────┐ ┌─────────────┐
            │PostgreSQL│  │   Redis     │ │  MinIO   │ │  Keycloak   │
            │    DB    │  │  (Cache)    │ │(Storage) │ │   (Auth)    │
            └──────────┘  └─────────────┘ └──────────┘ └─────────────┘
```

## 📁 プロジェクト構成

```
oneshot-platform/
├── apps/
│   ├── frontend/          # Next.js フロントエンド
│   └── backend/           # Express + tRPC バックエンド
├── packages/
│   ├── ui/                # 共通UIコンポーネント
│   ├── config/            # 共通設定
│   └── utils/             # 共通ユーティリティ
├── docker/                # Dockerファイル
├── k8s/                   # Kubernetesマニフェスト
├── scripts/               # セットアップ・運用スクリプト
├── .github/workflows/     # CI/CDパイプライン
└── docs/                  # ドキュメント
```

## 🔧 開発

### 開発環境のセットアップ

```bash
# 依存関係のインストール
pnpm install

# 開発サーバーの起動
pnpm dev

# データベースマイグレーション
pnpm db:migrate

# テストの実行
pnpm test
```

### コマンド一覧

```bash
# ビルド
pnpm build

# リント
pnpm lint

# 型チェック
pnpm type-check

# テスト (カバレッジ付き)
pnpm test:coverage

# E2Eテスト
pnpm test:e2e

# 全体チェック
pnpm checkall
```

## 🚀 デプロイ

### Docker Compose (推奨)

```bash
# 本番用デプロイ
docker-compose up -d

# ログの確認
docker-compose logs -f

# サービス停止
docker-compose down
```

### Kubernetes

```bash
# Helm でデプロイ
helm install oneshot-platform ./k8s/helm/oneshot \
  --namespace oneshot \
  --create-namespace

# デプロイ状況確認
kubectl get pods -n oneshot
```

## 📊 監視・運用

### メトリクス監視

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001
  - ダッシュボード: CPU/メモリ使用率、レスポンス時間、エラー率

### ログ監視

- **Loki**: 集約ログストレージ
- **Grafana Logs**: ログクエリとアラート

### アラート設定

主要なアラート条件:
- API レスポンス時間 > 2秒
- エラー率 > 5%
- CPU使用率 > 80%
- メモリ使用率 > 90%

## 🔒 セキュリティ

### 実装済みセキュリティ対策

- **HTTPS**: Caddy による Let's Encrypt 自動SSL
- **CSP**: Content Security Policy ヘッダー
- **Rate Limiting**: 100req/min の制限
- **Input Validation**: Zod による型安全なバリデーション
- **SQL Injection防止**: Prisma ORM のパラメータバインド
- **XSS防止**: React の自動エスケープ
- **認証**: Keycloak による堅牢な認証・認可

### 定期セキュリティスキャン

- **Trivy**: 脆弱性スキャン (週次)
- **ZAP**: Webアプリケーション脆弱性テスト
- **Dependabot**: 依存関係の脆弱性監視

## 🧪 品質保証

### 自動テスト

- **Unit Tests**: Jest (≥90% カバレッジ)
- **E2E Tests**: Playwright
- **Accessibility**: axe-core (WCAG 2.1 AA準拠)
- **Performance**: Lighthouse (≥90点)

### CI/CDパイプライン

1. **CI**: コードチェック、テスト、ビルド
2. **QA**: セキュリティスキャン、パフォーマンステスト
3. **CD**: 本番デプロイ、ヘルスチェック

## 📝 API仕様

### 主要エンドポイント

- `POST /api/trpc/posts.create` - 投稿作成
- `GET /api/trpc/posts.list` - 投稿一覧取得
- `POST /api/trpc/reports.create` - 通報作成
- `POST /api/payment/checkout` - 決済開始

詳細なAPI仕様: [OpenAPI仕様書](docs/openapi.yaml)

## 🤝 コントリビューション

1. Issue を作成して機能・バグを報告
2. Feature branch を作成
3. テストを書き、品質ゲートを通過させる
4. Pull Request を作成

### 開発ガイドライン

- コミットメッセージ: [Conventional Commits](https://www.conventionalcommits.org/)
- コードスタイル: ESLint + Prettier
- テストカバレッジ: 90%以上維持

## 📄 ライセンス

MIT License

## 📞 サポート

- **Issues**: GitHub Issues でバグ報告・機能要望
- **Discussions**: GitHub Discussions で質問・議論
- **Email**: support@oneshot.example

---

## 🔗 関連リンク

- [設計ドキュメント](docs/design.md)
- [API仕様書](docs/openapi.yaml)
- [運用ガイド](docs/runbook.md)
- [ADR (Architecture Decision Records)](docs/adr/)

---

**Built with ❤️ by the OneShot Team**
