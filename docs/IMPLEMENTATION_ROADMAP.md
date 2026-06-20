# IMPLEMENTATION_ROADMAP.md — 実装ロードマップ

実装は段階的に行い、各フェーズの終わりに動作確認できる状態を保つ。ClaudeCodeでの実装を想定して、各タスクを「セッション単位で完了できる粒度」に分割している。

## フェーズ構成

| Phase | 名前 | 完成時の状態 |
|---|---|---|
| 0 | プロジェクトセットアップ | リポジトリ作成、Vite起動可、Pages配信確認 |
| 1 | 基盤構築 | ルーティングと最小UI、`/manage/setup` でPAT入力ができる |
| 2 | アップロード（単一HTML） | スマホ/PCから単一HTMLをアップロード→閲覧できる |
| 3 | 一覧表示 | アップロードしたファイルがカード一覧で表示される（サムネ未対応） |
| 4 | 編集機能 | リネーム、フォルダ移動、タグ編集、削除ができる |
| 5 | 検索・フィルタ・並べ替え | フォルダナビ、タグフィルタ、検索、並べ替えが動作 |
| 6 | zipアップロード | zipをアップロードして自動展開・配信できる |
| 7 | サムネ自動生成 | GitHub Actionsでサムネが自動生成され、一覧に表示される |
| 8 | noindex注入とrobots.txt | 検索エンジン対策完了 |
| 9 | PWA化 | ホーム画面追加、Service Worker動作 |
| 10 | 仕上げ | 複数選択、キーボードショートカット、D&D、状態通知の改善 |

---

## Phase 0: プロジェクトセットアップ

### 目標
GitHub上にリポジトリを作成し、最小構成のViteアプリがGitHub Pages上で動くことを確認する。

### タスク

- [ ] **0.1** GitHubで新しいPublicリポジトリを作成（仮名: `html-vault`）
- [ ] **0.2** ローカルにclone
- [ ] **0.3** `app/` ディレクトリ作成、`cd app && npm create vite@latest . -- --template react-ts`
- [ ] **0.4** 依存追加: `react-router-dom`, `zustand`, `tailwindcss`, `ulid`, `jszip`
- [ ] **0.5** Tailwind CSS セットアップ（`tailwind.config.js`, `postcss.config.js`, `src/index.css`）
- [ ] **0.6** `vite.config.ts` に以下を設定:
  - `base: '/{repo-name}/'`
  - `build.outDir: '../'`（リポジトリルートへ出力）
  - `build.emptyOutDir: false`（既存ファイル保持）
- [ ] **0.7** ルートに `.gitignore` 作成（`node_modules/`, `app/node_modules/`, `app/dist/` 等）
- [ ] **0.8** ルートに `manifest.json` 初期ファイル作成: `{"version": 1, "updatedAt": "...", "files": []}`
- [ ] **0.9** ルートに `robots.txt` 作成: `User-agent: *\nDisallow: /\n`
- [ ] **0.10** ルートに最小 `index.html` （Vite ビルドで上書き予定のプレースホルダ）
- [ ] **0.11** GitHub リポジトリ設定で Pages を有効化（Source: main / root）
- [ ] **0.12** ビルド → commit → push → Pages で表示確認
- [ ] **0.13** `.env.example` 作成: `VITE_REPO_OWNER`, `VITE_REPO_NAME`, `VITE_BASE_URL`

### 完了条件
- `https://{owner}.github.io/{repo}/` にアクセスして、Viteのデフォルト画面が表示される

---

## Phase 1: 基盤構築

### 目標
ルーティングを設定し、`/manage/setup` でPATを入力できる最小UIを作る。

### タスク

