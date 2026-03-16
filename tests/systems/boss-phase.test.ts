import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BossPhaseSystem } from '../../src/systems/BossPhaseSystem';
import { EventBus } from '../../src/systems/EventBus';
import { MAX_ENEMIES } from '../../src/config/balance';

// Minimal Enemy mock
function makeBossUnit(maxHp: number) {
  return {
    unitId: 'boss_1',
    currentHp: maxHp,
    baseStats: { maxHp },
  } as any;
}

const PHASE_CONFIG = {
  bossId: 'heart_of_the_forge',
  phases: [
    { hpPercent: 0.75, spawns: ['flame_construct', 'frost_sentinel'], bossEffect: { type: 'shield' as const, value: 2000 } },
    { hpPercent: 0.50, spawns: ['lightning_strider', 'holy_smith'], bossEffect: { type: 'enrage' as const, value: 30 } },
    { hpPercent: 0.25, spawns: ['void_weaver', 'flame_construct'], bossEffect: { type: 'damage_reduction' as const, value: 20 } },
  ],
};

describe('BossPhaseSystem', () => {
  let bus: EventBus;
  let boss: ReturnType<typeof makeBossUnit>;

  beforeEach(() => {
    bus = EventBus.getInstance();
    bus.reset();
    boss = makeBossUnit(5000);
  });

  it('emits boss:phase when HP crosses threshold', () => {
    const system = new BossPhaseSystem(boss, PHASE_CONFIG);
    const handler = vi.fn();
    bus.on('boss:phase', handler);

    // Simulate damage: boss at 70% HP
    boss.currentHp = 3500;
    bus.emit('unit:damage', { sourceId: 'hero_1', targetId: 'boss_1', amount: 1500, damageType: 'physical', isCrit: false });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({
      bossId: 'heart_of_the_forge',
      phaseIndex: 0,
      spawns: ['flame_construct', 'frost_sentinel'],
    }));

    system.deactivate();
  });

  it('fires each phase only once', () => {
    const system = new BossPhaseSystem(boss, PHASE_CONFIG);
    const handler = vi.fn();
    bus.on('boss:phase', handler);

    // First damage: 75% threshold
    boss.currentHp = 3500;
    bus.emit('unit:damage', { sourceId: 'hero_1', targetId: 'boss_1', amount: 1500, damageType: 'physical', isCrit: false });
    expect(handler).toHaveBeenCalledTimes(1);

    // Second damage still above 50%: no new phase
    boss.currentHp = 3000;
    bus.emit('unit:damage', { sourceId: 'hero_1', targetId: 'boss_1', amount: 500, damageType: 'physical', isCrit: false });
    expect(handler).toHaveBeenCalledTimes(1);

    system.deactivate();
  });

  it('fires multiple phases if HP drops past several thresholds at once', () => {
    const system = new BossPhaseSystem(boss, PHASE_CONFIG);
    const handler = vi.fn();
    bus.on('boss:phase', handler);

    // Massive damage: boss at 20% (crosses all 3 thresholds)
    boss.currentHp = 1000;
    bus.emit('unit:damage', { sourceId: 'hero_1', targetId: 'boss_1', amount: 4000, damageType: 'physical', isCrit: false });

    expect(handler).toHaveBeenCalledTimes(3);
    system.deactivate();
  });

  it('ignores damage to non-boss units', () => {
    const system = new BossPhaseSystem(boss, PHASE_CONFIG);
    const handler = vi.fn();
    bus.on('boss:phase', handler);

    bus.emit('unit:damage', { sourceId: 'hero_1', targetId: 'other_unit', amount: 9999, damageType: 'physical', isCrit: false });
    expect(handler).not.toHaveBeenCalled();

    system.deactivate();
  });

  it('MAX_ENEMIES constant is defined and reasonable', () => {
    expect(MAX_ENEMIES).toBe(10);
    // heart_of_the_forge spawns max 6 adds + boss + 1-2 initial = 8-9, under cap
    expect(MAX_ENEMIES).toBeGreaterThanOrEqual(9);
  });

  it('deactivate removes listener', () => {
    const system = new BossPhaseSystem(boss, PHASE_CONFIG);
    system.deactivate();

    const handler = vi.fn();
    bus.on('boss:phase', handler);

    boss.currentHp = 1000;
    bus.emit('unit:damage', { sourceId: 'hero_1', targetId: 'boss_1', amount: 4000, damageType: 'physical', isCrit: false });
    expect(handler).not.toHaveBeenCalled();
  });
});
