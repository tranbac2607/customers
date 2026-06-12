'use client';

import { Table, Tag, Avatar, Tooltip, Space, Button, Popconfirm } from 'antd';
import { EyeOutlined, EditOutlined, DeleteOutlined, UserOutlined } from '@ant-design/icons';
import Link from 'next/link';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { PAGE_SIZE_OPTIONS } from '@/lib/constants';
import { IDENTITY_DOCUMENT_LABELS, type Customer } from '@/store/customers/customerTypes';
import type { PaginationMeta } from '@/types/api';
import { truncateFullName } from '@/features/customers/utils';

interface CustomerListProps {
  items: Customer[];
  loading?: boolean;
  pagination: PaginationMeta;
  mutationLoading?: boolean;
  onPageChange: (page: number, pageSize: number) => void;
  onLimitChange: (pageSize: number) => void;
  onDelete: (id: string) => void;
}

export function CustomerList({
  items,
  loading,
  pagination,
  mutationLoading,
  onPageChange,
  onLimitChange,
  onDelete,
}: CustomerListProps) {
  const columns: ColumnsType<Customer> = [
    {
      title: 'Customer',
      key: 'fullName',
      render: (_, record) => (
        <Space>
          <Avatar style={{ background: '#1677ff' }} icon={<UserOutlined />} />
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontWeight: 600,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={record.fullName}
            >
              {truncateFullName(record.fullName)}
            </div>
            <span style={{ fontSize: 12, color: '#8c8c8c' }}>{record.email}</span>
          </div>
        </Space>
      ),
    },
    { title: 'Phone', dataIndex: 'phone', key: 'phone', width: 160 },
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
    { title: 'Nationality', dataIndex: 'nationality', key: 'nationality', width: 140 },
    { title: 'Occupation', dataIndex: 'occupation', key: 'occupation', width: 160 },
    {
      title: 'Identity docs',
      key: 'identityDocuments',
      width: 140,
      render: (_, record) => {
        if (!record.identityDocuments?.length) {
          return <span style={{ color: '#8c8c8c' }}>—</span>;
        }
        return (
          <Space size={4} wrap>
            {record.identityDocuments.map((d) => (
              <Tag key={d.id ?? d.type} color="geekblue" style={{ fontSize: 11 }}>
                {IDENTITY_DOCUMENT_LABELS[d.type] ?? d.type}
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
      fixed: 'right',
      render: (_, record) => (
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
            onConfirm={() => onDelete(record.id)}
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
    <Table<Customer>
      rowKey="id"
      dataSource={items}
      columns={columns}
      loading={loading}
      scroll={{ x: 900 }}
      onChange={(paginationConfig) => {
        if (paginationConfig.current) {
          onPageChange(paginationConfig.current, paginationConfig.pageSize ?? pagination.limit);
        }
      }}
      pagination={{
        current: pagination.page,
        pageSize: pagination.limit,
        total: pagination.total,
        showSizeChanger: true,
        pageSizeOptions: PAGE_SIZE_OPTIONS.map(String),
        showTotal: (total) => `${total} customer${total !== 1 ? 's' : ''}`,
        onShowSizeChange: (_current: number, pageSize: number) => {
          onLimitChange(pageSize);
        },
      }}
    />
  );
}
