import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useManifestStore } from '../stores/manifest';
import { useUIStore, type SortKey } from '../stores/ui';
import FileCard from '../components/FileCard';
import SearchBox from '../components/SearchBox';
import SortSelector from '../components/SortSelector';
import TagCloud from '../components/TagCloud';
import FolderTree from '../components/FolderTree';
import Breadcrumb from '../components/Breadcrumb';
import { applyFilters, sortEntries } from '../lib/filter';

const VALID_SORT_KEYS: SortKey[] = [
  'updatedAt',
  'uploadedAt',
  'displayName',
  'size',
];

export default function IndexRoute() {
  const manifest = useManifestStore((s) => s.manifest);
  const isLoading = useManifestStore((s) => s.isLoading);
  const error = useManifestStore((s) => s.error);
  const fetchManifest = useManifestStore((s) => s.fetch);

  const searchQuery = useUIStore((s) => s.searchQuery);
  const selectedFolder = useUIStore((s) => s.selectedFolder);
  const selectedTags = useUIStore((s) => s.selectedTags);
  const sortBy = useUIStore((s) => s.sortBy);
  const sortOrder = useUIStore((s) => s.sortOrder);
  const setSearchQuery = useUIStore((s) => s.setSearchQuery);
  const setSelectedFolder = useUIStore((s) => s.setSelectedFolder);
  const toggleTag = useUIStore((s) => s.toggleTag);
  const setTags = useUIStore((s) => s.setTags);
  const clearTags = useUIStore((s) => s.clearTags);
  const setSort = useUIStore((s) => s.setSort);

  const [searchParams, setSearchParams] = useSearchParams();
  const hydrated = useRef(false);

  // 初回マウント時: URL → store
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    setSearchQuery(searchParams.get('q') ?? '');
    setSelectedFolder(
      searchParams.has('folder') ? searchParams.get('folder')! : null,
    );
    setTags(searchParams.getAll('tag'));
    const sort = searchParams.get('sort');
    const order = searchParams.get('order');
    setSort(
      VALID_SORT_KEYS.includes(sort as SortKey) ? (sort as SortKey) : 'updatedAt',
      order === 'asc' ? 'asc' : 'desc',
    );
  }, [searchParams, setSearchQuery, setSelectedFolder, setTags, setSort]);

  // store → URL (hydrate 後のみ)
  useEffect(() => {
    if (!hydrated.current) return;
    const next = new URLSearchParams();
    if (searchQuery) next.set('q', searchQuery);
    if (selectedFolder !== null) next.set('folder', selectedFolder);
    for (const t of selectedTags) next.append('tag', t);
    if (sortBy !== 'updatedAt') next.set('sort', sortBy);
    if (sortOrder !== 'desc') next.set('order', sortOrder);
    setSearchParams(next, { replace: true });
  }, [
    searchQuery,
    selectedFolder,
    selectedTags,
    sortBy,
    sortOrder,
    setSearchParams,
  ]);

  useEffect(() => {
    if (!manifest && !isLoading) {
      void fetchManifest();
    }
  }, [manifest, isLoading, fetchManifest]);

  const allEntries = manifest?.files ?? [];

  const filtered = useMemo(
    () =>
      applyFilters(allEntries, {
        query: searchQuery,
        folder: selectedFolder,
        tags: selectedTags,
      }),
    [allEntries, searchQuery, selectedFolder, selectedTags],
  );

  const sorted = useMemo(
    () => sortEntries(filtered, sortBy, sortOrder),
    [filtered, sortBy, sortOrder],
  );

  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = () => setDrawerOpen(false);
  const onFolderSelect = (folder: string | null) => {
    setSelectedFolder(folder);
    closeDrawer();
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <div className="mx-auto max-w-7xl px-4 py-6 md:py-10">
        <header className="mb-5 flex items-baseline justify-between">
          <h1 className="text-2xl font-semibold md:text-3xl">HTML Vault</h1>
          <Link
            to="/manage"
            className="text-sm text-slate-500 underline hover:text-slate-800"
          >
            Manage
          </Link>
        </header>

        {error && (
          <div className="mb-4 rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
            読み込みエラー: {error.message}
            <button
              type="button"
              onClick={() => void fetchManifest()}
              className="ml-2 underline"
            >
              再試行
            </button>
          </div>
        )}

        <div className="md:flex md:gap-6">
          <aside className="hidden md:block md:w-56 md:shrink-0">
            <div className="sticky top-6 rounded-lg border border-slate-200 bg-white p-3">
              <FolderTree
                entries={allEntries}
                selectedFolder={selectedFolder}
                onSelect={setSelectedFolder}
              />
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            <div className="mb-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                aria-label="フォルダ"
                className="rounded border border-slate-300 bg-white px-2 py-1 text-sm md:hidden"
              >
                ☰
              </button>
              <div className="flex-1">
                <SearchBox value={searchQuery} onChange={setSearchQuery} />
              </div>
            </div>

            <div className="mb-3">
              <TagCloud
                entries={allEntries}
                selectedTags={selectedTags}
                onToggleTag={toggleTag}
                onClear={clearTags}
              />
            </div>

            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <Breadcrumb
                folder={selectedFolder}
                onSelect={setSelectedFolder}
              />
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500">
                  {sorted.length} 件
                </span>
                <SortSelector
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  onChange={setSort}
                />
              </div>
            </div>

            {isLoading && !manifest && (
              <p className="text-sm text-slate-500">読み込み中…</p>
            )}

            {manifest && sorted.length === 0 && (
              <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
                {allEntries.length === 0 ? (
                  <>
                    まだファイルがありません。
                    <Link to="/manage" className="ml-1 underline">
                      Manage 画面
                    </Link>
                    からアップロードできます。
                  </>
                ) : (
                  <>
                    条件に合うファイルがありません。
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedFolder(null);
                        clearTags();
                      }}
                      className="ml-1 underline"
                    >
                      条件をクリア
                    </button>
                  </>
                )}
              </div>
            )}

            {sorted.length > 0 && (
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {sorted.map((entry) => (
                  <li key={entry.id}>
                    <FileCard entry={entry} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {drawerOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 md:hidden"
          onClick={closeDrawer}
        >
          <aside
            className="absolute left-0 top-0 h-full w-72 overflow-y-auto bg-white p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700">フォルダ</h2>
              <button
                type="button"
                onClick={closeDrawer}
                aria-label="閉じる"
                className="rounded px-2 text-slate-500 hover:bg-slate-100"
              >
                ×
              </button>
            </div>
            <FolderTree
              entries={allEntries}
              selectedFolder={selectedFolder}
              onSelect={onFolderSelect}
            />
          </aside>
        </div>
      )}
    </main>
  );
}
