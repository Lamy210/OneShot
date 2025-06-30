export * from './ngWords'

// その他の共通ユーティリティ
export function formatPrice(price: number): string {
    return new Intl.NumberFormat('ja-JP', {
        style: 'currency',
        currency: 'JPY',
    }).format(price)
}

export function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date)
}

export function generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
}
