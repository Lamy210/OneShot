import { initTRPC, TRPCError } from '@trpc/server'
import { z } from 'zod'
import { Context } from './context'
import { logger } from './utils/logger'
import { containsNGWord, detectNGWords } from './utils/ngWords'
import express from 'express'
import Stripe from 'stripe'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

const t = initTRPC.context<Context>().create()

export const router = t.router
export const procedure = t.procedure

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' })
const prisma = new PrismaClient()

// Posts router
const postsRouter = router({
    list: procedure
        .input(z.object({
            category: z.string().optional(),
            limit: z.number().min(1).max(100).default(10),
            cursor: z.string().optional(),
        }))
        .query(async ({ input, ctx }) => {
            const { category, limit, cursor } = input

            const posts = await ctx.prisma.post.findMany({
                where: {
                    ...(category && { category }),
                    status: 'OPEN',
                },
                take: limit + 1,
                cursor: cursor ? { id: cursor } : undefined,
                orderBy: { createdAt: 'desc' },
                include: {
                    author: {
                        select: { id: true, nickname: true },
                    },
                },
            })

            let nextCursor: typeof cursor | undefined = undefined
            if (posts.length > limit) {
                const nextItem = posts.pop()
                nextCursor = nextItem!.id
            }

            return {
                posts,
                nextCursor,
            }
        }),

    create: procedure
        .input(z.object({
            title: z.string().min(1).max(100),
            category: z.string().min(1).max(50),
            content: z.string().min(1),
            budget: z.number().min(100),
            deadline: z.date().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
            if (!ctx.user) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'ログインが必要です',
                })
            }

            // NGワードチェック
            const fullText = `${input.title} ${input.content}`
            if (containsNGWord(fullText)) {
                const detectedWords = detectNGWords(fullText)
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: `NGワードが含まれています: ${detectedWords.join(', ')}`,
                })
            }

            const post = await ctx.prisma.post.create({
                data: {
                    ...input,
                    authorId: ctx.user.id,
                },
                include: {
                    author: {
                        select: { id: true, nickname: true },
                    },
                },
            })

            logger.info('Post created', { postId: post.id, authorId: ctx.user.id })
            return post
        }),

    getById: procedure
        .input(z.string())
        .query(async ({ input, ctx }) => {
            const post = await ctx.prisma.post.findUnique({
                where: { id: input },
                include: {
                    author: {
                        select: { id: true, nickname: true },
                    },
                },
            })

            if (!post) {
                throw new Error('Post not found')
            }

            return post
        }),

    update: procedure
        .input(z.object({
            id: z.string(),
            title: z.string().min(1).max(100).optional(),
            category: z.string().min(1).max(50).optional(),
            content: z.string().min(1).optional(),
            budget: z.number().min(100).optional(),
            deadline: z.date().optional(),
            status: z.enum(['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
        }))
        .mutation(async ({ input, ctx }) => {
            if (!ctx.user) {
                throw new TRPCError({ code: 'UNAUTHORIZED', message: 'ログインが必要です' })
            }
            // 投稿者または管理者のみ許可
            const post = await ctx.prisma.post.findUnique({ where: { id: input.id } })
            if (!post) throw new Error('Post not found')
            if (ctx.user.id !== post.authorId && ctx.user.role !== 'ADMIN') {
                throw new TRPCError({ code: 'UNAUTHORIZED', message: '権限がありません' })
            }
            const updated = await ctx.prisma.post.update({
                where: { id: input.id },
                data: {
                    title: input.title,
                    category: input.category,
                    content: input.content,
                    budget: input.budget,
                    deadline: input.deadline,
                    status: input.status,
                },
            })
            return updated
        }),

    delete: procedure
        .input(z.string())
        .mutation(async ({ input, ctx }) => {
            if (!ctx.user) {
                throw new TRPCError({ code: 'UNAUTHORIZED', message: 'ログインが必要です' })
            }
            // 投稿者または管理者のみ許可
            const post = await ctx.prisma.post.findUnique({ where: { id: input } })
            if (!post) throw new Error('Post not found')
            if (ctx.user.id !== post.authorId && ctx.user.role !== 'ADMIN') {
                throw new TRPCError({ code: 'UNAUTHORIZED', message: '権限がありません' })
            }
            await ctx.prisma.post.delete({ where: { id: input } })
            return { success: true }
        }),
})

