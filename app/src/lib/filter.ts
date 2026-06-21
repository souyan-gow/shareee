import type { FileEntry } from '../types';
import type { SortKey, SortOrder } from '../stores/ui';

function normalize(s: string): string {
  return s.normalize('NFKC').toLowerCase();
}

export function matchesSearch(entry: FileEntry, query: string): boolean {
  const q = normalize(query.trim());
  if (!q) return true;
  const haystack = [
    entry.displayName,
    entry.folder,
    ...entry.tags,
  ]
    .map(normalize)
    .join(' ');
  return haystack.includes(q);
}

export function matchesFolder(
  entry: FileEntry,
  folder: string | null,
): boolean {
  if (folder === null) return true;
  if (folder === '') return entry.folder === '';
  return entry.folder === folder || entry.folder.startsWith(`${folder}/`);
}

export function matchesTags(entry: FileEntry, tags: string[]): boolean {
  if (tags.length === 0) return true;
  return tags.every((t) => entry.tags.includes(t));
}

export function applyFilters(
  entries: FileEntry[],
  opts: {
    query: string;
    folder: string | null;
    tags: string[];
  },
): FileEntry[] {
  return entries.filter(
    (e) =>
      matchesSearch(e, opts.query) &&
      matchesFolder(e, opts.folder) &&
      matchesTags(e, opts.tags),
  );
}

export function sortEntries(
  entries: FileEntry[],
  sortBy: SortKey,
  sortOrder: SortOrder,
): FileEntry[] {
  const factor = sortOrder === 'asc' ? 1 : -1;
  const collator = new Intl.Collator('ja', { numeric: true });
  return [...entries].sort((a, b) => {
    let cmp = 0;
    switch (sortBy) {
      case 'updatedAt':
        cmp = a.updatedAt.localeCompare(b.updatedAt);
        break;
      case 'uploadedAt':
        cmp = a.uploadedAt.localeCompare(b.uploadedAt);
        break;
      case 'displayName':
        cmp = collator.compare(a.displayName, b.displayName);
        break;
      case 'size':
        cmp = a.size - b.size;
        break;
    }
    return cmp * factor;
  });
}
