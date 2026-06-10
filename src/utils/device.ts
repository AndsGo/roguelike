/**
 * Touch-device detection for mobile adaptation.
 *
 * "Touch device" here means touch is the PRIMARY input (phones/tablets),
 * not merely available (touchscreen laptops keep mouse behavior).
 * Detection runs once and is cached; tests run in Node where `window`
 * is absent, so every check is guarded.
 */
let cached: boolean | null = null;

export function isTouchDevice(): boolean {
  if (cached !== null) return cached;
  if (typeof window === 'undefined') {
    cached = false;
    return cached;
  }
  const coarse = typeof window.matchMedia === 'function'
    && window.matchMedia('(pointer: coarse)').matches;
  const hasTouch = 'ontouchstart' in window
    || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0);
  cached = coarse || (hasTouch && typeof window.matchMedia === 'function'
    && !window.matchMedia('(pointer: fine)').matches);
  return cached;
}

/** Test-only escape hatch to force a detection result. */
export function __setTouchDeviceForTest(value: boolean | null): void {
  cached = value;
}

/**
 * Pointer-tap tolerance in game pixels: how far a pointer may travel
 * between down and up while still counting as a tap (not a drag).
 * Fingers wobble far more than a mouse, so touch gets a wider budget.
 */
export function tapTolerance(): number {
  return isTouchDevice() ? 35 : 20;
}
