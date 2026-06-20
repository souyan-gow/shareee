export function normalizeFolder(input: string): string {
  const trimmed = input.trim();
  if (!trimmed || trimmed === '/') return '';
  const withLeading = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withLeading.replace(/\/+$/, '');
}

export function parseTags(input: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input.split(',')) {
    const t = raw.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}
