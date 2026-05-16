/** Returned by GET /api/weather */
export interface WeatherPayload {
  city: string;
  temperature: number; // °C, one decimal place
  humidity: number; // percentage 0–100
  windSpeed: number; // km/h, one decimal place
  condition: string; // e.g. "Clear", "Rain"
  icon: string; // full URL to OpenWeatherMap icon
}

/** One day entry inside ForecastPayload */
export interface ForecastEntry {
  date: string; // ISO 8601 date string, e.g. "2024-07-15"
  temperature: number; // °C, one decimal place
  condition: string;
  icon: string;
}

/** Returned by GET /api/forecast */
export interface ForecastPayload {
  city: string;
  forecast: ForecastEntry[]; // exactly 5 entries
}

/** Error shape returned by both API routes */
export interface ApiError {
  error: string;
}
