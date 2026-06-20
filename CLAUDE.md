# CLAUDE.md — ClaudeCode 作業指示

このファイルは、ClaudeCodeが本プロジェクトで開発を行う際の指針。**セッション開始時に必ず読む**こと。

## プロジェクトの本質

HTML Vault は、**個人が日常的にHTMLファイルをアップロードして管理する** ためのツール。エンタープライズ向けではなく、本人と少数の信頼できる人のみが使う前提。

設計上の優先順位:

1. **モバイル運用が成立すること**（平日のアップロードがスマホで完結）
2. **サーバーレスで完結すること**（GitHub Pages のみで動く）
3. **完全無料で運用できること**（Public repo + Actions無料枠の範囲内）
4. **データの透明性**（manifest.json は人間が読める）
5. **拡張のしやすさ**（将来運用者を増やせる、機能追加できる）

迷ったときは上記の優先順位で判断する。

## ドキュメント階層

| ファイル | 役割 | 参照タイミング |
|---|---|---|
| `SPEC.md` | 機能仕様、UI仕様、データモデル | 機能を実装するとき |
| `ARCHITECTURE.md` | 構成・データフロー・Actions | 設計判断が必要なとき |
| `IMPLEMENTATION_ROADMAP.md` | Phase別タスクリスト | 次に何をやるか決めるとき |
| `OPERATIONS.md` | 運用手順、PAT、トラブルシュート | 運用関連の機能を実装するとき |
| `CLAUDE.md`（このファイル） | コーディング規約、原則 | セッション開始時 |

## 技術スタック（固定）

迷わずに使うべき技術:

| 領域 | 採用技術 | 代替を検討しない理由 |
|---|---|---|
| 言語 | TypeScript（strict） | 型安全性は必須 |
| フレームワーク | React 18 | Viteとの相性、生態系 |
| ビルド | Vite | 軽量・高速 |
| ルーティング | React Router v6+ | デファクト |
| 状態管理 | Zustand | 軽量、簡潔 |
| スタイル | Tailwind CSS | 開発速度、保守性 |
| zip操作 | JSZip | ブラウザでの実績 |
| ID | ulid | 時系列ソート可能 |
| PWA | vite-plugin-pwa | Vite公式相当 |
| 日付 | date-fns | 軽量、tree-shakable |
| トースト | react-hot-toast | 軽量、API簡潔 |
| 仮想スクロール | @tanstack/react-virtual | 安定 |
| サムネ生成 | Puppeteer (Actions側) | デファクト |

**追加ライブラリを入れる前に、必ず確認**:
- 本当に必要か（標準APIで済まないか）
- バンドルサイズへの影響
- メンテナンス状態

## コーディング規約

### 命名

- **コンポーネント**: PascalCase（`FileCard.tsx`）
- **フック**: camelCase + use prefix（`useManifest.ts`）
- **ユーティリティ**: camelCase（`extractZip.ts`）
- **型**: PascalCase（`FileEntry`, `Manifest`）
- **定数**: SCREAMING_SNAKE_CASE（`PAT_STORAGE_KEY`）
- **ファイル名**: 中身に合わせる（コンポーネントなら PascalCase、それ以外は kebab-case）

### ディレクトリ構成（守る）

```
app/src/
├── main.tsx
├── App.tsx
├── routes/        ← React Router のルートコンポーネント
├── components/    ← 再利用可能なUIコンポーネント
├── stores/        ← Zustand ストア
├── lib/           ← ピュアロジック・API クライアント
├── hooks/         ← カスタムフック
├── types/         ← 型定義
└── config.ts      ← 設定値（env, 定数）
```

### TypeScript

- `strict: true`、`noImplicitAny: true` 必須
- `any` 禁止、必要なら `unknown` から narrow
- 公開APIには明示的な型注釈
- 内部実装は型推論に任せて簡潔に
- `interface` より `type` を優先（一貫性のため、ただし extends が必要なら interface 可）

### React

