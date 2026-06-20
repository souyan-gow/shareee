import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import { PAGES_SITE_URL } from '../config';
import type { FileEntry } from '../types';

type Props = {
  entry: FileEntry;
};

const MAX_VISIBLE_TAGS = 3;

export default function FileCard({ entry }: Props) {
  const href = `${PAGES_SITE_URL}/files/${entry.id}/${entry.entryPath}`;
  const thumbUrl = entry.thumbnail
    ? entry.thumbnail.startsWith('http')
      ? entry.thumbnail
      : `${PAGES_SITE_URL}${entry.thumbnail}`
    : null;

  const visibleTags = entry.tags.slice(0, MAX_VISIBLE_TAGS);
  const extraTagCount = entry.tags.length - visibleTags.length;

  const relative = formatRelative(entry.updatedAt);
  const absolute = formatAbsolute(entry.updatedAt);

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="group flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:shadow-md hover:border-slate-300"
    >
      <div className="relative aspect-video w-full bg-slate-100">
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-slate-400">
            <span className="text-xs">サムネ未生成</span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 px-3 py-2.5">
        <h3 className="line-clamp-2 text-sm font-semibold text-slate-800 group-hover:text-slate-900">
          {entry.displayName}
        </h3>
        {entry.folder && (
          <p className="truncate text-xs text-slate-400">{entry.folder}</p>
        )}
        {entry.tags.length > 0 && (
          <ul className="flex flex-wrap gap-1">
            {visibleTags.map((t) => (
              <li
                key={t}
                className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600"
              >
                {t}
              </li>
            ))}
            {extraTagCount > 0 && (
              <li className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                +{extraTagCount}
              </li>
            )}
          </ul>
        )}
        <p
          className="mt-auto text-[11px] text-slate-400"
          title={absolute}
        >
          {relative}
        </p>
      </div>
    </a>
  );
}

function formatRelative(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), {
      addSuffix: true,
      locale: ja,
    });
  } catch {
    return iso;
  }
}

function formatAbsolute(iso: string): string {
  try {
    return new Date(iso).toLocaleString('ja-JP');
  } catch {
    return iso;
  }
}
