import { ethers } from 'ethers';
import { TransactionType, type TransactionData as BaseTransactionData } from '../../types/transaction';

interface SwapPathData {
  path: string[];
}

interface DecodedData {
  method: string;
  args: any[] & Partial<SwapPathData>;
}

interface TransactionData extends BaseTransactionData {
  decodedData?: DecodedData;
}

// ルールの条件タイプ
export enum RuleConditionType {
  TRANSACTION_TYPE = 'transaction_type',
  TOKEN_ADDRESS = 'token_address',
  DESTINATION_ADDRESS = 'destination_address',
  VALUE_THRESHOLD = 'value_threshold',
  GAS_THRESHOLD = 'gas_threshold',
  CUSTOM = 'custom'
}

// ルールの条件演算子
export enum RuleOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  IN = 'in',
  NOT_IN = 'not_in'
}

// ルールの条件
export interface RuleCondition {
  type: RuleConditionType;
  operator: RuleOperator;
  value: any;
}

// ルールの定義
export interface Rule {
  id: string;
  name: string;
  description: string;
  conditions: RuleCondition[];
  isEnabled: boolean;
  createdAt: number;
  updatedAt: number;
}

// ルールセット
export interface RuleSet {
  id: string;
  name: string;
  description: string;
  rules: Rule[];
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

// ルール評価結果
export interface RuleEvaluationResult {
  ruleId: string;
  ruleName: string;
  isMatch: boolean;
  details: string;
}

// トランザクション評価結果
export interface TransactionEvaluationResult {
  transactionHash: string;
  isApproved: boolean;
  matchedRules: RuleEvaluationResult[];
  evaluationTime: number;
}

/**
 * ルール処理サービスクラス
 * ユーザー定義ルールの管理と評価を行います
 */
class RuleProcessorService {
  private ruleSets: Map<string, RuleSet> = new Map();
  private activeRuleSetId: string | null = null;

