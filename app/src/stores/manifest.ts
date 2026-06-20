import { create } from 'zustand';
import type { FileEntry, Manifest } from '../types';
import { DEFAULT_BRANCH, REPO_NAME, REPO_OWNER } from '../config';

const RAW_MANIFEST_URL = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${DEFAULT_BRANCH}/manifest.json`;

type ManifestState = {
  manifest: Manifest | null;
  isLoading: boolean;
  error: Error | null;
  fetch: () => Promise<void>;
  addFile: (entry: FileEntry) => void;
  updateFile: (id: string, patch: Partial<FileEntry>) => void;
  removeFile: (id: string) => void;
};

export const useManifestStore = create<ManifestState>((set, get) => ({
  manifest: null,
  isLoading: false,
  error: null,

  fetch: async () => {
    if (get().isLoading) return;
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${RAW_MANIFEST_URL}?t=${Date.now()}`, {
        cache: 'no-store',
      });
      if (!res.ok) {
        throw new Error(`manifest fetch failed: ${res.status}`);
      }
      const manifest = (await res.json()) as Manifest;
      set({ manifest, isLoading: false });
    } catch (e) {
      set({
        error: e instanceof Error ? e : new Error(String(e)),
        isLoading: false,
      });
    }
  },

  addFile: (entry) => {
    const cur = get().manifest;
    if (!cur) {
      set({
        manifest: {
          version: 1,
          updatedAt: new Date().toISOString(),
          files: [entry],
        },
      });
      return;
    }
    set({
      manifest: {
        ...cur,
        updatedAt: new Date().toISOString(),
        files: [...cur.files, entry],
      },
    });
  },

  updateFile: (id, patch) => {
    const cur = get().manifest;
    if (!cur) return;
    set({
      manifest: {
        ...cur,
        updatedAt: new Date().toISOString(),
        files: cur.files.map((f) =>
          f.id === id ? { ...f, ...patch, updatedAt: new Date().toISOString() } : f,
        ),
      },
    });
  },

  removeFile: (id) => {
    const cur = get().manifest;
    if (!cur) return;
    set({
      manifest: {
        ...cur,
        updatedAt: new Date().toISOString(),
        files: cur.files.filter((f) => f.id !== id),
      },
    });
  },
}));
