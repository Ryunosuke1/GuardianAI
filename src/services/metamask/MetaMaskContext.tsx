import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import metaMaskService from './MetaMaskService';

// MetaMaskコンテキストの型定義
interface MetaMaskContextType {
  isInitialized: boolean;
  isConnecting: boolean;
  isConnected: boolean;
  accounts: string[];
  chainId: string;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  sendTransaction: (transaction: any) => Promise<string>;
  signMessage: (message: string) => Promise<string>;
  secureStore: (key: string, value: string) => Promise<boolean>;
  secureRetrieve: (key: string) => Promise<string | null>;
  error: Error | null;
}

// デフォルト値
const defaultContext: MetaMaskContextType = {
  isInitialized: false,
  isConnecting: false,
  isConnected: false,
  accounts: [],
  chainId: '',
  connect: async () => {},
  disconnect: async () => {},
  sendTransaction: async () => '',
  signMessage: async () => '',
  secureStore: async () => false,
  secureRetrieve: async () => null,
  error: null,
};

// コンテキストの作成
const MetaMaskContext = createContext<MetaMaskContextType>(defaultContext);

// コンテキストプロバイダーのprops型
interface MetaMaskProviderProps {
  children: ReactNode;
}

/**
 * MetaMaskプロバイダーコンポーネント
 * アプリケーション全体でMetaMask機能を利用できるようにするコンテキストプロバイダー
 */
export const MetaMaskProvider: React.FC<MetaMaskProviderProps> = ({ children }) => {
  // 状態管理
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [accounts, setAccounts] = useState<string[]>([]);
  const [chainId, setChainId] = useState<string>('');
  const [error, setError] = useState<Error | null>(null);

  // MetaMask SDKの初期化
  useEffect(() => {
    const initializeMetaMask = async () => {
      try {
        const success = await metaMaskService.initialize();
        setIsInitialized(success);
        
        // 既に接続されているかチェック
        if (success && metaMaskService.isWalletConnected()) {
          setIsConnected(true);
          setAccounts(metaMaskService.getAccounts());
          setChainId(metaMaskService.getChainId());
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('MetaMask初期化中に不明なエラーが発生しました'));
      }
    };

    initializeMetaMask();
  }, []);

  // イベントリスナーの設定
  useEffect(() => {
    if (!isInitialized) return;

    // アカウント変更イベント
    const handleAccountsChanged = ({ accounts }: { accounts: string[] }) => {
      setAccounts(accounts);
      setIsConnected(accounts.length > 0);
    };

    // チェーン変更イベント
    const handleChainChanged = ({ chainId }: { chainId: string }) => {
      setChainId(chainId);
    };

    // 接続イベント
    const handleConnect = () => {
      setIsConnected(true);
    };

    // 切断イベント
    const handleDisconnect = () => {
      setIsConnected(false);
      setAccounts([]);
    };

    // イベントリスナーの登録
    metaMaskService.on('accountsChanged', handleAccountsChanged);
    metaMaskService.on('chainChanged', handleChainChanged);
    metaMaskService.on('connect', handleConnect);
    metaMaskService.on('disconnect', handleDisconnect);

    // クリーンアップ関数
    return () => {
      metaMaskService.off('accountsChanged', handleAccountsChanged);
      metaMaskService.off('chainChanged', handleChainChanged);
      metaMaskService.off('connect', handleConnect);
      metaMaskService.off('disconnect', handleDisconnect);
    };
  }, [isInitialized]);

  /**
   * MetaMaskウォレットに接続
   */
  const connect = async (): Promise<void> => {
    if (!isInitialized) {
      setError(new Error('MetaMask SDKが初期化されていません'));
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const accounts = await metaMaskService.connect();
      setAccounts(accounts);
      setIsConnected(accounts.length > 0);
      setChainId(metaMaskService.getChainId());
    } catch (err) {
      setError(err instanceof Error ? err : new Error('MetaMask接続中に不明なエラーが発生しました'));
    } finally {
      setIsConnecting(false);
    }
  };

  /**
   * MetaMaskウォレットから切断
   */
  const disconnect = async (): Promise<void> => {
    if (!isInitialized) {
      return;
    }

    try {
      await metaMaskService.disconnect();
      setIsConnected(false);
      setAccounts([]);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('MetaMask切断中に不明なエラーが発生しました'));
    }
  };

  /**
   * トランザクションを送信
   */
  const sendTransaction = async (transaction: any): Promise<string> => {
    if (!isInitialized || !isConnected) {
      throw new Error('MetaMaskに接続されていません');
    }

    try {
      return await metaMaskService.sendTransaction(transaction);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('トランザクション送信中に不明なエラーが発生しました'));
      throw err;
    }
  };

  /**
   * メッセージに署名
   */
  const signMessage = async (message: string): Promise<string> => {
    if (!isInitialized || !isConnected) {
      throw new Error('MetaMaskに接続されていません');
    }

    try {
      return await metaMaskService.signMessage(message);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('メッセージ署名中に不明なエラーが発生しました'));
      throw err;
    }
  };

  /**
   * セキュアストレージにデータを保存
   */
  const secureStore = async (key: string, value: string): Promise<boolean> => {
    if (!isInitialized || !isConnected) {
      throw new Error('MetaMaskに接続されていません');
    }

    try {
      return await metaMaskService.secureStore(key, value);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('セキュアストレージへの保存中に不明なエラーが発生しました'));
      throw err;
    }
  };

  /**
   * セキュアストレージからデータを取得
   */
  const secureRetrieve = async (key: string): Promise<string | null> => {
    if (!isInitialized || !isConnected) {
      throw new Error('MetaMaskに接続されていません');
    }

    try {
      return await metaMaskService.secureRetrieve(key);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('セキュアストレージからの取得中に不明なエラーが発生しました'));
      throw err;
    }
  };

  // コンテキスト値
  const contextValue: MetaMaskContextType = {
    isInitialized,
    isConnecting,
    isConnected,
    accounts,
    chainId,
    connect,
    disconnect,
    sendTransaction,
    signMessage,
    secureStore,
    secureRetrieve,
    error,
  };

  return (
    <MetaMaskContext.Provider value={contextValue}>
      {children}
    </MetaMaskContext.Provider>
  );
};

/**
 * MetaMaskコンテキストを使用するためのカスタムフック
 */
export const useMetaMask = (): MetaMaskContextType => {
  const context = useContext(MetaMaskContext);
  if (context === undefined) {
    throw new Error('useMetaMaskはMetaMaskProviderの中で使用する必要があります');
  }
  return context;
};

export default useMetaMask;
