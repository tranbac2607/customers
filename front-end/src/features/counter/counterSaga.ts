import { takeLatest, put, delay } from 'redux-saga/effects';
import { fetchRequest, fetchFailure, fetchSuccess } from './counterSlice';

function* handleFetch(): Generator {
  try {
    yield delay(600);
    yield put(fetchSuccess(Math.floor(Math.random() * 100)));
  } catch (e) {
    yield put(fetchFailure((e as Error).message));
  }
}

export function* counterSaga(): Generator {
  yield takeLatest(fetchRequest.type, handleFetch);
}
