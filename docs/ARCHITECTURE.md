# ARCHITECTURE.md — アーキテクチャ設計

## 1. システム全体像

```
┌─────────────┐                        ┌──────────────────┐
│   ユーザー   │ ─── PAT入力 ────────→ │  /manage (React) │
│ (スマホ/PC) │                        └────────┬─────────┘
└──────┬──────┘                                 │
       │                                        │ GitHub API
       │ 閲覧                                    │ (tree+commit)
       │                                        ▼
       │                              ┌──────────────────┐
       │                              │  GitHub Repo     │
       │                              │  (Public)        │
       │                              │                  │
       │                              │  /files/{id}/    │
       │                              │  /thumbnails/    │
       │                              │  manifest.json   │
       │                              │  dist/ (build)   │
       │                              └────────┬─────────┘
       │                                        │
       │                                        │ Pages deploy
       │                                        │
       │                              ┌──────────────────┐
       └─────────────────────────────→│  GitHub Pages    │
                                      │  (HTTPS配信)     │
                                      └────────┬─────────┘
                                               │
                                               │ files/** push
                                               ▼
                                      ┌──────────────────┐
                                      │ GitHub Actions   │
                                      │ (サムネ生成)      │
                                      └──────────────────┘
```

## 2. リポジトリ構成

```
.
├── README.md                       ← リポジトリ説明
├── .github/
│   └── workflows/
│       └── generate-thumbnails.yml ← サムネ生成workflow
├── dist/                           ← Viteビルド成果物（commit対象）
│   ├── index.html                  ← トップ画面エントリ
│   └── assets/
│       └── ...
├── files/                          ← アップロードされたHTML本体
│   ├── 01HXYZ.../                  ← ULIDごとのディレクトリ
│   │   ├── index.html
│   │   ├── assets/                 ← zipの場合の同梱ファイル
│   │   └── ...
│   └── ...
├── thumbnails/                     ← 自動生成サムネ
│   ├── 01HXYZ....png
│   └── ...
├── manifest.json                   ← 全ファイルのメタデータ
├── robots.txt                      ← 検索エンジン制御
├── 404.html                        ← SPAルーティング用
├── src/                            ← Reactアプリのソース
│   ├── main.tsx
│   ├── App.tsx
│   ├── routes/
│   │   ├── Index.tsx               ← /
│   │   ├── Manage.tsx              ← /manage
│   │   └── Setup.tsx               ← /manage/setup
│   ├── components/
│   ├── stores/                     ← Zustandストア
│   ├── lib/
│   │   ├── github.ts               ← GitHub API クライアント
│   │   ├── manifest.ts             ← manifest.json 操作
│   │   ├── html-processor.ts       ← noindex注入等
│   │   ├── zip.ts                  ← zip展開処理
│   │   └── ulid.ts                 ← ID生成
│   └── types/
├── public/                         ← 静的アセット
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── SPEC.md / ARCHITECTURE.md / 他ドキュメント
```

### 2.1 ルート配置の理由

- `dist/` を commit に含めることで、Pages が即座に配信開始（GitHub ActionsでのCI build待ち不要）
- `files/` `thumbnails/` `manifest.json` をルートに配置し、URL構造を分かりやすく
- ソースコードと配信物が同居するが、Public repoなので問題なし

### 2.2 配信パス対応

| URLパス | 配信内容 |
|---|---|
| `/` | `/dist/index.html`（React SPA） |
| `/manage` | SPA内ルート（`/dist/index.html` に fallback） |
| `/manage/setup` | 同上 |
| `/files/{id}/{path}` | `/files/{id}/{path}` の静的ファイル |
| `/thumbnails/{id}.png` | 静的画像 |
| `/manifest.json` | 静的JSON（クライアントが直接fetch） |
| `/robots.txt` | 静的テキスト |

### 2.3 SPA ルーティングの404対応

GitHub Pages はサーバーサイドルーティングを持たないため、SPA ルーティングのために以下を用意する。

- `/404.html` を `/dist/index.html` と同じ内容にする
- ブラウザが存在しないパス（`/manage` 等）にアクセスすると 404.html が返り、その中でReact Routerが正しいルートを描画
- ビルド時にViteの設定で対応

## 3. データフロー

### 3.1 アップロードフロー（単一HTML）

