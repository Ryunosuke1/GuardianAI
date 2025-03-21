import { MetaMaskSDK } from '@metamask/sdk';
import { ethers } from 'ethers';
import { CommunicationLayerPreference } from '@metamask/sdk-communication-layer';

// 開発モードフラグの定義
const IS_DEV_MODE = process.env.NODE_ENV === 'development';

/**
 * MetaMaskサービスクラス
 * MetaMask SDKとの統合を管理し、ウォレット接続、トランザクション署名、
 * アカウント情報の取得などの機能を提供します。
 */
class MetaMaskService {
  private sdk: MetaMaskSDK | null = null;
  private ethereum: any = null;
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.JsonRpcSigner | null = null;
  private isConnected: boolean = false;
  private accounts: string[] = [];
  private chainId: string = '';
  private listeners: Map<string, Function[]> = new Map();

  /**
   * MetaMask SDKを初期化します
   */
  public async initialize(): Promise<boolean> {
    try {
      // SDKのインスタンスを作成
      this.sdk = new MetaMaskSDK({
        // アプリの識別情報
        dappMetadata: {
          name: 'GuardianAI',
          url: 'https://guardianai.app',
        },
        // 接続設定
        storage: {
          enabled: true,
        },
        // 通信設定 - Socket.ioをデフォルトとして使用
        communicationLayerPreference: CommunicationLayerPreference.SOCKET,
        // ログ設定
        logging: {
          developerMode: IS_DEV_MODE,
        },
      });

      // ethereumオブジェクトを取得
      this.ethereum = this.sdk.getProvider();
      
      // イベントリスナーを設定
      this.setupEventListeners();
      
      // 初期接続処理
      await this.handleConnect();
      
      return true;
    } catch (error) {
      console.error('MetaMask SDKの初期化に失敗しました:', error);
      return false;
    }
  }

  /**
   * MetaMaskウォレットへの接続を要求します
   */
  public async connect(): Promise<string[]> {
    try {
      if (!this.ethereum) {
        throw new Error('MetaMask SDKが初期化されていません');
      }

      // アカウントへのアクセスを要求
      const accounts = await this.ethereum.request({
        method: 'eth_requestAccounts',
      });

      return accounts;
    } catch (error) {
      console.error('MetaMaskへの接続に失敗しました:', error);
      throw error;
    }
  }

  /**
   * 接続されたアカウントを取得します
   */
  public getAccounts(): string[] {
    return this.accounts;
  }

  /**
   * 現在のチェーンIDを取得します
   */
  public getChainId(): string {
    return this.chainId;
  }

  /**
   * 接続状態を取得します
   */
  public isWalletConnected(): boolean {
    return this.isConnected && this.accounts.length > 0;
  }

  /**
   * トランザクションに署名して送信します
   * @param transaction トランザクションオブジェクト
   */
  public async sendTransaction(transaction: ethers.TransactionRequest): Promise<string> {
    try {
      if (!this.signer) {
        await this.setupProvider();
        if (!this.signer) {
          throw new Error('署名者が利用できません');
        }
      }

      // トランザクションを送信
      const tx = await this.signer.sendTransaction(transaction);
      
      // トランザクションハッシュを返す
      return tx.hash;
    } catch (error) {
      console.error('トランザクション送信に失敗しました:', error);
      throw error;
    }
  }

  /**
   * メッセージに署名します
   * @param message 署名するメッセージ
   */
  public async signMessage(message: string): Promise<string> {
    try {
      if (!this.signer) {
        await this.setupProvider();
        if (!this.signer) {
          throw new Error('署名者が利用できません');
        }
      }

      // メッセージに署名
      const signature = await this.signer.signMessage(message);
      return signature;
    } catch (error) {
      console.error('メッセージ署名に失敗しました:', error);
      throw error;
    }
  }

  /**
   * 暗号化されたデータをブラウザのローカルストレージに保存します
   * @param key キー
   * @param value 値
   */
  public async secureStore(key: string, value: string): Promise<boolean> {
    try {
      if (!this.ethereum || !this.isConnected) {
        throw new Error('MetaMaskに接続されていません');
      }

      // データを暗号化して保存
      const encryptedData = await this.ethereum.request({
        method: 'eth_encrypt',
        params: [value, this.accounts[0]],
      });

      // 暗号化されたデータをブラウザのローカルストレージに保存
      localStorage.setItem(`secure_${key}`, encryptedData);
      return true;
    } catch (error) {
      console.error('セキュアストレージへの保存に失敗しました:', error);
      return false;
    }
  }

