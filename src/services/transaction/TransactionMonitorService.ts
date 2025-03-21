import { EventEmitter } from 'events';
import { ethers } from 'ethers';
import metaMaskService from '../metamask/MetaMaskService';
import { TransactionType, TransactionData } from '../../types/transaction';

// 既知のコントラクト情報
interface ContractInfo {
  name: string;
  abi: string[];
}

/**
 * トランザクション監視サービス
 * ブロックチェーン上のトランザクションを監視し、分析します
 */
class TransactionMonitorService extends EventEmitter {
  private provider: ethers.Provider | null = null;
  private isMonitoring: boolean = false;
  private pendingTransactions: Map<string, TransactionData> = new Map();
  private confirmedTransactions: Map<string, TransactionData> = new Map();
  private knownContracts: Map<string, ContractInfo> = new Map();
  private monitoredAddresses: Set<string> = new Set();
  private blockSubscription: any = null;
  private pendingTxSubscription: any = null;

  /**
   * 監視サービスを初期化
   */
  public async initialize(): Promise<boolean> {
    try {
      // MetaMaskサービスからプロバイダーを取得
      const ethereum = metaMaskService.getProvider();
      if (!ethereum) {
        throw new Error('MetaMaskプロバイダーが利用できません');
      }
      
      this.provider = new ethers.BrowserProvider(ethereum);
      
      // 既知のコントラクト情報を登録
      this.registerKnownContracts();
      
      return true;
    } catch (error) {
      console.error('トランザクション監視サービスの初期化に失敗しました:', error);
      return false;
    }
  }

  /**
   * 監視を開始
   */
  public async startMonitoring(): Promise<boolean> {
    if (this.isMonitoring) {
      return true;
    }
    
    try {
      if (!this.provider) {
        await this.initialize();
        if (!this.provider) {
          throw new Error('プロバイダーが初期化されていません');
        }
      }
      
      // 新しいブロックを監視
      this.blockSubscription = this.provider.on('block', (blockNumber: number) => {
        this.handleNewBlock(blockNumber);
      });
      
      // 保留中のトランザクションを監視
      this.pendingTxSubscription = this.provider.on('pending', (txHash: string) => {
        this.handlePendingTransaction(txHash);
      });
      
      this.isMonitoring = true;
      this.emit('monitoring_started');
      
      return true;
    } catch (error) {
      console.error('監視の開始に失敗しました:', error);
      return false;
    }
  }

  /**
   * 監視を停止
   */
  public stopMonitoring(): boolean {
    if (!this.isMonitoring) {
      return true;
    }
    
    try {
      // イベントリスナーを削除
      if (this.blockSubscription) {
        this.provider?.off('block', this.blockSubscription);
        this.blockSubscription = null;
      }
      
      if (this.pendingTxSubscription) {
        this.provider?.off('pending', this.pendingTxSubscription);
        this.pendingTxSubscription = null;
      }
      
      this.isMonitoring = false;
      this.emit('monitoring_stopped');
      
      return true;
    } catch (error) {
      console.error('監視の停止に失敗しました:', error);
      return false;
    }
  }

  /**
   * 監視するアドレスを追加
   * @param address 監視するアドレス
   */
  public addMonitoredAddress(address: string): boolean {
    try {
      const normalizedAddress = address.toLowerCase();
      this.monitoredAddresses.add(normalizedAddress);
      this.emit('address_added', normalizedAddress);
      return true;
    } catch (error) {
      console.error('アドレスの追加に失敗しました:', error);
      return false;
    }
  }

  /**
   * 監視するアドレスを削除
   * @param address 削除するアドレス
   */
  public removeMonitoredAddress(address: string): boolean {
    try {
      const normalizedAddress = address.toLowerCase();
      const result = this.monitoredAddresses.delete(normalizedAddress);
      if (result) {
        this.emit('address_removed', normalizedAddress);
      }
      return result;
    } catch (error) {
      console.error('アドレスの削除に失敗しました:', error);
      return false;
    }
  }

  /**
   * 監視中のアドレス一覧を取得
   */
  public getMonitoredAddresses(): string[] {
    return Array.from(this.monitoredAddresses);
  }

  /**
   * 保留中のトランザクションを取得
   */
  public getPendingTransactions(): TransactionData[] {
    return Array.from(this.pendingTransactions.values());
  }

  /**
   * 特定のアドレスに関連する保留中のトランザクションを取得
   * @param address 対象のアドレス
   */
  public getPendingTransactionsByAddress(address: string): TransactionData[] {
    const lowerAddress = address.toLowerCase();
    return this.getPendingTransactions().filter(tx => 
      tx.from.toLowerCase() === lowerAddress || 
      tx.to.toLowerCase() === lowerAddress
    );
  }

  /**
   * トランザクションを分析
   * @param transaction トランザクションデータ
   */
  public async analyzeTransaction(transaction: TransactionData): Promise<TransactionData> {
    try {
      // トランザクションタイプを判定
      const txType = this.determineTransactionType(transaction);
      
      // トランザクションデータをデコード
      const decodedData = await this.decodeTransactionData(transaction);
      
      // 分析結果を返す
      return {
        ...transaction,
        type: txType,
        decodedData
      };
    } catch (error) {
      console.error('トランザクション分析に失敗しました:', error);
      return transaction;
    }
  }

