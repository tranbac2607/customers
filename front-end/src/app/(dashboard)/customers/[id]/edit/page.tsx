'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, Typography, Space, Button, Skeleton, Result } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { getRequest, clearCurrent, updateRequest } from '@/features/customers/customersSlice';
import { CustomerForm, CustomerFormValues } from '@/features/customers/CustomerForm';
import { toast } from 'react-toastify';
import dayjs, { Dayjs } from 'dayjs';

const { Title, Paragraph } = Typography;

export default function EditCustomerPage() {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { item, loading: getLoading, error: getError } = useAppSelector((s) => s.customers.current);
  const { loading: updateLoading, error: updateError } = useAppSelector((s) => s.customers.mutation);
  const lastUpdatedId = useAppSelector((s) => s.customers.list.items.find((c) => c.id === id)?.id);

  useEffect(() => {
    if (id) dispatch(getRequest(id));
    return () => {
      dispatch(clearCurrent());
    };
  }, [id, dispatch]);

  // Watch for successful update (compare updatedAt)
  const updatedAt = item?.updatedAt;
  useEffect(() => {
    if (updateLoading) {
      // wait
    } else if (!updateError && lastUpdatedId && updatedAt) {
      const updated = lastUpdatedId && item && item.id === lastUpdatedId;
      if (updated && !updateLoading) {
        toast.success('Customer updated');
        router.push(`/customers/${id}`);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateLoading]);

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
          error={updateError}
        />
      </Card>
    </div>
  );
}
