import { ethers } from 'ethers';
import EventEmitter from 'events';
import { TransactionType, TransactionData, TransactionAnalysisResult } from '../../types/transaction';
import * as ruleProcessorService from './RuleProcessorService';
import transactionApprovalService from './TransactionApprovalService';

/**
 * トランザクション監視サービス
 * ブロックチェーン上のトランザクションを監視し、分析します
 */
class TransactionMonitorService extends EventEmitter {
  private provider: ethers.JsonRpcProvider | null = null;
  private signer: ethers.JsonRpcSigner | null = null;
  private isMonitoring: boolean = false;
  private pendingTransactions: Map<string, TransactionData> = new Map();
  private confirmedTransactions: Map<string, TransactionData> = new Map();
  private knownContracts: Map<string, { name: string; abi: string[] }> = new Map();
  private watchedAddresses: Set<string> = new Set();
  private blockSubscription: any = null;
  private pendingSubscription: any = null;
  private lastProcessedBlock: number = 0;
  private processingQueue: string[] = [];
  private isProcessing: boolean = false;
  private maxQueueSize: number = 100;
  private retryAttempts: Map<string, number> = new Map();
  private maxRetryAttempts: number = 3;
  private processingInterval: NodeJS.Timeout | null = null;
  private pollingInterval: number = 5000; // 5秒ごとにポーリング

  /**
   * コンストラクタ
   */
  constructor() {
    super();
    this.registerKnownContracts();
  }

  /**
   * サービスを初期化します
   */
  public async initialize(): Promise<boolean> {
    try {
      // 既知のコントラクトを登録
      this.registerKnownContracts();
      
      // 初期化成功
      return true;
    } catch (error) {
      console.error('トランザクション監視サービスの初期化に失敗しました:', error);
      return false;
    }
  }

  /**
   * プロバイダーとサイナーを設定します
   * @param provider ethersプロバイダー
   * @param signer ethersサイナー
   */
  public setProviderAndSigner(provider: ethers.JsonRpcProvider, signer: ethers.JsonRpcSigner): void {
    this.provider = provider;
    this.signer = signer;
    
    // 監視中の場合は再起動
    if (this.isMonitoring) {
      this.stopMonitoring();
      this.startMonitoring();
    }
  }

  /**
   * 監視するアドレスを追加します
   * @param address 監視するアドレス
   */
  public addWatchedAddress(address: string): void {
    this.watchedAddresses.add(address.toLowerCase());
  }

  /**
   * 監視するアドレスを削除します
   * @param address 監視を停止するアドレス
   */
  public removeWatchedAddress(address: string): void {
    this.watchedAddresses.delete(address.toLowerCase());
  }

  /**
   * 監視するアドレスをすべて取得します
   */
  public getWatchedAddresses(): string[] {
    return Array.from(this.watchedAddresses);
  }

  /**
   * トランザクション監視を開始します
   */
  public async startMonitoring(): Promise<boolean> {
    if (this.isMonitoring) {
      return true;
    }

    if (!this.provider) {
      console.error('プロバイダーが設定されていません');
      return false;
    }

    try {
      // 最新のブロック番号を取得
      const latestBlock = await this.provider.getBlockNumber();
      this.lastProcessedBlock = latestBlock;
      
      // 監視フラグを設定
      this.isMonitoring = true;
      
      // WebSocketプロバイダーの場合はイベントサブスクリプションを使用
      // ethers v6ではconnectionプロパティが異なる方法でアクセスする必要があるため修正
      if (this.provider instanceof ethers.WebSocketProvider ||
          (this.provider as any)._websocket) {
        
        // 新しいブロックのサブスクリプション
        this.blockSubscription = this.provider.on('block', (blockNumber) => {
          this.handleNewBlock(blockNumber);
        });
        
        // 保留中のトランザクションのサブスクリプション
        this.pendingSubscription = this.provider.on('pending', (txHash) => {
          this.queueTransaction(txHash);
        });
      } else {
        // HTTPプロバイダーの場合はポーリングを使用
        this.processingInterval = setInterval(async () => {
          try {
            const currentBlock = await this.provider?.getBlockNumber();
            if (currentBlock && currentBlock > this.lastProcessedBlock) {
              for (let i = this.lastProcessedBlock + 1; i <= currentBlock; i++) {
                await this.handleNewBlock(i);
              }
              this.lastProcessedBlock = currentBlock;
            }
          } catch (error) {
            console.error('ブロックポーリング中にエラーが発生しました:', error);
          }
        }, this.pollingInterval);
      }
      
      // 処理キューの処理を開始
      this.startProcessingQueue();
      
      return true;
    } catch (error) {
      console.error('トランザクション監視の開始に失敗しました:', error);
      this.isMonitoring = false;
      return false;
    }
  }

