import { initTRPC, TRPCError } from '@trpc/server'
import { z } from 'zod'
import { Context } from './context'
import { logger } from './utils/logger'
import { containsNGWord, detectNGWords } from './utils/ngWords'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
const crypto = require('crypto');
import Stripe from 'stripe';
import { createPaymentNotification } from './utils/notifications';
import { sendPasswordResetEmail, sendWelcomeEmail, sendPaymentCompletedEmail } from './utils/email';
import nodemailer from 'nodemailer';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2023-10-16' });

const t = initTRPC.context<Context>().create()

export const router = t.router
export const procedure = t.procedure

// Posts router
const postsRouter = router({
    list: procedure
        .input(z.object({
            categoryId: z.string().optional(), // categoryIdに変更
            limit: z.number().min(1).max(100).default(10),
            cursor: z.string().optional(),
        }))
        .query(async ({ input, ctx }) => {
            const { categoryId, limit, cursor } = input

            const posts = await ctx.prisma.post.findMany({
                where: {
                    ...(categoryId && { categoryId }), // categoryIdでフィルタリング
                    status: 'OPEN',
                },
                take: limit + 1,
                cursor: cursor ? { id: cursor } : undefined,
                orderBy: { createdAt: 'desc' },
                include: {
                    author: {
                        select: { id: true, nickname: true },
                    },
                    category: {
                        select: { id: true, name: true },
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
            categoryId: z.string().min(1), // categoryIdに変更
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

            // カテゴリの存在確認
            const category = await ctx.prisma.category.findUnique({
                where: { id: input.categoryId, isActive: true }
            });
            if (!category) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: '指定されたカテゴリが見つかりません',
                })
            }

            // NGワードチェック
            const fullText = `${input.title} ${input.content}`
            if (await containsNGWord(fullText)) {
                const detectedWords = await detectNGWords(fullText)
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: `NGワードが含まれています: ${detectedWords.join(', ')}`,
                })
            }

            if (!ctx.user?.id) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'ログインが必要です',
                })
            }

            const post = await ctx.prisma.post.create({
                data: {
                    title: input.title,
                    categoryId: input.categoryId, // categoryIdを使用
                    content: input.content,
                    budget: input.budget,
                    deadline: input.deadline,
                    authorId: ctx.user.id,
                },
                include: {
                    author: {
                        select: { id: true, nickname: true },
                    },
                    category: {
                        select: { id: true, name: true },
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

            if (!ctx.user?.id) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'ログインが必要です',
                })
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

// User settings router - 銀行口座設定とStripe Connect（簡略版）
const userSettingsRouter = router({
    // 銀行口座情報の取得（本番実装）
    getBankAccount: procedure
        .query(async ({ ctx }) => {
            if (!ctx.user) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'ログインが必要です',
                })
            }
            const user = await ctx.prisma.user.findUnique({ where: { id: ctx.user.id } });
            if (!user) {
                throw new TRPCError({ code: 'NOT_FOUND', message: 'ユーザーが見つかりません' });
            }
            return {
                bankName: user.bankName || '',
                bankBranch: user.bankBranch || '',
                accountType: user.accountType || 'savings',
                accountNumber: user.accountNumber || '',
                accountHolder: user.accountHolder || '',
                stripeConnectAccountId: user.stripeConnectAccountId,
                stripeOnboardingCompleted: user.stripeOnboardingCompleted,
                stripeAccountEnabled: user.stripeAccountEnabled,
                payoutEnabled: user.payoutEnabled,
                minPayoutAmount: user.minPayoutAmount ?? 1000,
                // balance, lastPayoutDateは別途実装が必要
            }
        }),

    // 銀行口座情報の更新（本番実装）
    updateBankAccount: procedure
        .input(z.object({
            bankName: z.string().min(1).max(100),
            bankBranch: z.string().min(1).max(100),
            accountType: z.enum(['savings', 'checking']),
            accountNumber: z.string().min(7).max(20),
            accountHolder: z.string().min(1).max(100),
        }))
        .mutation(async ({ input, ctx }) => {
            if (!ctx.user) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'ログインが必要です',
                })
            }
            const user = await ctx.prisma.user.update({
                where: { id: ctx.user.id },
                data: {
                    bankName: input.bankName,
                    bankBranch: input.bankBranch,
                    accountType: input.accountType,
                    accountNumber: input.accountNumber,
                    accountHolder: input.accountHolder,
                },
            });
            return {
                bankName: user.bankName || '',
                bankBranch: user.bankBranch || '',
                accountType: user.accountType || 'savings',
                accountNumber: user.accountNumber || '',
                accountHolder: user.accountHolder || '',
            }
        }),

    // Stripe Connect アカウント作成・オンボーディング（本番実装）
    createStripeAccount: procedure
        .mutation(async ({ ctx }) => {
            if (!ctx.user) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'ログインが必要です',
                });
            }
            // 既にアカウントがある場合は再作成しない
            const user = await ctx.prisma.user.findUnique({ where: { id: ctx.user.id } });
            if (!user) {
                throw new TRPCError({ code: 'NOT_FOUND', message: 'ユーザーが見つかりません' });
            }
            if (user.stripeConnectAccountId) {
                return { success: true, stripeConnectAccountId: user.stripeConnectAccountId };
            }
            try {
                // Stripe Connectアカウント作成
                const account = await stripe.accounts.create({
                    type: 'express',
                    country: 'JP',
                    email: user.email,
                    capabilities: {
                        transfers: { requested: true },
                        card_payments: { requested: true },
                    },
                    business_type: 'individual',
                    business_profile: {
                        url: process.env.FRONTEND_URL || 'http://localhost:3000',
                        mcc: '5734', // Computer Software Stores
                    },
                });

                // オンボーディングURLを生成
                const accountLink = await stripe.accountLinks.create({
                    account: account.id,
                    refresh_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings?tab=stripe&refresh=true`,
                    return_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings?tab=stripe&success=true`,
                    type: 'account_onboarding',
                });

                // DBに保存
                await ctx.prisma.user.update({
                    where: { id: ctx.user.id },
                    data: {
                        stripeConnectAccountId: account.id,
                        stripeOnboardingCompleted: false,
                        stripeAccountEnabled: false,
                    },
                });

                logger.info('Stripe Connect account created', {
                    userId: ctx.user.id,
                    accountId: account.id
                });

                return {
                    success: true,
                    stripeConnectAccountId: account.id,
                    onboardingUrl: accountLink.url,
                    accountStatus: account.charges_enabled ? 'active' : 'pending'
                };
            } catch (err) {
                logger.error('Stripe Connect account creation failed', {
                    userId: ctx.user.id,
                    error: err
                });
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Stripeアカウント作成に失敗しました',
                    cause: err
                });
            }
        }),

    // Stripe Connect アカウント状態確認
    getStripeAccountStatus: procedure
        .query(async ({ ctx }) => {
            if (!ctx.user) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'ログインが必要です',
                });
            }

            const user = await ctx.prisma.user.findUnique({ where: { id: ctx.user.id } });
            if (!user || !user.stripeConnectAccountId) {
                return {
                    hasAccount: false,
                    accountStatus: 'none',
                    onboardingUrl: null
                };
            }

            try {
                // Stripeからアカウント情報を取得
                const account = await stripe.accounts.retrieve(user.stripeConnectAccountId);

                // アカウント状態を更新
                const isEnabled = account.charges_enabled && account.payouts_enabled;
                const isOnboardingCompleted = account.details_submitted;

                await ctx.prisma.user.update({
                    where: { id: ctx.user.id },
                    data: {
                        stripeOnboardingCompleted: isOnboardingCompleted,
                        stripeAccountEnabled: isEnabled,
                    },
                });

                return {
                    hasAccount: true,
                    accountStatus: isEnabled ? 'active' : 'pending',
                    onboardingCompleted: isOnboardingCompleted,
                    accountEnabled: isEnabled,
                    stripeConnectAccountId: user.stripeConnectAccountId,
                };
            } catch (err) {
                logger.error('Failed to retrieve Stripe account status', {
                    userId: ctx.user.id,
                    error: err
                });
                return {
                    hasAccount: true,
                    accountStatus: 'error',
                    error: 'アカウント状態の取得に失敗しました'
                };
            }
        }),

    // 振込設定の更新（本番実装）
    updatePayoutSettings: procedure
        .input(z.object({
            payoutEnabled: z.boolean(),
            minPayoutAmount: z.number().min(100).max(100000),
        }))
        .mutation(async ({ input, ctx }) => {
            if (!ctx.user) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'ログインが必要です',
                })
            }
            // DB更新
            const user = await ctx.prisma.user.update({
                where: { id: ctx.user.id },
                data: {
                    payoutEnabled: input.payoutEnabled,
                    minPayoutAmount: input.minPayoutAmount,
                },
            });
            return {
                payoutEnabled: user.payoutEnabled,
                minPayoutAmount: user.minPayoutAmount,
            }
        }),
})

