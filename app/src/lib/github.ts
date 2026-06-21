import type { CurrentUser, RepoInfo } from '../types';

const API_BASE = 'https://api.github.com';

export class GitHubAPIError extends Error {
  readonly status: number;
  readonly body?: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = 'GitHubAPIError';
    this.status = status;
    this.body = body;
  }
}

export class PATInvalidError extends GitHubAPIError {
  constructor(body?: unknown) {
    super('PAT is invalid or expired', 401, body);
    this.name = 'PATInvalidError';
  }
}

export type CommitFileInput = {
  path: string;
  content: ArrayBuffer | string;
};

export type CommitParams = {
  branch: string;
  message: string;
  files: CommitFileInput[];
  deletions?: string[];
};

export type PagesBuildStatus = {
  status: 'building' | 'built' | 'errored' | string;
  commit: string;
  error: { message: string | null } | null;
  created_at?: string;
  updated_at?: string;
};

function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToUtf8(b64: string): string {
  const binary = atob(b64.replace(/\s/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder('utf-8').decode(bytes);
}

export class GitHubClient {
  private readonly pat: string;
  private readonly owner: string;
  private readonly repo: string;

  constructor(pat: string, owner: string, repo: string) {
    this.pat = pat;
    this.owner = owner;
    this.repo = repo;
  }

  async testConnection(): Promise<RepoInfo> {
    const data = await this.request<{
      full_name: string;
      default_branch: string;
      private: boolean;
    }>(`/repos/${this.owner}/${this.repo}`);
    return {
      fullName: data.full_name,
      defaultBranch: data.default_branch,
      private: data.private,
    };
  }

  async getCurrentUser(): Promise<CurrentUser> {
    const data = await this.request<{ login: string }>('/user');
    return { login: data.login };
  }

  async getFile(
    path: string,
    ref: string,
  ): Promise<{ content: string; sha: string }> {
    const data = await this.request<{
      content: string;
      sha: string;
      encoding: string;
    }>(
      `/repos/${this.owner}/${this.repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(ref)}`,
    );
    if (data.encoding !== 'base64') {
      throw new GitHubAPIError(
        `Unexpected content encoding: ${data.encoding}`,
        200,
      );
    }
    return { content: base64ToUtf8(data.content), sha: data.sha };
  }

  async getPagesBuildStatus(): Promise<PagesBuildStatus> {
    return await this.request<PagesBuildStatus>(
      `/repos/${this.owner}/${this.repo}/pages/builds/latest`,
    );
  }

  async listFilesByPrefix(
    prefix: string | string[],
    branch: string,
  ): Promise<string[]> {
    const prefixes = Array.isArray(prefix) ? prefix : [prefix];
    const ref = await this.request<{ object: { sha: string } }>(
      `/repos/${this.owner}/${this.repo}/git/ref/heads/${encodeURIComponent(branch)}`,
    );
    const commit = await this.request<{ tree: { sha: string } }>(
      `/repos/${this.owner}/${this.repo}/git/commits/${ref.object.sha}`,
    );
    const tree = await this.request<{
      tree: Array<{ path: string; type: string }>;
      truncated: boolean;
    }>(
      `/repos/${this.owner}/${this.repo}/git/trees/${commit.tree.sha}?recursive=1`,
    );
    if (tree.truncated) {
      throw new GitHubAPIError(
        'リポジトリの tree が大きすぎて Git Data API で列挙できません',
        200,
      );
    }
    return tree.tree
      .filter(
        (e) =>
          e.type === 'blob' && prefixes.some((p) => e.path.startsWith(p)),
      )
      .map((e) => e.path);
  }

  async commitFiles(params: CommitParams): Promise<{ sha: string }> {
    const { branch, message, files, deletions } = params;

    const ref = await this.request<{ object: { sha: string } }>(
      `/repos/${this.owner}/${this.repo}/git/ref/heads/${encodeURIComponent(branch)}`,
    );
    const parentCommitSha = ref.object.sha;

    const parentCommit = await this.request<{ tree: { sha: string } }>(
      `/repos/${this.owner}/${this.repo}/git/commits/${parentCommitSha}`,
    );
    const baseTreeSha = parentCommit.tree.sha;

    const blobs = await Promise.all(
      files.map(async (f) => {
        const base64 =
          typeof f.content === 'string'
            ? utf8ToBase64(f.content)
            : arrayBufferToBase64(f.content);
        const blob = await this.request<{ sha: string }>(
          `/repos/${this.owner}/${this.repo}/git/blobs`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: base64, encoding: 'base64' }),
          },
        );
        return { path: f.path, sha: blob.sha };
      }),
    );

    type TreeEntry = {
      path: string;
      mode: '100644';
      type: 'blob';
      sha: string | null;
    };

    const treeEntries: TreeEntry[] = [
      ...blobs.map<TreeEntry>((b) => ({
        path: b.path,
        mode: '100644',
        type: 'blob',
        sha: b.sha,
      })),
      ...(deletions ?? []).map<TreeEntry>((path) => ({
        path,
        mode: '100644',
        type: 'blob',
        sha: null,
      })),
    ];

    const tree = await this.request<{ sha: string }>(
      `/repos/${this.owner}/${this.repo}/git/trees`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base_tree: baseTreeSha, tree: treeEntries }),
      },
    );

    const newCommit = await this.request<{ sha: string }>(
      `/repos/${this.owner}/${this.repo}/git/commits`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          tree: tree.sha,
          parents: [parentCommitSha],
        }),
      },
    );

    await this.request(
      `/repos/${this.owner}/${this.repo}/git/refs/heads/${encodeURIComponent(branch)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sha: newCommit.sha }),
      },
    );

    return { sha: newCommit.sha };
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${this.pat}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(init?.headers ?? {}),
      },
    });

    if (res.status === 401) {
      let body: unknown;
      try {
        body = await res.json();
      } catch {
        body = undefined;
      }
      throw new PATInvalidError(body);
    }

    if (!res.ok) {
      let body: unknown;
      try {
        body = await res.json();
      } catch {
        body = await res.text().catch(() => undefined);
      }
      throw new GitHubAPIError(
        `GitHub API ${res.status} ${res.statusText} (${path})`,
        res.status,
        body,
      );
    }

    if (res.status === 204) {
      return undefined as T;
    }

    return (await res.json()) as T;
  }
}
