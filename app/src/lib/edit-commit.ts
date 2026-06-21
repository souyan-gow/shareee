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

function isFastForwardError(e: unknown): boolean {
  if (!(e instanceof GitHubAPIError) || e.status !== 422) return false;
  const body = e.body;
  if (typeof body !== 'object' || body === null) return false;
  const msg = (body as { message?: unknown }).message;
  if (typeof msg !== 'string') return false;
  return /fast forward|cannot lock ref|reference does not exist|sha does not match/i.test(
    msg,
  );
}

async function withConflictRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 500,
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (attempt < maxAttempts - 1 && isFastForwardError(e)) {
        await new Promise((r) =>
          setTimeout(r, baseDelayMs * (attempt + 1)),
        );
        continue;
      }
      throw e;
    }
  }
  throw lastErr;
}

export async function commitEntryPatch(
  pat: string,
  id: string,
  patch: EntryPatch,
  message: string,
): Promise<Manifest> {
  const client = new GitHubClient(pat, REPO_OWNER, REPO_NAME);
  return withConflictRetry(async () => {
    const { manifest } = await fetchManifest(client, DEFAULT_BRANCH);
    const next = updateEntry(manifest, id, patch);
    await client.commitFiles({
      branch: DEFAULT_BRANCH,
      message,
      files: [{ path: 'manifest.json', content: serializeManifest(next) }],
    });
    return next;
  });
}

export async function commitDelete(
  pat: string,
  entry: FileEntry,
): Promise<Manifest> {
  const client = new GitHubClient(pat, REPO_OWNER, REPO_NAME);
  return withConflictRetry(async () => {
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
  });
}
