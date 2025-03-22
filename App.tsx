import React, { useEffect, useState } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, View, Text, TouchableOpacity, Platform } from 'react-native';

// ポリフィルのインポート（Web用）
if (Platform.OS === 'web') {
  require('./src/polyfills');
  require('text-encoding');
}

import 'react-native-get-random-values';
import '@ethersproject/shims';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider as PaperProvider, IconButton } from 'react-native-paper';

// サービス
import { metaMaskService } from './src/services/metamask/MetaMaskService';
import { MetaMaskProvider } from './src/services/metamask/MetaMaskContext';
import transactionMonitorService from './src/services/transaction/TransactionMonitorService';
import alertService from './src/services/alert/AlertService';
import languageModelService from './src/services/ai/LanguageModelService';

// アイコン
import { NordicIcon, nordicIconsXml } from './src/utils/nordicIcons';

// コンポーネント
import Dashboard from './src/components/dashboard/Dashboard';
import TransactionMonitor from './src/components/transaction/TransactionMonitor';
import IntentInputComponent from './src/components/ai/IntentInputComponent';
import TokenEvaluationComponent from './src/components/ai/TokenEvaluationComponent';
import Settings from './src/components/settings/Settings';
import NotificationSystem from './src/components/alert/NotificationSystem';

// テーマ
import nordicTheme from './src/utils/theme';

// タブナビゲーション
const Tab = createBottomTabNavigator();

/**
 * アプリケーションのメインコンポーネント
 */
