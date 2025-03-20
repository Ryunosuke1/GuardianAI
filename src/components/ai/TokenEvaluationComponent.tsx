import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Image } from 'react-native';
import { useMetaMask } from '../../services/metamask/MetaMaskContext';
import languageModelService, { TokenEvaluationResult } from '../../services/ai/LanguageModelService';

// トークン情報の型定義
interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply?: string;
  marketCap?: number;
  volume24h?: number;
  priceUSD?: number;
  priceChange24h?: number;
  logoUrl?: string;
}

/**
 * トークン評価コンポーネント
 * AIを使用してトークンを評価し、その結果を表示するコンポーネント
 */
const TokenEvaluationComponent: React.FC = () => {
  // 状態管理
  const [tokenAddress, setTokenAddress] = useState<string>('');
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [evaluationResult, setEvaluationResult] = useState<TokenEvaluationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isModelInitialized, setIsModelInitialized] = useState<boolean>(false);
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);

  // MetaMaskコンテキストを使用
  const { isConnected } = useMetaMask();

  // 初期化チェック
  useEffect(() => {
    const checkInitialization = async () => {
      const initialized = languageModelService.isModelInitialized();
      setIsModelInitialized(initialized);
    };
    
    checkInitialization();
  }, []);

  // トークン情報の取得（実際のアプリではAPIから取得）
  const fetchTokenInfo = async (address: string): Promise<TokenInfo | null> => {
    try {
      // この例では、モックデータを返す
      // 実際のアプリでは、CoinGecko APIなどから取得する
      return {
        address: address,
        name: 'Example Token',
        symbol: 'EXT',
        decimals: 18,
        totalSupply: '1000000000000000000000000',
        marketCap: 10000000,
        volume24h: 500000,
        priceUSD: 0.05,
        priceChange24h: -2.5,
        logoUrl: 'https://example.com/token-logo.png'
      };
    } catch (error) {
      console.error('トークン情報の取得に失敗しました:', error);
      return null;
    }
  };

  // トークン評価の実行
  const evaluateToken = async () => {
    if (!tokenAddress) {
      setError('トークンアドレスを入力してください');
      return;
    }
    
    if (!isModelInitialized) {
      setError('言語モデルが初期化されていません');
      return;
    }
    
    setIsEvaluating(true);
    setError(null);
    setEvaluationResult(null);
    
    try {
      // トークン情報を取得
      const info = await fetchTokenInfo(tokenAddress);
      if (!info) {
        throw new Error('トークン情報の取得に失敗しました');
      }
      
      setTokenInfo(info);
      
      // トークン評価を実行
      const result = await languageModelService.evaluateToken(tokenAddress, info);
      setEvaluationResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
    } finally {
      setIsEvaluating(false);
    }
  };

  // モデルが初期化されていない場合
  if (!isModelInitialized) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>トークン評価</Text>
        <Text style={styles.warningText}>
          トークン評価機能を使用するには、まず言語モデルを初期化してください。
        </Text>
      </View>
    );
  }

  // リスクレベルに応じた色を取得
  const getRiskLevelColor = (riskLevel: string): string => {
    switch (riskLevel) {
      case 'low':
        return '#10B981'; // 緑
      case 'medium':
        return '#F59E0B'; // オレンジ
      case 'high':
        return '#EF4444'; // 赤
      default:
        return '#6B7280'; // グレー
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>トークン評価</Text>
      <Text style={styles.description}>
        トークンアドレスを入力して、AIによる評価を確認できます。
        リスク評価、肯定的・否定的なポイント、総合評価が表示されます。
      </Text>
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="トークンアドレスを入力"
          value={tokenAddress}
          onChangeText={setTokenAddress}
        />
        
        <TouchableOpacity
          style={[styles.button, !tokenAddress || isEvaluating ? styles.disabledButton : null]}
          onPress={evaluateToken}
          disabled={!tokenAddress || isEvaluating}
        >
          {isEvaluating ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>評価する</Text>
          )}
        </TouchableOpacity>
      </View>
      
      {error && <Text style={styles.errorText}>{error}</Text>}
      
      {evaluationResult && (
        <ScrollView style={styles.resultContainer}>
          {/* トークン基本情報 */}
          <View style={styles.tokenInfoContainer}>
            {tokenInfo?.logoUrl && (
              <Image
                source={{ uri: tokenInfo.logoUrl }}
                style={styles.tokenLogo}
              />
            )}
            <View style={styles.tokenInfoText}>
              <Text style={styles.tokenName}>{evaluationResult.name}</Text>
              <Text style={styles.tokenSymbol}>{evaluationResult.symbol}</Text>
              <Text style={styles.tokenAddress}>{evaluationResult.address.substring(0, 8)}...{evaluationResult.address.substring(evaluationResult.address.length - 6)}</Text>
            </View>
          </View>
          
          {/* スコアとリスクレベル */}
          <View style={styles.scoreContainer}>
            <View style={styles.scoreItem}>
              <Text style={styles.scoreLabel}>スコア</Text>
              <Text style={styles.scoreValue}>{evaluationResult.score}/100</Text>
              <View style={[styles.scoreBar, { width: `${evaluationResult.score}%` }]} />
            </View>
            
            <View style={styles.scoreItem}>
              <Text style={styles.scoreLabel}>リスクレベル</Text>
              <Text style={[
                styles.riskLevel,
                { color: getRiskLevelColor(evaluationResult.riskLevel) }
              ]}>
                {evaluationResult.riskLevel === 'low' ? '低' : 
                 evaluationResult.riskLevel === 'medium' ? '中' : '高'}
              </Text>
            </View>
          </View>
          
          {/* 評価サマリー */}
          <View style={styles.summaryContainer}>
            <Text style={styles.sectionTitle}>評価サマリー</Text>
            <Text style={styles.summaryText}>{evaluationResult.summary}</Text>
          </View>
          
          {/* 肯定的ポイント */}
          <View style={styles.pointsContainer}>
            <Text style={styles.sectionTitle}>肯定的なポイント</Text>
            {evaluationResult.positivePoints.length > 0 ? (
              evaluationResult.positivePoints.map((point, index) => (
                <View key={`positive-${index}`} style={styles.pointItem}>
                  <Text style={styles.pointIcon}>✓</Text>
                  <Text style={styles.pointText}>{point}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>肯定的なポイントはありません</Text>
            )}
          </View>
          
          {/* 否定的ポイント */}
          <View style={styles.pointsContainer}>
            <Text style={styles.sectionTitle}>否定的なポイント</Text>
            {evaluationResult.negativePoints.length > 0 ? (
              evaluationResult.negativePoints.map((point, index) => (
                <View key={`negative-${index}`} style={styles.pointItem}>
                  <Text style={styles.pointIconNegative}>✗</Text>
                  <Text style={styles.pointText}>{point}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>否定的なポイントはありません</Text>
            )}
          </View>
        </ScrollView>
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
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 4,
    padding: 12,
    fontSize: 16,
    marginRight: 8,
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
    maxHeight: 400,
  },
  tokenInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  tokenLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  tokenInfoText: {
    flex: 1,
  },
  tokenName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  tokenSymbol: {
    fontSize: 14,
    color: '#6B7280',
  },
  tokenAddress: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  scoreContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  scoreItem: {
    flex: 1,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginRight: 8,
  },
  scoreLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  scoreBar: {
    height: 4,
    backgroundColor: '#4F46E5',
    borderRadius: 2,
  },
  riskLevel: {
    fontSize: 18,
    fontWeight: '600',
  },
  summaryContainer: {
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  pointsContainer: {
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 16,
  },
  pointItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  pointIcon: {
    fontSize: 14,
    color: '#10B981',
    marginRight: 8,
    fontWeight: 'bold',
  },
  pointIconNegative: {
    fontSize: 14,
    color: '#EF4444',
    marginRight: 8,
    fontWeight: 'bold',
  },
  pointText: {
    flex: 1,
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
});

export default TokenEvaluationComponent;
