'use client'

import { useEffect, useState } from 'react'
import { trpc } from '@/lib/trpc'

interface BankAccountInfo {
    bankName?: string
    bankBranch?: string
    accountType?: 'savings' | 'checking'
    accountNumber?: string
    accountHolder?: string
    stripeConnectAccountId?: string
    stripeOnboardingCompleted?: boolean
    stripeAccountEnabled?: boolean
    payoutEnabled?: boolean
    minPayoutAmount?: number
    balance?: number
    lastPayoutDate?: string
}

export default function DirectSettingsPage() {
    const [activeTab, setActiveTab] = useState<'bank' | 'payments' | 'stripe'>('bank')

    // tRPC経由で取得（useQueryフックを使用）
    const { data: bankAccount, isLoading: loading, error } = trpc.userSettings.getBankAccount.useQuery()

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded mb-6"></div>
                    <div className="space-y-4">
                        <div className="h-20 bg-gray-200 rounded"></div>
                        <div className="h-20 bg-gray-200 rounded"></div>
                        <div className="h-20 bg-gray-200 rounded"></div>
                    </div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    <strong className="font-bold">エラー:</strong> {error.message}
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">振込先設定</h1>

            {/* Tab Navigation */}
            <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('bank')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'bank'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        振込先口座
                    </button>
                    <button
                        onClick={() => setActiveTab('payments')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'payments'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        支払履歴
                    </button>
                    <button
                        onClick={() => setActiveTab('stripe')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'stripe'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        Stripe Connect
                    </button>
                </nav>
            </div>

            {/* Bank Account Tab */}
            {activeTab === 'bank' && (
                <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">振込先口座情報</h2>

                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">銀行名</label>
                                <div className="mt-1 p-3 bg-gray-50 rounded border">
                                    {bankAccount?.bankName || '未設定'}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">支店名</label>
                                <div className="mt-1 p-3 bg-gray-50 rounded border">
                                    {bankAccount?.bankBranch || '未設定'}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">口座種別</label>
                                <div className="mt-1 p-3 bg-gray-50 rounded border">
                                    {bankAccount?.accountType === 'savings' ? '普通預金' :
                                        bankAccount?.accountType === 'checking' ? '当座預金' : '未設定'}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">口座番号</label>
                                <div className="mt-1 p-3 bg-gray-50 rounded border">
                                    {bankAccount?.accountNumber || '未設定'}
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">口座名義</label>
                            <div className="mt-1 p-3 bg-gray-50 rounded border">
                                {bankAccount?.accountHolder || '未設定'}
                            </div>
                        </div>

                        <div className="bg-blue-50 p-4 rounded-lg">
                            <h3 className="text-sm font-medium text-blue-800 mb-2">振込設定</h3>
                            <p className="text-sm text-blue-600">
                                振込有効: {bankAccount?.payoutEnabled ? '有効' : '無効'}<br />
                                最小振込金額: ¥{bankAccount?.minPayoutAmount?.toLocaleString() || '1,000'}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Payments Tab */}
            {activeTab === 'payments' && (
                <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">支払履歴</h2>
                    <p className="text-gray-500">支払履歴の実装中...</p>
                </div>
            )}

            {/* Stripe Connect Tab */}
            {activeTab === 'stripe' && (
                <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Stripe Connect設定</h2>

                    <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                            <div className={`w-3 h-3 rounded-full ${bankAccount?.stripeAccountEnabled ? 'bg-green-500' : 'bg-red-500'}`}></div>
                            <span className="text-sm font-medium">
                                Stripeアカウント: {bankAccount?.stripeAccountEnabled ? '有効' : '無効'}
                            </span>
                        </div>

                        <div className="flex items-center space-x-2">
                            <div className={`w-3 h-3 rounded-full ${bankAccount?.stripeOnboardingCompleted ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                            <span className="text-sm font-medium">
                                オンボーディング: {bankAccount?.stripeOnboardingCompleted ? '完了' : '未完了'}
                            </span>
                        </div>

                        {bankAccount?.stripeConnectAccountId && (
                            <div className="bg-gray-50 p-3 rounded">
                                <span className="text-sm text-gray-600">
                                    Account ID: {bankAccount.stripeConnectAccountId}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
