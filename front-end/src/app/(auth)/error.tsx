'use client';

import Link from 'next/link';
import { Result, Button } from 'antd';

export default function AuthError() {
  return (
    <Result
      status="error"
      title="Authentication error"
      subTitle="Could not load the authentication page."
      extra={
        <Link href="/">
          <Button type="primary">Back home</Button>
        </Link>
      }
    />
  );
}
