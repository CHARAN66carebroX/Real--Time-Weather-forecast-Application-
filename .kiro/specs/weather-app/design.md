# Design Document: Real-Time Weather Forecast Application

## Overview

The Real-Time Weather Forecast Application is a full-stack Next.js (App Router) web application that lets users search for current weather conditions by city name or geolocation and view a 5-day forecast. The frontend is built with React and Tailwind CSS; the backend consists of two Next.js API Route handlers that proxy requests to the OpenWeatherMap REST API, keeping the API key server-side at all times.

### Key Design Goals

- **Security**: The OpenWeatherMap API key never leaves the server.
- **Performance**: Client-side debouncing and duplicate-request guards minimize unnecessary API calls.
- **Resilience**: Timeout logic, graceful degradation (forecast failure does not block current weather), and clear error messaging.
- **Responsiveness**: Tailwind CSS utility classes handle all breakpoints from 320 px to 2560 px, including a custom `xs` breakpoint at 480 px.
- **Visual Polish**: Glassmorphism card styling, animated Lottie weather icons, and temperature-driven gradient backgrounds provide a rich, contextual UI.

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (Client)                         │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  SearchBar   │  │  WeatherCard │  │    ForecastPanel     │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         │                 │                      │              │
│         └─────────────────┴──────────────────────┘             │
│                           │                                     │
│                    ┌──────▼──────┐                              │
│                    │  Page State │  (React hooks / context)     │
│                    └──────┬──────┘                              │
│                           │  fetch()                            │
└───────────────────────────┼─────────────────────────────────────┘
                            │  HTTP (same origin)
