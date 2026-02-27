import { describe, it, expect, beforeEach } from 'vitest';
import { DamageSystem } from '../../src/systems/DamageSystem';
import { SeededRNG } from '../../src/utils/rng';
import { EventBus } from '../../src/systems/EventBus';
import { ELEMENT_ADVANTAGE_MULTIPLIER } from '../../src/config/elements';
import { createMockUnit } from '../mocks/phaser';

describe('DamageSystem', () => {
  let ds: DamageSystem;
  let rng: SeededRNG;

  beforeEach(() => {
    EventBus.getInstance().reset();
    rng = new SeededRNG(12345);
    ds = new DamageSystem(rng);
  });

  describe('calculateDamage', () => {
    it('applies defense reduction correctly', () => {
      const attacker = createMockUnit({
        stats: { attack: 50, critChance: 0, critDamage: 1.5, defense: 0, magicResist: 0 },
      });
      const target = createMockUnit({
        stats: { defense: 100, maxHp: 1000, hp: 1000, magicResist: 0 },
      });

      // With defense 100: damage * (100 / (100 + 100)) = damage * 0.5
      const result = ds.calculateDamage(
        attacker as any, target as any, 100, 'physical', false,
      );

      // base 100, defense reduction to 50, then variance +-10%
      expect(result.finalDamage).toBeGreaterThanOrEqual(40);
      expect(result.finalDamage).toBeLessThanOrEqual(60);
    });

    it('deals full damage with 0 defense', () => {
      const attacker = createMockUnit({
        stats: { attack: 50, critChance: 0, critDamage: 1.5 },
      });
      const target = createMockUnit({
        stats: { defense: 0, maxHp: 1000, hp: 1000 },
      });

      const result = ds.calculateDamage(
        attacker as any, target as any, 100, 'physical', false,
      );
      // base 100, defense 0: 100 * (100/100) = 100, then variance
      expect(result.finalDamage).toBeGreaterThanOrEqual(85);
      expect(result.finalDamage).toBeLessThanOrEqual(115);
    });

    it('pure damage ignores defense', () => {
      const attacker = createMockUnit({
        stats: { attack: 50, critChance: 0, critDamage: 1.5 },
      });
      const target = createMockUnit({
        stats: { defense: 999, maxHp: 1000, hp: 1000 },
      });

      const result = ds.calculateDamage(
        attacker as any, target as any, 100, 'pure', false,
      );
      // Pure damage ignores defense, only variance applies
      expect(result.finalDamage).toBeGreaterThanOrEqual(85);
      expect(result.finalDamage).toBeLessThanOrEqual(115);
    });

    it('applies crit multiplier when forceCrit is true', () => {
      const attacker = createMockUnit({
        stats: { attack: 50, critChance: 0, critDamage: 2.0 },
      });
      const target = createMockUnit({
        stats: { defense: 0, maxHp: 1000, hp: 1000 },
      });

      const result = ds.calculateDamage(
        attacker as any, target as any, 100, 'physical', true,
      );
      expect(result.isCrit).toBe(true);
      // base 100, no defense, crit 2.0x = 200, then variance +-10%
      expect(result.finalDamage).toBeGreaterThanOrEqual(170);
      expect(result.finalDamage).toBeLessThanOrEqual(230);
    });

    it('variance stays within +-10% range over many iterations', () => {
      const attacker = createMockUnit({
        stats: { attack: 50, critChance: 0, critDamage: 1.5 },
      });
      const target = createMockUnit({
        stats: { defense: 0, maxHp: 10000, hp: 10000 },
      });

      const results: number[] = [];
      for (let i = 0; i < 100; i++) {
        const r = ds.calculateDamage(
          attacker as any, target as any, 1000, 'physical', false,
        );
        results.push(r.finalDamage);
      }

      // All values should be in 900-1100 range (1000 +/- 10%)
      const min = Math.min(...results);
      const max = Math.max(...results);
      expect(min).toBeGreaterThanOrEqual(890); // slight tolerance for rounding
      expect(max).toBeLessThanOrEqual(1110);
    });

    it('magical damage uses magicResist for defense', () => {
      const attacker = createMockUnit({
        stats: { attack: 50, magicPower: 50, critChance: 0, critDamage: 1.5 },
      });
      const target = createMockUnit({
        stats: { defense: 0, magicResist: 100, maxHp: 1000, hp: 1000 },
      });

      const result = ds.calculateDamage(
        attacker as any, target as any, 100, 'magical', false,
      );
      // magicResist 100: 100 * (100/(100+100)) = 50, then variance
      expect(result.finalDamage).toBeGreaterThanOrEqual(40);
      expect(result.finalDamage).toBeLessThanOrEqual(60);
    });

    it('minimum damage is 1', () => {
      const attacker = createMockUnit({
        stats: { attack: 1, critChance: 0, critDamage: 1.0 },
      });
      const target = createMockUnit({
        stats: { defense: 99999, maxHp: 1000, hp: 1000 },
      });

      const result = ds.calculateDamage(
        attacker as any, target as any, 1, 'physical', false,
      );
      expect(result.finalDamage).toBeGreaterThanOrEqual(1);
    });

    it('element advantage multiplier is applied to damage', () => {
      // fire vs ice should get element advantage bonus
      const attacker = createMockUnit({
        element: 'fire',
        stats: { attack: 50, critChance: 0, critDamage: 1.5 },
      });
      const target = createMockUnit({
        element: 'ice',
        stats: { defense: 0, maxHp: 1000, hp: 1000 },
      });

      const results: number[] = [];
      for (let i = 0; i < 50; i++) {
        const r = ds.calculateDamage(
          attacker as any, target as any, 100, 'physical', false,
        );
        results.push(r.finalDamage);
      }

      const avg = results.reduce((s, v) => s + v, 0) / results.length;
      // Should average around 100 * ELEMENT_ADVANTAGE_MULTIPLIER
      const expected = 100 * ELEMENT_ADVANTAGE_MULTIPLIER;
      expect(avg).toBeGreaterThan(expected * 0.85);
      expect(avg).toBeLessThan(expected * 1.15);
    });
  });
});
