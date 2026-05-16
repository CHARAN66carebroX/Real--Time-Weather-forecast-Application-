import { NextRequest } from 'next/server';
import { kelvinToCelsius, msToKmh } from '@/lib/weatherUtils';
import type { WeatherPayload, ApiError } from '@/lib/types';

/** Regex: 1–100 chars, letters (including accented/Unicode), spaces, hyphens, apostrophes, dots, commas */
const CITY_REGEX = /^[\p{L}\s'\-.,]{1,100}$/u;

/** Shape of the OWM /data/2.5/weather response we care about */
interface OWMWeatherResponse {
  name: string;
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

  const owmUrl = `https://api.openweathermap.org/data/2.5/weather?${owmQuery}&appid=${apiKey}&units=standard`;

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
      { error: 'Weather data fetch failed.' } satisfies ApiError,
      { status: 502 }
    );
  }

  // 5. Parse OWM response and build WeatherPayload
  const data = (await owmResponse.json()) as OWMWeatherResponse;

  const temperature = kelvinToCelsius(data.main.temp);
  const windSpeed = msToKmh(data.wind.speed);
  const iconCode = data.weather[0]?.icon ?? '';
  const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;

  const payload: WeatherPayload = {
    city: data.name,
    temperature,
    humidity: data.main.humidity,
    windSpeed,
    condition: data.weather[0]?.main ?? '',
    icon: iconUrl,
  };

  return Response.json(payload, { status: 200 });
}
