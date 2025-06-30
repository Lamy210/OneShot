import { createTRPCNext } from '@trpc/next'
import { httpBatchLink } from '@trpc/client'
import type { AppRouter } from '@oneshot/backend/routes'

export const trpc = createTRPCNext<AppRouter>({
    config() {
        return {
            links: [
                httpBatchLink({
                    url: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/trpc',
                }),
            ],
        }
    },
    ssr: false,
})
