'use client';

import { useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  Descriptions,
  Tag,
  Typography,
  Space,
  Button,
  Skeleton,
  Result,
  Row,
  Col,
  Empty,
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
  MailOutlined,
  PhoneOutlined,
  HomeOutlined,
  CalendarOutlined,
  IdcardOutlined,
  UserOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { clearCurrent, deleteRequest, getRequest } from '@/store/customers/customersSlice';
import { Popconfirm } from 'antd';
import { toast } from 'react-toastify';
import { IDENTITY_DOCUMENT_LABELS, GENDER_LABELS } from '@/store/customers/customerTypes';

const { Title, Text } = Typography;

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { item, loading, error } = useAppSelector((s) => s.customers.current);
  const { loading: mutationLoading, error: mutationError } = useAppSelector(
    (s) => s.customers.mutation,
  );

  useEffect(() => {
    fetchInitiated.current = true;
    if (id) dispatch(getRequest(id));
    return () => {
      dispatch(clearCurrent());
      fetchInitiated.current = false;
    };
  }, [id, dispatch]);

  const handleDelete = () => {
    deleteInitiated.current = true;
    dispatch(deleteRequest(id!));
  };

  // Show the success toast only when WE initiated a delete AND the item
  // has actually disappeared from the store. Without `deleteInitiated`
  // the effect also matches the very first render (loading=false from the
  // previous page, item=null, error=null), which would fire the toast
  // and redirect the user away from the detail page they just opened.
  const fetchInitiated = useRef(false);
  const deleteInitiated = useRef(false);
  useEffect(() => {
    if (deleteInitiated.current && !loading && !item && !error) {
      deleteInitiated.current = false;
      toast.success('Customer deleted');
      router.replace('/customers');
    }
  }, [loading, item, error, router]);

  // Toast on delete failure
  useEffect(() => {
    if (mutationError) {
      toast.error(mutationError);
    }
  }, [mutationError]);

  // Block rendering until the first fetch has actually been initiated,
  // so the render never falls through to the 404 / error branch with
  // a stale "item=null from the previous page" state.
  if (!fetchInitiated.current) {
    return <Skeleton active paragraph={{ rows: 10 }} />;
  }

  if (loading && !item) {
    return <Skeleton active paragraph={{ rows: 10 }} />;
  }

  if (error && !item) {
    return (
      <Result
        status="error"
        title="Failed to load"
        subTitle={error}
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

  const age = dayjs().diff(dayjs(item.dateOfBirth), 'year');

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Link href="/customers">
          <Button type="text" icon={<ArrowLeftOutlined />}>
            Back to customers
          </Button>
        </Link>
      </Space>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={16}>
          <Card
            title={
              <Space size="middle">
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, #1677ff, #4096ff)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                    fontWeight: 700,
                  }}
                >
                  {item.fullName[0]?.toUpperCase()}
                </div>
                <div>
                  <Title level={3} style={{ margin: 0 }}>
                    {item.fullName}
                  </Title>
                  <Text type="secondary">{item.occupation}</Text>
                </div>
              </Space>
            }
            extra={
              <Space>
                <Link href={`/customers/${item.id}/edit`}>
                  <Button icon={<EditOutlined />}>Edit</Button>
                </Link>
                <Popconfirm
                  title="Delete this customer?"
                  description="This action cannot be undone."
                  onConfirm={handleDelete}
                  okText="Delete"
                  cancelText="Cancel"
                  okButtonProps={{ danger: true }}
                >
                  <Button danger icon={<DeleteOutlined />} loading={mutationLoading}>
                    Delete
                  </Button>
                </Popconfirm>
              </Space>
            }
          >
            <Title level={5}>
              <UserOutlined /> Main information
            </Title>
            <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
              <Descriptions.Item
                label={
                  <>
                    <CalendarOutlined /> Date of birth
                  </>
                }
              >
                {dayjs(item.dateOfBirth).format('MMMM D, YYYY')} ({age} years)
              </Descriptions.Item>
              <Descriptions.Item label="Gender">
                {GENDER_LABELS[item.gender] ?? item.gender}
              </Descriptions.Item>
              <Descriptions.Item
                label={
                  <>
                    <GlobalOutlined /> Nationality
                  </>
                }
              >
                {item.nationality}
              </Descriptions.Item>
              <Descriptions.Item label="Occupation">{item.occupation}</Descriptions.Item>
              <Descriptions.Item
                label={
                  <>
                    <PhoneOutlined /> Phone
                  </>
                }
                span={2}
              >
                {item.phone}
              </Descriptions.Item>
              <Descriptions.Item
                label={
                  <>
                    <MailOutlined /> Email
                  </>
                }
                span={2}
              >
                {item.email}
              </Descriptions.Item>
              <Descriptions.Item
                label={
                  <>
                    <HomeOutlined /> Address
                  </>
                }
                span={2}
              >
                {item.address}
              </Descriptions.Item>
            </Descriptions>

            <Title level={5} style={{ marginTop: 24 }}>
              <IdcardOutlined /> Identity documents ({item.identityDocuments.length})
            </Title>
            {item.identityDocuments.length === 0 ? (
              <Empty description="No identity documents" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <Row gutter={[12, 12]}>
                {item.identityDocuments.map((d) => (
                  <Col xs={24} md={12} key={d.id ?? `${d.type}-${d.number}`}>
                    <Card size="small" styles={{ body: { padding: 12 } }}>
                      <Space direction="vertical" size={4} style={{ width: '100%' }}>
                        <Tag color="geekblue" style={{ alignSelf: 'flex-start' }}>
                          {IDENTITY_DOCUMENT_LABELS[d.type] ?? d.type}
                        </Tag>
                        <Text strong style={{ fontSize: 16 }}>
                          {d.number}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Issued {dayjs(d.issueDate).format('MMM D, YYYY')} at {d.issuePlace}
                        </Text>
                      </Space>
                    </Card>
                  </Col>
                ))}
              </Row>
            )}
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card title="Metadata">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Created">
                {dayjs(item.createdAt).format('MMM D, YYYY HH:mm')}
              </Descriptions.Item>
              <Descriptions.Item label="Updated">
                {dayjs(item.updatedAt).format('MMM D, YYYY HH:mm')}
              </Descriptions.Item>
              <Descriptions.Item label="Created by">
                <Text code style={{ fontSize: 12 }}>
                  {item.createdBy}
                </Text>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
