# GuardianAI

GuardianAIは、MetaMask SDKを使用したトランザクション監視アプリケーションです。ユーザーのウォレットを監視し、不審なトランザクションを検出して警告します。

## 機能

- MetaMask SDKを使用したウォレット接続と認証
- リアルタイムトランザクション監視
- 自然言語による取引条件の設定
- 異常トランザクションの検出と警告
- トークン評価機能
- ノルディック風のシンプルで洗練されたUI

## 技術スタック

- React Native with Expo
- TypeScript
- MetaMask SDK
- ethers.js
- React Native Paper

## セットアップ

### 前提条件

- Node.js (v16以上)
- npm または yarn
- Expo CLI

### インストール

```bash
# リポジトリをクローン
git clone https://github.com/Ryunosuke1/GuardianAI.git
cd GuardianAI

# 依存関係のインストール
npm install --legacy-peer-deps

# Webサポートのためのパッケージをインストール
npx expo install react-native-web@~0.19.6 -- --legacy-peer-deps
```

### 実行

```bash
# アプリケーションを起動（Web）
npx expo start --web

# アプリケーションを起動（iOS）
npx expo start --ios

# アプリケーションを起動（Android）
npx expo start --android
```

## プロジェクト構造

```
GuardianAI/
├── assets/              # アイコンや画像などの静的ファイル
├── src/                 # ソースコード
│   ├── components/      # UIコンポーネント
│   │   ├── common/      # 共通コンポーネント
│   │   ├── transaction/ # トランザクション関連コンポーネント
│   │   └── wallet/      # ウォレット関連コンポーネント
│   ├── screens/         # 画面コンポーネント
│   ├── services/        # サービス
│   │   ├── metamask/    # MetaMask関連サービス
│   │   ├── transaction/ # トランザクション関連サービス
│   │   └── ai/          # AI関連サービス
│   ├── utils/           # ユーティリティ関数
│   └── types/           # TypeScript型定義
├── App.tsx              # アプリケーションのエントリーポイント
├── app.json             # Expoの設定ファイル
└── package.json         # 依存関係の定義
```

## 主要コンポーネント

### MetaMask統合

`src/services/metamask/MetaMaskContext.tsx`はMetaMask SDKとの統合を担当します。最新の`useSDK`フックを使用して、ウォレット接続、トランザクション署名、メッセージ署名などの機能を提供します。

### トランザクション監視

`src/services/transaction/TransactionMonitorService.ts`はブロックチェーン上のトランザクションを監視し、分析します。キュー処理メカニズム、エラーハンドリング、リトライロジックなどが実装されています。

### UIコンポーネント

`src/components/transaction/TransactionMonitor.tsx`はトランザクション監視画面を提供します。ノルディック風のデザインを採用し、トランザクションの承認/拒否、監視状態の切り替えなどの機能を提供します。

## ライセンス

MIT
