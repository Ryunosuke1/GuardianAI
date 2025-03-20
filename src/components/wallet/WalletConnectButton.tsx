import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useMetaMask } from '../../services/metamask/MetaMaskContext';

/**
 * ウォレット接続ボタンコンポーネント
 * MetaMaskウォレットへの接続/切断を行うボタンを提供します
 */
const WalletConnectButton: React.FC = () => {
  // MetaMaskコンテキストを使用
  const { 
    isInitialized, 
    isConnecting, 
    isConnected, 
    accounts, 
    connect, 
    disconnect,
    error
  } = useMetaMask();

  // 接続ボタンのハンドラー
  const handleConnectPress = async () => {
    if (isConnected) {
      await disconnect();
    } else {
      await connect();
    }
  };

  // アドレスを短縮表示する関数
  const shortenAddress = (address: string): string => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // 初期化中の表示
  if (!isInitialized) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#4F46E5" />
        <Text style={styles.loadingText}>MetaMask SDKを初期化中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 接続ボタン */}
      <TouchableOpacity
        style={[
          styles.button,
          isConnected ? styles.connectedButton : styles.disconnectedButton,
          isConnecting && styles.disabledButton
        ]}
        onPress={handleConnectPress}
        disabled={isConnecting}
      >
        {isConnecting ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>
            {isConnected 
              ? `切断 (${shortenAddress(accounts[0])})` 
              : 'MetaMaskに接続'}
          </Text>
        )}
      </TouchableOpacity>

      {/* エラーメッセージ */}
      {error && (
        <Text style={styles.errorText}>{error.message}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  disconnectedButton: {
    backgroundColor: '#4F46E5',
  },
  connectedButton: {
    backgroundColor: '#10B981',
  },
  disabledButton: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  loadingText: {
    marginTop: 8,
    color: '#6B7280',
    fontSize: 14,
  },
  errorText: {
    marginTop: 8,
    color: '#EF4444',
    fontSize: 14,
  },
});

export default WalletConnectButton;
