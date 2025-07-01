export default function NotFound() {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="text-center">
                <div className="mx-auto max-w-md">
                    <div className="text-9xl font-bold text-blue-600 mb-4">404</div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-4">
                        ページが見つかりません
                    </h1>
                    <p className="text-gray-600 mb-8">
                        お探しのページは存在しないか、移動された可能性があります。
                    </p>
                    <div className="space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
                        <a
                            href="/"
                            className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            ホームに戻る
                        </a>
                        <a
                            href="/post/create"
                            className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            投稿を作成
                        </a>
                    </div>
                </div>

                <div className="mt-16">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                        よく使われるページ
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl mx-auto">
                        <a
                            href="/dashboard"
                            className="p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
                        >
                            <div className="text-blue-600 mb-2">
                                <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <h3 className="font-medium text-gray-900">ダッシュボード</h3>
                            <p className="text-sm text-gray-500 mt-1">
                                あなたの投稿を管理
                            </p>
                        </a>

                        <a
                            href="/login"
                            className="p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
                        >
                            <div className="text-blue-600 mb-2">
                                <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                </svg>
                            </div>
                            <h3 className="font-medium text-gray-900">ログイン</h3>
                            <p className="text-sm text-gray-500 mt-1">
                                アカウントにログイン
                            </p>
                        </a>

                        <a
                            href="/register"
                            className="p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
                        >
                            <div className="text-blue-600 mb-2">
                                <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                </svg>
                            </div>
                            <h3 className="font-medium text-gray-900">新規登録</h3>
                            <p className="text-sm text-gray-500 mt-1">
                                アカウントを作成
                            </p>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