```
[1] ユーザーがファイル選択
       ↓
[2] FileReader でHTML内容を読み込み
       ↓
[3] noindex meta 注入処理
    - DOMParser で head 抽出
    - 既存 robots meta あれば noindex/nofollow に書き換え
    - なければ <head> 先頭に挿入
       ↓
[4] ULID 発行
       ↓
[5] manifest.json をリポジトリから fetch
    - GET /repos/{owner}/{repo}/contents/manifest.json
    - Base64 デコード
       ↓
[6] manifest.files に新エントリ追加
       ↓
[7] Git Data API で原子的 commit:
    a. blob 作成（HTML本体）
       POST /repos/{owner}/{repo}/git/blobs
    b. blob 作成（更新後 manifest.json）
       POST /repos/{owner}/{repo}/git/blobs
    c. 既存 main の ref と tree を取得
       GET /repos/{owner}/{repo}/git/ref/heads/main
       GET /repos/{owner}/{repo}/git/trees/{sha}?recursive=1
    d. 新 tree 作成（既存 tree + 新規 blob 2つ）
       POST /repos/{owner}/{repo}/git/trees
    e. commit 作成
       POST /repos/{owner}/{repo}/git/commits
       message: "feat: add {displayName} ({id})"
    f. ref 更新（push）
       PATCH /repos/{owner}/{repo}/git/refs/heads/main
       ↓
[8] commit 完了通知
       ↓
[9] Pages デプロイ反映を待機
    - GET /repos/{owner}/{repo}/pages/builds/latest
    - status === "built" になるまでポーリング（5秒間隔、最大3分）
       ↓
[10] サムネ生成は GitHub Actions が自動実行
     - workflow 完了は別途ポーリング可（オプション）
       ↓
[11] UI に閲覧用 URL を表示
```

### 3.2 アップロードフロー（zip）

単一HTMLとほぼ同じだが、以下が異なる:

```
[1] ユーザーが zip ファイル選択
       ↓
[2] JSZip で展開、ファイルツリーを構築
       ↓
[3] エントリポイント検出:
    a. ルートに index.html → 採用
    b. ない → 階層下を再帰探索
    c. 唯一の .html → 採用
    d. 複数候補 → UI で選択待ち
       ↓
[4] エントリポイント HTML に noindex meta 注入
       ↓
[5] ULID 発行
       ↓
[6] manifest 更新（entryPath にサブフォルダパスを記録）
       ↓
[7] Git Data API で原子的 commit:
    - 全ファイルを blob 作成（並列）
    - tree 作成時に階層構造を反映
    - 1 commit で push
       ↓
[8] 以降は単一HTMLと同じ
```

### 3.3 リネーム / フォルダ移動 / タグ編集

すべて manifest.json の更新のみ。物理ファイルは触らない。

```
[1] 対象エントリを編集
       ↓
[2] manifest.files の該当エントリを更新
    - displayName / folder / tags / updatedAt
       ↓
[3] manifest.json blob 作成 → tree → commit → push
    - message: "chore: rename {old} → {new} ({id})" 等
       ↓
[4] UI 上で即時反映（ローカル state も更新）
```

### 3.4 削除フロー

```
[1] 対象選択 + 確認モーダル
       ↓
[2] 既存 tree を取得（recursive=1）
       ↓
[3] tree から該当ファイルを除外:
    - /files/{id}/ 配下のすべて
    - /thumbnails/{id}.png
       ↓
[4] manifest.json から該当エントリ除去
       ↓
[5] 新 tree 作成 + commit + push
       ↓
[6] UI から該当カード削除
```

### 3.5 サムネ生成フロー（GitHub Actions）

```
[1] files/** への push を検知
       ↓
[2] Ubuntu runner 起動、Node + Puppeteer セットアップ
       ↓
[3] 直前の commit で追加/変更された files/{id}/ ディレクトリを検出
       ↓
[4] 各エントリについて:
    a. manifest.json から entryPath を取得
    b. 一時HTTPサーバーで /files/{id}/ を配信
    c. Puppeteer で http://localhost:PORT/{entryPath} を開く
    d. <meta property="og:image"> が存在 → そのURLから画像取得
    e. なければ page.screenshot() で 1280x720 撮影
    f. /thumbnails/{id}.png として保存
       ↓
[5] manifest.json の該当エントリの thumbnail を更新
       ↓
[6] Actions が自動 commit + push
    - commit message に [skip ci] を含めて再トリガー回避
    - GITHUB_TOKEN（workflow 用、PATとは別）で push
```

## 4. GitHub Actions 設計

### 4.1 ワークフロー: generate-thumbnails.yml

