import { useMemo, useState } from 'react';
import ModalShell from './ModalShell';
import { useAuthStore } from '../stores/auth';
import { useManifestStore } from '../stores/manifest';
import { commitEntryPatch, describeError } from '../lib/edit-commit';
import { normalizeFolder } from '../lib/folder';
import type { FileEntry } from '../types';

type Props = {
  entry: FileEntry;
  onClose: () => void;
};

export default function MoveFolderModal({ entry, onClose }: Props) {
  const pat = useAuthStore((s) => s.pat);
  const clearPat = useAuthStore((s) => s.clearPat);
  const manifest = useManifestStore((s) => s.manifest);
  const updateLocal = useManifestStore((s) => s.updateFile);

  const [value, setValue] = useState(entry.folder);
  const [phase, setPhase] = useState<'form' | 'submitting' | 'error'>('form');
  const [error, setError] = useState<string | null>(null);

  const folderOptions = useMemo(() => {
    if (!manifest) return [];
    const set = new Set<string>();
    for (const f of manifest.files) {
      if (f.folder) set.add(f.folder);
    }
    return [...set].sort();
  }, [manifest]);

  const normalized = normalizeFolder(value);
  const dirty = normalized !== entry.folder;

  const onSubmit = async () => {
    if (!pat || !dirty || phase === 'submitting') return;
    setPhase('submitting');
    setError(null);
    try {
      await commitEntryPatch(
        pat,
        entry.id,
        { folder: normalized },
        `chore: move ${entry.displayName} → ${normalized || '/'} (${entry.id})`,
      );
      updateLocal(entry.id, { folder: normalized });
      onClose();
    } catch (e) {
      const err = describeError(e);
      if (err.kind === 'pat-invalid') clearPat();
      setError(err.message);
      setPhase('error');
    }
  };

  return (
    <ModalShell
      open
      title="フォルダ移動"
      onClose={onClose}
      disableClose={phase === 'submitting'}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={phase === 'submitting'}
            className="rounded px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-40"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={!dirty || phase === 'submitting'}
            className="rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40 hover:bg-blue-700"
          >
            {phase === 'submitting' ? '保存中…' : '保存'}
          </button>
        </>
      }
    >
      <label className="block">
        <span className="block text-xs font-semibold text-slate-600">
          フォルダパス
        </span>
        <input
          type="text"
          list="folder-options"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="（空欄でルートへ）"
          autoFocus
          className="mt-1 block w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <datalist id="folder-options">
          {folderOptions.map((f) => (
            <option key={f} value={f} />
          ))}
        </datalist>
        <p className="mt-1 text-xs text-slate-500">
          正規化後: <code>{normalized || '(ルート)'}</code>
        </p>
      </label>
      {error && (
        <pre className="mt-3 whitespace-pre-wrap rounded border border-rose-200 bg-rose-50 p-2 text-xs text-rose-900">
          {error}
        </pre>
      )}
    </ModalShell>
  );
}
