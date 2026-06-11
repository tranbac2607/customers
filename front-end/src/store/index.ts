import { combineReducers, configureStore } from '@reduxjs/toolkit';
import createSagaMiddlewareFactory from 'redux-saga';
import { rootReducer } from './rootReducer';
import { rootSaga } from './rootSaga';

const combined = combineReducers(rootReducer);

let _store: AppStore | null = null;

export const makeStore = () => {
  const sagaMiddleware = createSagaMiddlewareFactory();

  const store = configureStore({
    reducer: combined,
    middleware: (gDM) => gDM().concat(sagaMiddleware),
    devTools: process.env.NODE_ENV !== 'production',
  });

  sagaMiddleware.run(rootSaga);

  _store = store as unknown as AppStore;

  return store;
};

export const getStore = (): AppStore => {
  if (!_store) throw new Error('Store not initialized. Call makeStore() first.');
  return _store;
};

// Convenience accessors (axios uses these)
export const store = {
  getState: () => getStore().getState(),
  dispatch: (action: unknown) => getStore().dispatch(action as never),
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
