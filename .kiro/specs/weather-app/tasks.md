# Implementation Plan: Real-Time Weather Forecast Application

## Overview

Implement a full-stack Next.js (App Router) weather forecast application with React + Tailwind CSS frontend, two API route handlers proxying OpenWeatherMap, glassmorphism styling, animated Lottie icons, temperature-driven gradient backgrounds, city search with debouncing, geolocation support, and a 5-day forecast panel. All tasks are incremental and build toward a fully wired application.

## Tasks

- [x] 1. Project setup and shared types
  - [x] 1.1 Initialize project configuration and shared TypeScript types
    - Create `lib/types.ts` with `WeatherPayload`, `ForecastEntry`, `ForecastPayload`, and `ApiError` interfaces as defined in the design
    - Add the custom `xs` breakpoint (`480px`) to `tailwind.config.ts` under `theme.extend.screens`
    - Create `.env.local.example` with `OPENWEATHERMAP_API_KEY=your_api_key_here`
    - Add `.env.local` and `.env*.local` entries to `.gitignore`
    - _Requirements: 2.2, 6.3, 7.4, 9.1, 9.4_

- [x] 2. Utility library
  - [x] 2.1 Implement `lib/weatherUtils.ts`
    - Implement `kelvinToCelsius(k: number): number` — `Math.round((k - 273.15) * 10) / 10`
    - Implement `msToKmh(v: number): number` — `Math.round(v * 3.6 * 10) / 10`
    - Implement `getBackground(condition: string): string` with `CONDITION_BACKGROUNDS` mapping and `DEFAULT_BACKGROUND` fallback
    - Implement `getTemperatureBackground(temp: number): string` with the five temperature range mappings
    - Implement `getAnimationPath(condition: string): string | null` with `CONDITION_ANIMATIONS` mapping
    - Implement `getStaticIconPath(condition: string): string` with `CONDITION_STATIC_ICONS` mapping and `DEFAULT_STATIC_ICON` fallback
    - _Requirements: 2.5, 2.6, 3.3, 3.7, 3.8, 10.1_

  - [x] 2.2 Write property tests for `weatherUtils.ts`
    - **Property 6: Kelvin-to-Celsius conversion is correct** — `Math.round((K - 273.15) * 10) / 10`
    - **Validates: Requirements 2.5**
    - **Property 7: m/s-to-km/h conversion is correct** — `Math.round(v * 3.6 * 10) / 10`
    - **Validates: Requirements 2.6**
    - **Property 9: Background mapping returns a valid class for every condition**
    - **Validates: Requirements 3.3**
    - **Property 21: getTemperatureBackground returns the correct gradient class for every temperature range** — including boundary values `0`, `9.9`, `10`, `19.9`, `20`, `30`, `30.1`
    - **Validates: Requirements 10.1**

  - [x] 2.3 Implement `lib/debounce.ts`
    - Implement `debounce<T>(fn: T, delayMs: number): T & { cancel: () => void }` using `setTimeout`/`clearTimeout`
    - The `.cancel()` method must clear any pending timer
    - _Requirements: 1.3, 8.1_

  - [x] 2.4 Write property tests for `debounce.ts`
    - **Property 2: Debouncer fires exactly once after inactivity** — for any sequence of calls with inter-call intervals < 500 ms, the underlying function is dispatched exactly once after 500 ms of inactivity
    - **Validates: Requirements 1.3, 8.1**

  - [x] 2.5 Implement `lib/geolocation.ts`
    - Implement `getCoordinates(): Promise<GeolocationResult>` wrapping `navigator.geolocation.getCurrentPosition`
    - Map error code `1` → `'PERMISSION_DENIED'`, codes `2`/`3` → `'UNAVAILABLE'`
    - _Requirements: 5.2, 5.6, 5.7_

