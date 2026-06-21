import { create } from 'zustand';

export type SortKey = 'updatedAt' | 'uploadedAt' | 'displayName' | 'size';
export type SortOrder = 'asc' | 'desc';

type UIState = {
  searchQuery: string;
  selectedFolder: string | null;
  selectedTags: string[];
  sortBy: SortKey;
  sortOrder: SortOrder;

  setSearchQuery: (q: string) => void;
  setSelectedFolder: (folder: string | null) => void;
  toggleTag: (tag: string) => void;
  setTags: (tags: string[]) => void;
  clearTags: () => void;
  setSort: (key: SortKey, order: SortOrder) => void;
  resetFilters: () => void;
};

export const useUIStore = create<UIState>((set) => ({
  searchQuery: '',
  selectedFolder: null,
  selectedTags: [],
  sortBy: 'updatedAt',
  sortOrder: 'desc',

  setSearchQuery: (q) => set({ searchQuery: q }),
  setSelectedFolder: (folder) => set({ selectedFolder: folder }),
  toggleTag: (tag) =>
    set((s) =>
      s.selectedTags.includes(tag)
        ? { selectedTags: s.selectedTags.filter((t) => t !== tag) }
        : { selectedTags: [...s.selectedTags, tag] },
    ),
  setTags: (tags) => set({ selectedTags: tags }),
  clearTags: () => set({ selectedTags: [] }),
  setSort: (key, order) => set({ sortBy: key, sortOrder: order }),
  resetFilters: () =>
    set({
      searchQuery: '',
      selectedFolder: null,
      selectedTags: [],
    }),
}));