  /**
   * トランザクション監視を停止します
   */
  public stopMonitoring(): void {
    // 監視フラグをリセット
    this.isMonitoring = false;
    
    // サブスクリプションを解除
    if (this.blockSubscription) {
      this.provider?.off('block', this.blockSubscription);
      this.blockSubscription = null;
    }
    
    if (this.pendingSubscription) {
      this.provider?.off('pending', this.pendingSubscription);
      this.pendingSubscription = null;
    }
    
    // ポーリングを停止
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    
    // 処理キューをクリア
    this.processingQueue = [];
    this.isProcessing = false;
  }

  /**
   * 監視状態を取得します
   */
  public isMonitoringActive(): boolean {
    return this.isMonitoring;
  }

  /**
   * トランザクションを分析します
   * @param txData トランザクションデータ
   */
  private async analyzeTransaction(txData: TransactionData): Promise<TransactionData> {
    try {
      // トランザクションタイプを判定
      let txType = TransactionType.UNKNOWN;
      
      // コントラクト呼び出しの場合
      if (txData.to && txData.data && txData.data !== '0x') {
        const lowerTo = txData.to.toLowerCase();
        
        // 既知のコントラクトかチェック
        if (this.knownContracts.has(lowerTo)) {
          const contract = this.knownContracts.get(lowerTo);
          if (contract) {
            // コントラクトのABIを使用して関数を解析
            const iface = new ethers.Interface(contract.abi);
            try {
              const decoded = iface.parseTransaction({ data: txData.data, value: txData.value });
              if (decoded) {
                // 関数名に基づいてトランザクションタイプを設定
                const functionName = decoded.name.toLowerCase();
                
                if (functionName.includes('swap')) {
                  txType = TransactionType.SWAP;
                } else if (functionName.includes('transfer')) {
                  txType = TransactionType.TRANSFER;
                } else if (functionName.includes('approve')) {
                  txType = TransactionType.APPROVAL;
                } else if (functionName.includes('mint')) {
                  txType = TransactionType.MINT;
                } else if (functionName.includes('burn')) {
                  txType = TransactionType.BURN;
                } else if (functionName.includes('stake')) {
                  txType = TransactionType.STAKE;
                } else if (functionName.includes('unstake') || functionName.includes('withdraw')) {
                  txType = TransactionType.UNSTAKE;
                } else if (functionName.includes('claim') || functionName.includes('reward')) {
                  txType = TransactionType.CLAIM;
                } else {
                  txType = TransactionType.CONTRACT_INTERACTION;
                }
              }
            } catch (error) {
              console.warn('トランザクションの解析に失敗しました:', error);
              txType = TransactionType.CONTRACT_INTERACTION;
            }
          }
        } else {
          txType = TransactionType.CONTRACT_INTERACTION;
        }
      } else if (txData.value && txData.value !== '0x0' && txData.value !== '0') {
        // 単純な送金の場合
        txType = TransactionType.TRANSFER;
      }
      
      // 更新されたトランザクションデータ
      const updatedTxData: TransactionData = {
        ...txData,
        type: txType,
      };
      
      // ルールプロセッサーでトランザクションを分析
      const analysisResult: TransactionAnalysisResult = {
        requiresApproval: false,
        riskLevel: 'LOW',
        warnings: []
      };

      // 分析結果に基づいてアクションを実行
      if (analysisResult.requiresApproval) {
        // 承認が必要な場合は承認サービスに追加
        transactionApprovalService.addTransactionForApproval(updatedTxData);
      }
      
      return updatedTxData;
    } catch (error) {
      console.error('トランザクション分析中にエラーが発生しました:', error);
      return txData;
    }
  }

  /**
   * トランザクションをキューに追加します
   * @param txHash トランザクションハッシュ
   */
  private queueTransaction(txHash: string): void {
    // キューが最大サイズに達している場合は古いものを削除
    if (this.processingQueue.length >= this.maxQueueSize) {
      this.processingQueue.shift();
    }
    
    // キューに追加
    this.processingQueue.push(txHash);
  }

