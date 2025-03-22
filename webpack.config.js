const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const path = require('path');

module.exports = async function(env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);
  
  // ポリフィルの設定
  config.resolve.fallback = {
    ...config.resolve.fallback,
    crypto: require.resolve('crypto-browserify'),
    stream: require.resolve('stream-browserify'),
    buffer: require.resolve('buffer/'),
    process: require.resolve('process/browser'),
    util: require.resolve('util/'),
    events: require.resolve('events/'),
    url: require.resolve('url/'),
  };

  // プロバイダインジェクション
  config.plugins.push(
    new (require('webpack').ProvidePlugin)({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
    })
  );

  // エントリーポイントの設定
  config.entry = {
    app: [
      require.resolve('react-native-web/dist/cjs/modules/hydrate'),
      path.resolve(__dirname, 'App.tsx'),
    ],
  };

  // React Native Web の設定
  config.resolve.alias = {
    ...config.resolve.alias,
    'react-native$': 'react-native-web',
    'react-native-svg': 'react-native-svg-web',
  };

  // 拡張子の解決設定
  config.resolve.extensions = [
    '.web.js',
    '.web.jsx',
    '.web.ts',
    '.web.tsx',
    '.js',
    '.jsx',
    '.ts',
    '.tsx',
    '.json',
  ];

  return config;
};
