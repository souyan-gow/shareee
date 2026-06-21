import JSZip from 'jszip';

export type ZipFileNode = {
  path: string;
  content: ArrayBuffer;
  size: number;
};

export async function extractZip(file: File): Promise<ZipFileNode[]> {
  const zip = await JSZip.loadAsync(file);
  const targets: Array<[string, JSZip.JSZipObject]> = [];
  zip.forEach((path, obj) => {
    if (!obj.dir) targets.push([path, obj]);
  });
  const nodes = await Promise.all(
    targets.map(async ([path, obj]) => {
      const content = await obj.async('arraybuffer');
      return { path, content, size: content.byteLength };
    }),
  );
  return nodes.sort((a, b) => a.path.localeCompare(b.path));
}

function isAtRoot(path: string): boolean {
  return !path.includes('/');
}

export function findEntryPointCandidates(nodes: ZipFileNode[]): string[] {
  const htmls = nodes
    .map((n) => n.path)
    .filter((p) => /\.html?$/i.test(p));
  if (htmls.length === 0) return [];

  const rootIndex = htmls.find(
    (p) => isAtRoot(p) && /^index\.html?$/i.test(p),
  );
  if (rootIndex) return [rootIndex];

  if (htmls.length === 1) return htmls;

  return htmls.sort((a, b) => a.localeCompare(b));
}

export function totalSize(nodes: ZipFileNode[]): number {
  return nodes.reduce((s, n) => s + n.size, 0);
}