// Payment router - 決済・エスクロー・振込処理
const paymentRouter = router({
    // 決済開始（エスクロー）
    createPayment: procedure
        .input(z.object({
            postId: z.string(),
            amount: z.number().min(100),
        }))
        .mutation(async ({ input, ctx }) => {
            if (!ctx.user) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'ログインが必要です',
                })
            }

            // 投稿の存在確認
            const post = await ctx.prisma.post.findUnique({
                where: { id: input.postId },
                include: { author: true },
            })
            if (!post) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: '投稿が見つかりません',
                })
            }
            if (post.authorId === ctx.user.id) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: '自分の投稿には支払いできません',
                })
            }

            // プラットフォーム手数料計算（15% + 50円）
            const platformFee = Math.floor(input.amount * 0.15) + 50
            const recipientAmount = input.amount - platformFee

            // Stripe Payment Intent作成
            let paymentIntent;
            try {
                paymentIntent = await stripe.paymentIntents.create({
                    amount: input.amount,
                    currency: 'jpy',
                    payment_method_types: ['card'],
                    // Stripe Connectアカウントへの支払い（エスクロー）
                    transfer_group: post.authorId,
                    metadata: {
                        postId: input.postId,
                        payerId: ctx.user.id!,
                        recipientId: post.authorId,
                    },
                });
            } catch (err) {
                throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Stripe PaymentIntent作成に失敗しました', cause: err });
            }

            // Paymentレコード作成
            const payment = await ctx.prisma.payment.create({
                data: {
                    postId: input.postId,
                    payerId: ctx.user.id!,
                    recipientId: post.authorId,
                    amount: input.amount,
                    platformFee,
                    recipientAmount,
                    status: 'PENDING',
                    stripePaymentId: paymentIntent.id,
                },
            })

            logger.info('Payment created', {
                paymentId: payment.id,
                postId: input.postId,
                payerId: ctx.user.id!,
                amount: input.amount
            })

            // 決済完了時の通知を作成（支払い者向け）
            try {
                await createPaymentNotification(
                    ctx.user.id!,
                    post.title,
                    input.amount
                );
            } catch (error) {
                logger.error('通知作成エラー:', error);
                // 通知作成に失敗しても決済処理は続行
            }

            // 投稿者向けにも通知を作成
            try {
                await createPaymentNotification(
                    post.authorId,
                    post.title,
                    input.amount
                );
            } catch (error) {
                logger.error('投稿者向け通知作成エラー:', error);
                // 通知作成に失敗しても決済処理は続行
            }

            return {
                paymentId: payment.id,
                clientSecret: paymentIntent.client_secret,
                amount: payment.amount,
                platformFee: payment.platformFee,
                recipientAmount: payment.recipientAmount,
            }
        }),

    // 決済一覧取得（動的化対応）
    getUserPayments: procedure
        .input(z.object({
            type: z.enum(['sent', 'received', 'all']).optional().default('all'),
            status: z.enum(['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED']).optional(),
            dateFrom: z.date().optional(),
            dateTo: z.date().optional(),
            minAmount: z.number().optional(),
            maxAmount: z.number().optional(),
            search: z.string().optional(),
            limit: z.number().min(1).max(100).optional().default(20),
            offset: z.number().min(0).optional().default(0),
            sortBy: z.enum(['date', 'amount', 'status']).optional().default('date'),
            sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
        }))
        .query(async ({ input, ctx }) => {
            if (!ctx.user) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'ログインが必要です',
                })
            }

            // 基本条件
            let where: any = {};

            // 決済タイプフィルタ
            if (input.type === 'sent') {
                where.payerId = ctx.user.id;
            } else if (input.type === 'received') {
                where.recipientId = ctx.user.id;
            } else {
                where.OR = [
                    { payerId: ctx.user.id },
                    { recipientId: ctx.user.id },
                ];
            }

            // ステータスフィルタ
            if (input.status) {
                where.status = input.status;
            }

            // 日付フィルタ
            if (input.dateFrom || input.dateTo) {
                where.createdAt = {};
                if (input.dateFrom) {
                    where.createdAt.gte = input.dateFrom;
                }
                if (input.dateTo) {
                    where.createdAt.lte = input.dateTo;
                }
            }

            // 金額フィルタ
            if (input.minAmount || input.maxAmount) {
                where.amount = {};
                if (input.minAmount) {
                    where.amount.gte = input.minAmount;
                }
                if (input.maxAmount) {
                    where.amount.lte = input.maxAmount;
                }
            }

            // 検索フィルタ（投稿タイトル）
            if (input.search) {
                where.post = {
                    title: {
                        contains: input.search,
                        mode: 'insensitive' as const,
                    },
                };
            }

            // ソート条件
            let orderBy: any = {};
            if (input.sortBy === 'date') {
                orderBy.createdAt = input.sortOrder;
            } else if (input.sortBy === 'amount') {
                orderBy.amount = input.sortOrder;
            } else if (input.sortBy === 'status') {
                orderBy.status = input.sortOrder;
            }

            // 決済データ取得
            const [payments, total] = await Promise.all([
                ctx.prisma.payment.findMany({
                    where,
                    orderBy,
                    take: input.limit,
                    skip: input.offset,
                    include: {
                        post: {
                            select: {
                                id: true,
                                title: true,
                                category: {
                                    select: { name: true }
                                }
                            }
                        },
                        payer: {
                            select: { id: true, nickname: true }
                        },
                        recipient: {
                            select: { id: true, nickname: true }
                        }
                    },
                }),
                ctx.prisma.payment.count({ where }),
            ]);

            // 統計情報計算
            const stats = await ctx.prisma.payment.aggregate({
                where: {
                    ...where,
                    status: 'COMPLETED',
                },
                _sum: {
                    amount: true,
                    platformFee: true,
                    recipientAmount: true,
                },
                _count: true,
            });

            // 月別統計
            const monthlyStats = await ctx.prisma.payment.groupBy({
                by: ['status'],
                where: {
                    ...where,
                    createdAt: {
                        gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                    },
                },
                _sum: {
                    amount: true,
                },
                _count: true,
            });

            return {
                payments: payments.map(payment => ({
                    id: payment.id,
                    title: payment.post?.title || '',
                    category: payment.post?.category?.name || '',
                    amount: payment.amount,
                    platformFee: payment.platformFee,
                    recipientAmount: payment.recipientAmount,
                    status: payment.status,
                    createdAt: payment.createdAt,
                    updatedAt: payment.updatedAt,
                    paidAt: payment.paidAt,
                    type: ctx.user && payment.payerId === ctx.user.id ? 'sent' : 'received',
                    payer: payment.payer,
                    recipient: payment.recipient,
                    stripePaymentId: payment.stripePaymentId,
                    stripeTransferId: payment.stripeTransferId,
                })),
                pagination: {
                    total,
                    limit: input.limit,
                    offset: input.offset,
                    hasMore: input.offset + input.limit < total,
                    totalPages: Math.ceil(total / input.limit),
                    currentPage: Math.floor(input.offset / input.limit) + 1,
                },
                stats: {
                    totalPayments: total,
                    completedPayments: stats._count || 0,
                    totalAmount: stats._sum.amount || 0,
                    totalPlatformFee: stats._sum.platformFee || 0,
                    totalRecipientAmount: stats._sum.recipientAmount || 0,
                    monthlyStats: monthlyStats.reduce((acc, stat) => {
                        acc[stat.status] = {
                            count: stat._count,
                            amount: stat._sum.amount || 0,
                        };
                        return acc;
                    }, {} as Record<string, { count: number; amount: number }>),
                },
            };
        }),

    // 決済統計取得
    getPaymentStats: procedure
        .input(z.object({
            period: z.enum(['day', 'week', 'month', 'year']).optional().default('month'),
            type: z.enum(['sent', 'received', 'all']).optional().default('all'),
        }))
        .query(async ({ input, ctx }) => {
            if (!ctx.user) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'ログインが必要です',
                })
            }

            // 期間の開始日を計算
            const now = new Date();
            let startDate: Date;

            switch (input.period) {
                case 'day':
                    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    break;
                case 'week':
                    const dayOfWeek = now.getDay();
                    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                    startDate = new Date(now.getTime() - daysToSubtract * 24 * 60 * 60 * 1000);
                    startDate.setHours(0, 0, 0, 0);
                    break;
                case 'month':
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    break;
                case 'year':
                    startDate = new Date(now.getFullYear(), 0, 1);
                    break;
                default:
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            }

            // 基本条件
            let where: any = {
                createdAt: {
                    gte: startDate,
                },
            };

            // 決済タイプフィルタ
            if (input.type === 'sent') {
                where.payerId = ctx.user.id;
            } else if (input.type === 'received') {
                where.recipientId = ctx.user.id;
            } else {
                where.OR = [
                    { payerId: ctx.user.id },
                    { recipientId: ctx.user.id },
                ];
            }

            // 統計情報取得
            const [totalStats, statusStats, dailyStats] = await Promise.all([
                // 全体統計
                ctx.prisma.payment.aggregate({
                    where: { ...where, status: 'COMPLETED' },
                    _sum: {
                        amount: true,
                        platformFee: true,
                        recipientAmount: true,
                    },
                    _count: true,
                }),
                // ステータス別統計
                ctx.prisma.payment.groupBy({
                    by: ['status'],
                    where,
                    _sum: {
                        amount: true,
                    },
                    _count: true,
                }),
                // 日別統計
                ctx.prisma.payment.groupBy({
                    by: ['createdAt'],
                    where: { ...where, status: 'COMPLETED' },
                    _sum: {
                        amount: true,
                    },
                    _count: true,
                }),
            ]);

            return {
                period: input.period,
                totalAmount: totalStats._sum.amount || 0,
                totalPlatformFee: totalStats._sum.platformFee || 0,
                totalRecipientAmount: totalStats._sum.recipientAmount || 0,
                totalCompletedPayments: totalStats._count || 0,
                statusBreakdown: statusStats.reduce((acc, stat) => {
                    acc[stat.status] = {
                        count: stat._count,
                        amount: stat._sum.amount || 0,
                    };
                    return acc;
                }, {} as Record<string, { count: number; amount: number }>),
                dailyBreakdown: dailyStats.map(stat => ({
                    date: stat.createdAt,
                    amount: stat._sum.amount || 0,
                    count: stat._count,
                })),
            };
        }),

    // 決済詳細取得（本番実装）
    getPaymentDetail: procedure
        .input(z.string())
        .query(async ({ input, ctx }) => {
            if (!ctx.user) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'ログインが必要です',
                })
            }
            const payment = await ctx.prisma.payment.findUnique({
                where: { id: input },
                include: {
                    post: true,
                    payer: true,
                    recipient: true,
                },
            });
            if (!payment) {
                throw new TRPCError({ code: 'NOT_FOUND', message: '決済情報が見つかりません' });
            }
            // ユーザーが当事者でなければエラー
            if (payment.payerId !== ctx.user.id && payment.recipientId !== ctx.user.id) {
                throw new TRPCError({ code: 'FORBIDDEN', message: 'アクセス権がありません' });
            }
            return {
                id: payment.id,
                post: payment.post,
                payer: { id: payment.payer.id, nickname: payment.payer.nickname },
                recipient: payment.recipient ? { id: payment.recipient.id, nickname: payment.recipient.nickname } : null,
                amount: payment.amount,
                platformFee: payment.platformFee,
                recipientAmount: payment.recipientAmount,
                status: payment.status,
                paidAt: payment.paidAt,
                transferredAt: payment.transferredAt,
                createdAt: payment.createdAt,
                updatedAt: payment.updatedAt,
            };
        }),

    // Webhook処理（Stripe用）
    handleWebhook: procedure
        .input(z.object({
            eventType: z.string(),
            paymentId: z.string(),
            stripePaymentId: z.string().optional(),
            stripeTransferId: z.string().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
            try {
                const { eventType, paymentId, stripePaymentId, stripeTransferId } = input;

                logger.info('Webhook received', {
                    paymentId,
                    eventType,
                    stripePaymentId,
                    stripeTransferId
                });

                // Paymentテーブルの更新
                const updateData: any = {};

                switch (eventType) {
                    case 'payment_intent.succeeded':
                        updateData.status = 'COMPLETED';
                        updateData.completedAt = new Date();
                        break;
                    case 'payment_intent.payment_failed':
                        updateData.status = 'FAILED';
                        updateData.failedAt = new Date();
                        break;
                    case 'transfer.created':
                        updateData.stripeTransferId = stripeTransferId;
                        break;
                    case 'transfer.paid':
                        updateData.payoutStatus = 'PAID';
                        updateData.paidAt = new Date();
                        break;
                    default:
                        logger.warn('Unknown webhook event type', { eventType });
                        return { success: true };
                }

                // Paymentテーブル更新
                await ctx.prisma.payment.update({
                    where: { id: paymentId },
                    data: updateData
                });

                // 通知作成
                if (eventType === 'payment_intent.succeeded') {
                    const payment = await ctx.prisma.payment.findUnique({
                        where: { id: paymentId },
                        include: { post: true }
                    });

                    if (payment) {
                        await ctx.prisma.notification.create({
                            data: {
                                userId: payment.post.authorId,
                                type: 'payment',
                                title: '決済完了',
                                body: `投稿「${payment.post.title}」の決済が完了しました。`,
                                link: `/posts/${payment.postId}`
                            }
                        });
                    }
                }

                logger.info('Webhook processed successfully', { paymentId, eventType });
                return { success: true };
            } catch (error) {
                logger.error('Webhook processing error', { error, input });
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Webhook処理中にエラーが発生しました'
                });
            }
        }),
})

