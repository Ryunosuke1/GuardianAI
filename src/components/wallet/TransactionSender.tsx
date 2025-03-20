import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ethers } from 'ethers';
import { useMetaMask } from '../../services/metamask/MetaMaskContext';

/**
 * トランザクション送信コンポーネント
 * MetaMaskを使用してトランザクションを送信するためのコンポーネント
 */
interface TransactionSenderProps {
  to: string;
  value: string; // ETH単位の文字列（例: "0.01"）
  data?: string;
  onSuccess?: (txHash: string) => void;
  onError?: (error: Error) => void;
}

const TransactionSender: React.FC<TransactionSenderProps> = ({
  to,
  value,
  data = '0x',
  onSuccess,
  onError
}) => {
  // MetaMaskコンテキストを使用
  const { isConnected, sendTransaction } = useMetaMask();

  // トランザクション送信ハンドラー
  const handleSendTransaction = async () => {
    if (!isConnected) {
      const error = new Error('ウォレットが接続されていません');
      onError?.(error);
      return;
    }

    try {
      // トランザクションオブジェクトを作成
      const transaction = {
        to,
        value: ethers.parseEther(value),
        data
      };

      // トランザクションを送信
      const txHash = await sendTransaction(transaction);
      
      // 成功コールバックを呼び出し
      onSuccess?.(txHash);
    } catch (error) {
      // エラーコールバックを呼び出し
      onError?.(error instanceof Error ? error : new Error('トランザクション送信中に不明なエラーが発生しました'));
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, !isConnected && styles.disabledButton]}
        onPress={handleSendTransaction}
        disabled={!isConnected}
      >
        <Text style={styles.buttonText}>トランザクション送信</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  button: {
    backgroundColor: '#4F46E5',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default TransactionSender;
