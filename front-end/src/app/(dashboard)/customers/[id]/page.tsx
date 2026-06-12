import { CustomerDetailContent } from '@/features/customers/components/CustomerDetailContent';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CustomerDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <CustomerDetailContent id={id} />;
}
