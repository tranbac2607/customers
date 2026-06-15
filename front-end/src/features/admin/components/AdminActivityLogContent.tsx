'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  Tag,
  Button,
  Space,
  Input,
  Select,
  Card,
  Typography,
  Tooltip,
  message,
} from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { useAppSelector } from '@/store/hooks';
import { api } from '@/lib/axios';
import type { ApiResponse, PaginationMeta } from '@/types/api';

const { Title, Paragraph } = Typography;

interface ActivityLogItem {
  _id: string;
  userId?: string;
  action: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

interface ActivityLogResponse {
  items: ActivityLogItem[];
  pagination: PaginationMeta;
}

const ACTION_OPTIONS = [
  { value: 'auth.login', label: 'Login' },
  { value: 'auth.logout', label: 'Logout' },
  { value: 'auth.refresh', label: 'Refresh token' },
  { value: 'auth.register', label: 'Register' },
  { value: 'auth.verify_email', label: 'Verify email' },
  { value: 'auth.change_password', label: 'Change password' },
  { value: 'auth.reset_password', label: 'Reset password' },
  { value: 'user.create', label: 'User create' },
  { value: 'user.update_profile', label: 'User update' },
  { value: 'user.set_role', label: 'Role change' },
  { value: 'user.set_status', label: 'Status change' },
  { value: 'user.avatar_upload', label: 'Avatar upload' },
  { value: 'user.delete', label: 'User delete' },
  { value: 'customer.create', label: 'Customer create' },
  { value: 'customer.update', label: 'Customer update' },
  { value: 'customer.soft_delete', label: 'Customer delete' },
  { value: 'customer.bulk_delete', label: 'Customer bulk delete' },
];

const ACTION_COLORS: Record<string, string> = {
  'auth.login': 'green',
  'auth.logout': 'default',
  'auth.register': 'blue',
  'auth.verify_email': 'cyan',
  'auth.change_password': 'orange',
  'auth.reset_password': 'orange',
  'user.create': 'geekblue',
  'user.set_role': 'gold',
  'user.set_status': 'gold',
  'user.delete': 'red',
  'customer.create': 'green',
  'customer.update': 'blue',
  'customer.soft_delete': 'red',
  'customer.bulk_delete': 'red',
};

export function AdminActivityLogContent() {
  const router = useRouter();
  const me = useAppSelector((s) => s.auth.user);
  const [items, setItems] = useState<ActivityLogItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState('');
  const [action, setAction] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const isAdmin = me?.role === 'admin';

  useEffect(() => {
    if (me && !isAdmin) {
      message.error('Admin only');
      router.replace('/customers');
    }
  }, [me, isAdmin, router]);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (userId) params.set('userId', userId);
      if (action) params.set('action', action);
      const res = await api.get<ApiResponse<ActivityLogResponse>>(
        `/activity-log?${params.toString()}`,
      );
      if (res.data.success) {
        setItems(res.data.data.items);
        setPagination(res.data.data.pagination);
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
      message.error(e.response?.data?.error?.message ?? e.message ?? 'Failed to load activity log');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, action, isAdmin]);

  const onSearch = () => {
    setPage(1);
    load();
  };

  if (!isAdmin) return null;

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      <Title level={2}>Activity log</Title>
      <Paragraph type="secondary">
        Every meaningful action — logins, CRUD, role changes — is recorded here with the
        acting user, IP, and timestamp.
      </Paragraph>

      <Card>
        <Space style={{ marginBottom: 16 }} wrap>
          <Input
            prefix={<SearchOutlined />}
            placeholder="Filter by user ID"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            onPressEnter={onSearch}
            style={{ width: 260 }}
            allowClear
          />
          <Select
            placeholder="Action"
            value={action}
            onChange={setAction}
            allowClear
            style={{ width: 220 }}
            options={ACTION_OPTIONS}
          />
          <Button icon={<SearchOutlined />} type="primary" onClick={onSearch}>
            Search
          </Button>
          <Button icon={<ReloadOutlined />} onClick={load}>
            Refresh
          </Button>
        </Space>

        <Table
          rowKey="_id"
          loading={loading}
          dataSource={items}
          scroll={{ x: 900 }}
          pagination={{
            current: pagination?.page ?? page,
            pageSize: pagination?.limit ?? limit,
            total: pagination?.total ?? 0,
            showSizeChanger: true,
            pageSizeOptions: [20, 50, 100, 200],
            onChange: (p, ps) => {
              setPage(p);
              setLimit(ps);
            },
            showTotal: (total) => `${total} entries`,
          }}
          columns={[
            {
              title: 'When',
              dataIndex: 'createdAt',
              key: 'createdAt',
              width: 180,
              render: (d: string) => new Date(d).toLocaleString(),
            },
            {
              title: 'Action',
              dataIndex: 'action',
              key: 'action',
              width: 200,
              render: (a: string) => (
                <Tag color={ACTION_COLORS[a] ?? 'default'}>{a}</Tag>
              ),
            },
            {
              title: 'User',
              dataIndex: 'userId',
              key: 'userId',
              width: 220,
              render: (id: string | undefined) =>
                id ? <code style={{ fontSize: 12 }}>{id}</code> : '—',
            },
            {
              title: 'IP',
              dataIndex: 'ip',
              key: 'ip',
              width: 140,
              render: (ip: string | undefined) => ip ?? '—',
            },
            {
              title: 'Metadata',
              dataIndex: 'metadata',
              key: 'metadata',
              render: (m: Record<string, unknown> | undefined) =>
                m && Object.keys(m).length > 0 ? (
                  <Tooltip title={JSON.stringify(m, null, 2)}>
                    <code style={{ fontSize: 11 }}>{JSON.stringify(m)}</code>
                  </Tooltip>
                ) : (
                  '—'
                ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
