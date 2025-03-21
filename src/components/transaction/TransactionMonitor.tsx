import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, DataTable, Badge, IconButton, Switch } from 'react-native-paper';
import { useMetaMask } from '../../services/metamask/MetaMaskContext';
import transactionMonitorService from '../../services/transaction/TransactionMonitorService';
import transactionApprovalService from '../../services/transaction/TransactionApprovalService';
import { TransactionData, TransactionType } from '@/types/transaction';
import { ApprovalRequest, ApprovalStatus } from '@/types/approval';
import { nordicTheme } from '@/utils/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// トランザクションタイプの色を取得
const getTransactionTypeColor = (type: TransactionType): string => {
  const { colors } = nordicTheme.custom;
  
  switch (type) {
    case TransactionType.TRANSFER:
      return colors.transaction.transfer;
    case TransactionType.SWAP:
      return colors.transaction.swap;
    case TransactionType.APPROVAL:
      return colors.transaction.approval;
    case TransactionType.MINT:
      return colors.transaction.mint;
    case TransactionType.BURN:
      return colors.transaction.burn;
    case TransactionType.STAKE:
      return colors.transaction.stake;
    case TransactionType.UNSTAKE:
      return colors.transaction.unstake;
    case TransactionType.CLAIM:
      return colors.transaction.claim;
    case TransactionType.CONTRACT_INTERACTION:
      return colors.transaction.contract;
    default:
      return colors.transaction.unknown;
  }
};

// トランザクションタイプの名前を取得
const getTransactionTypeName = (type: TransactionType): string => {
  switch (type) {
    case TransactionType.TRANSFER:
      return '送金';
    case TransactionType.SWAP:
      return 'スワップ';
    case TransactionType.APPROVAL:
      return '承認';
    case TransactionType.MINT:
      return 'ミント';
    case TransactionType.BURN:
      return 'バーン';
    case TransactionType.STAKE:
      return 'ステーク';
    case TransactionType.UNSTAKE:
      return 'アンステーク';
    case TransactionType.CLAIM:
      return '請求';
    case TransactionType.CONTRACT_INTERACTION:
      return 'コントラクト';
    default:
      return '不明';
  }
};

// 承認ステータスの色を取得
const getApprovalStatusColor = (status: ApprovalStatus): string => {
  const { colors } = nordicTheme.custom;
  
  switch (status) {
    case ApprovalStatus.PENDING:
      return colors.state.warning;
    case ApprovalStatus.APPROVED:
      return colors.state.success;
    case ApprovalStatus.REJECTED:
      return colors.state.error;
    default:
      return colors.state.disabled;
  }
};

// 承認ステータスの名前を取得
const getApprovalStatusName = (status: ApprovalStatus): string => {
  switch (status) {
    case ApprovalStatus.PENDING:
      return '保留中';
    case ApprovalStatus.APPROVED:
      return '承認済み';
    case ApprovalStatus.REJECTED:
      return '拒否済み';
    default:
      return '不明';
  }
};

