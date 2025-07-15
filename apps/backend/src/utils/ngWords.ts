import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * テキストにNGワードが含まれているかチェック（DB参照）
 */
export async function containsNGWord(text: string): Promise<boolean> {
    const lowerText = text.toLowerCase()
    const ngWords = await prisma.ngWord.findMany({ where: { isActive: true } })
    return ngWords.some(wordObj => lowerText.includes(wordObj.word.toLowerCase()))
}

/**
 * テキストに含まれるNGワード一覧を返す（DB参照）
 */
export async function detectNGWords(text: string): Promise<string[]> {
    const lowerText = text.toLowerCase()
    const ngWords = await prisma.ngWord.findMany({ where: { isActive: true } })
    return ngWords.filter(wordObj => lowerText.includes(wordObj.word.toLowerCase())).map(w => w.word)
}
