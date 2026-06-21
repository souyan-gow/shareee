type Props = {
  folder: string | null;
  onSelect: (folder: string | null) => void;
};

export default function Breadcrumb({ folder, onSelect }: Props) {
  const items: { label: string; path: string | null }[] = [
    { label: 'すべて', path: null },
  ];

  if (folder === '') {
    items.push({ label: '(ルート直下)', path: '' });
  } else if (folder) {
    const segments = folder.replace(/^\//, '').split('/');
    let acc = '';
    for (const seg of segments) {
      acc += `/${seg}`;
      items.push({ label: seg, path: acc });
    }
  }

  return (
    <nav aria-label="パンくず" className="flex flex-wrap items-center gap-1 text-xs text-slate-500">
      {items.map((it, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={`${it.path ?? 'all'}-${i}`} className="flex items-center gap-1">
            {i > 0 && <span className="text-slate-300">/</span>}
            {isLast ? (
              <span className="font-semibold text-slate-700">{it.label}</span>
            ) : (
              <button
                type="button"
                onClick={() => onSelect(it.path)}
                className="hover:text-slate-800 hover:underline"
              >
                {it.label}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}
