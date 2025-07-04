'use client'

import React from 'react'
import { UserProvider } from '@auth0/nextjs-auth0/client'

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <UserProvider>
            {children}
        </UserProvider>
    )
}
