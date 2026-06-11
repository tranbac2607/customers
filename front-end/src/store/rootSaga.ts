import { all, fork } from 'redux-saga/effects';
import { counterSaga } from '@/features/counter/counterSaga';
import { authSaga } from '@/features/auth/authSaga';
import { customersSaga } from '@/features/customers/customersSaga';

export function* rootSaga(): Generator {
  yield all([fork(counterSaga), fork(authSaga), fork(customersSaga)]);
}
