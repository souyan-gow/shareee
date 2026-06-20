# OPERATIONS.md — 運用ガイド

このドキュメントは、HTML Vault の日常運用、PAT の更新、運用者の追加、トラブルシューティングについて記述する。

## 1. 初回セットアップ（オーナー向け）

### 1.1 PATの発行と設定

1. GitHub.com にログイン → 右上アバター → **Settings**
2. 左メニュー一番下 → **Developer settings**
3. **Personal access tokens** → **Fine-grained tokens** → **Generate new token**
4. 入力:
   | 項目 | 値 |
   |---|---|
   | Token name | `html-vault-uploader`（任意） |
   | Expiration | 1年（推奨） |
   | Repository access | **Only select repositories** → `html-vault` を選択 |
   | Repository permissions → Contents | **Read and write** |
   | Repository permissions → Metadata | （自動でRead-onlyが付く） |
5. **Generate token** → 表示された `github_pat_xxxxx...` を**必ずコピーして安全な場所に保存**
   - ⚠️ この画面を閉じると二度と見られない
   - 推奨: 1Password / Bitwarden 等のパスワードマネージャに保存
6. デプロイ済みサイトの `/manage/setup` を開く
7. PAT 入力欄に貼り付け → 「疎通テスト」 → 成功なら「保存」

### 1.2 各端末での設定

- PCで設定したPATと同じ値を、スマホブラウザの `/manage/setup` に入力
- パスワードマネージャの同期機能があれば自動でコピー可能
- もしくは PC から自分宛て Slack / メモアプリでPATを送信 → スマホで貼り付け

### 1.3 PWAインストール（スマホ推奨）

**iOS（Safari）**
1. サイトを開く
2. 下部の共有ボタン → 「ホーム画面に追加」
3. ホーム画面のアイコンから起動 → localStorageが安定

**Android（Chrome）**
1. サイトを開く
2. メニュー → 「アプリをインストール」または「ホーム画面に追加」

---

## 2. PAT の更新（有効期限切れ時）

PATが期限切れになると、アップロード/編集操作で 401 エラーが発生する。

### 2.1 期限切れ前の事前更新（推奨）

GitHubから期限切れ7日前にメール通知が来る。通知が来たら:

1. GitHub.com → Settings → Developer settings → Fine-grained tokens
2. 該当トークンの「Regenerate」（既存設定を維持して再生成）または「Generate new token」で新規発行
3. 新PATを各端末の `/manage/setup` で更新

### 2.2 期限切れ後の復旧

期限切れ後にアップロードしようとすると、エラーモーダルが表示される。

1. 上記2.1の手順で新PATを発行
2. `/manage/setup` で「更新」ボタン → 新PAT入力 → 保存

### 2.3 PATの取り消し（紛失時など）

端末を紛失した、PATが漏洩した可能性がある等の場合:

1. GitHub.com → Settings → Developer settings → Fine-grained tokens
2. 該当トークンの **Revoke** ボタン
3. 即座に無効化（数秒以内）
4. 新PATを発行 → 安全な端末の `/manage/setup` で再設定

---

## 3. 運用者の追加手順

「将来もう一人運用者を増やしたい」というケースに対応する手順。

### 3.1 前提知識

- 新運用者は自分のGitHubアカウントを持っている必要がある
- 新運用者は自分専用のFine-grained PATを発行する（**PATを共有してはいけない**）
- manifest.json の `uploader` フィールドに、誰がアップロードしたか自動記録される

### 3.2 オーナーが行う作業

#### Step 1: 新運用者をCollaboratorとして招待

1. GitHub.com で `html-vault` リポジトリを開く
2. **Settings** → 左メニュー **Collaborators**
3. **Add people** → 新運用者のGitHubユーザー名 or メールアドレスを入力
4. **Add to repository**
5. 招待メールが新運用者に送信される

#### Step 2: 新運用者に伝える情報

以下を新運用者に共有する:

```
■ サイトURL
https://{owner}.github.io/html-vault/

■ 管理画面URL
https://{owner}.github.io/html-vault/manage

■ PAT発行手順
OPERATIONS.md の「3.3 新運用者が行う作業」を参照

■ 注意事項
- PATは絶対に他人と共有しないこと
- 1Password等のパスワードマネージャで管理推奨
- アップロードは自分のGitHubユーザー名で記録される
```