// Reports router
const reportsRouter = router({
    create: procedure
        .input(z.object({
            postId: z.string(),
            reason: z.string().min(1).max(200),
        }))
        .mutation(async ({ input, ctx }) => {
            if (!ctx.user) {
                throw new Error('Unauthorized')
            }

            const report = await ctx.prisma.report.create({
                data: {
                    ...input,
                    reporterId: ctx.user.id,
                },
            })

            // 通報数をカウントアップ
            await ctx.prisma.post.update({
                where: { id: input.postId },
                data: {
                    flagsCount: {
                        increment: 1,
                    },
                },
            })

            logger.info('Report created', { reportId: report.id, postId: input.postId })
            return report
        }),

    list: procedure
        .input(z.object({
            limit: z.number().min(1).max(100).default(20),
            cursor: z.string().optional(),
        }))
        .query(async ({ input, ctx }) => {
            if (!ctx.user || ctx.user.role !== 'ADMIN') {
                throw new TRPCError({ code: 'UNAUTHORIZED', message: '管理者権限が必要です' })
            }
            const { limit, cursor } = input
            const reports = await ctx.prisma.report.findMany({
                take: limit + 1,
                cursor: cursor ? { id: cursor } : undefined,
                orderBy: { createdAt: 'desc' },
                include: {
                    post: { select: { id: true, title: true } },
                    reporter: { select: { id: true, nickname: true } },
                },
            })
            let nextCursor: typeof cursor | undefined = undefined
            if (reports.length > limit) {
                const nextItem = reports.pop()
                nextCursor = nextItem!.id
            }
            return { reports, nextCursor }
        }),
})

