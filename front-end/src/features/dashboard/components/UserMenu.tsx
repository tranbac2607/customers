'use client';

import { Avatar, Dropdown, Typography } from 'antd';
import {
  UserOutlined,
  LogoutOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logout } from '@/store/auth/authSlice';
import { api } from '@/lib/axios';

const { Text } = Typography;

interface UserMenuProps {
  /** When true, only the avatar is rendered (no name label next to it). */
  isMobile?: boolean;
}

/**
 * Avatar + name + dropdown menu (email, profile, admin links, sign out).
 * Shared between the dashboard header and any standalone page (e.g. /)
 * that wants the same user chrome.
 */
export function UserMenu({ isMobile = false }: UserMenuProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);

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

  // Nothing to render until the slice knows who the user is. The
  // parent decides what to show in the meantime (a Sign in button,
  // a placeholder, etc.).
  if (!user) return null;

  const items = [
    {
      key: 'email',
      icon: <UserOutlined />,
      label: <Text type="secondary">{user.email}</Text>,
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
  ];

  return (
    <Dropdown menu={{ items }} placement="bottomRight" trigger={['click']}>
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
        {user.avatarUrl ? (
          <Avatar
            size={32}
            src={user.avatarUrl}
            alt={user.name}
            style={{ background: 'transparent' }}
          />
        ) : (
          <Avatar style={{ background: '#1677ff' }}>
            {user.name?.[0]?.toUpperCase() ?? <UserOutlined />}
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
            {user.name}
          </Text>
        )}
      </div>
    </Dropdown>
  );
}