// Notification router - 通知機能
const notificationRouter = router({
    // 通知一覧取得
    list: procedure
        .input(z.object({
            limit: z.number().min(1).max(100).optional().default(50),
            offset: z.number().min(0).optional().default(0),
            unreadOnly: z.boolean().optional().default(false),
        }))
        .query(async ({ input, ctx }) => {
            if (!ctx.user) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'ログインが必要です',
                })
            }
            const where = {
                userId: ctx.user.id,
                ...(input.unreadOnly ? { isRead: false } : {}),
            };
            const notifications = await ctx.prisma.notification.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: input.limit,
                skip: input.offset,
            });
            const total = await ctx.prisma.notification.count({ where });
            const unreadCount = await ctx.prisma.notification.count({
                where: { userId: ctx.user.id, isRead: false },
            });
            return {
                notifications,
                total,
                unreadCount,
            };
        }),

    // 通知の既読化
    markAsRead: procedure
        .input(z.object({
            notificationIds: z.array(z.string()).optional(),
            markAllAsRead: z.boolean().optional().default(false),
        }))
        .mutation(async ({ input, ctx }) => {
            if (!ctx.user) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'ログインが必要です',
                })
            }
            if (input.markAllAsRead) {
                await ctx.prisma.notification.updateMany({
                    where: { userId: ctx.user.id, isRead: false },
                    data: { isRead: true, readAt: new Date() },
                });
            } else if (input.notificationIds && input.notificationIds.length > 0) {
                await ctx.prisma.notification.updateMany({
                    where: {
                        id: { in: input.notificationIds },
                        userId: ctx.user.id,
                    },
                    data: { isRead: true, readAt: new Date() },
                });
            }
            return { success: true };
        }),

    // 通知作成（システム・管理者用）
    create: procedure
        .input(z.object({
            userId: z.string(),
            type: z.enum(['message', 'payment', 'system', 'post', 'payout']),
            title: z.string().min(1).max(100),
            body: z.string().min(1).max(500),
            link: z.string().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
            if (!ctx.user) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'ログインが必要です',
                })
            }
            // 管理者のみ作成可能（簡易チェック）
            if (ctx.user.role !== 'ADMIN') {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: '管理者権限が必要です',
                })
            }
            const notification = await ctx.prisma.notification.create({
                data: {
                    userId: input.userId,
                    type: input.type,
                    title: input.title,
                    body: input.body,
                    link: input.link,
                },
            });
            return notification;
        }),
});

