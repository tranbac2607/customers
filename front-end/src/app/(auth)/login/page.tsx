'use client';

import { Suspense } from 'react';
import { LoginContent } from '@/features/auth/components/LoginContent';

/**
 * Thin page shell. The actual UI + state lives in <LoginContent>
 * inside the Suspense boundary (required by Next.js 15+ because the
 * content reads useSearchParams()).
 */
export default function LoginPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1677ff 0%, #4096ff 50%, #69b1ff 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <Suspense fallback={null}>
        <LoginContent />
      </Suspense>
    </main>
  );
}
