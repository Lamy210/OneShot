'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';

export default function Login() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loginMutation = trpc.auth.login.useMutation({
        onSuccess: (data) => {
            // セキュアな認証成功処理
            // トークンはHttpOnly Cookieで管理されるため、localStorageには保存しない
            router.push('/dashboard');
        },
        onError: (error) => {
            setError(error.message || 'ログインに失敗しました。');
            setLoading(false);
        }
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await loginMutation.mutateAsync(formData);
        } catch (err) {
            // エラーはonErrorで処理される
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full space-y-8 p-8 bg-white rounded shadow">
                <h2 className="text-2xl font-bold text-center">ログイン</h2>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <label htmlFor="email" className="sr-only">メールアドレス</label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                placeholder="メールアドレス"
                                value={formData.email}
                                onChange={handleChange}
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="sr-only">パスワード</label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                placeholder="パスワード"
                                value={formData.password}
                                onChange={handleChange}
                            />
                        </div>
                    </div>
                    {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            {loading ? 'ログイン中...' : 'ログイン'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