// Dashboard router - ダッシュボード統計データ
const dashboardRouter = router({
    // ダッシュボード統計データ取得
    getStats: procedure
        .query(async ({ ctx }) => {
            if (!ctx.user) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'ログインが必要です',
                })
            }

            // ユーザーの投稿数を取得
            const totalPosts = await ctx.prisma.post.count({
                where: { authorId: ctx.user.id }
            });

            // 今月の閲覧数を取得（PostViewテーブルから集計）
            const currentMonth = new Date();
            currentMonth.setDate(1);
            currentMonth.setHours(0, 0, 0, 0);
            const monthlyViews = await ctx.prisma.postView.count({
                where: {
                    post: { authorId: ctx.user.id },
                    viewedAt: { gte: currentMonth }
                }
            });

            // 総いいね数を取得（PostLikeテーブルから集計）
            const totalLikes = await ctx.prisma.postLike.count({
                where: {
                    post: { authorId: ctx.user.id }
                }
            });

            // 総収益を取得（実際の決済データから計算）
            const totalEarnings = await ctx.prisma.payment.aggregate({
                where: {
                    recipientId: ctx.user.id,
                    status: 'COMPLETED'
                },
                _sum: {
                    recipientAmount: true
                }
            }).then(result => result._sum.recipientAmount || 0);

            // 保留中の決済数を取得
            const pendingPayments = await ctx.prisma.payment.count({
                where: {
                    recipientId: ctx.user.id,
                    status: 'PENDING'
                }
            });

            return {
                totalPosts,
                monthlyViews,
                totalLikes,
                totalEarnings,
                pendingPayments
            };
        }),
});