### 3.3 新運用者が行う作業

#### Step 1: Collaborator招待を受諾

1. GitHub からの招待メール、または `https://github.com/{owner}/html-vault/invitations` にアクセス
2. **Accept invitation**

#### Step 2: 自分専用のPATを発行

1. GitHub.com にログイン → 右上アバター → **Settings**
2. **Developer settings** → **Personal access tokens** → **Fine-grained tokens**
3. **Generate new token**
4. 入力:
   | 項目 | 値 |
   |---|---|
   | Token name | `html-vault-uploader`（任意） |
   | Resource owner | オーナーのアカウント名を選択（オーナーリポジトリへのアクセスを得るため） |
   | Expiration | 1年推奨 |
   | Repository access | **Only select repositories** → `html-vault` |
   | Repository permissions → Contents | **Read and write** |
5. **Generate token**
6. オーナー側の承認が必要な場合がある（Resource owner設定による）
   - オーナーは GitHub から通知を受け、承認する
7. 発行されたPATをコピー、パスワードマネージャに保存

#### Step 3: 管理画面でPATを設定

1. `https://{owner}.github.io/html-vault/manage/setup` にアクセス
2. PAT入力 → 「疎通テスト」 → 「保存」
3. これで自分のアカウントとしてアップロード可能

### 3.4 運用者の削除手順

ある運用者がプロジェクトを離れる場合:

1. **オーナー側**: GitHub リポジトリの Settings → Collaborators → 該当ユーザーの **Remove**
2. **離脱者側**: 自分の PAT を Revoke（残しておくと将来再招待時に混乱の元）

### 3.5 運用上の注意

- アクセス権限の最小化: Collaboratorに与える権限は GitHub のリポジトリ権限としては Write 相当
- manifest.json は楽観的更新（同時編集時の競合は基本的に発生しないが、極稀に発生し得る）
- 編集競合が発生した場合は後勝ち（最後のcommitが反映される）
- 同時操作が多い運用ではないので、現実的にはほぼ問題にならない

---

## 4. 日常運用

### 4.1 アップロード

**スマホ:**
- ホーム画面アイコンからアプリ起動
- `/manage` で「+ 新規アップロード」
- HTMLファイル/zip 選択 → 表示名/フォルダ/タグ入力 → アップロード
- 1〜2分でサムネ生成完了

**PC:**
- 同様の操作、またはファイルを画面にドラッグ&ドロップ

### 4.2 整理（PCでの作業推奨）

- 複数選択モード → 一括フォルダ移動・タグ付与
- リネームやタグ編集はカードの「⋮」メニューから

### 4.3 閲覧

- トップ画面 `/` で一覧表示
- フォルダナビ・タグ・検索でフィルタ
- カードクリックで新タブ表示

### 4.4 共有

- 個別ファイルのURLは `https://{owner}.github.io/{repo}/files/{id}/{entryPath}`
- URLを知っている人なら誰でも閲覧可能
- 検索エンジン経由では発見されない（noindex設定済み）

---

## 5. トラブルシューティング

### 5.1 アップロード時に「認証エラー」

**原因候補:**
- PAT 期限切れ
- PAT の権限不足
- PAT の対象リポジトリが間違っている

**対処:**
1. `/manage/setup` で「疎通テスト」 → 失敗内容を確認
2. GitHub設定で PAT の状態確認
3. 必要なら再発行 → 更新

### 5.2 アップロードしたファイルが表示されない

**原因候補:**
- GitHub Pages デプロイがまだ完了していない（通常 30秒〜2分）
- ブラウザキャッシュ
- commit に失敗している

**対処:**
1. 数分待ってからリロード
2. 強制リロード（Ctrl+Shift+R / Cmd+Shift+R）
3. GitHub上でcommit履歴を確認
4. GitHub Pages の deploy 状態を確認:
   - リポジトリ → Settings → Pages

### 5.3 サムネが表示されない

