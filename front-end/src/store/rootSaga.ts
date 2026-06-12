import { all, fork } from 'redux-saga/effects';
import { authSaga } from '@/store/auth/authSaga';
import { customersSaga } from '@/store/customers/customersSaga';

export function* rootSaga(): Generator {
  yield all([fork(authSaga), fork(customersSaga)]);
}
