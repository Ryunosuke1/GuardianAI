import { EventEmitter } from 'events';

// 通知タイプの定義
export enum NotificationType {
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
  ALERT = 'alert'
}

// 通知の優先度
export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// 通知データの型定義
export interface NotificationData {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  timestamp: number;
  read: boolean;
  actionable?: boolean;
  actionText?: string;
  actionCallback?: () => void;
  data?: any;
}

/**
 * アラートサービスクラス
 * 通知とアラートを管理するサービス
 */
class AlertService extends EventEmitter {
  private notifications: NotificationData[] = [];
  private notificationsEnabled: boolean = true;
  private dogBarkEnabled: boolean = true;
  private dogBarkVolume: number = 80;
  private dogBarkAudio: HTMLAudioElement | null = null;

  /**
   * アラートサービスを初期化
   */
  public initialize(): boolean {
    try {
      // 設定の読み込み
      this.loadSettings();
      
      // 犬の鳴き声音声ファイルの読み込み
      this.preloadDogBarkSound();
      
      return true;
    } catch (error) {
      console.error('アラートサービスの初期化に失敗しました:', error);
      return false;
    }
  }

  /**
   * 設定を読み込む
   */
  private loadSettings(): void {
    try {
      // 通知設定を取得
      const notificationsEnabled = localStorage.getItem('notificationsEnabled') !== 'false';
      this.notificationsEnabled = notificationsEnabled;
      
      // 犬の鳴き声設定を取得
      const dogBarkEnabled = localStorage.getItem('dogBarkEnabled') !== 'false';
      this.dogBarkEnabled = dogBarkEnabled;
      
      // 犬の鳴き声ボリューム設定を取得
      const volume = localStorage.getItem('dogBarkVolume');
      if (volume) {
        this.dogBarkVolume = parseInt(volume);
      }
    } catch (error) {
      console.error('設定の読み込みに失敗しました:', error);
    }
  }

  /**
   * 犬の鳴き声音声ファイルを事前に読み込む
   */
  private preloadDogBarkSound(): void {
    try {
      this.dogBarkAudio = new Audio('/assets/sounds/dog_bark.mp3');
      this.dogBarkAudio.preload = 'auto';
      this.dogBarkAudio.load();
    } catch (error) {
      console.error('犬の鳴き声音声ファイルの読み込みに失敗しました:', error);
    }
  }

  /**
   * 通知を追加
   * @param type 通知タイプ
   * @param title タイトル
   * @param message メッセージ
   * @param priority 優先度
   * @param actionable アクション可能かどうか
   * @param actionText アクションテキスト
   * @param actionCallback アクションコールバック
   * @param data 追加データ
   */
  public addNotification(
    type: NotificationType,
    title: string,
    message: string,
    priority: NotificationPriority = NotificationPriority.MEDIUM,
    actionable: boolean = false,
    actionText?: string,
    actionCallback?: () => void,
    data?: any
  ): NotificationData {
    // 通知IDを生成
    const id = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 通知データを作成
    const notification: NotificationData = {
      id,
      type,
      title,
      message,
      priority,
      timestamp: Date.now(),
      read: false,
      actionable,
      actionText,
      actionCallback,
      data
    };
    
    // 通知リストに追加
    this.notifications.unshift(notification);
    
    // 通知数を制限（最新100件まで）
    if (this.notifications.length > 100) {
      this.notifications = this.notifications.slice(0, 100);
    }
    
    // 通知イベントを発火
    this.emit('notification_added', notification);
    
    // ブラウザ通知を表示（通知が有効な場合）
    if (this.notificationsEnabled) {
      this.showBrowserNotification(notification);
    }
    
    // アラートタイプの場合は犬の鳴き声を再生
    if (type === NotificationType.ALERT && this.dogBarkEnabled) {
      this.playDogBark();
    }
    
    return notification;
  }

  /**
   * 情報通知を追加
   * @param title タイトル
   * @param message メッセージ
   */
  public addInfo(title: string, message: string): NotificationData {
    return this.addNotification(
      NotificationType.INFO,
      title,
      message,
      NotificationPriority.LOW
    );
  }

  /**
   * 成功通知を追加
   * @param title タイトル
   * @param message メッセージ
   */
  public addSuccess(title: string, message: string): NotificationData {
    return this.addNotification(
      NotificationType.SUCCESS,
      title,
      message,
      NotificationPriority.MEDIUM
    );
  }

  /**
   * 警告通知を追加
   * @param title タイトル
   * @param message メッセージ
   */
  public addWarning(title: string, message: string): NotificationData {
    return this.addNotification(
      NotificationType.WARNING,
      title,
      message,
      NotificationPriority.MEDIUM
    );
  }

  /**
   * エラー通知を追加
   * @param title タイトル
   * @param message メッセージ
   */
  public addError(title: string, message: string): NotificationData {
    return this.addNotification(
      NotificationType.ERROR,
      title,
      message,
      NotificationPriority.HIGH
    );
  }

