# Phase 06 — Frontend Customer CRUD

**Goal:** Build the detail view, create form, and edit form for customers. Manage the multi-document array with one-per-type rule. Wire up delete with confirm. Refetch list after mutations.

---

## Working dir: `/Users/bac/Desktop/Dev/customers/front-end/`

---

## New / modified files

```
src/
├── app/(dashboard)/customers/
│   ├── page.tsx                       # list (updated "New" button works)
│   ├── new/page.tsx                   # create
│   └── [id]/
│       ├── page.tsx                   # detail
│       └── edit/page.tsx              # edit
│
├── features/customers/
│   ├── customersApi.ts                # add get/create/update/remove
│   ├── customersSaga.ts               # add sagas for get/create/update/remove
│   ├── customersSlice.ts              # add selected + mutations state
│   ├── customersTypes.ts              # add Create/Update DTOs
│   ├── hooks.ts                       # add useCustomer, useCustomerMutations
│   └── components/
│       ├── CustomerForm.tsx           # the big form (used in new + edit)
│       ├── CustomerFormSections.tsx   # sub-components
│       ├── IdentityDocumentsField.tsx # array field with type-uniqueness
│       ├── CustomerDetail.tsx         # read-only display
│       ├── DeleteCustomerButton.tsx   # popconfirm + remove
│       └── DocumentTypeTag.tsx
│
├── schemas/
│   └── customer.ts                    # create/update zod schemas
│
└── components/form/
    ├── FormSection.tsx                # collapsible card section
    ├── DateField.tsx                  # Antd DatePicker wrapper for RHF
    ├── SelectField.tsx
    └── FormSubmitBar.tsx              # sticky bottom action bar
```

---

## Dependencies

None new.

---

## Schemas (shared shape)

### `schemas/customer.ts`
```ts
import { z } from 'zod';

const documentSchema = z.object({
  type: z.enum(['CCCD', 'DRIVER_LICENSE', 'PASSPORT']),
  number: z.string().min(1, 'Required').max(50),
  issueDate: z.coerce.date({ invalid_type_error: 'Invalid date' }),
  issuePlace: z.string().min(1, 'Required').max(200),
});

export const customerFormSchema = z.object({
  fullName: z.string().min(1, 'Required').max(200),
  dateOfBirth: z.coerce.date({ invalid_type_error: 'Required' }).refine(d => d < new Date(), 'Must be in the past'),
  address: z.string().min(1, 'Required').max(500),
  phone: z.string().min(6, 'Invalid phone').max(30),
  email: z.string().email('Invalid email'),
  gender: z.enum(['male', 'female', 'other']),
  nationality: z.string().min(1, 'Required').max(100),
  occupation: z.string().min(1, 'Required').max(200),
  identityDocuments: z.array(documentSchema)
    .max(10, 'Max 10 documents')
    .superRefine((arr, ctx) => {
      const seen = new Set<string>();
      arr.forEach((d, i) => {
        if (seen.has(d.type)) ctx.addIssue({ code: 'custom', path: [i, 'type'], message: `Type "${d.type}" already added` });
        seen.add(d.type);
      });
    }),
});

export type CustomerFormValues = z.infer<typeof customerFormSchema>;
```

> For edit, we don't `partial()` the schema — the form re-submits the full document, matching the BE `PUT` contract. We can change to `PUT` partial if we update BE accordingly. For now: full update.

---

## API client additions

### `features/customers/customersApi.ts`
```ts
export const customersApi = {
  // ...list
  get: async (id: string): Promise<Customer> => {
    const { data } = await api.get<ApiSuccess<Customer>>(`/customers/${id}`);
    return data.data;
  },
  create: async (body: CreateCustomerInput): Promise<Customer> => {
    const { data } = await api.post<ApiSuccess<Customer>>('/customers', body);
    return data.data;
  },
  update: async (id: string, body: UpdateCustomerInput): Promise<Customer> => {
    const { data } = await api.put<ApiSuccess<Customer>>(`/customers/${id}`, body);
    return data.data;
  },
  remove: async (id: string): Promise<void> => {
    await api.delete(`/customers/${id}`);
  },
};
```

---

## Slice additions

### `customersSlice.ts` (extend)
Add to state:
```ts
selected: { data: Customer | null; loading: boolean; error: string | null };
mutating: { creating: boolean; updating: boolean; deleting: boolean; error: string | null };
```

