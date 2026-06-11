'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Result, Button, Typography, Space, Alert } from 'antd';

const { Paragraph } = Typography;

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to monitoring service (Sentry, etc.) in production
    console.error('Global error caught:', error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          background: '#f5f7fa',
        }}
      >
        <main
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <Result
            status="error"
            title="Something went wrong"
            subTitle="An unexpected error occurred. Please try again."
            extra={
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                {error.digest && (
                  <Alert
                    type="warning"
                    message={`Error ID: ${error.digest}`}
                    showIcon
                    style={{ maxWidth: 480 }}
                  />
                )}
                <Space>
                  <Button type="primary" onClick={reset}>
                    Try again
                  </Button>
                  <Link href="/">
                    <Button>Back home</Button>
                  </Link>
                </Space>
                <Paragraph type="secondary" style={{ marginTop: 16, fontSize: 12 }}>
                  {error.message}
                </Paragraph>
              </Space>
            }
          />
        </main>
      </body>
    </html>
  );
}
