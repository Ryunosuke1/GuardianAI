import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Card, RadioButton, TextInput, Button } from 'react-native-paper';
import alertService, { NotificationType } from '../../services/alert/AlertService';
import nordicTheme from '../../utils/theme';

/**
 * ユーザーフィードバックコンポーネント
 * ユーザーからのフィードバックを収集するコンポーネント
 */
const UserFeedbackSystem: React.FC = () => {
  const { colors, custom } = nordicTheme;

  // 状態管理
  const [feedbackType, setFeedbackType] = useState<string>('suggestion');
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [rating, setRating] = useState<number>(5);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);

  // フィードバック送信
  const submitFeedback = () => {
    if (!feedbackText) {
      alertService.addWarning(
        'フィードバック入力が必要です',
        'フィードバックの内容を入力してください'
      );
      return;
    }

    setIsSubmitting(true);
    
    // フィードバックデータの作成
    const feedbackData = {
      type: feedbackType,
      text: feedbackText,
      rating: rating,
      timestamp: Date.now(),
      device: {
        platform: 'web',
        userAgent: navigator.userAgent
      }
    };
    
    // 実際のアプリケーションではサーバーに送信するか、
    // 分散ストレージに保存するなどの処理を行う
    
    // フィードバック送信の模擬（実際のアプリでは非同期処理）
    setTimeout(() => {
      console.log('フィードバック送信:', feedbackData);
      
      // 成功通知
      alertService.addSuccess(
        'フィードバックを送信しました',
        'ご意見ありがとうございます。今後のアプリ改善に役立てます。'
      );
      
      // 状態をリセット
      setFeedbackText('');
      setRating(5);
      setIsSubmitting(false);
      setSuccess(true);
      
      // 成功メッセージを一定時間後に消す
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    }, 1000);
  };

  // 評価スターの表示
  const renderRatingStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity
          key={i}
          onPress={() => setRating(i)}
          style={styles.starContainer}
        >
          <Text style={[
            styles.star,
            { color: i <= rating ? colors.special.dogBark : colors.border.main }
          ]}>
            ★
          </Text>
        </TouchableOpacity>
      );
    }
    return (
      <View style={styles.starsContainer}>
        {stars}
      </View>
    );
  };

  return (
    <Card style={[styles.card, { ...custom.shadows.md }]}>
      <Card.Content>
        <Text style={styles.title}>フィードバック</Text>
        <Text style={styles.description}>
          GuardianAIの改善にご協力ください。ご意見やご提案をお聞かせください。
        </Text>
        
        <View style={styles.radioGroup}>
          <RadioButton.Group
            onValueChange={value => setFeedbackType(value)}
            value={feedbackType}
          >
            <View style={styles.radioOption}>
              <RadioButton.Item
                label="提案"
                value="suggestion"
                color={colors.primary.main}
              />
            </View>
            <View style={styles.radioOption}>
              <RadioButton.Item
                label="バグ報告"
                value="bug"
                color={colors.primary.main}
              />
            </View>
            <View style={styles.radioOption}>
              <RadioButton.Item
                label="その他"
                value="other"
                color={colors.primary.main}
              />
            </View>
          </RadioButton.Group>
        </View>
        
        <TextInput
          style={styles.textArea}
          placeholder="フィードバックを入力してください"
          value={feedbackText}
          onChangeText={setFeedbackText}
          multiline
          numberOfLines={4}
          disabled={isSubmitting}
        />
        
        <View style={styles.ratingContainer}>
          <Text style={styles.ratingLabel}>評価:</Text>
          {renderRatingStars()}
        </View>
        
        <Button
          mode="contained"
          style={[
            styles.submitButton,
            { backgroundColor: colors.primary.main }
          ]}
          onPress={submitFeedback}
          loading={isSubmitting}
          disabled={isSubmitting || !feedbackText}
        >
          フィードバックを送信
        </Button>
        
        {success && (
          <Text style={[styles.successText, { color: colors.state.success }]}>
            フィードバックを送信しました。ありがとうございます！
          </Text>
        )}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: nordicTheme.custom.spacing.md,
    marginBottom: nordicTheme.custom.spacing.md,
    borderRadius: nordicTheme.custom.roundness.md,
    backgroundColor: nordicTheme.custom.colors.background.paper,
  },
  title: {
    fontSize: nordicTheme.custom.fontSizes.xl,
    fontWeight: '600',
    color: nordicTheme.custom.colors.text.primary,
    marginBottom: nordicTheme.custom.spacing.xs,
  },
  description: {
    fontSize: nordicTheme.custom.fontSizes.md,
    color: nordicTheme.custom.colors.text.secondary,
    marginBottom: nordicTheme.custom.spacing.md,
  },
  radioGroup: {
    marginBottom: nordicTheme.custom.spacing.md,
  },
  radioOption: {
    marginBottom: nordicTheme.custom.spacing.xs,
  },
  textArea: {
    borderWidth: 1,
    borderColor: nordicTheme.custom.colors.border.main,
    borderRadius: nordicTheme.custom.roundness.sm,
    padding: nordicTheme.custom.spacing.sm,
    marginBottom: nordicTheme.custom.spacing.md,
    fontSize: nordicTheme.custom.fontSizes.md,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: nordicTheme.custom.spacing.md,
  },
  ratingLabel: {
    fontSize: nordicTheme.custom.fontSizes.md,
    color: nordicTheme.custom.colors.text.primary,
    marginRight: nordicTheme.custom.spacing.sm,
  },
  starsContainer: {
    flexDirection: 'row',
  },
  starContainer: {
    padding: nordicTheme.custom.spacing.xs,
  },
  star: {
    fontSize: 24,
  },
  submitButton: {
    marginTop: nordicTheme.custom.spacing.sm,
  },
  successText: {
    marginTop: nordicTheme.custom.spacing.md,
    textAlign: 'center',
    fontSize: nordicTheme.custom.fontSizes.md,
  },
});

export default UserFeedbackSystem;
