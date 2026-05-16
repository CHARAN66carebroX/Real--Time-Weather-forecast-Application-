# Requirements Document

## Introduction

This document defines the requirements for a full-stack Real-Time Weather Forecast Application built with Next.js (App Router). The application allows users to search for current weather conditions by city name or geolocation, displays real-time weather data fetched from the OpenWeatherMap API, and optionally shows a 5-day forecast. The system is composed of a Next.js frontend with Tailwind CSS styling and a Next.js API Route backend that proxies requests to OpenWeatherMap while keeping the API key secure.

## Glossary

- **Application**: The full-stack Next.js weather forecast web application.
- **WeatherAPI**: The Next.js API Route handler at `/api/weather` that fetches and returns weather data.
- **ForecastAPI**: The Next.js API Route handler at `/api/forecast` that fetches and returns 5-day forecast data.
- **OpenWeatherMap**: The third-party weather data provider accessed via its REST API.
- **WeatherCard**: The UI component that displays current weather details for a city.
- **SearchBar**: The UI component that accepts city name input and triggers a weather search.
- **ForecastPanel**: The UI component that displays the 5-day weather forecast.
- **GeolocationService**: The browser Geolocation API used to obtain the user's current coordinates.
- **Debouncer**: The client-side utility that delays search requests until the user has stopped typing for a defined interval.
- **WeatherPayload**: The structured JSON object `{ city, temperature, humidity, windSpeed, condition, icon }` returned by the WeatherAPI.
- **ForecastPayload**: The structured JSON object `{ city, forecast: [{ date, temperature, condition, icon }] }` returned by the ForecastAPI.
- **EnvironmentConfig**: The `.env.local` file that stores the `OPENWEATHERMAP_API_KEY` secret.
- **GlassmorphismStyle**: A visual treatment combining a semi-transparent background, `backdrop-filter: blur`, a subtle border, and a soft drop shadow to produce a frosted-glass appearance.
- **AnimatedWeatherIcon**: An SVG or Lottie animation that visually represents a weather condition (e.g., spinning sun, animated raindrops, drifting clouds).
- **StaticFallbackIcon**: A non-animated SVG or PNG icon displayed when the animation library fails to load.
- **TemperatureGradient**: A CSS background gradient whose color range is determined by the current temperature value according to a predefined temperature-to-palette mapping.
- **ConditionGradient**: A CSS background gradient whose color range is determined by the current weather condition string.
- **ForecastCard**: An individual day entry rendered inside the ForecastPanel.

---

## Requirements

### Requirement 1: City Weather Search

**User Story:** As a user, I want to search for weather by city name, so that I can view current weather conditions for any city in the world.

#### Acceptance Criteria

1. THE SearchBar SHALL render a text input field and a submit button on the main page.
2. WHEN the user submits a city name, THE Application SHALL send a request to the WeatherAPI with the city name as a query parameter, and the city name SHALL be no longer than 255 characters.
3. WHEN the user types in the search input, THE Debouncer SHALL delay the search request by 500 milliseconds of input inactivity before triggering an API call.
4. IF the search input is empty when the user submits, THEN THE SearchBar SHALL display an inline validation message that clears when the user modifies the input, and SHALL NOT send a request to the WeatherAPI.
5. WHILE a weather request is in progress, THE Application SHALL display a loading indicator and SHALL disable the search input and submit button.
6. WHEN the WeatherAPI responds with a city-not-found or error status, THE Application SHALL display a visible error message in the main content area describing the cause of the failure.

---

### Requirement 2: Real-Time Weather Data Retrieval

**User Story:** As a user, I want to see real-time weather data for my searched city, so that I can make informed decisions based on current conditions.

#### Acceptance Criteria

