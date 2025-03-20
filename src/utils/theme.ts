import { DefaultTheme } from 'react-native-paper';

// ノルディックデザインのカラーパレット
const colors = {
  // プライマリカラー - 深い青（ノルウェーの海を表現）
  primary: {
    main: '#1E3A8A',
    light: '#3B5CB8',
    dark: '#0F2A6F',
    contrast: '#FFFFFF',
  },
  // セカンダリカラー - 温かみのある赤（スカンジナビアの伝統的な赤）
  secondary: {
    main: '#C64756',
    light: '#E57373',
    dark: '#9A2A3A',
    contrast: '#FFFFFF',
  },
  // アクセントカラー - 森の緑（スウェーデンの森を表現）
  accent: {
    main: '#2E7D32',
    light: '#4CAF50',
    dark: '#1B5E20',
    contrast: '#FFFFFF',
  },
  // 背景色 - 明るい灰色（スカンジナビアの明るい空間を表現）
  background: {
    default: '#F5F7FA',
    paper: '#FFFFFF',
    elevated: '#FFFFFF',
  },
  // テキスト色
  text: {
    primary: '#263238',
    secondary: '#546E7A',
    disabled: '#90A4AE',
    hint: '#78909C',
  },
  // 境界線色
  border: {
    light: '#E1E8ED',
    main: '#CFD8DC',
    dark: '#B0BEC5',
  },
  // 状態色
  state: {
    success: '#43A047',
    warning: '#FFA000',
    error: '#E53935',
    info: '#1E88E5',
  },
  // 特殊色
  special: {
    dogBark: '#FFD54F', // 犬の鳴き声アラート用の色
  },
};

// フォントサイズ
const fontSizes = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 20,
  xxxl: 24,
  display: 32,
};

// スペーシング
const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// 角丸
const roundness = {
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

// シャドウ
const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  xs: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
};

// アニメーション
const animation = {
  scale: 1.0,
  duration: {
    shortest: 150,
    shorter: 200,
    short: 250,
    standard: 300,
    complex: 375,
    enteringScreen: 225,
    leavingScreen: 195,
  },
};

// React Native Paperテーマの拡張
export const nordicTheme = {
  ...DefaultTheme,
  roundness: roundness.md,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary.main,
    accent: colors.accent.main,
    background: colors.background.default,
    surface: colors.background.paper,
    text: colors.text.primary,
    disabled: colors.text.disabled,
    placeholder: colors.text.hint,
    backdrop: 'rgba(0, 0, 0, 0.5)',
    notification: colors.secondary.main,
    error: colors.state.error,
  },
  // カスタムテーマプロパティ
  custom: {
    colors,
    fontSizes,
    spacing,
    roundness,
    shadows,
    animation,
  },
};

// テーマのエクスポート
export default nordicTheme;