  /**
   * ルールセットを作成
   * @param name ルールセット名
   * @param description ルールセットの説明
   */
  public createRuleSet(name: string, description: string = ''): RuleSet {
    const id = `ruleset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const ruleSet: RuleSet = {
      id,
      name,
      description,
      rules: [],
      isActive: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    this.ruleSets.set(id, ruleSet);
    return ruleSet;
  }

  /**
   * ルールセットを取得
   * @param id ルールセットID
   */
  public getRuleSet(id: string): RuleSet | undefined {
    return this.ruleSets.get(id);
  }

  /**
   * すべてのルールセットを取得
   */
  public getAllRuleSets(): RuleSet[] {
    return Array.from(this.ruleSets.values());
  }

  /**
   * アクティブなルールセットを設定
   * @param id ルールセットID
   */
  public setActiveRuleSet(id: string): boolean {
    if (!this.ruleSets.has(id)) {
      return false;
    }
    
    // 現在のアクティブルールセットを非アクティブに
    if (this.activeRuleSetId) {
      const currentActive = this.ruleSets.get(this.activeRuleSetId);
      if (currentActive) {
        currentActive.isActive = false;
        this.ruleSets.set(this.activeRuleSetId, currentActive);
      }
    }
    
    // 新しいルールセットをアクティブに
    const newActive = this.ruleSets.get(id);
    if (newActive) {
      newActive.isActive = true;
      this.ruleSets.set(id, newActive);
      this.activeRuleSetId = id;
      return true;
    }
    
    return false;
  }

  /**
   * アクティブなルールセットを取得
   */
  public getActiveRuleSet(): RuleSet | undefined {
    if (!this.activeRuleSetId) {
      return undefined;
    }
    return this.ruleSets.get(this.activeRuleSetId);
  }

  /**
   * ルールセットにルールを追加
   * @param ruleSetId ルールセットID
   * @param name ルール名
   * @param description ルールの説明
   * @param conditions ルールの条件
   */
  public addRule(
    ruleSetId: string,
    name: string,
    description: string = '',
    conditions: RuleCondition[] = []
  ): Rule | null {
    const ruleSet = this.ruleSets.get(ruleSetId);
    if (!ruleSet) {
      return null;
    }
    
    const id = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const rule: Rule = {
      id,
      name,
      description,
      conditions,
      isEnabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    ruleSet.rules.push(rule);
    ruleSet.updatedAt = Date.now();
    this.ruleSets.set(ruleSetId, ruleSet);
    
    return rule;
  }

  /**
   * ルールを更新
   * @param ruleSetId ルールセットID
   * @param ruleId ルールID
   * @param updates 更新内容
   */
  public updateRule(
    ruleSetId: string,
    ruleId: string,
    updates: Partial<Omit<Rule, 'id' | 'createdAt' | 'updatedAt'>>
  ): Rule | null {
    const ruleSet = this.ruleSets.get(ruleSetId);
    if (!ruleSet) {
      return null;
    }
    
    const ruleIndex = ruleSet.rules.findIndex(r => r.id === ruleId);
    if (ruleIndex === -1) {
      return null;
    }
    
    const rule = ruleSet.rules[ruleIndex];
    const updatedRule: Rule = {
      ...rule,
      ...updates,
      updatedAt: Date.now()
    };
    
    ruleSet.rules[ruleIndex] = updatedRule;
    ruleSet.updatedAt = Date.now();
    this.ruleSets.set(ruleSetId, ruleSet);
    
    return updatedRule;
  }

  /**
   * ルールを削除
   * @param ruleSetId ルールセットID
   * @param ruleId ルールID
   */
  public deleteRule(ruleSetId: string, ruleId: string): boolean {
    const ruleSet = this.ruleSets.get(ruleSetId);
    if (!ruleSet) {
      return false;
    }
    
    const initialLength = ruleSet.rules.length;
    ruleSet.rules = ruleSet.rules.filter(r => r.id !== ruleId);
    
    if (ruleSet.rules.length === initialLength) {
      return false;
    }
    
    ruleSet.updatedAt = Date.now();
    this.ruleSets.set(ruleSetId, ruleSet);
    
    return true;
  }

  /**
   * トランザクションをルールセットで評価
   * @param transaction トランザクションデータ
   * @param ruleSetId 評価するルールセットID（指定しない場合はアクティブなルールセット）
   */
  public evaluateTransaction(
    transaction: TransactionData,
    ruleSetId?: string
  ): TransactionEvaluationResult {
    const startTime = Date.now();
    
    // 評価するルールセットを決定
    const targetRuleSetId = ruleSetId || this.activeRuleSetId;
    if (!targetRuleSetId) {
      return {
        transactionHash: transaction.hash,
        isApproved: true, // ルールがない場合はデフォルトで承認
        matchedRules: [],
        evaluationTime: Date.now() - startTime
      };
    }
    
    const ruleSet = this.ruleSets.get(targetRuleSetId);
    if (!ruleSet || !ruleSet.isActive) {
      return {
        transactionHash: transaction.hash,
        isApproved: true, // アクティブなルールセットがない場合はデフォルトで承認
        matchedRules: [],
        evaluationTime: Date.now() - startTime
      };
    }
    
    // 有効なルールのみを評価
    const enabledRules = ruleSet.rules.filter(r => r.isEnabled);
    const ruleResults: RuleEvaluationResult[] = [];
    
    // 各ルールを評価
    for (const rule of enabledRules) {
      const result = this.evaluateRule(transaction, rule);
      ruleResults.push(result);
    }
    
    // マッチしたルールがあるかチェック
    const matchedRules = ruleResults.filter(r => r.isMatch);
    
    // 評価結果を返す
    return {
      transactionHash: transaction.hash,
      isApproved: matchedRules.length === 0, // マッチしたルールがない場合は承認
      matchedRules,
      evaluationTime: Date.now() - startTime
    };
  }

  /**
   * トランザクションを単一のルールで評価
   * @param transaction トランザクションデータ
   * @param rule 評価するルール
   */
  private evaluateRule(transaction: TransactionData, rule: Rule): RuleEvaluationResult {
    // すべての条件を評価
    const conditionResults = rule.conditions.map(condition => {
      return this.evaluateCondition(transaction, condition);
    });
    
    // すべての条件がマッチした場合のみルールにマッチ
    const isMatch = conditionResults.every(result => result.isMatch);
    
    // 詳細メッセージを作成
    const details = conditionResults
      .map(result => result.details)
      .join('; ');
    
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      isMatch,
      details
    };
  }

  /**
   * トランザクションを単一の条件で評価
   * @param transaction トランザクションデータ
   * @param condition 評価する条件
   */
  private evaluateCondition(
    transaction: TransactionData,
    condition: RuleCondition
  ): { isMatch: boolean; details: string } {
    switch (condition.type) {
      case RuleConditionType.TRANSACTION_TYPE:
        return this.evaluateTransactionType(transaction, condition);
      
      case RuleConditionType.TOKEN_ADDRESS:
        return this.evaluateTokenAddress(transaction, condition);
      
      case RuleConditionType.DESTINATION_ADDRESS:
        return this.evaluateDestinationAddress(transaction, condition);
      
      case RuleConditionType.VALUE_THRESHOLD:
        return this.evaluateValueThreshold(transaction, condition);
      
      case RuleConditionType.GAS_THRESHOLD:
        return this.evaluateGasThreshold(transaction, condition);
      
      case RuleConditionType.CUSTOM:
        return this.evaluateCustomCondition(transaction, condition);
      
      default:
        return {
          isMatch: false,
          details: `未知の条件タイプ: ${condition.type}`
        };
    }
  }

  /**
   * トランザクションタイプを評価
   */
  private evaluateTransactionType(
    transaction: TransactionData,
    condition: RuleCondition
  ): { isMatch: boolean; details: string } {
    const { operator, value } = condition;
    
    switch (operator) {
      case RuleOperator.EQUALS:
        return {
          isMatch: transaction.type === value,
          details: `トランザクションタイプ ${transaction.type} は ${value} ${transaction.type === value ? 'に一致' : 'に一致しない'}`
        };
      
      case RuleOperator.NOT_EQUALS:
        return {
          isMatch: transaction.type !== value,
          details: `トランザクションタイプ ${transaction.type} は ${value} ${transaction.type !== value ? 'に一致しない' : 'に一致'}`
        };
      
      case RuleOperator.IN:
        const inValues = Array.isArray(value) ? value : [value];
        return {
          isMatch: inValues.includes(transaction.type),
          details: `トランザクションタイプ ${transaction.type} は [${inValues.join(', ')}] ${inValues.includes(transaction.type) ? 'に含まれる' : 'に含まれない'}`
        };
      
      case RuleOperator.NOT_IN:
        const notInValues = Array.isArray(value) ? value : [value];
        return {
          isMatch: !notInValues.includes(transaction.type),
          details: `トランザクションタイプ ${transaction.type} は [${notInValues.join(', ')}] ${!notInValues.includes(transaction.type) ? 'に含まれない' : 'に含まれる'}`
        };
      
      default:
        return {
          isMatch: false,
          details: `トランザクションタイプに対して未対応の演算子: ${operator}`
        };
    }
  }

  /**
   * トークンアドレスを評価
   */
  private evaluateTokenAddress(
    transaction: TransactionData,
    condition: RuleCondition
  ): { isMatch: boolean; details: string } {
    const { operator, value } = condition;
    
    // トークンアドレスを取得（トランザクションのto、またはデコードされたデータから）
    let tokenAddress = transaction.to.toLowerCase();
    if (transaction.decodedData && transaction.decodedData.args && transaction.decodedData.args.length > 0) {
      // スワップの場合はパスの最初と最後のトークンを考慮
      if (transaction.type === TransactionType.SWAP && transaction.decodedData.args.path) {
        const path = transaction.decodedData.args.path;
        if (Array.isArray(path) && path.length >= 2) {
          tokenAddress = `${path[0].toLowerCase()},${path[path.length - 1].toLowerCase()}`;
        }
      }
    }
    
    switch (operator) {
      case RuleOperator.EQUALS:
        const equalsValue = value.toLowerCase();
        return {
          isMatch: tokenAddress === equalsValue,
          details: `トークンアドレス ${tokenAddress} は ${equalsValue} ${tokenAddress === equalsValue ? 'に一致' : 'に一致しない'}`
        };
      
      case RuleOperator.NOT_EQUALS:
        const notEqualsValue = value.toLowerCase();
        return {
          isMatch: tokenAddress !== notEqualsValue,
          details: `トークンアドレス ${tokenAddress} は ${notEqualsValue} ${tokenAddress !== notEqualsValue ? 'に一致しない' : 'に一致'}`
        };
      
      case RuleOperator.CONTAINS:
        const containsValue = value.toLowerCase();
        return {
          isMatch: tokenAddress.includes(containsValue),
          details: `トークンアドレス ${tokenAddress} は ${containsValue} ${tokenAddress.includes(containsValue) ? 'を含む' : 'を含まない'}`
        };
      
      case RuleOperator.NOT_CONTAINS:
        const notContainsValue = value.toLowerCase();
        return {
          isMatch: !tokenAddress.includes(notContainsValue),
          details: `トークンアドレス ${tokenAddress} は ${notContainsValue} ${!tokenAddress.includes(notContainsValue) ? 'を含まない' : 'を含む'}`
        };
      
      case RuleOperator.IN:
        const inValues = Array.isArray(value) 
          ? value.map((v: string) => v.toLowerCase())
          : [value.toLowerCase()];
        return {
          isMatch: inValues.some(v => tokenAddress.includes(v)),
          details: `トークンアドレス ${tokenAddress} は [${inValues.join(', ')}] ${inValues.some(v => tokenAddress.includes(v)) ? 'のいずれかを含む' : 'のいずれも含まない'}`
        };
      
      case RuleOperator.NOT_IN:
        const notInValues = Array.isArray(value)
          ? value.map((v: string) => v.toLowerCase())
          : [value.toLowerCase()];
        return {
          isMatch: !notInValues.some(v => tokenAddress.includes(v)),
          details: `トークンアドレス ${tokenAddress} は [${notInValues.join(', ')}] ${!notInValues.some(v => tokenAddress.includes(v)) ? 'のいずれも含まない' : 'のいずれかを含む'}`
        };
      
      default:
        return {
          isMatch: false,
          details: `トークンアドレスに対して未対応の演算子: ${operator}`
        };
    }
  }

  /**
   * 送信先アドレスを評価
   */
  private evaluateDestinationAddress(
    transaction: TransactionData,
    condition: RuleCondition
  ): { isMatch: boolean; details: string } {
    const { operator, value } = condition;
    const destinationAddress = transaction.to.toLowerCase();
    
    switch (operator) {
      case RuleOperator.EQUALS:
        const equalsValue = value.toLowerCase();
        return {
          isMatch: destinationAddress === equalsValue,
          details: `送信先アドレス ${destinationAddress} は ${equalsValue} ${destinationAddress === equalsValue ? 'に一致' : 'に一致しない'}`
        };
      
      case RuleOperator.NOT_EQUALS:
        const notEqualsValue = value.toLowerCase();
        return {
          isMatch: destinationAddress !== notEqualsValue,
          details: `送信先アドレス ${destinationAddress} は ${notEqualsValue} ${destinationAddress !== notEqualsValue ? 'に一致しない' : 'に一致'}`
        };
      
      case RuleOperator.IN:
        const inValues = Array.isArray(value)
          ? value.map((v: string) => v.toLowerCase())
          : [value.toLowerCase()];
        return {
          isMatch: inValues.includes(destinationAddress),
          details: `送信先アドレス ${destinationAddress} は [${inValues.join(', ')}] ${inValues.includes(destinationAddress) ? 'に含まれる' : 'に含まれない'}`
        };
      
      case RuleOperator.NOT_IN:
        const notInValues = Array.isArray(value)
          ? value.map((v: string) => v.toLowerCase())
          : [value.toLowerCase()];
        return {
          isMatch: !notInValues.includes(destinationAddress),
          details: `送信先アドレス ${destinationAddress} は [${notInValues.join(', ')}] ${!notInValues.includes(destinationAddress) ? 'に含まれない' : 'に含まれる'}`
        };
      
      default:
        return {
          isMatch: false,
          details: `送信先アドレスに対して未対応の演算子: ${operator}`
        };
    }
  }

  /**
   * 取引金額を評価
   */
  private evaluateValueThreshold(
    transaction: TransactionData,
    condition: RuleCondition
  ): { isMatch: boolean; details: string } {
    const { operator, value } = condition;
    const txValue = parseFloat(ethers.formatEther(transaction.value));
    
    switch (operator) {
      case RuleOperator.EQUALS:
        return {
          isMatch: txValue === value,
          details: `取引金額 ${txValue} ETH は ${value} ETH ${txValue === value ? 'に等しい' : 'に等しくない'}`
        };
      
      case RuleOperator.NOT_EQUALS:
        return {
          isMatch: txValue !== value,
          details: `取引金額 ${txValue} ETH は ${value} ETH ${txValue !== value ? 'に等しくない' : 'に等しい'}`
        };
      
      case RuleOperator.GREATER_THAN:
        return {
          isMatch: txValue > value,
          details: `取引金額 ${txValue} ETH は ${value} ETH ${txValue > value ? 'より大きい' : 'より大きくない'}`
        };
      
      case RuleOperator.LESS_THAN:
        return {
          isMatch: txValue < value,
          details: `取引金額 ${txValue} ETH は ${value} ETH ${txValue < value ? 'より小さい' : 'より小さくない'}`
        };
      
      default:
        return {
          isMatch: false,
          details: `取引金額に対して未対応の演算子: ${operator}`
        };
    }
  }

  /**
   * ガス代を評価
   */
  private evaluateGasThreshold(
    transaction: TransactionData,
    condition: RuleCondition
  ): { isMatch: boolean; details: string } {
    const { operator, value } = condition;
    const gasPrice = parseFloat(ethers.formatUnits(transaction.gasPrice || '0', 'gwei'));
    const gasLimit = transaction.gasLimit ? parseFloat(transaction.gasLimit.toString()) : 0;
    const estimatedGasCost = gasPrice * gasLimit;

    switch (operator) {
      case RuleOperator.EQUALS:
        return {
          isMatch: estimatedGasCost === value,
          details: `ガスコスト ${estimatedGasCost} Gwei は ${value} Gwei ${estimatedGasCost === value ? 'に等しい' : 'に等しくない'}`
        };

      case RuleOperator.NOT_EQUALS:
        return {
          isMatch: estimatedGasCost !== value,
          details: `ガスコスト ${estimatedGasCost} Gwei は ${value} Gwei ${estimatedGasCost !== value ? 'に等しくない' : 'に等しい'}`
        };

      case RuleOperator.GREATER_THAN:
        return {
          isMatch: estimatedGasCost > value,
          details: `ガスコスト ${estimatedGasCost} Gwei は ${value} Gwei ${estimatedGasCost > value ? 'より大きい' : 'より大きくない'}`
        };

      case RuleOperator.LESS_THAN:
        return {
          isMatch: estimatedGasCost < value,
          details: `ガスコスト ${estimatedGasCost} Gwei は ${value} Gwei ${estimatedGasCost < value ? 'より小さい' : 'より小さくない'}`
        };

      default:
        return {
          isMatch: false,
          details: `ガスコストに対して未対応の演算子: ${operator}`
        };
    }
  }

  /**
   * カスタム条件を評価
   */
  private evaluateCustomCondition(
    transaction: TransactionData,
    condition: RuleCondition
  ): { isMatch: boolean; details: string } {
    try {
      const { value } = condition;
      if (typeof value !== 'function') {
        return {
          isMatch: false,
          details: 'カスタム条件の値は関数である必要があります'
        };
      }

      const result = value(transaction);
      return {
        isMatch: Boolean(result),
        details: `カスタム条件の評価結果: ${result}`
      };
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      return {
        isMatch: false,
        details: `カスタム条件の評価中にエラーが発生: ${errorMessage}`
      };
    }
  }
}

// シングルトンインスタンスを作成
const ruleProcessorService = new RuleProcessorService();
export default ruleProcessorService;