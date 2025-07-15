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

    const [trpcClient] = useState(() => {
        const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/trpc'
        if (process.env.NODE_ENV !== 'production') {
            console.log('tRPC URL:', url)
        }
        return trpc.createClient({
            links: [
                httpBatchLink({
                    url,
                    fetch(url, options) {
                        if (process.env.NODE_ENV !== 'production') {
                            console.log('tRPC Request:', url, options)
                        }
                        return fetch(url, options).then(response => {
                            if (process.env.NODE_ENV !== 'production') {
                                console.log('tRPC Response:', response.status, response.statusText)
                            }
                            return response
                        }).catch(error => {
                            if (process.env.NODE_ENV !== 'production') {
                                console.error('tRPC Request Error:', error)
                            }
                            throw error
                        })
                    },
                }),
            ],
        })
    })

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
