import * as fc from 'fast-check';
import debounce from './debounce';

// Feature: weather-app, Property 2: Debouncer fires exactly once after inactivity

describe('debounce property tests', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  /**
   * **Validates: Requirements 1.3, 8.1**
   *
   * Property 2: For any sequence of N >= 2 calls where each inter-call interval
   * is < 500 ms, the underlying function is dispatched exactly once after
   * 500 ms of inactivity following the last call.
   */
  it('fires exactly once after 500 ms of inactivity regardless of call sequence', () => {
    // Feature: weather-app, Property 2: Debouncer fires exactly once after inactivity
    fc.assert(
      fc.property(
        // Generate a sequence of N >= 2 inter-call intervals, each in [1, 499] ms
        fc.array(fc.integer({ min: 1, max: 499 }), { minLength: 1, maxLength: 10 }),
        (intervals) => {
          const fn = jest.fn();
          const debounced = debounce(fn, 500);

          // First call
          debounced();

          // Subsequent calls, each separated by an interval < 500 ms
          for (const interval of intervals) {
            jest.advanceTimersByTime(interval);
            debounced();
          }

          // Advance past the debounce delay after the last call
          jest.advanceTimersByTime(500);

          const callCount = fn.mock.calls.length;

          // Cleanup for next iteration
          debounced.cancel();
          jest.clearAllTimers();
          fn.mockReset();

          return callCount === 1;
        }
      ),
      { numRuns: 100 }
    );
  });
});
