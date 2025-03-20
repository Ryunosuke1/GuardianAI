import React, { useState, useEffect } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { useMetaMask } from '../../services/metamask/MetaMaskContext';
import languageModelService, { IntentAnalysisResult } from '../../services/ai/LanguageModelService';
import ruleProcessorService, { RuleSet } from '../../services/transaction/RuleProcessorService';

/**
 * 自然言語意図入力コンポーネント
 * ユーザーが自然言語で取引の「想定」を入力し、AIがそれをルールに変換するインターフェース
 */
const IntentInputComponent: React.FC = () => {
  // 状態管理
  const [intentText, setIntentText] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<IntentAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isModelInitialized, setIsModelInitialized] = useState<boolean>(false);
  const [apiKey, setApiKey] = useState<string>('');
  const [isSettingApiKey, setIsSettingApiKey] = useState<boolean>(false);
  const [activeRuleSet, setActiveRuleSet] = useState<RuleSet | undefined>(undefined);

  // MetaMaskコンテキストを使用
  const { isConnected } = useMetaMask();

  // 初期化チェック
  useEffect(() => {
    const checkInitialization = async () => {
      const initialized = languageModelService.isModelInitialized();
      setIsModelInitialized(initialized);
      
      // アクティブなルールセットを取得
      const currentRuleSet = ruleProcessorService.getActiveRuleSet();
      setActiveRuleSet(currentRuleSet);
    };
    
    checkInitialization();
  }, []);

  // 言語モデルの初期化
  const initializeModel = async () => {
    if (!apiKey) {
      setError('APIキーを入力してください');
      return;
    }
    
    setIsSettingApiKey(true);
    setError(null);
    
    try {
      // APIキーを保存して初期化
      const success = await languageModelService.saveApiKey(apiKey);
      if (success) {
        const initialized = await languageModelService.initialize();
        setIsModelInitialized(initialized);
        
        if (!initialized) {
          setError('言語モデルの初期化に失敗しました');
        }
      } else {
        setError('APIキーの保存に失敗しました');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
    } finally {
      setIsSettingApiKey(false);
    }
  };

  // 意図解析の実行
  const analyzeIntent = async () => {
    if (!intentText) {
      setError('取引の想定を入力してください');
      return;
    }
    
    if (!isModelInitialized) {
      setError('言語モデルが初期化されていません');
      return;
    }
    
    setIsAnalyzing(true);
    setError(null);
    setAnalysisResult(null);
    
    try {
      // 意図解析を実行
      const result = await languageModelService.analyzeUserIntent(intentText);
      setAnalysisResult(result);
      
      if (result.success) {
        // ルールセットが存在しない場合は作成
        if (!activeRuleSet) {
          const newRuleSet = ruleProcessorService.createRuleSet('自動生成ルールセット', '自然言語から生成されたルールセット');
          ruleProcessorService.setActiveRuleSet(newRuleSet.id);
          setActiveRuleSet(newRuleSet);
        }
        
        // ルールを追加
        if (activeRuleSet) {
          const ruleName = `意図: ${intentText.substring(0, 30)}${intentText.length > 30 ? '...' : ''}`;
          ruleProcessorService.addRule(
            activeRuleSet.id,
            ruleName,
            result.explanation,
            result.rules
          );
          
          // 更新されたルールセットを取得
          const updatedRuleSet = ruleProcessorService.getRuleSet(activeRuleSet.id);
          setActiveRuleSet(updatedRuleSet);
        }
      } else {
        setError(result.error || '意図の解析に失敗しました');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // APIキー設定フォーム
  if (!isModelInitialized) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>言語モデルの設定</Text>
        <Text style={styles.description}>
          GuardianAIの自然言語処理機能を使用するには、OpenAI APIキーが必要です。
          APIキーはMetaMaskウォレット内に安全に保存されます。
        </Text>
        
        <TextInput
          style={styles.input}
          placeholder="OpenAI APIキーを入力"
          value={apiKey}
          onChangeText={setApiKey}
          secureTextEntry
        />
        
        <TouchableOpacity
          style={[styles.button, !apiKey || !isConnected || isSettingApiKey ? styles.disabledButton : null]}
          onPress={initializeModel}
          disabled={!apiKey || !isConnected || isSettingApiKey}
        >
          {isSettingApiKey ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>APIキーを設定</Text>
          )}
        </TouchableOpacity>
        
        {!isConnected && (
          <Text style={styles.warningText}>
            APIキーを保存するには、まずMetaMaskウォレットに接続してください。
          </Text>
        )}
        
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    );
  }

  // 意図入力フォーム
  return (
    <View style={styles.container}>
      <Text style={styles.title}>取引の想定を入力</Text>
      <Text style={styles.description}>
        自然言語で取引の「想定」を入力してください。例えば「今日はスワップだけしたい」「特定のトークン間でしか取引したくない」など。
        GuardianAIがあなたの意図を解析し、トランザクション監視ルールに変換します。
      </Text>
      
      <TextInput
        style={styles.textArea}
        placeholder="例: 今日は0.1 ETH以下のスワップ取引だけを行いたい"
        value={intentText}
        onChangeText={setIntentText}
        multiline
        numberOfLines={4}
      />
      
      <TouchableOpacity
        style={[styles.button, !intentText || isAnalyzing ? styles.disabledButton : null]}
        onPress={analyzeIntent}
        disabled={!intentText || isAnalyzing}
      >
        {isAnalyzing ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>意図を解析</Text>
        )}
      </TouchableOpacity>
      
      {error && <Text style={styles.errorText}>{error}</Text>}
      
      {analysisResult && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>解析結果:</Text>
          <Text style={styles.resultText}>{analysisResult.explanation}</Text>
          
          <Text style={styles.rulesTitle}>生成されたルール:</Text>
          {analysisResult.rules.map((rule, index) => (
            <View key={index} style={styles.ruleItem}>
              <Text style={styles.ruleText}>
                {rule.type}: {rule.operator} {JSON.stringify(rule.value)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333333',
  },
  description: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 16,
    lineHeight: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 4,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 4,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#4F46E5',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  errorText: {
    color: '#EF4444',
    marginTop: 8,
    fontSize: 14,
  },
  warningText: {
    color: '#F59E0B',
    marginTop: 8,
    fontSize: 14,
  },
  resultContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#4F46E5',
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333333',
  },
  resultText: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 16,
    lineHeight: 20,
  },
  rulesTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333333',
  },
  ruleItem: {
    backgroundColor: '#EEF2FF',
    padding: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  ruleText: {
    fontSize: 12,
    color: '#4F46E5',
    fontFamily: 'monospace',
  },
});

export default IntentInputComponent;
