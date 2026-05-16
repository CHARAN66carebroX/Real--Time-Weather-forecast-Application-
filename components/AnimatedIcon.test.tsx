/**
 * Property-based tests for AnimatedIcon component.
 * Feature: weather-app
 *
 * Property 20: AnimatedIcon renders Lottie for known conditions and StaticFallbackIcon otherwise
 * Validates: Requirements 3.7, 3.8
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import * as fc from 'fast-check';
import AnimatedIcon from './AnimatedIcon';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('lottie-react', () => ({
  __esModule: true,
  default: () => <div data-testid="lottie-player" />,
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
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setupFetchMock() {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ v: '5.5.7', layers: [] }),
  });
}

function teardownFetchMock() {
  jest.restoreAllMocks();
}

// ---------------------------------------------------------------------------
// Property 20 – known conditions render Lottie; unknown conditions render <img>
// ---------------------------------------------------------------------------

// Feature: weather-app, Property 20: AnimatedIcon renders Lottie for known conditions and StaticFallbackIcon otherwise
describe('AnimatedIcon – Property 20', () => {
  afterEach(() => {
    teardownFetchMock();
  });

  it('renders Lottie player for every known weather condition', async () => {
    setupFetchMock();

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...KNOWN_CONDITIONS),
        async (condition) => {
          const { getByTestId, unmount } = render(
            <AnimatedIcon condition={condition} />
          );

          await waitFor(() => {
            expect(getByTestId('lottie-player')).toBeInTheDocument();
          });

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('renders static <img> fallback for unknown weather conditions', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string().filter((s) => !(KNOWN_CONDITIONS as readonly string[]).includes(s)),
        async (condition) => {
          const { container, unmount } = render(
            <AnimatedIcon condition={condition} />
          );

          // For unknown conditions getAnimationPath returns null, so no fetch
          // is triggered and the component immediately renders the <img> fallback.
          const img = container.querySelector('img');
          expect(img).toBeInTheDocument();
          expect(img).toHaveAttribute('alt', condition);

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('renders static <img> fallback when fetch fails for a known condition', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    });

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...KNOWN_CONDITIONS),
        async (condition) => {
          const { container, unmount } = render(
            <AnimatedIcon condition={condition} />
          );

          await waitFor(() => {
            const img = container.querySelector('img');
            expect(img).toBeInTheDocument();
            expect(img).toHaveAttribute('alt', condition);
          });

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });
});
