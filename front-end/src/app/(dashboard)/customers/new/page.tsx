'use client';

import { useEffect } from 'react';
import { Card, Typography, Space, Button } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { createRequest } from '@/features/customers/customersSlice';
import { CustomerForm, CustomerFormValues } from '@/features/customers/CustomerForm';
import dayjs, { Dayjs } from 'dayjs';

const { Title, Paragraph } = Typography;

export default function NewCustomerPage() {
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector((s) => s.customers.mutation);

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

  // After successful create, navigate to detail
  const lastCreated = useAppSelector((s) => s.customers.list.items[0]);
  useEffect(() => {
    if (!loading && !error && lastCreated) {
      // detect transition: if lastCreated was just created, push
    }
  }, [loading, error, lastCreated]);

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
        Fill in the customer's personal information and add at least one identity document (optional).
      </Paragraph>

      <Card>
        <CustomerForm
          mode="create"
          onSubmit={handleSubmit}
          loading={loading}
          error={error}
        />
      </Card>
    </div>
  );
}
