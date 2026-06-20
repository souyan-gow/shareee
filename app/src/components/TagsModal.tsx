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

export default function TagsModal({ entry, onClose }: Props) {
  const pat = useAuthStore((s) => s.pat);
  const clearPat = useAuthStore((s) => s.clearPat);
  const updateLocal = useManifestStore((s) => s.updateFile);

  const [tags, setTags] = useState<string[]>(entry.tags);
  const [draft, setDraft] = useState('');
  const [phase, setPhase] = useState<'form' | 'submitting' | 'error'>('form');
  const [error, setError] = useState<string | null>(null);

  const addTag = () => {
    const t = draft.trim();
    if (!t || tags.includes(t)) {
      setDraft('');
      return;
    }
    setTags([...tags, t]);
    setDraft('');
  };

  const removeTag = (t: string) => {
    setTags(tags.filter((x) => x !== t));
  };

  const dirty =
    tags.length !== entry.tags.length ||
    tags.some((t, i) => t !== entry.tags[i]);

  const onSubmit = async () => {
    if (!pat || !dirty || phase === 'submitting') return;
    setPhase('submitting');
    setError(null);
    try {
      await commitEntryPatch(
        pat,
        entry.id,
        { tags },
        `chore: edit tags of ${entry.displayName} (${entry.id})`,
      );
      updateLocal(entry.id, { tags });
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
      title="タグ編集"
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
      <div>
        <span className="block text-xs font-semibold text-slate-600">
          タグ
        </span>
        <ul className="mt-1 flex flex-wrap gap-1">
          {tags.length === 0 && (
            <li className="text-xs text-slate-400">（タグなし）</li>
          )}
          {tags.map((t) => (
            <li
              key={t}
              className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
            >
              {t}
              <button
                type="button"
                onClick={() => removeTag(t)}
                aria-label={`${t} を削除`}
                className="rounded text-slate-400 hover:text-rose-600"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-3 flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addTag();
            }
          }}
          placeholder="新しいタグ"
          className="flex-1 rounded border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={addTag}
          disabled={!draft.trim()}
          className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-40"
        >
          追加
        </button>
      </div>
      {error && (
        <pre className="mt-3 whitespace-pre-wrap rounded border border-rose-200 bg-rose-50 p-2 text-xs text-rose-900">
          {error}
        </pre>
      )}
    </ModalShell>
  );
}
