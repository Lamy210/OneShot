'use client'

import { useState, useEffect } from 'react'
import { trpc } from '@/lib/trpc'
import { useRouter, useSearchParams } from 'next/navigation'

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

interface BankAccountForm {
    bankName: string
    bankBranch: string
    accountType: 'savings' | 'checking'
    accountNumber: string
    accountHolder: string
}

interface PayoutSettings {
    payoutEnabled: boolean
    minPayoutAmount: number
}

export default function SettingsPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [activeTab, setActiveTab] = useState('bank')
    const [isSaving, setIsSaving] = useState(false)
    const [isCreatingStripeAccount, setIsCreatingStripeAccount] = useState(false)

    // 決済履歴フィルタ状態
    const [paymentFilters, setPaymentFilters] = useState({
        type: 'all' as 'all' | 'sent' | 'received',
        status: '' as 'COMPLETED' | 'PENDING' | 'FAILED' | 'REFUNDED' | '',
        dateFrom: '',
        dateTo: '',
        minAmount: '',
        maxAmount: '',
        search: '',
        sortBy: 'date' as 'date' | 'amount' | 'status',
        sortOrder: 'desc' as 'asc' | 'desc',
    })
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage] = useState(10)

    // 通知設定状態
    const [notificationSettings, setNotificationSettings] = useState({
        inAppEnabled: true,
        emailEnabled: true,
        pushEnabled: false,
        paymentNotifications: true,
        postNotifications: true,
        messageNotifications: true,
        systemNotifications: true,
        payoutNotifications: true,
        emailFrequency: 'immediate' as 'immediate' | 'daily' | 'weekly',
        quietHoursStart: '',
        quietHoursEnd: '',
    })

    // tRPCクエリ・ミューテーション
    const getBankAccountQuery = trpc.userSettings.getBankAccount.useQuery()
    const updateBankAccountMutation = trpc.userSettings.updateBankAccount.useMutation()
    const updatePayoutSettingsMutation = trpc.userSettings.updatePayoutSettings.useMutation()
    const createStripeAccountMutation = trpc.userSettings.createStripeAccount.useMutation()
    const getStripeAccountStatusQuery = trpc.userSettings.getStripeAccountStatus.useQuery()
    const getNotificationSettingsQuery = trpc.notificationSettings.get.useQuery()
    const updateNotificationSettingsMutation = trpc.notificationSettings.update.useMutation()
    const resetNotificationSettingsMutation = trpc.notificationSettings.reset.useMutation()

    // 決済履歴クエリ（動的化対応）
    const getUserPaymentsQuery = trpc.payment.getUserPayments.useQuery({
        type: paymentFilters.type,
        status: paymentFilters.status === '' ? undefined : paymentFilters.status,
        dateFrom: paymentFilters.dateFrom ? new Date(paymentFilters.dateFrom) : undefined,
        dateTo: paymentFilters.dateTo ? new Date(paymentFilters.dateTo) : undefined,
        minAmount: paymentFilters.minAmount ? parseInt(paymentFilters.minAmount) : undefined,
        maxAmount: paymentFilters.maxAmount ? parseInt(paymentFilters.maxAmount) : undefined,
        search: paymentFilters.search || undefined,
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage,
        sortBy: paymentFilters.sortBy,
        sortOrder: paymentFilters.sortOrder,
    })

    // 決済統計クエリ
    const getPaymentStatsQuery = trpc.payment.getPaymentStats.useQuery({
        period: 'month',
        type: 'all',
    })

    // URLパラメータからタブを設定
    useEffect(() => {
        const tab = searchParams.get('tab')
        if (tab && ['bank', 'payments', 'stripe', 'notifications'].includes(tab)) {
            setActiveTab(tab)
        }
    }, [searchParams])

    // Stripe Connect成功・リフレッシュ時の処理
    useEffect(() => {
        const success = searchParams.get('success')
        const refresh = searchParams.get('refresh')

        if (success === 'true') {
            alert('Stripe Connectアカウントの設定が完了しました！')
            // 成功パラメータをクリア
            router.replace('/settings?tab=stripe')
        }

        if (refresh === 'true') {
            // アカウント状態を再取得
            getStripeAccountStatusQuery.refetch()
        }
    }, [searchParams, router, getStripeAccountStatusQuery])

    // デバッグ用ログ
    useEffect(() => {
        console.log('tRPC Query States:', {
            getBankAccount: {
                isLoading: getBankAccountQuery.isLoading,
                error: getBankAccountQuery.error,
                data: getBankAccountQuery.data
            },
            getUserPayments: {
                isLoading: getUserPaymentsQuery.isLoading,
                error: getUserPaymentsQuery.error,
                data: getUserPaymentsQuery.data
            }
        })
    }, [getBankAccountQuery, getUserPaymentsQuery])

    const [bankAccount, setBankAccount] = useState<BankAccountInfo>({})
    const [formData, setFormData] = useState<BankAccountForm>({
        bankName: '',
        bankBranch: '',
        accountType: 'savings',
        accountNumber: '',
        accountHolder: '',
    })
    const [payoutSettings, setPayoutSettings] = useState<PayoutSettings>({
        payoutEnabled: false,
        minPayoutAmount: 1000,
    })

    // データ取得時の初期化
    useEffect(() => {
        if (getBankAccountQuery.data) {
            const data = getBankAccountQuery.data
            setBankAccount({
                ...data,
                accountType: data.accountType as 'savings' | 'checking' | undefined,
                stripeConnectAccountId: data.stripeConnectAccountId || undefined
            })
            setFormData({
                bankName: data.bankName || '',
                bankBranch: data.bankBranch || '',
                accountType: data.accountType as 'savings' | 'checking' || 'savings',
                accountNumber: data.accountNumber || '',
                accountHolder: data.accountHolder || '',
            })
            setPayoutSettings({
                payoutEnabled: data.payoutEnabled || false,
                minPayoutAmount: data.minPayoutAmount || 1000,
            })
        }
    }, [getBankAccountQuery.data])

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handlePayoutSettingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target
        setPayoutSettings(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : parseInt(value)
        }))
    }

    const handleSubmitBankAccount = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)

        try {
            const result = await updateBankAccountMutation.mutateAsync(formData)
            setBankAccount(prev => ({
                ...prev,
                ...result,
                accountType: result.accountType as 'savings' | 'checking' | undefined
            }))
            alert('振込先を更新しました')
        } catch (error) {
            console.error('Failed to update bank account:', error)
            alert('振込先の更新に失敗しました')
        } finally {
            setIsSaving(false)
        }
    }

    const handleSubmitPayoutSettings = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)

        try {
            const result = await updatePayoutSettingsMutation.mutateAsync(payoutSettings)
            setBankAccount(prev => ({
                ...prev,
                ...result,
                minPayoutAmount: result.minPayoutAmount || undefined
            }))
            alert('振込設定を更新しました')
        } catch (error) {
            console.error('Failed to update payout settings:', error)
            alert('振込設定の更新に失敗しました')
        } finally {
            setIsSaving(false)
        }
    }

    const handleStripeConnect = async () => {
        try {
            setIsCreatingStripeAccount(true)
            const result = await createStripeAccountMutation.mutateAsync()
            
            if (result.success && 'onboardingUrl' in result && result.onboardingUrl) {
                // オンボーディングURLにリダイレクト
                window.location.href = result.onboardingUrl
            } else {
                alert('Stripe Connectアカウントの作成に失敗しました')
            }
        } catch (error) {
            console.error('Failed to create Stripe account:', error)
            alert('Stripe Connectアカウントの作成に失敗しました')
        } finally {
            setIsCreatingStripeAccount(false)
        }
    }

    const handlePaymentFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setPaymentFilters(prev => ({ ...prev, [name]: value }))
        setCurrentPage(1) // フィルタ変更時は1ページ目に戻す
    }

    const handlePaymentSearch = (e: React.FormEvent) => {
        e.preventDefault()
        // 検索は自動的に実行される（useQueryの依存関係）
    }

    const clearPaymentFilters = () => {
        setPaymentFilters({
            type: 'all',
            status: '',
            dateFrom: '',
            dateTo: '',
            minAmount: '',
            maxAmount: '',
            search: '',
            sortBy: 'date',
            sortOrder: 'desc',
        })
        setCurrentPage(1)
    }

    // 通知設定関連のハンドラー
    const handleNotificationSettingsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target
        const checked = 'checked' in e.target ? e.target.checked : undefined
        setNotificationSettings(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }))
    }

    const handleSubmitNotificationSettings = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            await updateNotificationSettingsMutation.mutateAsync(notificationSettings)
            alert('通知設定を更新しました')
        } catch (error) {
            console.error('Failed to update notification settings:', error)
            alert('通知設定の更新に失敗しました')
        }
    }

    const handleResetNotificationSettings = async () => {
        try {
            await resetNotificationSettingsMutation.mutateAsync()
            const defaultSettings = await getNotificationSettingsQuery.refetch()
            if (defaultSettings.data) {
                setNotificationSettings({
                    ...defaultSettings.data,
                    emailFrequency: defaultSettings.data.emailFrequency as 'immediate' | 'daily' | 'weekly',
                    quietHoursStart: defaultSettings.data.quietHoursStart || '',
                    quietHoursEnd: defaultSettings.data.quietHoursEnd || ''
                })
            }
            alert('通知設定をデフォルトに戻しました')
        } catch (error) {
            console.error('Failed to reset notification settings:', error)
            alert('通知設定のリセットに失敗しました')
        }
    }

    const isLoading = getBankAccountQuery.isLoading

    if (isLoading) {
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

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">設定</h1>

            {/* タブナビゲーション */}
            <div className="mb-8">
                <nav className="flex space-x-8">
                    <button
                        onClick={() => setActiveTab('bank')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'bank'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        銀行口座設定
                    </button>
                    <button
                        onClick={() => setActiveTab('payments')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'payments'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        決済履歴・残高
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
                    <button
                        onClick={() => setActiveTab('notifications')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'notifications'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        通知設定
                    </button>
                </nav>
            </div>

            <div className="space-y-8">
                {/* 銀行口座設定タブ */}
                {activeTab === 'bank' && (
                    <>
                        <div className="card">
                            <h2 className="text-xl font-semibold mb-6">振込先設定</h2>
                            <form onSubmit={handleSubmitBankAccount} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label htmlFor="bankName" className="block text-sm font-medium text-gray-700 mb-2">
                                            銀行名 *
                                        </label>
                                        <input
                                            type="text"
                                            id="bankName"
                                            name="bankName"
                                            value={formData.bankName}
                                            onChange={handleFormChange}
                                            required
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="例: みずほ銀行"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="bankBranch" className="block text-sm font-medium text-gray-700 mb-2">
                                            支店名 *
                                        </label>
                                        <input
                                            type="text"
                                            id="bankBranch"
                                            name="bankBranch"
                                            value={formData.bankBranch}
                                            onChange={handleFormChange}
                                            required
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="例: 新宿支店"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="accountType" className="block text-sm font-medium text-gray-700 mb-2">
                                            口座種別 *
                                        </label>
                                        <select
                                            id="accountType"
                                            name="accountType"
                                            value={formData.accountType}
                                            onChange={handleFormChange}
                                            required
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="savings">普通</option>
                                            <option value="checking">当座</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-700 mb-2">
                                            口座番号 *
                                        </label>
                                        <input
                                            type="text"
                                            id="accountNumber"
                                            name="accountNumber"
                                            value={formData.accountNumber}
                                            onChange={handleFormChange}
                                            required
                                            pattern="[0-9]{7,8}"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="例: 1234567"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label htmlFor="accountHolder" className="block text-sm font-medium text-gray-700 mb-2">
                                            口座名義（カナ） *
                                        </label>
                                        <input
                                            type="text"
                                            id="accountHolder"
                                            name="accountHolder"
                                            value={formData.accountHolder}
                                            onChange={handleFormChange}
                                            required
                                            pattern="[ァ-ヶー　\\s]+"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="例: ヤマダ タロウ"
                                        />
                                        <p className="mt-1 text-sm text-gray-500">
                                            全角カタカナで入力してください
                                        </p>
                                    </div>
                                </div>

                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        {isSaving ? '保存中...' : '振込先を保存'}
                                    </button>
                                </div>
                            </form>
                        </div>

                        <div className="card">
                            <h2 className="text-xl font-semibold mb-6">振込設定</h2>
                            <form onSubmit={handleSubmitPayoutSettings} className="space-y-6">
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="payoutEnabled"
                                        name="payoutEnabled"
                                        checked={payoutSettings.payoutEnabled}
                                        onChange={handlePayoutSettingsChange}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <label htmlFor="payoutEnabled" className="ml-2 block text-sm text-gray-900">
                                        自動振込を有効にする
                                    </label>
                                </div>

                                <div>
                                    <label htmlFor="minPayoutAmount" className="block text-sm font-medium text-gray-700 mb-2">
                                        最小振込金額 (円)
                                    </label>
                                    <input
                                        type="number"
                                        id="minPayoutAmount"
                                        name="minPayoutAmount"
                                        value={payoutSettings.minPayoutAmount}
                                        onChange={handlePayoutSettingsChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        min="100"
                                        max="100000"
                                        step="100"
                                    />
                                    <p className="mt-1 text-sm text-gray-500">
                                        この金額以上になった場合に自動で振込処理を行います
                                    </p>
                                </div>

                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        {isSaving ? '保存中...' : '振込設定を保存'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </>
                )}

                {/* 決済履歴・残高タブ */}
                {activeTab === 'payments' && (
                    <>
                        <div className="card">
                            <h2 className="text-xl font-semibold mb-6">残高情報</h2>
                            <div className="space-y-4">
                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm text-gray-500">現在の残高</span>
                                        <span className="text-2xl font-bold text-gray-900">
                                            ¥{(bankAccount.balance || 0).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        最後の振込日: {bankAccount.lastPayoutDate
                                            ? new Date(bankAccount.lastPayoutDate).toLocaleDateString('ja-JP')
                                            : '未設定'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 決済統計 */}
                        {getPaymentStatsQuery.data && (
                            <div className="card">
                                <h2 className="text-xl font-semibold mb-6">決済統計（今月）</h2>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="p-4 bg-blue-50 rounded-lg">
                                        <div className="text-sm text-blue-600">総決済額</div>
                                        <div className="text-2xl font-bold text-blue-900">
                                            ¥{getPaymentStatsQuery.data.totalAmount.toLocaleString()}
                                        </div>
                                    </div>
                                    <div className="p-4 bg-green-50 rounded-lg">
                                        <div className="text-sm text-green-600">受取額</div>
                                        <div className="text-2xl font-bold text-green-900">
                                            ¥{getPaymentStatsQuery.data.totalRecipientAmount.toLocaleString()}
                                        </div>
                                    </div>
                                    <div className="p-4 bg-yellow-50 rounded-lg">
                                        <div className="text-sm text-yellow-600">手数料</div>
                                        <div className="text-2xl font-bold text-yellow-900">
                                            ¥{getPaymentStatsQuery.data.totalPlatformFee.toLocaleString()}
                                        </div>
                                    </div>
                                    <div className="p-4 bg-purple-50 rounded-lg">
                                        <div className="text-sm text-purple-600">完了件数</div>
                                        <div className="text-2xl font-bold text-purple-900">
                                            {getPaymentStatsQuery.data.totalCompletedPayments}件
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="card">
                            <h2 className="text-xl font-semibold mb-6">決済履歴</h2>

                            {/* フィルタ・検索 */}
                            <div className="mb-6">
                                <form onSubmit={handlePaymentSearch} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">タイプ</label>
                                            <select
                                                name="type"
                                                value={paymentFilters.type}
                                                onChange={handlePaymentFilterChange}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value="all">すべて</option>
                                                <option value="sent">支払い</option>
                                                <option value="received">受取</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">ステータス</label>
                                            <select
                                                name="status"
                                                value={paymentFilters.status}
                                                onChange={handlePaymentFilterChange}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value="">すべて</option>
                                                <option value="PENDING">保留中</option>
                                                <option value="COMPLETED">完了</option>
                                                <option value="FAILED">失敗</option>
                                                <option value="REFUNDED">返金済み</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">並び順</label>
                                            <select
                                                name="sortBy"
                                                value={paymentFilters.sortBy}
                                                onChange={handlePaymentFilterChange}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value="date">日付</option>
                                                <option value="amount">金額</option>
                                                <option value="status">ステータス</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">順序</label>
                                            <select
                                                name="sortOrder"
                                                value={paymentFilters.sortOrder}
                                                onChange={handlePaymentFilterChange}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value="desc">降順</option>
                                                <option value="asc">昇順</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">開始日</label>
                                            <input
                                                type="date"
                                                name="dateFrom"
                                                value={paymentFilters.dateFrom}
                                                onChange={handlePaymentFilterChange}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">終了日</label>
                                            <input
                                                type="date"
                                                name="dateTo"
                                                value={paymentFilters.dateTo}
                                                onChange={handlePaymentFilterChange}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">最小金額</label>
                                            <input
                                                type="number"
                                                name="minAmount"
                                                value={paymentFilters.minAmount}
                                                onChange={handlePaymentFilterChange}
                                                placeholder="100"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">最大金額</label>
                                            <input
                                                type="number"
                                                name="maxAmount"
                                                value={paymentFilters.maxAmount}
                                                onChange={handlePaymentFilterChange}
                                                placeholder="10000"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            <input
                                                type="text"
                                                name="search"
                                                value={paymentFilters.search}
                                                onChange={handlePaymentFilterChange}
                                                placeholder="投稿タイトルで検索..."
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                        >
                                            検索
                                        </button>
                                        <button
                                            type="button"
                                            onClick={clearPaymentFilters}
                                            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                                        >
                                            クリア
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* 決済履歴一覧 */}
                            {getUserPaymentsQuery.isLoading ? (
                                <div className="text-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                    <p className="mt-2 text-gray-500">決済履歴を読み込み中...</p>
                                </div>
                            ) : getUserPaymentsQuery.data && getUserPaymentsQuery.data.payments.length > 0 ? (
                                <div className="space-y-4">
                                    {/* 統計サマリー */}
                                    <div className="p-4 bg-gray-50 rounded-lg">
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                            <div>
                                                <span className="text-gray-500">総件数:</span>
                                                <span className="ml-2 font-medium">{getUserPaymentsQuery.data.stats.totalPayments}件</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500">完了件数:</span>
                                                <span className="ml-2 font-medium">{getUserPaymentsQuery.data.stats.completedPayments}件</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500">総金額:</span>
                                                <span className="ml-2 font-medium">¥{getUserPaymentsQuery.data.stats.totalAmount.toLocaleString()}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500">受取額:</span>
                                                <span className="ml-2 font-medium">¥{getUserPaymentsQuery.data.stats.totalRecipientAmount.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 決済履歴テーブル */}
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">投稿</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">タイプ</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">金額</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ステータス</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">日時</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {getUserPaymentsQuery.data.payments.map((payment) => (
                                                    <tr key={payment.id} className="hover:bg-gray-50">
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div>
                                                                <div className="text-sm font-medium text-gray-900">{payment.title}</div>
                                                                <div className="text-sm text-gray-500">{payment.category}</div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${payment.type === 'sent'
                                                                ? 'bg-red-100 text-red-800'
                                                                : 'bg-green-100 text-green-800'
                                                                }`}>
                                                                {payment.type === 'sent' ? '支払い' : '受取'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="text-sm font-medium text-gray-900">
                                                                ¥{payment.amount.toLocaleString()}
                                                            </div>
                                                            {payment.platformFee > 0 && (
                                                                <div className="text-xs text-gray-500">
                                                                    手数料: ¥{payment.platformFee.toLocaleString()}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${payment.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                                                payment.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                                                    payment.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                                                                        'bg-gray-100 text-gray-800'
                                                                }`}>
                                                                {payment.status === 'COMPLETED' ? '完了' :
                                                                    payment.status === 'PENDING' ? '保留中' :
                                                                        payment.status === 'FAILED' ? '失敗' :
                                                                            payment.status === 'REFUNDED' ? '返金済み' : payment.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {new Date(payment.createdAt).toLocaleDateString('ja-JP')}
                                                            <br />
                                                            {new Date(payment.createdAt).toLocaleTimeString('ja-JP')}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* ページネーション */}
                                    {getUserPaymentsQuery.data.pagination.totalPages > 1 && (
                                        <div className="flex justify-center mt-6">
                                            <nav className="flex space-x-2">
                                                <button
                                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                                    disabled={currentPage === 1}
                                                    className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                                                >
                                                    前へ
                                                </button>

                                                {Array.from({ length: getUserPaymentsQuery.data.pagination.totalPages }, (_, i) => i + 1).map(page => (
                                                    <button
                                                        key={page}
                                                        onClick={() => setCurrentPage(page)}
                                                        className={`px-3 py-2 text-sm font-medium rounded-md ${page === currentPage
                                                            ? 'bg-blue-600 text-white'
                                                            : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                                                            }`}
                                                    >
                                                        {page}
                                                    </button>
                                                ))}

                                                <button
                                                    onClick={() => setCurrentPage(prev => Math.min(getUserPaymentsQuery.data.pagination.totalPages, prev + 1))}
                                                    disabled={currentPage === getUserPaymentsQuery.data.pagination.totalPages}
                                                    className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                                                >
                                                    次へ
                                                </button>
                                            </nav>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                    <p className="text-gray-500">決済履歴がありません</p>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* Stripe Connectタブ */}
                {activeTab === 'stripe' && (
                    <div className="card">
                        <h2 className="text-xl font-semibold mb-6">Stripe Connect</h2>

                        {getStripeAccountStatusQuery.isLoading ? (
                            <div className="animate-pulse">
                                <div className="h-20 bg-gray-200 rounded"></div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {getStripeAccountStatusQuery.data?.hasAccount ? (
                                    <div className="space-y-4">
                                        <div className="p-4 bg-gray-50 rounded-lg">
                                            <h3 className="font-medium text-gray-900 mb-2">アカウント状態</h3>
                                            <div className="space-y-2">
                                                <div className="flex items-center">
                                                    <span className="text-sm text-gray-600">ステータス:</span>
                                                    <span className={`ml-2 px-2 py-1 text-xs rounded-full ${getStripeAccountStatusQuery.data.accountStatus === 'active'
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-yellow-100 text-yellow-800'
                                                        }`}>
                                                        {getStripeAccountStatusQuery.data.accountStatus === 'active' ? '有効' : '設定中'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center">
                                                    <span className="text-sm text-gray-600">オンボーディング:</span>
                                                    <span className={`ml-2 px-2 py-1 text-xs rounded-full ${'onboardingCompleted' in getStripeAccountStatusQuery.data && getStripeAccountStatusQuery.data.onboardingCompleted
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-red-100 text-red-800'
                                                        }`}>
                                                        {'onboardingCompleted' in getStripeAccountStatusQuery.data && getStripeAccountStatusQuery.data.onboardingCompleted ? '完了' : '未完了'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {!('onboardingCompleted' in getStripeAccountStatusQuery.data) || !getStripeAccountStatusQuery.data.onboardingCompleted ? (
                                            <div className="p-4 bg-blue-50 rounded-lg">
                                                <p className="text-sm text-blue-800 mb-3">
                                                    Stripe Connectアカウントの設定を完了するには、オンボーディングを完了してください。
                                                </p>
                                                <button
                                                    onClick={handleStripeConnect}
                                                    disabled={isCreatingStripeAccount}
                                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                                                >
                                                    {isCreatingStripeAccount ? '処理中...' : 'オンボーディングを続行'}
                                                </button>
                                            </div>
                                        ) : null}

                                        {'onboardingCompleted' in getStripeAccountStatusQuery.data && getStripeAccountStatusQuery.data.onboardingCompleted && getStripeAccountStatusQuery.data.accountStatus !== 'active' && (
                                            <div className="p-4 bg-yellow-50 rounded-lg">
                                                <p className="text-sm text-yellow-800">
                                                    アカウントの審査が完了するまでお待ちください。通常1-2営業日で完了します。
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="p-4 bg-blue-50 rounded-lg">
                                            <h3 className="font-medium text-blue-900 mb-2">Stripe Connectアカウントを作成</h3>
                                            <p className="text-sm text-blue-800 mb-4">
                                                Stripe Connectアカウントを作成することで、決済を受け取ることができるようになります。
                                                アカウント作成後、本人確認や銀行口座情報の設定が必要です。
                                            </p>
                                            <button
                                                onClick={handleStripeConnect}
                                                disabled={isCreatingStripeAccount}
                                                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                                            >
                                                {isCreatingStripeAccount ? 'アカウント作成中...' : 'Stripe Connectアカウントを作成'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* 通知設定タブ */}
                {activeTab === 'notifications' && (
                    <div className="card">
                        <h2 className="text-xl font-semibold mb-6">通知設定</h2>

                        {getNotificationSettingsQuery.isLoading ? (
                            <div className="animate-pulse">
                                <div className="h-20 bg-gray-200 rounded"></div>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmitNotificationSettings} className="space-y-6">
                                {/* 通知方法設定 */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-medium text-gray-900">通知方法</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                id="inAppEnabled"
                                                name="inAppEnabled"
                                                checked={notificationSettings.inAppEnabled}
                                                onChange={handleNotificationSettingsChange}
                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                            />
                                            <label htmlFor="inAppEnabled" className="ml-2 block text-sm text-gray-900">
                                                アプリ内通知
                                            </label>
                                        </div>
                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                id="emailEnabled"
                                                name="emailEnabled"
                                                checked={notificationSettings.emailEnabled}
                                                onChange={handleNotificationSettingsChange}
                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                            />
                                            <label htmlFor="emailEnabled" className="ml-2 block text-sm text-gray-900">
                                                メール通知
                                            </label>
                                        </div>
                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                id="pushEnabled"
                                                name="pushEnabled"
                                                checked={notificationSettings.pushEnabled}
                                                onChange={handleNotificationSettingsChange}
                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                            />
                                            <label htmlFor="pushEnabled" className="ml-2 block text-sm text-gray-900">
                                                プッシュ通知（実装予定）
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* 通知タイプ設定 */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-medium text-gray-900">通知タイプ</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                id="paymentNotifications"
                                                name="paymentNotifications"
                                                checked={notificationSettings.paymentNotifications}
                                                onChange={handleNotificationSettingsChange}
                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                            />
                                            <label htmlFor="paymentNotifications" className="ml-2 block text-sm text-gray-900">
                                                決済関連の通知
                                            </label>
                                        </div>
                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                id="postNotifications"
                                                name="postNotifications"
                                                checked={notificationSettings.postNotifications}
                                                onChange={handleNotificationSettingsChange}
                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                            />
                                            <label htmlFor="postNotifications" className="ml-2 block text-sm text-gray-900">
                                                投稿関連の通知
                                            </label>
                                        </div>
                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                id="messageNotifications"
                                                name="messageNotifications"
                                                checked={notificationSettings.messageNotifications}
                                                onChange={handleNotificationSettingsChange}
                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                            />
                                            <label htmlFor="messageNotifications" className="ml-2 block text-sm text-gray-900">
                                                メッセージの通知
                                            </label>
                                        </div>
                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                id="systemNotifications"
                                                name="systemNotifications"
                                                checked={notificationSettings.systemNotifications}
                                                onChange={handleNotificationSettingsChange}
                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                            />
                                            <label htmlFor="systemNotifications" className="ml-2 block text-sm text-gray-900">
                                                システム通知
                                            </label>
                                        </div>
                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                id="payoutNotifications"
                                                name="payoutNotifications"
                                                checked={notificationSettings.payoutNotifications}
                                                onChange={handleNotificationSettingsChange}
                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                            />
                                            <label htmlFor="payoutNotifications" className="ml-2 block text-sm text-gray-900">
                                                振込関連の通知
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* メール通知設定 */}
                                {notificationSettings.emailEnabled && (
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-medium text-gray-900">メール通知設定</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label htmlFor="emailFrequency" className="block text-sm font-medium text-gray-700 mb-2">
                                                    メール頻度
                                                </label>
                                                <select
                                                    id="emailFrequency"
                                                    name="emailFrequency"
                                                    value={notificationSettings.emailFrequency}
                                                    onChange={handleNotificationSettingsChange}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                >
                                                    <option value="immediate">即座に送信</option>
                                                    <option value="daily">日次まとめ</option>
                                                    <option value="weekly">週次まとめ</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* 静寂時間設定 */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-medium text-gray-900">静寂時間設定</h3>
                                    <p className="text-sm text-gray-600">指定した時間帯は通知を送信しません（システム通知は除く）</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="quietHoursStart" className="block text-sm font-medium text-gray-700 mb-2">
                                                開始時間
                                            </label>
                                            <input
                                                type="time"
                                                id="quietHoursStart"
                                                name="quietHoursStart"
                                                value={notificationSettings.quietHoursStart}
                                                onChange={handleNotificationSettingsChange}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="quietHoursEnd" className="block text-sm font-medium text-gray-700 mb-2">
                                                終了時間
                                            </label>
                                            <input
                                                type="time"
                                                id="quietHoursEnd"
                                                name="quietHoursEnd"
                                                value={notificationSettings.quietHoursEnd}
                                                onChange={handleNotificationSettingsChange}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-between">
                                    <button
                                        type="button"
                                        onClick={handleResetNotificationSettings}
                                        className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                                    >
                                        デフォルトに戻す
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        {isSaving ? '保存中...' : '通知設定を保存'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
