import type { ReactNode } from 'react';
import { DashboardLayoutContent } from '@/features/dashboard/components/DashboardLayoutContent';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <DashboardLayoutContent>{children}</DashboardLayoutContent>;
}