- [x] 3. API route handlers
  - [x] 3.1 Implement `app/api/weather/route.ts`
    - Check `OPENWEATHERMAP_API_KEY` env var; return 500 if missing or empty
    - Validate query params: accept `city` (1–100 chars, letters/spaces/hyphens/apostrophes) or `lat`+`lon`; return 400 if neither present or `city` fails validation
    - Wrap OWM `fetch` with `AbortController` and `setTimeout(10_000)`; return 504 on abort
    - Map OWM 404 → 404, OWM non-2xx → 502, network error → 503
    - Convert temperature (Kelvin → °C) and wind speed (m/s → km/h) using `weatherUtils`
    - Construct icon URL as `https://openweathermap.org/img/wn/{icon}@2x.png`
    - Return 200 with `WeatherPayload`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 4.1, 4.2, 4.3, 5.5, 9.3_

  - [x] 3.2 Write property tests for `/api/weather` route handler
    - **Property 4: Valid city name yields correctly-shaped WeatherPayload** — for any valid city name, response is HTTP 200 with all required fields
    - **Validates: Requirements 2.1, 2.2**
    - **Property 5: API key is never exposed in any response** — response body never contains the API key value
    - **Validates: Requirements 2.4**
    - **Property 11: Requests exceeding 10 seconds receive a 504 response**
    - **Validates: Requirements 4.3**
    - **Property 12: Geolocation coordinates flow through to the OWM fetch URL**
    - **Validates: Requirements 5.4, 5.5**
    - **Property 18: Missing or empty API key always yields HTTP 500**
    - **Validates: Requirements 9.3**

  - [x] 3.3 Implement `app/api/forecast/route.ts`
    - Apply the same API key check, parameter validation, timeout, and error-mapping logic as `/api/weather`
    - Call OWM `/data/2.5/forecast` endpoint
    - Group 3-hour entries by calendar date; skip today; select the entry closest to `12:00:00` for each of the next 5 days
    - Map each selected entry to a `ForecastEntry` (date as ISO 8601, temperature in °C, condition, icon URL)
    - Return 200 with `ForecastPayload` containing exactly 5 entries
    - _Requirements: 6.2, 6.3, 9.3_

  - [x] 3.4 Write property tests for `/api/forecast` route handler
    - **Property 13: ForecastAPI always returns exactly 5 well-formed entries** — for any valid city or coordinates, `forecast` array has exactly 5 entries each with valid `date`, `temperature`, `condition`, `icon`
    - **Validates: Requirements 6.2, 6.3**
    - **Property 18: Missing or empty API key always yields HTTP 500** (forecast route)
    - **Validates: Requirements 9.3**