- 関数コンポーネントのみ（クラスコンポーネント禁止）
- フック規約（順序、条件分岐内禁止）を厳守
- カスタムフックでロジック分離
- `dangerouslySetInnerHTML` 完全禁止
- 外部スクリプトの読み込み禁止
- `useEffect` の依存配列を正確に
- `useMemo` / `useCallback` は計測してから入れる（先に入れない）

### Tailwind

- `@apply` の使用は最小限
- カスタムテーマは `tailwind.config.js` に集約
- 長くなったクラス名は `clsx` で整理
- レスポンシブは Mobile First（デフォルトがモバイル）

### 状態管理（Zustand）

- ストアは責務単位で分割（auth, manifest, ui）
- ストア間の依存は最小限
- 大きいオブジェクトは selector で部分購読
- 永続化が必要なものだけ `persist` middleware
- グローバル state にしないでよいものは React state に留める

### API クライアント設計

`src/lib/github.ts` の `GitHubClient`:

- コンストラクタで PAT, owner, repo を受け取る
- メソッドは Promise を返す
- エラーは `GitHubAPIError` クラスで wrap
- リクエスト本体は `private async request()` に集約
- 401 は専用エラー（`PATInvalidError`）として扱う
- リトライは呼び出し側で判断

### エラーハンドリング

- 想定エラー: 型付き例外クラス
- 想定外エラー: try-catch で握って UI に表示
- console.error は最小限、本番では UI 通知が主

### コミットメッセージ

Conventional Commits 準拠:

- `feat:` 機能追加
- `fix:` バグ修正
- `chore:` ビルド・依存・雑務
- `docs:` ドキュメント
- `refactor:` リファクタリング
- `style:` フォーマット
- `test:` テスト

例:
- `feat: add zip upload support`
- `fix: handle 401 on PAT setup`
- `chore: bump vite to 5.x`

1タスク=1コミット を基本とする。

## 重要な設計原則

### 1. アップロード処理は原子的に

ファイル本体と manifest.json の更新は **同一コミット** で行う。Git Data API の tree + commit を使うこと。

複数の REST 呼び出しで個別 commit する設計は **絶対に避ける**（不整合の温床）。

### 2. 物理ファイル名は ULID、表示名と分離

- 物理: `/files/{ulid}/index.html`
- 表示: manifest.json の `displayName`

リネームは manifest 更新のみ。物理ファイルは触らない。

### 3. フォルダは仮想

- 物理は `/files/{ulid}/` でフラット
- フォルダ構造は manifest.json の `folder` フィールドだけで表現

物理階層を作らない。フォルダ移動が軽量になる。

### 4. PAT は localStorage、共有しない

- 1 端末 = 1 PAT 設定
- 端末間で同じ PAT を使うのは OK（パスマネ経由で同期）
- 複数運用者間では **絶対に共有しない**

### 5. noindex は注入時点で確定

アップロード処理の中で HTML に noindex meta を必ず注入する。後から付ける運用にしない（漏れる）。

### 6. mainブランチ直接運用

ブランチ運用は使わない（個人運用なので）。main に直接 commit。

### 7. CI待ち時間を作らない

ビルド成果物は **コミットに含める**。これにより Pages 反映が即座（Actions のビルド待ちなし）。

### 8. サムネ生成は非同期、UIをブロックしない

サムネ生成は Actions で非同期実行。完了を待たずに UI 上は閲覧可能にする。サムネ未生成時はプレースホルダ。

## やってはいけないこと

これらは**絶対に避ける**:

1. **`dangerouslySetInnerHTML` の使用** — XSS リスク。完全禁止
2. **外部スクリプト/CDN の読み込み** — XSS リスク + オフライン動作不能
3. **PAT のサーバー送信** — GitHub API 以外には絶対に送らない
4. **PAT のログ出力** — `console.log(pat)` 等 絶対NG
5. **複数 commit に分けた non-atomic な更新** — 整合性破綻の元
6. **物理ファイル名でのフォルダ階層化** — リネーム・移動が重くなる
7. **manifest.json の手動編集前提の機能** — UI から完結すべき
8. **テスト環境特有のハックを本番コードに混ぜる**
9. **「とりあえず any」** — TypeScript の意味がなくなる
10. **ライセンス不明なライブラリ** — 必ず確認

