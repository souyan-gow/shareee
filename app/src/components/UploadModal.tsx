import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../stores/auth';
import { useManifestStore } from '../stores/manifest';
import { DEFAULT_BRANCH, PAGES_SITE_URL, REPO_NAME, REPO_OWNER } from '../config';
import {
  GitHubAPIError,
  GitHubClient,
  PATInvalidError,
} from '../lib/github';
import { addEntry, fetchManifest, serializeManifest } from '../lib/manifest';
import { injectNoindex } from '../lib/html-processor';
import { generateId } from '../lib/ulid';
import { normalizeFolder, parseTags } from '../lib/folder';
import type { FileEntry } from '../types';

type Props = {
  open: boolean;
  onClose: () => void;
  uploader: string | null;
  initialFile?: File | null;
  queueRemaining?: number;
  onNext?: () => void;
};

type SubStep =
  | 'reading'
  | 'injecting'
  | 'fetching-manifest'
  | 'committing'
  | 'waiting-pages';

type Phase = 'form' | 'processing' | 'done' | 'error';

const STEPS: { key: SubStep; label: string }[] = [
  { key: 'reading', label: 'ファイル読み込み' },
  { key: 'injecting', label: 'noindex 注入' },
  { key: 'fetching-manifest', label: 'manifest 取得' },
  { key: 'committing', label: 'コミット作成' },
  { key: 'waiting-pages', label: 'Pages デプロイ反映待ち（最大3分）' },
];

