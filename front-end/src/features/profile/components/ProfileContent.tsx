'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Form, Input, Button, Typography, Space, Avatar, Tabs, Spin, message } from 'antd';
import {
  UserOutlined,
  LockOutlined,
  MailOutlined,
  CheckCircleTwoTone,
  CameraOutlined,
} from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { updateProfile } from '@/store/auth/authSlice';
import { api } from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type { UserResponse } from '@/store/auth/authTypes';

const { Title, Paragraph } = Typography;

interface ProfileValues {
  name: string;
  email: string;
}

interface ChangePasswordValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const MAX_AVATAR_BYTES = 512 * 1024; // 512KB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export function ProfileContent() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user, isAuthenticated, authChecked } = useAppSelector((s) => s.auth);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [loadingAvatar, setLoadingAvatar] = useState(false);
  const [profileForm] = Form.useForm<ProfileValues>();
  const [passwordForm] = Form.useForm<ChangePasswordValues>();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // Don't redirect until the dashboard layout's /me probe has
    // completed. Otherwise an authenticated user who navigates here
    // directly (e.g. via the avatar dropdown) gets bounced back to
    // /login because Redux hasn't seen the user yet.
    if (!authChecked) return;
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (user) {
      profileForm.setFieldsValue({ name: user.name, email: user.email });
    }
  }, [authChecked, isAuthenticated, user, profileForm, router]);

  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  /**
   * Compress an image to fit within MAX_AVATAR_BYTES by resizing it
   * with a canvas. Keeps the original aspect ratio; if the file is
   * already small we send it as-is.
   */
  const compressImage = async (file: File): Promise<string> => {
    const dataUrl = await readFileAsDataUrl(file);
    // Rough size of the base64 payload; pad for the data URL wrapper.
    const approxBytes = dataUrl.length * 0.75;
    if (approxBytes <= MAX_AVATAR_BYTES) return dataUrl;

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = dataUrl;
    });

    // Binary-search a scale that fits under the cap.
    let scale = 1;
    let result = dataUrl;
    for (let i = 0; i < 6; i++) {
      scale *= 0.75;
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) return result;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      result = canvas.toDataURL('image/jpeg', 0.85);
      if (result.length * 0.75 <= MAX_AVATAR_BYTES) return result;
    }
    return result;
  };

  const onAvatarSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      message.error('Please choose a JPG, PNG, GIF, or WebP image.');
      return;
    }
    setLoadingAvatar(true);
    try {
      const dataUrl = await compressImage(file);
      const res = await api.post<ApiResponse<{ user: UserResponse }>>(
        '/users/me/avatar',
        { dataUrl },
      );
      if (res.data.success) {
        dispatch(updateProfile({ avatarUrl: res.data.data.user.avatarUrl }));
        message.success('Avatar updated');
      } else {
        message.error(res.data.error.message);
      }
    } catch (err: unknown) {
      const e2 = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
      message.error(e2.response?.data?.error?.message ?? e2.message ?? 'Failed to upload avatar');
    } finally {
      setLoadingAvatar(false);
    }
  };

  const onSaveProfile = async (values: ProfileValues) => {
    setLoadingProfile(true);
    try {
      const res = await api.patch<ApiResponse<{ user: UserResponse }>>('/auth/me', values);
      if (!res.data.success) {
        message.error(res.data.error.message);
        return;
      }
      dispatch(updateProfile(res.data.data.user));
      message.success('Profile updated');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
      message.error(e.response?.data?.error?.message ?? e.message ?? 'Update failed');
    } finally {
      setLoadingProfile(false);
    }
  };

  const onChangePassword = async (values: ChangePasswordValues) => {
    setLoadingPassword(true);
    try {
      const res = await api.post<ApiResponse<unknown>>('/auth/change-password', {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      if (!res.data.success) {
        message.error(res.data.error.message);
        return;
      }
      message.success('Password changed. Please sign in again.');
      passwordForm.resetFields();
      setTimeout(() => {
        dispatch({ type: 'auth/logout' });
        router.push('/login');
      }, 500);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
      message.error(e.response?.data?.error?.message ?? e.message ?? 'Failed to change password');
    } finally {
      setLoadingPassword(false);
    }
  };

  if (!authChecked) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <Spin />
      </div>
    );
  }
  if (!isAuthenticated || !user) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <Spin />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 24 }}>
      <Title level={2}>Profile</Title>
      <Paragraph type="secondary">Manage your account information and password.</Paragraph>

      <Card style={{ marginBottom: 16 }}>
        <Space size="large" align="center" style={{ marginBottom: 16 }}>
          <div style={{ position: 'relative' }}>
            <Avatar
              size={72}
              src={user.avatarUrl}
              icon={!user.avatarUrl ? <UserOutlined /> : undefined}
              style={{ background: '#1677ff' }}
            />
            <Button
              shape="circle"
              size="small"
              icon={<CameraOutlined />}
              loading={loadingAvatar}
              onClick={() => fileInputRef.current?.click()}
              style={{ position: 'absolute', bottom: 0, right: 0 }}
              aria-label="Change avatar"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={onAvatarSelected}
            />
          </div>
          <div>
            <Title level={4} style={{ margin: 0 }}>
              {user.name}
            </Title>
            <Paragraph type="secondary" style={{ margin: 0 }}>
              @{user.username} · {user.email}
              {user.emailVerified && (
                <CheckCircleTwoTone
                  twoToneColor="#52c41a"
                  style={{ marginLeft: 6 }}
                  title="Email verified"
                />
              )}
            </Paragraph>
            <Paragraph type="secondary" style={{ margin: 0, fontSize: 12 }}>
              Role: {user.role} · Status: {user.status}
            </Paragraph>
          </div>
        </Space>
      </Card>

      <Card>
        <Tabs
          items={[
            {
              key: 'profile',
              label: 'Profile',
              children: (
                <Form
                  form={profileForm}
                  layout="vertical"
                  onFinish={onSaveProfile}
                  disabled={loadingProfile}
                  style={{ maxWidth: 480 }}
                >
                  <Form.Item
                    label="Name"
                    name="name"
                    rules={[{ required: true, message: 'Name is required' }]}
                  >
                    <Input prefix={<UserOutlined />} />
                  </Form.Item>
                  <Form.Item
                    label="Email"
                    name="email"
                    rules={[
                      { required: true, message: 'Email is required' },
                      { type: 'email', message: 'Invalid email' },
                    ]}
                  >
                    <Input prefix={<MailOutlined />} />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" htmlType="submit" loading={loadingProfile}>
                      Save changes
                    </Button>
                  </Form.Item>
                </Form>
              ),
            },
            {
              key: 'password',
              label: 'Password',
              children: (
                <Form
                  form={passwordForm}
                  layout="vertical"
                  onFinish={onChangePassword}
                  disabled={loadingPassword}
                  style={{ maxWidth: 480 }}
                >
                  <Paragraph type="secondary">
                    Use a strong password (8+ characters, with at least one letter, one number, and
                    one special character).
                  </Paragraph>
                  <Form.Item
                    label="Current password"
                    name="currentPassword"
                    rules={[{ required: true, message: 'Enter your current password' }]}
                  >
                    <Input.Password prefix={<LockOutlined />} autoComplete="current-password" />
                  </Form.Item>
                  <Form.Item
                    label="New password"
                    name="newPassword"
                    rules={[
                      { required: true, message: 'Enter a new password' },
                      { min: 8, message: 'At least 8 characters' },
                      { pattern: /[A-Za-z]/, message: 'Must contain a letter' },
                      { pattern: /[0-9]/, message: 'Must contain a number' },
                      { pattern: /[^A-Za-z0-9]/, message: 'Must contain a special character' },
                    ]}
                  >
                    <Input.Password prefix={<LockOutlined />} autoComplete="new-password" />
                  </Form.Item>
                  <Form.Item
                    label="Confirm new password"
                    name="confirmPassword"
                    dependencies={['newPassword']}
                    rules={[
                      { required: true, message: 'Confirm the new password' },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || getFieldValue('newPassword') === value) {
                            return Promise.resolve();
                          }
                          return Promise.reject(new Error('Passwords do not match'));
                        },
                      }),
                    ]}
                  >
                    <Input.Password prefix={<LockOutlined />} autoComplete="new-password" />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" htmlType="submit" loading={loadingPassword}>
                      Change password
                    </Button>
                  </Form.Item>
                </Form>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
