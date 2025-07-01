import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, password } = body;

        // Mock authentication - in real app this would validate against database
        if (email === 'test@example.com' && password === 'password') {
            // Return mock user data and token
            return NextResponse.json({
                success: true,
                user: {
                    id: 'user-1',
                    name: 'テストユーザー',
                    email: email,
                },
                token: 'mock-jwt-token-' + Date.now(),
            });
        } else {
            return NextResponse.json(
                { success: false, error: 'メールアドレスまたはパスワードが正しくありません。' },
                { status: 401 }
            );
        }
    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'ログイン処理中にエラーが発生しました。' },
            { status: 500 }
        );
    }
}
