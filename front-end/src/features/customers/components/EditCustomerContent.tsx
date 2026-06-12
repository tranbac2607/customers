'use client';

import { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, Typography, Space, Button, Skeleton, Result } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { toast } from 'react-toastify';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { getRequest, clearCurrent, updateRequest } from '@/store/customers/customersSlice';
import type { CustomerFormValues } from '@/features/customers/components/CustomerForm';
import dayjs, { Dayjs } from 'dayjs';

const { Title, Paragraph } = Typography;

const CustomerForm = dynamic(
  () => import('@/features/customers/components/CustomerForm').then((m) => m.CustomerForm),
  { ssr: false, loading: () => <Card loading style={{ minHeight: 400 }} /> },
);

export function EditCustomerContent() {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { item, loading: getLoading, error: getError } = useAppSelector((s) => s.customers.current);
  const { loading: updateLoading, error: updateError } = useAppSelector(
    (s) => s.customers.mutation,
  );

  useEffect(() => {
    fetchInitiated.current = true;
    if (id) dispatch(getRequest(id));
    return () => {
      dispatch(clearCurrent());
      fetchInitiated.current = false;
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

  // Block rendering until the first fetch has been initiated. Without
  // this, the very first render would see loading=false (stale from the
  // previous page) and item=null, fall through to the 404 branch, and
  // hit `item.fullName` below, throwing a TypeError caught by error.tsx
  // (which the user saw as "Failed to load"). Showing a skeleton on
  // first mount is both correct and friendlier.
  const fetchInitiated = useRef(false);

  if (!fetchInitiated.current) {
    return <Skeleton active paragraph={{ rows: 8 }} />;
  }

  if (getLoading && !item) {
    return <Skeleton active paragraph={{ rows: 8 }} />;
  }

  if (getError && !item) {
    return (
      <Result
        status="error"
        title="Failed to load customer"
        subTitle={getError}
        extra={
          <Link href="/customers">
            <Button type="primary">Back to list</Button>
          </Link>
        }
      />
    );
  }

  if (!item) {
    return (
      <Result
        status="404"
        title="Customer not found"
        extra={
          <Link href="/customers">
            <Button type="primary">Back to list</Button>
          </Link>
        }
      />
    );
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
    dispatch(updateRequest({ id: id!, data: payload }));
  };

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Link href={`/customers/${id}`}>
          <Button type="text" icon={<ArrowLeftOutlined />}>
            Back to detail
          </Button>
        </Link>
      </Space>
      <Title level={2} style={{ marginBottom: 4 }}>
        Edit customer
      </Title>
      <Paragraph type="secondary">{item.fullName}</Paragraph>

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
