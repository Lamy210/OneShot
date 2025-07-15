import { inferAsyncReturnType } from '@trpc/server'
import { CreateExpressContextOptions } from '@trpc/server/adapters/express'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient()

// Keycloak公開鍵必須チェック（開発時は一時的に無効化）
if (!process.env.KEYCLOAK_PUBLIC_KEY) {
    console.warn('KEYCLOAK_PUBLIC_KEY環境変数が未設定です。認証機能は無効になります。');
    // 開発環境ではエラーを投げない
    if (process.env.NODE_ENV === 'production') {
        throw new Error('KEYCLOAK_PUBLIC_KEY環境変数が未設定です。必ず設定してください。');
    }
}

// 環境変数の型安全な取得
const KEYCLOAK_PUBLIC_KEY = process.env.KEYCLOAK_PUBLIC_KEY || 'dev-key';

export const createContext = ({ req, res }: CreateExpressContextOptions) => {
    // Keycloakトークンの検証
    let user = null;
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        try {
            // Keycloakの公開鍵で検証
            const decoded = jwt.verify(token, KEYCLOAK_PUBLIC_KEY, { algorithms: ['RS256'] }) as any;
            user = {
                id: decoded.sub,
                nickname: decoded.preferred_username || decoded.name || '',
                email: decoded.email || '',
                role: decoded.realm_access?.roles?.includes('admin') ? 'ADMIN' : 'USER',
            };
        } catch (err) {
            // トークン不正時はuser=nullのまま
        }
    }
    return {
        req,
        res,
        prisma,
        user,
    }
}

export type Context = inferAsyncReturnType<typeof createContext>
