'use client';
import { useState, useRef } from 'react';
import type { WeatherPayload, ForecastPayload } from '@/lib/types';
import { getCoordinates } from '@/lib/geolocation';

interface WeatherState {
  weatherPayload: WeatherPayload | null;
  forecastPayload: ForecastPayload | null;
  isLoading: boolean;
  forecastUnavailable: boolean;
  error: string | null;
  lastQuery: string | null;
}

export function useWeather() {
  const [state, setState] = useState<WeatherState>({
    weatherPayload: null,
    forecastPayload: null,
    isLoading: false,
    forecastUnavailable: false,
    error: null,
    lastQuery: null,
  });

  const isRequestInFlight = useRef(false);

  function getErrorMessage(status: number): string {
    switch (status) {
      case 404:
        return 'City not found. Try the official city name (e.g. "Bengaluru" instead of "Bangalore").';
      case 502:
      case 503:
        return 'Weather service is currently unavailable. Try again later.';
      case 504:
        return 'The request timed out. Please try again.';
      case 500:
        return 'Server configuration error. Please contact support.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  async function fetchForecast(query: string) {
    try {
      const res = await fetch(`/api/forecast?${query}`);
      if (!res.ok) {
        setState(prev => ({ ...prev, forecastUnavailable: true }));
        return;
      }
      const data: ForecastPayload = await res.json();
      setState(prev => ({ ...prev, forecastPayload: data, forecastUnavailable: false }));
    } catch {
      setState(prev => ({ ...prev, forecastUnavailable: true }));
    }
  }

  async function fetchWeather(query: string, queryKey: string) {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    isRequestInFlight.current = true;

    try {
      const res = await fetch(`/api/weather?${query}`);
      if (!res.ok) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: getErrorMessage(res.status),
          weatherPayload: null,
          forecastPayload: null,
        }));
        return;
      }
      const data: WeatherPayload = await res.json();
      setState(prev => ({
        ...prev,
        isLoading: false,
        weatherPayload: data,
        forecastPayload: null,
        forecastUnavailable: false,
        error: null,
        lastQuery: queryKey,
      }));
      // Fire-and-forget forecast fetch
      fetchForecast(query);
    } catch {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Weather service is currently unavailable. Try again later.',
        weatherPayload: null,
      }));
    } finally {
      isRequestInFlight.current = false;
    }
  }

  async function search(city: string) {
    if (isRequestInFlight.current) return;
    const normalized = city.trim().toLowerCase();
    if (!normalized) return;
    if (normalized === state.lastQuery) return;
    await fetchWeather(`city=${encodeURIComponent(city.trim())}`, normalized);
  }

  async function geolocate() {
    if (isRequestInFlight.current) return;
    isRequestInFlight.current = true;
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await getCoordinates();

      if (!result.ok) {
        const message =
          result.code === 'PERMISSION_DENIED'
            ? 'Location access denied. Please search by city name.'
            : 'Unable to retrieve your location. Please search by city name.';
        setState(prev => ({ ...prev, isLoading: false, error: message }));
        isRequestInFlight.current = false;
        return;
      }

      await fetchWeather(`lat=${result.lat}&lon=${result.lon}`, `${result.lat},${result.lon}`);
    } catch {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Unable to retrieve your location. Please search by city name.',
      }));
      isRequestInFlight.current = false;
    }
  }

  function dismissError() {
    setState(prev => ({ ...prev, error: null }));
  }

  return { state, search, geolocate, dismissError };
}
