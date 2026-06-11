'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Result, Button, Alert, Space, Typography } from 'antd';

const { Paragraph } = Typography;

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Route error caught:', error);
  }, [error]);

  return (
    <Result
      status="error"
      title="Failed to load"
      subTitle="Something went wrong while loading this page."
      extra={
        <Space direction="vertical" size="middle">
          {error.digest && <Alert type="warning" message={`Error ID: ${error.digest}`} />}
          <Space>
            <Button type="primary" onClick={reset}>
              Try again
            </Button>
            <Link href="/">
              <Button>Back home</Button>
            </Link>
          </Space>
          <Paragraph type="secondary" style={{ fontSize: 12, marginTop: 8 }}>
            {error.message}
          </Paragraph>
        </Space>
      }
    />
  );
}
