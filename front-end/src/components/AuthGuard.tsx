'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAppSelector } from '@/store/hooks';
import { Spin } from 'antd';

/**
 * Protects a route by checking Redux auth state.
 * Redirects to /login if not authenticated, preserving the original path as `next` query.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const accessToken = useAppSelector((s) => s.auth.accessToken);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      const next = encodeURIComponent(pathname || '/');
      router.replace(`/login?next=${next}`);
    }
  }, [isAuthenticated, accessToken, router, pathname]);

  if (!isAuthenticated || !accessToken) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f5f7fa',
        }}
      >
        <Spin size="large" tip="Checking session…" />
      </div>
    );
  }

  return <>{children}</>;
}