```yaml
name: Generate Thumbnails

on:
  push:
    branches: [main]
    paths:
      - 'files/**'
      - 'manifest.json'

permissions:
  contents: write

jobs:
  thumbnails:
    runs-on: ubuntu-latest
    if: "!contains(github.event.head_commit.message, '[skip ci]')"
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Install Puppeteer
        run: npm install puppeteer
      - name: Generate thumbnails
        run: node scripts/generate-thumbnails.mjs
      - name: Commit and push
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add thumbnails/ manifest.json
          if ! git diff --cached --quiet; then
            git commit -m "chore: update thumbnails [skip ci]"
            git push
          fi
```

### 4.2 スクリプト: scripts/generate-thumbnails.mjs

主要処理:
- `manifest.json` を読み込み
- `thumbnail === null` のエントリ、または `files/{id}/{entryPath}` が `thumbnails/{id}.png` より新しいエントリを対象
- 一時HTTPサーバー（`http.createServer`）で `files/` をルートに配信
- Puppeteer で各エントリを開いて処理
- 並列度は 3 程度（リソース節約）

### 4.3 Pages デプロイ

GitHub Pages の設定:
- Source: Deploy from a branch
- Branch: main / root

ビルド設定は不要（既に dist/ が commit されている前提）。

ルート直下の `index.html` を Pages のエントリにするため、`dist/` の中身を**直接ルートに置く**か、`dist` をエントリにする設定が必要。

**採用案: ルート直下に build 成果物を置く**
- Vite の `build.outDir` を `.` 直下を指定するのは衝突するので、
- 実際は `dist/` ディレクトリに出力 → リポジトリの `index.html` `assets/` をシンボリック相当にする
- もしくは Vite ビルド成果物をルートに直接出力する設定にする

**最終方針:**
- `vite.config.ts` で `base: '/{repo}/'` を設定（GitHub Pagesのサブパス対応）
- `build.outDir: '../'` で**プロジェクトルートに出力**（src/ と分離した構造前提）
- もしくは、リポジトリ自体を 2 階層に分け、`/app/` 配下に React ソース、ビルド結果は ルート に出力

実装時にどちらかを選択。シンプルさで言えば後者。

### 4.4 ディレクトリ構成の最終案（Pages配信のため）

```
リポジトリルート/
├── index.html               ← Vite ビルド成果物（コミット対象）
├── assets/                  ← Vite ビルド成果物
├── 404.html                 ← index.html のコピー
├── files/                   ← アップロードファイル
├── thumbnails/              ← サムネ
├── manifest.json
├── robots.txt
├── app/                     ← React アプリのソース
│   ├── package.json
│   ├── vite.config.ts
│   ├── src/
│   │   ├── main.tsx
│   │   └── ...
│   └── ...
├── scripts/                 ← Actions 用スクリプト
│   └── generate-thumbnails.mjs
├── .github/
│   └── workflows/
└── docs/                    ← SPEC.md など
```

ビルド: `cd app && npm run build` → 出力は `../index.html` `../assets/` 等にする（Vite の `build.outDir` 設定）

## 5. GitHub API クライアント設計

### 5.1 ファイル構成

`src/lib/github.ts`:

```typescript
class GitHubClient {
  constructor(private pat: string, private owner: string, private repo: string) {}
  
  // 認証ヘッダ生成
  private headers(): HeadersInit
  
  // 疎通テスト
  async testConnection(): Promise<RepoInfo>
  
  // ファイル取得
  async getFile(path: string, ref?: string): Promise<{ content: string, sha: string }>
  
  // Git Data API: 原子的 commit
  async commitFiles(params: {
    branch: string;
    message: string;
    files: Array<{ path: string, content: ArrayBuffer | string }>;
    deletions?: string[];  // 削除するパス
  }): Promise<{ sha: string }>
  
  // Pages デプロイ状態
  async getPagesBuildStatus(): Promise<{ status: 'building' | 'built' | 'errored' }>
  
  // 現在のユーザー名取得
  async getCurrentUser(): Promise<{ login: string }>
}
```

### 5.2 PATの保管

```typescript
const PAT_STORAGE_KEY = 'htmlvault.pat';

const savePat = (pat: string) => localStorage.setItem(PAT_STORAGE_KEY, pat);
const loadPat = (): string | null => localStorage.getItem(PAT_STORAGE_KEY);
const clearPat = () => localStorage.removeItem(PAT_STORAGE_KEY);
```

PAT が無い状態で `/manage` にアクセスしたら自動で `/manage/setup` にリダイレクト。

### 5.3 リポジトリ情報の取得

`{owner}/{repo}` はビルド時に環境変数 or 設定ファイルで指定:

