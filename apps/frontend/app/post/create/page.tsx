'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { containsNGWord, detectNGWords } from '@oneshot/utils'
import { trpc } from '@/lib/trpc'

export default function CreatePostPage() {
    const router = useRouter()
    const createPostMutation = trpc.posts.create.useMutation()
    
    // カテゴリ一覧を動的に取得
    const categoriesQuery = trpc.categories.list.useQuery()

    const [formData, setFormData] = useState({
        title: '',
        categoryId: '', // categoryIdに変更
        content: '',
        budget: '',
        deadline: '',
    })
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [isSubmitting, setIsSubmitting] = useState(false)

    // カテゴリデータ取得状態
    const { data, isLoading, isError, refetch } = categoriesQuery;
    const categories = data?.categories || [];

    const validateForm = () => {
        const newErrors: Record<string, string> = {}

        // タイトル検証
        if (!formData.title.trim()) {
            newErrors.title = 'タイトルを入力してください'
        } else if (formData.title.length > 100) {
            newErrors.title = 'タイトルは100文字以内で入力してください'
        }

        // カテゴリ検証
        if (!formData.categoryId) {
            newErrors.categoryId = 'カテゴリを選択してください'
        }

        // 内容検証
        if (!formData.content.trim()) {
            newErrors.content = '内容を入力してください'
        }

        // 予算検証
        if (!formData.budget) {
            newErrors.budget = '予算を入力してください'
        } else if (parseInt(formData.budget) < 100) {
            newErrors.budget = '予算は100円以上で入力してください'
        }

        // NGワードチェック
        const fullText = `${formData.title} ${formData.content}`
        if (containsNGWord(fullText)) {
            const detectedWords = detectNGWords(fullText)
            newErrors.content = `使用できない単語が含まれています: ${detectedWords.join(', ')}`
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrors({});

        // バリデーション
        const newErrors: Record<string, string> = {};
        if (!formData.title.trim()) newErrors.title = 'タイトルは必須です';
        if (!formData.categoryId) newErrors.categoryId = 'カテゴリは必須です';
        if (!formData.content.trim()) newErrors.content = '内容は必須です';
        if (!formData.budget || parseInt(formData.budget) < 100) newErrors.budget = '予算は100円以上で入力してください';

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            setIsSubmitting(false);
            return;
        }

        try {
            const result = await createPostMutation.mutateAsync({
                title: formData.title,
                categoryId: formData.categoryId, // categoryIdを使用
                content: formData.content,
                budget: parseInt(formData.budget),
                deadline: formData.deadline ? new Date(formData.deadline) : undefined,
            });

            router.push(`/posts/${result.id}`);
        } catch (error: any) {
            if (error.message) {
                setErrors({ general: error.message });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormData((prev: typeof formData) => ({ ...prev, [name]: value }))

        // エラーをクリア
        if (errors[name]) {
            setErrors((prev: Record<string, string>) => ({ ...prev, [name]: '' }))
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <h1 className="text-2xl font-bold text-gray-900 mb-6">新しい依頼を投稿</h1>

                    {/* カテゴリ取得エラー時の表示 */}
                    {isError && (
                        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                            <p className="text-red-600">カテゴリの取得に失敗しました。ネットワーク接続をご確認の上、再度お試しください。</p>
                            <button
                                type="button"
                                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                onClick={() => refetch()}
                            >
                                再取得
                            </button>
                        </div>
                    )}

                    {/* カテゴリが0件の場合の案内 */}
                    {!isLoading && !isError && categories.length === 0 && (
                        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                            <p className="text-yellow-700">利用可能なカテゴリがありません。管理者にお問い合わせください。</p>
                        </div>
                    )}

                    {errors.general && (
                        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                            <p className="text-red-600">{errors.general}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* タイトル */}
                        <div>
                            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                                タイトル *
                            </label>
                            <input
                                type="text"
                                id="title"
                                name="title"
                                value={formData.title}
                                onChange={handleInputChange}
                                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                    errors.title ? 'border-red-300' : 'border-gray-300'
                                }`}
                                placeholder="依頼のタイトルを入力してください"
                            />
                            {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
                        </div>

                        {/* カテゴリ */}
                        <div>
                            <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700 mb-2">
                                カテゴリ *
                            </label>
                            <select
                                id="categoryId"
                                name="categoryId"
                                value={formData.categoryId}
                                onChange={handleInputChange}
                                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                    errors.categoryId ? 'border-red-300' : 'border-gray-300'
                                }`}
                            >
                                <option value="">カテゴリを選択してください</option>
                                {categories.map((category) => (
                                    <option key={category.id} value={category.id}>
                                        {category.name}
                                    </option>
                                ))}
                            </select>
                            {errors.categoryId && <p className="mt-1 text-sm text-red-600">{errors.categoryId}</p>}
                        </div>

                        {/* 内容 */}
                        <div>
                            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                                依頼内容 *
                            </label>
                            <textarea
                                id="content"
                                name="content"
                                value={formData.content}
                                onChange={handleInputChange}
                                rows={6}
                                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                    errors.content ? 'border-red-300' : 'border-gray-300'
                                }`}
                                placeholder="依頼の詳細を入力してください"
                            />
                            {errors.content && <p className="mt-1 text-sm text-red-600">{errors.content}</p>}
                        </div>

                        {/* 予算 */}
                        <div>
                            <label htmlFor="budget" className="block text-sm font-medium text-gray-700 mb-2">
                                予算（円） *
                            </label>
                            <input
                                type="number"
                                id="budget"
                                name="budget"
                                value={formData.budget}
                                onChange={handleInputChange}
                                min="100"
                                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                    errors.budget ? 'border-red-300' : 'border-gray-300'
                                }`}
                                placeholder="1000"
                            />
                            {errors.budget && <p className="mt-1 text-sm text-red-600">{errors.budget}</p>}
                        </div>

                        {/* 期限 */}
                        <div>
                            <label htmlFor="deadline" className="block text-sm font-medium text-gray-700 mb-2">
                                期限（任意）
                            </label>
                            <input
                                type="datetime-local"
                                id="deadline"
                                name="deadline"
                                value={formData.deadline}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* 送信ボタン */}
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? '投稿中...' : '投稿する'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}