┌───────────────────────────┼─────────────────────────────────────┐
│                  Next.js Server (Node.js)                       │
│                                                                 │
│  ┌────────────────────┐   ┌────────────────────────────────┐   │
│  │  /api/weather      │   │  /api/forecast                 │   │
│  │  Route Handler     │   │  Route Handler                 │   │
│  └────────┬───────────┘   └──────────────┬─────────────────┘   │
│           │                              │                      │
│           └──────────────┬───────────────┘                      │
│                          │  HTTPS + API key (env var)           │
└──────────────────────────┼──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                    OpenWeatherMap REST API                       │
│   GET /data/2.5/weather   │   GET /data/2.5/forecast            │
└─────────────────────────────────────────────────────────────────┘
```

### Next.js App Router Structure

```
app/
├── layout.tsx              # Root layout (fonts, global styles)
├── page.tsx                # Main page — composes all UI components, layers gradients
├── api/
│   ├── weather/
│   │   └── route.ts        # GET /api/weather
│   └── forecast/
│       └── route.ts        # GET /api/forecast
components/
├── SearchBar.tsx
├── WeatherCard.tsx         # Uses glassmorphism classes + AnimatedIcon
├── ForecastPanel.tsx       # Snap-scroll on xs, grid on md+; uses AnimatedIcon
├── AnimatedIcon.tsx        # Lottie wrapper with error boundary + SVG fallback
├── LoadingSpinner.tsx
└── ErrorMessage.tsx
lib/
├── debounce.ts             # Debouncer utility
├── geolocation.ts          # GeolocationService wrapper
├── weatherUtils.ts         # Unit conversions, condition mapping, getTemperatureBackground
└── types.ts                # Shared TypeScript types
hooks/
└── useWeather.ts           # Central state management hook
public/
├── animations/             # Lottie JSON files
│   ├── sunny.json
│   ├── cloudy.json
│   ├── rain.json
│   ├── drizzle.json
│   ├── thunderstorm.json
│   ├── snow.json
│   └── mist.json
├── icons/                  # Static SVG fallbacks (one per condition)
│   ├── sunny.svg
│   ├── cloudy.svg
│   ├── rain.svg
│   ├── drizzle.svg
│   ├── thunderstorm.svg
│   ├── snow.svg
│   └── mist.svg
└── placeholder-icon.svg    # Generic fallback weather icon
.env.local.example
.gitignore
README.md
```

---

## Components and Interfaces

### SearchBar

**Responsibility**: Accept city name input, validate it client-side, trigger debounced search, and expose a "Use My Location" button.

```typescript
interface SearchBarProps {
  onSearch: (city: string) => void;
  onGeolocate: () => void;
  isLoading: boolean;
}
```

**Behaviour**:
- Renders a `<input type="text">` (max 255 chars) and a submit `<button>`.
- Renders a secondary "Use My Location" `<button>`.
- On every keystroke, schedules a debounced call to `onSearch` after 500 ms of inactivity.
- On explicit submit (Enter key or button click), calls `onSearch` immediately (bypassing debounce timer).
- If the input is empty on submit, shows an inline validation message; clears it when the user modifies the input.
- Disables both buttons and the input while `isLoading` is `true`.

**Mobile layout (< 480 px)**:
- Container: `flex flex-col w-full gap-2` — elements stack vertically.
- Each child element (input, submit button, geolocation button): `min-h-[44px] w-full` to satisfy WCAG 2.1 AA touch targets.
- At `xs:` (≥ 480 px) and above: `xs:flex-row xs:items-center` restores the horizontal layout.

### WeatherCard

**Responsibility**: Display the current weather payload with a glassmorphism visual treatment.

```typescript
interface WeatherCardProps {
  payload: WeatherPayload;
}
```

**Behaviour**:
- Renders city name, temperature (°C), humidity (%), wind speed (km/h), condition label, and an `AnimatedIcon`.
- Uses `AnimatedIcon` (see below) instead of a plain `<img>` for the weather icon.
- Not rendered when no payload is available.

**Glassmorphism styling** (applied via Tailwind utility classes):

```
backdrop-blur-md bg-white/15 border border-white/25 shadow-2xl rounded-2xl
```

These classes map to the following CSS values:
- `backdrop-blur-md` → `backdrop-filter: blur(12px)` (≥ 10 px required)
- `bg-white/15` → `background: rgba(255,255,255,0.15)` (opacity ≤ 0.25 required)
- `border-white/25` → `border: 1px solid rgba(255,255,255,0.25)` (opacity ≤ 0.30 required)
- `shadow-2xl` → `box-shadow: 0 8px 32px rgba(0,0,0,0.2)` (≥ 4 px blur radius required)

The card must remain legible against all ConditionGradient and TemperatureGradient backgrounds.

**Compact mobile layout (< 480 px)**:
- Default (mobile-first): `p-4` padding, `text-5xl` temperature font size.
- At `xs:` breakpoint: `xs:p-6 xs:text-6xl` for larger viewports.

### ForecastPanel

**Responsibility**: Display the 5-day forecast.

```typescript
interface ForecastPanelProps {
  payload: ForecastPayload;
}
```

**Behaviour**:
- Renders exactly 5 `ForecastCard` entries.
- Uses `AnimatedIcon` (see below) for each day's weather icon instead of a plain `<img>`.

**Responsive layout**:
- Mobile (< 480 px): `flex overflow-x-auto snap-x snap-mandatory` — horizontal scrollable row. Each `ForecastCard`: `snap-start flex-shrink-0 w-40`.
- Desktop (≥ 768 px / `md:`): `grid grid-cols-5` — 5-column horizontal grid.
- Each entry shows date formatted as "Day, Mon DD", temperature (°C), condition label, and `AnimatedIcon`.

### AnimatedIcon

**Responsibility**: Render an animated Lottie weather icon for a given condition string, with a static SVG fallback when the animation library fails to load.

```typescript
interface AnimatedIconProps {
  condition: string;   // OWM weather[0].main string, e.g. "Clear", "Rain"
  size?: number;       // width/height in px, default 80
  className?: string;
}
```

**Condition-to-animation mapping** (stored in `lib/weatherUtils.ts`):

```typescript
const CONDITION_ANIMATIONS: Record<string, string> = {
  Clear:        '/animations/sunny.json',
  Clouds:       '/animations/cloudy.json',
  Rain:         '/animations/rain.json',
  Drizzle:      '/animations/drizzle.json',
  Thunderstorm: '/animations/thunderstorm.json',
  Snow:         '/animations/snow.json',
  Mist:         '/animations/mist.json',
  Fog:          '/animations/mist.json',
  Haze:         '/animations/mist.json',
};

const CONDITION_STATIC_ICONS: Record<string, string> = {
  Clear:        '/icons/sunny.svg',
  Clouds:       '/icons/cloudy.svg',
  Rain:         '/icons/rain.svg',
  Drizzle:      '/icons/drizzle.svg',
  Thunderstorm: '/icons/thunderstorm.svg',
  Snow:         '/icons/snow.svg',
  Mist:         '/icons/mist.svg',
  Fog:          '/icons/mist.svg',
  Haze:         '/icons/mist.svg',
};

const DEFAULT_STATIC_ICON = '/placeholder-icon.svg';

export function getAnimationPath(condition: string): string | null {
  return CONDITION_ANIMATIONS[condition] ?? null;
}

