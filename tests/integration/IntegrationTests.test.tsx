import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { MetaMaskProvider } from '../../src/services/metamask/MetaMaskContext';
import Dashboard from '../../src/components/dashboard/Dashboard';
import TransactionMonitor from '../../src/components/transaction/TransactionMonitor';
import IntentInputComponent from '../../src/components/ai/IntentInputComponent';
import NotificationSystem from '../../src/components/alert/NotificationSystem';

// MetaMaskServiceのモック
jest.mock('../../src/services/metamask/MetaMaskService', () => {
  return {
    isWalletConnected: jest.fn().mockReturnValue(true),
    getAccount: jest.fn().mockReturnValue('0x123456789abcdef'),
    connect: jest.fn().mockResolvedValue(true),
    disconnect: jest.fn().mockResolvedValue(true),
    initialize: jest.fn().mockResolvedValue(true)
  };
});

// トランザクションサービスのモック
jest.mock('../../src/services/transaction/TransactionMonitorService', () => {
  return {
    isMonitoring: jest.fn().mockReturnValue(true),
    startMonitoring: jest.fn(),
    stopMonitoring: jest.fn(),
    on: jest.fn(),
    removeListener: jest.fn(),
    getRecentTransactions: jest.fn().mockReturnValue([
      {
        hash: '0xtxhash1',
        to: '0xabcdef123456789',
        from: '0x123456789abcdef',
        value: '0x1',
        data: '0x',
        gas: '0x5208',
        gasPrice: '0x4a817c800',
        type: 'TRANSFER',
        status: 'APPROVED',
        timestamp: Date.now()
      }
    ])
  };
});

// 言語モデルサービスのモック
jest.mock('../../src/services/ai/LanguageModelService', () => {
  return {
    isModelInitialized: jest.fn().mockReturnValue(true),
    analyzeUserIntent: jest.fn().mockResolvedValue({
      success: true,
      rules: [
        {
          type: 'TRANSACTION_TYPE',
          operator: 'EQUALS',
          value: 'swap'
        }
      ],
      explanation: 'テスト解析結果'
    }),
    hasApiKey: jest.fn().mockReturnValue(true)
  };
});

// アラートサービスのモック
jest.mock('../../src/services/alert/AlertService', () => {
  return {
    initialize: jest.fn().mockReturnValue(true),
    addNotification: jest.fn(),
    addInfo: jest.fn(),
    addSuccess: jest.fn(),
    addWarning: jest.fn(),
    addError: jest.fn(),
    addAlert: jest.fn(),
    getAllNotifications: jest.fn().mockReturnValue([]),
    getUnreadNotifications: jest.fn().mockReturnValue([]),
    on: jest.fn(),
    removeAllListeners: jest.fn()
  };
});

describe('統合テスト: UIコンポーネント', () => {
  it('ダッシュボードが正しくレンダリングされること', () => {
    const { getByText } = render(
      <MetaMaskProvider>
        <Dashboard />
      </MetaMaskProvider>
    );
    
    expect(getByText(/GuardianAI/i)).toBeTruthy();
  });

  it('トランザクションモニターが正しくレンダリングされること', () => {
    const { getByText } = render(
      <MetaMaskProvider>
        <TransactionMonitor />
      </MetaMaskProvider>
    );
    
    expect(getByText(/トランザクション監視/i)).toBeTruthy();
  });

  it('意図入力コンポーネントが正しくレンダリングされること', async () => {
    const { getByText, getByPlaceholderText } = render(
      <MetaMaskProvider>
        <IntentInputComponent />
      </MetaMaskProvider>
    );
    
    expect(getByText(/取引の意図/i)).toBeTruthy();
    
    const input = getByPlaceholderText(/例: 今日はスワップだけしたい/i);
    fireEvent.changeText(input, '今日はスワップだけしたい');
    
    const button = getByText(/解析/i);
    fireEvent.press(button);
    
    await waitFor(() => {
      expect(getByText(/解析結果/i)).toBeTruthy();
    });
  });

  it('通知システムが正しくレンダリングされること', () => {
    const { getByTestId } = render(
      <MetaMaskProvider>
        <NotificationSystem />
      </MetaMaskProvider>
    );
    
    // 通知バッジが表示されていることを確認
    expect(getByTestId('notification-badge')).toBeTruthy();
  });
});