// Users router
const usersRouter = router({
    list: procedure
        .input(z.object({
            limit: z.number().min(1).max(100).default(20),
            cursor: z.string().optional(),
        }))
        .query(async ({ input, ctx }) => {
            const { limit, cursor } = input
            const users = await ctx.prisma.user.findMany({
                take: limit + 1,
                cursor: cursor ? { id: cursor } : undefined,
                orderBy: { createdAt: 'desc' },
            })
            let nextCursor: typeof cursor | undefined = undefined
            if (users.length > limit) {
                const nextItem = users.pop()
                nextCursor = nextItem!.id
            }
            return { users, nextCursor }
        }),
    getById: procedure
        .input(z.string())
        .query(async ({ input, ctx }) => {
            const user = await ctx.prisma.user.findUnique({
                where: { id: input },
            })
            if (!user) throw new Error('User not found')
            return user
        }),
    create: procedure
        .input(z.object({
            nickname: z.string().min(1).max(32),
            email: z.string().email(),
            authId: z.string().min(1),
            role: z.enum(['USER', 'ADMIN']).optional(),
        }))
        .mutation(async ({ input, ctx }) => {
            // 管理者のみ許可（仮実装）
            if (!ctx.user || ctx.user.role !== 'ADMIN') {
                throw new TRPCError({ code: 'UNAUTHORIZED', message: '管理者権限が必要です' })
            }
            const user = await ctx.prisma.user.create({ data: input })
            return user
        }),
    update: procedure
        .input(z.object({
            id: z.string(),
            nickname: z.string().min(1).max(32).optional(),
            email: z.string().email().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
            if (!ctx.user || (ctx.user.id !== input.id && ctx.user.role !== 'ADMIN')) {
                throw new TRPCError({ code: 'UNAUTHORIZED', message: '権限がありません' })
            }
            const user = await ctx.prisma.user.update({
                where: { id: input.id },
                data: {
                    nickname: input.nickname,
                    email: input.email,
                },
            })
            return user
        }),
    delete: procedure
        .input(z.string())
        .mutation(async ({ input, ctx }) => {
            if (!ctx.user || ctx.user.role !== 'ADMIN') {
                throw new TRPCError({ code: 'UNAUTHORIZED', message: '管理者権限が必要です' })
            }
            await ctx.prisma.user.delete({ where: { id: input } })
            return { success: true }
        }),
    changeRole: procedure
        .input(z.object({
            id: z.string(),
            role: z.enum(['USER', 'ADMIN']),
        }))
        .mutation(async ({ input, ctx }) => {
            if (!ctx.user || ctx.user.role !== 'ADMIN') {
                throw new TRPCError({ code: 'UNAUTHORIZED', message: '管理者権限が必要です' })
            }
            const user = await ctx.prisma.user.update({
                where: { id: input.id },
                data: { role: input.role },
            })
            return user
        }),
})

// Payments router
const paymentsRouter = router({
    list: procedure
        .input(z.object({
            limit: z.number().min(1).max(100).default(20),
            cursor: z.string().optional(),
        }))
        .query(async ({ input, ctx }) => {
            const { limit, cursor } = input
            const payments = await ctx.prisma.payment.findMany({
                take: limit + 1,
                cursor: cursor ? { id: cursor } : undefined,
                orderBy: { createdAt: 'desc' },
                include: {
                    payer: { select: { id: true, nickname: true } },
                    post: { select: { id: true, title: true } },
                },
            })
            let nextCursor: typeof cursor | undefined = undefined
            if (payments.length > limit) {
                const nextItem = payments.pop()
                nextCursor = nextItem!.id
            }
            return { payments, nextCursor }
        }),
    getById: procedure
        .input(z.string())
        .query(async ({ input, ctx }) => {
            const payment = await ctx.prisma.payment.findUnique({
                where: { id: input },
                include: {
                    payer: { select: { id: true, nickname: true } },
                    post: { select: { id: true, title: true } },
                },
            })
            if (!payment) throw new Error('Payment not found')
            return payment
        }),
    create: procedure
        .input(z.object({
            postId: z.string(),
            amount: z.number().min(100),
            platformFee: z.number().min(0),
        }))
        .mutation(async ({ input, ctx }) => {
            if (!ctx.user) {
                throw new TRPCError({ code: 'UNAUTHORIZED', message: 'ログインが必要です' })
            }
            // Stripe連携はダミー
            const payment = await ctx.prisma.payment.create({
                data: {
                    postId: input.postId,
                    payerId: ctx.user.id,
                    amount: input.amount,
                    platformFee: input.platformFee,
                    status: 'PENDING',
                },
            })
            logger.info('Payment created', { paymentId: payment.id, payerId: ctx.user.id })
            return payment
        }),
    updateStatus: procedure
        .input(z.object({
            id: z.string(),
            status: z.enum(['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED']),
        }))
        .mutation(async ({ input, ctx }) => {
            // 管理者のみ許可
            if (!ctx.user || ctx.user.role !== 'ADMIN') {
                throw new TRPCError({ code: 'UNAUTHORIZED', message: '管理者権限が必要です' })
            }
            const payment = await ctx.prisma.payment.update({
                where: { id: input.id },
                data: { status: input.status },
            })
            return payment
        }),
    refund: procedure
        .input(z.object({
            id: z.string(),
        }))
        .mutation(async ({ input, ctx }) => {
            // 管理者のみ許可
            if (!ctx.user || ctx.user.role !== 'ADMIN') {
                throw new TRPCError({ code: 'UNAUTHORIZED', message: '管理者権限が必要です' })
            }
            // Stripe返金処理はダミー
            const payment = await ctx.prisma.payment.update({
                where: { id: input.id },
                data: { status: 'REFUNDED' },
            })
            logger.info('Payment refunded', { paymentId: payment.id })
            return payment
        }),
})

// Main app router
export const appRouter = router({
    posts: postsRouter,
    reports: reportsRouter,
    users: usersRouter,
    payments: paymentsRouter,
})

export type AppRouter = typeof appRouter

// Express用RESTエンドポイント追加
export function registerRestEndpoints(app: express.Express) {
    // Stripe決済Intent発行API（本番対応）
    app.post('/api/payment/checkout', async (req, res) => {
        try {
            // JWT認証必須
            const auth = req.headers.authorization;
            if (!auth || !auth.startsWith('Bearer ')) {
                return res.status(401).json({ error: '認証が必要です', code: 'UNAUTHORIZED' });
            }
            const token = auth.replace('Bearer ', '');
            let decoded: any;
            try {
                decoded = jwt.decode(token, { complete: true });
                if (!decoded) throw new Error('Invalid token');
            } catch (e) {
                return res.status(401).json({ error: 'トークンが不正です', code: 'INVALID_TOKEN' });
            }
            // 入力バリデーション
            const { postId } = req.body;
            if (!postId || typeof postId !== 'string' || postId.length < 10) {
                return res.status(400).json({ error: 'postIdが不正です', code: 'BAD_REQUEST' });
            }
            // 依頼内容・金額取得（例: DBから）
            // ここではダミー金額
            const amount = 1000;
            const paymentIntent = await stripe.paymentIntents.create({
                amount,
                currency: 'jpy',
                metadata: { postId },
            });
            return res.json({ paymentIntentId: paymentIntent.id, clientSecret: paymentIntent.client_secret });
        } catch (e: any) {
            res.status(500).json({ error: e.message, code: 'STRIPE_ERROR' });
        }
    });

    // Stripe Webhook受信
    app.post('/api/payment/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
        const sig = req.headers['stripe-signature'];
        let event;
        try {
            event = stripe.webhooks.constructEvent(req.body, sig as string, process.env.STRIPE_WEBHOOK_SECRET!);
        } catch (err: any) {
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }
        // イベント種別ごとに処理
        if (event.type === 'payment_intent.succeeded' || event.type === 'payment_intent.payment_failed') {
            const paymentIntent = event.data.object as Stripe.PaymentIntent;
            const postId = paymentIntent.metadata?.postId;
            if (postId) {
                try {
                    await prisma.payment.updateMany({
                        where: { postId },
                        data: { status: event.type === 'payment_intent.succeeded' ? 'COMPLETED' : 'FAILED' },
                    });
                } catch (e) {
                    // ログ出力等
                }
            }
        }
        res.json({ received: true });
    });

    // ヘルスチェックAPI
    app.get('/health', (req, res) => {
        res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });
}
