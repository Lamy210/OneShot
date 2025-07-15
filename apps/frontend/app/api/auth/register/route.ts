import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, email, password } = body;

        // バリデーション
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

        // バックエンドtRPC API呼び出し
        const res = await fetch(`${process.env.BACKEND_URL || 'http://localhost:3001'}/api/trpc/auth.register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                input: { nickname: name, email, password }
            })
        });
        const data = await res.json();
        if (!res.ok || data.error) {
            return NextResponse.json(
                { success: false, error: data.error?.message || '登録に失敗しました。' },
                { status: res.status }
            );
        }
        // tRPCのレスポンス形式に合わせてdata.result.dataを返す
        return NextResponse.json({ success: true, ...data.result.data });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: '登録処理中にエラーが発生しました。' },
            { status: 500 }
        );
    }
}
