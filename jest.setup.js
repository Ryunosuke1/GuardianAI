// Jest設定ファイル
import 'react-native-gesture-handler/jestSetup';

// モックの設定
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// SVGモック
jest.mock('react-native-svg', () => {
  const React = require('react');
  return {
    SvgXml: props => React.createElement('SvgXml', props, props.children),
    Svg: props => React.createElement('Svg', props, props.children),
    Path: props => React.createElement('Path', props, props.children),
    Circle: props => React.createElement('Circle', props, props.children),
    Rect: props => React.createElement('Rect', props, props.children),
    G: props => React.createElement('G', props, props.children),
  };
});

// MetaMask SDKモック
jest.mock('@metamask/sdk', () => {
  return {
    MetaMaskSDK: jest.fn().mockImplementation(() => {
      return {
        connect: jest.fn().mockResolvedValue(true),
        disconnect: jest.fn().mockResolvedValue(true),
        getProvider: jest.fn().mockReturnValue({
          request: jest.fn().mockImplementation(async ({ method }) => {
            if (method === 'eth_requestAccounts') {
              return ['0x123456789abcdef'];
            }
            if (method === 'eth_chainId') {
              return '0x1';
            }
            return null;
          }),
          on: jest.fn(),
          removeListener: jest.fn(),
        }),
      };
    }),
  };
});

// AsyncStorageモック
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

// Sound モック
jest.mock('react-native-sound', () => {
  return jest.fn().mockImplementation(() => {
    return {
      play: jest.fn(),
      stop: jest.fn(),
      release: jest.fn(),
      setVolume: jest.fn(),
    };
  });
});

// OpenAI モック
jest.mock('openai', () => {
  return {
    OpenAI: jest.fn().mockImplementation(() => {
      return {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [
                {
                  message: {
                    content: JSON.stringify({
                      success: true,
                      rules: [
                        {
                          type: 'TRANSACTION_TYPE',
                          operator: 'EQUALS',
                          value: 'swap'
                        }
                      ],
                      explanation: 'テスト解析結果'
                    })
                  }
                }
              ]
            })
          }
        }
      };
    })
  };
});

// グローバル変数の設定
global.__reanimatedWorkletInit = jest.fn();
global.window = {};
global.window.ethereum = {
  isMetaMask: true,
  request: jest.fn().mockImplementation(async ({ method }) => {
    if (method === 'eth_requestAccounts') {
      return ['0x123456789abcdef'];
    }
    if (method === 'eth_chainId') {
      return '0x1';
    }
    return null;
  }),
  on: jest.fn(),
  removeListener: jest.fn(),
};

// コンソールエラーの抑制（必要に応じて）
console.error = jest.fn();
console.warn = jest.fn();
