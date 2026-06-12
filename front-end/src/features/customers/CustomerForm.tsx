'use client';

import { useFieldArray, useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  Form,
  Input,
  Select,
  AutoComplete,
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
import { COUNTRIES } from '@/features/customers/countries';
import type { Customer } from '@/features/customers/customerTypes';
import type { Gender, IdentityDocumentType } from '@/features/auth/authTypes';

const {} = Typography;

const identityDocSchema = z.object({
  type: z.enum(IDENTITY_DOCUMENT_TYPES, {
    message: 'Please choose a document type',
  }),
  // Number is digits-only. The Input strips non-digits on change so the
  // stored value is always a clean string of digits.
  number: z
    .string()
    .min(1, 'Document number is required')
    .regex(/^\d+$/, 'Document number must contain only digits')
    .max(50, 'Document number is too long'),
  issueDate: z.any().refine((v) => dayjs(v as Dayjs | string).isValid(), 'Issue date is required'),
  issuePlace: z.string().min(1, 'Issue place is required').max(200),
});

const formSchema = z.object({
  fullName: z.string().min(1, 'Full name is required').max(200),
  dateOfBirth: z
    .any()
    .refine((v) => dayjs(v as Dayjs | string).isValid(), 'Date of birth is required')
    .refine(
      (v) => dayjs(v as Dayjs | string).isBefore(dayjs()),
      'Date of birth must be in the past',
    ),
  address: z.string().min(1, 'Address is required').max(500),
  // Vietnam phone: optional +84 / 84 / 0 prefix, then 9 or 10 digits,
  // first digit non-zero. Examples: 0912345678, +84912345678, 849123456789.
  phone: z
    .string()
    .min(10, 'Phone is too short (e.g. 0912345678)')
    .max(15, 'Phone is too long')
    .regex(/^(0|\+84|84)?[1-9][0-9]{8,9}$/, 'Phone is invalid (e.g. 0912345678 or +84912345678)'),
  // Email: standard strict-ish pattern. Local part allows alphanumerics,
  // dots, underscores, dashes, percent, plus. Domain must have at least
  // one dot and a 2+ letter TLD.
  email: z
    .string()
    .min(1, 'Email is required')
    .max(200, 'Email is too long')
    .regex(
      /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
      'Email is invalid (e.g. ten@example.com)',
    ),
  gender: z.enum(GENDERS, { message: 'Please select a gender' }),
  nationality: z.string().min(1, 'Nationality is required').max(100),
  occupation: z.string().min(1, 'Occupation is required').max(200),
  identityDocuments: z
    .array(identityDocSchema)
    .min(1, 'At least one identity document is required')
    .max(10, 'Up to 10 identity documents allowed')
    .superRefine((arr, ctx) => {
      const seen = new Set<string>();
      arr.forEach((d, i) => {
        if (seen.has(d.type)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [i, 'type'],
            message: `Duplicate document type: ${d.type}`,
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
    // Validate as the user types so they get immediate feedback on
    // every field (phone format, email format, required text, etc).
    mode: 'onChange',
    defaultValues: {
      fullName: initial?.fullName ?? '',
      dateOfBirth: initial?.dateOfBirth ? dayjs(initial.dateOfBirth) : undefined,
      address: initial?.address ?? '',
      phone: initial?.phone ?? '',
      email: initial?.email ?? '',
      gender: initial?.gender,
      nationality: initial?.nationality ?? '',
      occupation: initial?.occupation ?? '',
      // On create, pre-seed a single empty CCCD document so the user
      // doesn't have to click "Add document" first. The number field is
      // empty (must be filled), and the issue date is left undefined so
      // the user picks it explicitly. On edit, keep whatever the customer
      // currently has.
      identityDocuments:
        initial?.identityDocuments?.map((d) => ({
          type: d.type,
          number: d.number,
          issueDate: dayjs(d.issueDate),
          issuePlace: d.issuePlace,
        })) ??
        (mode === 'create'
          ? [{ type: 'CCCD', number: '', issueDate: undefined as unknown as Dayjs, issuePlace: '' }]
          : []),
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
        <Alert type="error" message={error} showIcon closable style={{ marginBottom: 16 }} />
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
                  <AutoComplete
                    {...field}
                    options={COUNTRIES.map((c) => ({ value: c }))}
                    placeholder="Type to search a country..."
                    size="large"
                    filterOption={(input, option) =>
                      (option?.value as string).toLowerCase().includes(input.toLowerCase())
                    }
                    showSearch
                    allowClear
                  />
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
                  <Input
                    {...field}
                    placeholder="0912345678 or +84912345678"
                    size="large"
                    inputMode="tel"
                  />
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
                  <Input {...field} type="email" placeholder="ten@example.com" size="large" />
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
                // Leave the issue date undefined so the user explicitly
                // picks it; auto-filling with "today" silently accepts
                // a wrong date if the user doesn't notice.
                issueDate: undefined as unknown as Dayjs,
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
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Empty description="No identity documents yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            {(errors.identityDocuments as unknown as { message?: string } | undefined)?.message && (
              <Alert
                type="error"
                showIcon
                message={(errors.identityDocuments as unknown as { message?: string }).message}
              />
            )}
          </Space>
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
                            (
                              errors.identityDocuments as
                                | Record<string, { type?: { message?: string } }>
                                | undefined
                            )?.[i]?.type
                              ? 'error'
                              : ''
                          }
                          help={
                            (
                              errors.identityDocuments as
                                | Record<string, { type?: { message?: string } }>
                                | undefined
                            )?.[i]?.type?.message as string
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
                            (
                              errors.identityDocuments as
                                | Record<string, { number?: { message?: string } }>
                                | undefined
                            )?.[i]?.number
                              ? 'error'
                              : ''
                          }
                          help={
                            (
                              errors.identityDocuments as
                                | Record<string, { number?: { message?: string } }>
                                | undefined
                            )?.[i]?.number?.message as string
                          }
                          style={{ marginBottom: 0 }}
                        >
                          <Input
                            {...field}
                            placeholder="079090012345"
                            inputMode="numeric"
                            onChange={(e) => {
                              // Strip non-digit characters (spaces,
                              // dashes, letters) so the field value is
                              // always a clean string of digits. The
                              // zod regex requires /^\d+$/ so any
                              // stray char would fail validation.
                              const digits = e.target.value.replace(/\D/g, '');
                              field.onChange(digits);
                            }}
                          />
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
                            (
                              errors.identityDocuments as
                                | Record<string, { issueDate?: { message?: string } }>
                                | undefined
                            )?.[i]?.issueDate
                              ? 'error'
                              : ''
                          }
                          help={
                            (
                              errors.identityDocuments as
                                | Record<string, { issueDate?: { message?: string } }>
                                | undefined
                            )?.[i]?.issueDate?.message as string
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
                            (
                              errors.identityDocuments as
                                | Record<string, { issuePlace?: { message?: string } }>
                                | undefined
                            )?.[i]?.issuePlace
                              ? 'error'
                              : ''
                          }
                          help={
                            (
                              errors.identityDocuments as
                                | Record<string, { issuePlace?: { message?: string } }>
                                | undefined
                            )?.[i]?.issuePlace?.message as string
                          }
                          style={{ marginBottom: 0 }}
                        >
                          <Input {...field} placeholder="HCMC Public Security" />
                        </Form.Item>
                      )}
                    />
                  </Col>
                  <Col xs={24} sm={4} style={{ textAlign: 'right' }}>
                    <Button danger type="text" icon={<DeleteOutlined />} onClick={() => remove(i)}>
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
        <Button icon={<CloseOutlined />} onClick={() => router.back()} size="large">
          Cancel
        </Button>
      </Space>
    </Form>
  );
}
