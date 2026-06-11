'use client';

import { ReactNode, useEffect, useRef } from 'react';
import { Provider } from 'react-redux';
import { ConfigProvider, App as AntdApp } from 'antd';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { makeStore } from '@/store';
import { getTheme, type ThemeMode } from '@/lib/theme';
import { bindAxiosAuth } from '@/lib/axios';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { hydrateUser, logout } from '@/features/auth/authSlice';
import { env } from '@/lib/env';

function AuthBootstrap({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const bootstrapped = useRef(false);

  // On mount, fetch /me to populate user (cookies are sent automatically).
  // Uses raw fetch() instead of the axios instance so the 401 response from
  // an unauthenticated visitor does not trigger the auto-refresh / redirect
  // side effects in the axios interceptor.
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    let cancelled = false;
    fetch(`${env.NEXT_PUBLIC_API_BASE_URL}/auth/me`, {
      credentials: 'include',
    })
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) return; // 401 or other — leave user as null
        const data = await res.json();
        if (data?.success && data.data?.user) {
          dispatch(hydrateUser(data.data.user));
        }
      })
      .catch(() => {
        // Network error — ignore; user stays null
      });

    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  useEffect(() => {
    bindAxiosAuth({
      onUnauthorized: () => {
        dispatch(logout());
        router.replace('/login');
      },
    });
  }, [dispatch, router]);

  // Never block rendering on auth state. proxy.ts handles redirects for
  // protected routes; this component only enriches the UI with user info
  // when a valid cookie is present.
  return <>{children}</>;
}

function ThemedShell({ children }: { children: ReactNode }) {
  const mode = useAppSelector((s) => s.ui.themeMode);
  const theme = getTheme(mode);
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = mode;
    }
  }, [mode]);
  return (
    <ConfigProvider theme={theme}>
      <AntdApp>
        {children}
        <ToastContainer
          position="top-right"
          autoClose={3000}
          theme={mode}
          hideProgressBar={false}
          newestOnTop
        />
      </AntdApp>
    </ConfigProvider>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  const storeRef = useRef<ReturnType<typeof makeStore> | null>(null);

  if (!storeRef.current) {
    storeRef.current = makeStore();
  }

  return (
    <Provider store={storeRef.current}>
      <AntdRegistry>
        <ThemedShell>
          <AuthBootstrap>{children}</AuthBootstrap>
        </ThemedShell>
      </AntdRegistry>
    </Provider>
  );
}

export type { ThemeMode };
