'use client';

import { useState } from 'react';
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import { trpc } from '@/lib/trpc';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';

interface NotificationListProps {
    onClose: () => void;
}

export default function NotificationList({ onClose }: NotificationListProps) {
    const [markingAsRead, setMarkingAsRead] = useState<string[]>([]);
    
    const utils = trpc.useUtils();
    
    // 通知一覧取得
    const { data: notificationData, isLoading } = trpc.notifications.list.useQuery({
        limit: 20,
    });
    
    // 既読化ミューテーション
    const markAsReadMutation = trpc.notifications.markAsRead.useMutation({
        onSuccess: () => {
            utils.notifications.list.invalidate();
        },
    });
    
    const notifications = notificationData?.notifications || [];
    const unreadCount = notificationData?.unreadCount || 0;

    const handleMarkAsRead = async (notificationId: string) => {
        setMarkingAsRead(prev => [...prev, notificationId]);
        await markAsReadMutation.mutateAsync({
            notificationIds: [notificationId],
        });
        setMarkingAsRead(prev => prev.filter(id => id !== notificationId));
    };

    const handleMarkAllAsRead = async () => {
        await markAsReadMutation.mutateAsync({
            markAllAsRead: true,
        });
    };

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'payment':
                return '💰';
            case 'message':
                return '💬';
            case 'post':
                return '📝';
            case 'payout':
                return '💳';
            case 'system':
                return '🔔';
            default:
                return '📢';
        }
    };

    const handleNotificationClick = (notification: any) => {
        // 未読の場合は既読化
        if (!notification.isRead) {
            handleMarkAsRead(notification.id);
        }
        
        // リンクがあれば遷移
        if (notification.link) {
            window.location.href = notification.link;
        }
        
        onClose();
    };

    return (
        <div className="p-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                    通知
                    {unreadCount > 0 && (
                        <span className="ml-2 text-sm text-gray-500">
                            ({unreadCount}件の未読)
                        </span>
                    )}
                </h3>
                <div className="flex items-center space-x-2">
                    {unreadCount > 0 && (
                        <button
                            onClick={handleMarkAllAsRead}
                            className="text-sm text-blue-600 hover:text-blue-800"
                        >
                            すべて既読
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                </div>
            </div>
            
            {isLoading ? (
                <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                </div>
            ) : notifications.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    通知はありません
                </div>
            ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                    {notifications.map((notification) => (
                        <div
                            key={notification.id}
                            onClick={() => handleNotificationClick(notification)}
                            className={`p-3 rounded-lg cursor-pointer transition-colors ${
                                notification.isRead
                                    ? 'bg-gray-50 hover:bg-gray-100'
                                    : 'bg-blue-50 hover:bg-blue-100'
                            }`}
                        >
                            <div className="flex items-start space-x-3">
                                <div className="text-lg">
                                    {getNotificationIcon(notification.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between">
                                        <h4 className="text-sm font-medium text-gray-900 truncate">
                                            {notification.title}
                                        </h4>
                                        {!notification.isRead && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleMarkAsRead(notification.id);
                                                }}
                                                disabled={markingAsRead.includes(notification.id)}
                                                className="ml-2 p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                                            >
                                                <CheckIcon className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                        {notification.body}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-2">
                                        {formatDistanceToNow(new Date(notification.createdAt), {
                                            addSuffix: true,
                                            locale: ja,
                                        })}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
} 