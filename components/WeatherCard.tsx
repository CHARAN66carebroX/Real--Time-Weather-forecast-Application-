'use client';

import { useState } from 'react';
import { WeatherPayload } from '@/lib/types';
import AnimatedIcon from '@/components/AnimatedIcon';

interface WeatherCardProps {
  payload: WeatherPayload;
}

/**
 * WeatherCard displays current weather data for a city using a glassmorphism
 * card design. It shows temperature, humidity, wind speed, condition label,
 * and an animated weather icon. The OWM icon image is also rendered with an
 * onError fallback to /placeholder-icon.svg.
 *
 * Requirements: 3.1, 3.2, 3.4, 3.5, 3.6, 7.7
 */
export default function WeatherCard({ payload }: WeatherCardProps) {
  const [iconSrc, setIconSrc] = useState(payload.icon);

  return (
    <div
      className="
        backdrop-blur-md bg-white/15 border border-white/25 shadow-2xl rounded-2xl
        w-full max-w-md mx-auto p-4 xs:p-6
        text-white
      "
    >
      {/* City name */}
      <h2 className="text-2xl font-semibold mb-1 text-center">{payload.city}</h2>

      {/* Condition label */}
      <p className="text-center text-white/80 mb-4">{payload.condition}</p>

      {/* Icon row */}
      <div className="flex justify-center mb-4">
        <AnimatedIcon condition={payload.condition} size={80} aria-label={payload.condition} />
      </div>

      {/* OWM icon with onError fallback */}
      <div className="flex justify-center mb-4">
        <img
          src={iconSrc}
          alt={payload.condition}
          width={50}
          height={50}
          onError={() => setIconSrc('/placeholder-icon.svg')}
        />
      </div>

      {/* Temperature */}
      <p className="text-5xl xs:text-6xl font-bold text-center mb-4">
        {payload.temperature}°C
      </p>

      {/* Humidity and wind speed */}
      <div className="flex justify-around text-white/90 text-sm xs:text-base">
        <span>Humidity: {payload.humidity}%</span>
        <span>Wind: {payload.windSpeed} km/h</span>
      </div>
    </div>
  );
}
