'use client';

import { useState } from 'react';

interface SearchBarProps {
  onSearch: (city: string) => void;
  onGeolocate: () => void;
  isLoading: boolean;
}

export default function SearchBar({ onSearch, onGeolocate, isLoading }: SearchBarProps) {
  const [inputValue, setInputValue] = useState('');
  const [validationMessage, setValidationMessage] = useState('');

  function handleSubmit() {
    const trimmed = inputValue.trim();
    if (!trimmed) {
      setValidationMessage('Please enter a city name.');
      return;
    }
    setValidationMessage('');
    onSearch(trimmed);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInputValue(e.target.value);
    if (validationMessage) {
      setValidationMessage('');
    }
  }

  return (
    <div className="flex flex-col w-full gap-2 xs:flex-row xs:items-center">
      <div className="flex flex-col w-full xs:flex-1">
        <input
          type="text"
          maxLength={255}
          placeholder="Search city..."
          value={inputValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          aria-label="City name"
          aria-describedby={validationMessage ? 'search-validation' : undefined}
          className="min-h-[44px] min-w-[44px] w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        />
        {validationMessage && (
          <p
            id="search-validation"
            role="alert"
            className="mt-1 text-sm text-red-600"
          >
            {validationMessage}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isLoading}
        className="min-h-[44px] min-w-[44px] w-full xs:w-auto rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
      >
        Search
      </button>

      <button
        type="button"
        onClick={onGeolocate}
        disabled={isLoading}
        className="min-h-[44px] min-w-[44px] w-full xs:w-auto rounded border border-blue-600 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
      >
        Use My Location
      </button>
    </div>
  );
}