```typescript
// app/src/config.ts
export const REPO_OWNER = import.meta.env.VITE_REPO_OWNER;
export const REPO_NAME = import.meta.env.VITE_REPO_NAME;
export const BASE_URL = import.meta.env.VITE_BASE_URL ?? '/';
```

`.env`:
```
VITE_REPO_OWNER=soya-username
VITE_REPO_NAME=html-vault
VITE_BASE_URL=/html-vault/
```

## 6. 状態管理（Zustand）

### 6.1 ストア構成

```typescript
// stores/manifest.ts
interface ManifestStore {
  manifest: Manifest | null;
  isLoading: boolean;
  error: Error | null;
  fetch: () => Promise<void>;
  addFile: (entry: FileEntry) => void;  // ローカルのみ
  updateFile: (id: string, patch: Partial<FileEntry>) => void;
  removeFile: (id: string) => void;
}

// stores/auth.ts
interface AuthStore {
  pat: string | null;
  username: string | null;
  setPat: (pat: string) => void;
  clearPat: () => void;
}

// stores/ui.ts
interface UIStore {
  selectedFolder: string;
  selectedTags: string[];
  searchQuery: string;
  sortBy: 'updatedAt' | 'uploadedAt' | 'displayName' | 'size';
  sortOrder: 'asc' | 'desc';
  // ...
}
```

### 6.2 manifest取得タイミング

- 初回ロード時に一度 fetch
- アップロード/編集/削除のcommit成功後にローカル state を更新（再 fetch は不要）
- ページリロード時に再 fetch

manifest.json は GitHub の raw コンテンツ URL から fetch:
```
https://raw.githubusercontent.com/{owner}/{repo}/main/manifest.json
```

または GitHub API 経由（PAT付き）でレート制限の影響を避ける。Public repoなので raw でも問題なし。

## 7. セキュリティ設計

### 7.1 PAT保護

- localStorage 保存（端末ごと）
- Service Worker のキャッシュ対象から除外
- DevTools 開示時のリスクは個人運用の前提で許容
- 端末紛失時は GitHub 上でトークン Revoke

### 7.2 XSS対策

- React の標準エスケープに依存
- `dangerouslySetInnerHTML` は完全禁止
- 外部スクリプトの読み込み禁止（CDNフォントも禁止、システムフォントを使用）
- アップロードされる HTML は別ディレクトリ（`/files/{id}/`）に隔離

### 7.3 アップロードファイルのリスク

- 悪意あるHTMLが含まれる可能性は本人運用なので低い
- ただし将来運用者が増えた場合、同じリポジトリの context で実行されるため、cookie アクセスのリスクあり
- 対策: 別ドメイン or 別パスでの分離は将来検討

## 8. パフォーマンス設計

### 8.1 一覧表示の最適化

- manifest.json のサイズは数千件で約 1MB 程度を想定
- 仮想スクロール（`@tanstack/react-virtual` 等）で大量カード対応
- サムネは lazy load（IntersectionObserver）

### 8.2 サムネ画像の最適化

- WebP も検討（Puppeteer から WebP 出力可）
- まずは PNG で実装、後で WebP 移行可

### 8.3 API リクエスト最適化

- アップロード時、複数ファイルは並列 blob 作成（Promise.all）
- 大きい zip は分割アップロードを将来検討（GitHubは1コミット最大100ファイル推奨）

## 9. エラーハンドリング

### 9.1 ネットワークエラー

- リトライ（最大3回、指数バックオフ）
- 失敗時は UI にエラー詳細表示

### 9.2 PAT無効エラー

- 401 を受け取ったら自動で `/manage/setup` にリダイレクト
- 「PATが無効です。再設定してください」表示

### 9.3 整合性エラー

- commit が部分的に失敗するケースは Git Data API では発生しない（tree 単位で原子的）
- manifest と物理ファイルの不一致が発生した場合、UI から修復ツール（将来）

### 9.4 サムネ生成失敗

- Actions のログで確認可能
- manifest.json の thumbnail は null のまま
- UI はプレースホルダ表示

## 10. デプロイ・運用構成まとめ

| 要素 | 構成 |
|---|---|
| ホスティング | GitHub Pages (main branch / root) |
| 配信URL | `https://{owner}.github.io/{repo}/` |
| ビルド | ローカル `npm run build` → commit |
| サムネ生成 | GitHub Actions（自動） |
| メタデータ | manifest.json（ルート） |
| 認証 | Fine-grained PAT（localStorage） |
| バックアップ | git history（自動） |

PR / レビュー機構は使わず、main 直接 push で運用。個人運用前提のため。
