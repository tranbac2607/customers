import Link from 'next/link';
import { Result, Button } from 'antd';

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f7fa',
        padding: 24,
      }}
    >
      <Result
        status="404"
        title="404"
        subTitle="The page you are looking for does not exist."
        extra={
          <Link href="/">
            <Button type="primary">Back home</Button>
          </Link>
        }
      />
    </main>
  );
}
