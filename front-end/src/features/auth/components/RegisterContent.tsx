'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { Card, Form, Input, Button, Typography, Space, Divider, Alert } from 'antd';
import { LockOutlined, MailOutlined, UserOutlined, SmileOutlined } from '@ant-design/icons';
import { toast } from 'react-toastify';
import { api } from '@/lib/axios';
import type { ApiResponse } from '@/types/api';

const { Title, Paragraph } = Typography;

interface RegisterValues {
  email: string;
  username: string;
  password: string;
  name: string;
}

interface RegisterResponse {
  user: {
    id: string;
    email: string;
    username: string;
    name: string;
    role: 'admin' | 'user';
    status: string;
    emailVerified: boolean;
  };
  verificationSent: boolean;
  message: string;
}

export function RegisterContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ verificationSent: boolean } | null>(null);

  const onFinish = async (values: RegisterValues) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<ApiResponse<RegisterResponse>>('/auth/register', values);
      if (!res.data.success) {
        setError(res.data.error.message);
        toast.error(res.data.error.message);
        return;
      }
      setSuccess({ verificationSent: res.data.data.verificationSent });
      toast.success(res.data.data.message);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
      const msg = e.response?.data?.error?.message ?? e.message ?? 'Registration failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      style={{ width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}
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
            Create your account
          </Title>
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            Sign up to start managing your customers
          </Paragraph>
        </div>

        {success && (
          <Alert
            type="success"
            showIcon
            icon={<SmileOutlined />}
            message="Account created"
            description={
              success.verificationSent
                ? 'Check your email for a verification link. After verifying, you can sign in.'
                : 'You can sign in now.'
            }
            action={
              <Button size="small" type="primary" onClick={() => router.push('/login')}>
                Go to sign in
              </Button>
            }
          />
        )}

        {error && !success && (
          <Alert type="error" showIcon message={error} closable onClose={() => setError(null)} />
        )}

        {!success && (
          <Form
            layout="vertical"
            size="large"
            onFinish={onFinish}
            autoComplete="off"
            disabled={loading}
            requiredMark={false}
          >
            <Form.Item
              label="Email"
              name="email"
              rules={[
                { required: true, message: 'Please enter your email' },
                { type: 'email', message: 'Please enter a valid email' },
              ]}
            >
              <Input prefix={<MailOutlined />} placeholder="you@example.com" autoComplete="email" />
            </Form.Item>

            <Form.Item
              label="Username"
              name="username"
              rules={[
                { required: true, message: 'Please pick a username' },
                { min: 3, message: 'At least 3 characters' },
                { max: 32, message: 'At most 32 characters' },
                {
                  pattern: /^[a-zA-Z0-9_.-]+$/,
                  message: 'Letters, numbers, _, ., - only',
                },
              ]}
            >
              <Input prefix={<UserOutlined />} placeholder="tranbac" autoComplete="username" />
            </Form.Item>

            <Form.Item
              label="Full name"
              name="name"
              rules={[{ required: true, message: 'Please enter your name' }]}
            >
              <Input prefix={<SmileOutlined />} placeholder="Nguyễn Văn A" autoComplete="name" />
            </Form.Item>

            <Form.Item
              label="Password"
              name="password"
              rules={[
                { required: true, message: 'Please enter a password' },
                { min: 8, message: 'At least 8 characters' },
                {
                  pattern: /[A-Za-z]/,
                  message: 'Must contain at least one letter',
                },
                {
                  pattern: /[0-9]/,
                  message: 'Must contain at least one number',
                },
              ]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="At least 8 characters" autoComplete="new-password" />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button type="primary" htmlType="submit" block loading={loading}>
                Create account
              </Button>
            </Form.Item>
          </Form>
        )}

        <Divider plain style={{ margin: '8px 0', fontSize: 12, color: '#94a3b8' }}>
          Already have an account?
        </Divider>

        <div style={{ textAlign: 'center' }}>
          <Link href="/login" style={{ color: '#1677ff' }}>
            Sign in instead
          </Link>
        </div>
      </Space>
    </Card>
  );
}
