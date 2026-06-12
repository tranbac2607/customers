'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Layout, Menu, Avatar, Dropdown, Space, Typography, Button, Tooltip, Spin } from 'antd';
import {
  DashboardOutlined,
  TeamOutlined,
  LogoutOutlined,
  UserOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  HomeOutlined,
  BulbOutlined,
  BulbFilled,
} from '@ant-design/icons';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { hydrateUser, logout } from '@/features/auth/authSlice';
import { toggleThemeMode } from '@/features/ui/uiSlice';
import { api } from '@/lib/axios';
import { env } from '@/lib/env';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const menuItems = [
  { key: '/', icon: <HomeOutlined />, label: <Link href="/">Home</Link> },
  { key: '/customers', icon: <TeamOutlined />, label: <Link href="/customers">Customers</Link> },
  {
    key: '/dashboard',
    icon: <DashboardOutlined />,
    label: <Link href="/dashboard">Dashboard</Link>,
  },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const authProbed = useRef(false);
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const themeMode = useAppSelector((s) => s.ui.themeMode);

  // Hit /me once per layout mount. The Next.js App Router keeps this
  // layout mounted while the user navigates between its child routes, so
  // a `[]` dep array is exactly what we want — the probe does not re-run
  // for every internal navigation (which previously caused race conditions
  // with the page-level data fetches).
  useEffect(() => {
    if (authProbed.current) return;
    authProbed.current = true;
    let cancelled = false;
    fetch(`${env.NEXT_PUBLIC_API_BASE_URL}/auth/me`, {
      credentials: 'include',
    })
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 401) {
          const next = encodeURIComponent(pathname || '/');
          router.replace(`/login?next=${next}`);
          return;
        }
        if (!res.ok) return;
        const data = await res.json();
        if (data?.success && data.data?.user) {
          dispatch(hydrateUser(data.data.user));
        }
      })
      .catch(() => {
        // Network failure — keep user null; children will be rendered with
        // a loading state. Subsequent API calls will surface errors normally.
      })
      .finally(() => {
        if (!cancelled) setAuthChecked(true);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout', {});
      toast.success('Signed out');
    } catch {
      // Best-effort: even if BE call fails, clear local state.
    } finally {
      dispatch(logout());
      router.replace('/login');
    }
  };

  const userMenu = {
    items: [
      {
        key: 'profile',
        icon: <UserOutlined />,
        label: <Text type="secondary">{user?.email}</Text>,
        disabled: true,
      },
      { type: 'divider' as const },
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: 'Sign out',
        onClick: handleLogout,
      },
    ],
  };

  if (!authChecked) {
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

  // Find the best matching menu key (handles nested paths)
  const selectedKey =
    menuItems
      .map((m) => m.key)
      .filter((k) => k !== '/' && pathname?.startsWith(k))
      .sort((a, b) => b.length - a.length)[0] || (pathname === '/' ? '/' : null);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        trigger={null}
        width={240}
        style={{
          boxShadow: '2px 0 8px rgba(0,0,0,0.05)',
        }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? 0 : '0 20px',
            color: '#fff',
            fontWeight: 700,
            fontSize: 18,
            gap: 10,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #1677ff, #4096ff)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
            }}
          >
            CM
          </div>
          {!collapsed && <span>Customers</span>}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={selectedKey ? [selectedKey] : []}
          items={menuItems}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: 18 }}
          />
          <Space>
            <Tooltip title={themeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
              <Button
                type="text"
                icon={themeMode === 'dark' ? <BulbFilled /> : <BulbOutlined />}
                onClick={() => dispatch(toggleThemeMode())}
                style={{ fontSize: 18 }}
              />
            </Tooltip>
            <Dropdown menu={userMenu} placement="bottomRight" trigger={['click']}>
              <Space style={{ cursor: 'pointer' }}>
                <Avatar style={{ background: '#1677ff' }}>
                  {user?.name?.[0]?.toUpperCase() ?? 'A'}
                </Avatar>
                <Text strong>{user?.name ?? 'User'}</Text>
              </Space>
            </Dropdown>
          </Space>
        </Header>
        <Content style={{ padding: 24, background: '#f5f7fa' }}>{children}</Content>
      </Layout>
    </Layout>
  );
}
