import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StatsManager } from '../../src/managers/StatsManager';
import { EventBus } from '../../src/systems/EventBus';

describe('StatsManager listener lifecycle', () => {
  beforeEach(() => {
    (StatsManager as any).instance = null;
    EventBus.getInstance().reset();

    const store: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(),
      get length() {
        return Object.keys(store).length;
      },
      key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
    });
  });

  it('registers listeners and tracks damage after init', () => {
    StatsManager.init();

    EventBus.getInstance().emit('unit:damage', {
      sourceId: 'h1',
      targetId: 'e1',
      amount: 100,
      damageType: 'physical',
      isCrit: false,
    });

    expect(StatsManager.getRunStats().totalDamage).toBe(100);
  });

  it('re-registers listeners after EventBus.reset', () => {
    StatsManager.init();

    EventBus.getInstance().reset();
    StatsManager.reinitForNewRun();

    EventBus.getInstance().emit('unit:damage', {
      sourceId: 'h1',
      targetId: 'e1',
      amount: 50,
      damageType: 'physical',
      isCrit: false,
    });

    expect(StatsManager.getRunStats().totalDamage).toBeGreaterThan(0);
  });

  it('teardown stops tracking events', () => {
    StatsManager.init();
    StatsManager.teardown();

    EventBus.getInstance().emit('unit:damage', {
      sourceId: 'h1',
      targetId: 'e1',
      amount: 100,
      damageType: 'physical',
      isCrit: false,
    });

    expect(StatsManager.getRunStats().totalDamage).toBe(0);
  });

  it('double init does not stack listeners', () => {
    StatsManager.init();
    StatsManager.init();

    EventBus.getInstance().emit('unit:damage', {
      sourceId: 'h1',
      targetId: 'e1',
      amount: 100,
      damageType: 'physical',
      isCrit: false,
    });

    expect(StatsManager.getRunStats().totalDamage).toBe(100);
  });
});
