import { DEFAULT_BRANCH, REPO_NAME, REPO_OWNER } from '../config';
import type { Manifest, FileEntry } from '../types';
import { GitHubAPIError, GitHubClient, PATInvalidError } from './github';
import {
  fetchManifest,
  removeEntry,
  serializeManifest,
  updateEntry,
  type EntryPatch,
} from './manifest';

export type EditCommitError = {
  kind: 'pat-invalid' | 'api' | 'other';
  message: string;
};

export function describeError(e: unknown): EditCommitError {
  if (e instanceof PATInvalidError) {
    return {
      kind: 'pat-invalid',
      message: 'PAT が無効になりました。設定画面で再保存してください。',
    };
  }
  if (e instanceof GitHubAPIError) {
    return {
      kind: 'api',
      message: `${e.message}${e.body ? `\n${JSON.stringify(e.body)}` : ''}`,
    };
  }
  if (e instanceof Error) return { kind: 'other', message: e.message };
  return { kind: 'other', message: '不明なエラーが発生しました' };
}

export async function commitEntryPatch(
  pat: string,
  id: string,
  patch: EntryPatch,
  message: string,
): Promise<Manifest> {
  const client = new GitHubClient(pat, REPO_OWNER, REPO_NAME);
  const { manifest } = await fetchManifest(client, DEFAULT_BRANCH);
  const next = updateEntry(manifest, id, patch);
  await client.commitFiles({
    branch: DEFAULT_BRANCH,
    message,
    files: [{ path: 'manifest.json', content: serializeManifest(next) }],
  });
  return next;
}

export async function commitDelete(
  pat: string,
  entry: FileEntry,
): Promise<Manifest> {
  const client = new GitHubClient(pat, REPO_OWNER, REPO_NAME);
  const [{ manifest }, existing] = await Promise.all([
    fetchManifest(client, DEFAULT_BRANCH),
    client.listFilesByPrefix(
      [`files/${entry.id}/`, `thumbnails/${entry.id}.`],
      DEFAULT_BRANCH,
    ),
  ]);
  const next = removeEntry(manifest, entry.id);
  await client.commitFiles({
    branch: DEFAULT_BRANCH,
    message: `chore: delete ${entry.displayName} (${entry.id})`,
    files: [{ path: 'manifest.json', content: serializeManifest(next) }],
    deletions: existing,
  });
  return next;
}
