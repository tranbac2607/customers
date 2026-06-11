'use client';

import { Card, Row, Col, Typography, Statistic } from 'antd';
import { TeamOutlined, IdcardOutlined, GlobalOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

export default function DashboardPage() {
  return (
    <div>
      <Title level={2} style={{ marginBottom: 8 }}>
        Dashboard
      </Title>
      <Paragraph type="secondary">Overview of your customer base.</Paragraph>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="Total customers"
              value={0}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="Identity documents"
              value={0}
              prefix={<IdcardOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="Nationalities"
              value={0}
              prefix={<GlobalOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
