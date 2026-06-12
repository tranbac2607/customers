'use client';

import { Button, Input, Select, Space } from 'antd';
import { SearchOutlined, ClearOutlined } from '@ant-design/icons';
import { Controller, type Control } from 'react-hook-form';
import { GENDER_LABELS } from '@/store/customers/customerTypes';
import { GENDERS, type Gender } from '@/store/auth/authTypes';

export interface CustomerSearchValues {
  fullName?: string;
  gender?: Gender;
  phone?: string;
  nationality?: string;
  occupation?: string;
}

interface CustomerSearchProps {
  control: Control<CustomerSearchValues>;
  loading?: boolean;
  onSearch: (values: CustomerSearchValues) => void;
  onClear: () => void;
}

/**
 * Three-field search bar for the customers list. Presentational only:
 * the parent owns the form state (via useListQuery) and the dispatch
 * to /customers. Pressing Enter or clicking Search triggers onSearch;
 * Clear resets the form to empty and fires onClear so the parent can
 * reset its query state.
 */
export function CustomerSearch({ control, loading, onSearch, onClear }: CustomerSearchProps) {
  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Space wrap size="middle" style={{ width: '100%' }}>
        <Controller
          control={control}
          name="fullName"
          render={({ field }) => (
            <Input {...field} placeholder="Name" allowClear size="middle" style={{ width: 180 }} />
          )}
        />
        <Controller
          control={control}
          name="gender"
          render={({ field }) => (
            <Select
              {...field}
              placeholder="Gender"
              allowClear
              size="middle"
              style={{ width: 140 }}
              options={GENDERS.map((g) => ({ value: g, label: GENDER_LABELS[g] }))}
            />
          )}
        />
        {/* Phone search accepts the same international format as the
            form (+, digits, space, parens, dashes). The BE's search
            filter strips non-digits before building the regex
            (back-end customer.repository.ts), so a pasted value still
            matches a stored phone entered with spacing. No client-side
            normalisation needed here. */}
        <Controller
          control={control}
          name="phone"
          render={({ field }) => (
            <Input
              {...field}
              placeholder="+84 901 234 567"
              allowClear
              size="middle"
              inputMode="tel"
              maxLength={30}
              style={{ width: 200 }}
            />
          )}
        />
        <Controller
          control={control}
          name="nationality"
          render={({ field }) => (
            <Input
              {...field}
              placeholder="Nationality"
              allowClear
              size="middle"
              style={{ width: 180 }}
            />
          )}
        />
        <Controller
          control={control}
          name="occupation"
          render={({ field }) => (
            <Input
              {...field}
              placeholder="Occupation"
              allowClear
              size="middle"
              style={{ width: 180 }}
            />
          )}
        />
      </Space>
      <Space>
        <Button
          type="primary"
          icon={<SearchOutlined />}
          loading={loading}
          onClick={() => {
            // react-hook-form's handleSubmit gives us the current values
            // without re-rendering. We use the imperative form
            // because we want "Search" to be an explicit action rather
            // than a debounced-on-type.
            const submit = control.handleSubmit(onSearch);
            void submit();
          }}
        >
          Search
        </Button>
        <Button icon={<ClearOutlined />} onClick={onClear}>
          Clear
        </Button>
      </Space>
    </Space>
  );
}
