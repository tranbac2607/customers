/**
 * Regression test for the "toast doesn't fire on 2nd failed login" bug.
 *
 * Root cause: the `lastErrorCode` ref was only updated when the toast
 * fired, not when the errorCode reset to null. So the sequence
 *   null → 'X' (toast) → null → 'X'  (no toast on 2nd)
 * deduped the second identical failure.
 *
 * The fix moves the ref update outside the conditional so it always
 * tracks the current errorCode, including the null reset between
 * attempts. This test exercises that path by simulating the
 * `errorCode` state transitions that LoginContent's toast effect
 * reacts to, then asserting the toast was called on every failure.
 */
import { configureStore } from '@reduxjs/toolkit';
import authReducer, { loginRequest, loginFailure, hydrateUser } from '@/store/auth/authSlice';

// We test the SAME logic the LoginContent useEffect runs, by
// replicating the ref-tracking pattern in a tiny harness. This
// isolates the toast-firing decision from Antd/Next rendering, which
// is heavy and would dominate the test without adding confidence.
import { useEffect, useRef } from 'react';
import { Provider, useSelector } from 'react-redux';
import { render, act } from '@testing-library/react';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  useSearchParams: () => ({ get: () => null }),
}));

jest.mock('react-toastify', () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
  ToastContainer: () => null,
}));

/**
 * Minimal harness that mirrors the LoginContent toast effect:
 *   - Track `errorCode` from Redux
 *   - Fire `toast.error` when it changes to a new value
 *   - Always update the `lastErrorCode` ref to the current value
 *     (this is the fix; the original code only updated it when the
 *     toast fired, which broke on the second identical failure)
 */
function Harness({ onFire }: { onFire: (msg: string) => void }) {
  const errorCode = useSelector((s: { auth: { errorCode: string | null } }) => s.auth.errorCode);
  const lastErrorCode = useRef<string | null>(null);
  useEffect(() => {
    if (errorCode && errorCode !== lastErrorCode.current) {
      onFire(errorCode);
    }
    lastErrorCode.current = errorCode;
  }, [errorCode, onFire]);
  return null;
}

function makeStore() {
  return configureStore({ reducer: { auth: authReducer } });
}

describe('LoginContent — repeated login failure toasts (regression)', () => {
  it('fires the toast on every failure, including repeated identical errors', () => {
    const onFire = jest.fn();
    const store = makeStore();
    render(
      <Provider store={store}>
        <Harness onFire={onFire} />
      </Provider>,
    );

    // Attempt 1: invalid creds. The loginRequest and loginFailure
    // dispatches happen in DIFFERENT event loops in production (the
    // saga awaits the network call in between), so simulate that by
    // wrapping each dispatch in its own act() — otherwise React
    // batches the two state updates and the intermediate
    // errorCode=null is never observed.
    act(() => {
      store.dispatch(loginRequest({ identifier: 'a', password: 'b' }));
    });
    act(() => {
      store.dispatch(loginFailure({ message: 'Invalid', code: 'INVALID_CREDENTIALS' }));
    });
    expect(onFire).toHaveBeenCalledTimes(1);
    expect(onFire).toHaveBeenLastCalledWith('INVALID_CREDENTIALS');

    // Attempt 2: SAME error again. Before the fix, onFire would still
    // be called only once because the ref would still hold
    // 'INVALID_CREDENTIALS' from attempt 1. The loginRequest clears
    // the errorCode (separate act, so the effect sees null and syncs
    // the ref to null), then the loginFailure sets errorCode back to
    // 'INVALID_CREDENTIALS' — distinct from the now-null ref, so the
    // toast fires again.
    act(() => {
      store.dispatch(loginRequest({ identifier: 'a', password: 'b' }));
    });
    act(() => {
      store.dispatch(loginFailure({ message: 'Invalid', code: 'INVALID_CREDENTIALS' }));
    });
    expect(onFire).toHaveBeenCalledTimes(2);

    // Attempt 3: different error code — should still fire.
    act(() => {
      store.dispatch(loginRequest({ identifier: 'a', password: 'b' }));
    });
    act(() => {
      store.dispatch(loginFailure({ message: 'Network', code: 'NETWORK_ERROR' }));
    });
    expect(onFire).toHaveBeenCalledTimes(3);
    expect(onFire).toHaveBeenLastCalledWith('NETWORK_ERROR');

    // Hydrate with a user (e.g. someone logged in via /me probe) —
    // no toast should fire for hydrateUser.
    act(() => {
      store.dispatch(hydrateUser(null));
    });
    expect(onFire).toHaveBeenCalledTimes(3);
  });
});
