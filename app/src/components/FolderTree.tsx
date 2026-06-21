import { useMemo, useState } from 'react';
import type { FileEntry } from '../types';
import { buildFolderTree, type FolderNode } from '../lib/folder-tree';

type Props = {
  entries: FileEntry[];
  selectedFolder: string | null;
  onSelect: (folder: string | null) => void;
};

export default function FolderTree({
  entries,
  selectedFolder,
  onSelect,
}: Props) {
  const root = useMemo(() => buildFolderTree(entries), [entries]);

  return (
    <nav aria-label="フォルダ" className="text-sm">
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={clsRow(selectedFolder === null)}
      >
        <span>すべて</span>
        <span className="text-xs text-slate-400">
          {entries.length}
        </span>
      </button>
      {root.directCount > 0 && (
        <button
          type="button"
          onClick={() => onSelect('')}
          className={clsRow(selectedFolder === '')}
        >
          <span>(ルート直下)</span>
          <span className="text-xs text-slate-400">{root.directCount}</span>
        </button>
      )}
      <ul className="mt-1">
        {root.children.map((node) => (
          <FolderRow
            key={node.path}
            node={node}
            depth={0}
            selectedFolder={selectedFolder}
            onSelect={onSelect}
          />
        ))}
      </ul>
    </nav>
  );
}

function FolderRow({
  node,
  depth,
  selectedFolder,
  onSelect,
}: {
  node: FolderNode;
  depth: number;
  selectedFolder: string | null;
  onSelect: (folder: string | null) => void;
}) {
  const [open, setOpen] = useState(true);
  const selected = selectedFolder === node.path;
  const hasChildren = node.children.length > 0;
  return (
    <li>
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => hasChildren && setOpen((o) => !o)}
          aria-label={open ? '閉じる' : '開く'}
          className={
            hasChildren
              ? 'w-5 text-slate-400 hover:text-slate-700'
              : 'w-5 text-transparent'
          }
        >
          {hasChildren ? (open ? '▾' : '▸') : '·'}
        </button>
        <button
          type="button"
          onClick={() => onSelect(node.path)}
          style={{ paddingLeft: `${depth * 8}px` }}
          className={clsRow(selected)}
        >
          <span className="truncate">{node.name}</span>
          <span className="text-xs text-slate-400">
            {node.descendantCount}
          </span>
        </button>
      </div>
      {hasChildren && open && (
        <ul>
          {node.children.map((c) => (
            <FolderRow
              key={c.path}
              node={c}
              depth={depth + 1}
              selectedFolder={selectedFolder}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function clsRow(selected: boolean): string {
  const base =
    'flex w-full items-center justify-between gap-2 rounded px-2 py-1 text-left transition';
  return selected
    ? `${base} bg-blue-100 font-semibold text-blue-900`
    : `${base} text-slate-700 hover:bg-slate-100`;
}
