'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, Button, Typography, Space, Alert, Spin } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { api } from '@/lib/axios';
import type { ApiResponse } from '@/types/api';

const { Title, Paragraph } = Typography;

interface VerifyResponse {
  user: { id: string; email: string; name: string };
  message: string;
}

export function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [state, setState] = useState<'loading' | 'success' | 'error'>(
    token ? 'loading' : 'error',
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(
    token ? null : 'Missing or invalid verification token',
  );

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.post<ApiResponse<VerifyResponse>>('/auth/verify-email', {
          token,
        });
        if (cancelled) return;
        if (res.data.success) {
          setState('success');
        } else {
          setState('error');
          setErrorMsg(res.data.error.message);
        }
      } catch (err: unknown) {
        if (cancelled) return;
        const e = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
        setState('error');
        setErrorMsg(e.response?.data?.error?.message ?? e.message ?? 'Verification failed');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

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
            Email verification
          </Title>
        </div>

        {state === 'loading' && (
          <div style={{ textAlign: 'center', padding: 24 }}>
            <Spin size="large" />
            <Paragraph type="secondary" style={{ marginTop: 16 }}>
              Verifying your email…
            </Paragraph>
          </div>
        )}

        {state === 'success' && (
          <Alert
            type="success"
            showIcon
            icon={<CheckCircleOutlined />}
            message="Email verified"
            description="Your email is now verified. You can sign in to your account."
            action={
              <Button size="small" type="primary" onClick={() => router.push('/login')}>
                Go to sign in
              </Button>
            }
          />
        )}

        {state === 'error' && (
          <>
            <Alert
              type="error"
              showIcon
              icon={<CloseCircleOutlined />}
              message="Verification failed"
              description={errorMsg ?? 'The verification link is invalid or has expired.'}
            />
            <div style={{ textAlign: 'center' }}>
              <Link href="/login" style={{ color: '#1677ff' }}>
                Back to sign in
              </Link>
            </div>
          </>
        )}
      </Space>
    </Card>
  );
}
