# OneShot Platform 運用ガイド

## 障害対応フローチャート

### 1. サービス障害

#### 1.1 フロントエンド（Next.js）障害

**症状**: ユーザーがサイトにアクセスできない

**初動対応**:
1. ヘルスチェック確認
   ```bash
   curl -f http://localhost:3000/health
   ```

2. ログ確認
   ```bash
   docker-compose logs frontend
   ```

3. サービス再起動
   ```bash
   docker-compose restart frontend
   ```

**エスカレーション条件**:
- 再起動後も30秒以内に復旧しない
- CPU使用率が90%以上を継続

#### 1.2 バックエンド（Express + tRPC）障害

**症状**: API呼び出しが失敗する

**初動対応**:
1. API ヘルスチェック
   ```bash
   curl -f http://localhost:3001/health
   ```

2. データベース接続確認
   ```bash
   docker-compose exec backend npx prisma migrate status
   ```

3. ログ確認とサービス再起動
   ```bash
   docker-compose logs backend
   docker-compose restart backend
   ```

**エスカレーション条件**:
- データベース接続エラーが継続
- メモリ使用率が95%以上

### 2. データベース障害

#### 2.1 PostgreSQL 障害

**症状**: アプリケーションがDBに接続できない

**初動対応**:
1. PostgreSQL 状態確認
   ```bash
   docker-compose exec postgres pg_isready -U oneshot
   ```

2. ディスク容量確認
   ```bash
   df -h
   docker system df
   ```

3. ログ確認
   ```bash
   docker-compose logs postgres
   ```

4. 必要に応じて再起動
   ```bash
   docker-compose restart postgres
   ```

**エスカレーション条件**:
- ディスク容量不足（90%以上）
- データ破損の可能性
- 30分以上復旧しない

#### 2.2 Redis 障害

**症状**: キャッシュが効かない、セッション切れが多発

**初動対応**:
1. Redis 接続確認
   ```bash
   docker-compose exec redis redis-cli ping
   ```

2. メモリ使用量確認
   ```bash
   docker-compose exec redis redis-cli info memory
   ```

3. 必要に応じて再起動
   ```bash
   docker-compose restart redis
   ```

### 3. 認証システム（Keycloak）障害

**症状**: ユーザーがログインできない

**初動対応**:
1. Keycloak ヘルスチェック
   ```bash
   curl -f http://localhost:8080/health/ready
   ```

2. Realm設定確認
   ```bash
   # Keycloak管理画面でRealm状態確認
   # http://localhost:8080/admin
   ```

3. ログ確認とサービス再起動
   ```bash
   docker-compose logs keycloak
   docker-compose restart keycloak
   ```

**エスカレーション条件**:
- Realm データが破損
- データベース接続問題が継続

### 4. 決済システム（Stripe）障害

**症状**: 決済が完了しない、Webhook受信エラー

**初動対応**:
1. Stripe ダッシュボード確認
   - https://dashboard.stripe.com
   - Webhook配信状況確認

2. Webhook エンドポイント確認
   ```bash
   curl -f http://localhost:3001/api/webhook/stripe
   ```

3. Webhook Secret確認・更新
   ```bash
   # .env.local の STRIPE_WEBHOOK_SECRET を確認
   # 必要に応じてStripeダッシュボードで更新
   ```

**エスカレーション条件**:
- Stripe側でサービス障害が発生
- 決済データの不整合が発生

### 5. ストレージ（MinIO）障害

**症状**: ファイルアップロード・ダウンロードエラー

**初動対応**:
1. MinIO ヘルスチェック
   ```bash
   curl -f http://localhost:9000/minio/health/live
   ```

2. バケット確認
   ```bash
   docker-compose exec minio mc ls minio/oneshot-uploads
   ```

3. ディスク容量確認
   ```bash
   df -h /var/lib/docker/volumes/oneshot_minio_data
   ```

**エスカレーション条件**:
- ディスク容量不足
- データ破損の可能性

## 監視アラート対応

### Prometheus アラート

#### HighCPUUsage
- **閾値**: CPU使用率 > 80%（5分間継続）
- **対応**: プロセス調査、必要に応じてスケールアップ

