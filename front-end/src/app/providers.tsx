'use client';

import { ReactNode, useEffect, useRef } from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { ConfigProvider, App as AntdApp, Spin, theme as antdTheme } from 'antd';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { makeStore, persistor } from '@/store';
import { getTheme, type ThemeMode } from '@/lib/theme';
import { bindAxiosAuth } from '@/lib/axios';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logout, refreshSuccess } from '@/features/auth/authSlice';
import { useAppSelector as useUI } from '@/store/hooks';

function AuthBridge({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const accessToken = useAppSelector((s) => s.auth.accessToken);

  useEffect(() => {
    bindAxiosAuth({
      getAccessToken: () => accessToken,
      onUnauthorized: () => {
        dispatch(logout());
        router.replace('/login');
      },
      onTokenRefreshed: (newAccess, newRefresh) => {
        dispatch(refreshSuccess({ accessToken: newAccess, refreshToken: newRefresh }));
      },
    });
  }, [accessToken, dispatch, router]);

  return <>{children}</>;
}

function ThemedShell({ children }: { children: ReactNode }) {
  const mode = useUI((s) => s.ui.themeMode);
  const theme = getTheme(mode);
  // Sync html data attribute for any non-Antd styles
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
      <PersistGate
        loading={
          <div style={{ padding: 24 }}>
            <Spin />
          </div>
        }
        persistor={persistor.persistor}
      >
        <AntdRegistry>
          <ThemedShell>
            <AuthBridge>{children}</AuthBridge>
          </ThemedShell>
        </AntdRegistry>
      </PersistGate>
    </Provider>
  );
}

// Re-export ThemeMode for convenience
export type { ThemeMode };
// Reference antdTheme to keep the import for potential future use
void antdTheme;
