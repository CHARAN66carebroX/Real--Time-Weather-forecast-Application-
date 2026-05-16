/**
 * Property-based tests for WeatherCard component.
 * Feature: weather-app
 *
 * Property 8: WeatherCard renders all payload fields
 * Validates: Requirements 3.1
 *
 * Property 19: Glassmorphism CSS values satisfy opacity and blur constraints
 * Validates: Requirements 3.5, 3.6
 */

import React from 'react';
import { render, within } from '@testing-library/react';
import * as fc from 'fast-check';
import WeatherCard from './WeatherCard';
import { WeatherPayload } from '@/lib/types';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@/components/AnimatedIcon', () => ({
  __esModule: true,
  default: ({ condition }: { condition: string }) => (
    <div data-testid="animated-icon">{condition}</div>
  ),
}));

// ---------------------------------------------------------------------------
// Constants
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
// Arbitraries
// ---------------------------------------------------------------------------

const weatherPayloadArb: fc.Arbitrary<WeatherPayload> = fc.record({
  // Ensure city has at least one non-whitespace character so getByText can find it
  city: fc
    .string({ minLength: 1, maxLength: 50 })
    .filter((s) => s.trim().length > 0),
  // Use integer temperatures to avoid floating-point rendering surprises
  temperature: fc.integer({ min: -50, max: 50 }),
  humidity: fc.integer({ min: 0, max: 100 }),
  // Use integer wind speeds to avoid floating-point rendering surprises
  windSpeed: fc.integer({ min: 0, max: 200 }),
  condition: fc.constantFrom(...KNOWN_CONDITIONS),
  icon: fc.webUrl(),
});

// ---------------------------------------------------------------------------
// Property 8 – WeatherCard renders all payload fields
// ---------------------------------------------------------------------------

// Feature: weather-app, Property 8: WeatherCard renders all payload fields
describe('WeatherCard – Property 8', () => {
  it('renders city, temperature, humidity, windSpeed, condition, and icon for any valid WeatherPayload', () => {
    fc.assert(
      fc.property(weatherPayloadArb, (payload) => {
        const { container, unmount } = render(<WeatherCard payload={payload} />);
        const q = within(container);

        // City name – use custom matcher to handle leading/trailing whitespace in city strings
        expect(
          q.getByText((_, el) =>
            el?.textContent?.trim() === payload.city.trim() &&
            el?.tagName === 'H2'
          )
        ).toBeInTheDocument();

        // Condition label (rendered twice: in <p> and inside AnimatedIcon mock)
        const conditionEls = q.getAllByText(payload.condition);
        expect(conditionEls.length).toBeGreaterThanOrEqual(1);

        // Temperature – rendered as "{value}°C"
        expect(
          q.getByText((_, el) =>
            el?.textContent?.replace(/\s+/g, ' ').trim() ===
            `${payload.temperature}°C`
          )
        ).toBeInTheDocument();

        // Humidity – rendered as "Humidity: {value}%"
        expect(
          q.getByText((_, el) =>
            el?.textContent?.replace(/\s+/g, ' ').trim() ===
            `Humidity: ${payload.humidity}%`
          )
        ).toBeInTheDocument();

        // Wind speed – rendered as "Wind: {value} km/h"
        expect(
          q.getByText((_, el) =>
            el?.textContent?.replace(/\s+/g, ' ').trim() ===
            `Wind: ${payload.windSpeed} km/h`
          )
        ).toBeInTheDocument();

        // Icon src – the <img> element should have the payload icon as src
        const img = container.querySelector('img');
        expect(img).toBeInTheDocument();
        expect(img).toHaveAttribute('src', payload.icon);

        unmount();
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 19 – Glassmorphism CSS values satisfy opacity and blur constraints
// ---------------------------------------------------------------------------

// Feature: weather-app, Property 19: Glassmorphism CSS values satisfy opacity and blur constraints
describe('WeatherCard – Property 19', () => {
  it('card container className includes all required glassmorphism classes for any valid payload', () => {
    fc.assert(
      fc.property(weatherPayloadArb, (payload) => {
        const { container, unmount } = render(<WeatherCard payload={payload} />);

        // The outermost <div> is the card container
        const card = container.firstElementChild as HTMLElement;
        expect(card).not.toBeNull();

        const className = card.className;

        expect(className).toContain('bg-white/15');
        expect(className).toContain('backdrop-blur-md');
        expect(className).toContain('border-white/25');
        expect(className).toContain('shadow-2xl');

        unmount();
      }),
      { numRuns: 100 }
    );
  });
});
