import type { FileEntry } from '../types';
import { matchesFolder } from './filter';

export type FolderNode = {
  name: string;
  path: string;
  directCount: number;
  descendantCount: number;
  children: FolderNode[];
};

export function buildFolderTree(entries: FileEntry[]): FolderNode {
  const root: FolderNode = {
    name: '(ルート)',
    path: '',
    directCount: 0,
    descendantCount: 0,
    children: [],
  };

  const ensurePath = (segments: string[]): FolderNode => {
    let node = root;
    let acc = '';
    for (const seg of segments) {
      acc += `/${seg}`;
      let child = node.children.find((c) => c.name === seg);
      if (!child) {
        child = {
          name: seg,
          path: acc,
          directCount: 0,
          descendantCount: 0,
          children: [],
        };
        node.children.push(child);
      }
      node = child;
    }
    return node;
  };

  for (const e of entries) {
    const folder = e.folder.replace(/^\//, '');
    const segments = folder ? folder.split('/') : [];
    const node = ensurePath(segments);
    node.directCount += 1;
  }

  const computeDescendant = (node: FolderNode): number => {
    let total = node.directCount;
    node.children.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
    for (const c of node.children) {
      total += computeDescendant(c);
    }
    node.descendantCount = total;
    return total;
  };
  computeDescendant(root);

  return root;
}

export function countByFolder(
  entries: FileEntry[],
  folder: string | null,
): number {
  return entries.filter((e) => matchesFolder(e, folder)).length;
}
