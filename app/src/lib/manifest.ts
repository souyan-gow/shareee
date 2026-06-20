import type { FileEntry, Manifest } from '../types';
import { GitHubClient } from './github';

export async function fetchManifest(
  client: GitHubClient,
  branch: string,
): Promise<{ manifest: Manifest; sha: string }> {
  const { content, sha } = await client.getFile('manifest.json', branch);
  const manifest = JSON.parse(content) as Manifest;
  return { manifest, sha };
}

export function addEntry(manifest: Manifest, entry: FileEntry): Manifest {
  const now = new Date().toISOString();
  return {
    ...manifest,
    updatedAt: now,
    files: [...manifest.files, entry],
  };
}

export type EntryPatch = Partial<
  Omit<FileEntry, 'id' | 'uploadedAt' | 'updatedAt'>
>;

export function updateEntry(
  manifest: Manifest,
  id: string,
  patch: EntryPatch,
): Manifest {
  const now = new Date().toISOString();
  return {
    ...manifest,
    updatedAt: now,
    files: manifest.files.map((f) =>
      f.id === id ? { ...f, ...patch, updatedAt: now } : f,
    ),
  };
}

export function removeEntry(manifest: Manifest, id: string): Manifest {
  const now = new Date().toISOString();
  return {
    ...manifest,
    updatedAt: now,
    files: manifest.files.filter((f) => f.id !== id),
  };
}

export function serializeManifest(manifest: Manifest): string {
  return JSON.stringify(manifest, null, 2) + '\n';
}
