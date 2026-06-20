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

  private async request<T>(
    path: string,
    init?: RequestInit,
  ): Promise<T> {
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

    return (await res.json()) as T;
  }
}
