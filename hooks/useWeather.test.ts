/**
 * Property-based tests for the `useWeather` hook.
 *
 * Feature: weather-app
 * Properties covered:
 *   10 – Any API error status suppresses WeatherCard and shows error message
 *   15 – Different city name always triggers a new fetch
 *   16 – Same city name never triggers a duplicate fetch
 *   17 – In-flight guard prevents all duplicate requests
 */

import * as fc from 'fast-check';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWeather } from './useWeather';

// ---------------------------------------------------------------------------
// Mock @/lib/geolocation so the hook can be imported in jsdom
// ---------------------------------------------------------------------------
jest.mock('@/lib/geolocation', () => ({
  getCoordinates: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal WeatherPayload that satisfies the type */
const MOCK_WEATHER_PAYLOAD = {
  city: 'London',
  temperature: 15.0,
  humidity: 72,
  windSpeed: 18.4,
  condition: 'Clouds',
  icon: 'https://openweathermap.org/img/wn/04d@2x.png',
};

/** Minimal ForecastPayload */
const MOCK_FORECAST_PAYLOAD = {
  city: 'London',
  forecast: [],
};

/**
 * Creates a fetch mock that returns a successful weather response followed by
 * a successful forecast response (for the fire-and-forget call).
 */
function makeSuccessFetch() {
  return jest.fn().mockImplementation((url: string) => {
    if (typeof url === 'string' && url.includes('/api/forecast')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(MOCK_FORECAST_PAYLOAD),
      });
    }
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(MOCK_WEATHER_PAYLOAD),
    });
  });
}

/**
 * Creates a fetch mock that returns the given HTTP error status for weather
 * requests and a success for forecast requests (though forecast won't be
 * reached on error paths).
 */
function makeErrorFetch(status: number) {
  return jest.fn().mockResolvedValue({
    ok: false,
    status,
    json: () => Promise.resolve({ error: 'error' }),
  });
}

// ---------------------------------------------------------------------------
// Property 10: Any API error status suppresses WeatherCard and shows error
// ---------------------------------------------------------------------------

