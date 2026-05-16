'use client';

import { useState, useEffect } from 'react';
import Lottie from 'lottie-react';
import { getAnimationPath, getStaticIconPath } from '@/lib/weatherUtils';

interface AnimatedIconProps {
  condition: string;
  size?: number;
  className?: string;
}

/**
 * AnimatedIcon renders a Lottie animation for the given weather condition when
 * an animation asset is available, and falls back to a static SVG icon otherwise.
 *
 * The animation JSON is fetched at runtime from the public directory so that
 * lottie-react receives a parsed object (not a path string), which is required
 * by the library. If the fetch fails, or if no animation path exists for the
 * condition, the static fallback icon is shown instead.
 *
 * Requirements: 3.7, 3.8
 */
export default function AnimatedIcon({ condition, size = 80, className }: AnimatedIconProps) {
  const [animationData, setAnimationData] = useState<object | null>(null);
  const [error, setError] = useState(false);

  const path = getAnimationPath(condition);

  useEffect(() => {
    // Reset state whenever the condition (and therefore path) changes.
    setAnimationData(null);
    setError(false);

    if (!path) return;

    let cancelled = false;

    fetch(path)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to fetch animation: ${r.status}`);
        return r.json();
      })
      .then((data: object) => {
        if (!cancelled) setAnimationData(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [path]);

  if (path && animationData && !error) {
    return (
      <div
        aria-label={condition}
        className={className}
        style={{ width: size, height: size }}
      >
        <Lottie animationData={animationData} loop autoplay />
      </div>
    );
  }

  return (
    <img
      src={getStaticIconPath(condition)}
      alt={condition}
      aria-label={condition}
      width={size}
      height={size}
      className={className}
    />
  );
}