Add actions:
- `getRequest(id)`, `getSuccess(data)`, `getFailure(msg)`
- `createRequest(payload)`, `createSuccess(data)`, `createFailure(msg)`
- `updateRequest({id, payload})`, `updateSuccess(data)`, `updateFailure(msg)`
- `removeRequest(id)`, `removeSuccess(id)`, `removeFailure(msg)`
- `clearSelected()`

Add a tiny "list cache invalidation" — simplest is: on `createSuccess` / `updateSuccess` / `removeSuccess`, dispatch `fetchRequest` so the list refetches. Implement in saga via `put(customersActions.fetchRequest())`.

---

## Saga additions

### `customersSaga.ts` (extend)
```ts
function* doGet(action: ReturnType<typeof customersActions.getRequest>) {
  try {
    const c = yield call(customersApi.get, action.payload);
    yield put(customersActions.getSuccess(c));
  } catch (e: any) { yield put(customersActions.getFailure(e?.response?.data?.error?.message ?? 'Failed to load')); }
}

function* doCreate(action: ReturnType<typeof customersActions.createRequest>) {
  try {
    const c = yield call(customersApi.create, action.payload);
    yield put(customersActions.createSuccess(c));
    yield put(customersActions.fetchRequest()); // refresh list
    toast.success('Customer created');
  } catch (e: any) { yield put(customersActions.createFailure(e?.response?.data?.error?.message ?? 'Failed to create')); }
}

function* doUpdate(action: ReturnType<typeof customersActions.updateRequest>) {
  try {
    const c = yield call(customersApi.update, action.payload.id, action.payload.payload);
    yield put(customersActions.updateSuccess(c));
    yield put(customersActions.fetchRequest());
    toast.success('Customer updated');
  } catch (e: any) { yield put(customersActions.updateFailure(e?.response?.data?.error?.message ?? 'Failed to update')); }
}

function* doRemove(action: ReturnType<typeof customersActions.removeRequest>) {
  try {
    yield call(customersApi.remove, action.payload);
    yield put(customersActions.removeSuccess(action.payload));
    yield put(customersActions.fetchRequest());
    toast.success('Customer deleted');
  } catch (e: any) { yield put(customersActions.removeFailure(e?.response?.data?.error?.message ?? 'Failed to delete')); }
}

// register
yield takeLatest(customersActions.getRequest.type, doGet);
yield takeLatest(customersActions.createRequest.type, doCreate);
yield takeLatest(customersActions.updateRequest.type, doUpdate);
yield takeLatest(customersActions.removeRequest.type, doRemove);
```

---

## Hooks additions

### `hooks.ts`
```ts
export const useCustomer = (id: string) => {
  const dispatch = useAppDispatch();
  useEffect(() => { dispatch(customersActions.getRequest(id)); }, [dispatch, id]);
  return useAppSelector((s: RootState) => s.customers.selected);
};

export const useCustomerMutations = () => {
  const dispatch = useAppDispatch();
  return {
    create: (values: CreateCustomerInput) => dispatch(customersActions.createRequest(values)),
    update: (id: string, values: UpdateCustomerInput) => dispatch(customersActions.updateRequest({ id, payload: values })),
    remove: (id: string) => dispatch(customersActions.removeRequest(id)),
    state: useAppSelector((s: RootState) => s.customers.mutating),
  };
};
```

---

## Form components

### `components/form/FormSection.tsx`
- Antd `Card` with title + collapsible body, used to group sections: "Personal info", "Contact", "Identity documents".

### `components/form/DateField.tsx`
- Wraps Antd `DatePicker` with `Controller` for RHF. Props: `name`, `label`, `disabledDate` (default: past for DOB, none otherwise).
- Renders label + required mark + error.

### `components/form/SelectField.tsx`
- Generic RHF-bound `Select` wrapper. Props: `name`, `label`, `options`, `mode?`.

### `components/form/FormSubmitBar.tsx`
- Sticky bottom bar with Cancel + Save buttons. Cancel uses `router.back()`.
- Submit shows `loading` from mutation state.

### `features/customers/components/IdentityDocumentsField.tsx`
- Uses `useFieldArray` from RHF.
- Renders a list of cards, each with: `Select` (type), `Input` (number), `DatePicker` (issueDate), `Input` (issuePlace), `Button` (remove).
- Antd `Select` options: `[ { value:'CCCD', label:'National ID (CCCD)' }, ... ]`.
- "Add document" button. Disabled types (those already in the array) are hidden from the dropdown of new rows.
- Shows error per field.
- One-per-type enforced client-side via zod superRefine *and* via disabling the option.
- When user removes a doc, the type becomes available again for the next "Add".