// Categories router - カテゴリ管理
const categoriesRouter = router({
    // カテゴリ一覧取得
    list: procedure
        .query(async ({ ctx }) => {
            const categories = await ctx.prisma.category.findMany({
                where: { isActive: true },
                orderBy: { displayOrder: 'asc' },
                select: {
                    id: true,
                    name: true,
                    description: true,
                    displayOrder: true,
                    isActive: true,
                    _count: {
                        select: { posts: true }
                    }
                }
            });

            return {
                categories: categories.map(cat => ({
                    id: cat.id,
                    name: cat.name,
                    description: cat.description,
                    displayOrder: cat.displayOrder,
                    isActive: cat.isActive,
                    postCount: cat._count.posts
                }))
            };
        }),

    // カテゴリ作成（管理者のみ）
    create: procedure
        .input(z.object({
            name: z.string().min(1).max(50),
            description: z.string().min(1).max(200).optional(),
            displayOrder: z.number().min(0).optional(),
        }))
        .mutation(async ({ input, ctx }) => {
            if (!ctx.user) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'ログインが必要です',
                })
            }

            // 管理者権限チェック
            if (ctx.user.role !== 'ADMIN') {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: '管理者権限が必要です',
                })
            }

            const category = await ctx.prisma.category.create({
                data: {
                    name: input.name,
                    description: input.description || '',
                    displayOrder: input.displayOrder || 0,
                    isActive: true,
                },
            });

            logger.info('Category created', { categoryId: category.id, name: category.name });
            return category;
        }),

    // カテゴリ更新（管理者のみ）
    update: procedure
        .input(z.object({
            id: z.string(),
            name: z.string().min(1).max(50).optional(),
            description: z.string().min(1).max(200).optional(),
            displayOrder: z.number().min(0).optional(),
            isActive: z.boolean().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
            if (!ctx.user) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'ログインが必要です',
                })
            }

            // 管理者権限チェック
            if (ctx.user.role !== 'ADMIN') {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: '管理者権限が必要です',
                })
            }

            const updateData: any = {};
            if (input.name !== undefined) updateData.name = input.name;
            if (input.description !== undefined) updateData.description = input.description;
            if (input.displayOrder !== undefined) updateData.displayOrder = input.displayOrder;
            if (input.isActive !== undefined) updateData.isActive = input.isActive;

            const category = await ctx.prisma.category.update({
                where: { id: input.id },
                data: updateData,
            });

            logger.info('Category updated', { categoryId: category.id, name: category.name });
            return category;
        }),

    // カテゴリ削除（管理者のみ）
    delete: procedure
        .input(z.string())
        .mutation(async ({ input, ctx }) => {
            if (!ctx.user) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'ログインが必要です',
                })
            }

            // 管理者権限チェック
            if (ctx.user.role !== 'ADMIN') {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: '管理者権限が必要です',
                })
            }

            // カテゴリに関連する投稿があるかチェック
            const postCount = await ctx.prisma.post.count({
                where: { categoryId: input }
            });

            if (postCount > 0) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: `このカテゴリには${postCount}件の投稿が関連付けられているため削除できません`,
                })
            }

            await ctx.prisma.category.delete({
                where: { id: input }
            });

            logger.info('Category deleted', { categoryId: input });
            return { success: true };
        }),
});

// NGワード管理ルーター
const ngWordsRouter = router({
    // 一覧取得
    list: procedure
        .input(z.object({ onlyActive: z.boolean().optional() }).optional())
        .query(async ({ input, ctx }) => {
            const onlyActive = input?.onlyActive ?? true;
            const ngWords = await ctx.prisma.ngWord.findMany({
                where: onlyActive ? { isActive: true } : {},
                orderBy: { word: 'asc' },
            });
            return ngWords;
        }),
    // 追加（管理者のみ）
    add: procedure
        .input(z.object({ word: z.string().min(1).max(100), category: z.string().max(50).optional() }))
        .mutation(async ({ input, ctx }) => {
            if (!ctx.user || ctx.user.role !== 'ADMIN') {
                throw new TRPCError({ code: 'FORBIDDEN', message: '管理者権限が必要です' });
            }
            const ngWord = await ctx.prisma.ngWord.create({
                data: { word: input.word, category: input.category, isActive: true },
            });
            return ngWord;
        }),
    // 削除（管理者のみ）
    delete: procedure
        .input(z.string())
        .mutation(async ({ input, ctx }) => {
            if (!ctx.user || ctx.user.role !== 'ADMIN') {
                throw new TRPCError({ code: 'FORBIDDEN', message: '管理者権限が必要です' });
            }
            await ctx.prisma.ngWord.delete({ where: { id: input } });
            return { success: true };
        }),
    // 更新（管理者のみ）
    update: procedure
        .input(z.object({ id: z.string(), word: z.string().min(1).max(100).optional(), category: z.string().max(50).optional(), isActive: z.boolean().optional() }))
        .mutation(async ({ input, ctx }) => {
            if (!ctx.user || ctx.user.role !== 'ADMIN') {
                throw new TRPCError({ code: 'FORBIDDEN', message: '管理者権限が必要です' });
            }
            const updateData: any = {};
            if (input.word !== undefined) updateData.word = input.word;
            if (input.category !== undefined) updateData.category = input.category;
            if (input.isActive !== undefined) updateData.isActive = input.isActive;
            const ngWord = await ctx.prisma.ngWord.update({ where: { id: input.id }, data: updateData });
            return ngWord;
        }),
});