## やったほうがいいこと

1. **マイクロステップで commit** — 1機能ずつ動作確認しながら
2. **エラーケースを最初に考える** — happy path だけで実装しない
3. **モバイルで動作確認** — 開発中も実機で確認
4. **manifest.json をブラウザで開いて確認** — 想定通りの構造か
5. **ULID生成は ulid パッケージ** — 自前実装しない
6. **`<input type="file" accept=".html,.zip">`** — 適切な accept 指定
7. **進行状況UI** — ユーザーが「動いているか」分かるようにする
8. **エラー時は何をすればよいか提示** — ただ「エラー」と出すだけにしない

## セッション引き継ぎプロトコル

ClaudeCodeセッションを終わるとき、または新しく始めるときに従う。

### セッション終了時

- 完了したタスクを `IMPLEMENTATION_ROADMAP.md` でチェック
- 中途半端な状態を残さない（commit可能な状態で終わる）
- 次のセッションに伝えたい注意事項は `WIP.md` に記録（必要なら作成）

### セッション開始時

1. `CLAUDE.md`（このファイル）を読む
2. `IMPLEMENTATION_ROADMAP.md` で次に着手するPhase/タスクを確認
3. 該当箇所の `SPEC.md` / `ARCHITECTURE.md` を読む
4. 既存コードの該当部分を確認
5. 実装開始

### セッション中の判断

- **仕様に明記されている** → そのとおり実装
- **仕様にない細部** → 上記「重要な設計原則」「やってはいけないこと」を踏まえて判断、必要なら確認
- **仕様と矛盾するコード変更が必要** → ユーザーに確認

## テスト方針

MVP 段階ではテスト最小限。ただし以下は重要:

- **ピュアロジックのテスト**: `src/lib/` 配下の関数は Vitest でテスト
  - noindex 注入のロジック
  - zip エントリポイント検出
  - manifest 更新ロジック
- **GitHub API クライアントのテスト**: モック使用
- **UI テスト**: 手動で確認、CI 自動化は将来

テストは **Vitest** を使う。Phase 2 以降、必要に応じて追加。

## 開発環境

### 推奨セットアップ

- Node.js 20.x LTS
- pnpm または npm（プロジェクト全体で統一）
- VSCode + ESLint + Prettier 拡張

### 環境変数

`app/.env.local`（gitignore対象）:

```
VITE_REPO_OWNER=soya-username
VITE_REPO_NAME=html-vault
VITE_BASE_URL=/html-vault/
```

`app/.env.example` をテンプレートとして commit。

### ビルドコマンド

```bash
cd app
npm install
npm run dev      # 開発サーバー
npm run build    # 本番ビルド → ../ に出力
npm run preview  # ビルド結果プレビュー
```

ルートからの一発コマンド（package.json scripts 推奨）:

```bash
npm run build    # cd app && npm run build を実行
```

### ローカルでの GitHub API 動作確認

開発中は、本番リポジトリの PAT を `.env.local` に設定して動作確認可。

**注意**: `.env.local` は絶対に commit しない（`.gitignore` 確認）。

## 用語集

| 用語 | 意味 |
|---|---|
| PAT | Personal Access Token（GitHub認証トークン） |
| ULID | Universally Unique Lexicographically Sortable Identifier |
| manifest.json | 全ファイルのメタデータを集約したJSON |
| 物理パス | リポジトリ内の実際のパス（例: `/files/01H.../index.html`） |
| 仮想フォルダ | manifest.json上のfolderフィールドで表現されるフォルダ |
| エントリポイント | zipの場合の、配信される `.html` のzip内パス |
| 運用者 | アップロード/編集権限を持つ人（オーナー + Collaborator） |
| 閲覧者 | URLを知っていてアクセスする人（権限不要） |

## 改訂履歴

- v1: 初版（Phase 0 着手前）

---

**最後に**: 仕様書に書いていない判断が必要になったら、必ずユーザーに確認すること。仕様外の機能を勝手に追加しない。
