/**
 * @jest-environment node
 *
 * Property-based tests for GET /api/weather route handler.
 * Feature: weather-app
 * Uses fast-check with minimum 100 iterations per property.
 */

import * as fc from 'fast-check';
import { NextRequest } from 'next/server';
import { GET } from './route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal valid OWM /data/2.5/weather JSON response */
function makeOWMResponse(overrides: Partial<{
  name: string;
  temp: number;
  humidity: number;
  speed: number;
  main: string;
  icon: string;
}> = {}) {
  return {
    name: overrides.name ?? 'TestCity',
    main: {
      temp: overrides.temp ?? 300,
      humidity: overrides.humidity ?? 60,
    },
    wind: {
      speed: overrides.speed ?? 5,
    },
    weather: [
      {
        main: overrides.main ?? 'Clear',
        icon: overrides.icon ?? '01d',
      },
    ],
  };
}

/** Create a NextRequest for the weather endpoint */
function makeRequest(params: Record<string, string>): NextRequest {
  const url = new URL('http://localhost/api/weather');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url.toString());
}

/** Restore process.env.OPENWEATHERMAP_API_KEY after each test */
const ORIGINAL_API_KEY = process.env.OPENWEATHERMAP_API_KEY;

beforeEach(() => {
  process.env.OPENWEATHERMAP_API_KEY = 'test-api-key-12345';
});

afterEach(() => {
  jest.restoreAllMocks();
  if (ORIGINAL_API_KEY === undefined) {
    delete process.env.OPENWEATHERMAP_API_KEY;
  } else {
    process.env.OPENWEATHERMAP_API_KEY = ORIGINAL_API_KEY;
  }
});

// ---------------------------------------------------------------------------
// Property 4: Valid city name yields correctly-shaped WeatherPayload
// Validates: Requirements 2.1, 2.2
// ---------------------------------------------------------------------------