// メール設定管理ルーター
const emailConfigRouter = router({
    // メール設定一覧取得
    listConfigs: procedure
        .query(async ({ ctx }) => {
            if (!ctx.user || ctx.user.role !== 'ADMIN') {
                throw new TRPCError({ code: 'FORBIDDEN', message: '管理者権限が必要です' });
            }

            const configs = await ctx.prisma.emailConfig.findMany({
                orderBy: { isDefault: 'desc', name: 'asc' },
            });
            return configs;
        }),

    // メール設定作成
    createConfig: procedure
        .input(z.object({
            name: z.string().min(1).max(100),
            description: z.string().max(200).optional(),
            host: z.string().min(1).max(255),
            port: z.number().min(1).max(65535),
            secure: z.boolean(),
            username: z.string().min(1).max(255),
            password: z.string().min(1).max(255),
            fromEmail: z.string().email().max(255),
            fromName: z.string().max(100).optional(),
            isDefault: z.boolean().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
            if (!ctx.user || ctx.user.role !== 'ADMIN') {
                throw new TRPCError({ code: 'FORBIDDEN', message: '管理者権限が必要です' });
            }

            // デフォルト設定の場合、他の設定をデフォルトから外す
            if (input.isDefault) {
                await ctx.prisma.emailConfig.updateMany({
                    where: { isDefault: true },
                    data: { isDefault: false },
                });
            }

            const config = await ctx.prisma.emailConfig.create({
                data: input,
            });

            logger.info('Email config created', { configId: config.id, name: config.name });
            return config;
        }),

    // メール設定更新
    updateConfig: procedure
        .input(z.object({
            id: z.string(),
            name: z.string().min(1).max(100).optional(),
            description: z.string().max(200).optional(),
            host: z.string().min(1).max(255).optional(),
            port: z.number().min(1).max(65535).optional(),
            secure: z.boolean().optional(),
            username: z.string().min(1).max(255).optional(),
            password: z.string().min(1).max(255).optional(),
            fromEmail: z.string().email().max(255).optional(),
            fromName: z.string().max(100).optional(),
            isActive: z.boolean().optional(),
            isDefault: z.boolean().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
            if (!ctx.user || ctx.user.role !== 'ADMIN') {
                throw new TRPCError({ code: 'FORBIDDEN', message: '管理者権限が必要です' });
            }

            const { id, ...updateData } = input;

            // デフォルト設定の場合、他の設定をデフォルトから外す
            if (updateData.isDefault) {
                await ctx.prisma.emailConfig.updateMany({
                    where: { isDefault: true, id: { not: id } },
                    data: { isDefault: false },
                });
            }

            const config = await ctx.prisma.emailConfig.update({
                where: { id },
                data: updateData,
            });

            logger.info('Email config updated', { configId: config.id, name: config.name });
            return config;
        }),

    // メール設定削除
    deleteConfig: procedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ input, ctx }) => {
            if (!ctx.user || ctx.user.role !== 'ADMIN') {
                throw new TRPCError({ code: 'FORBIDDEN', message: '管理者権限が必要です' });
            }

            const config = await ctx.prisma.emailConfig.delete({
                where: { id: input.id },
            });

            logger.info('Email config deleted', { configId: config.id, name: config.name });
            return { success: true };
        }),

    // メールテンプレート一覧取得
    listTemplates: procedure
        .query(async ({ ctx }) => {
            if (!ctx.user || ctx.user.role !== 'ADMIN') {
                throw new TRPCError({ code: 'FORBIDDEN', message: '管理者権限が必要です' });
            }

            const templates = await ctx.prisma.emailTemplate.findMany({
                orderBy: { category: 'asc', name: 'asc' },
            });
            return templates;
        }),

    // メールテンプレート作成
    createTemplate: procedure
        .input(z.object({
            name: z.string().min(1).max(100),
            description: z.string().max(200).optional(),
            subject: z.string().min(1).max(200),
            htmlBody: z.string().min(1),
            textBody: z.string().optional(),
            category: z.string().min(1).max(50),
        }))
        .mutation(async ({ input, ctx }) => {
            if (!ctx.user || ctx.user.role !== 'ADMIN') {
                throw new TRPCError({ code: 'FORBIDDEN', message: '管理者権限が必要です' });
            }

            const template = await ctx.prisma.emailTemplate.create({
                data: input,
            });

            logger.info('Email template created', { templateId: template.id, name: template.name });
            return template;
        }),

    // メールテンプレート更新
    updateTemplate: procedure
        .input(z.object({
            id: z.string(),
            name: z.string().min(1).max(100).optional(),
            description: z.string().max(200).optional(),
            subject: z.string().min(1).max(200).optional(),
            htmlBody: z.string().min(1).optional(),
            textBody: z.string().optional(),
            category: z.string().min(1).max(50).optional(),
            isActive: z.boolean().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
            if (!ctx.user || ctx.user.role !== 'ADMIN') {
                throw new TRPCError({ code: 'FORBIDDEN', message: '管理者権限が必要です' });
            }

            const { id, ...updateData } = input;

            const template = await ctx.prisma.emailTemplate.update({
                where: { id },
                data: updateData,
            });

            logger.info('Email template updated', { templateId: template.id, name: template.name });
            return template;
        }),

    // メールテンプレート削除
    deleteTemplate: procedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ input, ctx }) => {
            if (!ctx.user || ctx.user.role !== 'ADMIN') {
                throw new TRPCError({ code: 'FORBIDDEN', message: '管理者権限が必要です' });
            }

            const template = await ctx.prisma.emailTemplate.delete({
                where: { id: input.id },
            });

            logger.info('Email template deleted', { templateId: template.id, name: template.name });
            return { success: true };
        }),

    // メール設定テスト送信
    testEmail: procedure
        .input(z.object({
            configId: z.string(),
            toEmail: z.string().email(),
            subject: z.string().min(1).max(200),
            body: z.string().min(1),
        }))
        .mutation(async ({ input, ctx }) => {
            if (!ctx.user || ctx.user.role !== 'ADMIN') {
                throw new TRPCError({ code: 'FORBIDDEN', message: '管理者権限が必要です' });
            }

            const config = await ctx.prisma.emailConfig.findUnique({
                where: { id: input.configId, isActive: true },
            });

            if (!config) {
                throw new TRPCError({ code: 'NOT_FOUND', message: 'メール設定が見つかりません' });
            }

            try {
                // テスト用のトランスポーターを作成
                const testTransporter = nodemailer.createTransport({
                    host: config.host,
                    port: config.port,
                    secure: config.secure,
                    auth: {
                        user: config.username,
                        pass: config.password,
                    },
                });

                const mailOptions = {
                    from: `"${config.fromName || 'OneShot Platform'}" <${config.fromEmail}>`,
                    to: input.toEmail,
                    subject: input.subject,
                    html: input.body,
                    text: input.body.replace(/<[^>]*>/g, ''),
                };

                const info = await testTransporter.sendMail(mailOptions);

                logger.info('Test email sent successfully', {
                    configId: config.id,
                    messageId: info.messageId,
                    to: input.toEmail
                });

                return { success: true, messageId: info.messageId };
            } catch (error) {
                logger.error('Test email failed', {
                    configId: config.id,
                    error,
                    to: input.toEmail
                });
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'テストメール送信に失敗しました',
                    cause: error
                });
            }
        }),
});