// アドレスを短縮
const shortenAddress = (address: string): string => {
  if (!address) return '';
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

/**
 * トランザクション監視コンポーネント
 */
const TransactionMonitor: React.FC = () => {
  const { isConnected, accounts } = useMetaMask();
  const [isMonitoring, setIsMonitoring] = useState<boolean>(false);
  const [pendingApprovals, setPendingApprovals] = useState<ApprovalRequest[]>([]);
  const [confirmedTransactions, setConfirmedTransactions] = useState<TransactionData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { custom, colors } = nordicTheme;

  // コンポーネントマウント時の処理
  useEffect(() => {
    // トランザクション監視サービスのイベントリスナーを設定
    const onPendingTransaction = (tx: TransactionData) => {
      // 確認済みトランザクションを更新
      setConfirmedTransactions(prev => [tx, ...prev].slice(0, 20));
    };
    
    const onConfirmedTransaction = (tx: TransactionData) => {
      // 確認済みトランザクションを更新
      setConfirmedTransactions(prev => {
        const filtered = prev.filter(t => t.hash !== tx.hash);
        return [tx, ...filtered].slice(0, 20);
      });
    };
    
    // トランザクション承認サービスのイベントリスナーを設定
    const onApprovalUpdate = () => {
      // 保留中の承認を取得
      const approvals = transactionApprovalService.getApprovals();
      setPendingApprovals(approvals);
    };
    
    // イベントリスナーを登録
    transactionMonitorService.on('pending_transaction', onPendingTransaction);
    transactionMonitorService.on('confirmed_transaction', onConfirmedTransaction);
    transactionApprovalService.on('approval_update', onApprovalUpdate);
    
    // 初期データを読み込み
    loadInitialData();
    
    // クリーンアップ関数
    return () => {
      // イベントリスナーを解除
      transactionMonitorService.off('pending_transaction', onPendingTransaction);
      transactionMonitorService.off('confirmed_transaction', onConfirmedTransaction);
      transactionApprovalService.off('approval_update', onApprovalUpdate);
      
      // 監視を停止
      if (isMonitoring) {
        transactionMonitorService.stopMonitoring();
      }
    };
  }, []);
  
  // 接続状態が変わったときの処理
  useEffect(() => {
    if (isConnected && accounts.length > 0) {
      // アカウントが接続されたら監視対象に追加
      transactionMonitorService.addWatchedAddress(accounts[0]);
      
      // 監視中なら再起動
      if (isMonitoring) {
        toggleMonitoring();
      }
    } else {
      // 接続が切れたら監視を停止
      if (isMonitoring) {
        toggleMonitoring();
      }
    }
  }, [isConnected, accounts]);
  
  // 初期データを読み込む
  const loadInitialData = async () => {
    setIsLoading(true);
    
    try {
      // 保留中の承認を取得
      const approvals = transactionApprovalService.getApprovals();
      setPendingApprovals(approvals);
      
      // 確認済みトランザクションを取得
      const confirmed = transactionMonitorService.getConfirmedTransactions();
      setConfirmedTransactions(confirmed.slice(0, 20));
    } catch (error) {
      console.error('初期データの読み込みに失敗しました:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // 監視の切り替え
  const toggleMonitoring = async () => {
    try {
      if (isMonitoring) {
        // 監視を停止
        transactionMonitorService.stopMonitoring();
        setIsMonitoring(false);
      } else {
        // 監視を開始
        if (isConnected && accounts.length > 0) {
          // アカウントが接続されていれば監視対象に追加
          transactionMonitorService.addWatchedAddress(accounts[0]);
        }
        
        // 監視を開始
        const success = await transactionMonitorService.startMonitoring();
        setIsMonitoring(success);
      }
    } catch (error) {
      console.error('監視の切り替えに失敗しました:', error);
    }
  };
  
  // トランザクションを承認
  const approveTransaction = (approvalId: string) => {
    transactionApprovalService.approveTransaction(approvalId);
  };
  
  // トランザクションを拒否
  const rejectTransaction = (approvalId: string) => {
    transactionApprovalService.rejectTransaction(approvalId);
  };

  return (
    <ScrollView style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <Text style={styles.title}>トランザクション監視</Text>
        <Text style={styles.subtitle}>
          {isConnected
            ? `接続中: ${shortenAddress(accounts[0])}`
            : 'ウォレットに接続してください'}
        </Text>
      </View>
      
      {/* 監視コントロール */}
      <Card style={[styles.card, { ...custom.shadows.md }]}>
        <Card.Content>
          <View style={styles.monitoringControl}>
            <Text style={styles.cardTitle}>監視状態</Text>
            <Switch
              value={isMonitoring}
              onValueChange={toggleMonitoring}
              disabled={!isConnected}
              color={colors.primary}
            />
          </View>
          <Text>
            {isMonitoring
              ? '監視中: トランザクションを監視しています'
              : '停止中: トランザクションの監視は停止しています'}
          </Text>
        </Card.Content>
      </Card>
      
      {/* 承認待ちトランザクション */}
      <Card style={[styles.card, { ...custom.shadows.md }]}>
        <Card.Content>
          <Text style={styles.cardTitle}>承認待ちトランザクション</Text>
          {pendingApprovals.length === 0 ? (
            <Text style={styles.emptyText}>承認待ちのトランザクションはありません</Text>
          ) : (
            <DataTable>
              <DataTable.Header>
                <DataTable.Title>タイプ</DataTable.Title>
                <DataTable.Title>送信先</DataTable.Title>
                <DataTable.Title numeric>状態</DataTable.Title>
                <DataTable.Title numeric>アクション</DataTable.Title>
              </DataTable.Header>
              {pendingApprovals
                .filter(approval => approval.status === 'pending')
                .map((approval, index) => (
                  <DataTable.Row key={index}>
                    <DataTable.Cell>
                      <Badge
                        style={{
                          backgroundColor: getTransactionTypeColor(approval.transaction.type),
                        }}
                      >
                        {getTransactionTypeName(approval.transaction.type)}
                      </Badge>
                    </DataTable.Cell>
                    <DataTable.Cell>{shortenAddress(approval.transaction.to)}</DataTable.Cell>
                    <DataTable.Cell numeric>
                      <Badge
                        style={{
                          backgroundColor: custom.colors.state[approval.status === 'pending' ? 'warning' : approval.status === 'approved' ? 'success' : 'error'],
                        }}
                      >
                        {approval.status === 'pending' ? '保留中' : approval.status === 'approved' ? '承認済み' : '拒否済み'}
                      </Badge>
                    </DataTable.Cell>
                    <DataTable.Cell numeric>
                      <View style={styles.actionButtons}>
                        <IconButton
                          icon="check"
                          size={20}
                          iconColor={custom.colors.state.success}
                          onPress={() => approveTransaction(approval.id)}
                        />
                        <IconButton
                          icon="close"
                          size={20}
                          iconColor={custom.colors.state.error}
                          onPress={() => rejectTransaction(approval.id)}
                        />
                      </View>
                    </DataTable.Cell>
                  </DataTable.Row>
                ))}
            </DataTable>
          )}
        </Card.Content>
      </Card>
      
      {/* 最近のトランザクション */}
      <Card style={[styles.card, { ...custom.shadows.md }]}>
        <Card.Content>
          <Text style={styles.cardTitle}>最近のトランザクション</Text>
          {confirmedTransactions.length === 0 ? (
            <Text style={styles.emptyText}>最近のトランザクションはありません</Text>
          ) : (
            <DataTable>
              <DataTable.Header>
                <DataTable.Title>タイプ</DataTable.Title>
                <DataTable.Title>送信先</DataTable.Title>
                <DataTable.Title numeric>値</DataTable.Title>
              </DataTable.Header>
              {confirmedTransactions.slice(0, 5).map((tx, index) => (
                <DataTable.Row key={index}>
                  <DataTable.Cell>
                    <Badge
                      style={{
                        backgroundColor: getTransactionTypeColor(tx.type),
                      }}
                    >
                      {getTransactionTypeName(tx.type)}
                    </Badge>
                  </DataTable.Cell>
                  <DataTable.Cell>{shortenAddress(tx.to)}</DataTable.Cell>
                  <DataTable.Cell numeric>{tx.value} ETH</DataTable.Cell>
                </DataTable.Row>
              ))}
            </DataTable>
          )}
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: nordicTheme.custom.colors.background.default,
  },
  header: {
    padding: nordicTheme.custom.spacing.md,
    marginBottom: nordicTheme.custom.spacing.md,
  },
  title: {
    fontSize: nordicTheme.custom.fontSizes.xxxl,
    fontWeight: 'bold',
    color: nordicTheme.custom.colors.text.primary,
    marginBottom: nordicTheme.custom.spacing.xs,
  },
  subtitle: {
    fontSize: nordicTheme.custom.fontSizes.md,
    color: nordicTheme.custom.colors.text.secondary,
  },
  card: {
    marginHorizontal: nordicTheme.custom.spacing.md,
    marginBottom: nordicTheme.custom.spacing.md,
    borderRadius: nordicTheme.custom.roundness.md,
    backgroundColor: nordicTheme.custom.colors.background.paper,
  },
  cardTitle: {
    fontSize: nordicTheme.custom.fontSizes.xl,
    fontWeight: '600',
    color: nordicTheme.custom.colors.text.primary,
    marginBottom: nordicTheme.custom.spacing.xs,
  },
  monitoringControl: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: nordicTheme.custom.spacing.sm,
  },
  button: {
    paddingVertical: nordicTheme.custom.spacing.sm,
    paddingHorizontal: nordicTheme.custom.spacing.md,
    borderRadius: nordicTheme.custom.roundness.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: nordicTheme.custom.colors.background.paper,
    fontWeight: '600',
    fontSize: nordicTheme.custom.fontSizes.md,
  },
  emptyText: {
    fontSize: nordicTheme.custom.fontSizes.md,
    color: nordicTheme.custom.colors.text.disabled,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: nordicTheme.custom.spacing.md,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
});

export default TransactionMonitor;
