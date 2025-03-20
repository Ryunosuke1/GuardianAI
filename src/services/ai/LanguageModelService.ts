import { OpenAI } from 'openai';
import metaMaskService from '../metamask/MetaMaskService';
import { RuleCondition, RuleConditionType, RuleOperator } from '../transaction/RuleProcessorService';

// 意図解析結果の型定義
export interface IntentAnalysisResult {
  success: boolean;
  rules: RuleCondition[];
  explanation: string;
  error?: string;
}

// トークン評価結果の型定義
export interface TokenEvaluationResult {
  address: string;
  name: string;
  symbol: string;
  score: number; // 0-100のスコア
  riskLevel: 'low' | 'medium' | 'high';
  positivePoints: string[];
  negativePoints: string[];
  summary: string;
}

/**
 * 言語モデルサービスクラス
 * OpenAI GPT-4を使用してユーザーの意図解析やトークン評価を行います
 */
class LanguageModelService {
  private openai: OpenAI | null = null;
  private apiKey: string | null = null;
  private isInitialized: boolean = false;

  /**
   * 言語モデルサービスを初期化
   * @param apiKey OpenAI APIキー（指定しない場合はMetaMaskから取得）
   */
  public async initialize(apiKey?: string): Promise<boolean> {
    try {
      // APIキーの取得
      if (apiKey) {
        this.apiKey = apiKey;
      } else {
        // MetaMaskのセキュアストレージからAPIキーを取得
        this.apiKey = await this.getApiKeyFromMetaMask();
      }

      if (!this.apiKey) {
        console.error('OpenAI APIキーが設定されていません');
        return false;
      }

      // OpenAIクライアントの初期化
      this.openai = new OpenAI({
        apiKey: this.apiKey,
        dangerouslyAllowBrowser: true // クライアントサイドでの使用を許可
      });

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('言語モデルサービスの初期化に失敗しました:', error);
      return false;
    }
  }

  /**
   * MetaMaskのセキュアストレージからAPIキーを取得
   */
  private async getApiKeyFromMetaMask(): Promise<string | null> {
    try {
      if (!metaMaskService.isWalletConnected()) {
        console.warn('ウォレットが接続されていません。APIキーを取得できません。');
        return null;
      }

      // セキュアストレージからAPIキーを取得
      const apiKey = await metaMaskService.secureRetrieve('openai_api_key');
      return apiKey;
    } catch (error) {
      console.error('MetaMaskからAPIキーの取得に失敗しました:', error);
      return null;
    }
  }

  /**
   * APIキーをMetaMaskのセキュアストレージに保存
   * @param apiKey OpenAI APIキー
   */
  public async saveApiKey(apiKey: string): Promise<boolean> {
    try {
      if (!metaMaskService.isWalletConnected()) {
        console.warn('ウォレットが接続されていません。APIキーを保存できません。');
        return false;
      }

      // セキュアストレージにAPIキーを保存
      const success = await metaMaskService.secureStore('openai_api_key', apiKey);
      
      if (success) {
        this.apiKey = apiKey;
        
        // OpenAIクライアントを再初期化
        if (this.isInitialized) {
          this.openai = new OpenAI({
            apiKey: this.apiKey,
            dangerouslyAllowBrowser: true
          });
        }
      }
      
      return success;
    } catch (error) {
      console.error('APIキーの保存に失敗しました:', error);
      return false;
    }
  }

