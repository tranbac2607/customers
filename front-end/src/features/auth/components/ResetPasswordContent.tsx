'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { Card, Form, Input, Button, Typography, Space, Alert } from 'antd';
import { LockOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { toast } from 'react-toastify';
import { api } from '@/lib/axios';
import type { ApiResponse } from '@/types/api';

const { Title, Paragraph } = Typography;

interface ResetValues {
  password: string;
  confirmPassword: string;
}

export function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const onFinish = async (values: ResetValues) => {
    if (!token) {
      toast.error('Missing or invalid reset token');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post<ApiResponse<unknown>>('/auth/reset-password', {
        token,
        password: values.password,
      });
      if (!res.data.success) {
        toast.error(res.data.error.message);
        return;
      }
      setDone(true);
      toast.success('Password reset. Please sign in with your new password.');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
      const msg = e.response?.data?.error?.message ?? e.message ?? 'Failed to reset password';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <Card
        style={{ width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}
        styles={{ body: { padding: 32 } }}
      >
        <Alert
          type="error"
          showIcon
          message="Invalid reset link"
          description="This password reset link is missing or invalid. Please request a new one."
        />
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Link href="/forgot-password" style={{ color: '#1677ff' }}>
            Request a new reset link
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card
      style={{ width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}
      styles={{ body: { padding: 32 } }}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              display: 'inline-flex',
              width: 56,
              height: 56,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #1677ff, #4096ff)',
              color: '#fff',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              fontWeight: 700,
              marginBottom: 16,
            }}
          >
            CM
          </div>
          <Title level={3} style={{ marginBottom: 4 }}>
            Set a new password
          </Title>
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            Choose a strong password you haven't used before
          </Paragraph>
        </div>

        {done ? (
          <Alert
            type="success"
            showIcon
            icon={<CheckCircleOutlined />}
            message="Password reset"
            description="Your password has been updated. You can now sign in with the new password."
            action={
              <Button size="small" type="primary" onClick={() => router.push('/login')}>
                Sign in
              </Button>
            }
          />
        ) : (
          <Form
            layout="vertical"
            size="large"
            onFinish={onFinish}
            disabled={loading}
            requiredMark={false}
            initialValues={{ password: '', confirmPassword: '' }}
          >
            <Form.Item
              label="New password"
              name="password"
              rules={[
                { required: true, message: 'Please enter a new password' },
                { min: 8, message: 'At least 8 characters' },
                { pattern: /[A-Za-z]/, message: 'Must contain a letter' },
                { pattern: /[0-9]/, message: 'Must contain a number' },
                { pattern: /[^A-Za-z0-9]/, message: 'Must contain a special character' },
              ]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="At least 8 characters" autoComplete="new-password" />
            </Form.Item>

            <Form.Item
              label="Confirm new password"
              name="confirmPassword"
              dependencies={['password']}
              rules={[
                { required: true, message: 'Please confirm your new password' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('Passwords do not match'));
                  },
                }),
              ]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="Type the password again" autoComplete="new-password" />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button type="primary" htmlType="submit" block loading={loading}>
                Update password
              </Button>
            </Form.Item>
          </Form>
        )}
      </Space>
    </Card>
  );
}
