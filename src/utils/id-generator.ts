let _nextId = 0;

export function nextEffectId(prefix: string): string {
  return `${prefix}_${_nextId++}`;
}

/** Reset counter (for testing) */
export function resetIdCounter(): void {
  _nextId = 0;
}
