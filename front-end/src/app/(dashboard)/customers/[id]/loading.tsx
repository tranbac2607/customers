import { Skeleton, Card } from 'antd';

export default function Loading() {
  return (
    <div>
      <Skeleton.Input active size="small" style={{ width: 120, marginBottom: 16 }} />
      <Skeleton active title paragraph={{ rows: 1 }} style={{ maxWidth: 480, marginBottom: 24 }} />
      <Card>
        <Skeleton active paragraph={{ rows: 8 }} />
      </Card>
    </div>
  );
}