**原因候補:**
- GitHub Actions ワークフローが失敗
- og:image 取得失敗 + スクショ生成失敗

**対処:**
1. GitHub Actions のログを確認:
   - リポジトリ → Actions タブ → 該当ワークフロー
2. 手動でワークフローを再実行（Re-run jobs）
3. 一時的対応として、UI上はプレースホルダ表示で運用可

### 5.4 manifest.json が壊れた

**原因候補:**
- 手動編集ミス
- 同時編集での競合
- ブラウザ側のバグ

**対処:**
1. git history から復旧:
   ```bash
   git log manifest.json
   git checkout {hash} -- manifest.json
   git commit -m "fix: restore manifest.json"
   git push
   ```
2. または GitHub Web UIで該当 commit を revert

### 5.5 ファイル数が増えて重い

**原因:**
- manifest.json のサイズが大きくなる
- カードの描画が遅い

**対処:**
1. 仮想スクロールが効いているか確認
2. サムネの遅延読み込みが効いているか確認
3. 不要なファイルを削除
4. 数千件を超える場合、ファイル分割を検討（将来課題）

### 5.6 GitHub API レート制限

**原因:**
- 短時間に大量のAPIリクエスト
- 通常使用では到達しないが、デバッグや一括操作で起こり得る

**対処:**
1. レスポンスヘッダの `X-RateLimit-Remaining` を確認
2. リセット時刻まで待つ（`X-RateLimit-Reset`）
3. 認証済みなら 5,000 req/h なので、通常運用では問題なし

### 5.7 zip展開でエラー

**原因候補:**
- zipのエンコーディング問題（日本語ファイル名）
- ファイル構造が想定外
- エントリポイントが見つからない

**対処:**
1. zip 内の `index.html` の有無を確認
2. ファイル名は ASCII 推奨
3. 解決しない場合は zip を再作成 or 単一HTMLでアップロード

### 5.8 PWA が更新されない

**原因:**
- Service Worker が古いキャッシュを使用

**対処:**
1. ブラウザの DevTools → Application → Service Workers → Unregister
2. 強制リロード
3. iOS Safari の場合、ホーム画面アイコンを削除して再追加

---

## 6. バックアップとリカバリ

### 6.1 自動バックアップ

- 全データ（HTML、manifest、サムネ）は git history に保存される
- GitHub のリポジトリ自体が分散バックアップとして機能
- 過去任意時点に巻き戻し可能

### 6.2 ローカルバックアップ

定期的にローカル clone を更新することを推奨:

```bash
cd ~/backup/html-vault
git pull
```

### 6.3 災害復旧

GitHub アカウント自体が使えなくなった場合（Banなど）:

1. ローカル clone から別のホスティング先（GitLab, Bitbucket等）に再構築可能
2. ホスティング先を Vercel / Netlify に変更することも可能（manifest.json中心の設計なのでportability高い）

---

## 7. メンテナンス推奨事項

### 7.1 定期作業

| 頻度 | 作業 |
|---|---|
| 月次 | 不要なファイルの整理 |
| 四半期 | manifest.json の整合性確認 |
| 年次 | PAT 更新（期限切れ前） |
| 年次 | 依存パッケージのアップデート |

### 7.2 監視

- GitHub Actions の失敗通知（メール）を有効化
- リポジトリのストレージ使用量を時々確認

---

## 8. アーキテクチャ変更時の影響

将来の変更時に影響を確認すべき範囲:

| 変更内容 | 影響範囲 |
|---|---|
| manifest.json スキーマ変更 | マイグレーションコード必要、`version` フィールドで管理 |
| ホスティング先変更 | base URL を `.env` で変更可能 |
| Public → Private 変更 | GitHub Pro/Team プラン必要、Actions 課金制限あり |
| 運用者大幅増加（5名以上） | 競合制御の強化、楽観的ロック実装を検討 |

---

## 9. お問い合わせ・参考リンク

- GitHub Fine-grained PAT: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens
- GitHub Pages: https://docs.github.com/en/pages
- GitHub Actions 料金: https://docs.github.com/en/billing/managing-billing-for-github-actions
- Git Data API: https://docs.github.com/en/rest/git
