"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ngWords = void 0;
exports.containsNGWord = containsNGWord;
exports.detectNGWords = detectNGWords;
exports.maskNGWords = maskNGWords;
exports.ngWords = [
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
];
/**
 * テキストにNGワードが含まれているかチェック
 */
function containsNGWord(text) {
    const lowerText = text.toLowerCase();
    return exports.ngWords.some(word => lowerText.includes(word.toLowerCase()));
}
/**
 * NGワードを検出して配列で返す
 */
function detectNGWords(text) {
    const lowerText = text.toLowerCase();
    return exports.ngWords.filter(word => lowerText.includes(word.toLowerCase()));
}
/**
 * NGワードを除去またはマスクする
 */
function maskNGWords(text, maskChar = '*') {
    let maskedText = text;
    exports.ngWords.forEach(word => {
        const regex = new RegExp(word, 'gi');
        maskedText = maskedText.replace(regex, maskChar.repeat(word.length));
    });
    return maskedText;
}
//# sourceMappingURL=ngWords.js.map