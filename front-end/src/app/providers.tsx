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
import { logout } from '@/features/auth/authSlice';

/**
 * Wires up axios's onUnauthorized side-effect (called when any
 * authenticated request gets a 401 even after a refresh attempt).
 * Public pages do NOT call /me here — only the dashboard layout does.
 */
function AuthBridge({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const router = useRouter();

  useEffect(() => {
    bindAxiosAuth({
      onUnauthorized: () => {
        dispatch(logout());
        router.replace('/login');
      },
    });
  }, [dispatch, router]);

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
          <AuthBridge>{children}</AuthBridge>
        </ThemedShell>
      </AntdRegistry>
    </Provider>
  );
}

export type { ThemeMode };
