import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import languageModelService from '../../src/services/ai/LanguageModelService';
import metaMaskService from '../../src/services/metamask/MetaMaskService';

// OpenAIのモック
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

// MetaMaskServiceのモック
jest.mock('../../src/services/metamask/MetaMaskService', () => {
  return {
    isWalletConnected: jest.fn().mockReturnValue(true),
    secureStore: jest.fn().mockResolvedValue(true),
    secureRetrieve: jest.fn().mockResolvedValue('test-api-key')
  };
});

describe('LanguageModelService', () => {
  beforeEach(() => {
    // 各テスト前にサービスをリセット
    jest.clearAllMocks();
  });

  it('APIキーを設定して初期化できること', async () => {
    const result = await languageModelService.initialize('test-api-key');
    expect(result).toBe(true);
    expect(languageModelService.isModelInitialized()).toBe(true);
  });

  it('MetaMaskからAPIキーを取得して初期化できること', async () => {
    const result = await languageModelService.initialize();
    expect(result).toBe(true);
    expect(languageModelService.isModelInitialized()).toBe(true);
  });

  it('APIキーをMetaMaskに保存できること', async () => {
    const result = await languageModelService.saveApiKey('test-api-key');
    expect(result).toBe(true);
    expect(metaMaskService.secureStore).toHaveBeenCalledWith('openai_api_key', 'test-api-key');
  });

  it('ユーザー意図を解析できること', async () => {
    await languageModelService.initialize('test-api-key');
    
    const intentText = '今日はスワップだけしたい';
    const result = await languageModelService.analyzeUserIntent(intentText);
    
    expect(result.success).toBe(true);
    expect(result.rules).toHaveLength(1);
    expect(result.rules[0].type).toBe('TRANSACTION_TYPE');
    expect(result.rules[0].operator).toBe('EQUALS');
    expect(result.rules[0].value).toBe('swap');
  });

  it('トークンを評価できること', async () => {
    await languageModelService.initialize('test-api-key');
    
    const tokenAddress = '0xabcdef123456789';
    const tokenInfo = {
      name: 'Test Token',
      symbol: 'TEST',
      decimals: 18
    };
    
    const result = await languageModelService.evaluateToken(tokenAddress, tokenInfo);
    
    expect(result.address).toBe(tokenAddress);
    expect(result.name).toBe(tokenInfo.name);
    expect(result.symbol).toBe(tokenInfo.symbol);
  });

  it('トランザクションを説明できること', async () => {
    await languageModelService.initialize('test-api-key');
    
    const transactionData = {
      to: '0xabcdef123456789',
      value: '0x1',
      data: '0x'
    };
    
    const explanation = await languageModelService.explainTransaction(transactionData);
    expect(explanation).toBeDefined();
  });

  it('初期化されていない場合にエラーを返すこと', async () => {
    // 初期化せずに呼び出し
    const intentText = '今日はスワップだけしたい';
    const result = await languageModelService.analyzeUserIntent(intentText);
    
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
