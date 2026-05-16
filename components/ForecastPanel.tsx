'use client';

import { ForecastPayload } from '@/lib/types';
import AnimatedIcon from '@/components/AnimatedIcon';

interface ForecastPanelProps {
  payload: ForecastPayload;
}

/**
 * ForecastPanel renders a 5-day weather forecast.
 *
 * Mobile layout: horizontally scrollable with snap scrolling.
 * Desktop layout (md+): 5-column grid.
 *
 * Requirements: 6.4, 7.2, 7.3, 7.8
 */
export default function ForecastPanel({ payload }: ForecastPanelProps) {
  return (
    <div className="flex overflow-x-auto snap-x snap-mandatory md:grid md:grid-cols-5 gap-3 w-full">
      {payload.forecast.map((entry) => {
        // Use T12:00:00 to avoid timezone-related date shifts
        const dateObj = new Date(entry.date + 'T12:00:00');
        const formattedDate = dateObj.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: '2-digit',
        });

        return (
          <div
            key={entry.date}
            className="snap-start flex-shrink-0 w-40 md:w-auto backdrop-blur-sm bg-white/10 border border-white/20 rounded-xl p-3 flex flex-col items-center gap-2"
          >
            <p className="text-sm font-medium text-white/90 text-center">{formattedDate}</p>
            <AnimatedIcon condition={entry.condition} size={48} />
            <p className="text-lg font-semibold text-white">{entry.temperature}°C</p>
            <p className="text-xs text-white/70 text-center capitalize">{entry.condition}</p>
          </div>
        );
      })}
    </div>
  );
}
