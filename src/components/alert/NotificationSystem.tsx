import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Card, Badge, IconButton, Portal, Dialog, Button } from 'react-native-paper';
import alertService, { NotificationData, NotificationType, NotificationPriority } from '../../services/alert/AlertService';
import nordicTheme from '../../utils/theme';

/**
 * 通知コンポーネント
 * アプリケーション内の通知を表示するコンポーネント
 */
const NotificationSystem: React.FC = () => {
  const { colors, custom } = nordicTheme;

  // 状態管理
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState<boolean>(false);
  const [selectedNotification, setSelectedNotification] = useState<NotificationData | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);

  // 通知の初期化と監視
  useEffect(() => {
    // アラートサービスを初期化
    alertService.initialize();
    
    // 通知リストを取得
    const allNotifications = alertService.getAllNotifications();
    setNotifications(allNotifications);
    
    // 未読数を更新
    updateUnreadCount();
    
    // イベントリスナーを設定
    setupEventListeners();
    
    // クリーンアップ関数
    return () => {
      cleanupEventListeners();
    };
  }, []);

  // イベントリスナーの設定
  const setupEventListeners = () => {
    // 通知追加イベント
    alertService.on('notification_added', handleNotificationAdded);
    
    // 通知更新イベント
    alertService.on('notification_updated', handleNotificationUpdated);
    
    // 通知削除イベント
    alertService.on('notification_removed', handleNotificationRemoved);
    
    // すべての通知既読イベント
    alertService.on('all_notifications_read', handleAllNotificationsRead);
    
    // すべての通知クリアイベント
    alertService.on('all_notifications_cleared', handleAllNotificationsCleared);
  };

  // イベントリスナーのクリーンアップ
  const cleanupEventListeners = () => {
    alertService.removeAllListeners('notification_added');
    alertService.removeAllListeners('notification_updated');
    alertService.removeAllListeners('notification_removed');
    alertService.removeAllListeners('all_notifications_read');
    alertService.removeAllListeners('all_notifications_cleared');
  };

  // 通知追加ハンドラー
  const handleNotificationAdded = (notification: NotificationData) => {
    setNotifications(prev => [notification, ...prev]);
    updateUnreadCount();
  };

  // 通知更新ハンドラー
  const handleNotificationUpdated = (notification: NotificationData) => {
    setNotifications(prev => 
      prev.map(item => 
        item.id === notification.id ? notification : item
      )
    );
    updateUnreadCount();
  };

  // 通知削除ハンドラー
  const handleNotificationRemoved = (notification: NotificationData) => {
    setNotifications(prev => prev.filter(item => item.id !== notification.id));
    updateUnreadCount();
  };

  // すべての通知既読ハンドラー
  const handleAllNotificationsRead = () => {
    setNotifications(prev => prev.map(item => ({ ...item, read: true })));
    setUnreadCount(0);
  };

  // すべての通知クリアハンドラー
  const handleAllNotificationsCleared = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  // 未読数を更新
  const updateUnreadCount = () => {
    const unreadNotifications = alertService.getUnreadNotifications();
    setUnreadCount(unreadNotifications.length);
  };

  // 通知パネルの開閉
  const toggleNotificationPanel = () => {
    setIsNotificationPanelOpen(!isNotificationPanelOpen);
  };

  // 通知をクリック
  const handleNotificationClick = (notification: NotificationData) => {
    // 通知を既読にする
    alertService.markAsRead(notification.id);
    
    // アクション可能な通知の場合はダイアログを表示
    if (notification.actionable) {
      setSelectedNotification(notification);
      setIsDialogOpen(true);
    }
  };

  // 通知を削除
  const handleNotificationDelete = (id: string, event: any) => {
    event.stopPropagation();
    alertService.removeNotification(id);
  };

  // すべての通知を既読にする
  const markAllAsRead = () => {
    alertService.markAllAsRead();
  };

  // すべての通知をクリア
  const clearAllNotifications = () => {
    alertService.clearAllNotifications();
  };

  // 通知アクションを実行
  const executeNotificationAction = () => {
    if (selectedNotification && selectedNotification.actionCallback) {
      selectedNotification.actionCallback();
    }
    setIsDialogOpen(false);
  };

  // 通知タイプに応じた色を取得
  const getNotificationTypeColor = (type: NotificationType): string => {
    switch (type) {
      case NotificationType.INFO:
        return colors.state.info;
      case NotificationType.SUCCESS:
        return colors.state.success;
      case NotificationType.WARNING:
        return colors.state.warning;
      case NotificationType.ERROR:
        return colors.state.error;
      case NotificationType.ALERT:
        return colors.special.dogBark;
      default:
        return colors.text.secondary;
    }
  };

  // 通知タイプの表示名を取得
  const getNotificationTypeName = (type: NotificationType): string => {
    switch (type) {
      case NotificationType.INFO:
        return '情報';
      case NotificationType.SUCCESS:
        return '成功';
      case NotificationType.WARNING:
        return '警告';
      case NotificationType.ERROR:
        return 'エラー';
      case NotificationType.ALERT:
        return 'アラート';
      default:
        return '通知';
    }
  };

  // 通知優先度に応じたスタイルを取得
  const getPriorityStyle = (priority: NotificationPriority): any => {
    switch (priority) {
      case NotificationPriority.LOW:
        return {};
      case NotificationPriority.MEDIUM:
        return { borderLeftWidth: 4, borderLeftColor: colors.primary.main };
      case NotificationPriority.HIGH:
        return { borderLeftWidth: 4, borderLeftColor: colors.state.warning };
      case NotificationPriority.CRITICAL:
        return { borderLeftWidth: 4, borderLeftColor: colors.state.error };
      default:
        return {};
    }
  };

  // 日時をフォーマット
  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  // 通知バッジ
  const NotificationBadge = () => (
    <TouchableOpacity
      style={styles.notificationBadge}
      onPress={toggleNotificationPanel}
    >
      <IconButton
        icon="bell"
        size={24}
        iconColor={colors.text.primary}
      />
      {unreadCount > 0 && (
        <Badge
          style={[
            styles.badge,
            { backgroundColor: colors.state.error }
          ]}
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      )}
    </TouchableOpacity>
  );

  // 通知パネル
  const NotificationPanel = () => (
    <Card style={[styles.notificationPanel, { ...custom.shadows.lg }]}>
      <Card.Content>
        <View style={styles.notificationHeader}>
          <Text style={styles.notificationTitle}>通知</Text>
          <View style={styles.notificationActions}>
            <Button
              mode="text"
              onPress={markAllAsRead}
              disabled={unreadCount === 0}
            >
              すべて既読
            </Button>
            <Button
              mode="text"
              onPress={clearAllNotifications}
              disabled={notifications.length === 0}
            >
              クリア
            </Button>
          </View>
        </View>
        
        <ScrollView style={styles.notificationList}>
          {notifications.length === 0 ? (
            <Text style={styles.emptyText}>通知はありません</Text>
          ) : (
            notifications.map((notification) => (
              <TouchableOpacity
                key={notification.id}
                style={[
                  styles.notificationItem,
                  !notification.read && styles.unreadNotification,
                  getPriorityStyle(notification.priority)
                ]}
                onPress={() => handleNotificationClick(notification)}
              >
                <View style={styles.notificationContent}>
                  <View style={styles.notificationHeader}>
                    <Badge
                      style={{
                        backgroundColor: getNotificationTypeColor(notification.type),
                      }}
                    >
                      {getNotificationTypeName(notification.type)}
                    </Badge>
                    <Text style={styles.notificationTime}>
                      {formatTimestamp(notification.timestamp)}
                    </Text>
                  </View>
                  <Text style={styles.notificationItemTitle}>{notification.title}</Text>
                  <Text style={styles.notificationMessage}>{notification.message}</Text>
                </View>
                <IconButton
                  icon="close"
                  size={16}
                  iconColor={colors.text.secondary}
                  onPress={(e) => handleNotificationDelete(notification.id, e)}
                />
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </Card.Content>
    </Card>
  );

  return (
    <>
      <NotificationBadge />
      
      {isNotificationPanelOpen && <NotificationPanel />}
      
      <Portal>
        <Dialog
          visible={isDialogOpen}
          onDismiss={() => setIsDialogOpen(false)}
        >
          <Dialog.Title>{selectedNotification?.title}</Dialog.Title>
          <Dialog.Content>
            <Text>{selectedNotification?.message}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setIsDialogOpen(false)}>キャンセル</Button>
            <Button
              mode="contained"
              onPress={executeNotificationAction}
            >
              {selectedNotification?.actionText || '確認'}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
};

const styles = StyleSheet.create({
  notificationBadge: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
  },
  notificationPanel: {
    position: 'absolute',
    top: 60,
    right: 10,
    width: 320,
    maxHeight: 400,
    zIndex: 1000,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  notificationTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  notificationActions: {
    flexDirection: 'row',
  },
  notificationList: {
    maxHeight: 320,
  },
  notificationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 8,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    borderLeftWidth: 0,
  },
  unreadNotification: {
    backgroundColor: '#F0F4FF',
  },
  notificationContent: {
    flex: 1,
  },
  notificationItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginVertical: 4,
  },
  notificationMessage: {
    fontSize: 12,
    color: '#666666',
  },
  notificationTime: {
    fontSize: 10,
    color: '#999999',
  },
  emptyText: {
    textAlign: 'center',
    padding: 16,
    color: '#999999',
    fontStyle: 'italic',
  },
});

export default NotificationSystem;
