import type { ReactNode } from 'react';

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  disableClose?: boolean;
};

export default function ModalShell({
  open,
  title,
  onClose,
  children,
  footer,
  disableClose,
}: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={disableClose}
            aria-label="閉じる"
            className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
          >
            ×
          </button>
        </header>
        <div className="px-5 py-4 text-sm text-slate-700">{children}</div>
        {footer && (
          <footer className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