  /**
   * ユーザーの自然言語による意図を解析し、ルール条件に変換
   * @param intentText ユーザーの意図を表す自然言語テキスト
   */
  public async analyzeUserIntent(intentText: string): Promise<IntentAnalysisResult> {
    try {
      if (!this.isInitialized || !this.openai) {
        throw new Error('言語モデルサービスが初期化されていません');
      }

      // GPT-4に意図解析を依頼
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `あなたは暗号資産取引の意図を解析し、ルール条件に変換する専門家です。
ユーザーの自然言語による取引意図を分析し、以下のルール条件タイプに変換してください：

1. TRANSACTION_TYPE: 取引タイプ（transfer, swap, approval, contract_interaction）
2. TOKEN_ADDRESS: トークンアドレス（特定のトークンに関するルール）
3. DESTINATION_ADDRESS: 送信先アドレス
4. VALUE_THRESHOLD: 取引金額の閾値
5. GAS_THRESHOLD: ガス料金の閾値

各条件には以下の演算子を使用できます：
- EQUALS: 等しい
- NOT_EQUALS: 等しくない
- CONTAINS: 含む
- NOT_CONTAINS: 含まない
- GREATER_THAN: より大きい
- LESS_THAN: より小さい
- IN: リストに含まれる
- NOT_IN: リストに含まれない

JSONフォーマットで出力してください。例：
{
  "success": true,
  "rules": [
    {
      "type": "TRANSACTION_TYPE",
      "operator": "EQUALS",
      "value": "swap"
    },
    {
      "type": "VALUE_THRESHOLD",
      "operator": "LESS_THAN",
      "value": 0.5
    }
  ],
  "explanation": "ユーザーは0.5 ETH未満のスワップ取引のみを許可したいと考えています。"
}`
          },
          {
            role: 'user',
            content: intentText
          }
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' }
      });

      // レスポンスをパース
      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('言語モデルからの応答が空です');
      }

      const result = JSON.parse(content) as IntentAnalysisResult;
      
      // ルール条件の型を適切に変換
      const typedRules = result.rules.map(rule => {
        return {
          type: rule.type as RuleConditionType,
          operator: rule.operator as RuleOperator,
          value: rule.value
        };
      });
      
      return {
        ...result,
        rules: typedRules
      };
    } catch (error) {
      console.error('ユーザー意図の解析に失敗しました:', error);
      return {
        success: false,
        rules: [],
        explanation: '',
        error: error instanceof Error ? error.message : '不明なエラー'
      };
    }
  }

  /**
   * トークンを評価
   * @param tokenAddress トークンアドレス
   * @param tokenInfo トークン情報（名前、シンボル、その他のメタデータ）
   */
  public async evaluateToken(
    tokenAddress: string,
    tokenInfo: any
  ): Promise<TokenEvaluationResult> {
    try {
      if (!this.isInitialized || !this.openai) {
        throw new Error('言語モデルサービスが初期化されていません');
      }

      // トークン情報をJSON文字列に変換
      const tokenInfoStr = JSON.stringify(tokenInfo);

      // GPT-4にトークン評価を依頼
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `あなたは暗号資産トークンを評価する専門家です。
提供されたトークン情報を分析し、以下の形式で評価結果を返してください：

1. score: 0-100のスコア（高いほど良い）
2. riskLevel: リスクレベル（low, medium, high）
3. positivePoints: 肯定的なポイントのリスト
4. negativePoints: 否定的なポイントのリスト
5. summary: 評価の要約

以下の要素を考慮してください：
- 流動性と取引量
- 開発チームの透明性と実績
- プロジェクトの実用性と革新性
- コミュニティの活発さ
- セキュリティ監査の有無
- トークノミクスの健全性

JSONフォーマットで出力してください。`
          },
          {
            role: 'user',
            content: `以下のトークンを評価してください：
アドレス: ${tokenAddress}
情報: ${tokenInfoStr}`
          }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      });

      // レスポンスをパース
      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('言語モデルからの応答が空です');
      }

      const result = JSON.parse(content) as Omit<TokenEvaluationResult, 'address' | 'name' | 'symbol'>;
      
      // 結果を返す
      return {
        address: tokenAddress,
        name: tokenInfo.name || 'Unknown',
        symbol: tokenInfo.symbol || 'UNKNOWN',
        ...result
      };
    } catch (error) {
      console.error('トークン評価に失敗しました:', error);
      
      // エラー時のデフォルト評価
      return {
        address: tokenAddress,
        name: tokenInfo?.name || 'Unknown',
        symbol: tokenInfo?.symbol || 'UNKNOWN',
        score: 0,
        riskLevel: 'high',
        positivePoints: [],
        negativePoints: ['評価中にエラーが発生しました'],
        summary: '評価を完了できませんでした。情報が不足しているか、APIエラーが発生しました。'
      };
    }
  }

  /**
   * 自然言語でのトランザクション説明を生成
   * @param transactionData トランザクションデータ
   */
  public async explainTransaction(transactionData: any): Promise<string> {
    try {
      if (!this.isInitialized || !this.openai) {
        throw new Error('言語モデルサービスが初期化されていません');
      }

      // トランザクションデータをJSON文字列に変換
      const txDataStr = JSON.stringify(transactionData);

      // GPT-4にトランザクション説明を依頼
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `あなたは暗号資産取引を一般ユーザーにわかりやすく説明する専門家です。
技術的なトランザクションデータを受け取り、そのトランザクションが何をしようとしているのかを
簡潔かつ明確に説明してください。専門用語は避け、一般ユーザーにもわかりやすい言葉を使ってください。`
          },
          {
            role: 'user',
            content: `以下のトランザクションを説明してください：
${txDataStr}`
          }
        ],
        temperature: 0.3,
        max_tokens: 200
      });

      // レスポンスを取得
      const explanation = response.choices[0]?.message?.content || '説明を生成できませんでした。';
      return explanation;
    } catch (error) {
      console.error('トランザクション説明の生成に失敗しました:', error);
      return 'トランザクションの説明を生成できませんでした。';
    }
  }

  /**
   * 初期化状態を取得
   */
  public isModelInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * APIキーが設定されているかを確認
   */
  public hasApiKey(): boolean {
    return !!this.apiKey;
  }
}

// シングルトンインスタンスをエクスポート
export const languageModelService = new LanguageModelService();
export default languageModelService;
