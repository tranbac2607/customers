'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Layout,
  Menu,
  Avatar,
  Dropdown,
  Space,
  Typography,
  Button,
  Spin,
  Drawer,
  Grid,
} from 'antd';
import {
  DashboardOutlined,
  TeamOutlined,
  LogoutOutlined,
  UserOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  CloseOutlined,
  HomeOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { hydrateUser, logout } from '@/store/auth/authSlice';
import { api } from '@/lib/axios';
import { env } from '@/lib/env';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;
const { useBreakpoint } = Grid;

const menuItems = [
  { key: '/', icon: <HomeOutlined />, label: <Link href="/">Home</Link> },
  { key: '/customers', icon: <TeamOutlined />, label: <Link href="/customers">Customers</Link> },
  {
    key: '/dashboard',
    icon: <DashboardOutlined />,
    label: <Link href="/dashboard">Dashboard</Link>,
  },
];

function SiderContent({
  collapsed,
  pathname,
  onNavigate,
}: {
  collapsed: boolean;
  pathname: string | null;
  onNavigate?: () => void;
}) {
  const selectedKey =
    menuItems
      .map((m) => m.key)
      .filter((k) => k !== '/' && pathname?.startsWith(k))
      .sort((a, b) => b.length - a.length)[0] || (pathname === '/' ? '/' : null);

  return (
    <>
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
            flexShrink: 0,
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
        onClick={onNavigate}
      />
    </>
  );
}

export function DashboardLayoutContent({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const userProbed = useRef(false);
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);

  useEffect(() => {
    if (isMobile) setCollapsed(true);
  }, [isMobile]);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (userProbed.current) return;
    userProbed.current = true;
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
        // Network failure — keep user as null; the chip falls back to
        // the placeholder. Page-level data fetches will surface their own
        // errors via the axios interceptor.
      });
    return () => {
      cancelled = true;
    };
  }, [pathname, dispatch, router]);

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

  const headerPadding = isMobile ? '0 12px' : '0 24px';
  const contentPadding = isMobile ? 12 : 24;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {isMobile ? (
        <Drawer
          placement="left"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          width={260}
          styles={{ body: { padding: 0, background: '#001529' } }}
          closable={false}
        >
          <div style={{ position: 'relative' }}>
            <Button
              type="text"
              icon={<CloseOutlined />}
              onClick={() => setDrawerOpen(false)}
              style={{ position: 'absolute', top: 12, right: 8, color: '#fff', zIndex: 1 }}
            />
            <SiderContent
              collapsed={false}
              pathname={pathname}
              onNavigate={() => setDrawerOpen(false)}
            />
          </div>
        </Drawer>
      ) : (
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
          <SiderContent collapsed={collapsed} pathname={pathname} />
        </Sider>
      )}
      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: headerPadding,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            gap: 8,
          }}
        >
          <Button
            type="text"
            icon={
              isMobile ? (
                <MenuUnfoldOutlined />
              ) : collapsed ? (
                <MenuUnfoldOutlined />
              ) : (
                <MenuFoldOutlined />
              )
            }
            onClick={() => (isMobile ? setDrawerOpen(true) : setCollapsed(!collapsed))}
            style={{ fontSize: 18 }}
          />
          <Space size={isMobile ? 'small' : 'middle'}>
            <Dropdown menu={userMenu} placement="bottomRight" trigger={['click']}>
              <Space style={{ cursor: 'pointer' }}>
                <Avatar style={{ background: user ? '#1677ff' : '#d9d9d9' }}>
                  {user ? user.name[0]?.toUpperCase() : <UserOutlined />}
                </Avatar>
                {!isMobile && (
                  <Text
                    strong
                    style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}
                  >
                    {user?.name ?? <Spin size="small" />}
                  </Text>
                )}
              </Space>
            </Dropdown>
          </Space>
        </Header>
        <Content
          style={{
            padding: contentPadding,
            background: '#f5f7fa',
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
