import { call, put, takeLatest } from 'redux-saga/effects';
import { AxiosError } from 'axios';
import { api } from '@/lib/axios';
import type { ApiFailure, ApiResponse, Paginated } from '@/types/api';
import type { Customer, CreateCustomerPayload, CustomerListQuery, UpdateCustomerPayload } from './customerTypes';
import {
  createFailure,
  createRequest,
  createSuccess,
  deleteFailure,
  deleteRequest,
  deleteSuccess,
  getFailure,
  getRequest,
  getSuccess,
  listFailure,
  listRequest,
  listSuccess,
  updateFailure,
  updateRequest,
  updateSuccess,
} from './customersSlice';

function extractErrorMessage(err: unknown): string {
  const e = err as AxiosError<ApiFailure>;
  return e.response?.data?.error?.message ?? e.message ?? 'Request failed';
}

function* handleList(action: ReturnType<typeof listRequest>): Generator {
  try {
    const q: CustomerListQuery = action.payload;
    const res = yield call(() =>
      api.get<ApiResponse<Paginated<Customer>>>('/customers', { params: q }),
    );
    const body = res.data;
    if (!body.success) {
      yield put(listFailure(body.error.message));
      return;
    }
    yield put(listSuccess({ items: body.data.items, pagination: body.data.pagination, query: q }));
  } catch (err) {
    yield put(listFailure(extractErrorMessage(err)));
  }
}

function* handleGet(action: ReturnType<typeof getRequest>): Generator {
  try {
    const res = yield call(() => api.get<ApiResponse<Customer>>(`/customers/${action.payload}`));
    const body = res.data;
    if (!body.success) {
      yield put(getFailure(body.error.message));
      return;
    }
    yield put(getSuccess(body.data));
  } catch (err) {
    yield put(getFailure(extractErrorMessage(err)));
  }
}

function* handleCreate(action: ReturnType<typeof createRequest>): Generator {
  try {
    const payload = action.payload as CreateCustomerPayload;
    const res = yield call(() => api.post<ApiResponse<Customer>>('/customers', payload));
    const body = res.data;
    if (!body.success) {
      yield put(createFailure(body.error.message));
      return;
    }
    yield put(createSuccess(body.data));
  } catch (err) {
    yield put(createFailure(extractErrorMessage(err)));
  }
}

function* handleUpdate(action: ReturnType<typeof updateRequest>): Generator {
  try {
    const { id, data } = action.payload as { id: string; data: UpdateCustomerPayload };
    const res = yield call(() => api.put<ApiResponse<Customer>>(`/customers/${id}`, data));
    const body = res.data;
    if (!body.success) {
      yield put(updateFailure(body.error.message));
      return;
    }
    yield put(updateSuccess(body.data));
  } catch (err) {
    yield put(updateFailure(extractErrorMessage(err)));
  }
}

function* handleDelete(action: ReturnType<typeof deleteRequest>): Generator {
  try {
    const id = action.payload;
    const res = yield call(() => api.delete<ApiResponse<null>>(`/customers/${id}`));
    if (res.status !== 204) {
      // some axios versions may pass through 204 with empty body
      const body = res.data;
      if (body && !body.success) {
        yield put(deleteFailure(body.error.message));
        return;
      }
    }
    yield put(deleteSuccess(id));
  } catch (err) {
    yield put(deleteFailure(extractErrorMessage(err)));
  }
}

export function* customersSaga(): Generator {
  yield takeLatest(listRequest.type, handleList);
  yield takeLatest(getRequest.type, handleGet);
  yield takeLatest(createRequest.type, handleCreate);
  yield takeLatest(updateRequest.type, handleUpdate);
  yield takeLatest(deleteRequest.type, handleDelete);
}
