'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  Tag,
  Avatar,
  Button,
  Space,
  Input,
  Select,
  Modal,
  Form,
  Popconfirm,
  Spin,
  message,
  Card,
  Typography,
  Tooltip,
} from 'antd';
import {
  UserOutlined,
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  EditOutlined,
  StopOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { useAppSelector } from '@/store/hooks';
import { api } from '@/lib/axios';
import type { ApiResponse, PaginationMeta } from '@/types/api';
import type { UserResponse } from '@/store/auth/authTypes';

const { Title, Paragraph } = Typography;

interface UsersListResponse {
  items: UserResponse[];
  pagination: PaginationMeta;
}

interface NewUserValues {
  email: string;
  username: string;
  password: string;
  name: string;
  role: 'admin' | 'user';
}

export function AdminUsersContent() {
  const router = useRouter();
  const me = useAppSelector((s) => s.auth.user);
  const [items, setItems] = useState<UserResponse[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  // The admin user-management screen is for managing regular
  // accounts. Admin accounts are seeded via the BE migration and
  // intentionally not editable from the UI, so the role filter
  // is pinned to "user" on mount. The admin chip is still
  // rendered when one happens to be in the result (eg searched by
  // email), but no actions are wired up for them.
  const [roleFilter, setRoleFilter] = useState<string | undefined>('user');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [newUserOpen, setNewUserOpen] = useState(false);
  const [editing, setEditing] = useState<UserResponse | null>(null);
  const [newUserForm] = Form.useForm<NewUserValues>();
  const [editForm] = Form.useForm<Partial<UserResponse>>();

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
      if (search) params.set('search', search);
      if (roleFilter) params.set('role', roleFilter);
      if (statusFilter) params.set('status', statusFilter);
      const res = await api.get<ApiResponse<UsersListResponse>>(
        `/users?${params.toString()}`,
      );
      if (res.data.success) {
        setItems(res.data.data.items);
        setPagination(res.data.data.pagination);
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
      message.error(e.response?.data?.error?.message ?? e.message ?? 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, roleFilter, statusFilter, isAdmin]);

  const onSearch = () => {
    setPage(1);
    load();
  };

  const onCreateUser = async (values: NewUserValues) => {
    try {
      const res = await api.post<ApiResponse<{ user: UserResponse }>>('/users', values);
      if (res.data.success) {
        message.success('User created');
        setNewUserOpen(false);
        newUserForm.resetFields();
        load();
      } else {
        message.error(res.data.error.message);
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
      message.error(e.response?.data?.error?.message ?? e.message ?? 'Failed to create user');
    }
  };

  const onUpdateUser = async (id: string, values: Partial<UserResponse>) => {
    try {
      const res = await api.patch<ApiResponse<{ user: UserResponse }>>(
        `/users/${id}`,
        values,
      );
      if (res.data.success) {
        message.success('User updated');
        setEditing(null);
        load();
      } else {
        message.error(res.data.error.message);
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
      message.error(e.response?.data?.error?.message ?? e.message ?? 'Failed to update user');
    }
  };

  const onSetStatus = async (id: string, status: 'active' | 'disabled') => {
    try {
      const res = await api.post<ApiResponse<{ user: UserResponse }>>(
        `/users/${id}/status`,
        { status },
      );
      if (res.data.success) {
        message.success(`User ${status === 'active' ? 'activated' : 'disabled'}`);
        load();
      } else {
        message.error(res.data.error.message);
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
      message.error(e.response?.data?.error?.message ?? e.message ?? 'Failed');
    }
  };

  const onDelete = async (id: string) => {
    try {
      const res = await api.delete<ApiResponse<unknown>>(`/users/${id}`);
      if (res.data.success || res.status === 204) {
        message.success('User deleted');
        load();
      } else {
        message.error(res.data.error.message);
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
      message.error(e.response?.data?.error?.message ?? e.message ?? 'Failed to delete');
    }
  };

  if (!isAdmin) {
    // While the /me probe is still in flight the user object is
    // null and we'd otherwise render an empty tree (the dashboard
    // route would briefly show a blank page). Show a spinner so
    // the layout doesn't shift once the probe resolves.
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
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      <Title level={2}>User management</Title>
      <Paragraph type="secondary">Manage regular user accounts. Admin accounts are seeded via the BE and not editable from here.</Paragraph>

      <Card>
        <Space style={{ marginBottom: 16 }} wrap>
          <Input
            prefix={<SearchOutlined />}
            placeholder="Search by name, email, or username"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onPressEnter={onSearch}
            style={{ width: 280 }}
            allowClear
          />
          {/* The role filter is intentionally hidden on the
              toolbar: this screen only manages regular user
              accounts. Admin accounts are seeded via the BE and
              intentionally not editable from here. */}
          <Select
            placeholder="Status"
            value={statusFilter}
            onChange={setStatusFilter}
            allowClear
            style={{ width: 140 }}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'pending', label: 'Pending' },
              { value: 'disabled', label: 'Disabled' },
            ]}
          />
          <Button icon={<SearchOutlined />} type="primary" onClick={onSearch}>
            Search
          </Button>
          <Button icon={<ReloadOutlined />} onClick={load}>
            Refresh
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setNewUserOpen(true)}
          >
            New user
          </Button>
        </Space>

        <Table
          rowKey="id"
          loading={loading}
          dataSource={items}
          scroll={{ x: 900 }}
          pagination={{
            current: pagination?.page ?? page,
            pageSize: pagination?.limit ?? limit,
            total: pagination?.total ?? 0,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50, 100],
            onChange: (p, ps) => {
              setPage(p);
              setLimit(ps);
            },
            showTotal: (total) => `${total} user${total !== 1 ? 's' : ''}`,
          }}
          columns={[
            {
              title: 'User',
              key: 'user',
              render: (_, record: UserResponse) => (
                <Space>
                  <Avatar
                    src={record.avatarUrl}
                    icon={!record.avatarUrl ? <UserOutlined /> : undefined}
                    style={{ background: '#1677ff' }}
                  />
                  <div>
                    <div style={{ fontWeight: 600 }}>{record.name}</div>
                    <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                      @{record.username}
                      {record.emailVerified && (
                        <Tooltip title="Email verified">
                          <CheckCircleOutlined
                            style={{ marginLeft: 6, color: '#52c41a' }}
                          />
                        </Tooltip>
                      )}
                    </div>
                  </div>
                </Space>
              ),
            },
            {
              title: 'Email',
              dataIndex: 'email',
              key: 'email',
            },
            {
              title: 'Role',
              dataIndex: 'role',
              key: 'role',
              width: 100,
              render: (r: string) => (
                <Tag color={r === 'admin' ? 'gold' : 'blue'}>{r}</Tag>
              ),
            },
            {
              title: 'Status',
              dataIndex: 'status',
              key: 'status',
              width: 110,
              render: (s: string) => {
                const color = s === 'active' ? 'green' : s === 'pending' ? 'gold' : 'red';
                return <Tag color={color}>{s}</Tag>;
              },
            },
            {
              title: 'Created',
              dataIndex: 'createdAt',
              key: 'createdAt',
              width: 140,
              render: (d: string) => new Date(d).toLocaleDateString(),
            },
            {
              title: 'Actions',
              key: 'actions',
              width: 180,
              render: (_, record: UserResponse) => {
                // Admin accounts are seeded via the BE migration and
                // intentionally not editable from this UI — no
                // delete, no role change, no disable. Just edit
                // name/email/status.
                const isAdminRow = record.role === 'admin';
                return (
                  <Space size="small">
                    <Tooltip title="Edit">
                      <Button
                        type="text"
                        icon={<EditOutlined />}
                        onClick={() => {
                          setEditing(record);
                          editForm.setFieldsValue({
                            name: record.name,
                            email: record.email,
                            // The role field is hidden in the Edit
                            // modal when editing an admin, but the
                            // value still gets submitted as-is so
                            // we keep the current role here.
                            role: record.role,
                            status: record.status,
                          });
                        }}
                      />
                    </Tooltip>
                    {isAdminRow ? (
                      <Tooltip title="Admin accounts cannot be disabled from here">
                        <Button type="text" danger icon={<StopOutlined />} disabled />
                      </Tooltip>
                    ) : record.status === 'active' ? (
                      <Tooltip title="Disable">
                        <Button
                          type="text"
                          danger
                          icon={<StopOutlined />}
                          onClick={() => onSetStatus(record.id, 'disabled')}
                        />
                      </Tooltip>
                    ) : (
                      <Tooltip title="Activate">
                        <Button
                          type="text"
                          icon={<CheckCircleOutlined />}
                          onClick={() => onSetStatus(record.id, 'active')}
                        />
                      </Tooltip>
                    )}
                    {isAdminRow ? (
                      <Tooltip title="Admin accounts cannot be deleted from here">
                        <Button type="text" danger icon={<DeleteOutlined />} disabled />
                      </Tooltip>
                    ) : (
                      <Popconfirm
                        title="Delete this user?"
                        description="This action cannot be undone."
                        okText="Delete"
                        okButtonProps={{ danger: true }}
                        onConfirm={() => onDelete(record.id)}
                      >
                        <Button type="text" danger icon={<DeleteOutlined />} />
                      </Popconfirm>
                    )}
                  </Space>
                );
              },
            },
          ]}
        />
      </Card>

      <Modal
        title="New user"
        open={newUserOpen}
        onCancel={() => setNewUserOpen(false)}
        onOk={() => newUserForm.submit()}
        okText="Create"
        destroyOnClose
      >
        <Form
          form={newUserForm}
          layout="vertical"
          onFinish={onCreateUser}
          initialValues={{ role: 'user' }}
        >
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: 'Email is required' },
              { type: 'email', message: 'Invalid email' },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="Username"
            name="username"
            rules={[
              { required: true, message: 'Username is required' },
              { min: 3, max: 32, message: '3–32 characters' },
              { pattern: /^[a-zA-Z0-9_.-]+$/, message: 'Letters, numbers, _, ., - only' },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="Full name"
            name="name"
            rules={[{ required: true, message: 'Name is required' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="Temporary password"
            name="password"
            rules={[
              { required: true, message: 'Password is required' },
              { min: 8, message: 'At least 8 characters' },
              { pattern: /[A-Za-z]/, message: 'Must contain a letter' },
              { pattern: /[0-9]/, message: 'Must contain a number' },
              { pattern: /[^A-Za-z0-9]/, message: 'Must contain a special character' },
            ]}
            extra="The user can change this after first login."
          >
            <Input.Password />
          </Form.Item>
          {/* Role is hidden here — this screen creates regular user
              accounts only. Admin accounts are created via the BE
              seed/migration. */}
          <Form.Item name="role" hidden initialValue="user">
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`Edit user: ${editing?.name ?? ''}`}
        open={editing !== null}
        onCancel={() => setEditing(null)}
        onOk={() => editForm.submit()}
        okText="Save"
        destroyOnClose
      >
        <Form form={editForm} layout="vertical" onFinish={(v) => editing && onUpdateUser(editing.id, v)}>
          <Form.Item label="Name" name="name">
            <Input />
          </Form.Item>
          <Form.Item label="Email" name="email" rules={[{ type: 'email', message: 'Invalid email' }]}>
            <Input />
          </Form.Item>
          {/* Role is read-only on the Edit modal — admins stay
              admins, users stay users, no escalation from this UI.
              Show as a Tag instead of a Select so it's obvious the
              field isn't editable. The hidden Form.Item still
              submits the unchanged role so the BE PATCH is a
              no-op for that field. */}
          <Form.Item label="Role" name="role" hidden>
            <Input />
          </Form.Item>
          <Form.Item label="Role">
            <Tag color={editing?.role === 'admin' ? 'gold' : 'blue'}>
              {editing?.role ?? '—'}
            </Tag>
          </Form.Item>
          <Form.Item label="Status" name="status">
            <Select
              options={[
                { value: 'active', label: 'Active' },
                { value: 'pending', label: 'Pending' },
                { value: 'disabled', label: 'Disabled' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