describe('統合テスト: ユーザーフロー', () => {
  it('ウォレット接続からトランザクション監視までのフローが機能すること', async () => {
    const { getByText } = render(
      <MetaMaskProvider>
        <Dashboard />
      </MetaMaskProvider>
    );
    
    // ウォレット接続ボタンをクリック
    const connectButton = getByText(/ウォレットを接続/i);
    fireEvent.press(connectButton);
    
    await waitFor(() => {
      // 接続後、ダッシュボードに表示される要素を確認
      expect(getByText(/0x123456789abcdef/i)).toBeTruthy();
      expect(getByText(/監視中/i)).toBeTruthy();
    });
  });

  it('意図入力から通知表示までのフローが機能すること', async () => {
    const { getByText, getByPlaceholderText } = render(
      <MetaMaskProvider>
        <IntentInputComponent />
        <NotificationSystem />
      </MetaMaskProvider>
    );
    
    // 意図を入力
    const input = getByPlaceholderText(/例: 今日はスワップだけしたい/i);
    fireEvent.changeText(input, '今日はスワップだけしたい');
    
    // 解析ボタンをクリック
    const button = getByText(/解析/i);
    fireEvent.press(button);
    
    await waitFor(() => {
      // 解析結果が表示されることを確認
      expect(getByText(/解析結果/i)).toBeTruthy();
      // 成功通知が表示されることを確認
      expect(getByText(/ルールが作成されました/i)).toBeTruthy();
    });
  });
});

describe('パフォーマンステスト', () => {
  it('大量のトランザクションを処理できること', async () => {
    // トランザクションサービスのモックを上書き
    jest.spyOn(require('../../src/services/transaction/TransactionMonitorService'), 'getRecentTransactions')
      .mockImplementation(() => {
        // 100件のトランザクションを生成
        const transactions = [];
        for (let i = 0; i < 100; i++) {
          transactions.push({
            hash: `0xtxhash${i}`,
            to: '0xabcdef123456789',
            from: '0x123456789abcdef',
            value: '0x1',
            data: '0x',
            gas: '0x5208',
            gasPrice: '0x4a817c800',
            type: 'TRANSFER',
            status: i % 2 === 0 ? 'APPROVED' : 'PENDING',
            timestamp: Date.now() - i * 1000
          });
        }
        return transactions;
      });
    
    const { getByText } = render(
      <MetaMaskProvider>
        <TransactionMonitor />
      </MetaMaskProvider>
    );
    
    // トランザクションリストが表示されることを確認
    expect(getByText(/トランザクション監視/i)).toBeTruthy();
    
    // パフォーマンスを測定（実際のテストでは時間計測などを行う）
    const startTime = performance.now();
    
    // スクロールをシミュレート
    for (let i = 0; i < 10; i++) {
      fireEvent.scroll(getByText(/トランザクション監視/i), {
        nativeEvent: {
          contentOffset: {
            y: i * 100
          },
          contentSize: {
            height: 1000,
            width: 300
          },
          layoutMeasurement: {
            height: 300,
            width: 300
          }
        }
      });
    }
    
    const endTime = performance.now();
    
    // 処理時間が許容範囲内であることを確認（例: 500ms以内）
    expect(endTime - startTime).toBeLessThan(500);
  });
});

describe('ユーザビリティテスト', () => {
  it('エラー状態からの回復が可能であること', async () => {
    // 言語モデルサービスのモックを上書き
    const mockAnalyzeUserIntent = jest.fn()
      .mockRejectedValueOnce(new Error('テストエラー'))
      .mockResolvedValueOnce({
        success: true,
        rules: [
          {
            type: 'TRANSACTION_TYPE',
            operator: 'EQUALS',
            value: 'swap'
          }
        ],
        explanation: 'テスト解析結果'
      });
    
    jest.spyOn(require('../../src/services/ai/LanguageModelService'), 'analyzeUserIntent')
      .mockImplementation(mockAnalyzeUserIntent);
    
    const { getByText, getByPlaceholderText } = render(
      <MetaMaskProvider>
        <IntentInputComponent />
      </MetaMaskProvider>
    );
    
    // 意図を入力
    const input = getByPlaceholderText(/例: 今日はスワップだけしたい/i);
    fireEvent.changeText(input, '今日はスワップだけしたい');
    
    // 解析ボタンをクリック（エラーが発生する）
    const button = getByText(/解析/i);
    fireEvent.press(button);
    
    await waitFor(() => {
      // エラーメッセージが表示されることを確認
      expect(getByText(/エラーが発生しました/i)).toBeTruthy();
    });
    
    // 再度解析ボタンをクリック（成功する）
    fireEvent.press(button);
    
    await waitFor(() => {
      // 解析結果が表示されることを確認
      expect(getByText(/解析結果/i)).toBeTruthy();
    });
  });
});
