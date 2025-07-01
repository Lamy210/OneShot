import React from 'react'
import './globals.css'
import { Inter } from 'next/font/google'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
    title: 'OneShot - 一発完結依頼プラットフォーム',
    description: '技術者とクリエイターのための一発完結依頼マッチングプラットフォーム',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="ja" className={inter.className}>
            <body className="min-h-screen bg-gray-50">
                <Providers>
                    <nav className="bg-white shadow-sm border-b border-gray-200">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                            <div className="flex justify-between h-16">
                                <div className="flex items-center">
                                    <a href="/" className="text-2xl font-bold text-blue-600">
                                        OneShot
                                    </a>
                                </div>
                                <div className="hidden sm:flex sm:items-center sm:space-x-8">
                                    <a href="/" className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium">
                                        ホーム
                                    </a>
                                    <a href="/post/create" className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium">
                                        投稿作成
                                    </a>
                                    <a href="/dashboard" className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium">
                                        ダッシュボード
                                    </a>
                                    <a href="/login" className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-medium">
                                        ログイン
                                    </a>
                                </div>
                                {/* Mobile menu button */}
                                <div className="sm:hidden flex items-center">
                                    <button type="button" className="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500">
                                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </nav>
                    {children}
                    <footer className="bg-white border-t border-gray-200">
                        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                                <div className="col-span-1 md:col-span-2">
                                    <h3 className="text-2xl font-bold text-blue-600 mb-4">OneShot</h3>
                                    <p className="text-gray-600 text-sm">
                                        技術者とクリエイターのための一発完結依頼マッチングプラットフォーム
                                    </p>
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-900 mb-4">サービス</h4>
                                    <ul className="space-y-2">
                                        <li><a href="/post/create" className="text-sm text-gray-600 hover:text-blue-600">投稿作成</a></li>
                                        <li><a href="/dashboard" className="text-sm text-gray-600 hover:text-blue-600">ダッシュボード</a></li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-900 mb-4">サポート</h4>
                                    <ul className="space-y-2">
                                        <li><a href="/terms" className="text-sm text-gray-600 hover:text-blue-600">利用規約</a></li>
                                        <li><a href="/privacy" className="text-sm text-gray-600 hover:text-blue-600">プライバシーポリシー</a></li>
                                    </ul>
                                </div>
                            </div>
                            <div className="mt-8 pt-8 border-t border-gray-200">
                                <p className="text-center text-sm text-gray-500">
                                    © 2025 OneShot. All rights reserved.
                                </p>
                            </div>
                        </div>
                    </footer>
                </Providers>
            </body>
        </html>
    )
}
