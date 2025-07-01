import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, email, password } = body;

        // Basic validation
        if (!name || !email || !password) {
            return NextResponse.json(
                { success: false, error: '必要な項目が入力されていません。' },
                { status: 400 }
            );
        }

        if (password.length < 8) {
            return NextResponse.json(
                { success: false, error: 'パスワードは8文字以上で入力してください。' },
                { status: 400 }
            );
        }

        // Mock user registration - in real app this would save to database
        const mockUser = {
            id: 'user-' + Date.now(),
            name,
            email,
            createdAt: new Date().toISOString(),
        };

        // Simulate duplicate email check
        if (email === 'existing@example.com') {
            return NextResponse.json(
                { success: false, error: 'このメールアドレスは既に登録されています。' },
                { status: 409 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'アカウントが正常に作成されました。ログインページに移動してください。',
            user: mockUser,
        });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: '登録処理中にエラーが発生しました。' },
            { status: 500 }
        );
    }
}