1. WHEN the WeatherAPI receives a request with a valid city name (1–100 characters, containing only letters, spaces, hyphens, or apostrophes), THE WeatherAPI SHALL fetch current weather data from OpenWeatherMap and respond with HTTP status 200 and a WeatherPayload within 10 seconds.
2. THE WeatherAPI SHALL return a WeatherPayload containing: `city` (string), `temperature` (number in °C), `humidity` (number as percentage), `windSpeed` (number in km/h), `condition` (string), and `icon` (string URL).
3. IF the WeatherAPI receives a city name that OpenWeatherMap does not recognize, THEN THE WeatherAPI SHALL respond with HTTP status 404 and a JSON body containing an error message indicating the city was not found.
4. THE WeatherAPI SHALL read the OpenWeatherMap API key exclusively from the `OPENWEATHERMAP_API_KEY` environment variable defined in EnvironmentConfig and SHALL NOT expose the key in any client-side code or response.
5. WHEN the WeatherAPI receives a request, THE WeatherAPI SHALL convert the temperature from Kelvin to Celsius before including it in the WeatherPayload.
6. WHEN the WeatherAPI receives a request, THE WeatherAPI SHALL convert wind speed from meters per second to kilometers per hour before including it in the WeatherPayload.
7. IF the OpenWeatherMap API is unreachable or returns a server error, THEN THE WeatherAPI SHALL respond with HTTP status 503 and a JSON body containing an error message indicating the upstream service is unavailable.

---

### Requirement 3: Weather Data Display

**User Story:** As a user, I want to see a weather card with all relevant details, so that I can quickly understand the current weather at a glance.

#### Acceptance Criteria

1. WHEN a WeatherPayload is received, THE WeatherCard SHALL display the city name, temperature in °C, humidity percentage, wind speed in km/h, weather condition label, and the weather icon.
2. WHEN a WeatherPayload is received, THE WeatherCard SHALL render the weather icon using the icon URL from the WeatherPayload; IF the icon URL is broken or unreachable, THE WeatherCard SHALL display a fallback placeholder icon in its place.
3. WHEN the weather condition changes, THE Application SHALL update the page background to reflect the current condition using a predefined condition-to-background mapping (e.g., clear → sunny gradient, rain → grey gradient, clouds → muted gradient); IF the condition does not match any entry in the mapping, THE Application SHALL apply a default neutral background.
4. WHILE no WeatherPayload has been received, THE WeatherCard SHALL NOT be rendered on the page.
5. THE WeatherCard SHALL apply GlassmorphismStyle by rendering a semi-transparent white or light background with opacity no greater than 0.25, a `backdrop-filter: blur` of at least 10px, a 1px solid border with opacity no greater than 0.3, and a soft drop shadow of at least 4px blur radius.
6. THE WeatherCard SHALL maintain visible GlassmorphismStyle contrast against all ConditionGradient and TemperatureGradient backgrounds defined in Requirements 3 and 10.
7. WHEN a WeatherPayload is received, THE Application SHALL render an AnimatedWeatherIcon that corresponds to the weather condition string using a predefined condition-to-animation mapping (e.g., "Clear" → spinning sun, "Rain" → animated raindrops, "Clouds" → drifting clouds).
8. IF the animation library fails to load, THEN THE Application SHALL render a StaticFallbackIcon that corresponds to the same weather condition in place of the AnimatedWeatherIcon.

---

### Requirement 4: Error Handling

**User Story:** As a user, I want to receive clear feedback when a city is not found or a network error occurs, so that I understand what went wrong and can try again.

#### Acceptance Criteria

1. IF the city name provided does not match any city in OpenWeatherMap, THEN THE WeatherAPI SHALL respond with HTTP status 404 and a JSON body containing an error message indicating the city was not found.
2. IF the OpenWeatherMap API returns an error response, THEN THE WeatherAPI SHALL respond with HTTP status 502 and a JSON body containing an error message indicating the data fetch failed.
3. IF the network request from the WeatherAPI to OpenWeatherMap exceeds 10 seconds, THEN THE WeatherAPI SHALL abort the request and respond with HTTP status 504 and a JSON body containing an error message indicating the request timed out.
4. WHEN the WeatherAPI responds with an error status, THE Application SHALL display a visible error message in the main content area that describes the cause of the failure, and SHALL NOT render the WeatherCard.
5. WHEN an error message is displayed, THE Application SHALL provide a dismiss control that, when activated, removes the error message from the page and returns the search input field to an empty, ready-to-accept-input state.

