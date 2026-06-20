import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';

export default function ManageRoute() {
  const username = useAuthStore((s) => s.username);
  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <header className="flex items-baseline justify-between mb-8">
          <h1 className="text-2xl font-semibold">Manage</h1>
          <Link
            to="/manage/setup"
            className="text-sm text-slate-500 hover:text-slate-800 underline"
          >
            PAT 設定
          </Link>
        </header>
        <p className="text-slate-500">
          {username
            ? `${username} としてログイン中`
            : 'PAT 設定済み。Phase 2 でアップロード UI を追加します。'}
        </p>
      </div>
    </main>
  );
}
