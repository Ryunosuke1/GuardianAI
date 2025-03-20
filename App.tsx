import React, { useEffect, useState } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider as PaperProvider, IconButton } from 'react-native-paper';
import { SvgXml } from 'react-native-svg';

// サービス
import metaMaskService from './src/services/metamask/MetaMaskService';
import { MetaMaskProvider } from './src/services/metamask/MetaMaskContext';
import transactionMonitorService from './src/services/transaction/TransactionMonitorService';
import alertService from './src/services/alert/AlertService';
import languageModelService from './src/services/ai/LanguageModelService';

// アイコン
import nordicIcons from './src/utils/nordicIcons';

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
        const metaMaskInitialized = await metaMaskService.initialize();
        if (!metaMaskInitialized) {
          setInitError('MetaMask SDKの初期化に失敗しました');
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

  // 初期化エラー表示
  if (initError) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <View style={styles.errorContent}>
          <SvgXml xml={nordicIcons.alert} width={48} height={48} color={nordicTheme.colors.state.error} />
          <View style={styles.errorTextContainer}>
            <Text style={styles.errorTitle}>初期化エラー</Text>
            <Text style={styles.errorMessage}>{initError}</Text>
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
                  let iconXml;

                  if (route.name === 'ダッシュボード') {
                    iconXml = focused ? nordicIcons.dashboard : nordicIcons.dashboardOutline;
                  } else if (route.name === 'トランザクション') {
                    iconXml = focused ? nordicIcons.transaction : nordicIcons.transactionOutline;
                  } else if (route.name === '意図設定') {
                    iconXml = focused ? nordicIcons.intent : nordicIcons.intentOutline;
                  } else if (route.name === 'トークン評価') {
                    iconXml = focused ? nordicIcons.token : nordicIcons.tokenOutline;
                  } else if (route.name === '設定') {
                    iconXml = focused ? nordicIcons.settings : nordicIcons.settingsOutline;
                  }

                  return <SvgXml xml={iconXml} width={size} height={size} color={color} />;
                },
                tabBarActiveTintColor: nordicTheme.colors.primary.main,
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
    color: nordicTheme.colors.state.error,
    marginBottom: nordicTheme.custom.spacing.xs,
  },
  errorMessage: {
    fontSize: nordicTheme.custom.fontSizes.md,
    color: nordicTheme.custom.colors.text.secondary,
  },
});

export default App;
