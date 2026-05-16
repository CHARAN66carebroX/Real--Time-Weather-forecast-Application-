/**
 * Property-based tests for ForecastPanel component.
 * Feature: weather-app
 *
 * Property 14: ForecastPanel renders all 5 entries with correct date format
 * Property 22: ForecastPanel applies snap-scroll classes for horizontal scrolling
 *
 * Validates: Requirements 6.4, 7.8
 */

import React from 'react';
import { render } from '@testing-library/react';
import * as fc from 'fast-check';
import ForecastPanel from './ForecastPanel';
import type { ForecastPayload, ForecastEntry } from '../lib/types';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('./AnimatedIcon', () => ({
  __esModule: true,
  default: ({ condition }: { condition: string }) => (
    <div data-testid="animated-icon">{condition}</div>
  ),
}));

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Pad a number to at least 2 digits */
function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * Generates a valid ISO 8601 date string (YYYY-MM-DD) for a future date
 * (year 2025–2099) to avoid any today-skipping edge cases.
 */
const futureDateStringArb: fc.Arbitrary<string> = fc
  .record({
    year: fc.integer({ min: 2025, max: 2099 }),
    month: fc.integer({ min: 1, max: 12 }),
    day: fc.integer({ min: 1, max: 28 }), // 1–28 is valid for every month
  })
  .map(({ year, month, day }) => `${year}-${pad2(month)}-${pad2(day)}`);

/** Generates a single ForecastEntry with a given date string */
function forecastEntryArb(dateArb: fc.Arbitrary<string>): fc.Arbitrary<ForecastEntry> {
  return fc.record({
    date: dateArb,
    temperature: fc.float({ min: -40, max: 50, noNaN: true }),
    condition: fc.constantFrom('Clear', 'Clouds', 'Rain', 'Drizzle', 'Snow', 'Thunderstorm', 'Mist'),
    icon: fc.constant('https://openweathermap.org/img/wn/01d@2x.png'),
  });
}

/**
 * Generates a ForecastPayload with exactly 5 entries, each with a unique
 * future ISO 8601 date string.
 */
const forecastPayloadArb: fc.Arbitrary<ForecastPayload> = fc
  .uniqueArray(futureDateStringArb, { minLength: 5, maxLength: 5 })
  .chain((dates) =>
    fc
      .tuple(...(dates.map((d) => forecastEntryArb(fc.constant(d))) as [fc.Arbitrary<ForecastEntry>, ...fc.Arbitrary<ForecastEntry>[]]))
      .map((entries) => ({
        city: 'TestCity',
        forecast: entries as ForecastEntry[],
      }))
  );

// ---------------------------------------------------------------------------
// Property 14 – renders all 5 entries with correct date format
// ---------------------------------------------------------------------------

// Feature: weather-app, Property 14: ForecastPanel renders all 5 entries with correct date format
describe('ForecastPanel – Property 14', () => {
  /**
   * **Validates: Requirements 6.4**
   *
   * For any ForecastPayload with 5 valid ISO 8601 dates, ForecastPanel renders
   * exactly 5 cards, each displaying the date formatted as "Day, Mon DD"
   * (e.g. "Mon, Jan 01").
   */
  it('renders exactly 5 forecast cards each with a "Day, Mon DD" formatted date', () => {
    // Feature: weather-app, Property 14: ForecastPanel renders all 5 entries with correct date format
    fc.assert(
      fc.property(forecastPayloadArb, (payload) => {
        const { container, unmount } = render(<ForecastPanel payload={payload} />);

        // The outer container is the first div; each card is a direct child div
        const outerDiv = container.firstElementChild as HTMLElement;
        const cards = Array.from(outerDiv.children) as HTMLElement[];

        // Must render exactly 5 cards
        if (cards.length !== 5) {
          unmount();
          return false;
        }

        // Each card's first <p> must match "Day, Mon DD" pattern
        const datePattern = /^[A-Z][a-z]{2}, [A-Z][a-z]{2} \d{2}$/;
        for (const card of cards) {
          const dateParagraph = card.querySelector('p');
          if (!dateParagraph) {
            unmount();
            return false;
          }
          if (!datePattern.test(dateParagraph.textContent ?? '')) {
            unmount();
            return false;
          }
        }

        unmount();
        return true;
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 22 – snap-scroll classes applied to container and cards
// ---------------------------------------------------------------------------

// Feature: weather-app, Property 22: ForecastPanel applies snap-scroll classes for horizontal scrolling
describe('ForecastPanel – Property 22', () => {
  /**
   * **Validates: Requirements 7.8**
   *
   * For any valid ForecastPayload, the container div has classes
   * `overflow-x-auto`, `snap-x`, and `snap-mandatory`, and each card div
   * has classes `snap-start`, `flex-shrink-0`, and `w-40`.
   */
  it('container has overflow-x-auto snap-x snap-mandatory; each card has snap-start flex-shrink-0 w-40', () => {
    // Feature: weather-app, Property 22: ForecastPanel applies snap-scroll classes for horizontal scrolling
    fc.assert(
      fc.property(forecastPayloadArb, (payload) => {
        const { container, unmount } = render(<ForecastPanel payload={payload} />);

        const outerDiv = container.firstElementChild as HTMLElement;

        // Container class assertions
        const containerClasses = outerDiv.className;
        if (!containerClasses.includes('overflow-x-auto')) {
          unmount();
          return false;
        }
        if (!containerClasses.includes('snap-x')) {
          unmount();
          return false;
        }
        if (!containerClasses.includes('snap-mandatory')) {
          unmount();
          return false;
        }

        // Each card class assertions
        const cards = Array.from(outerDiv.children) as HTMLElement[];
        for (const card of cards) {
          const cardClasses = card.className;
          if (!cardClasses.includes('snap-start')) {
            unmount();
            return false;
          }
          if (!cardClasses.includes('flex-shrink-0')) {
            unmount();
            return false;
          }
          if (!cardClasses.includes('w-40')) {
            unmount();
            return false;
          }
        }

        unmount();
        return true;
      }),
      { numRuns: 100 }
    );
  });
});
