import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import { GitHubClient, PATInvalidError } from '../lib/github';
import { REPO_OWNER, REPO_NAME } from '../config';
import type { RepoInfo } from '../types';

type TestState =
  | { kind: 'idle' }
  | { kind: 'testing' }
  | { kind: 'success'; repo: RepoInfo; username: string }
  | { kind: 'error'; message: string };

export default function SetupRoute() {
  const existingPat = useAuthStore((s) => s.pat);
  const setPat = useAuthStore((s) => s.setPat);
  const setUsername = useAuthStore((s) => s.setUsername);
  const clearPat = useAuthStore((s) => s.clearPat);

  const [input, setInput] = useState('');
  const [test, setTest] = useState<TestState>({ kind: 'idle' });
  const [saved, setSaved] = useState(false);

  const masked = existingPat
    ? `${existingPat.slice(0, 11)}…${existingPat.slice(-4)}`
    : null;

  const runTest = async () => {
    const candidate = input.trim();
    if (!candidate) {
      setTest({ kind: 'error', message: 'PAT を入力してください。' });
      return;
    }
    setTest({ kind: 'testing' });
    try {
      const client = new GitHubClient(candidate, REPO_OWNER, REPO_NAME);
      const [repo, user] = await Promise.all([
        client.testConnection(),
        client.getCurrentUser(),
      ]);
      setTest({ kind: 'success', repo, username: user.login });
    } catch (e) {
      if (e instanceof PATInvalidError) {
        setTest({
          kind: 'error',
          message: 'PAT が無効、または期限切れです。',
        });
      } else if (e instanceof Error) {
        setTest({ kind: 'error', message: e.message });
      } else {
        setTest({ kind: 'error', message: '不明なエラーが発生しました。' });
      }
    }
  };

  const onSave = () => {
    if (test.kind !== 'success') return;
    setPat(input.trim());
    setUsername(test.username);
    setSaved(true);
    setInput('');
  };

  const onDelete = () => {
    if (!confirm('保存された PAT を削除します。よろしいですか？')) return;
    clearPat();
    setTest({ kind: 'idle' });
    setSaved(false);
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <div className="max-w-xl mx-auto px-4 py-12">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold mb-1">PAT 設定</h1>
          <p className="text-sm text-slate-500">
            このリポジトリ ({REPO_OWNER}/{REPO_NAME}) に対する Fine-grained Personal Access Token を保存します。
          </p>
        </header>

        <section className="mb-6 rounded-lg border border-slate-200 bg-white p-4 text-sm leading-relaxed">
          <h2 className="font-semibold mb-2">必要な権限</h2>
          <ul className="list-disc list-inside text-slate-600 space-y-1">
            <li>Repository access: Only select repositories → {REPO_OWNER}/{REPO_NAME}</li>
            <li>Repository permissions → Contents: Read and write</li>
          </ul>
          <a
            href={`https://github.com/settings/personal-access-tokens/new`}
            target="_blank"
            rel="noreferrer"
            className="inline-block mt-3 text-blue-600 hover:underline"
          >
            GitHub の PAT 発行画面を開く →
          </a>
        </section>

        {existingPat && !saved && (
          <section className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-emerald-800">保存済み:</span>{' '}
                <code className="text-emerald-900">{masked}</code>
              </div>
              <button
                type="button"
                onClick={onDelete}
                className="text-xs font-semibold text-rose-700 hover:text-rose-900 underline"
              >
                削除
              </button>
            </div>
          </section>
        )}

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <label className="block mb-2 text-sm font-semibold">
            {existingPat ? 'PAT を更新' : 'PAT 入力'}
          </label>
          <input
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder="github_pat_..."
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setTest({ kind: 'idle' });
              setSaved(false);
            }}
            className="w-full rounded border border-slate-300 px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={runTest}
              disabled={test.kind === 'testing' || !input.trim()}
              className="rounded bg-slate-800 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40 hover:bg-slate-900"
            >
              {test.kind === 'testing' ? 'テスト中…' : '疎通テスト'}
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={test.kind !== 'success'}
              className="rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40 hover:bg-blue-700"
            >
              保存
            </button>
          </div>

          {test.kind === 'success' && (
            <div className="mt-3 rounded bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-900">
              <p>
                <span className="font-semibold">OK:</span> {test.username} として{' '}
                <code>{test.repo.fullName}</code> にアクセス可能
                {test.repo.private && '（Private repo）'}
              </p>
            </div>
          )}

          {test.kind === 'error' && (
            <div className="mt-3 rounded bg-rose-50 border border-rose-200 p-3 text-sm text-rose-900">
              {test.message}
            </div>
          )}

          {saved && (
            <div className="mt-3 rounded bg-blue-50 border border-blue-200 p-3 text-sm text-blue-900">
              <p>
                保存しました。<Link to="/manage" className="underline font-semibold">Manage 画面へ</Link>
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
