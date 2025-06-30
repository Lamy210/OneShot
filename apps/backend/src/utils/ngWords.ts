// NGワード判定ロジック
const ngWords = [
    // 一般的なNGワード
    'スパム',
    'spam',
    '詐欺',
    'fraud',
    '違法',
    'illegal',
    '犯罪',
    'crime',

    // 差別的表現
    '差別',
    'discrimination',

    // 暴力的表現
    '暴力',
    'violence',
    '殺人',
    'murder',

    // アダルト関連
    'アダルト',
    'adult',
    'エロ',
    'ero',

    // その他の問題のある表現
    '薬物',
    'drug',
    'ギャンブル',
    'gambling',
] as const

/**
 * テキストにNGワードが含まれているかチェック
 */
export function containsNGWord(text: string): boolean {
    const lowerText = text.toLowerCase()
    return ngWords.some(word => lowerText.includes(word.toLowerCase()))
}

/**
 * NGワードを検出して配列で返す
 */
export function detectNGWords(text: string): string[] {
    const lowerText = text.toLowerCase()
    return ngWords.filter(word => lowerText.includes(word.toLowerCase()))
}
