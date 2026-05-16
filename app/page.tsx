'use client';

import { useMemo, useEffect } from 'react';
import { useWeather } from '@/hooks/useWeather';
import { getTemperatureBackground, getBackground } from '@/lib/weatherUtils';
import debounce from '@/lib/debounce';
import SearchBar from '@/components/SearchBar';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorMessage from '@/components/ErrorMessage';
import WeatherCard from '@/components/WeatherCard';
import ForecastPanel from '@/components/ForecastPanel';

export default function Home() {
  const { state, search, geolocate, dismissError } = useWeather();

  // Create a debounced version of search, cancel on unmount
  const debouncedSearch = useMemo(() => debounce(search, 500), [search]);
  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  const temp = state.weatherPayload?.temperature ?? 15;
  const condition = state.weatherPayload?.condition ?? '';

  return (
    <div
      className={`relative min-h-screen overflow-hidden w-full transition-all duration-700 ${getTemperatureBackground(temp)}`}
    >
      {/* Condition gradient overlay at 30% opacity */}
      <div
        className={`absolute inset-0 opacity-30 ${getBackground(condition)}`}
      />

      {/* Main content above gradient layers */}
      <div className="relative z-10 flex flex-col items-center gap-6 px-4 py-8 md:px-8 xl:px-16">
        <h1 className="text-3xl font-bold text-white drop-shadow">
          Real-Time Weather Forecast
        </h1>

        <SearchBar
          onSearch={debouncedSearch}
          onGeolocate={geolocate}
          isLoading={state.isLoading}
        />

        {state.isLoading && <LoadingSpinner label="Fetching weather data..." />}

        {state.error && (
          <ErrorMessage message={state.error} onDismiss={dismissError} />
        )}

        {state.weatherPayload && (
          <WeatherCard payload={state.weatherPayload} />
        )}

        {state.forecastPayload && (
          <ForecastPanel payload={state.forecastPayload} />
        )}

        {state.forecastUnavailable && !state.forecastPayload && (
          <p className="text-white/80 text-sm text-center">
            Forecast data is currently unavailable.
          </p>
        )}
      </div>
    </div>
  );
}
