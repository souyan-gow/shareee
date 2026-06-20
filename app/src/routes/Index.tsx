import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useManifestStore } from '../stores/manifest';
import FileCard from '../components/FileCard';

export default function IndexRoute() {
  const manifest = useManifestStore((s) => s.manifest);
  const isLoading = useManifestStore((s) => s.isLoading);
  const error = useManifestStore((s) => s.error);
  const fetchManifest = useManifestStore((s) => s.fetch);

  useEffect(() => {
    if (!manifest && !isLoading) {
      void fetchManifest();
    }
  }, [manifest, isLoading, fetchManifest]);

  const sortedFiles = manifest
    ? [...manifest.files].sort((a, b) =>
        b.updatedAt.localeCompare(a.updatedAt),
      )
    : [];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
        <header className="mb-6 flex items-baseline justify-between md:mb-8">
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

        {isLoading && !manifest && (
          <p className="text-sm text-slate-500">読み込み中…</p>
        )}

        {manifest && sortedFiles.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
            まだファイルがありません。
            <Link to="/manage" className="ml-1 underline">
              Manage 画面
            </Link>
            からアップロードできます。
          </div>
        )}

        {sortedFiles.length > 0 && (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sortedFiles.map((entry) => (
              <li key={entry.id}>
                <FileCard entry={entry} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