- [ ] **1.1** ディレクトリ構造作成: `src/routes/`, `src/components/`, `src/stores/`, `src/lib/`, `src/types/`
- [ ] **1.2** `src/types/index.ts` に `Manifest`, `FileEntry` 型を定義（SPEC.md 3.2参照）
- [ ] **1.3** `src/lib/github.ts` に `GitHubClient` クラスの骨組み（`testConnection`, `getCurrentUser`）
- [ ] **1.4** `src/stores/auth.ts` で PAT のlocalStorage管理
- [ ] **1.5** React Router セットアップ（`BrowserRouter` + `basename`）
- [ ] **1.6** `/`（仮の一覧）, `/manage`（仮）, `/manage/setup` のスケルトンルート作成
- [ ] **1.7** `/manage` への PAT 無し時の自動リダイレクト（`/manage/setup`へ）
- [ ] **1.8** `/manage/setup` に PAT 入力フォーム + 疎通テストボタン + 保存ボタン
- [ ] **1.9** 疎通テスト成功時にユーザー名を取得・表示
- [ ] **1.10** PAT 削除ボタン（既存PATがある場合）
- [ ] **1.11** `404.html` を `index.html` のコピーとして配置（SPA fallback）
- [ ] **1.12** ビルド→push→動作確認

### 完了条件
- `/manage/setup` でPATを入力・保存できる
- `/manage` にアクセス時、PATがあれば管理画面プレースホルダが表示、無ければsetupにリダイレクト

---

## Phase 2: アップロード（単一HTML）

### 目標
スマホ/PCから単一HTMLファイルをアップロードして、`/files/{id}/index.html` で閲覧できる状態にする。

### タスク

- [ ] **2.1** `src/lib/ulid.ts` を作成（ulid パッケージのラッパー）
- [ ] **2.2** `src/lib/html-processor.ts` を作成: noindex meta 注入関数
  - DOMParser でパース
  - `<head>` 探索、なければ作成
  - 既存の `<meta name="robots">` があれば書き換え、なければ追加
  - 文字列で返す
- [ ] **2.3** `src/lib/manifest.ts` を作成: manifest fetch / 更新ロジック
  - `fetchManifest()`: GitHub API 経由で manifest.json と sha を取得
  - `addEntry(manifest, entry)`: 新エントリを追加して返す
- [ ] **2.4** `GitHubClient.commitFiles()` を実装:
  - 既存 ref と tree 取得
  - blob 作成（並列）
  - 新 tree 作成
  - commit 作成
  - ref 更新
  - 1つのメソッドで原子的に完結
- [ ] **2.5** `/manage` 画面に「+新規アップロード」ボタン → アップロードモーダル
- [ ] **2.6** アップロードモーダルのUI（ファイル選択、表示名、フォルダ、タグ入力）
- [ ] **2.7** アップロード処理の繋ぎ込み:
  1. ファイル選択
  2. FileReader で内容読み込み
  3. noindex 注入
  4. ULID 発行
  5. manifest fetch + エントリ追加
  6. commitFiles で push（HTMLファイル + manifest）
- [ ] **2.8** 進行状況表示（プログレスバー、ステップ表示）
- [ ] **2.9** commit 完了後、Pages デプロイ反映を待機（`getPagesBuildStatus` ポーリング）
- [ ] **2.10** 完了表示と閲覧URL提示（クリックで新タブ）
- [ ] **2.11** エラーハンドリング（ネットワーク、認証、整合性）

### 完了条件
- スマホブラウザで `/manage` を開き、HTMLファイルをアップロード → 数分後に閲覧URLでアクセス可能

---

## Phase 3: 一覧表示

### 目標
アップロードしたファイルがトップ画面 `/` にカード一覧で表示される（サムネはプレースホルダ）。

### タスク

- [ ] **3.1** `src/stores/manifest.ts` 作成: manifest 取得・キャッシュ
  - 初回マウント時に fetch
  - `addFile` / `updateFile` / `removeFile` でローカル state 更新
- [ ] **3.2** `src/components/FileCard.tsx` 作成
  - サムネ画像（または プレースホルダ）
  - 表示名（最大2行クリップ）
  - フォルダパス（淡色）
  - タグチップ
  - 相対日時（`date-fns` の `formatDistanceToNow` 等）
- [ ] **3.3** トップ画面（`/`）でmanifestを取得 → カードグリッド表示
- [ ] **3.4** カードクリックで新タブで `/files/{id}/{entryPath}` を開く
- [ ] **3.5** Tailwindでレスポンシブグリッド（PC 4列、タブ 2-3列、スマホ 1-2列）
- [ ] **3.6** 空状態の表示（「まだファイルがありません」）
- [ ] **3.7** ローディング状態の表示

