import type { SortKey, SortOrder } from '../stores/ui';

type Props = {
  sortBy: SortKey;
  sortOrder: SortOrder;
  onChange: (key: SortKey, order: SortOrder) => void;
};

const KEY_LABEL: Record<SortKey, string> = {
  updatedAt: '更新日時',
  uploadedAt: 'アップロード日時',
  displayName: '表示名',
  size: 'サイズ',
};

export default function SortSelector({ sortBy, sortOrder, onChange }: Props) {
  return (
    <div className="flex items-center gap-1.5 text-sm">
      <label className="text-xs text-slate-500">並べ替え</label>
      <select
        value={sortBy}
        onChange={(e) => onChange(e.target.value as SortKey, sortOrder)}
        className="rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {(Object.keys(KEY_LABEL) as SortKey[]).map((k) => (
          <option key={k} value={k}>
            {KEY_LABEL[k]}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() =>
          onChange(sortBy, sortOrder === 'asc' ? 'desc' : 'asc')
        }
        aria-label={sortOrder === 'asc' ? '昇順' : '降順'}
        className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
      >
        {sortOrder === 'asc' ? '↑ 昇順' : '↓ 降順'}
      </button>
    </div>
  );
}
