import { useCallback, useEffect, useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import { GitHubClient, PATInvalidError } from '../lib/github';
import { REPO_NAME, REPO_OWNER } from '../config';
import UploadModal from '../components/UploadModal';

function filterHtmlFiles(files: FileList | File[]): File[] {
  return Array.from(files).filter((f) => /\.html?$/i.test(f.name));
}

export default function ManageRoute() {
  const pat = useAuthStore((s) => s.pat);
  const username = useAuthStore((s) => s.username);
  const setUsername = useAuthStore((s) => s.setUsername);
  const clearPat = useAuthStore((s) => s.clearPat);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [queue, setQueue] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragRejected, setDragRejected] = useState<string | null>(null);
  const dragCounter = useRef(0);

  useEffect(() => {
    if (!pat || username) return;
    let cancelled = false;
    (async () => {
      try {
        const client = new GitHubClient(pat, REPO_OWNER, REPO_NAME);
        const user = await client.getCurrentUser();
        if (!cancelled) setUsername(user.login);
      } catch (e) {
        if (e instanceof PATInvalidError) {
          clearPat();
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pat, username, setUsername, clearPat]);

  const startQueue = useCallback((files: File[]) => {
    if (files.length === 0) return;
    const [first, ...rest] = files;
    setCurrentFile(first);
    setQueue(rest);
    setUploadOpen(true);
  }, []);

  const onModalClose = useCallback(() => {
    setUploadOpen(false);
    setQueue([]);
    setCurrentFile(null);
  }, []);

  const onModalNext = useCallback(() => {
    setQueue((q) => {
      if (q.length === 0) {
        setUploadOpen(false);
        setCurrentFile(null);
        return q;
      }
      const [next, ...rest] = q;
      setCurrentFile(next);
      return rest;
    });
  }, []);

  const onDragEnter = (e: DragEvent<HTMLElement>) => {
    if (!e.dataTransfer?.types.includes('Files')) return;
    if (uploadOpen) return;
    e.preventDefault();
    dragCounter.current += 1;
    setIsDragging(true);
    setDragRejected(null);
  };

  const onDragOver = (e: DragEvent<HTMLElement>) => {
    if (!e.dataTransfer?.types.includes('Files')) return;
    if (uploadOpen) return;
    e.preventDefault();
  };

  const onDragLeave = (e: DragEvent<HTMLElement>) => {
    if (uploadOpen) return;
    e.preventDefault();
    dragCounter.current = Math.max(0, dragCounter.current - 1);
    if (dragCounter.current === 0) setIsDragging(false);
  };

  const onDrop = (e: DragEvent<HTMLElement>) => {
    if (uploadOpen) return;
    e.preventDefault();
    dragCounter.current = 0;
    setIsDragging(false);
    const htmls = filterHtmlFiles(e.dataTransfer?.files ?? []);
    if (htmls.length === 0) {
      setDragRejected('HTML ファイル (.html / .htm) のみ受け付けます');
      return;
    }
    setDragRejected(null);
    startQueue(htmls);
  };

  return (
    <main
      className="min-h-screen bg-slate-50 text-slate-800"
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="mx-auto max-w-3xl px-4 py-12">
        <header className="flex items-baseline justify-between mb-8">
          <h1 className="text-2xl font-semibold">Manage</h1>
          <div className="flex items-center gap-3 text-sm text-slate-500">
            {username && <span>{username}</span>}
            <Link
              to="/manage/setup"
              className="hover:text-slate-800 underline"
            >
              PAT 設定
            </Link>
          </div>
        </header>

        <div className="mb-6 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setUploadOpen(true)}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            + 新規アップロード
          </button>
          <span className="hidden text-xs text-slate-400 sm:inline">
            または HTML ファイルを画面にドロップ
          </span>
        </div>

        {dragRejected && (
          <div className="mb-4 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {dragRejected}
          </div>
        )}

        <section className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
          <p>
            Phase 3 までで実装済み: アップロード、トップ一覧表示。
            編集（リネーム/フォルダ/タグ/削除）は Phase 4 で追加予定です。
          </p>
        </section>

        <UploadModal
          open={uploadOpen}
          onClose={onModalClose}
          uploader={username}
          initialFile={currentFile}
          queueRemaining={queue.length}
          onNext={queue.length > 0 ? onModalNext : undefined}
        />
      </div>

      {isDragging && (
        <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-blue-500/10 backdrop-blur-[1px]">
          <div className="rounded-xl border-2 border-dashed border-blue-400 bg-white/90 px-10 py-8 shadow-xl">
            <p className="text-lg font-semibold text-slate-800">
              ここに HTML ファイルをドロップ
            </p>
            <p className="mt-1 text-xs text-slate-500">
              複数ファイルは 1 件ずつ順次アップロードします
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