### 完了条件
- アップロードしたファイルがトップ画面で一覧表示される
- カードをクリックして閲覧できる

---

## Phase 4: 編集機能

### 目標
リネーム、フォルダ移動、タグ編集、削除ができる。

### タスク

- [ ] **4.1** カードに「⋮」メニュー追加（管理モードのみ）
- [ ] **4.2** リネームモーダル: 表示名を変更 → manifest更新commit
- [ ] **4.3** フォルダ移動モーダル: 既存フォルダのドロップダウン + 新規入力 → manifest更新commit
- [ ] **4.4** タグ編集モーダル: チップUI、追加・削除 → manifest更新commit
- [ ] **4.5** 削除モーダル: 確認ダイアログ → 削除処理
- [ ] **4.6** 削除処理: 既存tree取得 → 該当パス除外 → 新tree作成 → commit
- [ ] **4.7** 編集後の即時UI反映（ローカルstate更新）
- [ ] **4.8** 編集途中の競合エラーハンドリング（sha不一致時に再fetch→リトライ）

### 完了条件
- すべての編集操作が動作し、UIが即時反映される

---

## Phase 5: 検索・フィルタ・並べ替え

### 目標
ファイル数が増えても目的のファイルを見つけられる。

### タスク

- [ ] **5.1** `src/stores/ui.ts` 作成: 検索クエリ、選択フォルダ、選択タグ、ソート設定
- [ ] **5.2** トップ画面に検索ボックス追加
- [ ] **5.3** フォルダツリーコンポーネント
  - manifest.json から動的にツリー構造を構築
  - PC: 左サイドバー / スマホ: ハンバーガーメニュー
- [ ] **5.4** タグクラウドコンポーネント（出現頻度順）
- [ ] **5.5** フィルタ適用ロジック（フォルダ・タグ・検索を組み合わせ）
- [ ] **5.6** 並べ替えセレクタ（更新日時/アップロード日時/表示名/サイズ + 昇降順）
- [ ] **5.7** フィルタ状態のURL同期（クエリパラメータ）
- [ ] **5.8** パンくず表示（現在のフォルダ）

### 完了条件
- フォルダ/タグ/検索を組み合わせて目的のファイルを絞り込める

---

## Phase 6: zipアップロード

### 目標
zipファイルをアップロードして自動展開・配信できる。

### タスク

- [ ] **6.1** `src/lib/zip.ts` を作成: JSZipラッパー
  - `extractZip(file)`: zip展開してファイルツリー返す
  - `findEntryPoint(tree)`: エントリポイント検出ロジック
- [ ] **6.2** アップロードモーダルでzipファイルに対応:
  - ファイル拡張子で分岐
  - zipの場合は内部のファイル一覧を表示
- [ ] **6.3** エントリポイント検出 + 複数候補時の選択UI
- [ ] **6.4** エントリポイントHTMLにnoindex注入
- [ ] **6.5** `GitHubClient.commitFiles()` を複数ファイル対応に拡張
- [ ] **6.6** zip内の全ファイルを `/files/{id}/` 配下にcommit
- [ ] **6.7** `entryPath` を manifest に正しく記録
- [ ] **6.8** zip内ファイルの相対パスが正しく解決されることを確認（CSS/JS/画像のリンク）

### 完了条件
- HTML + 画像のzipをアップロードして、画像付きで閲覧できる

---

## Phase 7: サムネ自動生成

### 目標
GitHub Actionsでサムネが自動生成され、一覧に表示される。

### タスク

- [ ] **7.1** ルートに `scripts/generate-thumbnails.mjs` 作成
  - manifest.json読み込み
  - 対象エントリ抽出（thumbnail===nullなど）
  - 一時HTTPサーバー起動
  - Puppeteerで各エントリを開く
  - og:image抽出 or スクショ撮影（1280x720）
  - `/thumbnails/{id}.png` 保存
  - manifest.json更新
