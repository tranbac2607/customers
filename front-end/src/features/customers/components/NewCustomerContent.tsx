'use client';

import { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Card, Typography, Space, Button } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { createRequest } from '@/store/customers/customersSlice';
import type { CustomerFormValues } from '@/features/customers/components/CustomerForm';
import dayjs, { Dayjs } from 'dayjs';

const { Title, Paragraph } = Typography;

// CustomerForm pulls in react-hook-form + zodResolver; its module graph
// is fragile under Turbopack's prerender pass. Load it client-side only.
const CustomerForm = dynamic(
  () => import('@/features/customers/components/CustomerForm').then((m) => m.CustomerForm),
  { ssr: false, loading: () => <Card loading style={{ minHeight: 400 }} /> },
);

export function NewCustomerContent() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { loading, error } = useAppSelector((s) => s.customers.mutation);

  // Detect transition: loading true -> false = dispatch finished
  const prevLoading = useRef(false);
  useEffect(() => {
    if (prevLoading.current && !loading && !error) {
      toast.success('Customer created');
      router.push('/customers');
    } else if (prevLoading.current && !loading && error) {
      toast.error(error);
    }
    prevLoading.current = loading;
  }, [loading, error, router]);

  const handleSubmit = (values: CustomerFormValues) => {
    const payload = {
      fullName: values.fullName,
      address: values.address,
      phone: values.phone,
      email: values.email,
      gender: values.gender,
      nationality: values.nationality,
      occupation: values.occupation,
      dateOfBirth: dayjs(values.dateOfBirth as Dayjs).toISOString(),
      identityDocuments: (values.identityDocuments ?? []).map((d) => ({
        type: d.type,
        number: d.number,
        issueDate: dayjs(d.issueDate as Dayjs).toISOString(),
        issuePlace: d.issuePlace,
      })),
    };
    dispatch(createRequest(payload));
  };

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Link href="/customers">
          <Button type="text" icon={<ArrowLeftOutlined />}>
            Back to customers
          </Button>
        </Link>
      </Space>
      <Title level={2} style={{ marginBottom: 4 }}>
        New customer
      </Title>
      <Paragraph type="secondary">
        Fill in the customer&apos;s personal information and add at least one identity document.
      </Paragraph>

      <Card>
        <CustomerForm mode="create" onSubmit={handleSubmit} loading={loading} error={null} />
      </Card>
    </div>
  );
}