```bash
# CPU使用率上位プロセス確認
docker stats --no-stream
top -p $(docker-compose ps -q)
```

#### HighMemoryUsage
- **閾値**: メモリ使用率 > 90%（5分間継続）
- **対応**: メモリリーク調査、サービス再起動

```bash
# メモリ使用量詳細確認
docker-compose exec backend ps aux --sort=-%mem | head -10
```

#### HighResponseTime
- **閾値**: レスポンス時間 > 2秒（p95、5分間継続）
- **対応**: スロークエリ調査、キャッシュ確認

```bash
# スロークエリログ確認
docker-compose exec postgres tail -f /var/log/postgresql/postgresql.log
```

#### DatabaseConnectionErrors
- **閾値**: DB接続エラー > 5件/分
- **対応**: コネクションプール設定確認、DB再起動

### Grafana アラート

#### DiskSpaceUsage
- **閾値**: ディスク使用率 > 85%
- **対応**: ログローテーション、古いイメージ削除

```bash
# ディスククリーンアップ
docker system prune -f
docker volume prune -f
```

#### ErrorRate
- **閾値**: エラー率 > 5%（10分間継続）
- **対応**: エラーログ調査、アプリケーション再起動

## 定期メンテナンス

### 日次タスク

1. **ログ確認**
   ```bash
   # エラーログチェック
   docker-compose logs --since 24h | grep -i error
   ```

2. **バックアップ確認**
   ```bash
   # データベースバックアップ確認
   ls -la /backup/postgres/
   ```

### 週次タスク

1. **セキュリティスキャン**
   ```bash
   # 脆弱性スキャン実行
   trivy image oneshot/frontend:latest
   trivy image oneshot/backend:latest
   ```

2. **依存関係更新確認**
   ```bash
   # npm audit実行
   pnpm audit
   ```

### 月次タスク

1. **パフォーマンス監視レポート**
   - Grafanaダッシュボードをエクスポート
   - レスポンス時間・エラー率の推移確認

2. **容量計画**
   - データベースサイズ増加率確認
   - ストレージ使用量予測

## 緊急時連絡先

| 役割 | 担当者 | 連絡先 | 対応時間 |
|------|--------|--------|----------|
| インフラ責任者 | 山田太郎 | yamada@oneshot.example | 24/7 |
| アプリケーション責任者 | 鈴木花子 | suzuki@oneshot.example | 平日9-18時 |
| セキュリティ責任者 | 田中次郎 | tanaka@oneshot.example | 24/7 |

## 復旧手順

### 全体サービス復旧

1. **段階的サービス復旧**
   ```bash
   # 1. インフラサービス起動
   docker-compose up -d postgres redis minio

   # 2. 認証サービス起動
   docker-compose up -d keycloak

   # 3. アプリケーションサービス起動
   docker-compose up -d backend frontend

   # 4. プロキシサービス起動
   docker-compose up -d caddy
   ```

2. **ヘルスチェック実行**
   ```bash
   # 各サービスの動作確認
   ./scripts/health-check.sh
   ```

### データベース復旧

1. **バックアップからの復元**
   ```bash
   # PostgreSQL復元
   docker-compose exec postgres pg_restore -U oneshot -d oneshot_db /backup/latest.dump
   ```

2. **マイグレーション確認**
   ```bash
   # Prisma migration status確認
   docker-compose exec backend npx prisma migrate status
   ```

## 問い合わせ対応

### Slack通知設定

重要なアラートは Slack チャンネル `#oneshot-alerts` に自動通知されます。

### エスカレーション基準

- **P0（最高）**: サービス全停止、データ損失リスク
- **P1（高）**: 主要機能停止、セキュリティインシデント
- **P2（中）**: 一部機能停止、パフォーマンス劣化
- **P3（低）**: 軽微な不具合、改善要望

### 対応時間目標

- **P0**: 15分以内に初動対応開始
- **P1**: 30分以内に初動対応開始
- **P2**: 2時間以内に対応開始
- **P3**: 1営業日以内に対応開始
