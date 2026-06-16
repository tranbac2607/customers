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
  DatePicker,
} from 'antd';
import { SearchOutlined, ReloadOutlined, ClearOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import { useAppSelector } from '@/store/hooks';
import { api } from '@/lib/axios';
import type { ApiResponse, PaginationMeta } from '@/types/api';

const { Title, Paragraph } = Typography;
const { RangePicker } = DatePicker;

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
  /** [from, to] as Dayjs objects, or null when no range filter is set. */
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
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
      // Send full ISO datetime so the BE can apply the user's exact
      // hour:minute bounds. The RangePicker defaults to 00:00 for
      // `from` and 23:59 for `to`, so users who don't touch the time
      // still get whole-day semantics — and the BE's old end-of-day
      // snap (for clients that send date-only strings) still works
      // as a fallback.
      if (dateRange) {
        const [from, to] = dateRange;
        if (from) params.set('from', from.toISOString());
        if (to) params.set('to', to.toISOString());
      }
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
  }, [page, limit, action, isAdmin, dateRange]);

  const onSearch = () => {
    setPage(1);
    load();
  };

  /**
   * Reset every filter back to its empty state and jump back to page
   * 1. The load effect picks up the new state automatically, so the
   * table re-fetches the unfiltered list — no need to call `load`
   * explicitly here.
   */
  const onClearFilters = () => {
    setUserId('');
    setAction(undefined);
    setDateRange(null);
    setPage(1);
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
          <RangePicker
            value={dateRange}
            // Dayjs[] is what RangePicker.onChange gives us, but the
            // empty state is `null` (not `[null, null]`). Normalize
            // here so the state type stays clean.
            onChange={(values) => setDateRange(values as [Dayjs | null, Dayjs | null] | null)}
            // Setting the date range auto-fires the load effect
            // (dateRange is in the dep list), so no need to also
            // call onSearch. Also: when either bound is cleared the
            // effect re-runs with `dateRange === null`, removing the
            // filter.
            allowEmpty={[true, true]}
            placeholder={['From', 'To']}
            // `showTime` makes the picker include hour:minute
            // selectors. Default values: from=00:00, to=23:59 — so
            // users who don't touch the time still get the same
            // "whole day" semantics as before.
            showTime={{ defaultValue: [dayjs('00:00:00', 'HH:mm:ss'), dayjs('23:59:59', 'HH:mm:ss')] }}
            format="YYYY-MM-DD HH:mm"
            // Cap the range at 1 year to avoid pathological queries
            // that the BE would happily serve but that would dump
            // tens of thousands of rows into the table.
            disabledDate={(current) => {
              if (!current) return false;
              if (dateRange?.[0] && current.isBefore(dateRange[0], 'day')) return true;
              if (dateRange?.[1] && current.isAfter(dateRange[1], 'day')) return true;
              // Don't allow picking more than 1 year out — there is
              // no useful audit data that old in this demo, and
              // unbounded ranges are slow.
              const oneYearAgo = dayjs().subtract(1, 'year').startOf('day');
              const oneYearAhead = dayjs().add(1, 'year').endOf('day');
              return current.isBefore(oneYearAgo) || current.isAfter(oneYearAhead);
            }}
          />
          <Button icon={<SearchOutlined />} type="primary" onClick={onSearch}>
            Search
          </Button>
          <Button icon={<ClearOutlined />} onClick={onClearFilters} disabled={!userId && !action && !dateRange}>
            Clear
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
