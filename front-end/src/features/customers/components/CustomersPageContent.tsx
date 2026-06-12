'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { Card, Space, Button, Typography } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
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

  // Generic list query state (page / limit / sort / query fields).
  // Custom hook so any future list screen (orders, transactions, …)
  // can reuse it.
  const {
    state,
    setPage,
    setLimit,
    setSort,
    patchQuery,
    reset: resetQuery,
  } = useListQuery<CustomerSearchValues>(EMPTY_QUERY, {
    defaultSortBy: lastQuery.sortBy,
    defaultOrder: lastQuery.order,
  });

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
          alignItems: 'flex-start',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ minWidth: 0, flex: '1 1 240px' }}>
          <Title level={2} style={{ marginBottom: 4 }}>
            Customers
          </Title>
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            Manage your customer records and their identity documents.
          </Paragraph>
        </div>
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={() => patchQuery({ ...state.query })}>
            Refresh
          </Button>
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
          onSortChange={setSort}
          currentSortBy={state.sortBy}
          currentOrder={state.order}
        />
      </Card>
    </div>
  );
}