  /**
   * トランザクションタイプを判定
   * @param transaction トランザクションデータ
   */
  private determineTransactionType(transaction: TransactionData): TransactionType {
    // コントラクトアドレスへのトランザクション
    if (transaction.to) {
      const lowerTo = transaction.to.toLowerCase();
      
      // 既知のコントラクトかチェック
      if (this.knownContracts.has(lowerTo)) {
        const contractInfo = this.knownContracts.get(lowerTo);
        
        // Uniswapルーターの場合
        if (contractInfo?.name.includes('Uniswap') || contractInfo?.name.includes('Sushiswap')) {
          return TransactionType.SWAP;
        }
        
        // ERC20トークンの場合
        if (transaction.data && transaction.data.startsWith('0xa9059cbb')) {
          return TransactionType.TRANSFER;
        }
      }
      
      // データフィールドがある場合はコントラクト呼び出し
      if (transaction.data && transaction.data !== '0x') {
        // データフィールドの最初の4バイトはメソッドシグネチャ
        const methodSig = transaction.data.slice(0, 10);
        
        // 一般的なERC20転送メソッドシグネチャ
        if (methodSig === '0xa9059cbb') {
          return TransactionType.TRANSFER;
        }
        
        // 一般的なERC20承認メソッドシグネチャ
        if (methodSig === '0x095ea7b3') {
          return TransactionType.APPROVAL;
        }
        
        // その他のコントラクト呼び出し
        return TransactionType.CONTRACT_INTERACTION;
      }
    }
    
    // ETH転送（データフィールドなし）
    if (!transaction.data || transaction.data === '0x') {
      return TransactionType.ETH_TRANSFER;
    }
    
    // 不明なタイプ
    return TransactionType.UNKNOWN;
  }

  /**
   * トランザクションデータをデコード
   * @param transaction トランザクションデータ
   */
  private async decodeTransactionData(transaction: TransactionData): Promise<any> {
    try {
      if (!transaction.data || transaction.data === '0x') {
        return null;
      }
      
      // コントラクトアドレスが既知かチェック
      if (transaction.to && this.knownContracts.has(transaction.to.toLowerCase())) {
        const contractInfo = this.knownContracts.get(transaction.to.toLowerCase());
        if (contractInfo) {
          // インターフェースを作成
          const iface = new ethers.Interface(contractInfo.abi);
          
          try {
            // データをデコード
            const decoded = iface.parseTransaction({ data: transaction.data, value: transaction.value });
            if (decoded) {
              return {
                method: decoded.name,
                args: decoded.args
              };
            }
          } catch (error) {
            console.warn('トランザクションデータのデコードに失敗しました:', error);
          }
        }
      }
      
      // 一般的なERC20メソッドのデコード
      if (transaction.data.startsWith('0xa9059cbb')) {
        // transfer(address,uint256)
        const iface = new ethers.Interface([
          'function transfer(address to, uint256 value) returns (bool)'
        ]);
        
        try {
          const decoded = iface.parseTransaction({ data: transaction.data, value: transaction.value });
          if (decoded) {
            return {
              method: 'transfer',
              args: decoded.args
            };
          }
        } catch (error) {
          console.warn('ERC20転送データのデコードに失敗しました:', error);
        }
      }
      
      if (transaction.data.startsWith('0x095ea7b3')) {
        // approve(address,uint256)
        const iface = new ethers.Interface([
          'function approve(address spender, uint256 value) returns (bool)'
        ]);
        
        try {
          const decoded = iface.parseTransaction({ data: transaction.data, value: transaction.value });
          if (decoded) {
            return {
              method: 'approve',
              args: decoded.args
            };
          }
        } catch (error) {
          console.warn('ERC20承認データのデコードに失敗しました:', error);
        }
      }
      
      // デコードできない場合はnullを返す
      return null;
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
      // 既に処理済みかチェック
      if (this.pendingTransactions.has(txHash) || this.confirmedTransactions.has(txHash)) {
        return;
      }
      
      // トランザクション情報を取得
      const tx = await this.provider?.getTransaction(txHash);
      if (!tx) {
        return;
      }
      
      // 監視対象のアドレスに関連するトランザクションかチェック
      const isRelevant = this.isRelevantTransaction(tx);
      if (!isRelevant) {
        return;
      }
      if (tx.gasLimit) {
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
        gasLimit: tx.gasLimit,
        gasPrice: tx.gasPrice?.toString(),
        status: 'pending',
        timestamp: Date.now(),
      };
      
      // トランザクションを分析
      const analyzedTx = await this.analyzeTransaction(txData);
      
      // 保留中トランザクションに追加
      this.pendingTransactions.set(txHash, analyzedTx);
      
      // イベントを発火
      this.emit('pending_transaction', analyzedTx);
    } catch (error) {
      console.error('保留中トランザクションの処理に失敗しました:', error);
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
      
      // イベントを発火
      this.emit('new_block', {
        number: blockNumber,
        timestamp: block.timestamp,
        hash: block.hash,
      });
      
      // 保留中のトランザクションを確認
      for (const [txHash, pendingTx] of this.pendingTransactions.entries()) {
        // トランザクションレシートを取得
        const receipt = await this.provider?.getTransactionReceipt(txHash);
        if (!receipt) {
          continue;
        }
        
        // トランザクションが確認されたら保留中から削除
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
    } catch (error) {
      console.error('新しいブロック処理に失敗しました:', error);
    }
  }

  /**
   * 監視対象のトランザクションかチェック
   * @param tx トランザクション
   */
  private isRelevantTransaction(tx: ethers.TransactionResponse): boolean {
    // 監視対象のアドレスがない場合はすべてのトランザクションを監視
    if (this.monitoredAddresses.size === 0) {
      return true;
    }
    
    // 送信元アドレスが監視対象かチェック
    if (tx.from && this.monitoredAddresses.has(tx.from.toLowerCase())) {
      return true;
    }
    
    // 送信先アドレスが監視対象かチェック
    if (tx.to && this.monitoredAddresses.has(tx.to.toLowerCase())) {
      return true;
    }
    
    return false;
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