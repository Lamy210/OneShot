'use client';

import { useState } from 'react';
import { BellIcon } from '@heroicons/react/24/outline';
import { trpc } from '@/lib/trpc';
import NotificationList from './NotificationList';

export default function NotificationBell() {
    const [isOpen, setIsOpen] = useState(false);
    
    // 未読通知数取得
    const { data: notificationData } = trpc.notifications.list.useQuery({
        unreadOnly: true,
        limit: 1, // 未読数だけ取得
    });
    
    const unreadCount = notificationData?.unreadCount || 0;

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg"
            >
                <BellIcon className="h-6 w-6" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>
            
            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <NotificationList onClose={() => setIsOpen(false)} />
                </div>
            )}
        </div>
    );
} 