function classifyStep(current: SubStep, target: SubStep): 'done' | 'doing' | 'todo' {
  const order = STEPS.map((s) => s.key);
  const ci = order.indexOf(current);
  const ti = order.indexOf(target);
  if (ti < ci) return 'done';
  if (ti === ci) return 'doing';
  return 'todo';
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

export default function UploadModal({
  open,
  onClose,
  uploader,
  initialFile,
  queueRemaining = 0,
  onNext,
}: Props) {
  const pat = useAuthStore((s) => s.pat);
  const clearPat = useAuthStore((s) => s.clearPat);
  const addFile = useManifestStore((s) => s.addFile);

  const [file, setFile] = useState<File | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [folder, setFolder] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  const [phase, setPhase] = useState<Phase>('form');
  const [subStep, setSubStep] = useState<SubStep>('reading');
  const [pagesStatus, setPagesStatus] = useState<string | null>(null);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setFile(null);
      setDisplayName('');
      setFolder('');
      setTagsInput('');
      setPhase('form');
      setSubStep('reading');
      setPagesStatus(null);
      setViewerUrl(null);
      setErrorMessage(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !initialFile) return;
    setFile(initialFile);
    setDisplayName(initialFile.name.replace(/\.html?$/i, ''));
    setFolder('');
    setTagsInput('');
    setPhase('form');
    setSubStep('reading');
    setPagesStatus(null);
    setViewerUrl(null);
    setErrorMessage(null);
  }, [open, initialFile]);

  const onFileChange = (f: File | null) => {
    setFile(f);
    if (f && !displayName.trim()) {
      const stem = f.name.replace(/\.html?$/i, '');
      setDisplayName(stem);
    }
  };

  const canSubmit = useMemo(
    () => phase === 'form' && !!file && !!displayName.trim() && !!pat,
    [phase, file, displayName, pat],
  );

  const runUpload = async () => {
    if (!file || !pat) return;
    setErrorMessage(null);
    setPhase('processing');
    setSubStep('reading');

    const client = new GitHubClient(pat, REPO_OWNER, REPO_NAME);

    try {
      const raw = await file.text();

      setSubStep('injecting');
      const injected = injectNoindex(raw);

      const id = generateId();
      const now = new Date().toISOString();
      const entry: FileEntry = {
        id,
        displayName: displayName.trim(),
        folder: normalizeFolder(folder),
        tags: parseTags(tagsInput),
        entryPath: 'index.html',
        kind: 'single',
        uploadedAt: now,
        updatedAt: now,
        size: new Blob([injected]).size,
        uploader: uploader ?? '',
        thumbnail: null,
      };

      setSubStep('fetching-manifest');
      const { manifest } = await fetchManifest(client, DEFAULT_BRANCH);
      const next = addEntry(manifest, entry);

      setSubStep('committing');
      const commit = await client.commitFiles({
        branch: DEFAULT_BRANCH,
        message: `feat: add ${entry.displayName} (${id})`,
        files: [
          { path: `files/${id}/index.html`, content: injected },
          { path: 'manifest.json', content: serializeManifest(next) },
        ],
      });

      addFile(entry);

      setSubStep('waiting-pages');
      await waitForPagesBuild(client, commit.sha, (s) => setPagesStatus(s));

      setViewerUrl(`${PAGES_SITE_URL}/files/${id}/index.html`);
      setPhase('done');
    } catch (e) {
      if (e instanceof PATInvalidError) {
        setErrorMessage(
          'PAT が無効になりました。設定画面で再保存してください。',
        );
        clearPat();
      } else if (e instanceof GitHubAPIError) {
        setErrorMessage(
          `GitHub API エラー: ${e.message}` +
            (e.body ? `\n${JSON.stringify(e.body)}` : ''),
        );
      } else if (e instanceof Error) {
        setErrorMessage(e.message);
      } else {
        setErrorMessage('不明なエラーが発生しました');
      }
      setPhase('error');
    }
  };

  const resetForAnother = () => {
    setFile(null);
    setDisplayName('');
    setFolder('');
    setTagsInput('');
    setPhase('form');
    setSubStep('reading');
    setPagesStatus(null);
    setViewerUrl(null);
    setErrorMessage(null);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
      <div className="w-full max-w-xl rounded-lg bg-white shadow-xl">
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="text-lg font-semibold text-slate-800">
            {phase === 'form'
              ? '新規アップロード'
              : phase === 'processing'
                ? 'アップロード中…'
                : phase === 'done'
                  ? '完了'
                  : 'エラー'}
            {queueRemaining > 0 && (phase === 'form' || phase === 'done') && (
              <span className="ml-2 text-xs font-normal text-slate-500">
                （あと {queueRemaining} 件）
              </span>
            )}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={phase === 'processing'}
            aria-label="閉じる"
            className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
          >
            ×
          </button>
        </header>

        <div className="px-5 py-4 text-sm text-slate-700">
          {phase === 'form' && (
            <FormBody
              file={file}
              displayName={displayName}
              folder={folder}
              tagsInput={tagsInput}
              onFileChange={onFileChange}
              onDisplayNameChange={setDisplayName}
              onFolderChange={setFolder}
              onTagsChange={setTagsInput}
            />
          )}

          {phase === 'processing' && (
            <ProgressBody current={subStep} pagesStatus={pagesStatus} />
          )}

          {phase === 'done' && viewerUrl && (
            <DoneBody url={viewerUrl} />
          )}

          {phase === 'error' && errorMessage && (
            <ErrorBody message={errorMessage} />
          )}
        </div>

        <footer className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">
          {phase === 'form' && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="rounded px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={runUpload}
                disabled={!canSubmit}
                className="rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40 hover:bg-blue-700"
              >
                アップロード
              </button>
            </>
          )}
          {phase === 'processing' && (
            <span className="text-xs text-slate-500">
              処理中…ウィンドウを閉じないでください
            </span>
          )}
          {phase === 'done' && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="rounded px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
              >
                閉じる
              </button>
              {queueRemaining > 0 && onNext ? (
                <button
                  type="button"
                  onClick={onNext}
                  className="rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  次のファイル（残り {queueRemaining} 件）
                </button>
              ) : (
                <button
                  type="button"
                  onClick={resetForAnother}
                  className="rounded bg-slate-800 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-900"
                >
                  もう一つアップロード
                </button>
              )}
            </>
          )}
          {phase === 'error' && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="rounded px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
              >
                閉じる
              </button>
              <button
                type="button"
                onClick={runUpload}
                className="rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                再試行
              </button>
            </>
          )}
        </footer>
      </div>
    </div>
  );
}

type FormBodyProps = {
  file: File | null;
  displayName: string;
  folder: string;
  tagsInput: string;
  onFileChange: (f: File | null) => void;
  onDisplayNameChange: (s: string) => void;
  onFolderChange: (s: string) => void;
  onTagsChange: (s: string) => void;
};