- [~] 4. Checkpoint — API layer complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Core UI components
  - [~] 5.1 Implement `components/LoadingSpinner.tsx`
    - Accept optional `label` prop for `aria-label`
    - Render an accessible animated spinner
    - _Requirements: 1.5, 5.3_

  - [~] 5.2 Implement `components/ErrorMessage.tsx`
    - Accept `message: string` and `onDismiss: () => void` props
    - Render the error message in the main content area
    - Render a dismiss button that calls `onDismiss`; button must carry `min-h-[44px] min-w-[44px]`
    - _Requirements: 1.6, 4.4, 4.5_

  - [~] 5.3 Implement `components/AnimatedIcon.tsx`
    - Accept `condition: string`, optional `size?: number` (default 80), optional `className?: string`
    - Wrap `lottie-react` in a React error boundary that resets when `condition` changes
    - If `getAnimationPath(condition)` returns a path, render `<Lottie loop autoplay>`
    - If path is `null` or Lottie throws, render static `<img>` using `getStaticIconPath(condition)`
    - Include `aria-label` describing the condition on all interactive uses
    - _Requirements: 3.7, 3.8_

  - [x] 5.4 Write property tests for `AnimatedIcon`
    - **Property 20: AnimatedIcon renders Lottie for known conditions and StaticFallbackIcon otherwise** — known conditions render Lottie player; unknown conditions or Lottie errors render static `<img>`
    - **Validates: Requirements 3.7, 3.8**

  - [~] 5.5 Implement `components/SearchBar.tsx`
    - Accept `onSearch: (city: string) => void`, `onGeolocate: () => void`, `isLoading: boolean` props
    - Render `<input type="text" maxLength={255}>` and a submit `<button>`
    - Render a "Use My Location" `<button>`
    - On submit (Enter or button click): if input is empty or whitespace-only, show inline validation message and do NOT call `onSearch`; clear the message when input changes
    - Disable input and both buttons when `isLoading` is `true`
    - Mobile layout: `flex flex-col w-full gap-2`; each child `min-h-[44px] w-full`; at `xs:` restore `xs:flex-row xs:items-center`
    - All interactive elements carry `min-h-[44px] min-w-[44px]`
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 5.1, 5.2, 7.6, 7.9_

  - [x] 5.6 Write property tests for `SearchBar`
    - **Property 1: City name length constraint** — input accepted (request sent) iff length is 1–255; length 0 or > 255 rejected without request
    - **Validates: Requirements 1.2, 1.4**
    - **Property 3: Whitespace-only input is rejected** — any whitespace-only string shows validation message and does not dispatch request
    - **Validates: Requirements 1.4**
    - **Property 23: All interactive elements meet 44×44 px touch target requirements** — all buttons and input carry `min-h-[44px]` and `min-w-[44px]`
    - **Validates: Requirements 7.9**

  - [~] 5.7 Implement `components/WeatherCard.tsx`
    - Accept `payload: WeatherPayload` prop
    - Render city name, temperature (°C), humidity (%), wind speed (km/h), condition label, and `<AnimatedIcon condition={payload.condition} />`
    - Apply glassmorphism classes: `backdrop-blur-md bg-white/15 border border-white/25 shadow-2xl rounded-2xl`
    - Handle broken icon URL via `<img onError>` swapping src to `/placeholder-icon.svg`
    - Mobile layout: `p-4 text-5xl`; at `xs:`: `xs:p-6 xs:text-6xl`; `w-full max-w-md mx-auto`
    - Not rendered when no payload is available (controlled by parent)
    - _Requirements: 3.1, 3.2, 3.4, 3.5, 3.6, 7.7_

  - [x] 5.8 Write property tests for `WeatherCard`
    - **Property 8: WeatherCard renders all payload fields** — for any valid `WeatherPayload`, rendered output contains city, temperature, humidity, windSpeed, condition, and icon `src`
    - **Validates: Requirements 3.1**
    - **Property 19: Glassmorphism CSS values satisfy opacity and blur constraints** — className includes `bg-white/15`, `backdrop-blur-md`, `border-white/25`, `shadow-2xl`
    - **Validates: Requirements 3.5, 3.6**

  - [x] 5.9 Implement `components/ForecastPanel.tsx`
    - Accept `payload: ForecastPayload` prop
    - Render exactly 5 `ForecastCard` entries, each showing date formatted as "Day, Mon DD", temperature (°C), condition label, and `<AnimatedIcon>`
    - Mobile layout: `flex overflow-x-auto snap-x snap-mandatory`; each card: `snap-start flex-shrink-0 w-40`
    - Desktop layout (`md:`): `md:grid md:grid-cols-5`
    - _Requirements: 6.4, 7.2, 7.3, 7.8_

  - [x] 5.10 Write property tests for `ForecastPanel`
    - **Property 14: ForecastPanel renders all 5 entries with correct date format** — for any `ForecastPayload` with 5 valid ISO 8601 dates, renders 5 cards each with "Day, Mon DD" format
    - **Validates: Requirements 6.4**
    - **Property 22: ForecastPanel applies snap-scroll classes for horizontal scrolling** — container has `overflow-x-auto`, `snap-x`, `snap-mandatory`; each card has `snap-start`, `flex-shrink-0`, `w-40`
    - **Validates: Requirements 7.8**

- [~] 6. Checkpoint — Components complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. State management hook
  - [x] 7.1 Implement `hooks/useWeather.ts`
    - Define `WeatherState` interface: `weatherPayload`, `forecastPayload`, `isLoading`, `forecastUnavailable`, `error`, `lastQuery`
    - Implement `search(city: string)`: normalize city (trim + lowercase) for duplicate check against `lastQuery`; guard against in-flight requests via `useRef<boolean>`; `setLoading(true)`; fetch `/api/weather`; on success set payload and fire-and-forget `/api/forecast` fetch; on forecast failure set `forecastUnavailable(true)`; on weather error set error message
    - Implement `geolocate()`: call `getCoordinates()`; on `PERMISSION_DENIED` set error "Location access denied. Please search by city name."; on `UNAVAILABLE` set error "Unable to retrieve your location. Please search by city name."; on success fetch `/api/weather?lat=…&lon=…`
    - Implement `dismissError()`: clear error and reset search input state
    - Map API error statuses to user-facing messages (404 → city not found, 502/503 → service unavailable, 504 → timed out, 500 → server config error)
    - _Requirements: 1.5, 1.6, 4.4, 4.5, 5.2, 5.3, 5.4, 5.6, 5.7, 6.1, 6.5, 8.2, 8.3, 8.4_

  - [x] 7.2 Write property tests for `useWeather` hook
    - **Property 10: Any API error status suppresses WeatherCard and shows error message** — for any 4xx/5xx status, `error` is set and `weatherPayload` is null
    - **Validates: Requirements 4.4**
    - **Property 15: Different city name always triggers a new fetch** — any city name distinct from `lastQuery` (after trim/lowercase) dispatches a new request
    - **Validates: Requirements 8.2**
    - **Property 16: Same city name never triggers a duplicate fetch** — city matching `lastQuery` does not dispatch a new request
    - **Validates: Requirements 8.3**
    - **Property 17: In-flight guard prevents all duplicate requests** — N additional submissions while in-flight result in exactly 1 total request
    - **Validates: Requirements 8.4**

