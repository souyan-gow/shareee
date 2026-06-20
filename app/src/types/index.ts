export type FileKind = 'single' | 'zip';

export type FileEntry = {
  id: string;
  displayName: string;
  folder: string;
  tags: string[];
  entryPath: string;
  kind: FileKind;
  uploadedAt: string;
  updatedAt: string;
  size: number;
  uploader: string;
  thumbnail: string | null;
};

export type Manifest = {
  version: number;
  updatedAt: string;
  files: FileEntry[];
};

export type RepoInfo = {
  fullName: string;
  defaultBranch: string;
  private: boolean;
};

export type CurrentUser = {
  login: string;
};