function FormBody({
  file,
  displayName,
  folder,
  tagsInput,
  onFileChange,
  onDisplayNameChange,
  onFolderChange,
  onTagsChange,
}: FormBodyProps) {
  return (
    <div className="space-y-4">
      <label className="block">
        <span className="block text-xs font-semibold text-slate-600">
          HTML ファイル <span className="text-rose-600">*</span>
        </span>
        <input
          type="file"
          accept=".html,.htm"
          onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
          className="mt-1 block w-full text-sm"
        />
        {file && (
          <p className="mt-1 text-xs text-slate-500">
            {file.name}（{(file.size / 1024).toFixed(1)} KB）
          </p>
        )}
      </label>

      <label className="block">
        <span className="block text-xs font-semibold text-slate-600">
          表示名 <span className="text-rose-600">*</span>
        </span>
        <input
          type="text"
          value={displayName}
          onChange={(e) => onDisplayNameChange(e.target.value)}
          className="mt-1 block w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </label>

      <label className="block">
        <span className="block text-xs font-semibold text-slate-600">
          フォルダ（任意）
        </span>
        <input
          type="text"
          value={folder}
          onChange={(e) => onFolderChange(e.target.value)}
          placeholder="/projects/sample"
          className="mt-1 block w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </label>

      <label className="block">
        <span className="block text-xs font-semibold text-slate-600">
          タグ（カンマ区切り）
        </span>
        <input
          type="text"
          value={tagsInput}
          onChange={(e) => onTagsChange(e.target.value)}
          placeholder="design, draft"
          className="mt-1 block w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </label>
    </div>
  );
}

function ProgressBody({
  current,
  pagesStatus,
}: {
  current: SubStep;
  pagesStatus: string | null;
}) {
  return (
    <ul className="space-y-2">
      {STEPS.map((s) => {
        const state = classifyStep(current, s.key);
        const icon =
          state === 'done' ? '✓' : state === 'doing' ? '⏳' : '·';
        const color =
          state === 'done'
            ? 'text-emerald-600'
            : state === 'doing'
              ? 'text-blue-600'
              : 'text-slate-400';
        return (
          <li
            key={s.key}
            className={`flex items-center gap-2 ${color}`}
          >
            <span className="inline-block w-5 text-center font-mono">
              {icon}
            </span>
            <span className="text-sm">
              {s.label}
              {s.key === 'waiting-pages' && state === 'doing' && pagesStatus && (
                <span className="ml-1 text-xs text-slate-500">
                  ({pagesStatus})
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function DoneBody({ url }: { url: string }) {
  return (
    <div className="space-y-3">
      <p className="text-emerald-700">
        アップロード完了。Pages 反映済みです。
      </p>
      <div className="rounded border border-slate-200 bg-slate-50 p-3">
        <p className="mb-1 text-xs font-semibold text-slate-600">閲覧 URL</p>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="break-all text-blue-600 hover:underline"
        >
          {url}
        </a>
      </div>
    </div>
  );
}

function ErrorBody({ message }: { message: string }) {
  return (
    <pre className="whitespace-pre-wrap rounded border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
      {message}
    </pre>
  );
}

async function waitForPagesBuild(
  client: GitHubClient,
  expectedSha: string,
  onTick: (status: string) => void,
  maxMs = 180_000,
): Promise<void> {
  const start = Date.now();
  let lastStatus = 'pending';
  while (Date.now() - start < maxMs) {
    try {
      const build = await client.getPagesBuildStatus();
      lastStatus = build.status;
      onTick(build.status);
      if (build.commit === expectedSha && build.status === 'built') {
        return;
      }
      if (build.commit === expectedSha && build.status === 'errored') {
        throw new Error(
          build.error?.message ?? 'Pages build がエラー終了しました',
        );
      }
    } catch (e) {
      if (e instanceof GitHubAPIError && e.status === 404) {
        onTick('no-builds');
      } else {
        throw e;
      }
    }
    await sleep(5000);
  }
  throw new Error(
    `Pages デプロイ待機がタイムアウトしました（最終状態: ${lastStatus}）`,
  );
}
