'use client';

import { Suspense } from 'react';
import { ResetPasswordContent } from '@/features/auth/components/ResetPasswordContent';

export default function ResetPasswordPage() {
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
        <ResetPasswordContent />
      </Suspense>
    </main>
  );
}