// 通知設定管理ルーター
const notificationSettingsRouter = router({
    // 通知設定取得
    get: procedure
        .query(async ({ ctx }) => {
            if (!ctx.user) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'ログインが必要です',
                });
            }

            let settings = await ctx.prisma.notificationSettings.findUnique({
                where: { userId: ctx.user.id },
            });

            // 設定が存在しない場合はデフォルト設定を作成
            if (!settings) {
                if (!ctx.user.id) {
                    throw new TRPCError({
                        code: 'UNAUTHORIZED',
                        message: 'ユーザーIDが取得できません',
                    });
                }
                settings = await ctx.prisma.notificationSettings.create({
                    data: {
                        userId: ctx.user.id,
                        // デフォルト値はスキーマで設定済み
                    },
                });
            }

            return settings;
        }),

    // 通知設定更新
    update: procedure
        .input(z.object({
            emailEnabled: z.boolean().optional(),
            pushEnabled: z.boolean().optional(),
            inAppEnabled: z.boolean().optional(),
            paymentNotifications: z.boolean().optional(),
            postNotifications: z.boolean().optional(),
            messageNotifications: z.boolean().optional(),
            systemNotifications: z.boolean().optional(),
            payoutNotifications: z.boolean().optional(),
            emailFrequency: z.enum(['immediate', 'daily', 'weekly']).optional(),
            quietHoursStart: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
            quietHoursEnd: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
        }))
        .mutation(async ({ input, ctx }) => {
            if (!ctx.user) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'ログインが必要です',
                });
            }

            const settings = await ctx.prisma.notificationSettings.upsert({
                where: { userId: ctx.user.id },
                update: input,
                create: {
                    userId: ctx.user.id!,
                    ...input,
                },
            });

            logger.info('Notification settings updated', {
                userId: ctx.user.id,
                settings: input
            });

            return settings;
        }),

    // 通知設定リセット（デフォルト値に戻す）
    reset: procedure
        .mutation(async ({ ctx }) => {
            if (!ctx.user) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'ログインが必要です',
                });
            }

            const settings = await ctx.prisma.notificationSettings.update({
                where: { userId: ctx.user.id! },
                data: {
                    emailEnabled: true,
                    pushEnabled: true,
                    inAppEnabled: true,
                    paymentNotifications: true,
                    postNotifications: true,
                    messageNotifications: true,
                    systemNotifications: true,
                    payoutNotifications: true,
                    emailFrequency: 'immediate',
                    quietHoursStart: null,
                    quietHoursEnd: null,
                },
            });

            logger.info('Notification settings reset to default', { userId: ctx.user.id });
            return settings;
        }),
});

// プッシュ通知管理ルーター
const pushNotificationRouter = router({
    // プッシュ通知サブスクリプション登録
    subscribe: procedure
        .input(z.object({
            endpoint: z.string(),
            keys: z.object({
                p256dh: z.string(),
                auth: z.string()
            })
        }))
        .mutation(async ({ input, ctx }) => {
            if (!ctx.user) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'ログインが必要です',
                });
            }

            // 既存のサブスクリプションを削除（同じエンドポイントの場合）
            await ctx.prisma.pushSubscription.deleteMany({
                where: {
                    endpoint: input.endpoint
                }
            });

            // 新しいサブスクリプションを作成
            const subscription = await ctx.prisma.pushSubscription.create({
                data: {
                    userId: ctx.user.id!,
                    endpoint: input.endpoint,
                    p256dh: input.keys.p256dh,
                    auth: input.keys.auth,
                    userAgent: ctx.req.headers['user-agent'] || '',
                }
            });

            logger.info('Push subscription created', {
                userId: ctx.user.id,
                subscriptionId: subscription.id
            });

            return { success: true, subscriptionId: subscription.id };
        }),

    // プッシュ通知サブスクリプション削除
    unsubscribe: procedure
        .input(z.object({
            endpoint: z.string()
        }))
        .mutation(async ({ input, ctx }) => {
            if (!ctx.user) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'ログインが必要です',
                });
            }

            await ctx.prisma.pushSubscription.deleteMany({
                where: {
                    userId: ctx.user.id!,
                    endpoint: input.endpoint
                }
            });

            logger.info('Push subscription deleted', {
                userId: ctx.user.id,
                endpoint: input.endpoint
            });

            return { success: true };
        }),

    // プッシュ通知サブスクリプション一覧取得
    getSubscriptions: procedure
        .query(async ({ ctx }) => {
            if (!ctx.user) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'ログインが必要です',
                });
            }

            const subscriptions = await ctx.prisma.pushSubscription.findMany({
                where: { userId: ctx.user.id! },
                select: {
                    id: true,
                    endpoint: true,
                    createdAt: true,
                    userAgent: true
                }
            });

            return { subscriptions };
        }),
});

