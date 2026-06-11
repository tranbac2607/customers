'use client';

import { useFieldArray, useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  Space,
  Row,
  Col,
  Typography,
  Divider,
  Empty,
  Alert,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  SaveOutlined,
  CloseOutlined,
  IdcardOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import {
  GENDERS,
  GENDER_LABELS,
  IDENTITY_DOCUMENT_TYPES,
  IDENTITY_DOCUMENT_LABELS,
} from '@/features/customers/customerTypes';
import type { Customer } from '@/features/customers/customerTypes';
import type { Gender, IdentityDocumentType } from '@/features/auth/authTypes';

const { } = Typography;

const identityDocSchema = z
  .object({
    type: z.enum(IDENTITY_DOCUMENT_TYPES, {
      message: 'Please choose a document type',
    }),
    number: z.string().min(1, 'Number is required').max(50),
    issueDate: z
      .any()
      .refine((v) => dayjs(v as Dayjs | string).isValid(), 'Issue date is required'),
    issuePlace: z.string().min(1, 'Issue place is required').max(200),
  });

const formSchema = z
  .object({
    fullName: z.string().min(1, 'Full name is required').max(200),
    dateOfBirth: z
      .any()
      .refine((v) => dayjs(v as Dayjs | string).isValid(), 'Date of birth is required')
      .refine(
        (v) => dayjs(v as Dayjs | string).isBefore(dayjs()),
        'Date of birth must be in the past',
      ),
    address: z.string().min(1, 'Address is required').max(500),
    phone: z
      .string()
      .min(6, 'Phone is too short')
      .max(30)
      .regex(/^[+0-9 ()-]+$/, { message: 'Phone contains invalid characters' }),
    email: z.string().email('Invalid email'),
    gender: z.enum(GENDERS, { message: 'Please choose a gender' }),
    nationality: z.string().min(1, 'Nationality is required').max(100),
    occupation: z.string().min(1, 'Occupation is required').max(200),
    identityDocuments: z
      .array(identityDocSchema)
      .max(10, 'Up to 10 identity documents allowed')
      .superRefine((arr, ctx) => {
        const seen = new Set<string>();
        arr.forEach((d, i) => {
          if (seen.has(d.type)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: [i, 'type'],
              message: `Duplicate type: ${d.type}`,
            });
          }
          seen.add(d.type);
        });
      }),
  });

export type CustomerFormValues = z.infer<typeof formSchema>;

interface CustomerFormProps {
  initial?: Partial<Customer>;
  onSubmit: (values: CustomerFormValues) => void;
  loading?: boolean;
  error?: string | null;
  mode: 'create' | 'edit';
}