const App: React.FC = () => {
  // 初期化状態
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [initError, setInitError] = useState<string | null>(null);

  // アプリケーションの初期化
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // MetaMask SDKの初期化
        const initResult = await metaMaskService.initialize();
        if (!initResult.success) {
          setInitError(initResult.error || 'MetaMask SDKの初期化に失敗しました');
          return;
        }

        // トランザクション監視サービスの初期化
        const monitorInitialized = await transactionMonitorService.initialize();
        if (!monitorInitialized) {
          setInitError('トランザクション監視サービスの初期化に失敗しました');
          return;
        }

        // アラートサービスの初期化
        const alertInitialized = alertService.initialize();
        if (!alertInitialized) {
          setInitError('アラートサービスの初期化に失敗しました');
          return;
        }

        // 言語モデルサービスの初期化（APIキーがあれば）
        try {
          await languageModelService.initialize();
        } catch (error) {
          console.log('言語モデルサービスの初期化をスキップします（APIキーが必要です）');
        }

        // 初期化完了
        setIsInitialized(true);
        
        // 初期化成功通知
        alertService.addSuccess(
          'GuardianAI 起動完了',
          'アプリケーションが正常に初期化されました。ウォレットを接続して利用を開始してください。'
        );
      } catch (error) {
        console.error('アプリケーションの初期化に失敗しました:', error);
        setInitError(`初期化エラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
      }
    };

    initializeApp();

    // クリーンアップ関数
    return () => {
      // トランザクション監視を停止
      transactionMonitorService.stopMonitoring();
    };
  }, []);

  // エラー状態の表示
  if (initError) {
    if (initError.includes('MetaMask')) {
      return (
        <SafeAreaView style={styles.errorContainer}>
          <View style={styles.errorContent}>
            <NordicIcon.Alert width={48} height={48} color={nordicTheme.custom.colors.state.warning} />
            <View style={styles.errorTextContainer}>
              <Text style={styles.errorTitle}>MetaMaskが必要です</Text>
            <Text style={styles.errorMessage}>
              このアプリケーションを使用するにはMetaMaskブラウザ拡張機能が必要です。
              {'\n\n'}
              MetaMaskがインストールされている場合は、ブラウザがMetaMaskを認識できない状態です。
              以下をお試しください：
              {'\n\n'}
              1. ブラウザの拡張機能が有効になっているか確認
              {'\n'}
              2. ページを再読み込み
              {'\n'}
              3. MetaMaskを再起動
            </Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.installButton}
            onPress={() => window.open('https://metamask.io/download/', '_blank')}
          >
            <Text style={styles.installButtonText}>MetaMaskをインストール</Text>
          </TouchableOpacity>
        </SafeAreaView>
      );
    }
    return (
      <SafeAreaView style={styles.errorContainer}>
        <View style={styles.errorContent}>
          <NordicIcon.Alert width={48} height={48} color={nordicTheme.custom.colors.state.error} />
          <View style={styles.errorTextContainer}>
            <Text style={styles.errorTitle}>初期化エラー</Text>
            <Text style={styles.errorMessage}>{initError}</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ローディング表示
  if (!isInitialized) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <NordicIcon.Loading width={48} height={48} color={nordicTheme.custom.colors.primary.main} />
          <View style={styles.loadingTextContainer}>
            <Text style={styles.loadingTitle}>読み込み中...</Text>
            <Text style={styles.loadingMessage}>GuardianAIを初期化しています。しばらくお待ちください。</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <PaperProvider theme={nordicTheme}>
      <MetaMaskProvider>
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="dark-content" backgroundColor={nordicTheme.custom.colors.background.default} />
          
          {/* 通知システム（グローバル） */}
          <View style={styles.notificationContainer}>
            <NotificationSystem />
          </View>
          
          <NavigationContainer>
            <Tab.Navigator
              screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                  if (route.name === 'ダッシュボード') {
                    return focused 
                      ? <NordicIcon.Dashboard width={size} height={size} color={color} />
                      : <NordicIcon.DashboardOutline width={size} height={size} color={color} />;
                  } else if (route.name === 'トランザクション') {
                    return focused 
                      ? <NordicIcon.Transaction width={size} height={size} color={color} />
                      : <NordicIcon.TransactionOutline width={size} height={size} color={color} />;
                  } else if (route.name === '意図設定') {
                    return focused 
                      ? <NordicIcon.Intent width={size} height={size} color={color} />
                      : <NordicIcon.IntentOutline width={size} height={size} color={color} />;
                  } else if (route.name === 'トークン評価') {
                    return focused 
                      ? <NordicIcon.Token width={size} height={size} color={color} />
                      : <NordicIcon.TokenOutline width={size} height={size} color={color} />;
                  } else if (route.name === '設定') {
                    return focused 
                      ? <NordicIcon.Settings width={size} height={size} color={color} />
                      : <NordicIcon.SettingsOutline width={size} height={size} color={color} />;
                  }
                  
                  // デフォルトアイコン
                  return <NordicIcon.Dashboard width={size} height={size} color={color} />;
                },
                tabBarActiveTintColor: nordicTheme.custom.colors.primary.main,
                tabBarInactiveTintColor: nordicTheme.custom.colors.text.secondary,
                tabBarStyle: {
                  backgroundColor: nordicTheme.custom.colors.background.paper,
                  borderTopWidth: 1,
                  borderTopColor: nordicTheme.custom.colors.border.light,
                  ...nordicTheme.custom.shadows.sm
                },
                headerStyle: {
                  backgroundColor: nordicTheme.custom.colors.background.paper,
                  ...nordicTheme.custom.shadows.sm
                },
                headerTintColor: nordicTheme.custom.colors.text.primary,
                headerTitleStyle: {
                  fontWeight: '600',
                },
              })}
            >
              <Tab.Screen name="ダッシュボード" component={Dashboard} />
              <Tab.Screen name="トランザクション" component={TransactionMonitor} />
              <Tab.Screen name="意図設定" component={IntentInputComponent} />
              <Tab.Screen name="トークン評価" component={TokenEvaluationComponent} />
              <Tab.Screen name="設定" component={Settings} />
            </Tab.Navigator>
          </NavigationContainer>
        </SafeAreaView>
      </MetaMaskProvider>
    </PaperProvider>
  );
};

// スタイル
const styles = StyleSheet.create({
  installButton: {
    backgroundColor: nordicTheme.custom.colors.primary.main,
    padding: nordicTheme.custom.spacing.md,
    borderRadius: nordicTheme.custom.roundness.md,
    marginTop: nordicTheme.custom.spacing.lg,
    width: '80%',
    maxWidth: 300,
    alignItems: 'center',
  },
  installButtonText: {
    color: '#FFFFFF',
    fontSize: nordicTheme.custom.fontSizes.md,
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
    backgroundColor: nordicTheme.custom.colors.background.default,
  },
  notificationContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 1000,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: nordicTheme.custom.colors.background.default,
    padding: nordicTheme.custom.spacing.lg,
  },
  errorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: nordicTheme.custom.colors.background.paper,
    padding: nordicTheme.custom.spacing.md,
    borderRadius: nordicTheme.custom.roundness.md,
    ...nordicTheme.custom.shadows.md,
    maxWidth: 500,
  },
  errorTextContainer: {
    marginLeft: nordicTheme.custom.spacing.md,
    flex: 1,
  },
  errorTitle: {
    fontSize: nordicTheme.custom.fontSizes.lg,
    fontWeight: 'bold',
    color: nordicTheme.custom.colors.state.error,
    marginBottom: nordicTheme.custom.spacing.xs,
  },
  errorMessage: {
    fontSize: nordicTheme.custom.fontSizes.md,
    color: nordicTheme.custom.colors.text.secondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: nordicTheme.custom.colors.background.default,
    padding: nordicTheme.custom.spacing.lg,
  },
  loadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: nordicTheme.custom.colors.background.paper,
    padding: nordicTheme.custom.spacing.md,
    borderRadius: nordicTheme.custom.roundness.md,
    ...nordicTheme.custom.shadows.md,
    maxWidth: 500,
  },
  loadingTextContainer: {
    marginLeft: nordicTheme.custom.spacing.md,
    flex: 1,
  },
  loadingTitle: {
    fontSize: nordicTheme.custom.fontSizes.lg,
    fontWeight: 'bold',
    color: nordicTheme.custom.colors.primary.main,
    marginBottom: nordicTheme.custom.spacing.xs,
  },
  loadingMessage: {
    fontSize: nordicTheme.custom.fontSizes.md,
    color: nordicTheme.custom.colors.text.secondary,
  },
});

export default App;
