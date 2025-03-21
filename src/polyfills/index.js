// ポリフィルのインポート
import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';
import '@ethersproject/shims';
import { Buffer } from 'buffer';
import 'text-encoding-utf-8';

// グローバルオブジェクトの設定
if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer;
}

// URLポリフィルの確認
if (typeof global.URL === 'undefined') {
  console.warn('URL is not defined after polyfill import. Check polyfill configuration.');
}

// その他のポリフィル設定
if (typeof process === 'undefined') {
  global.process = require('process');
}

// エクスポート
export default {
  isPolyfilled: true,
};
