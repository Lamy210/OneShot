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
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
}))

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

app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`)
})
