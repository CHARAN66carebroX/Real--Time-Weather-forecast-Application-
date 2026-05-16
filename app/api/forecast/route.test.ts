/**
 * @jest-environment node
 *
 * Property-based tests for GET /api/forecast route handler.
 * Feature: weather-app
 * Uses fast-check with minimum 100 iterations per property.
 */

import * as fc from 'fast-check';
import { NextRequest } from 'next/server';
import { GET } from './route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Generates a date string "YYYY-MM-DD" for a day offset from today (UTC).
 * offset=1 → tomorrow, offset=2 → day after tomorrow, etc.
 */
function futureDateString(offset: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

/**
 * Build a minimal valid OWM /data/2.5/forecast JSON response.
 * Generates entries for `numDays` future days (starting from tomorrow),
 * each with multiple 3-hour slots so the noon-selection logic has choices.
 */
function makeOWMForecastResponse(overrides: {
  cityName?: string;
  numDays?: number;
  tempKelvin?: number;
  condition?: string;
  icon?: string;
} = {}) {
  const cityName = overrides.cityName ?? 'TestCity';
  const numDays = overrides.numDays ?? 6;
  const tempKelvin = overrides.tempKelvin ?? 290.15;
  const condition = overrides.condition ?? 'Clouds';
  const icon = overrides.icon ?? '04d';

  // Build 3-hour slots for each future day: 00:00, 03:00, 06:00, 09:00, 12:00, 15:00, 18:00, 21:00
  const slots = ['00:00:00', '03:00:00', '06:00:00', '09:00:00', '12:00:00', '15:00:00', '18:00:00', '21:00:00'];
  const list: Array<{
    dt: number;
    dt_txt: string;
    main: { temp: number; humidity: number };
    wind: { speed: number };
    weather: Array<{ main: string; icon: string }>;
  }> = [];

  for (let day = 1; day <= numDays; day++) {
    const dateStr = futureDateString(day);
    for (const slot of slots) {
      const dt_txt = `${dateStr} ${slot}`;
      list.push({
        dt: Math.floor(Date.now() / 1000) + day * 86400,
        dt_txt,
        main: { temp: tempKelvin, humidity: 72 },
        wind: { speed: 5.1 },
        weather: [{ main: condition, icon }],
      });
    }
  }

  return {
    city: { name: cityName },
    list,
  };
}

/** Create a NextRequest for the forecast endpoint */
function makeRequest(params: Record<string, string>): NextRequest {
  const url = new URL('http://localhost/api/forecast');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url.toString());
}

/** ISO 8601 date string pattern: YYYY-MM-DD */
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

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
// Property 13: ForecastAPI always returns exactly 5 well-formed entries
// Validates: Requirements 6.2, 6.3
// ---------------------------------------------------------------------------

