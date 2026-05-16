import { NextRequest } from 'next/server';
import { kelvinToCelsius } from '@/lib/weatherUtils';
import type { ForecastEntry, ForecastPayload, ApiError } from '@/lib/types';

/** Regex: 1–100 chars, letters (including accented/Unicode), spaces, hyphens, apostrophes, dots, commas */
const CITY_REGEX = /^[\p{L}\s'\-.,]{1,100}$/u;

/** Shape of a single 3-hour entry in the OWM /data/2.5/forecast response */
interface OWMForecastEntry {
  dt: number;
  dt_txt: string; // e.g. "2024-07-15 12:00:00"
  main: {
    temp: number;
    humidity: number;
  };
  wind: {
    speed: number;
  };
  weather: Array<{
    main: string;
    icon: string;
  }>;
}

/** Shape of the OWM /data/2.5/forecast response we care about */
interface OWMForecastResponse {
  city: {
    name: string;
  };
  list: OWMForecastEntry[];
}

/**
 * Converts a "HH:MM:SS" time string to total seconds since midnight.
 */
function timeToSeconds(time: string): number {
  const [h, m, s] = time.split(':').map(Number);
  return h * 3600 + m * 60 + s;
}

const NOON_SECONDS = timeToSeconds('12:00:00');

export async function GET(request: NextRequest): Promise<Response> {
  // 1. Check API key
  const apiKey = process.env.OPENWEATHERMAP_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    return Response.json(
      { error: 'Server configuration error: API key not set.' } satisfies ApiError,
      { status: 500 }
    );
  }

  // 2. Parse and validate query parameters
  const { searchParams } = request.nextUrl;
  const city = searchParams.get('city');
  const latParam = searchParams.get('lat');
  const lonParam = searchParams.get('lon');

  let owmQuery: string;

  if (city !== null) {
    // city param present — validate it
    if (!CITY_REGEX.test(city)) {
      return Response.json(
        { error: 'Invalid city name. Use 1–100 characters: letters, spaces, hyphens, or apostrophes.' } satisfies ApiError,
        { status: 400 }
      );
    }
    owmQuery = `q=${encodeURIComponent(city)}`;
  } else if (latParam !== null && lonParam !== null) {
    // lat+lon pair present
    const lat = parseFloat(latParam);
    const lon = parseFloat(lonParam);
    if (isNaN(lat) || isNaN(lon)) {
      return Response.json(
        { error: 'Invalid coordinates. lat and lon must be numbers.' } satisfies ApiError,
        { status: 400 }
      );
    }
    owmQuery = `lat=${lat}&lon=${lon}`;
  } else {
    // Neither city nor lat+lon provided
    return Response.json(
      { error: 'Missing query parameters. Provide city or lat+lon.' } satisfies ApiError,
      { status: 400 }
    );
  }

  // 3. Fetch from OWM with AbortController timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);

  const owmUrl = `https://api.openweathermap.org/data/2.5/forecast?${owmQuery}&appid=${apiKey}&units=standard`;

  let owmResponse: globalThis.Response;
  try {
    owmResponse = await fetch(owmUrl, { signal: controller.signal });
  } catch (err) {
    clearTimeout(timeoutId);
    // Distinguish abort (timeout) from other network errors
    if (err instanceof Error && err.name === 'AbortError') {
      return Response.json(
        { error: 'The request timed out.' } satisfies ApiError,
        { status: 504 }
      );
    }
    return Response.json(
      { error: 'Weather service is currently unavailable.' } satisfies ApiError,
      { status: 503 }
    );
  } finally {
    clearTimeout(timeoutId);
  }

  // 4. Map OWM error statuses
  if (!owmResponse.ok) {
    if (owmResponse.status === 404) {
      return Response.json(
        { error: 'City not found.' } satisfies ApiError,
        { status: 404 }
      );
    }
    return Response.json(
      { error: 'Forecast data fetch failed.' } satisfies ApiError,
      { status: 502 }
    );
  }

  // 5. Parse OWM response
  const data = (await owmResponse.json()) as OWMForecastResponse;

  // 6. Determine today's date string (YYYY-MM-DD) in UTC
  const todayDate = new Date().toISOString().slice(0, 10);

  // 7. Group entries by calendar date (first 10 chars of dt_txt), skipping today
  const byDate = new Map<string, OWMForecastEntry[]>();
  for (const entry of data.list) {
    const date = entry.dt_txt.slice(0, 10); // "YYYY-MM-DD"
    if (date === todayDate) continue;
    if (!byDate.has(date)) {
      byDate.set(date, []);
    }
    byDate.get(date)!.push(entry);
  }

  // 8. Sort dates and take the next 5 calendar dates
  const sortedDates = Array.from(byDate.keys()).sort();
  const next5Dates = sortedDates.slice(0, 5);

  // 9. For each date, select the entry closest to 12:00:00
  const forecastEntries: ForecastEntry[] = next5Dates.map((date) => {
    const entries = byDate.get(date)!;

    // Find the entry whose time is closest to noon
    let bestEntry = entries[0];
    let bestDiff = Infinity;

    for (const entry of entries) {
      // dt_txt format: "YYYY-MM-DD HH:MM:SS"
      const timePart = entry.dt_txt.slice(11); // "HH:MM:SS"
      const diff = Math.abs(timeToSeconds(timePart) - NOON_SECONDS);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestEntry = entry;
      }
    }

    const iconCode = bestEntry.weather[0]?.icon ?? '';
    const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;

    return {
      date,
      temperature: kelvinToCelsius(bestEntry.main.temp),
      condition: bestEntry.weather[0]?.main ?? '',
      icon: iconUrl,
    };
  });

  // 10. Return ForecastPayload with exactly 5 entries (or fewer if OWM returned less data)
  const payload: ForecastPayload = {
    city: data.city.name,
    forecast: forecastEntries,
  };

  return Response.json(payload, { status: 200 });
}
