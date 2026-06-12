'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Card, Form, Input, Button, Typography, Space, Divider } from 'antd';
import { LockOutlined, MailOutlined, LoginOutlined } from '@ant-design/icons';
import { toast } from 'react-toastify';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { loginRequest } from '@/features/auth/authSlice';

const { Title, Paragraph, Text } = Typography;

interface LoginValues {
  email: string;
  password: string;
}

/**
 * useSearchParams() must be inside a <Suspense> boundary in Next.js 15+
 * so that the route can be statically generated. We split the page into
 * a thin outer shell (Suspense) and the form (which reads the search
 * params) to satisfy the build while keeping the same UI.
 */
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const { loading, error, isAuthenticated, user } = useAppSelector((s) => s.auth);

  // Track previous auth state to fire success toast exactly once
  const wasAuthenticated = useRef(isAuthenticated);
  const lastError = useRef<string | null>(null);

  useEffect(() => {
    if (isAuthenticated && !wasAuthenticated.current) {
      toast.success(`Welcome back${user?.name ? `, ${user.name}` : ''}!`);
      const next = searchParams.get('next') || '/customers';
      router.replace(next);
    }
    wasAuthenticated.current = isAuthenticated;
  }, [isAuthenticated, user, router, searchParams]);

  useEffect(() => {
    if (error && error !== lastError.current) {
      toast.error('Invalid email or password');
      lastError.current = error;
    }
  }, [error]);

  const onFinish = (values: LoginValues) => {
    lastError.current = null;
    dispatch(loginRequest(values));
  };

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
            Welcome back
          </Title>
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            Sign in to manage your customers
          </Paragraph>
        </div>

        <Form
          layout="vertical"
          size="large"
          onFinish={onFinish}
          autoComplete="off"
          disabled={loading}
          requiredMark={false}
          initialValues={{ email: '', password: '' }}
        >
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: 'Please enter your email' },
              { type: 'email', message: 'Please enter a valid email' },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="admin@example.com" />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
            rules={[
              { required: true, message: 'Please enter your password' },
              { min: 6, message: 'Password must be at least 6 characters' },
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="••••••••" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              icon={<LoginOutlined />}
            >
              Sign in
            </Button>
          </Form.Item>
        </Form>

        <Divider plain style={{ margin: '8px 0', fontSize: 12, color: '#94a3b8' }}>
          Demo credentials
        </Divider>

        <div
          style={{
            background: '#f0f5ff',
            border: '1px dashed #91caff',
            borderRadius: 8,
            padding: 12,
            textAlign: 'center',
          }}
        >
          <Text code>admin@example.com</Text>
          <br />
          <Text code>Admin@123</Text>
        </div>

        <div style={{ textAlign: 'center' }}>
          <Link href="/" style={{ color: '#1677ff' }}>
            ← Back to home
          </Link>
        </div>
      </Space>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1677ff 0%, #4096ff 50%, #69b1ff 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
