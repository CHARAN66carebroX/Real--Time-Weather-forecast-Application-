import debounce from './debounce';

describe('debounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not call the function before the delay has elapsed', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 500);

    debounced('hello');
    expect(fn).not.toHaveBeenCalled();
  });

  it('calls the function once after the delay has elapsed', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 500);

    debounced('hello');
    jest.advanceTimersByTime(500);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('hello');
  });

  it('resets the timer on each call and fires only once after the last call', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 500);

    debounced('first');
    jest.advanceTimersByTime(300);
    debounced('second');
    jest.advanceTimersByTime(300);
    debounced('third');
    jest.advanceTimersByTime(500);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('third');
  });

  it('does not fire if cancelled before the delay elapses', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 500);

    debounced('hello');
    debounced.cancel();
    jest.advanceTimersByTime(500);

    expect(fn).not.toHaveBeenCalled();
  });

  it('can be called again after cancel', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 500);

    debounced('first');
    debounced.cancel();
    jest.advanceTimersByTime(500);

    debounced('second');
    jest.advanceTimersByTime(500);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('second');
  });

  it('cancel is a no-op when no timer is pending', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 500);

    // No call made yet — cancel should not throw
    expect(() => debounced.cancel()).not.toThrow();
  });

  it('passes multiple arguments correctly', () => {
    const fn = jest.fn();
    const debounced = debounce(fn as (...args: unknown[]) => void, 200);

    debounced('a', 'b', 'c');
    jest.advanceTimersByTime(200);

    expect(fn).toHaveBeenCalledWith('a', 'b', 'c');
  });

  it('fires immediately after delay with zero delayMs', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 0);

    debounced();
    jest.advanceTimersByTime(0);

    expect(fn).toHaveBeenCalledTimes(1);
  });
});