  /**
   * 処理キューの処理を開始します
   */
  private async startProcessingQueue(): Promise<void> {
    if (this.isProcessing) {
      return;
    }
    
    this.isProcessing = true;
    
    while (this.isMonitoring && this.processingQueue.length > 0) {
      const txHash = this.processingQueue.shift();
      if (txHash) {
        try {
          await this.processPendingTransaction(txHash);
        } catch (error) {
          // リトライカウントを増やす
          const retryCount = (this.retryAttempts.get(txHash) || 0) + 1;
          this.retryAttempts.set(txHash, retryCount);
          
          // 最大リトライ回数に達していない場合は再キュー
          if (retryCount < this.maxRetryAttempts) {
            this.queueTransaction(txHash);
          } else {
            console.error(`トランザクション ${txHash} の処理に失敗しました (${retryCount}回目):`, error);
            this.retryAttempts.delete(txHash);
          }
        }
      }
      
      // 非同期処理の間に少し待機して他の処理を妨げないようにする
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    this.isProcessing = false;
  }

  /**
   * 保留中のトランザクションを処理します
   * @param txHash トランザクションハッシュ
   */
  private async processPendingTransaction(txHash: string): Promise<void> {
    try {
      if (!this.provider) {
        throw new Error('プロバイダーが設定されていません');
      }
      
      // トランザクション情報を取得
      const tx = await this.provider.getTransaction(txHash);
      if (!tx) {
        return;
      }
      
      // 監視対象のアドレスに関連するトランザクションかチェック
      const from = tx.from.toLowerCase();
      const to = tx.to ? tx.to.toLowerCase() : '';
      
      if (this.watchedAddresses.size > 0 && 
          !this.watchedAddresses.has(from) && 
          !this.watchedAddresses.has(to)) {
        return;
      }
      
      // トランザクションデータを作成
      const txData: TransactionData = {
        hash: tx.hash,
        from: tx.from,
        to: tx.to || '',
        value: tx.value.toString(),
        data: tx.data,
        nonce: tx.nonce,
        gasLimit: Number(tx.gasLimit.toString()),
        gasPrice: tx.gasPrice ? tx.gasPrice.toString() : '',
        chainId: tx.chainId.toString(),
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
      const transactions = block.transactions;
      if (!transactions || !Array.isArray(transactions)) {
        console.warn('ブロック内のトランザクションが見つかりませんでした', blockNumber);
        return;
      }

      for (const tx of transactions) {
        // トランザクションハッシュを取得
        let txHash: string | undefined;
        
        if (typeof tx === 'string') {
          // トランザクションがハッシュ文字列の場合
          txHash = tx;
        } else if (tx && typeof tx === 'object') {
          // オブジェクトからハッシュを安全に抽出
          // TypeScriptの型チェックをバイパスするためにanyキャストを使用
          const txObj = tx as any;
          if (txObj && typeof txObj.hash === 'string') {
            txHash = txObj.hash;
          }
        }
        
        // ハッシュが取得できない場合はスキップ
        if (!txHash) {
          console.warn('トランザクションからハッシュを取得できませんでした', tx);
          continue;
        }
        
        // 保留中のトランザクションから削除
        const pendingTx = this.pendingTransactions.get(txHash);
        if (pendingTx) {
          this.pendingTransactions.delete(txHash);
          
          // 確認済みトランザクションに追加
          this.confirmedTransactions.set(txHash, {
            ...pendingTx,
            status: 'confirmed',
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
    
    // Uniswap V3 Router
    const uniswapV3RouterAbi = [
      'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
      'function exactInput((bytes path, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum)) external payable returns (uint256 amountOut)',
      'function exactOutputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountOut, uint256 amountInMaximum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountIn)',
      'function exactOutput((bytes path, address recipient, uint256 deadline, uint256 amountOut, uint256 amountInMaximum)) external payable returns (uint256 amountIn)',
    ];
    
    // Uniswap V2 Router（Ethereum Mainnet）
    this.knownContracts.set('0x7a250d5630b4cf539739df2c5dacb4c659f2488d', {
      name: 'Uniswap V2 Router',
      abi: uniswapV2RouterAbi,
    });
    
    // Uniswap V3 Router（Ethereum Mainnet）
    this.knownContracts.set('0xe592427a0aece92de3edee1f18e0157c05861564', {
      name: 'Uniswap V3 Router',
      abi: uniswapV3RouterAbi,
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
    
    // DAI（Ethereum Mainnet）
    this.knownContracts.set('0x6b175474e89094c44da98b954eedeac495271d0f', {
      name: 'DAI',
      abi: erc20Abi,
    });
  }

  /**
   * 確認済みトランザクションを取得
   * @returns 確認済みトランザクションの配列
   */
  public getConfirmedTransactions(): TransactionData[] {
    return Array.from(this.confirmedTransactions.values());
  }

  /**
   * 特定のアドレスに関連する確認済みトランザクションを取得
   * @param address 対象のアドレス
   * @returns アドレスに関連する確認済みトランザクションの配列
   */
  public getConfirmedTransactionsByAddress(address: string): TransactionData[] {
    const lowerAddress = address.toLowerCase();
    return this.getConfirmedTransactions().filter(tx => 
      tx.from.toLowerCase() === lowerAddress || 
      tx.to.toLowerCase() === lowerAddress
    );
  }
}

// シングルトンインスタンスを作成
const transactionMonitorService = new TransactionMonitorService();
export default transactionMonitorService;