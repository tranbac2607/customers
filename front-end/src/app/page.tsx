'use client';

import Link from 'next/link';
import { Space, Typography, Button, Row, Col } from 'antd';
import { UserOutlined, RightOutlined } from '@ant-design/icons';
import { CounterExample } from '@/features/counter/CounterExample';
import { useAppSelector } from '@/store/hooks';

const { Title, Paragraph } = Typography;

export default function HomePage() {
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
            <Space direction="vertical" size="large">
              <div>
                <Title level={1} style={{ marginBottom: 8 }}>
                  Customer Management
                </Title>
                <Paragraph type="secondary" style={{ fontSize: 16 }}>
                  A polished, production-grade full-stack app to manage customers
                  and their identity documents.
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
              <Paragraph type="secondary" style={{ marginTop: 24 }}>
                Stack: Next.js 14 · React 18 · TypeScript · Redux Toolkit + Saga ·
                Antd 5 · react-hook-form · zod
              </Paragraph>
            </Space>
          </Col>
          <Col xs={24} md={10}>
            <CounterExample />
          </Col>
        </Row>
      </div>
    </main>
  );
}
