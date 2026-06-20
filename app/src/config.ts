export const REPO_OWNER: string =
  import.meta.env.VITE_REPO_OWNER ?? 'souyan-gow';
export const REPO_NAME: string =
  import.meta.env.VITE_REPO_NAME ?? 'shareee';
export const BASE_URL: string =
  import.meta.env.VITE_BASE_URL ?? '/shareee/';

export const PAT_STORAGE_KEY = 'htmlvault.pat';

export const DEFAULT_BRANCH = 'main';

export const PAGES_SITE_URL = `https://${REPO_OWNER}.github.io/${REPO_NAME}`;

