import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuthStore } from '../stores/auth';

export default function RequirePAT({ children }: { children: ReactNode }) {
  const pat = useAuthStore((s) => s.pat);
  if (!pat) {
    return <Navigate to="/manage/setup" replace />;
  }
  return <>{children}</>;
}
