import { useEffect, useRef, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import { PAGES_SITE_URL } from '../config';
import type { FileEntry } from '../types';

type Props = {
  entry: FileEntry;
  onRename: () => void;
  onMoveFolder: () => void;
  onEditTags: () => void;
  onDelete: () => void;
};

const MAX_VISIBLE_TAGS = 3;

export default function ManageFileCard({
  entry,
  onRename,
  onMoveFolder,
  onEditTags,
  onDelete,
}: Props) {
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

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menuOpen]);

  const handle = (fn: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuOpen(false);
    fn();
  };

  return (
    <div className="group relative overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:shadow-md hover:border-slate-300">
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="flex flex-col"
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
          <h3 className="line-clamp-2 pr-7 text-sm font-semibold text-slate-800 group-hover:text-slate-900">
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

      <div ref={menuRef} className="absolute right-1.5 top-1.5">
        <button
          type="button"
          aria-label="メニュー"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setMenuOpen((o) => !o);
          }}
          className="rounded-full bg-white/80 px-1.5 py-0.5 text-base font-bold leading-none text-slate-600 shadow-sm backdrop-blur-sm hover:bg-white"
        >
          ⋮
        </button>
        {menuOpen && (
          <ul className="absolute right-0 top-7 z-20 w-36 overflow-hidden rounded-md border border-slate-200 bg-white text-sm shadow-lg">
            <li>
              <button
                type="button"
                onClick={handle(onRename)}
                className="block w-full px-3 py-2 text-left hover:bg-slate-100"
              >
                リネーム
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={handle(onMoveFolder)}
                className="block w-full px-3 py-2 text-left hover:bg-slate-100"
              >
                フォルダ移動
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={handle(onEditTags)}
                className="block w-full px-3 py-2 text-left hover:bg-slate-100"
              >
                タグ編集
              </button>
            </li>
            <li className="border-t border-slate-100">
              <button
                type="button"
                onClick={handle(onDelete)}
                className="block w-full px-3 py-2 text-left text-rose-600 hover:bg-rose-50"
              >
                削除
              </button>
            </li>
          </ul>
        )}
      </div>
    </div>
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
