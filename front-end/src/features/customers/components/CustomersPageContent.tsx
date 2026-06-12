'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { Card, Space, Button, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { deleteRequest, listRequest } from '@/store/customers/customersSlice';
import type { CustomerListQuery } from '@/store/customers/customerTypes';
import {
  CustomerSearch,
  CustomerList,
  type CustomerSearchValues,
} from '@/features/customers/components';
import { useListQuery } from '@/hooks';

const { Title, Paragraph } = Typography;

const EMPTY_QUERY: CustomerSearchValues = {};

export function CustomersPageContent() {
  const dispatch = useAppDispatch();
  const { items, loading, pagination, lastQuery } = useAppSelector((s) => s.customers.list);
  const mutationLoading = useAppSelector((s) => s.customers.mutation.loading);
  const mutationError = useAppSelector((s) => s.customers.mutation.error);

  // Generic list query state (page / limit / query fields). Custom
  // hook so any future list screen (orders, transactions, …) can
  // reuse it. Sort is intentionally NOT surfaced to the UI
  // anymore — the table's sort header was a source of subtle
  // Antd bugs; the list always renders in the BE's default order
  // (createdAt desc), which the customersSlice re-applies on
  // every listRequest via the BE schema's `.default()`.
  const {
    state,
    setPage,
    setLimit,
    patchQuery,
    reset: resetQuery,
  } = useListQuery<CustomerSearchValues>(EMPTY_QUERY);

  // Separate react-hook-form instance for the search inputs. Keeping it
  // out of useListQuery means future list screens can use any form
  // library (or none) they like.
  const searchForm = useForm<CustomerSearchValues>({
    defaultValues: {
      fullName: lastQuery.fullName,
      gender: lastQuery.gender,
      phone: lastQuery.phone,
      nationality: lastQuery.nationality,
      occupation: lastQuery.occupation,
    },
  });

  // Dispatch list query whenever the committed state changes.
  // The ref guards against the first render in StrictMode.
  const dispatchedFor = useRef<string | null>(null);
  useEffect(() => {
    const key = JSON.stringify(state);
    if (dispatchedFor.current === key) return;
    dispatchedFor.current = key;
    const q: CustomerListQuery = {
      ...state.query,
      page: state.page,
      limit: state.limit,
      sortBy: state.sortBy as CustomerListQuery['sortBy'],
      order: state.order,
    };
    dispatch(listRequest(q));
  }, [state, dispatch]);

  // Toast on delete failure.
  useEffect(() => {
    if (mutationError) {
      toast.error(mutationError);
    }
  }, [mutationError]);

  // Toast on delete success — detect the loading transition.
  const prevMutationLoading = useRef(false);
  useEffect(() => {
    if (prevMutationLoading.current && !mutationLoading && !mutationError) {
      toast.success('Customer deleted');
    } else if (prevMutationLoading.current && !mutationLoading && mutationError) {
      toast.error(mutationError);
    }
    prevMutationLoading.current = mutationLoading;
  }, [mutationLoading, mutationError]);

  const handleSearch = (values: CustomerSearchValues) => {
    // Reset the form to the submitted values (so the inputs show what
    // was searched) and patch the list-query state. patchQuery creates
    // a fresh state object which re-fires the dispatch useEffect below.
    searchForm.reset(values);
    patchQuery(values);
  };

  const handleClear = () => {
    searchForm.reset(EMPTY_QUERY);
    resetQuery();
  };

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
          {/* Antd Title ships with a non-zero margin-block-end and a
              line-height tied to the heading scale; both fight
              flex-centering against the 32px button. Reset margin
              and pin line-height so the title and the button share
              a vertical center. */}
          <Title level={2} style={{ margin: 0, lineHeight: '32px' }}>
            Customers
          </Title>
          <Paragraph type="secondary" style={{ marginBottom: 0, marginTop: 4 }}>
            Manage your customer records and their identity documents.
          </Paragraph>
        </div>
        <Space wrap>
          <Link href="/customers/new">
            <Button type="primary" icon={<PlusOutlined />}>
              New customer
            </Button>
          </Link>
        </Space>
      </div>

      <Card styles={{ body: { padding: 16 } }}>
        <div style={{ marginBottom: 16 }}>
          <CustomerSearch
            control={searchForm.control}
            loading={loading}
            onSearch={handleSearch}
            onClear={handleClear}
          />
        </div>
        <CustomerList
          items={items}
          loading={loading}
          pagination={pagination}
          mutationLoading={mutationLoading}
          onPageChange={setPage}
          onLimitChange={setLimit}
          onDelete={(id) => dispatch(deleteRequest(id))}
        />
      </Card>
    </div>
  );
}
