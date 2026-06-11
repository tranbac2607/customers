'use client';

import { Card, Typography, Button, Space } from 'antd';
import Link from 'next/link';
import { TeamOutlined, PlusOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

export default function DashboardIndex() {
  return (
    <Card>
      <Title level={3}>Welcome to your dashboard</Title>
      <Paragraph type="secondary">
        Use the sidebar to navigate to <strong>Customers</strong> to manage your records.
      </Paragraph>
      <Space>
        <Link href="/customers">
          <Button type="primary" icon={<TeamOutlined />}>
            View customers
          </Button>
        </Link>
        <Link href="/customers/new">
          <Button icon={<PlusOutlined />}>New customer</Button>
        </Link>
      </Space>
    </Card>
  );
}
