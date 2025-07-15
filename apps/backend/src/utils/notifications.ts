import { PrismaClient } from '@prisma/client';
import { sendEmail } from './email';
import { logger } from './logger';
import webpush from 'web-push';

const prisma = new PrismaClient();

// VAPID設定の必須チェック（開発時は一時的に無効化）
if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    console.warn('VAPID_PUBLIC_KEYおよびVAPID_PRIVATE_KEY環境変数が未設定です。プッシュ通知機能は無効になります。');
    // throw new Error('VAPID_PUBLIC_KEYおよびVAPID_PRIVATE_KEY環境変数が未設定です。プッシュ通知のため必ず設定してください。');
} else {
    // VAPID設定（鍵が設定されている場合のみ）
    webpush.setVapidDetails(
        'mailto:admin@oneshot-platform.com',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
}

export interface CreateNotificationParams {
    userId: string;
    type: 'message' | 'payment' | 'system' | 'post' | 'payout';
    title: string;
    body: string;
    link?: string;
}

// 通知設定を取得
const getNotificationSettings = async (userId: string) => {
    let settings = await prisma.notificationSettings.findUnique({
        where: { userId },
    });

    // 設定が存在しない場合はデフォルト設定を作成
    if (!settings) {
        settings = await prisma.notificationSettings.create({
            data: { userId },
        });
    }

    return settings;
};

// 静寂時間内かチェック
const isInQuietHours = (settings: any) => {
    if (!settings.quietHoursStart || !settings.quietHoursEnd) {
        return false;
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const [startHour, startMin] = settings.quietHoursStart.split(':').map(Number);
    const [endHour, endMin] = settings.quietHoursEnd.split(':').map(Number);

    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    // 日をまたぐ場合の処理
    if (startTime > endTime) {
        return currentTime >= startTime || currentTime <= endTime;
    } else {
        return currentTime >= startTime && currentTime <= endTime;
    }
};

// 通知タイプが有効かチェック
const isNotificationTypeEnabled = (settings: any, type: string) => {
    switch (type) {
        case 'payment':
            return settings.paymentNotifications;
        case 'post':
            return settings.postNotifications;
        case 'message':
            return settings.messageNotifications;
        case 'system':
            return settings.systemNotifications;
        case 'payout':
            return settings.payoutNotifications;
        default:
            return true;
    }
};

/**
 * 通知を作成する（動的設定対応）
 */
export async function createNotification(params: CreateNotificationParams) {
    try {
        const settings = await getNotificationSettings(params.userId);

        // 通知タイプが無効の場合は作成しない
        if (!isNotificationTypeEnabled(settings, params.type)) {
            logger.info('Notification skipped due to user settings', {
                userId: params.userId,
                type: params.type,
                title: params.title
            });
            return null;
        }

        // 静寂時間内の場合は作成しない（システム通知は除く）
        if (params.type !== 'system' && isInQuietHours(settings)) {
            logger.info('Notification skipped due to quiet hours', {
                userId: params.userId,
                type: params.type,
                title: params.title
            });
            return null;
        }

        // アプリ内通知を作成
        let notification = null;
        if (settings.inAppEnabled) {
            notification = await prisma.notification.create({
                data: {
                    userId: params.userId,
                    type: params.type,
                    title: params.title,
                    body: params.body,
                    link: params.link,
                },
            });
        }

        // メール通知を送信
        if (settings.emailEnabled) {
            try {
                // ユーザー情報を取得
                const user = await prisma.user.findUnique({
                    where: { id: params.userId },
                    select: { email: true, nickname: true }
                });

                if (user?.email) {
                    await sendEmail({
                        to: user.email,
                        subject: `OneShot Platform - ${params.title}`,
                        html: `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                <h2 style="color: #333;">${params.title}</h2>
                                <p>${params.body}</p>
                                ${params.link ? `<p><a href="${process.env.FRONTEND_URL}${params.link}" style="color: #007bff;">詳細を見る</a></p>` : ''}
                                <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
                                <p style="color: #666; font-size: 12px;">
                                    このメールはOneShot Platformからの自動送信です。<br>
                                    通知設定は<a href="${process.env.FRONTEND_URL}/settings?tab=notifications" style="color: #007bff;">設定ページ</a>で変更できます。
                                </p>
                            </div>
                        `
                    });

                    logger.info('Email notification sent', {
                        userId: params.userId,
                        email: user.email,
                        type: params.type,
                        title: params.title
                    });
                }
            } catch (error) {
                logger.error('Failed to send email notification', {
                    userId: params.userId,
                    type: params.type,
                    error
                });
            }
        }

        // プッシュ通知を送信
        if (settings.pushEnabled) {
            try {
                await sendPushNotification({
                    userId: params.userId,
                    title: params.title,
                    body: params.body,
                    link: params.link,
                });

                logger.info('Push notification sent', {
                    userId: params.userId,
                    type: params.type,
                    title: params.title
                });
            } catch (error) {
                logger.error('Failed to send push notification', {
                    userId: params.userId,
                    type: params.type,
                    error
                });
            }
        }

        return notification;
    } catch (error) {
        logger.error('通知作成エラー:', error);
        throw error;
    }
}

/**
 * 決済完了時の通知を作成
 */
export async function createPaymentNotification(
    userId: string,
    postTitle: string,
    amount: number
) {
    return createNotification({
        userId,
        type: 'payment',
        title: '決済完了',
        body: `投稿「${postTitle}」の決済が完了しました。金額: ¥${amount.toLocaleString()}`,
        link: '/dashboard',
    });
}

/**
 * 投稿承認時の通知を作成
 */
export async function createPostApprovedNotification(
    userId: string,
    postTitle: string,
    postId: string
) {
    return createNotification({
        userId,
        type: 'post',
        title: '投稿が承認されました',
        body: `「${postTitle}」が承認され、公開されました。`,
        link: `/dashboard?post=${postId}`,
    });
}

/**
 * 投稿却下時の通知を作成
 */
export async function createPostRejectedNotification(
    userId: string,
    postTitle: string,
    reason?: string
) {
    return createNotification({
        userId,
        type: 'post',
        title: '投稿が却下されました',
        body: `「${postTitle}」が却下されました。${reason ? `理由: ${reason}` : ''}`,
        link: '/dashboard',
    });
}

/**
 * 振込完了時の通知を作成
 */
export async function createPayoutNotification(
    userId: string,
    amount: number
) {
    return createNotification({
        userId,
        type: 'payout',
        title: '振込が完了しました',
        body: `${amount.toLocaleString()}円の振込が完了しました。`,
        link: '/settings?tab=payments',
    });
}

/**
 * システム通知を作成
 */
export async function createSystemNotification(
    userId: string,
    title: string,
    body: string,
    link?: string
) {
    return createNotification({
        userId,
        type: 'system',
        title,
        body,
        link,
    });
}

/**
 * メッセージ通知を作成
 */
export async function createMessageNotification(
    userId: string,
    senderName: string,
    messagePreview: string
) {
    return createNotification({
        userId,
        type: 'message',
        title: `新しいメッセージ: ${senderName}`,
        body: messagePreview,
        link: '/messages',
    });
}

/**
 * プッシュ通知を送信
 */
export async function sendPushNotification(params: {
    userId: string;
    title: string;
    body: string;
    link?: string;
}) {
    try {
        // ユーザーのプッシュ通知設定を取得
        const user = await prisma.user.findUnique({
            where: { id: params.userId },
            include: {
                notificationSettings: true,
                pushSubscriptions: true
            }
        });

        if (!user?.notificationSettings?.pushEnabled) {
            logger.info('Push notifications disabled for user', { userId: params.userId });
            return;
        }

        if (!user.pushSubscriptions || user.pushSubscriptions.length === 0) {
            logger.info('No push subscriptions found for user', { userId: params.userId });
            return;
        }

        // プッシュ通知のペイロードを作成
        const payload = {
            title: params.title,
            body: params.body,
            icon: '/icon-192x192.png',
            badge: '/badge-72x72.png',
            data: {
                url: params.link || '/dashboard',
                timestamp: new Date().toISOString()
            },
            actions: [
                {
                    action: 'view',
                    title: '表示',
                    icon: '/view-icon.png'
                },
                {
                    action: 'dismiss',
                    title: '閉じる'
                }
            ]
        };

        // 各サブスクリプションにプッシュ通知を送信
        const sendPromises = user.pushSubscriptions.map(async (subscription) => {
            try {
                const pushSubscription = {
                    endpoint: subscription.endpoint,
                    keys: {
                        p256dh: subscription.p256dh,
                        auth: subscription.auth
                    }
                };

                await webpush.sendNotification(
                    pushSubscription,
                    JSON.stringify(payload)
                );

                logger.info('Push notification sent successfully', {
                    userId: params.userId,
                    subscriptionId: subscription.id,
                    title: params.title
                });
            } catch (error: any) {
                // サブスクリプションが無効な場合は削除
                if (error.statusCode === 410) {
                    await prisma.pushSubscription.delete({
                        where: { id: subscription.id }
                    });
                    logger.info('Invalid push subscription removed', {
                        userId: params.userId,
                        subscriptionId: subscription.id
                    });
                } else {
                    logger.error('Failed to send push notification to subscription', {
                        userId: params.userId,
                        subscriptionId: subscription.id,
                        error: error.message
                    });
                }
            }
        });

        await Promise.allSettled(sendPromises);

    } catch (error) {
        logger.error('Push notification sending failed', {
            userId: params.userId,
            error
        });
        throw error;
    }
} 