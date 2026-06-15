'use client';

import { useEffect, useState, type ReactNode } from 'react';
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
  TeamOutlined,
  LogoutOutlined,
  UserOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  CloseOutlined,
  HomeOutlined,
} from '@ant-design/icons';
import { AxiosError } from 'axios';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { hydrateUser, logout } from '@/store/auth/authSlice';
import { api } from '@/lib/axios';
import type { ApiFailure, ApiResponse } from '@/types/api';
import type { UserResponse } from '@/store/auth/authTypes';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;
const { useBreakpoint } = Grid;

const menuItems = [
  { key: '/', icon: <HomeOutlined />, label: <Link href="/">Home</Link> },
  { key: '/customers', icon: <TeamOutlined />, label: <Link href="/customers">Customers</Link> },
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
    // If login already populated Redux (e.g. fresh login, then routed
    // here), there's nothing to probe — the httpOnly cookie is already
    // valid by definition because login succeeded. Skip the network
    // round-trip entirely.
    if (user) return;

    let cancelled = false;
    api
      .get<ApiResponse<{ user: UserResponse }>>('/auth/me')
      .then((res) => {
        if (cancelled) return;
        const body = res.data;
        if (body?.success && body.data && 'user' in body.data && body.data.user) {
          dispatch(hydrateUser(body.data.user));
        } else {
          dispatch(hydrateUser(null));
        }
      })
      .catch((err: AxiosError<ApiFailure>) => {
        if (cancelled) return;
        dispatch(hydrateUser(null));
        // /me is excluded from the auto-refresh path in lib/axios.ts
        // (any /auth/* URL is), so a 401 here means the session is
        // genuinely gone — redirect to login.
        if (err.response?.status === 401) {
          const next = encodeURIComponent(pathname || '/');
          router.replace(`/login?next=${next}`);
        }
      });
    return () => {
      cancelled = true;
    };
    // Empty deps: this is a mount-once probe. `pathname` is only used
    // to build the ?next= redirect URL, not to retrigger the fetch.
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
        key: 'email',
        icon: <UserOutlined />,
        label: <Text type="secondary">{user?.email}</Text>,
        disabled: true,
      },
      {
        key: 'profile',
        icon: <UserOutlined />,
        label: <Link href="/profile">Profile</Link>,
      },
      {
        key: 'admin-users',
        icon: <TeamOutlined />,
        label: <Link href="/admin/users">Admin: Users</Link>,
      },
      {
        key: 'admin-activity',
        icon: <TeamOutlined />,
        label: <Link href="/admin/activity-log">Admin: Activity log</Link>,
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
    // Outer Layout is pinned to 100vh with overflow: hidden so the
    // browser never scrolls the whole page; the right-column
    // <Layout> below is the only flex container that decides what
    // scrolls (the Content). Together with the Sider staying at
    // height: 100% (its default inside a fixed-height parent), this
    // gives us a pinned Sider + pinned Header + a single scroll
    // region for the page content.
    <Layout style={{ height: '100vh', overflow: 'hidden' }}>
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
      {/* Right column: flex column so the Header can keep its
          natural height while the Content absorbs the rest and
          gets the only scrollbar. */}
      <Layout style={{ display: 'flex', flexDirection: 'column' }}>
        <Header
          style={{
            background: '#fff',
            padding: headerPadding,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            gap: 8,
            // flex: 0 0 auto — never shrink, never grow. The Sider
            // above and the Content below own the rest of the
            // vertical space.
            flex: '0 0 auto',
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
          <div style={{ display: 'flex', alignItems: 'center', height: 32 }}>
            <Dropdown menu={userMenu} placement="bottomRight" trigger={['click']}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'auto auto',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  height: 32,
                }}
              >
                {user?.avatarUrl ? (
                  <Avatar
                    size={32}
                    src={user.avatarUrl}
                    alt={user.name}
                    style={{ background: 'transparent' }}
                  />
                ) : (
                  <Avatar style={{ background: user ? '#1677ff' : '#d9d9d9' }}>
                    {user ? user.name[0]?.toUpperCase() : <UserOutlined />}
                  </Avatar>
                )}
                {!isMobile && (
                  <Text
                    strong
                    style={{
                      maxWidth: 160,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      lineHeight: '32px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {user?.name ?? <Spin size="small" />}
                  </Text>
                )}
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content
          style={{
            padding: contentPadding,
            background: '#f5f7fa',
            // flex: 1 1 auto — absorb the remaining vertical space;
            // overflow: auto — only this region gets a scrollbar.
            flex: '1 1 auto',
            overflow: 'auto',
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
