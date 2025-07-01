'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Logout() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const handleLogout = async () => {
            try {
                // Mock logout - in real app this would call the logout API
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Clear any stored authentication data
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('token');
                    sessionStorage.clear();
                }

                setLoading(false);

                // Redirect to home page after 2 seconds
                setTimeout(() => {
                    router.push('/');
                }, 2000);
            } catch (error) {
                console.error('Logout error:', error);
                setLoading(false);
                router.push('/');
            }
        };

        handleLogout();
    }, [router]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
                <div className="sm:mx-auto sm:w-full sm:max-w-md">
                    <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">ログアウト中...</h2>
                            <p className="text-gray-600">
                                お疲れ様でした。ログアウト処理を実行しています。
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    <div className="text-center">
                        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                            <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">ログアウトしました</h2>
                        <p className="text-gray-600 mb-6">
                            お疲れ様でした。またのご利用をお待ちしております。
                        </p>
                        <p className="text-sm text-gray-500 mb-6">
                            まもなくホームページに移動します...
                        </p>
                        <div className="space-y-4">
                            <a
                                href="/"
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                ホームに戻る
                            </a>
                            <a
                                href="/login"
                                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                再度ログイン
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