export function getStaticIconPath(condition: string): string {
  return CONDITION_STATIC_ICONS[condition] ?? DEFAULT_STATIC_ICON;
}
```

**Behaviour**:
- Wraps `lottie-react` (package: `lottie-react`) in a React error boundary.
- If `getAnimationPath(condition)` returns a path, renders a `<Lottie>` player with `loop={true}` and `autoplay={true}`.
- If the condition is unknown (path is `null`) or the Lottie component throws (error boundary catches), renders a static `<img>` using `getStaticIconPath(condition)`.
- The error boundary resets when the `condition` prop changes.
- All interactive uses of `AnimatedIcon` include an `aria-label` describing the condition for accessibility.

**Library**: `lottie-react` (npm). Lottie JSON files are stored in `public/animations/` and served as static assets. Static SVG fallbacks are stored in `public/icons/`.

### LoadingSpinner

**Responsibility**: Visual feedback during in-flight requests.

```typescript
interface LoadingSpinnerProps {
  label?: string; // accessible aria-label
}
```

### ErrorMessage

**Responsibility**: Display error text with a dismiss control.

```typescript
interface ErrorMessageProps {
  message: string;
  onDismiss: () => void;
}
```

**Behaviour**:
- Renders the error message in the main content area.
- Dismiss button clears the error and resets the search input to empty.

### GeolocationService (`lib/geolocation.ts`)

A thin Promise wrapper around `navigator.geolocation.getCurrentPosition`.

```typescript
type GeolocationResult =
  | { ok: true; lat: number; lon: number }
  | { ok: false; code: 'PERMISSION_DENIED' | 'UNAVAILABLE' };

function getCoordinates(): Promise<GeolocationResult>;
```

Maps `GeolocationPositionError.code` values:
- `1` (PERMISSION_DENIED) → `'PERMISSION_DENIED'`
- `2` (POSITION_UNAVAILABLE) or `3` (TIMEOUT) → `'UNAVAILABLE'`

### Debouncer (`lib/debounce.ts`)

```typescript
function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delayMs: number
): T & { cancel: () => void };
```

Returns a debounced version of `fn` that delays invocation until `delayMs` milliseconds have elapsed since the last call. The `.cancel()` method clears any pending timer (used on component unmount).

---

## Data Models

### Shared TypeScript Types (`lib/types.ts`)

```typescript
/** Returned by GET /api/weather */
export interface WeatherPayload {
  city: string;
  temperature: number;   // °C, one decimal place
  humidity: number;      // percentage 0–100
  windSpeed: number;     // km/h, one decimal place
  condition: string;     // e.g. "Clear", "Rain"
  icon: string;          // full URL to OpenWeatherMap icon
}

