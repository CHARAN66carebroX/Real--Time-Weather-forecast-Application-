/**
 * Property-based tests for SearchBar component.
 * Feature: weather-app
 *
 * Property 1: City name length constraint — input accepted iff length is 1–255
 * Property 3: Whitespace-only input is rejected
 * Property 23: All interactive elements meet 44×44 px touch target requirements
 *
 * Validates: Requirements 1.2, 1.4, 7.9
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import * as fc from 'fast-check';
import SearchBar from './SearchBar';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderSearchBar(isLoading = false) {
  const onSearch = jest.fn();
  const onGeolocate = jest.fn();
  const utils = render(
    <SearchBar onSearch={onSearch} onGeolocate={onGeolocate} isLoading={isLoading} />
  );
  const input = screen.getByRole('textbox');
  const searchButton = screen.getByRole('button', { name: /search/i });
  return { onSearch, onGeolocate, input, searchButton, ...utils };
}

// ---------------------------------------------------------------------------
// Property 1: City name length constraint
// Validates: Requirements 1.2, 1.4
// ---------------------------------------------------------------------------

// Feature: weather-app, Property 1: City name length constraint
describe('SearchBar – Property 1: City name length constraint', () => {
  /**
   * **Validates: Requirements 1.2, 1.4**
   *
   * Length 0 (empty string): submit should NOT call onSearch and should show
   * the validation message.
   */
  it('does not call onSearch and shows validation message for empty input', () => {
    const { onSearch, searchButton } = renderSearchBar();

    // Submit without typing anything (length 0)
    fireEvent.click(searchButton);

    expect(onSearch).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Please enter a city name.');
  });

  /**
   * **Validates: Requirements 1.2, 1.4**
   *
   * Length 1–255: any non-whitespace string of length 1–255 should trigger
   * onSearch with the trimmed value.
   */
  it('calls onSearch for any valid city string of length 1–255', () => {
    fc.assert(
      fc.property(
        // Generate strings of length 1–255 that are not purely whitespace
        fc
          .string({ minLength: 1, maxLength: 255 })
          .filter((s) => s.trim().length > 0),
        (cityName) => {
          const onSearch = jest.fn();
          const onGeolocate = jest.fn();
          const { unmount } = render(
            <SearchBar onSearch={onSearch} onGeolocate={onGeolocate} isLoading={false} />
          );

          const input = screen.getByRole('textbox');
          const searchButton = screen.getByRole('button', { name: /search/i });

          fireEvent.change(input, { target: { value: cityName } });
          fireEvent.click(searchButton);

          const called = onSearch.mock.calls.length === 1;
          const calledWithTrimmed =
            called && onSearch.mock.calls[0][0] === cityName.trim();

          unmount();
          return calledWithTrimmed;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 3: Whitespace-only input is rejected
// Validates: Requirements 1.4
// ---------------------------------------------------------------------------

// Feature: weather-app, Property 3: Whitespace-only input is rejected
describe('SearchBar – Property 3: Whitespace-only input is rejected', () => {
  /**
   * **Validates: Requirements 1.4**
   *
   * Any string composed entirely of whitespace characters (space, tab, newline,
   * carriage return) must NOT trigger onSearch and must show the validation
   * message.
   */
  it('does not call onSearch and shows validation message for whitespace-only input', () => {
    // Whitespace characters: space, tab, newline, carriage return
    const whitespaceChars = [' ', '\t', '\n', '\r'];

    fc.assert(
      fc.property(
        // Generate a non-empty string made exclusively of whitespace characters
        fc
          .array(fc.constantFrom(...whitespaceChars), { minLength: 1, maxLength: 50 })
          .map((chars) => chars.join('')),
        (whitespaceInput) => {
          const onSearch = jest.fn();
          const onGeolocate = jest.fn();
          const { unmount } = render(
            <SearchBar onSearch={onSearch} onGeolocate={onGeolocate} isLoading={false} />
          );

          const input = screen.getByRole('textbox');
          const searchButton = screen.getByRole('button', { name: /search/i });

          fireEvent.change(input, { target: { value: whitespaceInput } });
          fireEvent.click(searchButton);

          const notCalled = onSearch.mock.calls.length === 0;
          const hasValidation =
            document.querySelector('[role="alert"]')?.textContent ===
            'Please enter a city name.';

          unmount();
          return notCalled && hasValidation;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 23: All interactive elements meet 44×44 px touch target requirements
// Validates: Requirements 7.9
// ---------------------------------------------------------------------------

// Feature: weather-app, Property 23: All interactive elements meet 44×44 px touch target requirements
describe('SearchBar – Property 23: Touch target size requirements', () => {
  /**
   * **Validates: Requirements 7.9**
   *
   * All buttons and the text input must carry both `min-h-[44px]` and
   * `min-w-[44px]` Tailwind classes to satisfy the 44×44 px touch target
   * requirement regardless of loading state.
   */
  it('all interactive elements have min-h-[44px] and min-w-[44px] classes', () => {
    fc.assert(
      fc.property(
        fc.boolean(), // isLoading can be true or false
        (isLoading) => {
          const onSearch = jest.fn();
          const onGeolocate = jest.fn();
          const { container, unmount } = render(
            <SearchBar
              onSearch={onSearch}
              onGeolocate={onGeolocate}
              isLoading={isLoading}
            />
          );

          const input = container.querySelector('input[type="text"]');
          const buttons = container.querySelectorAll('button');

          // Collect all interactive elements
          const interactiveElements = [input, ...Array.from(buttons)];

          const allMeetTouchTarget = interactiveElements.every((el) => {
            if (!el) return false;
            const className = el.className;
            return (
              className.includes('min-h-[44px]') &&
              className.includes('min-w-[44px]')
            );
          });

          unmount();
          return allMeetTouchTarget;
        }
      ),
      { numRuns: 100 }
    );
  });
});