- [ ] **7.2** `.github/workflows/generate-thumbnails.yml` 作成（ARCHITECTURE.md 4.1）
- [ ] **7.3** ワークフロー権限設定（contents: write）
- [ ] **7.4** main直push、`[skip ci]` で再トリガー回避
- [ ] **7.5** FileCardでサムネ画像を表示（lazyload）
- [ ] **7.6** Actions実行中のUI表示（オプション）
- [ ] **7.7** サムネ生成失敗時のフォールバック（プレースホルダ）

### 完了条件
- アップロード後、数分以内にサムネが一覧に表示される

---

## Phase 8: noindex注入の検証とrobots.txt

### 目標
検索エンジン対策が確実に動作する。

### タスク

- [ ] **8.1** Phase 2で実装したnoindex注入の動作確認
- [ ] **8.2** zipエントリポイントへの注入確認（Phase 6）
- [ ] **8.3** `/robots.txt` の配信確認
- [ ] **8.4** Google Search Console での確認（オプション）
- [ ] **8.5** トップ画面 `index.html` にも `<meta name="robots" content="noindex, nofollow">` 追加（Viteのテンプレートに埋め込む）

### 完了条件
- Googleにインデックスされない設定が完了

---

## Phase 9: PWA化

### 目標
ホーム画面にアイコン追加可能、Service Worker動作。

### タスク

- [ ] **9.1** `vite-plugin-pwa` 導入
- [ ] **9.2** `vite.config.ts` でPWA設定
  - manifest（name, short_name, icons）
  - Workbox設定（最小）
  - registerType: 'autoUpdate'
- [ ] **9.3** PWA用アイコン作成（192x192, 512x512）
- [ ] **9.4** iOS Safari対応の `apple-touch-icon`
- [ ] **9.5** ビルド→Lighthouseで PWA スコア確認
- [ ] **9.6** スマホで「ホーム画面に追加」して動作確認

### 完了条件
- スマホのホーム画面にアイコン追加でき、起動できる

---

## Phase 10: 仕上げ

### 目標
UX を整え、毎日使えるレベルにする。

### タスク

- [ ] **10.1** 複数選択モード:
  - チェックボックス表示切り替え
  - 一括削除/フォルダ移動/タグ追加削除
  - 単一commitでまとめて処理
- [ ] **10.2** キーボードショートカット
  - `/` で検索フォーカス
  - `n` で新規アップロード
  - `Esc` でモーダル閉じる
  - `Ctrl/Cmd+A` で全選択
  - `Delete` で選択削除
- [ ] **10.3** ドラッグ&ドロップアップロード
  - 画面全体で受付
  - 視覚フィードバック
- [ ] **10.4** トースト通知（react-hot-toast 等）
- [ ] **10.5** 仮想スクロール（@tanstack/react-virtual）
- [ ] **10.6** カードのhoverアニメーション
- [ ] **10.7** アクセシビリティ確認（フォーカス可、aria属性）
- [ ] **10.8** エラーUI改善（詳細表示、リトライボタン）
- [ ] **10.9** ローディング状態の細分化

### 完了条件
- 日常使用に耐える快適なUX

---

## オプションタスク（将来）

これらはMVP完成後に検討:

- ダークモード対応
- 国際化（i18n）
- ファイル詳細ページ（個別URL、メタ情報表示）
- アップロード履歴・統計
- バックアップ・エクスポート機能
- 別ドメインでのHTML配信（XSS隔離）
- マルチユーザー時の競合制御（楽観的ロック）
- ファイルバージョン管理（過去のバージョンに戻る）
- WebP サムネ対応
- 大きいzipの分割アップロード
- フォルダ階層のドラッグ&ドロップ並び替え

---

## 開発メモ

### 推奨セッション分割

ClaudeCodeセッションでの作業単位は、Phaseのサブタスク2〜5個程度を目安にする。例:

- セッション1: Phase 0 全部 + Phase 1の1.1〜1.4
- セッション2: Phase 1の1.5〜1.12
- セッション3: Phase 2の2.1〜2.5
- セッション4: Phase 2の2.6〜2.11
- ...

### 各セッションの開始時

`CLAUDE.md` を読み直して、コーディング規約と注意事項を確認する。

### コミット粒度

- 1タスク = 1コミット を基本とする
- コミットメッセージは Conventional Commits 形式: `feat: ...`, `fix: ...`, `chore: ...`, `docs: ...`
