import { useState } from 'react';
import ModalShell from './ModalShell';
import { useAuthStore } from '../stores/auth';
import { useManifestStore } from '../stores/manifest';
import { commitDelete, describeError } from '../lib/edit-commit';
import type { FileEntry } from '../types';

type Props = {
  entry: FileEntry;
  onClose: () => void;
};

export default function DeleteModal({ entry, onClose }: Props) {
  const pat = useAuthStore((s) => s.pat);
  const clearPat = useAuthStore((s) => s.clearPat);
  const removeLocal = useManifestStore((s) => s.removeFile);

  const [phase, setPhase] = useState<'confirm' | 'submitting' | 'error'>(
    'confirm',
  );
  const [error, setError] = useState<string | null>(null);

  const onConfirm = async () => {
    if (!pat || phase === 'submitting') return;
    setPhase('submitting');
    setError(null);
    try {
      await commitDelete(pat, entry);
      removeLocal(entry.id);
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
      title="削除の確認"
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
            onClick={onConfirm}
            disabled={phase === 'submitting'}
            className="rounded bg-rose-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40 hover:bg-rose-700"
          >
            {phase === 'submitting' ? '削除中…' : '削除する'}
          </button>
        </>
      }
    >
      <p>
        <span className="font-semibold">「{entry.displayName}」</span> を削除します。
      </p>
      <ul className="mt-3 list-disc list-inside text-xs text-slate-500">
        <li>
          物理ファイル <code>files/{entry.id}/</code> 配下をすべて削除
        </li>
        <li>
          サムネ画像 <code>thumbnails/{entry.id}.png</code> も削除
        </li>
        <li>manifest.json から該当エントリを除去</li>
      </ul>
      <p className="mt-3 rounded bg-amber-50 px-3 py-2 text-xs text-amber-900">
        この操作は取り消せません（git history からは復元可）。
      </p>
      {error && (
        <pre className="mt-3 whitespace-pre-wrap rounded border border-rose-200 bg-rose-50 p-2 text-xs text-rose-900">
          {error}
        </pre>
      )}
    </ModalShell>
  );
}
