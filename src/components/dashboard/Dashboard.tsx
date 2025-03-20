import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, useTheme } from 'react-native-paper';
import WalletConnectButton from '../wallet/WalletConnectButton';
import IntentInputComponent from '../ai/IntentInputComponent';
import nordicTheme from '../../utils/theme';

/**
 * メインダッシュボードコンポーネント
 * アプリケーションのメイン画面として、各機能へのアクセスを提供します
 */
const Dashboard: React.FC = () => {
  const theme = useTheme();
  const { colors, custom } = nordicTheme;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>GuardianAI ダッシュボード</Text>
        <Text style={styles.subtitle}>
          あなたの取引を監視し、想定外のトランザクションから保護します
        </Text>
      </View>

      {/* ウォレット接続セクション */}
      <Card style={[styles.card, { ...custom.shadows.md }]}>
        <Card.Content>
          <Text style={styles.cardTitle}>ウォレット接続</Text>
          <Text style={styles.cardDescription}>
            MetaMaskウォレットに接続して、GuardianAIの機能を利用しましょう。
          </Text>
          <View style={styles.cardAction}>
            <WalletConnectButton />
          </View>
        </Card.Content>
      </Card>

      {/* 取引意図入力セクション */}
      <Card style={[styles.card, { ...custom.shadows.md }]}>
        <Card.Content>
          <Text style={styles.cardTitle}>取引の想定を設定</Text>
          <Text style={styles.cardDescription}>
            自然言語で取引の「想定」を入力してください。GuardianAIがあなたの意図を理解し、
            想定外のトランザクションを検知します。
          </Text>
          <IntentInputComponent />
        </Card.Content>
      </Card>

      {/* トランザクション監視セクション */}
      <Card style={[styles.card, { ...custom.shadows.md }]}>
        <Card.Content>
          <Text style={styles.cardTitle}>トランザクション監視</Text>
          <Text style={styles.cardDescription}>
            あなたの取引をリアルタイムで監視し、想定外のトランザクションを検知します。
          </Text>
          <View style={styles.cardAction}>
            <Text
              style={[styles.linkText, { color: colors.primary.main }]}
              onPress={() => {
                // トランザクション監視画面に遷移
                // navigation.navigate('TransactionMonitor');
              }}
            >
              トランザクション監視を開く →
            </Text>
          </View>
        </Card.Content>
      </Card>

      {/* トークン評価セクション */}
      <Card style={[styles.card, { ...custom.shadows.md }]}>
        <Card.Content>
          <Text style={styles.cardTitle}>トークン評価</Text>
          <Text style={styles.cardDescription}>
            トークンの評価を確認し、リスクや将来性を分析します。
          </Text>
          <View style={styles.cardAction}>
            <Text
              style={[styles.linkText, { color: colors.primary.main }]}
              onPress={() => {
                // トークン評価画面に遷移
                // navigation.navigate('TokenEvaluation');
              }}
            >
              トークン評価を開く →
            </Text>
          </View>
        </Card.Content>
      </Card>

      {/* 設定セクション */}
      <Card style={[styles.card, { ...custom.shadows.md }]}>
        <Card.Content>
          <Text style={styles.cardTitle}>設定</Text>
          <Text style={styles.cardDescription}>
            アプリケーションの設定を変更し、あなた好みにカスタマイズしましょう。
          </Text>
          <View style={styles.cardAction}>
            <Text
              style={[styles.linkText, { color: colors.primary.main }]}
              onPress={() => {
                // 設定画面に遷移
                // navigation.navigate('Settings');
              }}
            >
              設定を開く →
            </Text>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: nordicTheme.custom.colors.background.default,
  },
  header: {
    padding: nordicTheme.custom.spacing.md,
    marginBottom: nordicTheme.custom.spacing.md,
  },
  title: {
    fontSize: nordicTheme.custom.fontSizes.xxxl,
    fontWeight: 'bold',
    color: nordicTheme.custom.colors.text.primary,
    marginBottom: nordicTheme.custom.spacing.xs,
  },
  subtitle: {
    fontSize: nordicTheme.custom.fontSizes.md,
    color: nordicTheme.custom.colors.text.secondary,
  },
  card: {
    marginHorizontal: nordicTheme.custom.spacing.md,
    marginBottom: nordicTheme.custom.spacing.md,
    borderRadius: nordicTheme.custom.roundness.md,
    backgroundColor: nordicTheme.custom.colors.background.paper,
  },
  cardTitle: {
    fontSize: nordicTheme.custom.fontSizes.xl,
    fontWeight: '600',
    color: nordicTheme.custom.colors.text.primary,
    marginBottom: nordicTheme.custom.spacing.xs,
  },
  cardDescription: {
    fontSize: nordicTheme.custom.fontSizes.md,
    color: nordicTheme.custom.colors.text.secondary,
    marginBottom: nordicTheme.custom.spacing.md,
  },
  cardAction: {
    marginTop: nordicTheme.custom.spacing.sm,
  },
  linkText: {
    fontSize: nordicTheme.custom.fontSizes.md,
    fontWeight: '600',
  },
});

export default Dashboard;