  /**
   * 暗号化されたデータをブラウザのローカルストレージから取得します
   * @param key キー
   */
  public async secureRetrieve(key: string): Promise<string | null> {
    try {
      if (!this.ethereum || !this.isConnected) {
        throw new Error('MetaMaskに接続されていません');
      }

      // 暗号化されたデータをブラウザのローカルストレージから取得
      const encryptedData = localStorage.getItem(`secure_${key}`);
      if (!encryptedData) {
        return null;
      }

      // データを復号化
      const decryptedData = await this.ethereum.request({
        method: 'eth_decrypt',
        params: [encryptedData, this.accounts[0]],
      });

      return decryptedData;
    } catch (error) {
      console.error('セキュアストレージからの取得に失敗しました:', error);
      return null;
    }
  }

  /**
   * イベントリスナーを登録します
   * @param event イベント名
   * @param callback コールバック関数
   */
  public on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);
  }

  /**
   * イベントリスナーを削除します
   * @param event イベント名
   * @param callback コールバック関数
   */
  public off(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      return;
    }
    const callbacks = this.listeners.get(event) || [];
    const index = callbacks.indexOf(callback);
    if (index !== -1) {
      callbacks.splice(index, 1);
    }
  }

  /**
   * MetaMaskとの接続を切断します
   */
  public async disconnect(): Promise<boolean> {
    try {
      if (!this.ethereum) {
        return true;
      }

      // 接続を切断
      await this.ethereum.request({
        method: 'wallet_disconnect',
      });

      // 状態をリセット
      this.isConnected = false;
      this.accounts = [];
      this.provider = null;
      this.signer = null;

      // イベントを発火
      this.emitEvent('disconnect', {});

      return true;
    } catch (error) {
      console.error('MetaMaskとの切断に失敗しました:', error);
      return false;
    }
  }

  /**
   * ethersプロバイダーとサイナーをセットアップします
   */
  private async setupProvider(): Promise<void> {
    if (!this.ethereum) {
      throw new Error('MetaMask SDKが初期化されていません');
    }

    // ethersプロバイダーを作成
    this.provider = new ethers.BrowserProvider(this.ethereum);
    
    // サイナーを取得
    this.signer = await this.provider.getSigner();
  }

  /**
   * イベントリスナーをセットアップします
   */
  private setupEventListeners(): void {
    if (!this.ethereum) {
      return;
    }

    // アカウント変更イベント
    this.ethereum.on('accountsChanged', (accounts: string[]) => {
      this.accounts = accounts;
      this.isConnected = accounts.length > 0;
      this.emitEvent('accountsChanged', { accounts });
    });

    // チェーン変更イベント
    this.ethereum.on('chainChanged', (chainId: string) => {
      this.chainId = chainId;
      this.emitEvent('chainChanged', { chainId });
    });

    // 接続イベント
    this.ethereum.on('connect', (connectInfo: any) => {
      this.isConnected = true;
      this.emitEvent('connect', connectInfo);
    });

    // 切断イベント
    this.ethereum.on('disconnect', (error: any) => {
      this.isConnected = false;
      this.accounts = [];
      this.emitEvent('disconnect', error);
    });

    // メッセージイベント
    this.ethereum.on('message', (message: any) => {
      this.emitEvent('message', message);
    });
  }

  /**
   * 接続時のハンドラー
   */
  private async handleConnect(): Promise<void> {
    try {
      // アカウント情報を取得
      const accounts = await this.ethereum.request({
        method: 'eth_accounts',
      });
      this.accounts = accounts;

      // チェーンIDを取得
      const chainId = await this.ethereum.request({
        method: 'eth_chainId',
      });
      this.chainId = chainId;

      // 接続状態を更新
      this.isConnected = accounts.length > 0;

      // プロバイダーとサイナーをセットアップ
      await this.setupProvider();

      // 接続イベントを発火
      this.emitEvent('connect', { chainId });
    } catch (error) {
      console.error('接続ハンドラーでエラーが発生しました:', error);
    }
  }

  /**
   * イベントを発火します
   * @param event イベント名
   * @param data イベントデータ
   */
  private emitEvent(event: string, data: any): void {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`イベントリスナー実行中にエラーが発生しました (${event}):`, error);
      }
    });
  }
}

// シングルトンインスタンスをエクスポート
export const metaMaskService = new MetaMaskService();
export default metaMaskService;
