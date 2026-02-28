/**
 * Mock Phaser objects for Node.js testing environment.
 * Provides minimal stubs so systems can be instantiated without a real Phaser runtime.
 */

import { vi } from 'vitest';

export class MockText {
  x = 0;
  y = 0;
  text = '';
  setOrigin() { return this; }
  setText(t: string) { this.text = t; return this; }
  setStyle() { return this; }
  setColor() { return this; }
  setFontSize() { return this; }
  destroy() {}
}

export class MockRectangle {
  x = 0;
  y = 0;
  width = 0;
  height = 0;
  fillColor = 0;
  setFillStyle(color: number) { this.fillColor = color; return this; }
  setOrigin() { return this; }
  destroy() {}
}

export class MockGraphics {
  fillStyle() { return this; }
  fillRect() { return this; }
  clear() { return this; }
  destroy() {}
}

export class MockTween {
  targets: unknown[] = [];
}

export class MockScene {
  add = {
    rectangle: (x: number, y: number, w: number, h: number, color: number) => {
      const r = new MockRectangle();
      r.x = x; r.y = y; r.width = w; r.height = h; r.fillColor = color;
      return r;
    },
    text: (_x: number, _y: number, _text: string, _style?: object) => {
      const t = new MockText();
      return t;
    },
    graphics: () => new MockGraphics(),
    existing: (obj: unknown) => obj,
  };

  tweens = {
    add: (config: Record<string, unknown>) => {
      // Immediately call onComplete if provided
      if (typeof config.onComplete === 'function') {
        (config.onComplete as () => void)();
      }
      return new MockTween();
    },
  };

  cameras = {
    main: {
      width: 800,
      height: 450,
      scrollX: 0,
      scrollY: 0,
      shake: vi.fn(),
      flash: vi.fn(),
    },
  };

  time = {
    delayedCall: (delay: number, callback: () => void) => {
      // Immediately invoke for testing
      callback();
      return { remove: vi.fn() };
    },
    now: Date.now(),
  };

  physics = {
    add: {
      existing: (obj: unknown) => obj,
    },
  };

  events = {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  };

  scene = {
    start: vi.fn(),
    launch: vi.fn(),
    stop: vi.fn(),
  };
}

/**
 * Create a mock Unit-like object for testing targeting and damage systems.
 */
export function createMockUnit(overrides: {
  unitId?: string;
  unitName?: string;
  role?: string;
  isHero?: boolean;
  element?: string;
  currentHp?: number;
  maxHp?: number;
  stats?: Record<string, number>;
  statusEffects?: unknown[];
  x?: number;
  y?: number;
} = {}) {
  const baseStats = {
    maxHp: overrides.maxHp ?? overrides.stats?.maxHp ?? 500,
    hp: overrides.currentHp ?? overrides.stats?.hp ?? 500,
    attack: overrides.stats?.attack ?? 50,
    defense: overrides.stats?.defense ?? 20,
    magicPower: overrides.stats?.magicPower ?? 0,
    magicResist: overrides.stats?.magicResist ?? 10,
    speed: overrides.stats?.speed ?? 100,
    attackSpeed: overrides.stats?.attackSpeed ?? 1.0,
    attackRange: overrides.stats?.attackRange ?? 100,
    critChance: overrides.stats?.critChance ?? 0.1,
    critDamage: overrides.stats?.critDamage ?? 1.5,
  };

  const unit = {
    unitId: overrides.unitId ?? 'unit_1',
    unitName: overrides.unitName ?? 'Test Unit',
    role: overrides.role ?? 'melee_dps',
    isHero: overrides.isHero ?? true,
    element: overrides.element as string | undefined,
    baseStats: { ...baseStats },
    currentStats: { ...baseStats },
    currentHp: overrides.currentHp ?? baseStats.hp,
    isAlive: true,
    statusEffects: (overrides.statusEffects ?? []) as Array<{
      id: string; type: string; name: string; duration: number;
      value: number; element?: string;
    }>,
    synergyBonuses: {} as Record<string, number>,
    x: overrides.x ?? 100,
    y: overrides.y ?? 300,
    target: null as unknown,
    tauntTarget: null as unknown,
    skills: [] as unknown[],
    skillCooldowns: new Map<string, number>(),
    scene: new MockScene(),
    sprite: new MockRectangle(),
    flashColor: vi.fn(),

    getEffectiveStats() {
      const stats = { ...this.currentStats };
      for (const effect of this.statusEffects) {
        if ((effect.type === 'buff' || effect.type === 'debuff') && effect.stat) {
          (stats as Record<string, number>)[(effect as { stat: string }).stat] += effect.value;
        }
      }
      for (const [key, value] of Object.entries(this.synergyBonuses)) {
        if (key in stats && typeof value === 'number') {
          (stats as Record<string, number>)[key] += value;
        }
      }
      return stats;
    },

    takeDamage(amount: number) {
      const actual = Math.max(0, Math.round(amount));
      this.currentHp = Math.max(0, this.currentHp - actual);
      if (this.currentHp <= 0) {
        this.isAlive = false;
      }
      return actual;
    },

    heal(amount: number) {
      if (!this.isAlive) return 0;
      const maxHp = this.currentStats.maxHp;
      const actual = Math.min(Math.round(amount), maxHp - this.currentHp);
      this.currentHp += actual;
      return actual;
    },

    distanceTo(other: { x: number; y: number }) {
      const dx = other.x - this.x;
      const dy = other.y - this.y;
      return Math.sqrt(dx * dx + dy * dy);
    },

    isStunned() {
      return this.statusEffects.some((e: { type: string }) => e.type === 'stun');
    },

    getTauntSource() {
      const taunt = this.statusEffects.find((e: { type: string }) => e.type === 'taunt');
      return taunt ? this.tauntTarget : null;
    },

    isInRange(other: { x: number; y: number }) {
      return this.distanceTo(other) <= this.getEffectiveStats().attackRange;
    },
  };

  return unit;
}

/**
 * Create a mock localStorage for Node.js testing.
 */
export function createMockLocalStorage(): Storage {
  const store: Record<string, string> = {};
  return {
    getItem(key: string) { return store[key] ?? null; },
    setItem(key: string, value: string) { store[key] = value; },
    removeItem(key: string) { delete store[key]; },
    clear() { Object.keys(store).forEach(k => delete store[k]); },
    get length() { return Object.keys(store).length; },
    key(index: number) { return Object.keys(store)[index] ?? null; },
  };
}
