'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Card, Form, Input, Button, Typography, Space, Divider, Alert } from 'antd';
import { LockOutlined, MailOutlined, LoginOutlined } from '@ant-design/icons';
import { toast } from 'react-toastify';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { loginRequest, type LoginErrorCode } from '@/store/auth/authSlice';

const { Title, Paragraph, Text } = Typography;
const SAVED_EMAIL_KEY = 'saved_email';

interface LoginValues {
  email: string;
  password: string;
}

// Map the saga's error code to a user-facing message. Wrong credentials
// get a specific message; everything else (5xx, CORS, network failure)
// gets a generic server-error message so the user isn't told their
// password is wrong when the actual problem is the backend being down.
function errorMessageFor(code: LoginErrorCode | null): string | null {
  switch (code) {
    case 'INVALID_CREDENTIALS':
      return 'Invalid email or password';
    case 'SERVER_ERROR':
      return 'Server error. Please try again later.';
    case 'NETWORK_ERROR':
      return 'Network error. Please check your connection.';
    case 'UNKNOWN':
      return 'Something went wrong. Please try again.';
    default:
      return null;
  }
}

/**
 * useSearchParams() must be inside a <Suspense> boundary in Next.js 15+
 * so the route can be statically generated. The page shell wraps this
 * component in <Suspense>; this component reads the search params.
 */
export function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const { loading, error, errorCode, isAuthenticated, user } = useAppSelector((s) => s.auth);

  // Restore saved email so user doesn't have to re-type after session expiry
  const [savedEmail, setSavedEmail] = useState('');
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SAVED_EMAIL_KEY);
      if (saved) setSavedEmail(saved);
    } catch {
      // localStorage may be unavailable in some environments
    }
  }, []);

  // Track previous auth state to fire success toast exactly once
  const wasAuthenticated = useRef(isAuthenticated);
  // Initialise with the current errorCode so React.StrictMode's
  // mount/unmount/remount cycle in dev doesn't fire the same toast twice
  // (the ref is preserved across remounts, so the equality check holds).
  const lastErrorCode = useRef<LoginErrorCode | null>(errorCode);
  // Track if this is a re-login after session expiry (query param ?expired=1)
  const [sessionExpired, setSessionExpired] = useState(false);
  useEffect(() => {
    if (searchParams.get('expired') === '1') {
      setSessionExpired(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (isAuthenticated && !wasAuthenticated.current) {
      // Save email on successful login for re-auth later
      const email = (document.querySelector('input[name="email"]') as HTMLInputElement)?.value;
      if (email) {
        try {
          localStorage.setItem(SAVED_EMAIL_KEY, email);
        } catch {
          // ignore
        }
      }
      toast.success(`Welcome back${user?.name ? `, ${user.name}` : ''}!`);
      const next = searchParams.get('next') || '/customers';
      router.replace(next);
    }
    wasAuthenticated.current = isAuthenticated;
  }, [isAuthenticated, user, router, searchParams]);

  useEffect(() => {
    if (errorCode && errorCode !== lastErrorCode.current) {
      const msg = errorMessageFor(errorCode);
      if (msg) toast.error(msg);
      lastErrorCode.current = errorCode;
    }
  }, [errorCode]);

  const onFinish = (values: LoginValues) => {
    // The reducer clears error + errorCode on loginRequest, so no manual
    // reset needed here.
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

        {sessionExpired && (
          <Alert
            type="warning"
            message="Session expired"
            description="Your session has expired. Please sign in again."
            showIcon
            closable
            onClose={() => setSessionExpired(false)}
          />
        )}

        <Form
          layout="vertical"
          size="large"
          onFinish={onFinish}
          autoComplete="off"
          disabled={loading}
          requiredMark={false}
          initialValues={{ email: savedEmail, password: '' }}
        >
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: 'Please enter your email' },
              { type: 'email', message: 'Please enter a valid email' },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="admin@example.com" autoComplete="email" />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
            rules={[
              { required: true, message: 'Please enter your password' },
              { min: 6, message: 'Password must be at least 6 characters' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="••••••••"
              autoComplete="current-password"
            />
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
