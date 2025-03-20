import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Card, DataTable, Badge, IconButton, useTheme } from 'react-native-paper';
import { TransactionData, TransactionType } from '../../services/transaction/TransactionMonitorService';
import transactionMonitorService from '../../services/transaction/TransactionMonitorService';
import transactionApprovalService, { ApprovalStatus } from '../../services/transaction/TransactionApprovalService';
import { useMetaMask } from '../../services/metamask/MetaMaskContext';
import nordicTheme from '../../utils/theme';

/**
 * トランザクション監視インターフェースコンポーネント
 * リアルタイムでトランザクションを監視し、承認/拒否の操作を提供します
 */
const TransactionMonitor: React.FC = () => {
  const theme = useTheme();
  const { colors, custom } = nordicTheme;
  const { isConnected } = useMetaMask();

  // 状態管理
  const [pendingTransactions, setPendingTransactions] = useState<TransactionData[]>([]);
  const [confirmedTransactions, setConfirmedTransactions] = useState<TransactionData[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [isMonitoring, setIsMonitoring] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 監視状態の初期化
  useEffect(() => {
    const initializeMonitoring = async () => {
      if (!isConnected) {
        setError('ウォレットが接続されていません');
        return;
      }

      try {
        // トランザクション監視サービスを初期化
        const initialized = await transactionMonitorService.initialize();
        if (!initialized) {
          setError('トランザクション監視サービスの初期化に失敗しました');
          return;
        }

        // 承認サービスを初期化
        transactionApprovalService.initialize();

        // イベントリスナーを設定
        setupEventListeners();

        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
      }
    };

    initializeMonitoring();

    // クリーンアップ関数
    return () => {
      // イベントリスナーを削除
      cleanupEventListeners();
      
      // 監視を停止
      if (isMonitoring) {
        transactionMonitorService.stopMonitoring();
      }
    };
  }, [isConnected]);

  // イベントリスナーの設定
  const setupEventListeners = () => {
    // 保留中のトランザクションイベント
    transactionMonitorService.on('pending_transaction', handlePendingTransaction);
    
    // 確認済みトランザクションイベント
    transactionMonitorService.on('confirmed_transaction', handleConfirmedTransaction);
    
    // 監視開始イベント
    transactionMonitorService.on('monitoring_started', () => setIsMonitoring(true));
    
    // 監視停止イベント
    transactionMonitorService.on('monitoring_stopped', () => setIsMonitoring(false));
    
    // 承認リクエストイベント
    transactionApprovalService.on('approval_requested', handleApprovalRequested);
    
    // 承認イベント
    transactionApprovalService.on('transaction_approved', handleTransactionApproved);
    
    // 拒否イベント
    transactionApprovalService.on('transaction_rejected', handleTransactionRejected);
    
    // 自動承認イベント
    transactionApprovalService.on('transaction_auto_approved', handleTransactionAutoApproved);
    
    // 期限切れイベント
    transactionApprovalService.on('approval_expired', handleApprovalExpired);
  };

  // イベントリスナーのクリーンアップ
  const cleanupEventListeners = () => {
    transactionMonitorService.removeAllListeners('pending_transaction');
    transactionMonitorService.removeAllListeners('confirmed_transaction');
    transactionMonitorService.removeAllListeners('monitoring_started');
    transactionMonitorService.removeAllListeners('monitoring_stopped');
    
    transactionApprovalService.removeAllListeners('approval_requested');
    transactionApprovalService.removeAllListeners('transaction_approved');
    transactionApprovalService.removeAllListeners('transaction_rejected');
    transactionApprovalService.removeAllListeners('transaction_auto_approved');
    transactionApprovalService.removeAllListeners('approval_expired');
  };

  // 保留中のトランザクションハンドラー
  const handlePendingTransaction = (transaction: TransactionData) => {
    setPendingTransactions(prev => [transaction, ...prev]);
    
    // 承認リクエストを作成
    transactionApprovalService.requestApproval(transaction);
  };

  // 確認済みトランザクションハンドラー
  const handleConfirmedTransaction = (transaction: TransactionData) => {
    // 保留中から削除
    setPendingTransactions(prev => prev.filter(tx => tx.hash !== transaction.hash));
    
    // 確認済みに追加
    setConfirmedTransactions(prev => [transaction, ...prev]);
  };

  // 承認リクエストハンドラー
  const handleApprovalRequested = (request: any) => {
    setPendingApprovals(prev => [request, ...prev]);
  };

  // トランザクション承認ハンドラー
  const handleTransactionApproved = (request: any) => {
    updateApprovalStatus(request);
  };

  // トランザクション拒否ハンドラー
  const handleTransactionRejected = (request: any) => {
    updateApprovalStatus(request);
  };

  // トランザクション自動承認ハンドラー
  const handleTransactionAutoApproved = (request: any) => {
    updateApprovalStatus(request);
  };

  // 承認期限切れハンドラー
  const handleApprovalExpired = (request: any) => {
    updateApprovalStatus(request);
  };

  // 承認ステータスの更新
  const updateApprovalStatus = (request: any) => {
    setPendingApprovals(prev => 
      prev.map(item => 
        item.id === request.id ? request : item
      )
    );
  };

  // 監視の開始/停止
  const toggleMonitoring = () => {
    if (isMonitoring) {
      transactionMonitorService.stopMonitoring();
    } else {
      transactionMonitorService.startMonitoring();
    }
  };

  // トランザクションの承認
  const approveTransaction = (requestId: string) => {
    transactionApprovalService.approveTransaction(requestId);
  };

  // トランザクションの拒否
  const rejectTransaction = (requestId: string) => {
    transactionApprovalService.rejectTransaction(requestId);
  };

  // トランザクションタイプに応じた色を取得
  const getTransactionTypeColor = (type: TransactionType): string => {
    switch (type) {
      case TransactionType.TRANSFER:
        return colors.primary.main;
      case TransactionType.SWAP:
        return colors.accent.main;
      case TransactionType.APPROVAL:
        return colors.secondary.main;
      case TransactionType.CONTRACT_INTERACTION:
        return colors.state.info;
      default:
        return colors.text.secondary;
    }
  };

  // トランザクションタイプの表示名を取得
  const getTransactionTypeName = (type: TransactionType): string => {
    switch (type) {
      case TransactionType.TRANSFER:
        return '送金';
      case TransactionType.SWAP:
        return 'スワップ';
      case TransactionType.APPROVAL:
        return '承認';
      case TransactionType.CONTRACT_INTERACTION:
        return 'コントラクト操作';
      default:
        return '不明';
    }
  };

  // 承認ステータスに応じた色を取得
  const getApprovalStatusColor = (status: ApprovalStatus): string => {
    switch (status) {
      case ApprovalStatus.APPROVED:
      case ApprovalStatus.AUTO_APPROVED:
        return colors.state.success;
      case ApprovalStatus.REJECTED:
        return colors.state.error;
      case ApprovalStatus.PENDING:
        return colors.state.warning;
      case ApprovalStatus.EXPIRED:
        return colors.text.disabled;
      default:
        return colors.text.secondary;
    }
  };

  // 承認ステータスの表示名を取得
  const getApprovalStatusName = (status: ApprovalStatus): string => {
    switch (status) {
      case ApprovalStatus.APPROVED:
        return '承認済み';
      case ApprovalStatus.AUTO_APPROVED:
        return '自動承認';
      case ApprovalStatus.REJECTED:
        return '拒否';
      case ApprovalStatus.PENDING:
        return '保留中';
      case ApprovalStatus.EXPIRED:
        return '期限切れ';
      default:
        return '不明';
    }
  };

  // アドレスを短縮表示する関数
  const shortenAddress = (address: string): string => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>トランザクション監視</Text>
        <Text style={styles.subtitle}>
          リアルタイムでトランザクションを監視し、想定外の取引を検知します
        </Text>
      </View>

      {/* エラー表示 */}
      {error && (
        <Card style={[styles.card, { borderLeftColor: colors.state.error, borderLeftWidth: 4 }]}>
          <Card.Content>
            <Text style={{ color: colors.state.error }}>{error}</Text>
          </Card.Content>
        </Card>
      )}

      {/* 監視コントロール */}
      <Card style={[styles.card, { ...custom.shadows.md }]}>
        <Card.Content>
          <View style={styles.monitoringControl}>
            <Text style={styles.cardTitle}>監視ステータス</Text>
            <Badge
              style={{
                backgroundColor: isMonitoring ? colors.state.success : colors.state.error,
              }}
            >
              {isMonitoring ? 'アクティブ' : '停止中'}
            </Badge>
          </View>
          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor: isMonitoring ? colors.state.error : colors.state.success,
              },
            ]}
            onPress={toggleMonitoring}
            disabled={!isConnected}
          >
            <Text style={styles.buttonText}>
              {isMonitoring ? '監視を停止' : '監視を開始'}
            </Text>
          </TouchableOpacity>
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
                <DataTable.Title numeric>ステータス</DataTable.Title>
                <DataTable.Title numeric>アクション</DataTable.Title>
              </DataTable.Header>

              {pendingApprovals
                .filter(approval => approval.status === ApprovalStatus.PENDING)
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
                          backgroundColor: getApprovalStatusColor(approval.status),
                        }}
                      >
                        {getApprovalStatusName(approval.status)}
                      </Badge>
                    </DataTable.Cell>
                    <DataTable.Cell numeric>
                      <View style={styles.actionButtons}>
                        <IconButton
                          icon="check"
                          size={20}
                          iconColor={colors.state.success}
                          onPress={() => approveTransaction(approval.id)}
                        />
                        <IconButton
                          icon="close"
                          size={20}
                          iconColor={colors.state.error}
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
