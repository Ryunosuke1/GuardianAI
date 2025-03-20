import { ethers } from 'ethers';
import metaMaskService from '../metamask/MetaMaskService';
import { EventEmitter } from 'events';

// トランザクションタイプの定義
export enum TransactionType {
  TRANSFER = 'transfer',
  SWAP = 'swap',
  APPROVAL = 'approval',
  CONTRACT_INTERACTION = 'contract_interaction',
  UNKNOWN = 'unknown'
}

// トランザクションデータの型定義
export interface TransactionData {
  hash: string;
  from: string;
  to: string;
  value: string;
  data: string;
  gasLimit: string;
  gasPrice: string;
  nonce: number;
  chainId: number;
  type: TransactionType;
  timestamp: number;
  decodedData?: any;
}

// トランザクション監視サービスクラス
class TransactionMonitorService extends EventEmitter {
  private isMonitoring: boolean = false;
  private pendingTransactions: Map<string, TransactionData> = new Map();
  private confirmedTransactions: Map<string, TransactionData> = new Map();
  private provider: ethers.BrowserProvider | null = null;
  private knownContracts: Map<string, { name: string, abi: any }> = new Map();

  /**
   * トランザクション監視サービスを初期化
   */
  public async initialize(): Promise<boolean> {
    try {
      if (!metaMaskService.isWalletConnected()) {
        console.warn('ウォレットが接続されていません。トランザクション監視を開始できません。');
        return false;
      }

      // プロバイダーを設定
      this.provider = new ethers.BrowserProvider(metaMaskService.ethereum);
      
      // 既知のコントラクトを登録
      this.registerKnownContracts();
      
      return true;
    } catch (error) {
      console.error('トランザクション監視サービスの初期化に失敗しました:', error);
      return false;
    }
  }

  /**
   * トランザクション監視を開始
   */
  public startMonitoring(): boolean {
    if (this.isMonitoring) {
      return true;
    }

    if (!this.provider) {
      console.error('プロバイダーが初期化されていません。');
      return false;
    }

    try {
      // 保留中のトランザクションを監視
      this.provider.on('pending', this.handlePendingTransaction.bind(this));
      
      // ブロック生成を監視
      this.provider.on('block', this.handleNewBlock.bind(this));
      
      this.isMonitoring = true;
      this.emit('monitoring_started');
      
      return true;
    } catch (error) {
      console.error('トランザクション監視の開始に失敗しました:', error);
      return false;
    }
  }

  /**
   * トランザクション監視を停止
   */
  public stopMonitoring(): boolean {
    if (!this.isMonitoring || !this.provider) {
      return true;
    }

    try {
      // イベントリスナーを削除
      this.provider.removeAllListeners('pending');
      this.provider.removeAllListeners('block');
      
      this.isMonitoring = false;
      this.emit('monitoring_stopped');
      
      return true;
    } catch (error) {
      console.error('トランザクション監視の停止に失敗しました:', error);
      return false;
    }
  }

  /**
   * トランザクションを分析
   * @param transaction トランザクションデータ
   */
  public async analyzeTransaction(transaction: TransactionData): Promise<TransactionData> {
    try {
      // トランザクションタイプを判定
      const type = await this.determineTransactionType(transaction);
      
      // トランザクションデータを更新
      const analyzedTransaction: TransactionData = {
        ...transaction,
        type,
      };
      
      // データフィールドをデコード
      if (transaction.data && transaction.data !== '0x') {
        const decodedData = await this.decodeTransactionData(transaction);
        if (decodedData) {
          analyzedTransaction.decodedData = decodedData;
        }
      }
      
      return analyzedTransaction;
    } catch (error) {
      console.error('トランザクション分析に失敗しました:', error);
      return {
        ...transaction,
        type: TransactionType.UNKNOWN,
      };
    }
  }

  /**
   * トランザクションタイプを判定
   * @param transaction トランザクションデータ
   */
  private async determineTransactionType(transaction: TransactionData): Promise<TransactionType> {
    // データフィールドが空の場合は単純な送金
    if (!transaction.data || transaction.data === '0x') {
      return TransactionType.TRANSFER;
    }

    // データフィールドの最初の4バイトを取得（関数シグネチャ）
    const functionSignature = transaction.data.slice(0, 10);

    // 承認関数のシグネチャ（approve）
    if (functionSignature === '0x095ea7b3') {
      return TransactionType.APPROVAL;
    }

    // スワップ関連の関数シグネチャ
    const swapSignatures = [
      '0x38ed1739', // swapExactTokensForTokens
      '0x7ff36ab5', // swapExactETHForTokens
      '0x18cbafe5', // swapExactTokensForETH
      '0x4a25d94a', // swapTokensForExactETH
      '0x5c11d795', // swapExactTokensForTokensSupportingFeeOnTransferTokens
    ];

    if (swapSignatures.includes(functionSignature)) {
      return TransactionType.SWAP;
    }

    // その他のコントラクト操作
    return TransactionType.CONTRACT_INTERACTION;
  }

  /**
   * トランザクションデータをデコード
   * @param transaction トランザクションデータ
   */
  private async decodeTransactionData(transaction: TransactionData): Promise<any | null> {
    try {
      // コントラクトアドレスを取得
      const contractAddress = transaction.to;
      
      // 既知のコントラクトかチェック
      const contractInfo = this.knownContracts.get(contractAddress.toLowerCase());
      if (!contractInfo) {
        return null;
      }
      
      // インターフェースを作成
      const iface = new ethers.Interface(contractInfo.abi);
      
      // データをデコード
      const decoded = iface.parseTransaction({ data: transaction.data });
      
      return {
        name: contractInfo.name,
        function: decoded.name,
        args: decoded.args,
      };
    } catch (error) {
      console.error('トランザクションデータのデコードに失敗しました:', error);
      return null;
    }
  }

