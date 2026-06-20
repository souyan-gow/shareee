import { useState } from 'react';
import ModalShell from './ModalShell';
import { useAuthStore } from '../stores/auth';
import { useManifestStore } from '../stores/manifest';
import { commitEntryPatch, describeError } from '../lib/edit-commit';
import type { FileEntry } from '../types';

type Props = {
  entry: FileEntry;
  onClose: () => void;
};

export default function RenameModal({ entry, onClose }: Props) {
  const pat = useAuthStore((s) => s.pat);
  const clearPat = useAuthStore((s) => s.clearPat);
  const updateLocal = useManifestStore((s) => s.updateFile);

  const [value, setValue] = useState(entry.displayName);
  const [phase, setPhase] = useState<'form' | 'submitting' | 'error'>('form');
  const [error, setError] = useState<string | null>(null);

  const trimmed = value.trim();
  const dirty = trimmed && trimmed !== entry.displayName;

  const onSubmit = async () => {
    if (!pat || !dirty || phase === 'submitting') return;
    setPhase('submitting');
    setError(null);
    try {
      await commitEntryPatch(
        pat,
        entry.id,
        { displayName: trimmed },
        `chore: rename "${entry.displayName}" → "${trimmed}" (${entry.id})`,
      );
      updateLocal(entry.id, { displayName: trimmed });
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
      title="リネーム"
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
          新しい表示名
        </span>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
          className="mt-1 block w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </label>
      {error && (
        <pre className="mt-3 whitespace-pre-wrap rounded border border-rose-200 bg-rose-50 p-2 text-xs text-rose-900">
          {error}
        </pre>
      )}
    </ModalShell>
  );
}