describe('Property 10: Any API error status suppresses WeatherCard and shows error message', () => {
  // Feature: weather-app, Property 10: Any API error status suppresses WeatherCard and shows error message

  /**
   * **Validates: Requirements 4.4**
   *
   * For any 4xx/5xx status code, `state.error` must be non-null and
   * `state.weatherPayload` must be null after the search settles.
   */
  it('sets error and clears weatherPayload for any error status code', async () => {
    const errorStatuses = [400, 401, 403, 404, 500, 502, 503, 504];

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...errorStatuses),
        async (status) => {
          const mockFetch = makeErrorFetch(status);
          global.fetch = mockFetch as unknown as typeof fetch;

          const { result, unmount } = renderHook(() => useWeather());

          await act(async () => {
            await result.current.search('London');
          });

          await waitFor(() => {
            expect(result.current.state.isLoading).toBe(false);
          });

          const { error, weatherPayload } = result.current.state;

          unmount();

          // error must be a non-empty string
          if (typeof error !== 'string' || error.length === 0) return false;
          // weatherPayload must be null
          if (weatherPayload !== null) return false;

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 15: Different city name always triggers a new fetch
// ---------------------------------------------------------------------------

describe('Property 15: Different city name always triggers a new fetch', () => {
  // Feature: weather-app, Property 15: Different city name always triggers a new fetch

  /**
   * **Validates: Requirements 8.2**
   *
   * After a successful search for 'london', any city whose trim().toLowerCase()
   * differs from 'london' must cause fetch to be called a second time.
   */
  it('dispatches a new request when the city differs from lastQuery', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a city name whose normalised form is NOT 'london'
        fc
          .string({ minLength: 1, maxLength: 50 })
          .filter(
            (s) =>
              s.trim().toLowerCase() !== 'london' &&
              s.trim().length > 0
          ),
        async (differentCity) => {
          const mockFetch = makeSuccessFetch();
          global.fetch = mockFetch as unknown as typeof fetch;

          const { result, unmount } = renderHook(() => useWeather());

          // First search – establishes lastQuery = 'london'
          await act(async () => {
            await result.current.search('london');
          });

          await waitFor(() => {
            expect(result.current.state.lastQuery).toBe('london');
          });

          const callsAfterFirst = mockFetch.mock.calls.length;

          // Second search with a different city
          await act(async () => {
            await result.current.search(differentCity);
          });

          await waitFor(() => {
            expect(result.current.state.isLoading).toBe(false);
          });

          const callsAfterSecond = mockFetch.mock.calls.length;

          unmount();

          // At least one additional fetch must have been dispatched
          return callsAfterSecond > callsAfterFirst;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 16: Same city name never triggers a duplicate fetch
// ---------------------------------------------------------------------------

describe('Property 16: Same city name never triggers a duplicate fetch', () => {
  // Feature: weather-app, Property 16: Same city name never triggers a duplicate fetch

  /**
   * **Validates: Requirements 8.3**
   *
   * After a successful search for 'London' (lastQuery = 'london'), calling
   * search('London') again must NOT dispatch a new fetch.
   */
  it('does not dispatch a new request when the city matches lastQuery', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate city strings that normalise to 'london'
        fc.constantFrom('London', 'london', 'LONDON', ' London ', 'London '),
        async (sameCity) => {
          const mockFetch = makeSuccessFetch();
          global.fetch = mockFetch as unknown as typeof fetch;

          const { result, unmount } = renderHook(() => useWeather());

          // First search – establishes lastQuery = 'london'
          await act(async () => {
            await result.current.search('London');
          });

          await waitFor(() => {
            expect(result.current.state.lastQuery).toBe('london');
          });

          const callsAfterFirst = mockFetch.mock.calls.length;

          // Second search with the same normalised city
          await act(async () => {
            await result.current.search(sameCity);
          });

          // A small tick to let any potential async work settle
          await act(async () => {
            await Promise.resolve();
          });

          const callsAfterSecond = mockFetch.mock.calls.length;

          unmount();

          // fetch call count must NOT have increased
          return callsAfterSecond === callsAfterFirst;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 17: In-flight guard prevents all duplicate requests
// ---------------------------------------------------------------------------

describe('Property 17: In-flight guard prevents all duplicate requests', () => {
  // Feature: weather-app, Property 17: In-flight guard prevents all duplicate requests

  /**
   * **Validates: Requirements 8.4**
   *
   * While a request is in-flight (fetch never resolves), N additional
   * search() calls must result in exactly 1 total fetch dispatch.
   */
  it('ignores all additional search calls while a request is in-flight', async () => {
    await fc.assert(
      fc.asyncProperty(
        // N additional calls: 1 to 10
        fc.integer({ min: 1, max: 10 }),
        async (n) => {
          // fetch that never resolves – simulates an in-flight request
          let resolveFirst!: () => void;
          const neverResolvingFetch = jest.fn().mockImplementation(() => {
            return new Promise<Response>((resolve) => {
              resolveFirst = () =>
                resolve({
                  ok: true,
                  status: 200,
                  json: () => Promise.resolve(MOCK_WEATHER_PAYLOAD),
                } as Response);
            });
          });

          global.fetch = neverResolvingFetch as unknown as typeof fetch;

          const { result, unmount } = renderHook(() => useWeather());

          // Kick off the first (in-flight) request – do NOT await it
          act(() => {
            result.current.search('London');
          });

          // Give the hook a tick to set isRequestInFlight = true
          await act(async () => {
            await Promise.resolve();
          });

          // Fire N additional searches while the first is still in-flight
          for (let i = 0; i < n; i++) {
            await act(async () => {
              await result.current.search(`Paris${i}`);
            });
          }

          const totalCalls = neverResolvingFetch.mock.calls.length;

          // Resolve the pending fetch so the hook can clean up
          act(() => {
            resolveFirst();
          });

          unmount();

          // Exactly 1 fetch must have been dispatched
          return totalCalls === 1;
        }
      ),
      { numRuns: 100 }
    );
  });
});
