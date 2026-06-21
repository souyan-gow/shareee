import { useCallback, useEffect, useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import { useManifestStore } from '../stores/manifest';
import { GitHubClient, PATInvalidError } from '../lib/github';
import { REPO_NAME, REPO_OWNER } from '../config';
import UploadModal from '../components/UploadModal';
import ManageFileCard from '../components/ManageFileCard';
import RenameModal from '../components/RenameModal';
import MoveFolderModal from '../components/MoveFolderModal';
import TagsModal from '../components/TagsModal';
import DeleteModal from '../components/DeleteModal';
import type { FileEntry } from '../types';

type EditMode = 'rename' | 'folder' | 'tags' | 'delete';

function filterAcceptedFiles(files: FileList | File[]): File[] {
  return Array.from(files).filter((f) => /\.(html?|zip)$/i.test(f.name));
}

export default function ManageRoute() {
  const pat = useAuthStore((s) => s.pat);
  const username = useAuthStore((s) => s.username);
  const setUsername = useAuthStore((s) => s.setUsername);
  const clearPat = useAuthStore((s) => s.clearPat);

  const manifest = useManifestStore((s) => s.manifest);
  const isLoading = useManifestStore((s) => s.isLoading);
  const error = useManifestStore((s) => s.error);
  const fetchManifest = useManifestStore((s) => s.fetch);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [queue, setQueue] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragRejected, setDragRejected] = useState<string | null>(null);
  const dragCounter = useRef(0);

  const [editing, setEditing] = useState<{
    entry: FileEntry;
    mode: EditMode;
  } | null>(null);

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

  useEffect(() => {
    if (!manifest && !isLoading) {
      void fetchManifest();
    }
  }, [manifest, isLoading, fetchManifest]);

  const sortedFiles = manifest
    ? [...manifest.files].sort((a, b) =>
        b.updatedAt.localeCompare(a.updatedAt),
      )
    : [];

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
    if (uploadOpen || editing) return;
    e.preventDefault();
    dragCounter.current += 1;
    setIsDragging(true);
    setDragRejected(null);
  };

  const onDragOver = (e: DragEvent<HTMLElement>) => {
    if (!e.dataTransfer?.types.includes('Files')) return;
    if (uploadOpen || editing) return;
    e.preventDefault();
  };

  const onDragLeave = (e: DragEvent<HTMLElement>) => {
    if (uploadOpen || editing) return;
    e.preventDefault();
    dragCounter.current = Math.max(0, dragCounter.current - 1);
    if (dragCounter.current === 0) setIsDragging(false);
  };

  const onDrop = (e: DragEvent<HTMLElement>) => {
    if (uploadOpen || editing) return;
    e.preventDefault();
    dragCounter.current = 0;
    setIsDragging(false);
    const accepted = filterAcceptedFiles(e.dataTransfer?.files ?? []);
    if (accepted.length === 0) {
      setDragRejected('対応形式 (.html / .htm / .zip) のみ受け付けます');
      return;
    }
    setDragRejected(null);
    startQueue(accepted);
  };

  return (
    <main
      className="min-h-screen bg-slate-50 text-slate-800"
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
        <header className="mb-6 flex items-baseline justify-between md:mb-8">
          <h1 className="text-2xl font-semibold md:text-3xl">Manage</h1>
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
            または .html / .zip を画面にドロップ
          </span>
        </div>

        {dragRejected && (
          <div className="mb-4 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {dragRejected}
          </div>
        )}

        {error && (
          <div className="mb-4 rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
            読み込みエラー: {error.message}
            <button
              type="button"
              onClick={() => void fetchManifest()}
              className="ml-2 underline"
            >
              再試行
            </button>
          </div>
        )}

        {isLoading && !manifest && (
          <p className="text-sm text-slate-500">読み込み中…</p>
        )}

        {manifest && sortedFiles.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
            まだファイルがありません。上の「+ 新規アップロード」または D&amp;D で追加してください。
          </div>
        )}

        {sortedFiles.length > 0 && (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sortedFiles.map((entry) => (
              <li key={entry.id}>
                <ManageFileCard
                  entry={entry}
                  onRename={() => setEditing({ entry, mode: 'rename' })}
                  onMoveFolder={() => setEditing({ entry, mode: 'folder' })}
                  onEditTags={() => setEditing({ entry, mode: 'tags' })}
                  onDelete={() => setEditing({ entry, mode: 'delete' })}
                />
              </li>
            ))}
          </ul>
        )}

        <UploadModal
          open={uploadOpen}
          onClose={onModalClose}
          uploader={username}
          initialFile={currentFile}
          queueRemaining={queue.length}
          onNext={queue.length > 0 ? onModalNext : undefined}
        />

        {editing?.mode === 'rename' && (
          <RenameModal
            entry={editing.entry}
            onClose={() => setEditing(null)}
          />
        )}
        {editing?.mode === 'folder' && (
          <MoveFolderModal
            entry={editing.entry}
            onClose={() => setEditing(null)}
          />
        )}
        {editing?.mode === 'tags' && (
          <TagsModal
            entry={editing.entry}
            onClose={() => setEditing(null)}
          />
        )}
        {editing?.mode === 'delete' && (
          <DeleteModal
            entry={editing.entry}
            onClose={() => setEditing(null)}
          />
        )}
      </div>

      {isDragging && (
        <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-blue-500/10 backdrop-blur-[1px]">
          <div className="rounded-xl border-2 border-dashed border-blue-400 bg-white/90 px-10 py-8 shadow-xl">
            <p className="text-lg font-semibold text-slate-800">
              ここに .html / .zip ファイルをドロップ
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
