'use client';

import { Card, Space, Button, Typography, Statistic, Spin, Alert } from 'antd';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  increment,
  decrement,
  reset,
  fetchRequest,
} from './counterSlice';

const { Title, Paragraph } = Typography;

export function CounterExample() {
  const dispatch = useAppDispatch();
  const { value, loading, error } = useAppSelector((s) => s.counter);

  return (
    <Card
      title={<Title level={4} style={{ margin: 0 }}>Redux Saga demo</Title>}
      style={{ maxWidth: 480 }}
    >
      <Paragraph type="secondary" style={{ marginBottom: 16 }}>
        A small async example: dispatch <code>fetchRequest</code> → saga waits 600ms →
        dispatches <code>fetchSuccess</code> with a random number.
      </Paragraph>

      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Statistic title="Counter value" value={value} loading={loading} />
        {error && <Alert type="error" message={error} />}

        <Space>
          <Button onClick={() => dispatch(decrement())}>- Decrement</Button>
          <Button type="primary" onClick={() => dispatch(increment())}>
            + Increment
          </Button>
          <Button danger onClick={() => dispatch(reset())}>Reset</Button>
          <Button
            ghost
            type="primary"
            onClick={() => dispatch(fetchRequest())}
            loading={loading}
          >
            {loading ? <Spin size="small" /> : 'Fetch (saga)'}
          </Button>
        </Space>
      </Space>
    </Card>
  );
}
