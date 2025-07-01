const { containsNGWord, detectNGWords } = require('./packages/utils/dist/index.js');

console.log('=== OneShotプラットフォーム NGワード判定テスト ===');
console.log('✅ 正常テキスト:', containsNGWord('素晴らしいWebサイトを作成します'));
console.log('⚠️  スパム含む:', containsNGWord('これはスパムです'));
console.log('🔍 検出ワード:', detectNGWords('スパムと詐欺を含むテスト'));
console.log('=== テスト完了 ===');
