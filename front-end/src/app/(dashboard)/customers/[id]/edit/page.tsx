import { EditCustomerContent } from '@/features/customers/components/EditCustomerContent';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCustomerPage({ params }: PageProps) {
  const { id } = await params;
  return <EditCustomerContent id={id} />;
}
