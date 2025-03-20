import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import transactionMonitorService, { TransactionType } from '../../src/services/transaction/TransactionMonitorService';
import ruleProcessorService from '../../src/services/transaction/RuleProcessorService';
import transactionApprovalService from '../../src/services/transaction/TransactionApprovalService';

// MetaMaskServiceのモック
jest.mock('../../src/services/metamask/MetaMaskService', () => {
  return {
    isWalletConnected: jest.fn().mockReturnValue(true),
    getAccount: jest.fn().mockReturnValue('0x123456789abcdef'),
    getProvider: jest.fn().mockReturnValue({
      on: jest.fn(),
      removeListener: jest.fn(),
      request: jest.fn()
    }),
    sendTransaction: jest.fn().mockResolvedValue('0xtxhash')
  };
});

// RuleProcessorServiceのモック
jest.mock('../../src/services/transaction/RuleProcessorService', () => {
  return {
    evaluateTransaction: jest.fn().mockReturnValue({
      isApproved: true,
      matchedRules: [],
      explanation: 'テスト評価'
    }),
    createRuleSet: jest.fn().mockReturnValue({
      id: 'ruleset1',
      name: 'テストルールセット',
      description: 'テスト用',
      rules: []
    }),
    getActiveRuleSet: jest.fn().mockReturnValue({
      id: 'ruleset1',
      name: 'テストルールセット',
      description: 'テスト用',
      rules: []
    }),
    setActiveRuleSet: jest.fn(),
    getRuleSet: jest.fn().mockReturnValue({
      id: 'ruleset1',
      name: 'テストルールセット',
      description: 'テスト用',
      rules: []
    }),
    addRule: jest.fn()
  };
});

describe('TransactionMonitorService', () => {
  beforeEach(() => {
    // 各テスト前にサービスをリセット
    transactionMonitorService.stopMonitoring();
    jest.clearAllMocks();
  });

  it('サービスを初期化できること', async () => {
    const result = await transactionMonitorService.initialize();
    expect(result).toBe(true);
  });

  it('トランザクション監視を開始できること', () => {
    transactionMonitorService.startMonitoring();
    expect(transactionMonitorService.isMonitoring()).toBe(true);
  });

  it('トランザクション監視を停止できること', () => {
    transactionMonitorService.startMonitoring();
    transactionMonitorService.stopMonitoring();
    expect(transactionMonitorService.isMonitoring()).toBe(false);
  });

  it('トランザクションタイプを正しく判別できること', () => {
    // 送金トランザクション
    let tx = {
      to: '0xabcdef123456789',
      value: '0x1',
      data: '0x'
    };
    expect(transactionMonitorService.determineTransactionType(tx)).toBe(TransactionType.TRANSFER);

    // スワップトランザクション
    tx = {
      to: '0xabcdef123456789',
      value: '0x0',
      data: '0xswap123456'
    };
    expect(transactionMonitorService.determineTransactionType(tx)).toBe(TransactionType.CONTRACT_INTERACTION);

    // 承認トランザクション
    tx = {
      to: '0xabcdef123456789',
      value: '0x0',
      data: '0xapprove123456'
    };
    expect(transactionMonitorService.determineTransactionType(tx)).toBe(TransactionType.CONTRACT_INTERACTION);
  });

  it('トランザクションイベントを処理できること', () => {
    // イベントリスナーのモック
    const mockListener = jest.fn();
    transactionMonitorService.on('pending_transaction', mockListener);

    // トランザクションイベントをシミュレート
    const tx = {
      hash: '0xtxhash',
      to: '0xabcdef123456789',
      from: '0x123456789abcdef',
      value: '0x1',
      data: '0x',
      gas: '0x5208',
      gasPrice: '0x4a817c800'
    };

    // トランザクション処理をテスト
    transactionMonitorService.processPendingTransaction(tx);
    
    // リスナーが呼び出されたことを確認
    expect(mockListener).toHaveBeenCalled();
  });
});

describe('TransactionApprovalService', () => {
  beforeEach(() => {
    // 各テスト前にサービスをリセット
    jest.clearAllMocks();
    transactionApprovalService.initialize();
  });

  it('サービスを初期化できること', () => {
    const result = transactionApprovalService.initialize();
    expect(result).toBe(true);
  });

  it('承認リクエストを作成できること', async () => {
    const tx = {
      hash: '0xtxhash',
      to: '0xabcdef123456789',
      from: '0x123456789abcdef',
      value: '0x1',
      data: '0x',
      gas: '0x5208',
      gasPrice: '0x4a817c800',
      type: TransactionType.TRANSFER
    };

    const request = await transactionApprovalService.requestApproval(tx);
    expect(request).toBeDefined();
    expect(request.transaction).toBe(tx);
  });

  it('トランザクションを承認できること', async () => {
    const tx = {
      hash: '0xtxhash',
      to: '0xabcdef123456789',
      from: '0x123456789abcdef',
      value: '0x1',
      data: '0x',
      gas: '0x5208',
      gasPrice: '0x4a817c800',
      type: TransactionType.TRANSFER
    };

    const request = await transactionApprovalService.requestApproval(tx);
    const result = await transactionApprovalService.approveTransaction(request.id);
    expect(result).toBe(true);
  });

  it('トランザクションを拒否できること', async () => {
    const tx = {
      hash: '0xtxhash',
      to: '0xabcdef123456789',
      from: '0x123456789abcdef',
      value: '0x1',
      data: '0x',
      gas: '0x5208',
      gasPrice: '0x4a817c800',
      type: TransactionType.TRANSFER
    };

    const request = await transactionApprovalService.requestApproval(tx);
    const result = transactionApprovalService.rejectTransaction(request.id);
    expect(result).toBe(true);
  });

  it('自動承認を設定できること', () => {
    transactionApprovalService.setAutoApprove(true);
    // 自動承認が有効になっていることを確認するテストを追加
  });

  it('リクエストタイムアウトを設定できること', () => {
    const timeout = 10000;
    transactionApprovalService.setRequestTimeout(timeout);
    // タイムアウトが設定されていることを確認するテストを追加
  });
});
