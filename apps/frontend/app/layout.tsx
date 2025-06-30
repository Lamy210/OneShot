import React from 'react'
import './globals.css'
import { Inter } from 'next/font/google'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
    title: 'OneShot - 一発完結依頼プラットフォーム',
    description: '技術者とクリエイターのための一発完結依頼マッチングプラットフォーム',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="ja" className={inter.className}>
            <body className="min-h-screen bg-gray-50">
                <Providers>
                    {children}
                </Providers>
            </body>
        </html>
    )
}
