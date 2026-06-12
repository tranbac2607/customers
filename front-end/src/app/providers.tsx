'use client';

import { ReactNode, useEffect, useRef, useSyncExternalStore } from 'react';
import { Provider } from 'react-redux';
import { ConfigProvider, App as AntdApp, Spin } from 'antd';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { makeStore } from '@/store';
import { getTheme, type ThemeMode } from '@/lib/theme';
import { bindAxiosAuth } from '@/lib/axios';
import { loadingStore } from '@/lib/loadingStore';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logout } from '@/store/auth/authSlice';

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

function GlobalLoadingOverlay() {
  // Subscribe to the in-flight API counter. Re-renders when the value changes.
  const pending = useSyncExternalStore(loadingStore.subscribe, loadingStore.getSnapshot, () => 0);
  if (pending <= 0) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.35)',
        backdropFilter: 'blur(2px)',
        WebkitBackdropFilter: 'blur(2px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        pointerEvents: 'none', // let clicks pass through; loading is informational
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: '20px 28px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <Spin size="large" />
        <span style={{ fontSize: 14, color: '#1f2937' }}>Loading…</span>
      </div>
    </div>
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
          <AuthBridge>
            {children}
            <GlobalLoadingOverlay />
          </AuthBridge>
        </ThemedShell>
      </AntdRegistry>
    </Provider>
  );
}

export type { ThemeMode };
