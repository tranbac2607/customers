'use client';

import { ReactNode, useEffect, useRef } from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { ConfigProvider, App as AntdApp, Spin } from 'antd';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { makeStore, persistor } from '@/store';
import { antdTheme } from '@/lib/theme';
import { bindAxiosAuth } from '@/lib/axios';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logout, refreshSuccess } from '@/features/auth/authSlice';

function AuthBridge({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const accessToken = useAppSelector((s) => s.auth.accessToken);
  const refreshToken = useAppSelector((s) => s.auth.refreshToken);

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
  }, [accessToken, dispatch, router, refreshToken]);

  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }) {
  const storeRef = useRef<ReturnType<typeof makeStore> | null>(null);

  if (!storeRef.current) {
    storeRef.current = makeStore();
  }

  return (
    <Provider store={storeRef.current}>
      <PersistGate
        loading={<div style={{ padding: 24 }}><Spin /></div>}
        persistor={persistor.persistor}
      >
        <AntdRegistry>
          <ConfigProvider theme={antdTheme}>
            <AntdApp>
              <AuthBridge>{children}</AuthBridge>
              <ToastContainer
                position="top-right"
                autoClose={3000}
                theme="light"
                hideProgressBar={false}
                newestOnTop
              />
            </AntdApp>
          </ConfigProvider>
        </AntdRegistry>
      </PersistGate>
    </Provider>
  );
}