/** One day entry inside ForecastPayload */
export interface ForecastEntry {
  date: string;          // ISO 8601 date string, e.g. "2024-07-15"
  temperature: number;   // °C, one decimal place
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
```

### API Route: GET /api/weather

**Query Parameters** (mutually exclusive groups):

| Parameter | Type   | Constraints                                      |
|-----------|--------|--------------------------------------------------|
| `city`    | string | 1–100 chars; letters, spaces, hyphens, apostrophes |
| `lat`     | number | −90 to 90                                        |
| `lon`     | number | −180 to 180                                      |

**Request validation**:
1. If neither `city` nor (`lat` + `lon`) are present → 400 Bad Request.
2. If `city` is present but fails the character/length constraint → 400 Bad Request.
3. If `OPENWEATHERMAP_API_KEY` is missing or empty → 500 Internal Server Error.

**Success Response** (HTTP 200):
```json
{
  "city": "London",
  "temperature": 15.3,
  "humidity": 72,
  "windSpeed": 18.4,
  "condition": "Clouds",
  "icon": "https://openweathermap.org/img/wn/04d@2x.png"
}
```

**Error Responses**:

| HTTP Status | Condition                                      |
|-------------|------------------------------------------------|
| 400         | Missing or invalid query parameters            |
| 404         | City not found (OWM returns 404)               |
| 500         | `OPENWEATHERMAP_API_KEY` not configured        |
| 502         | OWM returned a non-200, non-404 error          |
| 503         | OWM is unreachable (network error)             |
| 504         | OWM request exceeded 10-second timeout         |

**Timeout logic**: The route handler wraps the `fetch` call with `AbortController` and `setTimeout(10_000)`. If the timer fires before the response arrives, `controller.abort()` is called and the handler returns 504.

**Unit conversions performed server-side**:
- Temperature: `°C = K − 273.15`, rounded to 1 decimal place.
- Wind speed: `km/h = m/s × 3.6`, rounded to 1 decimal place.
- Icon URL: `https://openweathermap.org/img/wn/${icon}@2x.png`

### API Route: GET /api/forecast

**Query Parameters**: identical to `/api/weather` (`city` or `lat`+`lon`).

**OWM endpoint used**: `GET /data/2.5/forecast` — returns 3-hour interval data for 5 days (40 entries). The route handler groups entries by calendar date and picks the noon entry (or the closest available) for each of the next 5 days.

**Success Response** (HTTP 200):
```json
{
  "city": "London",
  "forecast": [
    { "date": "2024-07-15", "temperature": 17.2, "condition": "Rain", "icon": "https://openweathermap.org/img/wn/10d@2x.png" },
    { "date": "2024-07-16", "temperature": 19.0, "condition": "Clouds", "icon": "https://openweathermap.org/img/wn/04d@2x.png" },
    { "date": "2024-07-17", "temperature": 22.5, "condition": "Clear", "icon": "https://openweathermap.org/img/wn/01d@2x.png" },
    { "date": "2024-07-18", "temperature": 20.1, "condition": "Drizzle", "icon": "https://openweathermap.org/img/wn/09d@2x.png" },
    { "date": "2024-07-19", "temperature": 18.7, "condition": "Clear", "icon": "https://openweathermap.org/img/wn/01d@2x.png" }
  ]
}
```

**Error Responses**: same status codes and conditions as `/api/weather`.

### State Shape (`hooks/useWeather.ts`)

```typescript
interface WeatherState {
  weatherPayload: WeatherPayload | null;
  forecastPayload: ForecastPayload | null;
  isLoading: boolean;
  forecastUnavailable: boolean;
  error: string | null;
  lastQuery: string | null; // last successfully fetched city or "lat,lon"
}
```

### Condition-to-Background Mapping (`lib/weatherUtils.ts`)

```typescript
const CONDITION_BACKGROUNDS: Record<string, string> = {
  Clear:        'bg-gradient-to-br from-yellow-300 to-orange-400',
  Clouds:       'bg-gradient-to-br from-gray-300 to-gray-500',
  Rain:         'bg-gradient-to-br from-blue-400 to-gray-600',
  Drizzle:      'bg-gradient-to-br from-blue-300 to-gray-400',
  Thunderstorm: 'bg-gradient-to-br from-gray-700 to-gray-900',
  Snow:         'bg-gradient-to-br from-blue-100 to-white',
  Mist:         'bg-gradient-to-br from-gray-200 to-gray-400',
  Fog:          'bg-gradient-to-br from-gray-200 to-gray-400',
  Haze:         'bg-gradient-to-br from-yellow-100 to-gray-300',
};

const DEFAULT_BACKGROUND = 'bg-gradient-to-br from-sky-400 to-blue-600';

export function getBackground(condition: string): string {
  return CONDITION_BACKGROUNDS[condition] ?? DEFAULT_BACKGROUND;
}
```

### Temperature-to-Gradient Mapping (`lib/weatherUtils.ts`)

```typescript
/**
 * Returns a Tailwind CSS gradient class string based on the temperature in °C.
 * Used as the primary page background; the ConditionGradient is layered on top at 30% opacity.
 */
export function getTemperatureBackground(temp: number): string {
  if (temp < 0)          return 'bg-gradient-to-br from-indigo-900 to-purple-900';   // deep blue/purple
  if (temp < 10)         return 'bg-gradient-to-br from-blue-700 to-blue-400';        // cool blue
  if (temp < 20)         return 'bg-gradient-to-br from-teal-500 to-green-400';       // teal/green
  if (temp <= 30)        return 'bg-gradient-to-br from-orange-400 to-yellow-300';    // orange/yellow
  /* temp > 30 */        return 'bg-gradient-to-br from-red-600 to-orange-400';       // red/orange
}
```

**Range boundaries** (inclusive lower, exclusive upper except the last):

| Temperature (°C) | Gradient class                                          |
|------------------|---------------------------------------------------------|
| < 0              | `from-indigo-900 to-purple-900` (deep blue/purple)      |
| 0 – 9.9          | `from-blue-700 to-blue-400` (cool blue)                 |
| 10 – 19.9        | `from-teal-500 to-green-400` (teal/green)               |
| 20 – 30          | `from-orange-400 to-yellow-300` (orange/yellow)         |
| > 30             | `from-red-600 to-orange-400` (red/orange)               |

---

## Data Flow Diagrams

### City Search Flow

```
User types in SearchBar
        │
        ▼
  Debouncer (500 ms)
        │
        ▼
useWeather.search(city)
        │
  ┌─────▼──────┐
  │ Duplicate? │──yes──► no-op
  └─────┬──────┘
        │ no
  ┌─────▼──────┐
  │ In-flight? │──yes──► no-op
  └─────┬──────┘
        │ no
        ▼
  setLoading(true)
        │
        ▼
  fetch /api/weather?city=…
        │
   ┌────┴────┐
  200       error
   │         │
   ▼         ▼
setWeather  setError
setLoading  setLoading
  (false)    (false)
   │
   ▼
fetch /api/forecast?city=…  (fire-and-forget, non-blocking)
   │
  ┌┴──────────┐
 200         error
  │           │
  ▼           ▼
setForecast  setForecastUnavailable(true)
```

### Geolocation Flow

```
User clicks "Use My Location"
        │
        ▼
  disableButton()
  setLoading(true)
        │
        ▼
  GeolocationService.getCoordinates()
        │
   ┌────┴────────────────┐
  ok                  error
   │                     │
   ▼                     ▼
fetch /api/weather    PERMISSION_DENIED → "Location access denied…"
  ?lat=…&lon=…        UNAVAILABLE      → "Unable to retrieve…"
   │                  setLoading(false)
   ▼
(same as city search from fetch step)
```

---

## State Management

All weather state lives in the custom hook `useWeather` (`hooks/useWeather.ts`). The main `page.tsx` instantiates this hook and passes callbacks and state slices down to child components as props — no global state library is needed.

```typescript
// hooks/useWeather.ts (interface)
export function useWeather(): {
  state: WeatherState;
  search: (city: string) => Promise<void>;
  geolocate: () => Promise<void>;
  dismissError: () => void;
}
```

**In-flight guard**: A `useRef<boolean>` (`isRequestInFlight`) is set to `true` when a fetch starts and `false` when it settles. `search()` and `geolocate()` check this ref before dispatching a new request.

**Duplicate guard**: Before fetching, `search()` compares the normalised city name (trimmed, lower-cased) against `state.lastQuery`. If they match, the function returns early.

**Debounce integration**: `SearchBar` creates the debounced version of `search` via `useMemo(() => debounce(search, 500), [search])` and cancels it on unmount via the returned `.cancel()` method in a `useEffect` cleanup.

---

## OpenWeatherMap API Integration

### Endpoints Used

| Route Handler    | OWM Endpoint                  | Key Parameters                        |
|------------------|-------------------------------|---------------------------------------|
| `/api/weather`   | `GET /data/2.5/weather`       | `q={city}` or `lat={lat}&lon={lon}`   |
| `/api/forecast`  | `GET /data/2.5/forecast`      | `q={city}` or `lat={lat}&lon={lon}`   |

Both endpoints require `appid={OPENWEATHERMAP_API_KEY}` and `units=standard` (Kelvin, m/s — conversions done server-side for explicit control).

### Icon URL Construction

OWM returns an icon code such as `"01d"`. The full URL is:
```
https://openweathermap.org/img/wn/{icon}@2x.png
```
This is assembled server-side and included in the payload so the client never needs to know the OWM base URL.

### Forecast Aggregation Logic

The `/data/2.5/forecast` endpoint returns up to 40 entries at 3-hour intervals. The route handler:

1. Groups entries by `dt_txt` date prefix (first 10 chars, `YYYY-MM-DD`).
2. Skips today's date (already shown in WeatherCard).
3. For each of the next 5 calendar dates, selects the entry whose time component is closest to `12:00:00`.
4. Maps each selected entry to a `ForecastEntry` (date, temperature in °C, condition, icon URL).

---

## Dynamic Background Condition Mapping

The `getBackground(condition)` function in `lib/weatherUtils.ts` maps OWM's `weather[0].main` string to a Tailwind CSS gradient class. The mapping covers the 9 main OWM condition groups. Any unrecognised condition falls back to a neutral sky-blue gradient.

### Layered Gradient System

The page background now uses two stacked layers:

1. **Primary layer** — `TemperatureGradient` from `getTemperatureBackground(temp)`, applied to the outermost wrapper `<div>`.
2. **Secondary overlay** — `ConditionGradient` from `getBackground(condition)`, applied to an absolutely-positioned child `<div>` at 30% opacity (`opacity-30`).

```tsx
// page.tsx (simplified)
<div className={`relative min-h-screen transition-all duration-700 ${getTemperatureBackground(weatherPayload?.temperature ?? 15)}`}>
  {/* Condition overlay at 30% opacity */}
  <div className={`absolute inset-0 opacity-30 ${getBackground(weatherPayload?.condition ?? '')}`} />
  {/* Page content sits above both gradient layers */}
  <div className="relative z-10">
    {/* SearchBar, WeatherCard, ForecastPanel … */}
  </div>
</div>
```

The `transition-all duration-700` class on the primary wrapper provides a smooth ≥ 700 ms animated transition whenever the temperature range or condition changes.

---

## Environment Configuration

### `.env.local.example`

```
OPENWEATHERMAP_API_KEY=your_api_key_here
```

### Runtime Check (both API routes)

```typescript
const apiKey = process.env.OPENWEATHERMAP_API_KEY;
if (!apiKey) {
  return Response.json({ error: 'Server configuration error: API key not set.' }, { status: 500 });
}
```

### `.gitignore` entries

```
.env.local
.env*.local
```

---

## Responsive Layout Strategy

All layout is implemented exclusively with Tailwind CSS utility classes. No inline styles are used for responsive behaviour.

### Breakpoints Used

| Tailwind prefix | Viewport width | Source                          |
|-----------------|----------------|---------------------------------|
| (default)       | < 480 px       | mobile-first base styles        |
| `xs:`           | ≥ 480 px       | custom breakpoint (see below)   |
| `md:`           | ≥ 768 px       | Tailwind default                |
| `xl:`           | ≥ 1280 px      | Tailwind default                |

### Custom `xs` Breakpoint

Add the following to `tailwind.config.ts`:

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  theme: {
    extend: {
      screens: {
        xs: '480px',   // custom breakpoint for small-mobile enhancements
      },
    },
  },
};

