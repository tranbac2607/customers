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
  Tooltip,
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
} from '@/store/customers/customerTypes';
import { COUNTRIES } from '@/store/customers/countries';
import type { Customer } from '@/store/customers/customerTypes';
import type { Gender, IdentityDocumentType } from '@/store/auth/authTypes';
import {
  CUSTOMER_DATE_FORMAT,
  MAX_IDENTITY_DOCS_PER_CUSTOMER,
} from '@/features/customers/constants';

// (no-op)

const identityDocSchema = z.object({
  type: z.enum(IDENTITY_DOCUMENT_TYPES, {
    message: 'Please choose a document type',
  }),
  // Number/Code may be a CCCD (digits), a license plate (letters + digits
  // + dashes, e.g. "B2-12345"), or a passport number (alphanumeric). The
  // Input strips everything that isn't a letter, digit, or dash on
  // change so the stored value matches the regex.
  number: z
    .string()
    .min(1, 'Number/Code is required')
    .regex(/^[A-Za-z0-9-]+$/, 'No special characters allowed')
    .max(50, 'Number/Code is too long'),
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
  // International phone: any combination of digits, spaces, parens,
  // dashes, and a leading '+'. Matches the backend regex
  // (back-end/src/modules/customers/customer.schema.ts). Length 6-30.
  phone: z
    .string()
    .min(6, 'Phone is too short')
    .max(30, 'Phone is too long')
    .regex(/^[+0-9 ()-]+$/, 'Phone is invalid (e.g. +84 901 234 567 or +1 212 555 0100)'),
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
    .max(
      MAX_IDENTITY_DOCS_PER_CUSTOMER,
      `Up to ${MAX_IDENTITY_DOCS_PER_CUSTOMER} identity documents allowed`,
    )
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
                    format={CUSTOMER_DATE_FORMAT}
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
                    placeholder="+84 901 234 567 or +1 212 555 0100"
                    size="large"
                    inputMode="tel"
                    maxLength={30}
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
          <Tooltip
            title={
              fields.length >= MAX_IDENTITY_DOCS_PER_CUSTOMER
                ? `Maximum ${MAX_IDENTITY_DOCS_PER_CUSTOMER} documents (one per type)`
                : ''
            }
          >
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              // Disable at the BE-mandated cap so the user can't queue
              // a submit the BE would reject. Mirrors the zod .max(...)
              // check above so the validation stays in sync.
              disabled={fields.length >= MAX_IDENTITY_DOCS_PER_CUSTOMER}
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
          </Tooltip>
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
                          label="Number/Code"
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
                            placeholder="e.g. 079090012345 or B212345"
                            inputMode="text"
                            maxLength={50}
                            onChange={(e) => {
                              // Strip everything that isn't a letter,
                              // digit, or dash so the visible value
                              // matches the zod regex /^[A-Za-z0-9-]+$/
                              // (the schema also rejects special chars
                              // on submit, but stripping here keeps
                              // the user from ever seeing rejected
                              // characters in the field).
                              const cleaned = e.target.value.replace(/[^A-Za-z0-9-]/g, '');
                              field.onChange(cleaned);
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
                            format={CUSTOMER_DATE_FORMAT}
                            style={{ width: '100%' }}
                          />
                        </Form.Item>
                      )}
                    />
                  </Col>
                  {/* paddingTop: 30 ≈ Antd's label height (24px) + a
                      little slack so the input (not the label) of
                      the Issue place Form.Item ends up on the same
                      baseline as the Remove button on the right.
                      sm={22} (was 10) so the input stretches across
                      almost the entire card width and the Remove
                      button sits at the card's right edge. */}
                  <Col xs={24} sm={22} style={{ paddingTop: 30 }}>
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
                  <Col
                    xs={24}
                    sm={2}
                    style={{ textAlign: 'right', alignSelf: 'flex-end', paddingTop: 30 }}
                  >
                    {/* Icon-only with a Tooltip. The previous 'Remove'
                        text label was ~90px wide and overflowed the
                        sm={2} column at typical laptop widths, pushing
                        the button past the card's right edge. The
                        icon alone is 32px and always fits. */}
                    <Tooltip title="Remove this document">
                      <Button
                        danger
                        type="text"
                        icon={<DeleteOutlined />}
                        onClick={() => remove(i)}
                        aria-label="Remove this document"
                      />
                    </Tooltip>
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
