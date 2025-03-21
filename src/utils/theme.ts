import { DefaultTheme } from 'react-native-paper';

// カスタムカラーパレット
const customColors = {
  primary: {
    main: '#007AFF',
    light: '#4DA3FF',
    dark: '#0055B3',
    contrast: '#FFFFFF'
  },
  secondary: {
    main: '#5856D6',
    light: '#8280E5',
    dark: '#3634A3',
    contrast: '#FFFFFF'
  },
  accent: {
    main: '#FF2D55',
    light: '#FF6B88',
    dark: '#D60339',
    contrast: '#FFFFFF'
  },
  text: {
    primary: '#000000',
    secondary: '#666666',
    disabled: '#999999',
    hint: '#CCCCCC'
  },
  background: {
    default: '#F5F5F5',
    paper: '#FFFFFF',
    elevated: '#FFFFFF'
  },
  state: {
    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',
    info: '#5856D6',
    disabled: '#C7C7CC'
  },
  transaction: {
    transfer: '#007AFF',
    swap: '#5856D6',
    approval: '#FF9500',
    mint: '#34C759',
    burn: '#FF3B30',
    stake: '#AF52DE',
    unstake: '#FF2D55',
    claim: '#30B0C7',
    contract: '#8E8E93',
    unknown: '#C7C7CC'
  }
};

// フォントサイズ
const fontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 30
};

// スペーシング
const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32
};

// 角丸
const roundness = {
  sm: 4,
  md: 8,
  lg: 16
};

// シャドウ
const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 1
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5
  }
};

// React Native Paperテーマの拡張
export const nordicTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: customColors.primary.main,
    accent: customColors.accent.main,
    background: customColors.background.default,
    surface: customColors.background.paper,
    text: customColors.text.primary,
    disabled: customColors.text.disabled,
    placeholder: customColors.text.hint,
    backdrop: 'rgba(0, 0, 0, 0.5)',
    notification: customColors.secondary.main,
    error: customColors.state.error
  },
  // カスタムテーマプロパティ
  custom: {
    colors: customColors,
    fontSizes,
    spacing,
    roundness,
    shadows
  }
};

export default nordicTheme;
