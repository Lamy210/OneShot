import { initTRPC, TRPCError } from '@trpc/server'
import { z } from 'zod'
import { Context } from './context'
import { logger } from './utils/logger'
import { containsNGWord, detectNGWords } from './utils/ngWords'

const t = initTRPC.context<Context>().create()

export const router = t.router
export const procedure = t.procedure

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
})

// Main app router
export const appRouter = router({
    posts: postsRouter,
    reports: reportsRouter,
})

export type AppRouter = typeof appRouter