// 管理画面用ルーター
const adminRouter = router({
    // 全ユーザーのプッシュ通知サブスクリプション一覧
    getAllPushSubscriptions: procedure
        .query(async ({ ctx }) => {
            if (!ctx.user || ctx.user.role !== 'ADMIN') {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: '管理者権限が必要です',
                });
            }

            const subscriptions = await ctx.prisma.pushSubscription.findMany({
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            nickname: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });

            return { subscriptions };
        }),

    // プッシュ通知サブスクリプション削除（管理者）
    deletePushSubscription: procedure
        .input(z.string())
        .mutation(async ({ input, ctx }) => {
            if (!ctx.user || ctx.user.role !== 'ADMIN') {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: '管理者権限が必要です',
                });
            }

            await ctx.prisma.pushSubscription.delete({
                where: { id: input }
            });

            logger.info('Push subscription deleted by admin', {
                adminId: ctx.user.id,
                subscriptionId: input
            });

            return { success: true };
        }),

    // VAPID鍵情報取得
    getVapidInfo: procedure
        .query(async ({ ctx }) => {
            if (!ctx.user || ctx.user.role !== 'ADMIN') {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: '管理者権限が必要です',
                });
            }

            return {
                publicKey: process.env.VAPID_PUBLIC_KEY,
                isConfigured: !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
            };
        }),

    // プッシュ通知統計
    getPushNotificationStats: procedure
        .query(async ({ ctx }) => {
            if (!ctx.user || ctx.user.role !== 'ADMIN') {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: '管理者権限が必要です',
                });
            }

            const [totalSubscriptions, activeUsers] = await Promise.all([
                ctx.prisma.pushSubscription.count(),
                ctx.prisma.user.count({
                    where: {
                        pushSubscriptions: {
                            some: {}
                        }
                    }
                })
            ]);

            return {
                totalSubscriptions,
                activeUsers,
                isVapidConfigured: !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
            };
        }),
});

// JWTシークレット必須チェック
if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
    throw new Error('JWT_SECRETおよびJWT_REFRESH_SECRET環境変数が未設定です。セキュリティのため必ず設定してください。');
}

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

// Auth router - 認証管理
const authRouter = router({
    // ログイン
    login: procedure
        .input(z.object({
            email: z.string().email(),
            password: z.string().min(8),
        }))
        .mutation(async ({ input, ctx }) => {
            // ユーザー認証
            const user = await ctx.prisma.user.findUnique({
                where: { email: input.email }
            });

            if (!user) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'メールアドレスまたはパスワードが正しくありません',
                });
            }

            // パスワード検証
            const isValidPassword = await bcrypt.compare(input.password, user.password);
            if (!isValidPassword) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'メールアドレスまたはパスワードが正しくありません',
                });
            }

            // JWTトークン生成
            const token = jwt.sign(
                {
                    userId: user.id,
                    email: user.email,
                    role: user.role,
                },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            // リフレッシュトークン生成
            const refreshToken = jwt.sign(
                { userId: user.id },
                JWT_REFRESH_SECRET,
                { expiresIn: '7d' }
            );

            // セッション情報をDBに保存
            await ctx.prisma.userSession.create({
                data: {
                    userId: user.id,
                    refreshToken: refreshToken,
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7日後
                    userAgent: ctx.req.headers['user-agent'] || '',
                    ipAddress: ctx.req.ip || '',
                }
            });

            // HttpOnly Cookieにトークンを設定
            ctx.res.cookie('access_token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 24 * 60 * 60 * 1000 // 24時間
            });

            ctx.res.cookie('refresh_token', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7日間
            });

            logger.info('User logged in', { userId: user.id, email: user.email });

            return {
                user: {
                    id: user.id,
                    email: user.email,
                    nickname: user.nickname,
                    role: user.role,
                },
                success: true,
            };
        }),

    // ログアウト
    logout: procedure
        .mutation(async ({ ctx }) => {
            if (!ctx.user) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'ログインが必要です',
                });
            }

            // セッションを無効化
            await ctx.prisma.userSession.updateMany({
                where: { userId: ctx.user.id },
                data: { isValid: false }
            });

            // Cookieをクリア
            ctx.res.cookie('access_token', '', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 0
            });

            ctx.res.cookie('refresh_token', '', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 0
            });

            logger.info('User logged out', { userId: ctx.user.id });

            return { success: true };
        }),

    // トークンリフレッシュ
    refresh: procedure
        .input(z.object({
            refreshToken: z.string(),
        }))
        .mutation(async ({ input, ctx }) => {
            try {
                // リフレッシュトークン検証
                const decoded = jwt.verify(
                    input.refreshToken,
                    JWT_REFRESH_SECRET
                ) as { userId: string };

                // セッションの有効性確認
                const session = await ctx.prisma.userSession.findFirst({
                    where: {
                        userId: decoded.userId,
                        refreshToken: input.refreshToken,
                        isValid: true,
                        expiresAt: { gt: new Date() }
                    },
                    include: { user: true }
                });

                if (!session) {
                    throw new TRPCError({
                        code: 'UNAUTHORIZED',
                        message: '無効なリフレッシュトークンです',
                    });
                }

                // 新しいアクセストークン生成
                const newToken = jwt.sign(
                    {
                        userId: session.user.id,
                        email: session.user.email,
                        role: session.user.role,
                    },
                    JWT_SECRET,
                    { expiresIn: '24h' }
                );

                return {
                    token: newToken,
                    user: {
                        id: session.user.id,
                        email: session.user.email,
                        nickname: session.user.nickname,
                        role: session.user.role,
                    }
                };
            } catch (error) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'トークンの更新に失敗しました',
                });
            }
        }),

    // 認証状態確認
    me: procedure
        .query(async ({ ctx }) => {
            if (!ctx.user) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'ログインが必要です',
                });
            }

            const user = await ctx.prisma.user.findUnique({
                where: { id: ctx.user.id },
                select: {
                    id: true,
                    email: true,
                    nickname: true,
                    role: true,
                    createdAt: true,
                }
            });

            return user;
        }),
});

// Main app router
export const appRouter = router({
    auth: authRouter,
    posts: postsRouter,
    reports: reportsRouter,
    userSettings: userSettingsRouter,
    payment: paymentRouter,
    notifications: notificationRouter,
    dashboard: dashboardRouter,
    categories: categoriesRouter, // 追加
    ngWords: ngWordsRouter, // 追加
    emailConfig: emailConfigRouter, // 追加
    notificationSettings: notificationSettingsRouter, // 追加
    pushNotifications: pushNotificationRouter, // 追加
    admin: adminRouter, // 追加
})

export type AppRouter = typeof appRouter