### `features/customers/components/CustomerForm.tsx`
- `useForm({ resolver: zodResolver(customerFormSchema), defaultValues })`.
- Layout: 3 sections.
- On submit: convert dates to ISO strings, call mutation hook.
- On success (create): `router.push('/customers')`.
- On success (edit): `router.push(\`/customers/${id}\`)`.
- Watches `mutating` state for loading on submit.

### `features/customers/components/CustomerFormSections.tsx` (split for readability)
- `PersonalInfoSection`, `ContactSection`, `IdentitySection`.
- Each receives `control` from RHF.

### `features/customers/components/DocumentTypeTag.tsx`
- Visual: `Tag` with icon + color per type (CCCD blue, Driver green, Passport purple).

### `features/customers/components/CustomerDetail.tsx`
- `Descriptions` (Antd) for personal + contact info.
- `List` of identity documents with `DocumentTypeTag`, number, date (dayjs formatted), place.
- Action bar: "Edit" + "Delete".
- Loading skeleton while fetching.

### `features/customers/components/DeleteCustomerButton.tsx`
- Antd `Popconfirm` wrapping a `Button` "Delete" (danger).
- On confirm → `useCustomerMutations().remove(id)` → on success, `router.push('/customers')`.

---

## Pages

### `app/(dashboard)/customers/new/page.tsx`
- PageHeader title "New Customer".
- `<CustomerForm mode="create" />`.
- Cancel → back.

### `app/(dashboard)/customers/[id]/page.tsx`
- `useParams` for id; `useCustomer(id)`.
- Skeleton + error states.
- `<CustomerDetail />`.
- Edit button → `/customers/${id}/edit`.

### `app/(dashboard)/customers/[id]/edit/page.tsx`
- Wait for selected.data; if missing → trigger `getRequest(id)`.
- PageHeader title "Edit Customer".
- `<CustomerForm mode="edit" id={id} initialValues={selected.data} />`.

### Update `app/(dashboard)/customers/page.tsx`
- "New Customer" button → `router.push('/customers/new')`.
- Row click → `/customers/${id}`.

---

## UX polish checklist

- [ ] Form is responsive: 1 column on mobile, 2 on tablet, full on desktop.
- [ ] All required fields show `*` and inline errors only after blur or submit attempt.
- [ ] DatePicker allows past dates for DOB; defaults to placeholder.
- [ ] Identity Documents section starts empty; "Add" button is always visible until max 10.
- [ ] Removing a document clears its validation error.
- [ ] Save button shows loading spinner during request.
- [ ] Cancel on unsaved form shows browser confirm (or custom modal).
- [ ] Detail page shows dayjs-formatted dates (e.g. "Jan 5, 1990") and "Created 2 days ago" if `relativeTime` is enabled.
- [ ] Empty identity documents list shows "No identity documents on file" placeholder.
- [ ] Delete confirmation shows the customer name.
- [ ] After delete, redirected to list with a success toast.

---

## Validation

- [ ] Create a customer with all fields → success → redirected to list → new row visible.
- [ ] Create with invalid email → inline error → no submit.
- [ ] Create with two CCCD documents → inline error on the duplicate type.
- [ ] Create with future DOB → inline error.
- [ ] Edit existing customer → save → list shows updated email.
- [ ] Detail page shows correct data and documents.
- [ ] Delete → confirm → success → row gone from list.
- [ ] Server validation (e.g. duplicate email on BE) surfaces as a form-level error banner.
- [ ] `npm run typecheck`, `npm run lint`, `npm run build` all pass.

---

## Notes

- We use `Controller` from RHF everywhere to keep Antd controlled components in sync. Antd's Form is not used (would conflict with RHF's validation pipeline).
- `useFieldArray` is the cleanest way to manage dynamic document rows with proper validation per row.
- For edit mode, we send the full `identityDocuments` array — if the user removed a doc, it's deleted; if they edited, it's updated. The BE `PUT` replaces the whole document, which is the simplest contract.
- The `mutating.error` slice is set on failure; the form reads it for a top-of-form `Alert`. Clear it on next submit.
- For very long forms we could split into tabs; 9 fields + dynamic docs is manageable in one page on desktop.
