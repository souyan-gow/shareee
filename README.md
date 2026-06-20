# HTML Vault

スマホ・PCの両方からHTMLファイルをアップロードして、いつでも閲覧できる個人用の静的サイト。GitHub Pages上で動作し、サーバーレスで完結する。

## 概要

- 自分が作成・収集したHTMLファイル（単一HTML / 関連ファイル込みのzip）を、ブラウザから直接GitHubリポジトリにアップロード
- アップロードしたファイルは `https://{user}.github.io/{repo}/files/{id}/` で閲覧可能
- URLを知っている人なら誰でも閲覧できる（ただしGoogleにはインデックスされない設計）
- 管理（アップロード・編集・削除）は本人のみがPersonal Access Tokenで実行

## ドキュメント

| ドキュメント | 内容 |
|---|---|
| [SPEC.md](./SPEC.md) | 機能仕様、UI仕様、データモデル |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | リポジトリ構成、データフロー、Actions設計 |
| [IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md) | フェーズ分けされた実装タスクリスト |
| [OPERATIONS.md](./OPERATIONS.md) | 運用者の追加手順、PAT管理、トラブルシューティング |
| [CLAUDE.md](./CLAUDE.md) | ClaudeCode用の作業指示・コーディング規約 |

## 技術スタック

- フロントエンド: React 18 + TypeScript + Vite
- ルーティング: React Router
- 状態管理: Zustand
- スタイリング: Tailwind CSS
- zip操作: JSZip
- PWA: vite-plugin-pwa
- ホスティング: GitHub Pages (Public repo)
- サムネ生成: GitHub Actions + Puppeteer

すべて無料の範囲で運用可能。

## 想定する運用者

- 当面: 1名（リポジトリオーナー）
- 将来: 最大2〜3名程度を想定（Collaborator追加で対応）

## ライセンス

個人プロジェクト。コードのライセンス方針はリポジトリ作成時に決定する。