  /**
   * アラート通知を追加（犬の鳴き声付き）
   * @param title タイトル
   * @param message メッセージ
   * @param actionable アクション可能かどうか
   * @param actionText アクションテキスト
   * @param actionCallback アクションコールバック
   */
  public addAlert(
    title: string,
    message: string,
    actionable: boolean = true,
    actionText: string = '確認する',
    actionCallback?: () => void
  ): NotificationData {
    return this.addNotification(
      NotificationType.ALERT,
      title,
      message,
      NotificationPriority.CRITICAL,
      actionable,
      actionText,
      actionCallback
    );
  }

  /**
   * 犬の鳴き声を再生
   */
  public playDogBark(): void {
    try {
      if (!this.dogBarkAudio || !this.dogBarkEnabled) {
        return;
      }
      
      // ボリュームを設定
      this.dogBarkAudio.volume = this.dogBarkVolume / 100;
      
      // 再生位置をリセット
      this.dogBarkAudio.currentTime = 0;
      
      // 再生
      this.dogBarkAudio.play();
    } catch (error) {
      console.error('犬の鳴き声の再生に失敗しました:', error);
    }
  }

  /**
   * ブラウザ通知を表示
   * @param notification 通知データ
   */
  private showBrowserNotification(notification: NotificationData): void {
    try {
      // 通知APIがサポートされているか確認
      if (!('Notification' in window)) {
        return;
      }
      
      // 通知の許可状態を確認
      if (Notification.permission === 'granted') {
        // 通知を作成
        new Notification(notification.title, {
          body: notification.message,
          icon: '/assets/images/guardian_dog_icon.png'
        });
      } else if (Notification.permission !== 'denied') {
        // 通知の許可を要求
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification(notification.title, {
              body: notification.message,
              icon: '/assets/images/guardian_dog_icon.png'
            });
          }
        });
      }
    } catch (error) {
      console.error('ブラウザ通知の表示に失敗しました:', error);
    }
  }

  /**
   * 通知を既読にする
   * @param id 通知ID
   */
  public markAsRead(id: string): boolean {
    const notification = this.notifications.find(n => n.id === id);
    if (!notification) {
      return false;
    }
    
    notification.read = true;
    this.emit('notification_updated', notification);
    return true;
  }

  /**
   * すべての通知を既読にする
   */
  public markAllAsRead(): void {
    this.notifications.forEach(notification => {
      notification.read = true;
    });
    
    this.emit('all_notifications_read');
  }

  /**
   * 通知を削除
   * @param id 通知ID
   */
  public removeNotification(id: string): boolean {
    const index = this.notifications.findIndex(n => n.id === id);
    if (index === -1) {
      return false;
    }
    
    const notification = this.notifications[index];
    this.notifications.splice(index, 1);
    
    this.emit('notification_removed', notification);
    return true;
  }

  /**
   * すべての通知を削除
   */
  public clearAllNotifications(): void {
    this.notifications = [];
    this.emit('all_notifications_cleared');
  }

  /**
   * すべての通知を取得
   */
  public getAllNotifications(): NotificationData[] {
    return [...this.notifications];
  }

  /**
   * 未読の通知を取得
   */
  public getUnreadNotifications(): NotificationData[] {
    return this.notifications.filter(n => !n.read);
  }

  /**
   * 通知設定を有効/無効にする
   * @param enabled 有効にする場合はtrue
   */
  public setNotificationsEnabled(enabled: boolean): void {
    this.notificationsEnabled = enabled;
    localStorage.setItem('notificationsEnabled', enabled.toString());
  }

  /**
   * 犬の鳴き声を有効/無効にする
   * @param enabled 有効にする場合はtrue
   */
  public setDogBarkEnabled(enabled: boolean): void {
    this.dogBarkEnabled = enabled;
    localStorage.setItem('dogBarkEnabled', enabled.toString());
  }

  /**
   * 犬の鳴き声のボリュームを設定
   * @param volume ボリューム（0-100）
   */
  public setDogBarkVolume(volume: number): void {
    if (volume < 0 || volume > 100) {
      return;
    }
    
    this.dogBarkVolume = volume;
    localStorage.setItem('dogBarkVolume', volume.toString());
  }

  /**
   * 通知が有効かどうかを取得
   */
  public isNotificationsEnabled(): boolean {
    return this.notificationsEnabled;
  }

  /**
   * 犬の鳴き声が有効かどうかを取得
   */
  public isDogBarkEnabled(): boolean {
    return this.dogBarkEnabled;
  }

  /**
   * 犬の鳴き声のボリュームを取得
   */
  public getDogBarkVolume(): number {
    return this.dogBarkVolume;
  }
}

// シングルトンインスタンスをエクスポート
export const alertService = new AlertService();
export default alertService;
