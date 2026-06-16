'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Layout, Space, Typography, Button, Card, Row, Col, Spin } from 'antd';
import {
  UserOutlined,
  RightOutlined,
  TeamOutlined,
  IdcardOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { hydrateUser } from '@/store/auth/authSlice';
import { api } from '@/lib/axios';
import { UserMenu } from '@/features/dashboard/components/UserMenu';
import type { ApiResponse } from '@/types/api';
import type { UserResponse } from '@/store/auth/authTypes';

const { Title, Paragraph } = Typography;
const { Header } = Layout;

const features = [
  {
    icon: <TeamOutlined style={{ fontSize: 28, color: '#1677ff' }} />,
    title: 'Customer management',
    description: 'Create, view, edit and soft-delete customers with full search and sort.',
  },
  {
    icon: <IdcardOutlined style={{ fontSize: 28, color: '#4096ff' }} />,
    title: 'Identity documents',
    description:
      'Attach multiple identity documents per customer (CCCD, Driver License, Passport).',
  },
  {
    icon: <SafetyOutlined style={{ fontSize: 28, color: '#69b1ff' }} />,
    title: 'Secure auth',
    description: 'JWT access + refresh tokens with rotation and reuse detection.',
  },
];

export function HomeContent() {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const authChecked = useAppSelector((s) => s.auth.authChecked);
  const user = useAppSelector((s) => s.auth.user);

  // Run a /me probe if we don't know the auth state yet (i.e. user
  // landed on / without going through the dashboard layout). The
  // dashboard layout also runs this same probe on mount, so when it
  // has run there the slice is already `authChecked: true` and we
  // skip the second fetch.
  useEffect(() => {
    if (authChecked) return;
    let cancelled = false;
    api
      .get<ApiResponse<{ user: UserResponse }>>('/auth/me')
      .then((res) => {
        if (cancelled) return;
        if (res.data?.success && res.data.data?.user) {
          dispatch(hydrateUser(res.data.data.user));
        } else {
          dispatch(hydrateUser(null));
        }
      })
      .catch(() => {
        if (cancelled) return;
        dispatch(hydrateUser(null));
      });
    return () => {
      cancelled = true;
    };
  }, [authChecked, dispatch]);

  // While we don't yet know whether the visitor is signed in, show
  // a spinner instead of flashing the landing page in the wrong
  // state.
  if (!authChecked) {
    return (
      <main
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(180deg, #f0f5ff 0%, #f5f7fa 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 24px',
        }}
      >
        <Spin size="large" />
      </main>
    );
  }

  // Pick copy + destination based on auth state.
  const ctaHref = isAuthenticated ? '/customers' : '/login';
  const ctaLabel = isAuthenticated ? `Open customers` : 'Get started';

  return (
    <>
      {/*
        Top header — same chrome as the dashboard layout's Header:
        white background, soft bottom shadow, 64px tall. Left side
        shows the product name as a brand mark; right side shows the
        shared UserMenu (avatar + name + dropdown) when signed in,
        or a "Sign in" link when anonymous. We don't show the
        sider-toggle button from the dashboard header because this
        page has no sider.
      */}
      <Header
        style={{
          background: '#fff',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          gap: 8,
          height: 64,
          lineHeight: '64px',
        }}
      >
        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            color: '#1677ff',
            fontWeight: 700,
            fontSize: 16,
            textDecoration: 'none',
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
              color: '#fff',
              fontSize: 14,
              flexShrink: 0,
            }}
          >
            CM
          </div>
          <span>Customers</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', height: 32 }}>
          {isAuthenticated ? (
            <UserMenu />
          ) : (
            <Link href="/login">
              <Button type="primary" icon={<UserOutlined />}>
                Sign in
              </Button>
            </Link>
          )}
        </div>
      </Header>
      <main
        style={{
          minHeight: 'calc(100vh - 64px)',
          background: 'linear-gradient(180deg, #f0f5ff 0%, #f5f7fa 100%)',
          padding: '48px 24px',
        }}
      >
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <Row gutter={[24, 24]} align="middle">
            <Col xs={24} md={14}>
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <div>
                  <Title level={1} style={{ marginBottom: 8 }}>
                    Customer Management
                  </Title>
                  <Paragraph type="secondary" style={{ fontSize: 16 }}>
                    A polished, production-grade full-stack app to manage customers and their
                    identity documents.
                  </Paragraph>
                  {isAuthenticated && user && (
                    <Paragraph type="secondary" style={{ fontSize: 13 }}>
                      Signed in as <strong>{user.name}</strong> ({user.email})
                    </Paragraph>
                  )}
                </div>
                <Space>
                  <Link href={ctaHref}>
                    <Button type="primary" size="large" icon={<UserOutlined />}>
                      {ctaLabel}
                      <RightOutlined />
                    </Button>
                  </Link>
                  {isAuthenticated && (
                    <Link href="/admin/users">
                      <Button size="large">Admin tools</Button>
                    </Link>
                  )}
                </Space>
                <Paragraph type="secondary" style={{ marginTop: 24, fontSize: 13 }}>
                  Stack: Next.js 16 · React 19 · TypeScript · Redux Toolkit + Saga · Antd 6 ·
                  react-hook-form · zod
                </Paragraph>
              </Space>
            </Col>
            <Col xs={24} md={10}>
              <Card>
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <Title level={4} style={{ margin: 0 }}>
                    What's inside
                  </Title>
                  {features.map((f) => (
                    <Space key={f.title} align="start" style={{ width: '100%' }}>
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 10,
                          background: '#f0f5ff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {f.icon}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{f.title}</div>
                        <Paragraph type="secondary" style={{ marginBottom: 0, fontSize: 13 }}>
                          {f.description}
                        </Paragraph>
                      </div>
                    </Space>
                  ))}
                </Space>
              </Card>
            </Col>
          </Row>
        </div>
      </main>
    </>
  );
}
