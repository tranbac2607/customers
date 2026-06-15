'use client';

import { Suspense } from 'react';
import { ForgotPasswordContent } from '@/features/auth/components/ForgotPasswordContent';

export default function ForgotPasswordPage() {
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
        <ForgotPasswordContent />
      </Suspense>
    </main>
  );
}
