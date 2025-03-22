import type { MetaMaskSDK } from '@metamask/sdk';
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
  private ethereum: EthereumProvider | null = null;
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.JsonRpcSigner | null = null;
  private isConnected: boolean = false;
  private accounts: string[] = [];
  private chainId: string = '';
  private listeners: Map<string, Function[]> = new Map();

  /**
   * MetaMask SDKを初期化します
   */
  public async initialize(): Promise<{ success: boolean; error?: string }> {
    try {
      if (this.sdk && this.ethereum) {
        return { success: true };
      }

      const initResult = await this.initializeSDK();
      if (!initResult.success) {
        return initResult;
      }

      await this.setupEventListeners();
      await this.handleConnect();
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'MetaMask SDKの初期化に失敗しました';
      console.error(`MetaMask初期化エラー: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  private async initializeSDK(): Promise<{ success: boolean; error?: string }> {
    if (typeof window === 'undefined') {
      return {
        success: false,
        error: 'ブラウザ環境でのみ実行可能です'
      };
    }

    if (!window.ethereum) {
      return {
        success: false,
        error: 'MetaMaskがインストールされていません。MetaMaskをインストールしてください。'
      };
    }

    if (!window.ethereum.isMetaMask) {
      return {
        success: false,
        error: 'MetaMaskが検出されましたが、正しく動作していない可能性があります。ブラウザを再起動してください。'
      };
    }

    try {
      const { MetaMaskSDK } = await import('@metamask/sdk');
      const sdkOptions = {
        dappMetadata: {
          name: 'GuardianAI',
          url: window.location.origin,
        },
        storage: { enabled: true },
        communicationLayerPreference: CommunicationLayerPreference.SOCKET,
        logging: { developerMode: IS_DEV_MODE },
        enableDebug: true,
        checkInstallationImmediately: false,
        shouldShimWeb3: true,
        useDeeplink: false,
        preferDesktop: true,
      };

      this.sdk = new MetaMaskSDK(sdkOptions);
      this.ethereum = this.sdk.getProvider() as EthereumProvider;

      if (!this.ethereum) {
        return {
          success: false,
          error: 'MetaMaskとの接続に失敗しました。ページを再読み込みしてください。'
        };
      }

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'MetaMask SDKの初期化に失敗しました';
      console.error(`MetaMask初期化エラー: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  private async setupEventListeners(): Promise<void> {
    if (!this.ethereum) return;

    this.ethereum.on('accountsChanged', (accounts: string[]) => {
      this.accounts = accounts;
      this.isConnected = accounts.length > 0;
      this.emitEvent('accountsChanged', { accounts });
    });

    this.ethereum.on('chainChanged', (chainId: string) => {
      this.chainId = chainId;
      this.emitEvent('chainChanged', { chainId });
    });

    this.ethereum.on('connect', (connectInfo: unknown) => {
      this.isConnected = true;
      this.emitEvent('connect', connectInfo);
    });

    this.ethereum.on('disconnect', (error: unknown) => {
      this.isConnected = false;
      this.accounts = [];
      this.emitEvent('disconnect', error);
    });
  }

  private async handleConnect(): Promise<void> {
    if (!this.ethereum) return;

    try {
      const accounts = await this.ethereum.request({
        method: 'eth_accounts',
      });
      this.accounts = accounts;

      const chainId = await this.ethereum.request({
        method: 'eth_chainId',
      });
      this.chainId = chainId;

      this.isConnected = accounts.length > 0;
      await this.setupProvider();
      this.emitEvent('connect', { chainId });
    } catch (error) {
      console.error('接続ハンドラーでエラーが発生しました:', error);
    }
  }

  private async setupProvider(): Promise<void> {
    if (!this.ethereum) {
      throw new Error('MetaMask SDKが初期化されていません');
    }

    this.provider = new ethers.BrowserProvider(this.ethereum);
    this.signer = await this.provider.getSigner();
  }

  private emitEvent(event: string, data: unknown): void {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`イベントリスナー実行中にエラーが発生しました (${event}):`, error);
      }
    });
  }

  public async connect(): Promise<string[]> {
    if (!this.ethereum) {
      throw new Error('MetaMask SDKが初期化されていません');
    }

    const accounts = await this.ethereum.request({
      method: 'eth_requestAccounts',
    });

    return accounts;
  }

  public getAccounts(): string[] {
    return this.accounts;
  }

  public getChainId(): string {
    return this.chainId;
  }

  public getProvider(): EthereumProvider | null {
    return this.ethereum;
  }

  public isWalletConnected(): boolean {
    return this.isConnected && this.accounts.length > 0;
  }

  public async sendTransaction(transaction: ethers.TransactionRequest): Promise<string> {
    if (!this.signer) {
      await this.setupProvider();
      if (!this.signer) {
        throw new Error('署名者が利用できません');
      }
    }

    const tx = await this.signer.sendTransaction(transaction);
    return tx.hash;
  }

  public on(event: string, callback: (data: unknown) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);
  }

  public off(event: string, callback: Function): void {
    const callbacks = this.listeners.get(event) || [];
    const index = callbacks.indexOf(callback);
    if (index !== -1) {
      callbacks.splice(index, 1);
    }
  }

  public async disconnect(): Promise<boolean> {
    if (!this.ethereum) return true;

    try {
      await this.ethereum.request({
        method: 'wallet_disconnect',
      });

      this.isConnected = false;
      this.accounts = [];
      this.provider = null;
      this.signer = null;
      this.emitEvent('disconnect', {});

      return true;
    } catch (error) {
      console.error('MetaMaskとの切断に失敗しました:', error);
      return false;
    }
  }
}

// シングルトンインスタンスをエクスポート
export const metaMaskService = new MetaMaskService();
export default metaMaskService;
