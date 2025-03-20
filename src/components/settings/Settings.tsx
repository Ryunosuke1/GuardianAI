import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Switch, TouchableOpacity } from 'react-native';
import { Text, Card, Divider, TextInput } from 'react-native-paper';
import { useMetaMask } from '../../services/metamask/MetaMaskContext';
import languageModelService from '../../services/ai/LanguageModelService';
import transactionApprovalService from '../../services/transaction/TransactionApprovalService';
import nordicTheme from '../../utils/theme';

/**
 * 設定画面コンポーネント
 * アプリケーションの設定を変更するためのインターフェースを提供します
 */
const Settings: React.FC = () => {
  const { colors, custom } = nordicTheme;
  const { isConnected } = useMetaMask();

  // 状態管理
  const [apiKey, setApiKey] = useState<string>('');
  const [isSettingApiKey, setIsSettingApiKey] = useState<boolean>(false);
  const [autoApprove, setAutoApprove] = useState<boolean>(false);
  const [requestTimeout, setRequestTimeout] = useState<string>('300');
  const [dogBarkVolume, setDogBarkVolume] = useState<string>('80');
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 初期設定の読み込み
  useEffect(() => {
    const loadSettings = async () => {
      if (!isConnected) {
        return;
      }

      try {
        // 自動承認設定を取得
        const autoApproveEnabled = localStorage.getItem('autoApprove') === 'true';
        setAutoApprove(autoApproveEnabled);
        
        // リクエストタイムアウト設定を取得
        const timeout = localStorage.getItem('requestTimeout');
        if (timeout) {
          setRequestTimeout(timeout);
        }
        
        // 犬の鳴き声ボリューム設定を取得
        const volume = localStorage.getItem('dogBarkVolume');
        if (volume) {
          setDogBarkVolume(volume);
        }
        
        // 通知設定を取得
        const notifications = localStorage.getItem('notificationsEnabled') !== 'false';
        setNotificationsEnabled(notifications);
        
        // APIキーが設定されているか確認
        const hasKey = languageModelService.hasApiKey();
        if (hasKey) {
          setApiKey('********-****-****-****-************');
        }
      } catch (err) {
        console.error('設定の読み込みに失敗しました:', err);
      }
    };

    loadSettings();
  }, [isConnected]);

  // APIキーの保存
  const saveApiKey = async () => {
    if (!apiKey || apiKey === '********-****-****-****-************') {
      setError('有効なAPIキーを入力してください');
      return;
    }
    
    if (!isConnected) {
      setError('ウォレットが接続されていません');
      return;
    }
    
    setIsSettingApiKey(true);
    setError(null);
    setSuccess(null);
    
    try {
      // APIキーを保存
      const success = await languageModelService.saveApiKey(apiKey);
      if (success) {
        setSuccess('APIキーが正常に保存されました');
        setApiKey('********-****-****-****-************');
      } else {
        setError('APIキーの保存に失敗しました');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
    } finally {
      setIsSettingApiKey(false);
    }
  };

  // 自動承認設定の変更
  const handleAutoApproveChange = (value: boolean) => {
    setAutoApprove(value);
    transactionApprovalService.setAutoApprove(value);
    localStorage.setItem('autoApprove', value.toString());
  };

  // リクエストタイムアウト設定の保存
  const saveRequestTimeout = () => {
    const timeout = parseInt(requestTimeout);
    if (isNaN(timeout) || timeout < 30 || timeout > 3600) {
      setError('タイムアウトは30秒から3600秒の間で設定してください');
      return;
    }
    
    transactionApprovalService.setRequestTimeout(timeout * 1000);
    localStorage.setItem('requestTimeout', requestTimeout);
    setSuccess('タイムアウト設定が保存されました');
    setError(null);
  };

  // 犬の鳴き声ボリューム設定の保存
  const saveDogBarkVolume = () => {
    const volume = parseInt(dogBarkVolume);
    if (isNaN(volume) || volume < 0 || volume > 100) {
      setError('ボリュームは0から100の間で設定してください');
      return;
    }
    
    localStorage.setItem('dogBarkVolume', dogBarkVolume);
    setSuccess('ボリューム設定が保存されました');
    setError(null);
  };

  // 通知設定の変更
  const handleNotificationsChange = (value: boolean) => {
    setNotificationsEnabled(value);
    localStorage.setItem('notificationsEnabled', value.toString());
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>設定</Text>
        <Text style={styles.subtitle}>
          アプリケーションの設定を変更し、あなた好みにカスタマイズしましょう
        </Text>
      </View>

      {/* APIキー設定 */}
      <Card style={[styles.card, { ...custom.shadows.md }]}>
        <Card.Content>
          <Text style={styles.cardTitle}>OpenAI APIキー設定</Text>
          <Text style={styles.cardDescription}>
            自然言語処理機能を使用するには、OpenAI APIキーが必要です。
            APIキーはMetaMaskウォレット内に安全に保存されます。
          </Text>
          
          <TextInput
            style={styles.input}
            placeholder="OpenAI APIキーを入力"
            value={apiKey}
            onChangeText={setApiKey}
            secureTextEntry={apiKey === '********-****-****-****-************'}
            disabled={!isConnected || isSettingApiKey}
          />
          
          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor: colors.primary.main,
                opacity: !isConnected || !apiKey || isSettingApiKey ? 0.5 : 1,
              },
            ]}
            onPress={saveApiKey}
            disabled={!isConnected || !apiKey || isSettingApiKey}
          >
            <Text style={styles.buttonText}>APIキーを保存</Text>
          </TouchableOpacity>
        </Card.Content>
      </Card>

      {/* トランザクション設定 */}
      <Card style={[styles.card, { ...custom.shadows.md }]}>
        <Card.Content>
          <Text style={styles.cardTitle}>トランザクション設定</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingLabelContainer}>
              <Text style={styles.settingLabel}>自動承認</Text>
              <Text style={styles.settingDescription}>
                ルールに合致するトランザクションを自動的に承認します
              </Text>
            </View>
            <Switch
              value={autoApprove}
              onValueChange={handleAutoApproveChange}
              disabled={!isConnected}
              color={colors.primary.main}
            />
          </View>
          
          <Divider style={styles.divider} />
          
          <View style={styles.settingRow}>
            <View style={styles.settingLabelContainer}>
              <Text style={styles.settingLabel}>承認リクエストのタイムアウト</Text>
              <Text style={styles.settingDescription}>
                承認リクエストが自動的に期限切れになるまでの時間（秒）
              </Text>
            </View>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.numberInput}
                keyboardType="number-pad"
                value={requestTimeout}
                onChangeText={setRequestTimeout}
                disabled={!isConnected}
              />
              <TouchableOpacity
                style={[
                  styles.smallButton,
                  {
                    backgroundColor: colors.primary.main,
                    opacity: !isConnected ? 0.5 : 1,
                  },
                ]}
                onPress={saveRequestTimeout}
                disabled={!isConnected}
              >
                <Text style={styles.smallButtonText}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* アラート設定 */}
      <Card style={[styles.card, { ...custom.shadows.md }]}>
        <Card.Content>
          <Text style={styles.cardTitle}>アラート設定</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingLabelContainer}>
              <Text style={styles.settingLabel}>犬の鳴き声ボリューム</Text>
              <Text style={styles.settingDescription}>
                想定外のトランザクションが検出された時の犬の鳴き声のボリューム
              </Text>
            </View>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.numberInput}
                keyboardType="number-pad"
                value={dogBarkVolume}
                onChangeText={setDogBarkVolume}
              />
              <TouchableOpacity
                style={[styles.smallButton, { backgroundColor: colors.primary.main }]}
                onPress={saveDogBarkVolume}
              >
                <Text style={styles.smallButtonText}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <Divider style={styles.divider} />
          
          <View style={styles.settingRow}>
            <View style={styles.settingLabelContainer}>
              <Text style={styles.settingLabel}>通知</Text>
              <Text style={styles.settingDescription}>
                トランザクションの承認や拒否に関する通知を有効にします
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleNotificationsChange}
              color={colors.primary.main}
            />
          </View>
        </Card.Content>
      </Card>

      {/* エラーと成功メッセージ */}
      {error && (
        <Card style={[styles.messageCard, { borderLeftColor: colors.state.error, borderLeftWidth: 4 }]}>
          <Card.Content>
            <Text style={{ color: colors.state.error }}>{error}</Text>
          </Card.Content>
        </Card>
      )}
      
      {success && (
        <Card style={[styles.messageCard, { borderLeftColor: colors.state.success, borderLeftWidth: 4 }]}>
          <Card.Content>
            <Text style={{ color: colors.state.success }}>{success}</Text>
          </Card.Content>
        </Card>
      )}
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
  messageCard: {
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
  input: {
    borderWidth: 1,
    borderColor: nordicTheme.custom.colors.border.main,
    borderRadius: nordicTheme.custom.roundness.sm,
    padding: nordicTheme.custom.spacing.sm,
    marginBottom: nordicTheme.custom.spacing.md,
    fontSize: nordicTheme.custom.fontSizes.md,
  },
  button: {
    paddingVertical: nordicTheme.custom.spacing.sm,
    paddingHorizontal: nordicTheme.custom.spacing.md,
    borderRadius: nordicTheme.custom.roundness.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: nordicTheme.custom.colors.background.paper,
    fontWeight: '600',
    fontSize: nordicTheme.custom.fontSizes.md,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: nordicTheme.custom.spacing.sm,
  },
  settingLabelContainer: {
    flex: 1,
    marginRight: nordicTheme.custom.spacing.md,
  },
  settingLabel: {
    fontSize: nordicTheme.custom.fontSizes.md,
    fontWeight: '600',
    color: nordicTheme.custom.colors.text.primary,
    marginBottom: nordicTheme.custom.spacing.xs,
  },
  settingDescription: {
    fontSize: nordicTheme.custom.fontSizes.sm,
    color: nordicTheme.custom.colors.text.secondary,
  },
  divider: {
    marginVertical: nordicTheme.custom.spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  numberInput: {
    width: 80,
    borderWidth: 1,
    borderColor: nordicTheme.custom.colors.border.main,
    borderRadius: nordicTheme.custom.roundness.sm,
    padding: nordicTheme.custom.spacing.sm,
    fontSize: nordicTheme.custom.fontSizes.md,
    marginRight: nordicTheme.custom.spacing.sm,
  },
  smallButton: {
    paddingVertical: nordicTheme.custom.spacing.xs,
    paddingHorizontal: nordicTheme.custom.spacing.sm,
    borderRadius: nordicTheme.custom.roundness.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallButtonText: {
    color: nordicTheme.custom.colors.background.paper,
    fontWeight: '600',
    fontSize: nordicTheme.custom.fontSizes.sm,
  },
});

export default Settings;
