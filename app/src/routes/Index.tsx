import { Link } from 'react-router-dom';

export default function IndexRoute() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <header className="flex items-baseline justify-between mb-8">
          <h1 className="text-2xl font-semibold">HTML Vault</h1>
          <Link
            to="/manage"
            className="text-sm text-slate-500 hover:text-slate-800 underline"
          >
            Manage
          </Link>
        </header>
        <p className="text-slate-500">
          まだファイルがありません。Phase 1 ではトップ画面はプレースホルダのみです。
        </p>
      </div>
    </main>
  );
}
