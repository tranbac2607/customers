'use client';

import { combineReducers, configureStore } from '@reduxjs/toolkit';
import * as sagaEffects from 'redux-saga/effects';
import createSagaMiddlewareFactory from 'redux-saga';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { rootReducer } from './rootReducer';
import { rootSaga } from './rootSaga';

const combined = combineReducers(rootReducer);

const persistConfig = {
  key: 'cm-root',
  version: 1,
  storage,
  whitelist: ['auth'],
};

const persistedReducer = persistReducer(persistConfig, combined);

// Module-level singleton store (set in Providers).
let _store: AppStore | null = null;
let _persistor: ReturnType<typeof persistStore> | null = null;

export const makeStore = () => {
  const sagaMiddleware = createSagaMiddlewareFactory();

  const store = configureStore({
    reducer: persistedReducer,
    middleware: (gDM) =>
      gDM({
        serializableCheck: {
          ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
        },
      }).concat(sagaMiddleware),
    devTools: process.env.NODE_ENV !== 'production',
  });

  sagaMiddleware.run(rootSaga);

  _store = store as unknown as AppStore;
  _persistor = persistStore(store);

  return store;
};

export const getStore = (): AppStore => {
  if (!_store) throw new Error('Store not initialized. Call makeStore() first.');
  return _store;
};

export const getPersistor = () => {
  if (!_persistor) throw new Error('Persistor not initialized. Call makeStore() first.');
  return _persistor;
};

// Convenience accessors (axios uses these)
export const store = {
  getState: () => getStore().getState(),
  dispatch: (action: unknown) => getStore().dispatch(action as never),
};

export const persistor = {
  get persistor() {
    return getPersistor();
  },
};

// re-export saga effects for convenience
export { sagaEffects };

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
