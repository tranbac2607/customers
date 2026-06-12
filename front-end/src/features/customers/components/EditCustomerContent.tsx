'use client';

import { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, Typography, Button, Skeleton } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { toast } from 'react-toastify';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { getRequest, resetCurrent, updateRequest } from '@/store/customers/customersSlice';
import type { CustomerFormValues } from '@/features/customers/components/CustomerForm';
import dayjs, { Dayjs } from 'dayjs';

const { Title, Paragraph } = Typography;

// CustomerForm pulls in react-hook-form + zodResolver; its module graph
// is fragile under Turbopack's prerender pass. Load it client-side only.
const CustomerForm = dynamic(
  () => import('@/features/customers/components/CustomerForm').then((m) => m.CustomerForm),
  { ssr: false, loading: () => <Card loading style={{ minHeight: 400 }} /> },
);

interface EditCustomerContentProps {
  id: string;
}

export function EditCustomerContent({ id }: EditCustomerContentProps) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { item, loading: getLoading, error: getError } = useAppSelector((s) => s.customers.current);
  const { loading: updateLoading, error: updateError } = useAppSelector(
    (s) => s.customers.mutation,
  );

  const fetchInitiated = useRef(false);

  // Fetch on mount - id is guaranteed to be available since page is async
  useEffect(() => {
    fetchInitiated.current = true;
    dispatch(getRequest(id));
    return () => {
      dispatch(resetCurrent());
    };
  }, [id, dispatch]);

  // Detect transition: updateLoading true -> false = dispatch finished
  const prevUpdateLoading = useRef(false);
  useEffect(() => {
    if (prevUpdateLoading.current && !updateLoading && !updateError) {
      toast.success('Customer updated');
      router.push('/customers');
    } else if (prevUpdateLoading.current && !updateLoading && updateError) {
      toast.error(updateError);
    }
    prevUpdateLoading.current = updateLoading;
  }, [updateLoading, updateError, router]);

  if (getLoading && !item) {
    return <Skeleton active paragraph={{ rows: 8 }} />;
  }

  if (getError && !item) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <Title level={3} style={{ marginBottom: 8 }}>
          Failed to load customer
        </Title>
        <Paragraph type="secondary" style={{ marginBottom: 24 }}>
          {getError}
        </Paragraph>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <Button onClick={() => dispatch(getRequest(id))}>Try again</Button>
          <Link href="/customers">Back to list</Link>
        </div>
      </div>
    );
  }

  if (!item) {
    return <CustomerNotFound />;
  }

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
    dispatch(updateRequest({ id, data: payload }));
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <Link href={`/customers/${id}`}>
          <Button type="text" icon={<ArrowLeftOutlined />}>
            Back
          </Button>
        </Link>
        <Title level={2} style={{ margin: 0 }}>
          Edit customer
        </Title>
      </div>

      <Card>
        <CustomerForm
          mode="edit"
          initial={item}
          onSubmit={handleSubmit}
          loading={updateLoading}
          error={null}
        />
      </Card>
    </div>
  );
}

function CustomerNotFound() {
  const titleStyle = { marginBottom: 8 };
  const paragraphStyle = { marginBottom: 24 };
  return (
    <div>
      <Title level={3} style={titleStyle}>
        Customer not found
      </Title>
      <Paragraph type="secondary" style={paragraphStyle}>
        The customer you&apos;re looking for doesn&apos;t exist.
      </Paragraph>
      <Link href="/customers">Back to list</Link>
    </div>
  );
}
