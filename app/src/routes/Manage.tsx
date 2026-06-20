import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import { GitHubClient, PATInvalidError } from '../lib/github';
import { REPO_NAME, REPO_OWNER } from '../config';
import UploadModal from '../components/UploadModal';

export default function ManageRoute() {
  const pat = useAuthStore((s) => s.pat);
  const username = useAuthStore((s) => s.username);
  const setUsername = useAuthStore((s) => s.setUsername);
  const clearPat = useAuthStore((s) => s.clearPat);

  const [uploadOpen, setUploadOpen] = useState(false);

  useEffect(() => {
    if (!pat || username) return;
    let cancelled = false;
    (async () => {
      try {
        const client = new GitHubClient(pat, REPO_OWNER, REPO_NAME);
        const user = await client.getCurrentUser();
        if (!cancelled) setUsername(user.login);
      } catch (e) {
        if (e instanceof PATInvalidError) {
          clearPat();
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pat, username, setUsername, clearPat]);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <header className="flex items-baseline justify-between mb-8">
          <h1 className="text-2xl font-semibold">Manage</h1>
          <div className="flex items-center gap-3 text-sm text-slate-500">
            {username && <span>{username}</span>}
            <Link
              to="/manage/setup"
              className="hover:text-slate-800 underline"
            >
              PAT 設定
            </Link>
          </div>
        </header>

        <div className="mb-6">
          <button
            type="button"
            onClick={() => setUploadOpen(true)}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            + 新規アップロード
          </button>
        </div>

        <section className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
          <p>
            Phase 2 ではアップロード機能のみ実装しています。
            一覧表示は Phase 3 で追加予定です。
          </p>
          <p className="mt-2">
            アップロード後、閲覧 URL からファイルを確認できます。
          </p>
        </section>

        <UploadModal
          open={uploadOpen}
          onClose={() => setUploadOpen(false)}
          uploader={username}
        />
      </div>
    </main>
  );
}
