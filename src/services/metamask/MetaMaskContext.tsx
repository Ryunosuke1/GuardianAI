import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { metaMaskService } from './MetaMaskService';

interface MetaMaskContextType {
  isConnected: boolean;
  accounts: string[];
  chainId: string;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const MetaMaskContext = createContext<MetaMaskContextType>({
  isConnected: false,
  accounts: [],
  chainId: '',
  connect: async () => {},
  disconnect: () => {},
});

export const useMetaMask = () => useContext(MetaMaskContext);

export const MetaMaskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [accounts, setAccounts] = useState<string[]>([]);
  const [chainId, setChainId] = useState('');

  // MetaMaskの接続状態を監視
  useEffect(() => {
    // 初期状態を設定
    setIsConnected(metaMaskService.isWalletConnected());
    setAccounts(metaMaskService.getAccounts());
    setChainId(metaMaskService.getChainId());

    // イベントリスナーを設定
    metaMaskService.on('accountsChanged', (data: { accounts: string[] }) => {
      handleAccountsChanged(data.accounts);
    });

    metaMaskService.on('chainChanged', (data: { chainId: string }) => {
      handleChainChanged(data.chainId);
    });

    metaMaskService.on('connect', () => {
      setIsConnected(true);
    });

    metaMaskService.on('disconnect', () => {
      setIsConnected(false);
      setAccounts([]);
    });

    return () => {
      // クリーンアップ関数
      metaMaskService.off('accountsChanged', handleAccountsChanged);
      metaMaskService.off('chainChanged', handleChainChanged);
      metaMaskService.off('connect', () => {});
      metaMaskService.off('disconnect', () => {});
    };
  }, []);

  // アカウントの変更を処理
  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length > 0) {
      setAccounts(accounts);
      setIsConnected(true);
    } else {
      setAccounts([]);
      setIsConnected(false);
    }
  };

  // チェーンの変更を処理
  const handleChainChanged = (chainId: string) => {
    setChainId(chainId);
  };

  // MetaMaskに接続
  const connect = async () => {
    try {
      const accounts = await metaMaskService.connect();
      handleAccountsChanged(accounts);
      setChainId(metaMaskService.getChainId());
    } catch (error) {
      console.error('MetaMaskへの接続に失敗しました:', error);
    }
  };

  // MetaMaskから切断
  const disconnect = () => {
    metaMaskService.disconnect().then(() => {
      setAccounts([]);
      setIsConnected(false);
      setChainId('');
    }).catch(error => {
      console.error('MetaMaskからの切断に失敗しました:', error);
    });
  };

  return (
    <MetaMaskContext.Provider value={{ isConnected, accounts, chainId, connect, disconnect }}>
      {children}
    </MetaMaskContext.Provider>
  );
};
