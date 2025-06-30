export declare const ngWords: readonly ["スパム", "spam", "詐欺", "fraud", "違法", "illegal", "犯罪", "crime", "差別", "discrimination", "暴力", "violence", "殺人", "murder", "アダルト", "adult", "エロ", "ero", "薬物", "drug", "ギャンブル", "gambling"];
/**
 * テキストにNGワードが含まれているかチェック
 */
export declare function containsNGWord(text: string): boolean;
/**
 * NGワードを検出して配列で返す
 */
export declare function detectNGWords(text: string): string[];
/**
 * NGワードを除去またはマスクする
 */
export declare function maskNGWords(text: string, maskChar?: string): string;
//# sourceMappingURL=ngWords.d.ts.map