---

### Requirement 5: Geolocation Support

**User Story:** As a user, I want to get weather for my current location automatically, so that I can see local conditions without typing a city name.

#### Acceptance Criteria

1. THE Application SHALL render a "Use My Location" button on the main page alongside the SearchBar.
2. WHEN the user clicks "Use My Location", THE Application SHALL disable the button and invoke the GeolocationService to request the user's current coordinates; THE button SHALL remain disabled until the GeolocationService resolves or rejects.
3. WHILE the GeolocationService is pending, THE Application SHALL display a loading indicator and disable the search input and submit button.
4. WHEN the GeolocationService returns coordinates, THE Application SHALL send a request to the WeatherAPI with the latitude and longitude as query parameters instead of a city name.
5. WHEN the WeatherAPI receives latitude and longitude parameters, THE WeatherAPI SHALL fetch weather data from OpenWeatherMap using coordinate-based lookup, respond with HTTP status 200, and return a WeatherPayload within 10 seconds.
6. IF the GeolocationService returns a permission denied error, THEN THE Application SHALL display the message "Location access denied. Please search by city name." and SHALL NOT send a request to the WeatherAPI.
7. IF the GeolocationService returns any error other than permission denied, THEN THE Application SHALL display the message "Unable to retrieve your location. Please search by city name." and SHALL NOT send a request to the WeatherAPI.

---

### Requirement 6: 5-Day Forecast

**User Story:** As a user, I want to see a 5-day weather forecast, so that I can plan ahead based on upcoming conditions.

#### Acceptance Criteria

1. WHEN a WeatherPayload is successfully displayed, THE Application SHALL automatically fetch forecast data from the ForecastAPI for the same city or coordinates.
2. WHEN the ForecastAPI receives a valid city name or coordinates, THE ForecastAPI SHALL fetch 5-day forecast data from OpenWeatherMap and return a ForecastPayload.
3. THE ForecastPayload SHALL contain a `forecast` array of exactly 5 entries, each with: `date` (ISO 8601 date string), `temperature` (number in °C, rounded to one decimal place), `condition` (string), and `icon` (string URL).
4. WHEN a ForecastPayload is received, THE ForecastPanel SHALL render one forecast entry per day showing the date formatted as "Day, Mon DD" (e.g., "Mon, Jan 01"), temperature in °C, condition label, and icon.
5. IF the ForecastAPI request fails due to a network error, timeout, or upstream API error, THEN THE Application SHALL display the current weather WeatherCard without the ForecastPanel, SHALL show a brief inline notice that forecast data is unavailable, and SHALL NOT block the display of current weather data.

---

### Requirement 7: Responsive Design

**User Story:** As a user, I want the application to work well on both mobile and desktop screens, so that I can check the weather from any device.

#### Acceptance Criteria

1. THE Application SHALL render all interactive controls (SearchBar, "Use My Location" button) and content areas (WeatherCard, ForecastPanel) without horizontal overflow on viewport widths from 320px to 2560px.
2. WHEN the viewport width is less than 768px, THE Application SHALL display the SearchBar, WeatherCard, and ForecastPanel entries in a single-column stacked layout with no horizontal scrolling.
3. WHEN the viewport width is 768px or greater, THE Application SHALL display the SearchBar and WeatherCard in a centered single-column layout, and the ForecastPanel entries in a horizontal row layout.
4. THE Application SHALL use Tailwind CSS responsive utility classes for all layout breakpoints.
5. THE Application SHALL NOT use inline styles to implement responsive layout behavior.
6. WHEN the viewport width is less than 480px, THE SearchBar SHALL stack the text input and all action buttons vertically, with each element occupying the full available width and a minimum height of 44px.
7. WHEN the viewport width is less than 480px, THE WeatherCard SHALL apply compact spacing with reduced padding and a temperature font size no larger than 3rem.
8. WHEN the viewport width is less than 480px, THE ForecastPanel SHALL render ForecastCards in a horizontally scrollable row with CSS scroll-snap alignment set to `start`, so that all 5 ForecastCards are accessible by horizontal swiping without vertical stacking.
9. THE Application SHALL render all interactive elements with a minimum touch target size of 44×44px on viewport widths less than 480px to meet WCAG 2.1 AA minimum touch target requirements.

