export type GeolocationResult =
  | { ok: true; lat: number; lon: number }
  | { ok: false; code: 'PERMISSION_DENIED' | 'UNAVAILABLE' };

/**
 * Wraps `navigator.geolocation.getCurrentPosition` in a Promise.
 *
 * Maps GeolocationPositionError codes:
 *   1 (PERMISSION_DENIED)   → 'PERMISSION_DENIED'
 *   2 (POSITION_UNAVAILABLE) → 'UNAVAILABLE'
 *   3 (TIMEOUT)              → 'UNAVAILABLE'
 */
export function getCoordinates(): Promise<GeolocationResult> {
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          ok: true,
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
      },
      (error) => {
        if (error.code === 1) {
          resolve({ ok: false, code: 'PERMISSION_DENIED' });
        } else {
          // codes 2 (POSITION_UNAVAILABLE) and 3 (TIMEOUT)
          resolve({ ok: false, code: 'UNAVAILABLE' });
        }
      }
    );
  });
}
