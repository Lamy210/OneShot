import React from 'react'
import Link from 'next/link'

export default function HomePage() {
    return (
        <div className="min-h-screen">
            {/* Header */}
            <header className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center">
                            <h1 className="text-2xl font-bold text-primary-600">OneShot</h1>
                        </div>
                        <nav className="flex space-x-8">
                            <Link href="/post/create" className="text-gray-600 hover:text-primary-600">
                                投稿作成
                            </Link>
                            <Link href="/dashboard" className="text-gray-600 hover:text-primary-600">
                                ダッシュボード
                            </Link>
                            <Link href="/api/auth/login" className="btn-primary">
                                ログイン
                            </Link>
                        </nav>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="bg-gradient-to-r from-primary-600 to-secondary-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
                    <div className="text-center">
                        <h2 className="text-4xl md:text-6xl font-bold mb-6">
                            一発完結の依頼で<br />
                            スキルを活かそう
                        </h2>
                        <p className="text-xl md:text-2xl mb-8 opacity-90">
                            技術者とクリエイターのための<br />
                            シンプルな依頼マッチングプラットフォーム
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link href="/post/create" className="bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition">
                                依頼を投稿する
                            </Link>
                            <Link href="/dashboard" className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-primary-600 transition">
                                案件を探す
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h3 className="text-3xl font-bold text-gray-900 mb-4">
                            OneShotの特徴
                        </h3>
                        <p className="text-lg text-gray-600">
                            シンプルで安全な依頼システム
                        </p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="card text-center">
                            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <h4 className="text-xl font-semibold mb-2">一発完結</h4>
                            <p className="text-gray-600">
                                複雑な交渉不要。明確な依頼内容で確実に成果を獲得。
                            </p>
                        </div>
                        <div className="card text-center">
                            <div className="w-16 h-16 bg-secondary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                            <h4 className="text-xl font-semibold mb-2">安全決済</h4>
                            <p className="text-gray-600">
                                Stripe Connect による安全なエスクロー決済システム。
                            </p>
                        </div>
                        <div className="card text-center">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h4 className="text-xl font-semibold mb-2">品質保証</h4>
                            <p className="text-gray-600">
                                AIモデレーション機能でNGワードをチェック。健全な環境を維持。
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-900 text-white py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid md:grid-cols-4 gap-8">
                        <div>
                            <h5 className="text-lg font-semibold mb-4">OneShot</h5>
                            <p className="text-gray-400">
                                技術者とクリエイターのための一発完結依頼プラットフォーム
                            </p>
                        </div>
                        <div>
                            <h6 className="font-semibold mb-4">サービス</h6>
                            <ul className="space-y-2 text-gray-400">
                                <li><Link href="/post/create" className="hover:text-white">依頼投稿</Link></li>
                                <li><Link href="/dashboard" className="hover:text-white">案件検索</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h6 className="font-semibold mb-4">サポート</h6>
                            <ul className="space-y-2 text-gray-400">
                                <li><Link href="/terms" className="hover:text-white">利用規約</Link></li>
                                <li><Link href="/privacy" className="hover:text-white">プライバシー</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h6 className="font-semibold mb-4">お問い合わせ</h6>
                            <p className="text-gray-400">
                                support@oneshot.example
                            </p>
                        </div>
                    </div>
                    <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
                        <p>&copy; 2025 OneShot Platform. All rights reserved.</p>
                    </div>
                </div>
            </footer>
        </div>
    )
}
