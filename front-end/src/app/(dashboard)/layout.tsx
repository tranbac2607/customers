'use client';

import { useState, type ReactNode } from 'react';
import { Layout, Menu, Avatar, Dropdown, Space, Typography, Button, Tooltip } from 'antd';
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
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logout } from '@/features/auth/authSlice';
import { toggleThemeMode } from '@/features/ui/uiSlice';
import { AuthGuard } from '@/components/AuthGuard';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const menuItems = [
  { key: '/', icon: <HomeOutlined />, label: <Link href="/">Home</Link> },
  { key: '/customers', icon: <TeamOutlined />, label: <Link href="/customers">Customers</Link> },
  { key: '/dashboard', icon: <DashboardOutlined />, label: <Link href="/dashboard">Dashboard</Link> },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const themeMode = useAppSelector((s) => s.ui.themeMode);

  // Find the best matching menu key (handles nested paths)
  const selectedKey =
    menuItems
      .map((m) => m.key)
      .filter((k) => k !== '/' && pathname?.startsWith(k))
      .sort((a, b) => b.length - a.length)[0] ||
    (pathname === '/' ? '/' : null);

  const handleLogout = () => {
    dispatch(logout());
    router.replace('/login');
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

  return (
    <AuthGuard>
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
    </AuthGuard>
  );
}
