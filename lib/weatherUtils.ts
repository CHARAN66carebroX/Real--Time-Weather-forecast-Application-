/**
 * Weather utility functions for unit conversions and condition-to-asset mappings.
 */

// ---------------------------------------------------------------------------
// Condition → Background gradient mapping
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Condition → Lottie animation path mapping
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Condition → Static SVG icon path mapping
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Unit conversion functions
// ---------------------------------------------------------------------------

/**
 * Converts a temperature from Kelvin to Celsius, rounded to 1 decimal place.
 * @param k - Temperature in Kelvin
 * @returns Temperature in °C
 */
export function kelvinToCelsius(k: number): number {
  return Math.round((k - 273.15) * 10) / 10;
}

/**
 * Converts a wind speed from metres per second to kilometres per hour,
 * rounded to 1 decimal place.
 * @param v - Wind speed in m/s
 * @returns Wind speed in km/h
 */
export function msToKmh(v: number): number {
  return Math.round(v * 3.6 * 10) / 10;
}

// ---------------------------------------------------------------------------
// Background / gradient helpers
// ---------------------------------------------------------------------------

/**
 * Returns a Tailwind CSS gradient class string for the given OWM condition string.
 * Falls back to a neutral sky-blue gradient for unrecognised conditions.
 * @param condition - OWM weather[0].main string, e.g. "Clear", "Rain"
 */
export function getBackground(condition: string): string {
  return CONDITION_BACKGROUNDS[condition] ?? DEFAULT_BACKGROUND;
}

/**
 * Returns a Tailwind CSS gradient class string based on the temperature in °C.
 * Used as the primary page background; the ConditionGradient is layered on top at 30% opacity.
 *
 * Range boundaries:
 *   < 0      → deep blue/purple
 *   0 – 9.9  → cool blue
 *   10 – 19.9 → teal/green
 *   20 – 30  → orange/yellow
 *   > 30     → red/orange
 *
 * @param temp - Temperature in °C
 */
export function getTemperatureBackground(temp: number): string {
  if (temp < 0)   return 'bg-gradient-to-br from-indigo-900 to-purple-900';
  if (temp < 10)  return 'bg-gradient-to-br from-blue-700 to-blue-400';
  if (temp < 20)  return 'bg-gradient-to-br from-teal-500 to-green-400';
  if (temp <= 30) return 'bg-gradient-to-br from-orange-400 to-yellow-300';
  return                 'bg-gradient-to-br from-red-600 to-orange-400';
}

// ---------------------------------------------------------------------------
// Animation / icon path helpers
// ---------------------------------------------------------------------------

/**
 * Returns the path to the Lottie JSON animation for the given condition,
 * or `null` if the condition is not recognised.
 * @param condition - OWM weather[0].main string
 */
export function getAnimationPath(condition: string): string | null {
  return CONDITION_ANIMATIONS[condition] ?? null;
}

/**
 * Returns the path to the static SVG fallback icon for the given condition.
 * Falls back to the generic placeholder icon for unrecognised conditions.
 * @param condition - OWM weather[0].main string
 */
export function getStaticIconPath(condition: string): string {
  return CONDITION_STATIC_ICONS[condition] ?? DEFAULT_STATIC_ICON;
}
