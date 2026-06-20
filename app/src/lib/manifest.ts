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

export function serializeManifest(manifest: Manifest): string {
  return JSON.stringify(manifest, null, 2) + '\n';
}
