'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';

interface Post {
    id: string;
    title: string;
    content: string;
    createdAt: string;
    updatedAt: string;
    authorId: string;
}

export default function Dashboard() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Mock user data - in real app this would come from authentication
    const user = {
        id: 'user-1',
        name: 'ユーザー',
        email: 'user@example.com'
    };

    useEffect(() => {
        // Mock posts data - in real app this would come from API
        const mockPosts: Post[] = [
            {
                id: '1',
                title: 'サンプル投稿1',
                content: 'これはサンプルの投稿内容です。',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                authorId: user.id
            },
            {
                id: '2',
                title: 'サンプル投稿2',
                content: 'もう一つのサンプル投稿です。',
                createdAt: new Date(Date.now() - 86400000).toISOString(),
                updatedAt: new Date(Date.now() - 86400000).toISOString(),
                authorId: user.id
            }
        ];

        setTimeout(() => {
            setPosts(mockPosts);
            setLoading(false);
        }, 1000);
    }, []);

    const handleDeletePost = (postId: string) => {
        if (confirm('投稿を削除しますか？')) {
            setPosts(posts.filter(post => post.id !== postId));
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">読み込み中...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center text-red-600">
                    <p>エラーが発生しました: {error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">ダッシュボード</h1>
                    <p className="mt-2 text-gray-600">あなたの投稿を管理しましょう</p>
                </div>

                {/* User Info */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">ユーザー情報</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">名前</label>
                            <p className="mt-1 text-gray-900">{user.name}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">メールアドレス</label>
                            <p className="mt-1 text-gray-900">{user.email}</p>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">総投稿数</p>
                                <p className="text-2xl font-semibold text-gray-900">{posts.length}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                </div>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">今月の閲覧数</p>
                                <p className="text-2xl font-semibold text-gray-900">1,234</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                    </svg>
                                </div>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">いいね数</p>
                                <p className="text-2xl font-semibold text-gray-900">89</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Posts */}
                <div className="bg-white rounded-lg shadow-sm">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-gray-900">最近の投稿</h2>
                            <a
                                href="/post/create"
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                新しい投稿を作成
                            </a>
                        </div>
                    </div>
                    <div className="divide-y divide-gray-200">
                        {posts.length === 0 ? (
                            <div className="px-6 py-12 text-center">
                                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <h3 className="mt-2 text-sm font-medium text-gray-900">投稿がありません</h3>
                                <p className="mt-1 text-sm text-gray-500">最初の投稿を作成してみましょう。</p>
                                <div className="mt-6">
                                    <a
                                        href="/post/create"
                                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    >
                                        投稿を作成
                                    </a>
                                </div>
                            </div>
                        ) : (
                            posts.map((post) => (
                                <div key={post.id} className="px-6 py-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-lg font-medium text-gray-900 truncate">
                                                {post.title}
                                            </h3>
                                            <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                                                {post.content}
                                            </p>
                                            <p className="mt-2 text-xs text-gray-400">
                                                作成日: {new Date(post.createdAt).toLocaleDateString('ja-JP')}
                                            </p>
                                        </div>
                                        <div className="ml-4 flex-shrink-0 flex items-center space-x-2">
                                            <button
                                                onClick={() => handleDeletePost(post.id)}
                                                className="text-red-600 hover:text-red-900 text-sm font-medium"
                                            >
                                                削除
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
