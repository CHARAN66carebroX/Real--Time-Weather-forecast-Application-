/**
 * Property-based tests for lib/weatherUtils.ts
 * Feature: weather-app
 * Uses fast-check with a minimum of 100 iterations per property.
 */

import * as fc from 'fast-check';
import {
  kelvinToCelsius,
  msToKmh,
  getBackground,
  getTemperatureBackground,
} from './weatherUtils';

// ---------------------------------------------------------------------------
// Known OWM condition strings (mirrors CONDITION_BACKGROUNDS keys)
// ---------------------------------------------------------------------------
const KNOWN_CONDITIONS = [
  'Clear',
  'Clouds',
  'Rain',
  'Drizzle',
  'Thunderstorm',
  'Snow',
  'Mist',
  'Fog',
  'Haze',
];

// ---------------------------------------------------------------------------
// Property 6: Kelvin-to-Celsius conversion is correct
// Validates: Requirements 2.5
// ---------------------------------------------------------------------------
describe('kelvinToCelsius', () => {
  // Feature: weather-app, Property 6: Kelvin-to-Celsius conversion is correct
  it('Property 6: matches Math.round((K - 273.15) * 10) / 10 for any Kelvin value', () => {
    fc.assert(
      fc.property(
        // Use a wide but finite range of Kelvin values (absolute zero to very hot)
        fc.double({ min: 0, max: 10_000, noNaN: true }),
        (k) => {
          const expected = Math.round((k - 273.15) * 10) / 10;
          expect(kelvinToCelsius(k)).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Spot-check well-known values
  it('converts 273.15 K to 0 °C', () => {
    expect(kelvinToCelsius(273.15)).toBe(0);
  });

  it('converts 373.15 K to 100 °C', () => {
    expect(kelvinToCelsius(373.15)).toBe(100);
  });

  it('converts 0 K to -273.1 °C (absolute zero, rounds toward +∞)', () => {
    // Math.round(-2731.5) = -2731 (rounds toward +∞), so result is -273.1
    expect(kelvinToCelsius(0)).toBe(-273.1);
  });
});

// ---------------------------------------------------------------------------
// Property 7: m/s-to-km/h conversion is correct
// Validates: Requirements 2.6
// ---------------------------------------------------------------------------
describe('msToKmh', () => {
  // Feature: weather-app, Property 7: m/s-to-km/h conversion is correct
  it('Property 7: matches Math.round(v * 3.6 * 10) / 10 for any non-negative speed', () => {
    fc.assert(
      fc.property(
        // Wind speed is non-negative; cap at a realistic maximum
        fc.double({ min: 0, max: 500, noNaN: true }),
        (v) => {
          const expected = Math.round(v * 3.6 * 10) / 10;
          expect(msToKmh(v)).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Spot-check well-known values
  it('converts 0 m/s to 0 km/h', () => {
    expect(msToKmh(0)).toBe(0);
  });

  it('converts 10 m/s to 36 km/h', () => {
    expect(msToKmh(10)).toBe(36);
  });

  it('converts 1 m/s to 3.6 km/h', () => {
    expect(msToKmh(1)).toBe(3.6);
  });
});

// ---------------------------------------------------------------------------
// Property 9: Background mapping returns a valid class for every condition
// Validates: Requirements 3.3
// ---------------------------------------------------------------------------
describe('getBackground', () => {
  // Feature: weather-app, Property 9: Background mapping returns a valid class for every condition
  it('Property 9: returns a non-empty Tailwind gradient class for every known condition', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...KNOWN_CONDITIONS),
        (condition) => {
          const result = getBackground(condition);
          // Must be a non-empty string
          expect(typeof result).toBe('string');
          expect(result.length).toBeGreaterThan(0);
          // Must contain gradient-related Tailwind classes
          expect(result).toMatch(/bg-gradient-to-/);
          expect(result).toMatch(/from-/);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns the default gradient for an unrecognised condition', () => {
    fc.assert(
      fc.property(
        // Generate strings that are NOT in KNOWN_CONDITIONS
        fc.string({ minLength: 1 }).filter((s) => !KNOWN_CONDITIONS.includes(s)),
        (condition) => {
          const result = getBackground(condition);
          expect(result).toBe('bg-gradient-to-br from-sky-400 to-blue-600');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns a valid class for every known condition individually', () => {
    for (const condition of KNOWN_CONDITIONS) {
      const result = getBackground(condition);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(result).toMatch(/bg-gradient-to-/);
    }
  });
});

// ---------------------------------------------------------------------------
// Property 21: getTemperatureBackground returns the correct gradient class
//              for every temperature range, including boundary values
// Validates: Requirements 10.1
// ---------------------------------------------------------------------------
describe('getTemperatureBackground', () => {
  // Feature: weather-app, Property 21: getTemperatureBackground returns the correct gradient class for every temperature range
  it('Property 21: returns indigo/purple gradient for temp < 0', () => {
    fc.assert(
      fc.property(
        // fc.double accepts full 64-bit doubles; filter to strictly negative
        fc.double({ min: -200, max: -Number.EPSILON, noNaN: true }),
        (temp) => {
          expect(getTemperatureBackground(temp)).toBe(
            'bg-gradient-to-br from-indigo-900 to-purple-900'
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 21: returns blue gradient for 0 <= temp < 10', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 9.9, noNaN: true }),
        (temp) => {
          expect(getTemperatureBackground(temp)).toBe(
            'bg-gradient-to-br from-blue-700 to-blue-400'
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 21: returns teal/green gradient for 10 <= temp < 20', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 10, max: 19.9, noNaN: true }),
        (temp) => {
          expect(getTemperatureBackground(temp)).toBe(
            'bg-gradient-to-br from-teal-500 to-green-400'
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 21: returns orange/yellow gradient for 20 <= temp <= 30', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 20, max: 30, noNaN: true }),
        (temp) => {
          expect(getTemperatureBackground(temp)).toBe(
            'bg-gradient-to-br from-orange-400 to-yellow-300'
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 21: returns red/orange gradient for temp > 30', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 30 + Number.EPSILON, max: 100, noNaN: true }),
        (temp) => {
          expect(getTemperatureBackground(temp)).toBe(
            'bg-gradient-to-br from-red-600 to-orange-400'
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  // Boundary value tests
  describe('boundary values', () => {
    it('temp = 0 → blue gradient (0-9.9 range)', () => {
      expect(getTemperatureBackground(0)).toBe(
        'bg-gradient-to-br from-blue-700 to-blue-400'
      );
    });

    it('temp = 9.9 → blue gradient (0-9.9 range)', () => {
      expect(getTemperatureBackground(9.9)).toBe(
        'bg-gradient-to-br from-blue-700 to-blue-400'
      );
    });

    it('temp = 10 → teal/green gradient (10-19.9 range)', () => {
      expect(getTemperatureBackground(10)).toBe(
        'bg-gradient-to-br from-teal-500 to-green-400'
      );
    });

    it('temp = 19.9 → teal/green gradient (10-19.9 range)', () => {
      expect(getTemperatureBackground(19.9)).toBe(
        'bg-gradient-to-br from-teal-500 to-green-400'
      );
    });

    it('temp = 20 → orange/yellow gradient (20-30 range)', () => {
      expect(getTemperatureBackground(20)).toBe(
        'bg-gradient-to-br from-orange-400 to-yellow-300'
      );
    });

    it('temp = 30 → orange/yellow gradient (20-30 range)', () => {
      expect(getTemperatureBackground(30)).toBe(
        'bg-gradient-to-br from-orange-400 to-yellow-300'
      );
    });

    it('temp = 30.1 → red/orange gradient (>30 range)', () => {
      expect(getTemperatureBackground(30.1)).toBe(
        'bg-gradient-to-br from-red-600 to-orange-400'
      );
    });
  });
});