describe('Property 13: ForecastAPI always returns exactly 5 well-formed entries', () => {
  it('returns HTTP 200 with forecast array of exactly 5 well-formed entries for any valid city', async () => {
    // Feature: weather-app, Property 13: ForecastAPI always returns exactly 5 well-formed entries

    /**
     * **Validates: Requirements 6.2, 6.3**
     *
     * For any valid city name, the route handler must return HTTP 200 with a
     * `forecast` array of exactly 5 entries. Each entry must have:
     *   - date: ISO 8601 date string (YYYY-MM-DD)
     *   - temperature: number
     *   - condition: string
     *   - icon: string URL
     */
    await fc.assert(
      fc.asyncProperty(
        // Generate valid city names matching the route's CITY_REGEX
        fc.stringMatching(/^[a-zA-ZÀ-ÖØ-öø-ÿ]{1}[a-zA-ZÀ-ÖØ-öø-ÿ\s'\-]{0,99}$/).filter(
          (s) => s.trim().length >= 1 && s.length <= 100
        ),
        // Generate a temperature in Kelvin (200–330 K covers realistic range)
        fc.float({ min: 200, max: 330, noNaN: true }),
        // Generate a weather condition string
        fc.oneof(
          fc.constant('Clear'),
          fc.constant('Clouds'),
          fc.constant('Rain'),
          fc.constant('Snow'),
          fc.constant('Thunderstorm'),
          fc.stringMatching(/^[A-Za-z]{1,20}$/)
        ),
        // Generate an icon code
        fc.stringMatching(/^[0-9]{2}[dn]$/),
        async (city, tempKelvin, condition, iconCode) => {
          const owmData = makeOWMForecastResponse({
            cityName: city,
            numDays: 6,
            tempKelvin,
            condition,
            icon: iconCode,
          });

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

          // Must have a forecast array
          if (!Array.isArray(body.forecast)) return false;

          // Must have exactly 5 entries
          if (body.forecast.length !== 5) return false;

          // Each entry must be well-formed
          for (const entry of body.forecast) {
            if (typeof entry.date !== 'string') return false;
            if (!ISO_DATE_REGEX.test(entry.date)) return false;
            if (typeof entry.temperature !== 'number') return false;
            if (typeof entry.condition !== 'string') return false;
            if (typeof entry.icon !== 'string') return false;
            if (entry.icon.length === 0) return false;
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns HTTP 200 with forecast array of exactly 5 well-formed entries for valid coordinates', async () => {
    // Feature: weather-app, Property 13: ForecastAPI always returns exactly 5 well-formed entries (coordinates)

    /**
     * **Validates: Requirements 6.2, 6.3**
     *
     * For any valid lat/lon coordinates, the route handler must return HTTP 200
     * with a `forecast` array of exactly 5 well-formed entries.
     */
    await fc.assert(
      fc.asyncProperty(
        fc.float({ min: -90, max: 90, noNaN: true }),
        fc.float({ min: -180, max: 180, noNaN: true }),
        fc.float({ min: 200, max: 330, noNaN: true }),
        async (lat, lon, tempKelvin) => {
          const owmData = makeOWMForecastResponse({
            cityName: 'GeoCity',
            numDays: 6,
            tempKelvin,
          });

          jest.spyOn(global, 'fetch').mockResolvedValueOnce(
            new Response(JSON.stringify(owmData), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            })
          );

          const req = makeRequest({ lat: String(lat), lon: String(lon) });
          const res = await GET(req);

          if (res.status !== 200) return false;

          const body = await res.json();

          if (!Array.isArray(body.forecast)) return false;
          if (body.forecast.length !== 5) return false;

          for (const entry of body.forecast) {
            if (typeof entry.date !== 'string') return false;
            if (!ISO_DATE_REGEX.test(entry.date)) return false;
            if (typeof entry.temperature !== 'number') return false;
            if (typeof entry.condition !== 'string') return false;
            if (typeof entry.icon !== 'string') return false;
            if (entry.icon.length === 0) return false;
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 18: Missing or empty API key always yields HTTP 500 (forecast route)
// Validates: Requirements 9.3
// ---------------------------------------------------------------------------

describe('Property 18: Missing or empty API key always yields HTTP 500 (forecast route)', () => {
  it('returns HTTP 500 for any request when the API key is missing or empty', async () => {
    // Feature: weather-app, Property 18: Missing or empty API key always yields HTTP 500

    /**
     * **Validates: Requirements 9.3**
     *
     * When OPENWEATHERMAP_API_KEY is absent or blank, every request to the
     * forecast route handler must return HTTP 500 regardless of query parameters.
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
            new Response(JSON.stringify(makeOWMForecastResponse()), { status: 200 })
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
     * When OPENWEATHERMAP_API_KEY is completely absent (undefined), the forecast
     * route must return HTTP 500.
     */
    await fc.assert(
      fc.asyncProperty(
        fc.stringMatching(/^[a-zA-Z]{1,50}$/),
        async (city) => {
          delete process.env.OPENWEATHERMAP_API_KEY;

          jest.spyOn(global, 'fetch').mockResolvedValue(
            new Response(JSON.stringify(makeOWMForecastResponse()), { status: 200 })
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
