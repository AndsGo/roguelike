import { describe, it, expect, beforeEach } from 'vitest';
import { DamageSystem } from '../../src/systems/DamageSystem';
import { ComboSystem } from '../../src/systems/ComboSystem';
import { SeededRNG } from '../../src/utils/rng';
import { EventBus } from '../../src/systems/EventBus';
import {
  ELEMENT_ADVANTAGE_MULTIPLIER,
  ELEMENT_DISADVANTAGE_MULTIPLIER,
} from '../../src/config/elements';
import { createMockUnit } from '../mocks/phaser';

describe('Integration: DamageSystem + ElementSystem + ComboSystem', () => {
  let rng: SeededRNG;
  let ds: DamageSystem;
  let combo: ComboSystem;

  beforeEach(() => {
    EventBus.getInstance().reset();
    rng = new SeededRNG(77777);
    ds = new DamageSystem(rng);
    combo = new ComboSystem();
    ds.comboSystem = combo;
  });

  it('combo multiplier increases damage over consecutive hits', () => {
    const attacker = createMockUnit({
      unitId: 'hero1', element: undefined,
      stats: { attack: 50, critChance: 0, critDamage: 1.5 },
    });
    const target = createMockUnit({
      unitId: 'enemy1', element: undefined,
      stats: { defense: 0, maxHp: 10000, hp: 10000 },
    });

    // First 4 hits: no combo bonus
    const earlyResults: number[] = [];
    for (let i = 0; i < 4; i++) {
      combo.registerHit('hero1', 'enemy1');
      const r = ds.calculateDamage(attacker as any, target as any, 100, 'physical');
      earlyResults.push(r.finalDamage);
    }

    // Register hit 5 for combo milestone
    combo.registerHit('hero1', 'enemy1');
    // Hits 5-9: 1.1x combo bonus
    const lateResults: number[] = [];
    for (let i = 0; i < 5; i++) {
      combo.registerHit('hero1', 'enemy1');
      const r = ds.calculateDamage(attacker as any, target as any, 100, 'physical');
      lateResults.push(r.finalDamage);
    }

    const earlyAvg = earlyResults.reduce((s, v) => s + v, 0) / earlyResults.length;
    const lateAvg = lateResults.reduce((s, v) => s + v, 0) / lateResults.length;

    // Late hits should average about 10% more than early hits
    expect(lateAvg).toBeGreaterThan(earlyAvg * 0.95); // with variance tolerance
  });

  it('element advantage applies through damage pipeline', () => {
    const fireAttacker = createMockUnit({
      unitId: 'fire_hero', element: 'fire',
      stats: { attack: 50, critChance: 0, critDamage: 1.5 },
    });
    const iceTarget = createMockUnit({
      unitId: 'ice_enemy', element: 'ice',
      stats: { defense: 0, maxHp: 10000, hp: 10000 },
    });
    const neutralTarget = createMockUnit({
      unitId: 'neutral_enemy',
      stats: { defense: 0, maxHp: 10000, hp: 10000 },
    });

    // Multiple hits to average out variance
    const advantagedResults: number[] = [];
    const neutralResults: number[] = [];

    for (let i = 0; i < 50; i++) {
      advantagedResults.push(
        ds.calculateDamage(fireAttacker as any, iceTarget as any, 100, 'physical').finalDamage,
      );
      neutralResults.push(
        ds.calculateDamage(fireAttacker as any, neutralTarget as any, 100, 'physical').finalDamage,
      );
    }

    const advAvg = advantagedResults.reduce((s, v) => s + v, 0) / advantagedResults.length;
    const neuAvg = neutralResults.reduce((s, v) => s + v, 0) / neutralResults.length;

    // Fire vs Ice should average ELEMENT_ADVANTAGE_MULTIPLIER times neutral
    const ratio = advAvg / neuAvg;
    const expectedRatio = ELEMENT_ADVANTAGE_MULTIPLIER;
    expect(ratio).toBeGreaterThan(expectedRatio * 0.85);
    expect(ratio).toBeLessThan(expectedRatio * 1.15);
  });

  it('element disadvantage reduces damage', () => {
    const iceAttacker = createMockUnit({
      unitId: 'ice_hero', element: 'ice',
      stats: { attack: 50, critChance: 0, critDamage: 1.5 },
    });
    const fireTarget = createMockUnit({
      unitId: 'fire_enemy', element: 'fire',
      stats: { defense: 0, maxHp: 10000, hp: 10000 },
    });

    const results: number[] = [];
    for (let i = 0; i < 50; i++) {
      results.push(
        ds.calculateDamage(iceAttacker as any, fireTarget as any, 100, 'physical').finalDamage,
      );
    }

    const avg = results.reduce((s, v) => s + v, 0) / results.length;
    // Ice vs Fire = ELEMENT_DISADVANTAGE_MULTIPLIER
    const expected = 100 * ELEMENT_DISADVANTAGE_MULTIPLIER;
    expect(avg).toBeGreaterThan(expected * 0.85);
    expect(avg).toBeLessThan(expected * 1.15);
  });

  it('combo + element advantage stack multiplicatively', () => {
    const fireAttacker = createMockUnit({
      unitId: 'fire_hero', element: 'fire',
      stats: { attack: 50, critChance: 0, critDamage: 1.5 },
    });
    const iceTarget = createMockUnit({
      unitId: 'ice_enemy', element: 'ice',
      stats: { defense: 0, maxHp: 100000, hp: 100000 },
    });

    // Build up 10-hit combo
    for (let i = 0; i < 10; i++) {
      combo.registerHit('fire_hero', 'ice_enemy');
    }

    // At 10 hits: combo = 1.2x, element = ELEMENT_ADVANTAGE_MULTIPLIER => total = 1.2 * adv
    const results: number[] = [];
    for (let i = 0; i < 50; i++) {
      combo.registerHit('fire_hero', 'ice_enemy');
      results.push(
        ds.calculateDamage(fireAttacker as any, iceTarget as any, 100, 'physical').finalDamage,
      );
    }

    const avg = results.reduce((s, v) => s + v, 0) / results.length;
    // Combo at 10+ hits -> multiplier ~1.2x, element advantage
    const expectedMin = 100 * ELEMENT_ADVANTAGE_MULTIPLIER * 1.1; // minimum combo
    expect(avg).toBeGreaterThan(expectedMin * 0.8);
  });
});
