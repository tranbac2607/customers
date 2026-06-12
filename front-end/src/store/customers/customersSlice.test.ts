import reducer, {
  listRequest,
  listSuccess,
  listFailure,
  getRequest,
  getSuccess,
  createSuccess,
  deleteSuccess,
  updateSuccess,
  type CustomersState,
} from './customersSlice';
import type { Customer } from './customerTypes';

const baseCustomer: Customer = {
  id: 'c1',
  fullName: 'Test User',
  dateOfBirth: '1990-01-01T00:00:00Z',
  address: '1 Test',
  phone: '+84 901',
  email: 't@e.com',
  gender: 'male',
  nationality: 'VN',
  occupation: 'T',
  identityDocuments: [
    { id: 'd1', type: 'CCCD', number: '1', issueDate: '2020-01-01T00:00:00Z', issuePlace: 'HCMC' },
  ],
  createdBy: 'u1',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
};

const initial: CustomersState = {
  list: {
    items: [],
    pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    loading: false,
    error: null,
    lastQuery: { page: 1, limit: 10, sortBy: 'createdAt', order: 'desc' },
  },
  current: { item: null, loading: false, error: null },
  mutation: { loading: false, error: null, lastDeletedId: null },
};

describe('customersSlice', () => {
  it('listRequest sets loading', () => {
    expect(
      reducer(initial, listRequest({ page: 1, limit: 10, sortBy: 'createdAt', order: 'desc' })),
    ).toEqual({
      ...initial,
      list: { ...initial.list, loading: true, error: null },
    });
  });

  it('listSuccess replaces items + pagination', () => {
    const state = reducer(
      initial,
      listSuccess({
        items: [baseCustomer],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1, hasNext: false, hasPrev: false },
        query: { page: 1, limit: 10, sortBy: 'createdAt', order: 'desc' },
      }),
    );
    expect(state.list.items).toEqual([baseCustomer]);
    expect(state.list.pagination.total).toBe(1);
    expect(state.list.loading).toBe(false);
  });

  it('listFailure sets error, clears loading', () => {
    const state = reducer(initial, listFailure('oops'));
    expect(state.list.error).toBe('oops');
    expect(state.list.loading).toBe(false);
  });

  it('getRequest sets current.loading', () => {
    const state = reducer(initial, getRequest('c1'));
    expect(state.current.loading).toBe(true);
    expect(state.current.error).toBeNull();
  });

  it('getSuccess sets current.item', () => {
    const state = reducer(initial, getSuccess(baseCustomer));
    expect(state.current.item).toEqual(baseCustomer);
    expect(state.current.loading).toBe(false);
  });

  it('createSuccess prepends to list, increments total', () => {
    const newCustomer = { ...baseCustomer, id: 'c2' };
    const state = reducer(
      {
        ...initial,
        list: {
          ...initial.list,
          items: [baseCustomer],
          pagination: { ...initial.list.pagination, total: 1 },
        },
      },
      createSuccess(newCustomer),
    );
    expect(state.list.items).toEqual([newCustomer, baseCustomer]);
    expect(state.list.pagination.total).toBe(2);
  });

  it('updateSuccess replaces in list + current', () => {
    const updated = { ...baseCustomer, occupation: 'Senior' };
    const state = reducer(
      {
        ...initial,
        list: { ...initial.list, items: [baseCustomer] },
        current: { item: baseCustomer, loading: false, error: null },
      },
      updateSuccess(updated),
    );
    expect(state.list.items[0].occupation).toBe('Senior');
    expect(state.current.item?.occupation).toBe('Senior');
  });

  it('deleteSuccess removes from list, decrements total', () => {
    const state = reducer(
      {
        ...initial,
        list: {
          ...initial.list,
          items: [baseCustomer],
          pagination: { ...initial.list.pagination, total: 1 },
        },
      },
      deleteSuccess('c1'),
    );
    expect(state.list.items).toEqual([]);
    expect(state.list.pagination.total).toBe(0);
    expect(state.mutation.lastDeletedId).toBe('c1');
  });
});