  /**
   * 保留中のトランザクションを処理
   * @param txHash トランザクションハッシュ
   */
  private async handlePendingTransaction(txHash: string): Promise<void> {
    try {
      // 既に処理済みのトランザクションはスキップ
      if (this.pendingTransactions.has(txHash) || this.confirmedTransactions.has(txHash)) {
        return;
      }
      
      // トランザクション情報を取得
      const tx = await this.provider?.getTransaction(txHash);
      if (!tx) {
        return;
      }
      
      // トランザクションデータを作成
      const txData: TransactionData = {
        hash: tx.hash,
        from: tx.from,
        to: tx.to || '',
        value: tx.value.toString(),
        data: tx.data,
        gasLimit: tx.gasLimit.toString(),
        gasPrice: tx.gasPrice?.toString() || '0',
        nonce: tx.nonce,
        chainId: tx.chainId,
        type: TransactionType.UNKNOWN,
        timestamp: Date.now(),
      };
      
      // トランザクションを分析
      const analyzedTx = await this.analyzeTransaction(txData);
      
      // 保留中のトランザクションに追加
      this.pendingTransactions.set(txHash, analyzedTx);
      
      // イベントを発火
      this.emit('pending_transaction', analyzedTx);
    } catch (error) {
      console.error('保留中のトランザクション処理に失敗しました:', error);
    }
  }

  /**
   * 新しいブロックを処理
   * @param blockNumber ブロック番号
   */
  private async handleNewBlock(blockNumber: number): Promise<void> {
    try {
      // ブロック情報を取得
      const block = await this.provider?.getBlock(blockNumber, true);
      if (!block) {
        return;
      }
      
      // ブロック内のトランザクションを処理
      for (const tx of block.transactions) {
        // トランザクションハッシュを取得
        const txHash = typeof tx === 'string' ? tx : tx.hash;
        
        // 保留中のトランザクションから削除
        const pendingTx = this.pendingTransactions.get(txHash);
        if (pendingTx) {
          this.pendingTransactions.delete(txHash);
          
          // 確認済みトランザクションに追加
          this.confirmedTransactions.set(txHash, {
            ...pendingTx,
            timestamp: Date.now(),
          });
          
          // イベントを発火
          this.emit('confirmed_transaction', pendingTx);
        }
      }
    } catch (error) {
      console.error('新しいブロック処理に失敗しました:', error);
    }
  }

  /**
   * 既知のコントラクトを登録
   */
  private registerKnownContracts(): void {
    // ERC20トークン
    const erc20Abi = [
      'function transfer(address to, uint256 value) returns (bool)',
      'function approve(address spender, uint256 value) returns (bool)',
      'function transferFrom(address from, address to, uint256 value) returns (bool)',
      'function totalSupply() view returns (uint256)',
      'function balanceOf(address owner) view returns (uint256)',
      'function allowance(address owner, address spender) view returns (uint256)',
      'event Transfer(address indexed from, address indexed to, uint256 value)',
      'event Approval(address indexed owner, address indexed spender, uint256 value)',
    ];

    // Uniswap V2 Router
    const uniswapV2RouterAbi = [
      'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
      'function swapTokensForExactTokens(uint amountOut, uint amountInMax, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
      'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)',
      'function swapTokensForExactETH(uint amountOut, uint amountInMax, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
      'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
      'function swapETHForExactTokens(uint amountOut, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)',
    ];

    // Uniswap V2 Router（Ethereum Mainnet）
    this.knownContracts.set('0x7a250d5630b4cf539739df2c5dacb4c659f2488d', {
      name: 'Uniswap V2 Router',
      abi: uniswapV2RouterAbi,
    });

    // Sushiswap Router（Ethereum Mainnet）
    this.knownContracts.set('0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f', {
      name: 'Sushiswap Router',
      abi: uniswapV2RouterAbi,
    });

    // WETH（Ethereum Mainnet）
    this.knownContracts.set('0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', {
      name: 'WETH',
      abi: erc20Abi,
    });

    // USDT（Ethereum Mainnet）
    this.knownContracts.set('0xdac17f958d2ee523a2206206994597c13d831ec7', {
      name: 'USDT',
      abi: erc20Abi,
    });

    // USDC（Ethereum Mainnet）
    this.knownContracts.set('0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', {
      name: 'USDC',
      abi: erc20Abi,
    });
  }

  /**
   * 保留中のトランザクションを取得
   */
  public getPendingTransactions(): TransactionData[] {
    return Array.from(this.pendingTransactions.values());
  }

  /**
   * 確認済みトランザクションを取得
   */
  public getConfirmedTransactions(): TransactionData[] {
    return Array.from(this.confirmedTransactions.values());
  }

  /**
   * 特定のアドレスのトランザクションを取得
   * @param address アドレス
   */
  public getTransactionsByAddress(address: string): TransactionData[] {
    const lowerAddress = address.toLowerCase();
    
    // 保留中と確認済みのトランザクションを結合
    const allTransactions = [
      ...this.getPendingTransactions(),
      ...this.getConfirmedTransactions(),
    ];
    
    // アドレスでフィルタリング
    return allTransactions.filter(tx => 
      tx.from.toLowerCase() === lowerAddress || 
      tx.to.toLowerCase() === lowerAddress
    );
  }
}

// シングルトンインスタンスをエクスポート
export const transactionMonitorService = new TransactionMonitorService();
export default transactionMonitorService;
