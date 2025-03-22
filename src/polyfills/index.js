// ポリフィルのインポート
import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';
import '@ethersproject/shims';
import { Buffer } from 'buffer';
import 'text-encoding-utf-8';

// プラットフォーム検出
import { Platform } from 'react-native';

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

// Web プラットフォーム特有のポリフィル
if (Platform.OS === 'web') {
  // crypto ポリフィル
  global.crypto = global.crypto || require('crypto-browserify');
  
  // stream ポリフィル
  if (!global.stream) {
    global.stream = require('stream-browserify');
  }
  
  // EventEmitter ポリフィル
  if (!global.EventEmitter) {
    const events = require('events');
    global.EventEmitter = events.EventEmitter;
  }
  
  // fetch API の確認
  if (typeof global.fetch === 'undefined') {
    console.warn('fetch is not defined. Web platform may have issues with API calls.');
  }
}

// エクスポート
export default {
  isPolyfilled: true,
};
