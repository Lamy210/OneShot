'use client'

import React, { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink } from '@trpc/client'
import { UserProvider } from '@auth0/nextjs-auth0/client'
import { trpc } from '@/lib/trpc'

export function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 5 * 60 * 1000, // 5分
                retry: 3,
            },
        },
    }))

    const [trpcClient] = useState(() => trpc.createClient({
        links: [
            httpBatchLink({
                url: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/trpc',
            }),
        ],
    }))

    return (
        <UserProvider>
            <trpc.Provider client={trpcClient} queryClient={queryClient}>
                <QueryClientProvider client={queryClient}>
                    {children}
                </QueryClientProvider>
            </trpc.Provider>
        </UserProvider>
    )
}