---

### Requirement 8: API Call Optimization

**User Story:** As a developer, I want API calls to be optimized, so that the application avoids unnecessary requests and stays within API rate limits.

#### Acceptance Criteria

1. THE Debouncer SHALL prevent the Application from sending a WeatherAPI request until 500 milliseconds have elapsed since the user's last keystroke in the search input.
2. WHEN the user submits a city name that differs from the city name of the currently displayed WeatherPayload, THE Application SHALL send a new request to the WeatherAPI.
3. WHEN the user submits the same city name as the currently displayed WeatherPayload, THE Application SHALL NOT send a new request to the WeatherAPI.
4. WHILE a WeatherAPI request is already in progress (from dispatch until response or error receipt), THE Application SHALL ignore any additional search submissions and SHALL NOT send duplicate requests.

---

### Requirement 9: Environment Configuration and Setup

**User Story:** As a developer, I want clear setup instructions and a secure API key configuration, so that I can run the application locally without exposing secrets.

#### Acceptance Criteria

1. THE Application SHALL include a `.env.local.example` file at the project root containing the placeholder entry `OPENWEATHERMAP_API_KEY=your_api_key_here`.
2. THE Application SHALL include a `README.md` file with step-by-step setup instructions covering: cloning the repository, installing dependencies, creating `.env.local` from `.env.local.example`, obtaining an OpenWeatherMap API key, and running the development server.
3. IF the `OPENWEATHERMAP_API_KEY` environment variable is not set or is set to an empty string at runtime, THEN THE WeatherAPI SHALL respond with HTTP status 500 and a JSON body containing an error message indicating a server configuration error.
4. THE Application SHALL include `.env.local` in `.gitignore` to prevent accidental secret exposure.

---

### Requirement 10: Temperature-Based Gradient Background

**User Story:** As a user, I want the page background to visually reflect the current temperature, so that I can intuitively sense how hot or cold it is at a glance.

#### Acceptance Criteria

1. WHEN a WeatherPayload is received, THE Application SHALL apply a TemperatureGradient to the page background according to the following mapping based on the temperature value in °C:
   - IF the temperature is less than 0°C, THE Application SHALL apply a deep blue/purple gradient.
   - IF the temperature is between 0°C and 9.9°C (inclusive), THE Application SHALL apply a cool blue gradient.
   - IF the temperature is between 10°C and 19.9°C (inclusive), THE Application SHALL apply a teal/green gradient.
   - IF the temperature is between 20°C and 30°C (inclusive), THE Application SHALL apply an orange/yellow gradient.
   - IF the temperature is greater than 30°C, THE Application SHALL apply a red/orange gradient.
2. WHEN the displayed temperature changes from one range boundary to another, THE Application SHALL transition the TemperatureGradient smoothly using a CSS transition of at least 600ms duration.
3. WHEN both a ConditionGradient and a TemperatureGradient apply simultaneously, THE Application SHALL render the TemperatureGradient as the primary page background, with the ConditionGradient applied as a secondary overlay at reduced opacity so that both are perceptible.
4. IF no WeatherPayload has been received, THE Application SHALL display the default neutral background defined in Requirement 3, Acceptance Criterion 3.
