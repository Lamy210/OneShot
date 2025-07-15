'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';

export default function Logout() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const logoutMutation = trpc.auth.logout.useMutation({
        onSuccess: () => {
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
        },
        onError: (error) => {
            console.error('Logout error:', error);
            setError(error.message);
            setLoading(false);
            // Even if logout fails, clear local data and redirect
            if (typeof window !== 'undefined') {
                localStorage.removeItem('token');
                sessionStorage.clear();
            }
            setTimeout(() => {
                router.push('/');
            }, 2000);
        }
    });

    useEffect(() => {
        const handleLogout = async () => {
            try {
                // Call actual logout API
                await logoutMutation.mutateAsync();
            } catch (error) {
                console.error('Logout error:', error);
                setError('ログアウト処理中にエラーが発生しました');
                setLoading(false);
                // Clear local data even if API fails
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('token');
                    sessionStorage.clear();
                }
                setTimeout(() => {
                    router.push('/');
                }, 2000);
            }
        };

        handleLogout();
    }, [router, logoutMutation]);

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
                        {error ? (
                            <>
                                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
                                    <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-4">ログアウト完了</h2>
                                <p className="text-gray-600 mb-6">
                                    {error} ただし、ローカルデータは正常にクリアされました。
                                </p>
                            </>
                        ) : (
                            <>
                                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                                    <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-4">ログアウトしました</h2>
                                <p className="text-gray-600 mb-6">
                                    お疲れ様でした。またのご利用をお待ちしております。
                                </p>
                            </>
                        )}
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
