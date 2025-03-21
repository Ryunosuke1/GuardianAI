import { EventEmitter } from 'events';
import { TransactionData } from '../../types/transaction';
import { TransactionEvaluationResult } from './RuleProcessorService';
import { ApprovalStatus, ApprovalRequest } from '../../types/approval';
import ruleProcessorService from './RuleProcessorService';
import { ethers } from 'ethers';
import { metaMaskService } from '../metamask/MetaMaskService';

/**
 * トランザクション承認サービス
 * トランザクション承認フローを管理します
 */
class TransactionApprovalService extends EventEmitter {
  private approvalRequests: Map<string, ApprovalRequest> = new Map();
  private requestTimeout: number = 5 * 60 * 1000; // 5分
  private autoApproveEnabled: boolean = false;
  private privateKey: string | null = null;

  /**
   * 承認サービスを初期化
   */
  public initialize(): boolean {
    try {
      // 設定の読み込みなど
      return true;
    } catch (error) {
      console.error('トランザクション承認サービスの初期化に失敗しました:', error);
      return false;
    }
  }

  /**
   * 自動承認の有効/無効を設定
   * @param enabled 有効にする場合はtrue
   */
  public setAutoApprove(enabled: boolean): void {
    this.autoApproveEnabled = enabled;
  }

  /**
   * リクエストのタイムアウト時間を設定
   * @param timeoutMs タイムアウト時間（ミリ秒）
   */
  public setRequestTimeout(timeoutMs: number): void {
    this.requestTimeout = timeoutMs;
  }

  /**
   * プライベートキーを設定
   * @param privateKey ユーザーのプライベートキー
   */
  public setPrivateKey(privateKey: string): void {
    this.privateKey = privateKey;
  }

  /**
   * プライベートキーをクリア
   */
  public clearPrivateKey(): void {
    this.privateKey = null;
  }

  /**
   * プライベートキーが設定されているか確認
   */
  public hasPrivateKey(): boolean {
    return this.privateKey !== null && this.privateKey.length > 0;
  }

  /**
   * トランザクションの承認をリクエスト
   * @param transaction トランザクションデータ
   */
  public async requestApproval(transaction: TransactionData): Promise<ApprovalRequest> {
    try {
      // トランザクションをルールで評価
      const evaluationResult = ruleProcessorService.evaluateTransaction(transaction);
      
      // リクエストIDを生成
      const id = `approval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // 有効期限を設定
      const expiresAt = Date.now() + this.requestTimeout;
      
      // 承認リクエストを作成
      const request: ApprovalRequest = {
        id,
        transaction,
        evaluationResult,
        status: ApprovalStatus.PENDING,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        expiresAt,
        userComment: ''
      };
      
      // 自動承認が有効で、評価結果が承認の場合
      if (this.autoApproveEnabled && evaluationResult.isApproved) {
        request.status = ApprovalStatus.AUTO_APPROVED;
        this.approvalRequests.set(id, request);
        
        // 自動承認イベントを発火
        this.emit('transaction_auto_approved', request);
        
        // トランザクションを送信
        await this.executeTransaction(request);
        
        return request;
      }
      
      // リクエストを保存
      this.approvalRequests.set(id, request);
      
      // タイムアウトタイマーを設定
      setTimeout(() => {
        this.handleRequestTimeout(id);
      }, this.requestTimeout);
      
      // 承認リクエストイベントを発火
      this.emit('approval_requested', request);
      
      return request;
    } catch (error) {
      console.error('承認リクエストの作成に失敗しました:', error);
      throw error;
    }
  }

  /**
   * トランザクションを承認対象として追加
   * @param transaction トランザクションデータ
   */
  public addTransactionForApproval(transaction: TransactionData): string {
    // リクエストIDを生成
    const id = `approval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 承認リクエストを作成
    const request: ApprovalRequest = {
      id,
      transaction,
      status: ApprovalStatus.PENDING,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      expiresAt: Date.now() + this.requestTimeout,
      userComment: ''
    };
    
    // リクエストを保存
    this.approvalRequests.set(id, request);
    
    // 承認リクエストイベントを発火
    this.emit('approval_update');
    
    return id;
  }

  /**
   * トランザクションを承認
   * @param requestId 承認リクエストID
   * @param comment オプションのコメント
   */
  public async approveTransaction(requestId: string, comment?: string): Promise<boolean> {
    try {
      const request = this.approvalRequests.get(requestId);
      if (!request) {
        throw new Error(`承認リクエスト ${requestId} が見つかりません`);
      }
      
      if (request.status !== ApprovalStatus.PENDING) {
        throw new Error(`承認リクエスト ${requestId} は既に ${request.status} 状態です`);
      }
      
      // リクエストを更新
      request.status = ApprovalStatus.APPROVED;
      request.updatedAt = Date.now();
      if (comment) {
        request.userComment = comment;
      }
      
      this.approvalRequests.set(requestId, request);
      
      // 承認イベントを発火
      this.emit('transaction_approved', request);
      this.emit('approval_update');
      
      // トランザクションを送信
      await this.executeTransaction(request);
      
      return true;
    } catch (error) {
      console.error('トランザクション承認に失敗しました:', error);
      return false;
    }
  }

  /**
   * トランザクションを拒否
   * @param requestId 承認リクエストID
   * @param comment オプションのコメント
   */
  public rejectTransaction(requestId: string, comment?: string): boolean {
    try {
      const request = this.approvalRequests.get(requestId);
      if (!request) {
        throw new Error(`承認リクエスト ${requestId} が見つかりません`);
      }
      
      if (request.status !== ApprovalStatus.PENDING) {
        throw new Error(`承認リクエスト ${requestId} は既に ${request.status} 状態です`);
      }
      
      // リクエストを更新
      request.status = ApprovalStatus.REJECTED;
      request.updatedAt = Date.now();
      if (comment) {
        request.userComment = comment;
      }
      
      this.approvalRequests.set(requestId, request);
      
      // 拒否イベントを発火
      this.emit('transaction_rejected', request);
      this.emit('approval_update');
      
      return true;
    } catch (error) {
      console.error('トランザクション拒否に失敗しました:', error);
      return false;
    }
  }

  /**
   * 承認リクエストを取得
   * @param requestId 承認リクエストID
   */
  public getApprovalRequest(requestId: string): ApprovalRequest | undefined {
    return this.approvalRequests.get(requestId);
  }

  /**
   * すべての承認リクエストを取得
   */
  public getAllApprovalRequests(): ApprovalRequest[] {
    return Array.from(this.approvalRequests.values());
  }

  /**
   * 保留中の承認リクエストを取得
   */
  public getPendingApprovalRequests(): ApprovalRequest[] {
    return this.getAllApprovalRequests().filter(
      request => request.status === ApprovalStatus.PENDING
    );
  }

  /**
   * 承認リクエストの履歴を取得
   * @param limit 取得する最大数
   */
  public getApprovalHistory(limit: number = 50): ApprovalRequest[] {
    return this.getAllApprovalRequests()
      .filter(request => request.status !== ApprovalStatus.PENDING)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, limit);
  }

