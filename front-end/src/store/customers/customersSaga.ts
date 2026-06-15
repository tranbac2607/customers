import { call, put, takeLatest } from 'redux-saga/effects';
import { AxiosError } from 'axios';
import { api } from '@/lib/axios';
import type { ApiFailure, ApiResponse, Paginated } from '@/types/api';
import type {
  Customer,
  CreateCustomerPayload,
  CustomerListQuery,
  UpdateCustomerPayload,
} from './customerTypes';
import {
  bulkDeleteFailure,
  bulkDeleteRequest,
  bulkDeleteSuccess,
  createFailure,
  createRequest,
  createSuccess,
  deleteFailure,
  deleteRequest,
  deleteSuccess,
  exportFailure,
  exportRequest,
  exportSuccess,
  getFailure,
  getRequest,
  getSuccess,
  listFailure,
  listRequest,
  listSuccess,
  restoreFailure,
  restoreRequest,
  restoreSuccess,
  trashFailure,
  trashRequest,
  trashSuccess,
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

function* handleTrash(action: ReturnType<typeof trashRequest>): Generator {
  try {
    const q: CustomerListQuery = action.payload;
    const res = yield call(() =>
      api.get<ApiResponse<Paginated<Customer>>>('/customers/trash', { params: q }),
    );
    const body = res.data;
    if (!body.success) {
      yield put(trashFailure(body.error.message));
      return;
    }
    yield put(trashSuccess({ items: body.data.items, pagination: body.data.pagination, query: q }));
  } catch (err) {
    yield put(trashFailure(extractErrorMessage(err)));
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

function* handleRestore(action: ReturnType<typeof restoreRequest>): Generator {
  try {
    const id = action.payload;
    const res = yield call(() => api.post<ApiResponse<Customer>>(`/customers/${id}/restore`));
    const body = res.data;
    if (!body.success) {
      yield put(restoreFailure(body.error.message));
      return;
    }
    yield put(restoreSuccess(body.data));
  } catch (err) {
    yield put(restoreFailure(extractErrorMessage(err)));
  }
}

function* handleBulkDelete(action: ReturnType<typeof bulkDeleteRequest>): Generator {
  try {
    const ids: string[] = action.payload;
    const res = yield call(() =>
      api.post<ApiResponse<{ deleted: number }>>('/customers/bulk-delete', { ids }),
    );
    const body = res.data;
    if (!body.success) {
      yield put(bulkDeleteFailure(body.error.message));
      return;
    }
    yield put(bulkDeleteSuccess({ requested: ids.length, deleted: body.data.deleted }));
  } catch (err) {
    yield put(bulkDeleteFailure(extractErrorMessage(err)));
  }
}

function* handleExport(action: ReturnType<typeof exportRequest>): Generator {
  try {
    const q: CustomerListQuery = action.payload;
    const params = new URLSearchParams();
    Object.entries(q).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
    });
    // Hit the BE directly for the CSV. We can't use window.open
    // here because the response is text/csv and the browser would
    // just render the raw CSV body as a document — we need an
    // actual download. Fetch as a Blob, hand the browser a Blob URL
    // with the right Content-Disposition filename, and click an
    // <a download> element to trigger the save-as dialog.
    const url = `${api.defaults.baseURL}/customers/export?${params.toString()}`;
    const res: { data: Blob; headers: Record<string, string> } = yield call(() =>
      api.get(url, { responseType: 'blob' }),
    );
    const blob = res.data;
    const disposition = res.headers['content-disposition'] ?? '';
    const match = /filename="?([^";]+)"?/i.exec(disposition);
    const filename = match?.[1] ?? `customers-${new Date().toISOString().slice(0, 10)}.csv`;
    const blobUrl = URL.createObjectURL(blob);
    if (typeof window !== 'undefined') {
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Release the Blob URL on the next tick; the browser needs
      // the URL to be valid for the duration of the click.
      setTimeout(() => URL.revokeObjectURL(blobUrl), 0);
    }
    yield put(exportSuccess());
  } catch (err) {
    yield put(exportFailure(extractErrorMessage(err)));
  }
}

export function* customersSaga(): Generator {
  yield takeLatest(listRequest.type, handleList);
  yield takeLatest(trashRequest.type, handleTrash);
  yield takeLatest(getRequest.type, handleGet);
  yield takeLatest(createRequest.type, handleCreate);
  yield takeLatest(updateRequest.type, handleUpdate);
  yield takeLatest(deleteRequest.type, handleDelete);
  yield takeLatest(restoreRequest.type, handleRestore);
  yield takeLatest(bulkDeleteRequest.type, handleBulkDelete);
  yield takeLatest(exportRequest.type, handleExport);
}