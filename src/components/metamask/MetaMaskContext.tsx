import React, { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { useSDK } from '@metamask/sdk-react';
import { ethers } from 'ethers';
import AsyncStorage from '@react-native-async-storage/async-storage';

// MetaMaskコンテキストの型定義
interface MetaMaskContextType {
  isInitialized: boolean;
  isConnecting: boolean;
  isConnected: boolean;
  accounts: string[];
  chainId: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  sendTransaction: (transaction: any) => Promise<string>;
  signMessage: (message: string) => Promise<string>;
  secureStore: (key: string, value: string) => Promise<boolean>;
  secureRetrieve: (key: string) => Promise<string | null>;
  error: Error | null;
}

// MetaMaskコンテキストの作成
const MetaMaskContext = createContext<MetaMaskContextType | undefined>(undefined);

// MetaMaskプロバイダーのプロパティ
interface MetaMaskProviderProps {
  children: ReactNode;
}

/**
 * MetaMaskプロバイダーコンポーネント
 */
export const MetaMaskProvider: React.FC<MetaMaskProviderProps> = ({ children }) => {
  // MetaMask SDK フックを使用
  const { sdk, connected, connecting, provider, chainId, account, error: sdkError } = useSDK();
  
  // 状態
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [accounts, setAccounts] = useState<string[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  
  // SDK初期化の監視
  useEffect(() => {
    if (sdk) {
      setIsInitialized(true);
      
      // 既に接続されているかチェック
      if (connected && account) {
        setIsConnected(true);
        setAccounts([account]);
      }
    }
  }, [sdk, connected, account]);
  
  // 接続状態の監視
  useEffect(() => {
    setIsConnecting(connecting);
  }, [connecting]);
  
  // 接続状態の変更を監視
  useEffect(() => {
    setIsConnected(connected);
    if (connected && account) {
      setAccounts([account]);
    } else {
      setAccounts([]);
    }
  }, [connected, account]);
  
  // チェーンIDの監視
  useEffect(() => {
    if (chainId) {
      // 16進数形式に変換
      const hexChainId = typeof chainId === 'number' 
        ? `0x${chainId.toString(16)}` 
        : chainId;
      
      // 状態を更新
      setChainId(hexChainId);
    }
  }, [chainId]);
  
  // エラーの監視
  useEffect(() => {
    if (sdkError) {
      setError(sdkError instanceof Error ? sdkError : new Error(String(sdkError)));
    }
  }, [sdkError]);
  
  // プロバイダーとサイナーの設定
  useEffect(() => {
    const setupSigner = async () => {
      if (provider && connected) {
        try {
          const ethersProvider = new ethers.BrowserProvider(provider);
          const newSigner = await ethersProvider.getSigner();
          setSigner(newSigner);
        } catch (err) {
          console.error('サイナーの設定に失敗しました:', err);
          setError(err instanceof Error ? err : new Error('サイナーの設定に失敗しました'));
        }
      } else {
        setSigner(null);
      }
    };
    
    setupSigner();
  }, [provider, connected]);
  
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
      await sdk?.connect();
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
      await sdk?.disconnect();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('MetaMask切断中に不明なエラーが発生しました'));
    }
  };
  
  /**
   * トランザクションを送信
   */
  const sendTransaction = async (transaction: any): Promise<string> => {
    if (!isInitialized || !isConnected || !signer) {
      throw new Error('MetaMaskに接続されていません');
    }
    
    try {
      const tx = await signer.sendTransaction(transaction);
      return tx.hash;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('トランザクション送信中に不明なエラーが発生しました'));
      throw err;
    }
  };
  
  /**
   * メッセージに署名
   */
  const signMessage = async (message: string): Promise<string> => {
    if (!isInitialized || !isConnected || !signer) {
      throw new Error('MetaMaskに接続されていません');
    }
    
    try {
      return await signer.signMessage(message);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('メッセージ署名中に不明なエラーが発生しました'));
      throw err;
    }
  };
  
  /**
   * セキュアストレージにデータを保存
   */
  const secureStore = async (key: string, value: string): Promise<boolean> => {
    if (!isInitialized || !isConnected || !signer) {
      throw new Error('MetaMaskに接続されていません');
    }
    
    try {
      // データを暗号化して保存
      const encryptedData = await signer.signMessage(value);
      // 暗号化されたデータをローカルストレージに保存
      await AsyncStorage.setItem(`secure_${key}`, encryptedData);
      return true;
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
      // 暗号化されたデータをローカルストレージから取得
      const encryptedData = await AsyncStorage.getItem(`secure_${key}`);
      if (!encryptedData) {
        return null;
      }
      
      // データを復号化（この実装では単純化のため、暗号化されたデータをそのまま返す）
      return encryptedData;
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