  /**
   * リクエストのタイムアウトを処理
   * @param requestId 承認リクエストID
   */
  private handleRequestTimeout(requestId: string): void {
    const request = this.approvalRequests.get(requestId);
    if (!request || request.status !== ApprovalStatus.PENDING) {
      return;
    }
    
    // リクエストを期限切れに更新
    request.status = ApprovalStatus.EXPIRED;
    request.updatedAt = Date.now();
    
    this.approvalRequests.set(requestId, request);
    
    // 期限切れイベントを発火
    this.emit('approval_expired', request);
    this.emit('approval_update');
  }

  /**
   * トランザクションを実行
   * @param request 承認リクエスト
   */
  private async executeTransaction(request: ApprovalRequest): Promise<string> {
    try {
      const { transaction } = request;
      
      // トランザクションオブジェクトを作成
      const tx = {
        to: transaction.to,
        value: transaction.value,
        data: transaction.data,
        gasLimit: transaction.gasLimit,
        nonce: transaction.nonce
      };
      
      let txHash: string;
      
      // ユーザーの想定内トランザクションの場合はプライベートキーを使用
      if (request.evaluationResult?.isApproved && this.hasPrivateKey()) {
        // プライベートキーを使用してトランザクションを送信
        const provider = metaMaskService.getProvider();
        if (!provider) {
          throw new Error('プロバイダーが利用できません');
        }
        
        const wallet = new ethers.Wallet(this.privateKey!, provider);
        const txResponse = await wallet.sendTransaction(tx);
        txHash = txResponse.hash;
        
        console.log('プライベートキーを使用してトランザクションを送信:', txHash);
      } else {
        // MetaMask SDKを使用してトランザクションを送信
        txHash = await metaMaskService.sendTransaction(tx);
        console.log('MetaMask SDKを使用してトランザクションを送信:', txHash);
      }
      
      // 送信完了イベントを発火
      this.emit('transaction_sent', {
        request,
        txHash
      });
      
      return txHash;
    } catch (error) {
      console.error('トランザクション実行に失敗しました:', error);
      
      // 送信失敗イベントを発火
      this.emit('transaction_failed', {
        request,
        error
      });
      
      throw error;
    }
  }

  /**
   * 承認リクエストをクリア
   * @param olderThanMs 指定時間より古いリクエストをクリア（ミリ秒）
   */
  public clearOldRequests(olderThanMs: number = 24 * 60 * 60 * 1000): number {
    const cutoffTime = Date.now() - olderThanMs;
    let clearedCount = 0;
    
    for (const [id, request] of this.approvalRequests.entries()) {
      if (request.createdAt < cutoffTime && request.status !== ApprovalStatus.PENDING) {
        this.approvalRequests.delete(id);
        clearedCount++;
      }
    }
    
    return clearedCount;
  }

  /**
   * すべての承認を取得
   */
  public getApprovals(): ApprovalRequest[] {
    return Array.from(this.approvalRequests.values());
  }
}

// シングルトンインスタンスをエクスポート
export const transactionApprovalService = new TransactionApprovalService();
export default transactionApprovalService;
