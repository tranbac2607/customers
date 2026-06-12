'use client';

import Link from 'next/link';
import { Space, Typography, Button, Card, Row, Col } from 'antd';
import {
  UserOutlined,
  RightOutlined,
  TeamOutlined,
  IdcardOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import { useAppSelector } from '@/store/hooks';

const { Title, Paragraph } = Typography;

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
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);

  return (
    <main
      style={{
        minHeight: '100vh',
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
                  A polished, production-grade full-stack app to manage customers and their identity
                  documents.
                </Paragraph>
              </div>
              <Space>
                <Link href={isAuthenticated ? '/customers' : '/login'}>
                  <Button type="primary" size="large" icon={<UserOutlined />}>
                    {isAuthenticated ? 'Go to customers' : 'Get started'}
                    <RightOutlined />
                  </Button>
                </Link>
                <Link href="http://localhost:4000/api/docs" target="_blank">
                  <Button size="large">API docs</Button>
                </Link>
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
  );
}
