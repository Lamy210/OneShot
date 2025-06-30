import { inferAsyncReturnType } from '@trpc/server'
import { CreateExpressContextOptions } from '@trpc/server/adapters/express'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const createContext = ({ req, res }: CreateExpressContextOptions) => {
    // ここでKeycloakトークンの検証などを行う
    // 開発環境では仮のユーザーを設定
    const user = process.env.NODE_ENV === 'development'
        ? { id: 'dev-user-1', nickname: 'Development User' }
        : null // TODO: Keycloak integration

    return {
        req,
        res,
        prisma,
        user,
    }
}

export type Context = inferAsyncReturnType<typeof createContext>
