import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { createExpressMiddleware } from '@trpc/server/adapters/express'
import { appRouter } from './routes'
import { createContext } from './context'
import { logger } from './utils/logger'

const app = express()
const PORT = process.env.PORT || 3001

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
    },
}))

app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3003', 'http://localhost:3004'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}))

// Cookie設定ミドルウェア
app.use((req, res, next) => {
    // セキュアなCookie設定
    res.cookie = (name: string, value: string, options: any = {}) => {
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict' as const,
            maxAge: 24 * 60 * 60 * 1000, // 24時間
            ...options
        };
        res.setHeader('Set-Cookie', `${name}=${value}; ${Object.entries(cookieOptions).map(([key, val]) => `${key}=${val}`).join('; ')}`);
        return res;
    };
    next();
});

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// tRPC router
app.use('/api/trpc', createExpressMiddleware({
    router: appRouter,
    createContext,
}))

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error('Unhandled error:', err)
    res.status(500).json({ error: 'Internal server error' })
})

const HOST = process.env.HOST || '0.0.0.0'
const PORT_NUM = typeof PORT === 'string' ? parseInt(PORT, 10) : PORT
app.listen(PORT_NUM, HOST, () => {
    logger.info(`Server running on http://${HOST}:${PORT_NUM}`)
})
