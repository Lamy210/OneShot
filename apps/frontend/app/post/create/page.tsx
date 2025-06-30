'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { containsNGWord, detectNGWords } from '@oneshot/utils'
import { trpc } from '@/lib/trpc'

export default function CreatePostPage() {
    const router = useRouter()
    const createPostMutation = trpc.posts.create.useMutation()

    const [formData, setFormData] = useState({
        title: '',
        category: '',
        content: '',
        budget: '',
        deadline: '',
    })
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [isSubmitting, setIsSubmitting] = useState(false)

    const categories = [
        'Web開発',
        'モバイルアプリ',
        'デザイン',
        'ライティング',
        'データ分析',
        'マーケティング',
        'その他',
    ]

    const validateForm = () => {
        const newErrors: Record<string, string> = {}

        // タイトル検証
        if (!formData.title.trim()) {
            newErrors.title = 'タイトルを入力してください'
        } else if (formData.title.length > 100) {
            newErrors.title = 'タイトルは100文字以内で入力してください'
        }

        // カテゴリ検証
        if (!formData.category) {
            newErrors.category = 'カテゴリを選択してください'
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
        e.preventDefault()

        if (!validateForm()) {
            return
        }

        setIsSubmitting(true)

        try {
            await createPostMutation.mutateAsync({
                title: formData.title,
                category: formData.category,
                content: formData.content,
                budget: parseInt(formData.budget),
                deadline: formData.deadline ? new Date(formData.deadline) : undefined,
            })

            router.push('/dashboard')
        } catch (error: any) {
            setErrors({
                general: error.message || '投稿の作成に失敗しました'
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormData((prev: typeof formData) => ({ ...prev, [name]: value }))

        // エラーをクリア
        if (errors[name]) {
            setErrors((prev: Record<string, string>) => ({ ...prev, [name]: '' }))
        }
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <h1 className="text-2xl font-bold text-primary-600">OneShot</h1>
                        <nav className="flex space-x-8">
                            <a href="/" className="text-gray-600 hover:text-primary-600">
                                ホーム
                            </a>
                            <a href="/dashboard" className="text-gray-600 hover:text-primary-600">
                                ダッシュボード
                            </a>
                        </nav>
                    </div>
                </div>
            </header>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">新しい依頼を投稿</h2>
                    <p className="text-gray-600">
                        明確な依頼内容を記載して、最適なパートナーを見つけましょう。
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="card max-w-2xl">
                    {errors.general && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-red-600">{errors.general}</p>
                        </div>
                    )}

                    {/* タイトル */}
                    <div className="mb-6">
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                            タイトル <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            id="title"
                            name="title"
                            value={formData.title}
                            onChange={handleInputChange}
                            className={`form-input ${errors.title ? 'border-red-500' : ''}`}
                            placeholder="例：ランディングページのデザインをお願いします"
                            maxLength={100}
                        />
                        {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
                        <p className="mt-1 text-sm text-gray-500">{formData.title.length}/100文字</p>
                    </div>

                    {/* カテゴリ */}
                    <div className="mb-6">
                        <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                            カテゴリ <span className="text-red-500">*</span>
                        </label>
                        <select
                            id="category"
                            name="category"
                            value={formData.category}
                            onChange={handleInputChange}
                            className={`form-input ${errors.category ? 'border-red-500' : ''}`}
                        >
                            <option value="">カテゴリを選択してください</option>
                            {categories.map(category => (
                                <option key={category} value={category}>
                                    {category}
                                </option>
                            ))}
                        </select>
                        {errors.category && <p className="mt-1 text-sm text-red-600">{errors.category}</p>}
                    </div>

                    {/* 内容 */}
                    <div className="mb-6">
                        <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                            依頼内容 <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            id="content"
                            name="content"
                            value={formData.content}
                            onChange={handleInputChange}
                            rows={6}
                            className={`form-input ${errors.content ? 'border-red-500' : ''}`}
                            placeholder="具体的な要件、納期、参考資料などを詳しく記載してください..."
                        />
                        {errors.content && <p className="mt-1 text-sm text-red-600">{errors.content}</p>}
                    </div>

                    {/* 予算 */}
                    <div className="mb-6">
                        <label htmlFor="budget" className="block text-sm font-medium text-gray-700 mb-2">
                            予算 <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                id="budget"
                                name="budget"
                                value={formData.budget}
                                onChange={handleInputChange}
                                className={`form-input pr-12 ${errors.budget ? 'border-red-500' : ''}`}
                                placeholder="10000"
                                min="100"
                            />
                            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                                円
                            </span>
                        </div>
                        {errors.budget && <p className="mt-1 text-sm text-red-600">{errors.budget}</p>}
                        <p className="mt-1 text-sm text-gray-500">
                            プラットフォーム手数料（15% + 50円）が別途かかります
                        </p>
                    </div>

                    {/* 希望納期 */}
                    <div className="mb-8">
                        <label htmlFor="deadline" className="block text-sm font-medium text-gray-700 mb-2">
                            希望納期（任意）
                        </label>
                        <input
                            type="date"
                            id="deadline"
                            name="deadline"
                            value={formData.deadline}
                            onChange={handleInputChange}
                            className="form-input"
                            min={new Date().toISOString().split('T')[0]}
                        />
                    </div>

                    {/* 送信ボタン */}
                    <div className="flex gap-4">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`btn-primary flex-1 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                        >
                            {isSubmitting ? '投稿中...' : '依頼を投稿する'}
                        </button>
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                        >
                            キャンセル
                        </button>
                    </div>
                </form>

                {/* 投稿のガイドライン */}
                <div className="mt-8 card bg-blue-50 border-blue-200">
                    <h3 className="text-lg font-semibold text-blue-900 mb-3">
                        良い依頼を作成するためのコツ
                    </h3>
                    <ul className="space-y-2 text-blue-800">
                        <li className="flex items-start">
                            <span className="text-blue-500 mr-2">•</span>
                            明確で具体的なタイトルを付ける
                        </li>
                        <li className="flex items-start">
                            <span className="text-blue-500 mr-2">•</span>
                            要件を詳細に記載する（デザインの場合：サイズ、カラー、参考イメージなど）
                        </li>
                        <li className="flex items-start">
                            <span className="text-blue-500 mr-2">•</span>
                            納期は余裕を持って設定する
                        </li>
                        <li className="flex items-start">
                            <span className="text-blue-500 mr-2">•</span>
                            適正な予算を設定する（市場価格を参考に）
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    )
}
