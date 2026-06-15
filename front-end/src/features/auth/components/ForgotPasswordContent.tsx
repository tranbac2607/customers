'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, Form, Input, Button, Typography, Space, Alert } from 'antd';
import { MailOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { toast } from 'react-toastify';
import { api } from '@/lib/axios';
import type { ApiResponse } from '@/types/api';

const { Title, Paragraph } = Typography;

interface ForgotValues {
  email: string;
}

interface ForgotResponse {
  sent: boolean;
  message: string;
}

export function ForgotPasswordContent() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const onFinish = async (values: ForgotValues) => {
    setLoading(true);
    try {
      const res = await api.post<ApiResponse<ForgotResponse>>(
        '/auth/forgot-password',
        values,
      );
      if (!res.data.success) {
        toast.error(res.data.error.message);
        return;
      }
      setSubmitted(true);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
      const msg = e.response?.data?.error?.message ?? e.message ?? 'Failed to send reset email';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
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
            Forgot password
          </Title>
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            Enter your email and we'll send you a reset link
          </Paragraph>
        </div>

        {submitted ? (
          <Alert
            type="success"
            showIcon
            icon={<CheckCircleOutlined />}
            message="Check your email"
            description="If an account exists for that email, we sent a password reset link. The link expires in 30 minutes."
          />
        ) : (
          <Form layout="vertical" size="large" onFinish={onFinish} disabled={loading} requiredMark={false}>
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

            <Form.Item style={{ marginBottom: 0 }}>
              <Button type="primary" htmlType="submit" block loading={loading}>
                Send reset link
              </Button>
            </Form.Item>
          </Form>
        )}

        <div style={{ textAlign: 'center', fontSize: 13 }}>
          <Link href="/login" style={{ color: '#1677ff' }}>
            ← Back to sign in
          </Link>
        </div>
      </Space>
    </Card>
  );
}
