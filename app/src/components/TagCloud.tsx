import { useMemo } from 'react';
import type { FileEntry } from '../types';

type Props = {
  entries: FileEntry[];
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  onClear: () => void;
};

export default function TagCloud({
  entries,
  selectedTags,
  onToggleTag,
  onClear,
}: Props) {
  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of entries) {
      for (const t of e.tags) {
        counts.set(t, (counts.get(t) ?? 0) + 1);
      }
    }
    return [...counts.entries()].sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0], 'ja');
    });
  }, [entries]);

  if (tagCounts.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-slate-500">タグ:</span>
      {tagCounts.map(([tag, count]) => {
        const active = selectedTags.includes(tag);
        return (
          <button
            key={tag}
            type="button"
            onClick={() => onToggleTag(tag)}
            className={
              active
                ? 'rounded-full bg-blue-600 px-2.5 py-0.5 text-xs font-semibold text-white'
                : 'rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-700 hover:bg-slate-200'
            }
          >
            {tag}{' '}
            <span className={active ? 'opacity-70' : 'text-slate-400'}>
              {count}
            </span>
          </button>
        );
      })}
      {selectedTags.length > 0 && (
        <button
          type="button"
          onClick={onClear}
          className="ml-1 text-xs text-slate-500 underline hover:text-slate-800"
        >
          解除
        </button>
      )}
    </div>
  );
}
