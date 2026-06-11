import reducer, {
  increment,
  decrement,
  reset,
  fetchRequest,
  fetchSuccess,
  fetchFailure,
  type CounterState,
} from './counterSlice';

const initial: CounterState = { value: 0, loading: false, error: null };

describe('counterSlice', () => {
  it('returns initial state', () => {
    expect(reducer(undefined, { type: '@@INIT' })).toEqual(initial);
  });

  it('increment', () => {
    expect(reducer(initial, increment())).toEqual({ ...initial, value: 1 });
  });

  it('decrement', () => {
    expect(reducer({ ...initial, value: 5 }, decrement())).toEqual({ ...initial, value: 4 });
  });

  it('reset', () => {
    expect(reducer({ ...initial, value: 99 }, reset())).toEqual(initial);
  });

  it('fetchRequest sets loading', () => {
    expect(reducer(initial, fetchRequest())).toEqual({ ...initial, loading: true, error: null });
  });

  it('fetchSuccess updates value, clears loading', () => {
    expect(reducer({ ...initial, loading: true }, fetchSuccess(42))).toEqual({
      value: 42,
      loading: false,
      error: null,
    });
  });

  it('fetchFailure sets error, clears loading', () => {
    expect(reducer({ ...initial, loading: true }, fetchFailure('boom'))).toEqual({
      value: 0,
      loading: false,
      error: 'boom',
    });
  });
});
