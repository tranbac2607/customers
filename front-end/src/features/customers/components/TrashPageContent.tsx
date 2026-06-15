'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Spin } from 'antd';
import { Card, Space, Button, Typography } from 'antd';
import { ArrowLeftOutlined, RollbackOutlined } from '@ant-design/icons';
import { toast } from 'react-toastify';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  bulkDeleteRequest,
  restoreRequest,
  trashRequest,
} from '@/store/customers/customersSlice';
import type { CustomerListQuery } from '@/store/customers/customerTypes';
import { CustomerList } from '@/features/customers/components';

const { Title, Paragraph } = Typography;

export function TrashPageContent() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const me = useAppSelector((s) => s.auth.user);
  const { items, loading, pagination } = useAppSelector((s) => s.customers.list);
  const mutationLoading = useAppSelector((s) => s.customers.mutation.loading);

  // Admins only — anyone else bounces back to the live list.
  useEffect(() => {
    if (me && me.role !== 'admin') {
      toast.error('Admin only');
      router.replace('/customers');
    }
  }, [me, router]);

  // Dispatch trash request on mount and whenever the table pages.
  const dispatchedFor = useRef<string | null>(null);
  useEffect(() => {
    if (me?.role !== 'admin') return;
    const q: CustomerListQuery = {
      page: pagination.page,
      limit: pagination.limit,
      sortBy: 'createdAt',
      order: 'desc',
    };
    const key = JSON.stringify(q);
    if (dispatchedFor.current === key) return;
    dispatchedFor.current = key;
    dispatch(trashRequest(q));
  }, [me, pagination.page, pagination.limit, dispatch]);

  if (me?.role !== 'admin') {
    // While the /me probe is still in flight the user object is
    // null and we'd otherwise render an empty tree. Show a
    // spinner so the layout doesn't shift once the probe resolves.
    if (!me) {
      return (
        <div style={{ padding: 48, textAlign: 'center' }}>
          <Spin />
        </div>
      );
    }
    return null;
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ minWidth: 0, flex: '1 1 240px' }}>
          <Title level={2} style={{ margin: 0, lineHeight: '32px' }}>
            Trash
          </Title>
          <Paragraph type="secondary" style={{ marginBottom: 0, marginTop: 4 }}>
            Soft-deleted customers. Restore to bring them back, or delete permanently to erase.
          </Paragraph>
        </div>
        <Space wrap>
          <Link href="/customers">
            <Button icon={<ArrowLeftOutlined />}>Back to customers</Button>
          </Link>
        </Space>
      </div>

      <Card styles={{ body: { padding: 16 } }}>
        <Space style={{ marginBottom: 12 }}>
          <Button
            type="primary"
            icon={<RollbackOutlined />}
            onClick={() => toast.info('Select rows in the table to bulk-restore.')}
          >
            How to restore
          </Button>
        </Space>
        <CustomerList
          items={items}
          loading={loading}
          pagination={pagination}
          mutationLoading={mutationLoading}
          trashed
          onPageChange={(p, ps) =>
            dispatch(trashRequest({ page: p, limit: ps } as CustomerListQuery))
          }
          onLimitChange={(ps) =>
            dispatch(trashRequest({ page: pagination.page, limit: ps } as CustomerListQuery))
          }
          onRestore={(id) => {
            dispatch(restoreRequest(id));
            toast.success('Customer restored');
            // Re-fetch trash to remove the row from this view.
            dispatch(
              trashRequest({ page: pagination.page, limit: pagination.limit } as CustomerListQuery),
            );
          }}
          onHardDelete={(id) => {
            // The trashed=true render uses onHardDelete to permanently
            // erase. The trash page wires the call to BE below.
            dispatch(bulkDeleteRequest([id]));
            dispatch(
              trashRequest({ page: pagination.page, limit: pagination.limit } as CustomerListQuery),
            );
          }}
        />
      </Card>
    </div>
  );
}