export default config;
```

### Layout Rules

**SearchBar row**:
- Default (< 480 px): `flex flex-col w-full gap-2` — input and buttons stack vertically, each `min-h-[44px] w-full`.
- `xs:` (≥ 480 px): `xs:flex-row xs:items-center` — restores horizontal layout.

**Main content area** (`flex flex-col items-center gap-6 px-4 md:px-8 xl:px-16`):
- Always single-column, centred.

**ForecastPanel**:
- Default (< 480 px): `flex overflow-x-auto snap-x snap-mandatory` — horizontal snap-scroll row. Each `ForecastCard`: `snap-start flex-shrink-0 w-40`.
- `md:` (≥ 768 px): `md:grid md:grid-cols-5` — 5-column grid, no scroll.

**WeatherCard** (`w-full max-w-md mx-auto`):
- Default (< 480 px): `p-4 text-5xl` — compact padding and temperature size.
- `xs:` (≥ 480 px): `xs:p-6 xs:text-6xl` — standard padding and size.

**Touch targets**: All interactive elements (`<button>`, `<input>`) carry `min-h-[44px] min-w-[44px]` to meet WCAG 2.1 AA minimum touch target requirements at all viewport widths.

**No horizontal overflow**: All containers use `overflow-hidden` or `w-full` to prevent horizontal scroll at any viewport width.

---

## Error Handling

### Client-Side

| Scenario                          | Behaviour                                                                 |
|-----------------------------------|---------------------------------------------------------------------------|
| Empty search input                | Inline validation message; no API call                                    |
| API returns 404                   | ErrorMessage: "City not found. Please check the spelling and try again."  |
| API returns 502/503               | ErrorMessage: "Weather service is currently unavailable. Try again later."|
| API returns 504                   | ErrorMessage: "The request timed out. Please try again."                  |
| API returns 500                   | ErrorMessage: "Server configuration error. Please contact support."       |
| Geolocation PERMISSION_DENIED     | ErrorMessage: "Location access denied. Please search by city name."       |
| Geolocation UNAVAILABLE           | ErrorMessage: "Unable to retrieve your location. Please search by city name." |
| Forecast fetch fails              | WeatherCard shown; inline notice "Forecast data is currently unavailable."|
| Weather icon broken               | `<img onError>` swaps src to `/placeholder-icon.svg`                      |
| Lottie animation fails to load    | AnimatedIcon error boundary catches; renders static SVG from `public/icons/` |
| Unknown condition string          | `getAnimationPath` returns `null`; AnimatedIcon renders `placeholder-icon.svg` |

### Server-Side (API Routes)

Both route handlers follow this error-handling order:

1. Check `OPENWEATHERMAP_API_KEY` → 500 if missing.
2. Validate query parameters → 400 if invalid.
3. Wrap OWM `fetch` in `AbortController` with 10-second timeout → 504 on abort.
4. Check OWM response status:
   - 404 → return 404.
   - Any other non-2xx → return 502.
5. Parse and transform OWM JSON → return 200 with payload.
6. Catch network errors (fetch throws) → return 503.

---

## Testing Strategy

### Unit Tests (Jest + React Testing Library)

- **`lib/weatherUtils.ts`**: `kelvinToCelsius`, `msToKmh`, `getBackground`, `getTemperatureBackground`, `getAnimationPath`, `getStaticIconPath` — example-based tests covering known inputs, boundary values, and the default fallback.
- **`lib/debounce.ts`**: Verify the debounced function fires after the delay and not before; verify `.cancel()` prevents firing.
- **`lib/geolocation.ts`**: Mock `navigator.geolocation`; verify correct `GeolocationResult` shapes for success, permission denied, and unavailable.
- **`components/SearchBar`**: Render tests; verify validation message appears on empty submit; verify input/button disabled state; verify `flex-col w-full` and `min-h-[44px]` classes are present.
- **`components/WeatherCard`**: Render with a `WeatherPayload`; verify all fields displayed; verify glassmorphism classes (`backdrop-blur-md`, `bg-white/15`, `border-white/25`, `shadow-2xl`) are present; verify `AnimatedIcon` is rendered.
- **`components/AnimatedIcon`**: Render with known conditions — verify Lottie player is rendered; simulate error boundary trigger — verify static SVG fallback is rendered; render with unknown condition — verify fallback.
- **`components/ForecastPanel`**: Render with a `ForecastPayload`; verify 5 entries; verify date formatting; verify `overflow-x-auto snap-x snap-mandatory` classes and each card has `snap-start flex-shrink-0 w-40`.
- **`components/ErrorMessage`**: Verify message text rendered; verify dismiss callback fires.
- **`api/weather/route.ts`**: Mock `fetch`; test each error branch (missing key, invalid params, OWM 404, OWM 5xx, timeout, network error); test unit conversions in success path.
- **`api/forecast/route.ts`**: Mock `fetch`; test forecast aggregation (noon selection, exactly 5 entries); test error branches.

### Property-Based Tests (fast-check)

Property-based tests use [fast-check](https://github.com/dubzzz/fast-check) and are configured to run a minimum of **100 iterations** per property. Each test is tagged with a comment referencing the design property number and text:

```
// Feature: weather-app, Property {number}: {property text}
```

See the Correctness Properties section for the full list of properties to implement.

### Integration Tests

- Start the Next.js dev server against a real (or sandboxed) OWM API key.
- Verify end-to-end: search → WeatherCard rendered with correct city name.
- Verify geolocation path with mocked `navigator.geolocation`.


---

## Correctness Properties

### Property 1: City name length constraint

*For any* string submitted as a city name, the SearchBar SHALL accept it (send the request) if and only if its length is between 1 and 255 characters inclusive; strings of length 0 or greater than 255 SHALL be rejected without sending a request.

**Validates: Requirements 1.2, 1.4**

---

### Property 2: Debouncer fires exactly once after inactivity

*For any* sequence of calls to the debounced search function with inter-call intervals shorter than 500 ms, the underlying API call SHALL be dispatched exactly once, and only after 500 ms of inactivity following the final call in the sequence.

**Validates: Requirements 1.3, 8.1**

---

### Property 3: Whitespace-only input is rejected

*For any* string composed entirely of whitespace characters (including the empty string), submitting it via the SearchBar SHALL display an inline validation message and SHALL NOT dispatch a request to the WeatherAPI.

**Validates: Requirements 1.4**

---

### Property 4: Valid city name yields correctly-shaped WeatherPayload

*For any* city name string of 1–100 characters containing only letters, spaces, hyphens, or apostrophes, the WeatherAPI SHALL respond with HTTP 200 and a WeatherPayload that contains: `city` (non-empty string), `temperature` (finite number), `humidity` (number in 0–100), `windSpeed` (non-negative number), `condition` (non-empty string), and `icon` (non-empty string URL).

**Validates: Requirements 2.1, 2.2**

---

### Property 5: API key is never exposed in any response

*For any* request to the WeatherAPI or ForecastAPI, the response body SHALL NOT contain the value of `OPENWEATHERMAP_API_KEY` as a substring, regardless of whether the request succeeds or fails.

**Validates: Requirements 2.4**

---

### Property 6: Kelvin-to-Celsius conversion is correct

*For any* temperature value `K` (in Kelvin) returned by OpenWeatherMap, the `temperature` field in the WeatherPayload SHALL equal `Math.round((K - 273.15) * 10) / 10` (i.e., `K − 273.15` rounded to one decimal place).

**Validates: Requirements 2.5**

---

### Property 7: m/s-to-km/h conversion is correct

*For any* wind speed value `v` (in m/s) returned by OpenWeatherMap, the `windSpeed` field in the WeatherPayload SHALL equal `Math.round(v * 3.6 * 10) / 10` (i.e., `v × 3.6` rounded to one decimal place).

**Validates: Requirements 2.6**

---

### Property 8: WeatherCard renders all payload fields

*For any* WeatherPayload object with valid field values, the rendered WeatherCard SHALL contain the city name, temperature value, humidity value, wind speed value, condition label, and an `<img>` element whose `src` matches the icon URL from the payload.

**Validates: Requirements 3.1**

---

### Property 9: Background mapping returns a valid class for every condition

*For any* string passed to `getBackground`, the function SHALL return a non-empty Tailwind CSS class string. For strings that match a key in `CONDITION_BACKGROUNDS`, it SHALL return the mapped class. For all other strings, it SHALL return the default neutral background class.

**Validates: Requirements 3.3**

---

### Property 10: Any API error status suppresses WeatherCard and shows error message

*For any* HTTP error status code (4xx or 5xx) returned by the WeatherAPI, the Application SHALL display a visible error message in the main content area AND SHALL NOT render the WeatherCard component.

**Validates: Requirements 4.4**

---

### Property 11: Requests exceeding 10 seconds receive a 504 response

*For any* request to the WeatherAPI or ForecastAPI where the upstream OpenWeatherMap response is delayed beyond 10 000 ms, the route handler SHALL abort the upstream fetch and respond with HTTP 504 and a JSON error body.

**Validates: Requirements 4.3**

---

### Property 12: Geolocation coordinates flow through to the OWM fetch URL

*For any* valid latitude/longitude pair `(lat, lon)` returned by the GeolocationService, the Application SHALL include those exact values as query parameters in the WeatherAPI request, and the WeatherAPI SHALL include them in the upstream OpenWeatherMap fetch URL (using `lat` and `lon` parameters rather than `q`).

**Validates: Requirements 5.4, 5.5**

---

### Property 13: ForecastAPI always returns exactly 5 well-formed entries

*For any* valid city name or coordinate pair, the ForecastAPI SHALL return a ForecastPayload whose `forecast` array contains exactly 5 entries, each with: `date` (valid ISO 8601 date string), `temperature` (finite number in °C), `condition` (non-empty string), and `icon` (non-empty string URL).

**Validates: Requirements 6.2, 6.3**

---

### Property 14: ForecastPanel renders all 5 entries with correct date format

*For any* ForecastPayload containing 5 entries with valid ISO 8601 date strings, the rendered ForecastPanel SHALL display exactly 5 forecast cards, each showing the date formatted as "Day, Mon DD" (e.g., "Mon, Jan 01"), a temperature value, a condition label, and an icon.

**Validates: Requirements 6.4**

---

### Property 15: Different city name always triggers a new fetch

*For any* two distinct city name strings `A` and `B` (after trimming and lower-casing), if `A` is the current `lastQuery` and the user submits `B`, the Application SHALL dispatch a new request to the WeatherAPI.

**Validates: Requirements 8.2**

---

### Property 16: Same city name never triggers a duplicate fetch

*For any* city name string that matches the current `lastQuery` (after trimming and lower-casing), submitting it again SHALL NOT dispatch a new request to the WeatherAPI.

**Validates: Requirements 8.3**

---

### Property 17: In-flight guard prevents all duplicate requests

*For any* number `N ≥ 1` of additional search submissions made while a WeatherAPI request is already in flight, the Application SHALL dispatch exactly 1 total request (the original) and SHALL ignore all `N` subsequent submissions.

**Validates: Requirements 8.4**

---

### Property 18: Missing or empty API key always yields HTTP 500

*For any* request to the WeatherAPI or ForecastAPI when `OPENWEATHERMAP_API_KEY` is absent or set to an empty string, the route handler SHALL respond with HTTP 500 and a JSON body containing an error message indicating a server configuration error, without attempting to contact OpenWeatherMap.

**Validates: Requirements 9.3**

---

### Property 19: Glassmorphism CSS values satisfy opacity and blur constraints

*For any* WeatherPayload rendered by WeatherCard, the component's className SHALL include Tailwind classes that satisfy all of the following simultaneously: background opacity ≤ 0.25 (`bg-white/15`), `backdrop-filter: blur` ≥ 10 px (`backdrop-blur-md`), border opacity ≤ 0.30 (`border-white/25`), and drop-shadow blur radius ≥ 4 px (`shadow-2xl`).

**Validates: Requirements 3.5, 3.6**

---

### Property 20: AnimatedIcon renders Lottie for known conditions and StaticFallbackIcon otherwise

*For any* condition string in the known mapping (`Clear`, `Clouds`, `Rain`, `Drizzle`, `Thunderstorm`, `Snow`, `Mist`, `Fog`, `Haze`), the AnimatedIcon component SHALL render a Lottie player element. For any condition string not in the mapping, or when the Lottie library throws an error, the AnimatedIcon component SHALL render a static `<img>` element sourced from `public/icons/` (or `placeholder-icon.svg` for unknown conditions).

**Validates: Requirements 3.7, 3.8**

---

### Property 21: getTemperatureBackground returns the correct gradient class for every temperature range

*For any* temperature value `t` (in °C), `getTemperatureBackground(t)` SHALL return a non-empty Tailwind gradient class string, and the returned class SHALL correspond to the correct range: deep blue/purple for `t < 0`, cool blue for `0 ≤ t < 10`, teal/green for `10 ≤ t < 20`, orange/yellow for `20 ≤ t ≤ 30`, and red/orange for `t > 30`. In particular, the boundary values `0`, `9.9`, `10`, `19.9`, `20`, `30`, and `30.1` SHALL each map to the correct range.

**Validates: Requirements 10.1**

---

### Property 22: ForecastPanel applies snap-scroll classes for horizontal scrolling

*For any* ForecastPayload containing 5 entries, the rendered ForecastPanel container SHALL carry the classes `overflow-x-auto`, `snap-x`, and `snap-mandatory`, and each rendered ForecastCard SHALL carry the classes `snap-start`, `flex-shrink-0`, and `w-40`, enabling horizontal swipe navigation on viewports narrower than 480 px.

**Validates: Requirements 7.8**

---

### Property 23: All interactive elements meet 44×44 px touch target requirements

*For any* rendered state of the Application (loading, error, weather displayed, forecast displayed), every interactive element (text inputs, submit buttons, geolocation button, dismiss button) SHALL carry both `min-h-[44px]` and `min-w-[44px]` Tailwind classes, satisfying WCAG 2.1 AA minimum touch target size requirements.

**Validates: Requirements 7.9**
