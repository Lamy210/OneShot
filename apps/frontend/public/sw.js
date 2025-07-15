// Service Worker for Push Notifications
self.addEventListener('push', function(event) {
    if (event.data) {
        const data = event.data.json();
        const options = {
            body: data.body,
            icon: data.icon || '/icon-192x192.png',
            badge: data.badge || '/badge-72x72.png',
            data: data.data,
            actions: data.actions || [],
            requireInteraction: true,
            tag: 'oneshot-notification'
        };

        event.waitUntil(
            self.registration.showNotification(data.title, options)
        );
    }
});

// 通知クリック時の処理
self.addEventListener('notificationclick', function(event) {
    event.notification.close();

    if (event.action === 'view') {
        // 通知の「表示」ボタンがクリックされた場合
        const urlToOpen = event.notification.data?.url || '/dashboard';
        event.waitUntil(
            clients.openWindow(urlToOpen)
        );
    } else if (event.action === 'dismiss') {
        // 通知の「閉じる」ボタンがクリックされた場合
        // 何もしない（通知は既に閉じられている）
    } else {
        // 通知自体がクリックされた場合
        const urlToOpen = event.notification.data?.url || '/dashboard';
        event.waitUntil(
            clients.openWindow(urlToOpen)
        );
    }
});

// プッシュ通知のサブスクリプション更新
self.addEventListener('pushsubscriptionchange', function(event) {
    event.waitUntil(
        self.registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY)
        }).then(function(subscription) {
            // 新しいサブスクリプションをサーバーに送信
            return fetch('/api/push/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(subscription)
            });
        })
    );
});

// VAPID公開鍵をUint8Arrayに変換
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
} 