type Props = {
  value: string;
  onChange: (v: string) => void;
};

export default function SearchBox({ value, onChange }: Props) {
  return (
    <div className="relative w-full">
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="表示名 / フォルダ / タグで検索"
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="クリア"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-slate-200 px-1.5 text-xs text-slate-600 hover:bg-slate-300"
        >
          ×
        </button>
      )}
    </div>
  );
}