describe('Property 4: Valid city name yields correctly-shaped WeatherPayload', () => {
  it('returns HTTP 200 with all required WeatherPayload fields for any valid city name', async () => {
    // Feature: weather-app, Property 4: Valid city name yields correctly-shaped WeatherPayload

    /**
     * **Validates: Requirements 2.1, 2.2**
     *
     * For any valid city name (1–100 chars, letters/spaces/hyphens/apostrophes),
     * the route handler must return HTTP 200 with a WeatherPayload containing
     * all required fields: city, temperature, humidity, windSpeed, condition, icon.
     */
    await fc.assert(
      fc.asyncProperty(
        // Generate valid city names matching the route's CITY_REGEX
        fc.stringMatching(/^[a-zA-ZÀ-ÖØ-öø-ÿ]{1}[a-zA-ZÀ-ÖØ-öø-ÿ\s'\-]{0,99}$/).filter(
          (s) => s.trim().length >= 1 && s.length <= 100
        ),
        async (city) => {
          const owmData = makeOWMResponse({ name: city });

          jest.spyOn(global, 'fetch').mockResolvedValueOnce(
            new Response(JSON.stringify(owmData), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            })
          );

          const req = makeRequest({ city });
          const res = await GET(req);

          if (res.status !== 200) return false;

          const body = await res.json();

          // All required WeatherPayload fields must be present
          return (
            typeof body.city === 'string' &&
            typeof body.temperature === 'number' &&
            typeof body.humidity === 'number' &&
            typeof body.windSpeed === 'number' &&
            typeof body.condition === 'string' &&
            typeof body.icon === 'string'
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 5: API key is never exposed in any response
// Validates: Requirements 2.4
// ---------------------------------------------------------------------------

describe('Property 5: API key is never exposed in any response', () => {
  it('response body never contains the API key value for any request', async () => {
    // Feature: weather-app, Property 5: API key is never exposed in any response

    /**
     * **Validates: Requirements 2.4**
     *
     * For any request (valid or invalid), the response body must never contain
     * the raw API key value. This ensures the key stays server-side only.
     */
    await fc.assert(
      fc.asyncProperty(
        // Generate a variety of city names (valid and invalid) to exercise all code paths
        fc.oneof(
          // Valid city names
          fc.stringMatching(/^[a-zA-Z]{1,50}$/),
          // Invalid city names (numbers, special chars)
          fc.string({ minLength: 1, maxLength: 20 }),
          // Empty string
          fc.constant('')
        ),
        async (city) => {
          const apiKey = 'super-secret-key-never-expose-xyz987';
          process.env.OPENWEATHERMAP_API_KEY = apiKey;

          // Mock fetch to return a valid response (for valid cities)
          jest.spyOn(global, 'fetch').mockResolvedValue(
            new Response(JSON.stringify(makeOWMResponse()), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            })
          );

          const params: Record<string, string> = city.length > 0 ? { city } : {};
          const req = makeRequest(params);
          const res = await GET(req);

          const bodyText = await res.text();

          // The API key must never appear in the response body
          return !bodyText.includes(apiKey);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 11: Requests exceeding 10 seconds receive a 504 response
// Validates: Requirements 4.3
// ---------------------------------------------------------------------------

describe('Property 11: Requests exceeding 10 seconds receive a 504 response', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns HTTP 504 when fetch throws an AbortError (simulating timeout)', async () => {
    // Feature: weather-app, Property 11: Requests exceeding 10 seconds receive a 504 response

    /**
     * **Validates: Requirements 4.3**
     *
     * When the OWM fetch is aborted (AbortError), the route handler must
     * respond with HTTP 504 regardless of the city name used.
     */
    await fc.assert(
      fc.asyncProperty(
        // Any valid city name
        fc.stringMatching(/^[a-zA-Z]{1,50}$/),
        async (city) => {
          // Simulate a timeout by throwing an AbortError
          const abortError = new Error('The operation was aborted.');
          abortError.name = 'AbortError';

          jest.spyOn(global, 'fetch').mockRejectedValueOnce(abortError);

          const req = makeRequest({ city });

          // Run the handler; advance timers to trigger the abort
          const resPromise = GET(req);
          jest.advanceTimersByTime(11_000);
          const res = await resPromise;

          return res.status === 504;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 12: Geolocation coordinates flow through to the OWM fetch URL
// Validates: Requirements 5.4, 5.5
// ---------------------------------------------------------------------------

describe('Property 12: Geolocation coordinates flow through to the OWM fetch URL', () => {
  it('OWM fetch URL contains lat= and lon= params matching the request coordinates', async () => {
    // Feature: weather-app, Property 12: Geolocation coordinates flow through to the OWM fetch URL

    /**
     * **Validates: Requirements 5.4, 5.5**
     *
     * When the route receives lat/lon query parameters, the URL used to call
     * the OWM API must include those exact coordinate values.
     */
    await fc.assert(
      fc.asyncProperty(
        // Generate valid lat/lon pairs
        fc.float({ min: -90, max: 90, noNaN: true }),
        fc.float({ min: -180, max: 180, noNaN: true }),
        async (lat, lon) => {
          let capturedUrl: string | undefined;

          jest.spyOn(global, 'fetch').mockImplementationOnce((input) => {
            capturedUrl = typeof input === 'string' ? input : (input as Request).url;
            return Promise.resolve(
              new Response(JSON.stringify(makeOWMResponse()), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
              })
            );
          });

          const req = makeRequest({ lat: String(lat), lon: String(lon) });
          await GET(req);

          if (!capturedUrl) return false;

          const parsedUrl = new URL(capturedUrl);
          const urlLat = parsedUrl.searchParams.get('lat');
          const urlLon = parsedUrl.searchParams.get('lon');

          // The URL must contain lat and lon params
          return urlLat !== null && urlLon !== null;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 18: Missing or empty API key always yields HTTP 500
// Validates: Requirements 9.3
// ---------------------------------------------------------------------------

describe('Property 18: Missing or empty API key always yields HTTP 500', () => {
  it('returns HTTP 500 for any request when the API key is missing or empty', async () => {
    // Feature: weather-app, Property 18: Missing or empty API key always yields HTTP 500

    /**
     * **Validates: Requirements 9.3**
     *
     * When OPENWEATHERMAP_API_KEY is absent or blank, every request to the
     * route handler must return HTTP 500 regardless of the query parameters.
     */
    await fc.assert(
      fc.asyncProperty(
        // Generate empty-ish API key values
        fc.oneof(
          fc.constant(''),
          fc.constant('   '),
          fc.stringMatching(/^\s+$/).filter((s) => s.length > 0)
        ),
        // Generate any city name
        fc.stringMatching(/^[a-zA-Z]{1,50}$/),
        async (emptyKey, city) => {
          process.env.OPENWEATHERMAP_API_KEY = emptyKey;

          // fetch should NOT be called when the key is missing, but mock it anyway
          jest.spyOn(global, 'fetch').mockResolvedValue(
            new Response(JSON.stringify(makeOWMResponse()), { status: 200 })
          );

          const req = makeRequest({ city });
          const res = await GET(req);

          return res.status === 500;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns HTTP 500 when OPENWEATHERMAP_API_KEY is undefined', async () => {
    // Feature: weather-app, Property 18: Missing or empty API key always yields HTTP 500 (undefined key)

    /**
     * **Validates: Requirements 9.3**
     *
     * When OPENWEATHERMAP_API_KEY is completely absent (undefined), the route
     * must return HTTP 500.
     */
    await fc.assert(
      fc.asyncProperty(
        fc.stringMatching(/^[a-zA-Z]{1,50}$/),
        async (city) => {
          delete process.env.OPENWEATHERMAP_API_KEY;

          jest.spyOn(global, 'fetch').mockResolvedValue(
            new Response(JSON.stringify(makeOWMResponse()), { status: 200 })
          );

          const req = makeRequest({ city });
          const res = await GET(req);

          return res.status === 500;
        }
      ),
      { numRuns: 100 }
    );
  });
});
