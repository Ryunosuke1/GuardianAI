import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';

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
    checkConnection();
    window.ethereum?.on('accountsChanged', handleAccountsChanged);
    window.ethereum?.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum?.removeListener('chainChanged', handleChainChanged);
    };
  }, []);

  // MetaMaskの接続状態をチェック
  const checkConnection = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          const chainId = await window.ethereum.request({ method: 'eth_chainId' });
          handleAccountsChanged(accounts);
          setChainId(chainId);
        }
      } catch (error) {
        console.error('MetaMaskの接続状態の確認に失敗しました:', error);
      }
    }
  };

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
    if (!window.ethereum) {
      alert('MetaMaskをインストールしてください');
      return;
    }

    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      handleAccountsChanged(accounts);
      setChainId(chainId);
    } catch (error) {
      console.error('MetaMaskへの接続に失敗しました:', error);
    }
  };

  // MetaMaskから切断
  const disconnect = () => {
    setAccounts([]);
    setIsConnected(false);
    setChainId('');
  };

  return (
    <MetaMaskContext.Provider value={{ isConnected, accounts, chainId, connect, disconnect }}>
      {children}
    </MetaMaskContext.Provider>
  );
};