export function CustomerForm({ initial, onSubmit, loading, error, mode }: CustomerFormProps) {
  const router = useRouter();
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: initial?.fullName ?? '',
      dateOfBirth: initial?.dateOfBirth ? dayjs(initial.dateOfBirth) : undefined,
      address: initial?.address ?? '',
      phone: initial?.phone ?? '',
      email: initial?.email ?? '',
      gender: initial?.gender,
      nationality: initial?.nationality ?? '',
      occupation: initial?.occupation ?? '',
      identityDocuments:
        initial?.identityDocuments?.map((d) => ({
          type: d.type,
          number: d.number,
          issueDate: dayjs(d.issueDate),
          issuePlace: d.issuePlace,
        })) ?? [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'identityDocuments' });

  useEffect(() => {
    if (initial) {
      reset({
        fullName: initial.fullName ?? '',
        dateOfBirth: initial.dateOfBirth ? dayjs(initial.dateOfBirth) : undefined,
        address: initial.address ?? '',
        phone: initial.phone ?? '',
        email: initial.email ?? '',
        gender: initial.gender,
        nationality: initial.nationality ?? '',
        occupation: initial.occupation ?? '',
        identityDocuments:
          initial.identityDocuments?.map((d) => ({
            type: d.type,
            number: d.number,
            issueDate: dayjs(d.issueDate),
            issuePlace: d.issuePlace,
          })) ?? [],
      });
    }
  }, [initial, reset]);

  return (
    <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
      {error && (
        <Alert
          type="error"
          message={error}
          showIcon
          closable
          style={{ marginBottom: 16 }}
        />
      )}

      <Card
        title={
          <Space>
            <UserOutlined />
            <span>Main information</span>
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Controller
              control={control}
              name="fullName"
              render={({ field }) => (
                <Form.Item
                  label="Full name"
                  required
                  validateStatus={errors.fullName ? 'error' : ''}
                  help={errors.fullName?.message as string}
                >
                  <Input {...field} placeholder="Nguyen Van A" size="large" />
                </Form.Item>
              )}
            />
          </Col>
          <Col xs={24} md={12}>
            <Controller
              control={control}
              name="dateOfBirth"
              render={({ field }) => (
                <Form.Item
                  label="Date of birth"
                  required
                  validateStatus={errors.dateOfBirth ? 'error' : ''}
                  help={errors.dateOfBirth?.message as string}
                >
                  <DatePicker
                    {...field}
                    value={field.value as Dayjs | undefined}
                    onChange={(v) => field.onChange(v)}
                    format="YYYY-MM-DD"
                    size="large"
                    style={{ width: '100%' }}
                    placeholder="Select date of birth"
                    disabledDate={(d) => d && d.isAfter(dayjs())}
                  />
                </Form.Item>
              )}
            />
          </Col>
          <Col xs={24} md={12}>
            <Controller
              control={control}
              name="gender"
              render={({ field }) => (
                <Form.Item
                  label="Gender"
                  required
                  validateStatus={errors.gender ? 'error' : ''}
                  help={errors.gender?.message as string}
                >
                  <Select
                    {...field}
                    value={field.value as string | undefined}
                    onChange={field.onChange}
                    size="large"
                    placeholder="Select gender"
                    options={GENDERS.map((g: Gender) => ({ value: g, label: GENDER_LABELS[g] }))}
                  />
                </Form.Item>
              )}
            />
          </Col>
          <Col xs={24} md={12}>
            <Controller
              control={control}
              name="nationality"
              render={({ field }) => (
                <Form.Item
                  label="Nationality"
                  required
                  validateStatus={errors.nationality ? 'error' : ''}
                  help={errors.nationality?.message as string}
                >
                  <Input {...field} placeholder="Vietnamese" size="large" />
                </Form.Item>
              )}
            />
          </Col>
          <Col xs={24}>
            <Controller
              control={control}
              name="address"
              render={({ field }) => (
                <Form.Item
                  label="Address"
                  required
                  validateStatus={errors.address ? 'error' : ''}
                  help={errors.address?.message as string}
                >
                  <Input.TextArea {...field} rows={2} placeholder="123 Le Loi, District 1, HCMC" />
                </Form.Item>
              )}
            />
          </Col>
          <Col xs={24} md={12}>
            <Controller
              control={control}
              name="phone"
              render={({ field }) => (
                <Form.Item
                  label="Phone"
                  required
                  validateStatus={errors.phone ? 'error' : ''}
                  help={errors.phone?.message as string}
                >
                  <Input {...field} placeholder="+84 901 234 567" size="large" />
                </Form.Item>
              )}
            />
          </Col>
          <Col xs={24} md={12}>
            <Controller
              control={control}
              name="email"
              render={({ field }) => (
                <Form.Item
                  label="Email"
                  required
                  validateStatus={errors.email ? 'error' : ''}
                  help={errors.email?.message as string}
                >
                  <Input {...field} type="email" placeholder="email@example.com" size="large" />
                </Form.Item>
              )}
            />
          </Col>
          <Col xs={24}>
            <Controller
              control={control}
              name="occupation"
              render={({ field }) => (
                <Form.Item
                  label="Occupation"
                  required
                  validateStatus={errors.occupation ? 'error' : ''}
                  help={errors.occupation?.message as string}
                >
                  <Input {...field} placeholder="Software Engineer" size="large" />
                </Form.Item>
              )}
            />
          </Col>
        </Row>
      </Card>

      <Card
        title={
          <Space>
            <IdcardOutlined />
            <span>Identity documents</span>
          </Space>
        }
        extra={
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={() =>
              append({
                type: 'CCCD',
                number: '',
                issueDate: dayjs(),
                issuePlace: '',
              })
            }
          >
            Add document
          </Button>
        }
        style={{ marginBottom: 16 }}
      >
        {fields.length === 0 ? (
          <Empty
            description="No identity documents yet"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {fields.map((f, i) => (
              <div
                key={f.id}
                style={{
                  border: '1px solid #f0f0f0',
                  borderRadius: 8,
                  padding: 16,
                  background: '#fafbfc',
                }}
              >
                <Row gutter={16} align="middle">
                  <Col xs={24} sm={8}>
                    <Controller
                      control={control}
                      name={`identityDocuments.${i}.type`}
                      render={({ field }) => (
                        <Form.Item
                          label="Type"
                          required
                          validateStatus={
                            (errors.identityDocuments as Record<string, { type?: { message?: string } }> | undefined)?.[
                              i
                            ]?.type
                              ? 'error'
                              : ''
                          }
                          help={
                            (errors.identityDocuments as Record<string, { type?: { message?: string } }> | undefined)?.[
                              i
                            ]?.type?.message as string
                          }
                          style={{ marginBottom: 0 }}
                        >
                          <Select
                            {...field}
                            options={IDENTITY_DOCUMENT_TYPES.map((t: IdentityDocumentType) => ({
                              value: t,
                              label: IDENTITY_DOCUMENT_LABELS[t],
                            }))}
                          />
                        </Form.Item>
                      )}
                    />
                  </Col>
                  <Col xs={24} sm={8}>
                    <Controller
                      control={control}
                      name={`identityDocuments.${i}.number`}
                      render={({ field }) => (
                        <Form.Item
                          label="Number"
                          required
                          validateStatus={
                            (errors.identityDocuments as Record<string, { number?: { message?: string } }> | undefined)?.[
                              i
                            ]?.number
                              ? 'error'
                              : ''
                          }
                          help={
                            (errors.identityDocuments as Record<string, { number?: { message?: string } }> | undefined)?.[
                              i
                            ]?.number?.message as string
                          }
                          style={{ marginBottom: 0 }}
                        >
                          <Input {...field} placeholder="079090012345" />
                        </Form.Item>
                      )}
                    />
                  </Col>
                  <Col xs={24} sm={8}>
                    <Controller
                      control={control}
                      name={`identityDocuments.${i}.issueDate`}
                      render={({ field }) => (
                        <Form.Item
                          label="Issue date"
                          required
                          validateStatus={
                            (errors.identityDocuments as Record<string, { issueDate?: { message?: string } }> | undefined)?.[
                              i
                            ]?.issueDate
                              ? 'error'
                              : ''
                          }
                          help={
                            (errors.identityDocuments as Record<string, { issueDate?: { message?: string } }> | undefined)?.[
                              i
                            ]?.issueDate?.message as string
                          }
                          style={{ marginBottom: 0 }}
                        >
                          <DatePicker
                            {...field}
                            value={field.value as Dayjs | undefined}
                            onChange={(v) => field.onChange(v)}
                            format="YYYY-MM-DD"
                            style={{ width: '100%' }}
                          />
                        </Form.Item>
                      )}
                    />
                  </Col>
                  <Col xs={24} sm={20}>
                    <Controller
                      control={control}
                      name={`identityDocuments.${i}.issuePlace`}
                      render={({ field }) => (
                        <Form.Item
                          label="Issue place"
                          required
                          validateStatus={
                            (errors.identityDocuments as Record<string, { issuePlace?: { message?: string } }> | undefined)?.[
                              i
                            ]?.issuePlace
                              ? 'error'
                              : ''
                          }
                          help={
                            (errors.identityDocuments as Record<string, { issuePlace?: { message?: string } }> | undefined)?.[
                              i
                            ]?.issuePlace?.message as string
                          }
                          style={{ marginBottom: 0 }}
                        >
                          <Input {...field} placeholder="HCMC Public Security" />
                        </Form.Item>
                      )}
                    />
                  </Col>
                  <Col xs={24} sm={4} style={{ textAlign: 'right' }}>
                    <Button
                      danger
                      type="text"
                      icon={<DeleteOutlined />}
                      onClick={() => remove(i)}
                    >
                      Remove
                    </Button>
                  </Col>
                </Row>
              </div>
            ))}
          </Space>
        )}
      </Card>

      <Divider />

      <Space>
        <Button
          type="primary"
          htmlType="submit"
          icon={<SaveOutlined />}
          loading={loading || isSubmitting}
          size="large"
          disabled={!isDirty && mode === 'edit'}
        >
          {mode === 'create' ? 'Create customer' : 'Save changes'}
        </Button>
        <Button
          icon={<CloseOutlined />}
          onClick={() => router.back()}
          size="large"
        >
          Cancel
        </Button>
      </Space>
    </Form>
  );
}
