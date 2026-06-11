import { Skeleton, Card, Space } from 'antd';

export default function Loading() {
  return (
    <div>
      <Skeleton active paragraph={{ rows: 1 }} style={{ maxWidth: 480, marginBottom: 16 }} />
      <Card styles={{ body: { padding: 0 } }}>
        <div style={{ padding: 16, borderBottom: '1px solid #f0f0f0' }}>
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Skeleton.Input active size="large" style={{ width: 360 }} />
            <Skeleton.Input active size="large" style={{ width: 180 }} />
          </Space>
        </div>
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            style={{
              padding: '16px 24px',
              borderBottom: '1px solid #f0f0f0',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <Skeleton.Avatar active size="default" />
            <div style={{ flex: 1 }}>
              <Skeleton.Input active size="small" style={{ width: 200, marginBottom: 8 }} />
              <Skeleton.Input active size="small" style={{ width: 140 }} />
            </div>
            <Skeleton.Button active size="small" />
            <Skeleton.Button active size="small" />
            <Skeleton.Button active size="small" />
          </div>
        ))}
      </Card>
    </div>
  );
}
