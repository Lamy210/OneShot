import React from 'react'
import './globals.css'
import { Inter } from 'next/font/google'
import { Providers, AuthProvider, useAuth } from './providers'
import { trpc } from '@/lib/trpc'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
    title: 'OneShot - 一発完結依頼プラットフォーム',
    description: '技術者とクリエイターのための一発完結依頼マッチングプラットフォーム',
}

function Header() {
    const { user, loading, login, logout } = useAuth();
    return (
        <header className="bg-white shadow-sm border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <h1 className="text-2xl font-bold text-primary-600">OneShot</h1>
                    <nav className="flex space-x-8 items-center">
                        <a href="/" className="text-gray-600 hover:text-primary-600">ホーム</a>
                        <a href="/post" className="text-gray-600 hover:text-primary-600">依頼一覧</a>
                        <a href="/user" className="text-gray-600 hover:text-primary-600">ユーザー管理</a>
                        <a href="/payment" className="text-gray-600 hover:text-primary-600">決済管理</a>
                        {loading ? (
                            <span className="text-gray-400 ml-4">認証確認中...</span>
                        ) : user ? (
                            <>
                                <span className="ml-4 text-gray-700">{user.nickname} ({user.role})</span>
                                <button onClick={logout} className="ml-2 px-3 py-1 bg-gray-200 rounded hover:bg-gray-300">ログアウト</button>
                            </>
                        ) : (
                            <button onClick={login} className="ml-4 px-3 py-1 bg-primary-600 text-white rounded hover:bg-primary-700">ログイン</button>
                        )}
                    </nav>
                </div>
            </div>
        </header>
    );
}

function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="ja" className={inter.className}>
            <body className="min-h-screen bg-gray-50">
                <AuthProvider>
                    <Header />
                    <Providers>
                        {children}
                    </Providers>
                </AuthProvider>
            </body>
        </html>
    )
}

export default trpc.withTRPC(RootLayout)
