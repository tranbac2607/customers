'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Card,
  Table,
  Space,
  Button,
  Input,
  Tag,
  Avatar,
  Popconfirm,
  Typography,
  Select,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  ReloadOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { PAGE_SIZE_OPTIONS } from '@/lib/constants';
import {
  deleteRequest,
  listRequest,
} from '@/features/customers/customersSlice';
import type { Customer } from '@/features/customers/customerTypes';
import dayjs from 'dayjs';

const { Title, Paragraph, Text } = Typography;

export default function CustomersPage() {
  const dispatch = useAppDispatch();
  const { items, loading, pagination, lastQuery } = useAppSelector((s) => s.customers.list);
  const mutationLoading = useAppSelector((s) => s.customers.mutation.loading);

  const [search, setSearch] = useState(lastQuery.search ?? '');
  const [page, setPage] = useState(lastQuery.page);
  const [limit, setLimit] = useState(lastQuery.limit);
  const [sortBy, setSortBy] = useState(lastQuery.sortBy);
  const [order, setOrder] = useState(lastQuery.order);

  const fetchList = (overrides: Partial<typeof lastQuery> = {}) => {
    const q = {
      page: overrides.page ?? page,
      limit: overrides.limit ?? limit,
      search: overrides.search !== undefined ? overrides.search : search || undefined,
      sortBy: overrides.sortBy ?? sortBy,
      order: overrides.order ?? order,
    };
    dispatch(listRequest(q));
  };

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced search
  useEffect(() => {
    const id = setTimeout(() => {
      if ((search || '') !== (lastQuery.search || '')) {
        setPage(1);
        fetchList({ page: 1, search: search || undefined });
      }
    }, 400);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleTableChange: import('antd').TableProps<Customer>['onChange'] = (
    paginationConfig,
    _filters,
    sorter,
  ) => {
    const s = Array.isArray(sorter) ? sorter[0] : sorter;
    const newPage = paginationConfig.current ?? 1;
    const newLimit = paginationConfig.pageSize ?? limit;
    const field = typeof s?.field === 'string' ? s.field : null;
    const newSortBy = (field as typeof sortBy) ?? sortBy;
    const newOrder: typeof order = s?.order === 'ascend' ? 'asc' : 'desc';
    setPage(newPage);
    setLimit(newLimit);
    setSortBy(newSortBy);
    setOrder(newOrder);
    dispatch(listRequest({ page: newPage, limit: newLimit, search: search || undefined, sortBy: newSortBy, order: newOrder }));
  };

  const handleDelete = (id: string) => {
    dispatch(deleteRequest(id));
  };

  const columns: import('antd').TableProps<Customer>['columns'] = [
    {
      title: 'Customer',
      key: 'fullName',
      sorter: true,
      sortOrder: sortBy === 'fullName' ? (order === 'asc' ? 'ascend' : 'descend') : undefined,
      render: (_: unknown, record: Customer) => (
        <Space>
          <Avatar style={{ background: '#1677ff' }} icon={<UserOutlined />} />
          <div>
            <div style={{ fontWeight: 600 }}>{record.fullName}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>{record.email}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      width: 160,
    },
    {
      title: 'Gender',
      dataIndex: 'gender',
      key: 'gender',
      width: 100,
      render: (g: Customer['gender']) => (
        <Tag color={g === 'male' ? 'blue' : g === 'female' ? 'magenta' : 'default'}>
          {g === 'male' ? 'Male' : g === 'female' ? 'Female' : 'Other'}
        </Tag>
      ),
    },
    {
      title: 'Nationality',
      dataIndex: 'nationality',
      key: 'nationality',
      width: 140,
    },
    {
      title: 'Occupation',
      dataIndex: 'occupation',
      key: 'occupation',
      width: 160,
    },
    {
      title: 'Identity docs',
      key: 'identityDocuments',
      width: 140,
      render: (_: unknown, record: Customer) => {
        if (!record.identityDocuments?.length) return <Text type="secondary">—</Text>;
        return (
          <Space size={4} wrap>
            {record.identityDocuments.map((d) => (
              <Tag key={d.id ?? d.type} color="geekblue" style={{ fontSize: 11 }}>
                {d.type}
              </Tag>
            ))}
          </Space>
        );
      },
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 140,
      sorter: true,
      sortOrder: sortBy === 'createdAt' ? (order === 'asc' ? 'ascend' : 'descend') : undefined,
      render: (d: string) => (
        <Tooltip title={dayjs(d).format('YYYY-MM-DD HH:mm:ss')}>
          {dayjs(d).format('MMM D, YYYY')}
        </Tooltip>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 140,
      fixed: 'right' as const,
      render: (_: unknown, record: Customer) => (
        <Space size="small">
          <Tooltip title="View">
            <Link href={`/customers/${record.id}`}>
              <Button type="text" icon={<EyeOutlined />} />
            </Link>
          </Tooltip>
          <Tooltip title="Edit">
            <Link href={`/customers/${record.id}/edit`}>
              <Button type="text" icon={<EditOutlined />} />
            </Link>
          </Tooltip>
          <Popconfirm
            title="Delete this customer?"
            description="This action cannot be undone."
            onConfirm={() => handleDelete(record.id)}
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Delete">
              <Button type="text" danger icon={<DeleteOutlined />} loading={mutationLoading} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

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
        <div>
          <Title level={2} style={{ marginBottom: 4 }}>
            Customers
          </Title>
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            Manage your customer records and their identity documents.
          </Paragraph>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => fetchList()}>
            Refresh
          </Button>
          <Link href="/customers/new">
            <Button type="primary" icon={<PlusOutlined />}>
              New customer
            </Button>
          </Link>
        </Space>
      </div>

      <Card styles={{ body: { padding: 0 } }}>
        <div style={{ padding: 16, borderBottom: '1px solid #f0f0f0' }}>
          <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="Search by name, email, phone, nationality, occupation…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 360, maxWidth: '100%' }}
            />
            <Space>
              <Text type="secondary">Sort:</Text>
              <Select
                value={`${sortBy}:${order}`}
                onChange={(v) => {
                  const [s, o] = v.split(':');
                  setSortBy(s as typeof sortBy);
                  setOrder(o as typeof order);
                  setPage(1);
                  dispatch(
                    listRequest({
                      page: 1,
                      limit,
                      search: search || undefined,
                      sortBy: s as typeof sortBy,
                      order: o as typeof order,
                    }),
                  );
                }}
                options={[
                  { value: 'createdAt:desc', label: 'Newest first' },
                  { value: 'createdAt:asc', label: 'Oldest first' },
                  { value: 'fullName:asc', label: 'Name A → Z' },
                  { value: 'fullName:desc', label: 'Name Z → A' },
                  { value: 'dateOfBirth:desc', label: 'Youngest first' },
                  { value: 'dateOfBirth:asc', label: 'Oldest first' },
                ]}
                style={{ minWidth: 180 }}
              />
            </Space>
          </Space>
        </div>
        <Table<Customer>
          rowKey="id"
          dataSource={items}
          columns={columns}
          loading={loading}
          scroll={{ x: 1100 }}
          onChange={handleTableChange}
          pagination={{
            current: page,
            pageSize: limit,
            total: pagination.total,
            showSizeChanger: true,
            pageSizeOptions: PAGE_SIZE_OPTIONS.map(String),
            showTotal: (total) => `${total} customer${total !== 1 ? 's' : ''}`,
          }}
        />
      </Card>
    </div>
  );
}