- [ ] 8. Main page wiring
  - [x] 8.1 Implement `app/page.tsx`
    - Instantiate `useWeather()` hook and wire `state`, `search`, `geolocate`, `dismissError` to child components
    - Create debounced `search` via `useMemo(() => debounce(search, 500), [search])`; cancel on unmount via `useEffect` cleanup
    - Render layered gradient background: outer `<div>` with `getTemperatureBackground(temp)` and `transition-all duration-700`; inner absolutely-positioned `<div>` with `getBackground(condition)` at `opacity-30`; content `<div>` with `relative z-10`
    - Render `<SearchBar onSearch={debouncedSearch} onGeolocate={geolocate} isLoading={state.isLoading} />`
    - Render `<LoadingSpinner>` while `state.isLoading` is true
    - Render `<ErrorMessage>` when `state.error` is set; wire `onDismiss` to `dismissError`
    - Render `<WeatherCard>` only when `state.weatherPayload` is non-null
    - Render `<ForecastPanel>` only when `state.forecastPayload` is non-null; render inline "Forecast data is currently unavailable." notice when `state.forecastUnavailable` is true
    - Apply `overflow-hidden w-full` to prevent horizontal overflow at all viewport widths
    - _Requirements: 1.1, 1.5, 1.6, 3.3, 3.4, 4.4, 4.5, 5.1, 6.1, 6.5, 7.1, 7.2, 7.3, 7.5, 8.1, 10.2, 10.3, 10.4_

  - [x] 8.2 Implement `app/layout.tsx`
    - Set up root layout with global Tailwind CSS import and any required font configuration
    - _Requirements: 7.4_

- [ ] 9. Static assets and environment files
  - [x] 9.1 Add Lottie JSON animation files and static SVG fallback icons
    - Place Lottie JSON files in `public/animations/`: `sunny.json`, `cloudy.json`, `rain.json`, `drizzle.json`, `thunderstorm.json`, `snow.json`, `mist.json`
    - Place static SVG fallback icons in `public/icons/`: `sunny.svg`, `cloudy.svg`, `rain.svg`, `drizzle.svg`, `thunderstorm.svg`, `snow.svg`, `mist.svg`
    - Place `public/placeholder-icon.svg` as the generic fallback
    - _Requirements: 3.7, 3.8_

  - [x] 9.2 Create `README.md`
    - Include step-by-step setup instructions: clone repo, install dependencies, create `.env.local` from `.env.local.example`, obtain OpenWeatherMap API key, run development server
    - _Requirements: 9.2_

- [x] 10. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Property-based tests use `fast-check` with a minimum of 100 iterations per property; each test is tagged with a comment `// Feature: weather-app, Property {number}: {property text}`
- Unit tests use Jest + React Testing Library
- The design uses TypeScript throughout — all implementation tasks use TypeScript
- Checkpoints ensure incremental validation at the API layer and component layer before final wiring
- All requirements are traceable through the `_Requirements:` annotations on each task

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "2.3", "2.5"] },
    { "id": 2, "tasks": ["2.2", "2.4", "3.1", "3.3"] },
    { "id": 3, "tasks": ["3.2", "3.4", "5.1", "5.2", "5.3"] },
    { "id": 4, "tasks": ["5.4", "5.5", "5.7", "5.9", "9.1", "9.2"] },
    { "id": 5, "tasks": ["5.6", "5.8", "5.10", "7.1"] },
    { "id": 6, "tasks": ["7.2", "8.2"] },
    { "id": 7, "tasks": ["8.1"] }
  ]
}
```
