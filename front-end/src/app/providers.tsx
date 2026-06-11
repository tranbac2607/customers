'use client';

import { ReactNode, useEffect, useRef } from 'react';
import { Provider } from 'react-redux';
import { ConfigProvider, App as AntdApp, Spin } from 'antd';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { makeStore } from '@/store';
import { getTheme, type ThemeMode } from '@/lib/theme';
import { bindAxiosAuth } from '@/lib/axios';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { hydrateUser, logout } from '@/features/auth/authSlice';
import { api } from '@/lib/axios';

function AuthBootstrap({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const user = useAppSelector((s) => s.auth.user);
  const bootstrapped = useRef(false);

  // On mount, fetch /me to populate user (cookies are sent automatically).
  // This runs once per app load.
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    api
      .get('/auth/me')
      .then((res) => {
        if (res.data?.success && res.data.data?.user) {
          dispatch(hydrateUser(res.data.data.user));
        }
      })
      .catch(() => {
        // No valid cookie — user remains null
      });
  }, [dispatch]);

  useEffect(() => {
    bindAxiosAuth({
      onUnauthorized: () => {
        dispatch(logout());
        router.replace('/login');
      },
    });
  }, [dispatch, router]);

  if (!user) {
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
