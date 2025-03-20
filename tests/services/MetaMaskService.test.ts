import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import metaMaskService from '../../src/services/metamask/MetaMaskService';

// MetaMaskSDKのモック
jest.mock('@metamask/sdk', () => {
  return {
    MetaMaskSDK: jest.fn().mockImplementation(() => {
      return {
        connect: jest.fn().mockResolvedValue({ accounts: ['0x123456789abcdef'] }),
        disconnect: jest.fn().mockResolvedValue(true),
        getProvider: jest.fn().mockReturnValue({
          request: jest.fn().mockImplementation((params) => {
            if (params.method === 'eth_requestAccounts') {
              return Promise.resolve(['0x123456789abcdef']);
            }
            if (params.method === 'eth_sendTransaction') {
              return Promise.resolve('0xabcdef123456789');
            }
            if (params.method === 'personal_sign') {
              return Promise.resolve('0xsignature');
            }
            return Promise.reject(new Error('未実装のメソッド'));
          }),
          on: jest.fn(),
          removeListener: jest.fn()
        })
      };
    })
  };
});

describe('MetaMaskService', () => {
  beforeEach(() => {
    // 各テスト前にサービスをリセット
    metaMaskService.disconnect();
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('SDKを初期化できること', async () => {
    const result = await metaMaskService.initialize();
    expect(result).toBe(true);
  });

  it('ウォレットに接続できること', async () => {
    await metaMaskService.initialize();
    const result = await metaMaskService.connect();
    expect(result).toBe(true);
    expect(metaMaskService.isWalletConnected()).toBe(true);
    expect(metaMaskService.getAccount()).toBe('0x123456789abcdef');
  });

  it('ウォレットから切断できること', async () => {
    await metaMaskService.initialize();
    await metaMaskService.connect();
    const result = await metaMaskService.disconnect();
    expect(result).toBe(true);
    expect(metaMaskService.isWalletConnected()).toBe(false);
  });

  it('トランザクションを送信できること', async () => {
    await metaMaskService.initialize();
    await metaMaskService.connect();
    
    const tx = {
      to: '0xabcdef123456789',
      value: '0x1',
      data: '0x'
    };
    
    const txHash = await metaMaskService.sendTransaction(tx);
    expect(txHash).toBe('0xabcdef123456789');
  });

  it('メッセージに署名できること', async () => {
    await metaMaskService.initialize();
    await metaMaskService.connect();
    
    const message = 'テストメッセージ';
    const signature = await metaMaskService.signMessage(message);
    expect(signature).toBe('0xsignature');
  });

  it('セキュアストレージにデータを保存できること', async () => {
    await metaMaskService.initialize();
    await metaMaskService.connect();
    
    const key = 'testKey';
    const value = 'testValue';
    
    const result = await metaMaskService.secureStore(key, value);
    expect(result).toBe(true);
  });

  it('セキュアストレージからデータを取得できること', async () => {
    await metaMaskService.initialize();
    await metaMaskService.connect();
    
    const key = 'testKey';
    const value = 'testValue';
    
    await metaMaskService.secureStore(key, value);
    const retrievedValue = await metaMaskService.secureRetrieve(key);
    expect(retrievedValue).toBe(value);
  });

  it('未接続状態でトランザクション送信に失敗すること', async () => {
    await metaMaskService.initialize();
    
    const tx = {
      to: '0xabcdef123456789',
      value: '0x1',
      data: '0x'
    };
    
    await expect(metaMaskService.sendTransaction(tx)).rejects.toThrow();
  });
});
