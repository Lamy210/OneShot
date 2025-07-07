import { inferAsyncReturnType } from '@trpc/server'
import { CreateExpressContextOptions } from '@trpc/server/adapters/express'
import { PrismaClient } from '@prisma/client'
import Keycloak from 'keycloak-connect'
import { IncomingMessage } from 'http'

const prisma = new PrismaClient()

const keycloak = new Keycloak({
    store: undefined,
    // 本番用Keycloak設定
    // 必要に応じてkeycloak.jsonや環境変数から設定を取得
})

export const createContext = async ({ req, res }: CreateExpressContextOptions) => {
    let user = null
    if (process.env.NODE_ENV === 'development') {
        user = { id: 'dev-user-1', nickname: 'Development User', email: 'dev@example.com', role: 'ADMIN' }
    } else {
        // Keycloakトークン検証
        try {
            const grant = await new Promise((resolve, reject) => {
                keycloak.getGrant(req as IncomingMessage, res, (err, grant) => {
                    if (err) return reject(err)
                    resolve(grant)
                })
            })
            if (grant && grant.access_token && grant.access_token.content) {
                const token = grant.access_token.content
                user = {
                    id: token.sub,
                    nickname: token.preferred_username || token.name || '',
                    email: token.email,
                    role: (token.realm_access?.roles?.includes('ADMIN') ? 'ADMIN' : 'USER'),
                }
            }
        } catch (e) {
            user = null
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
