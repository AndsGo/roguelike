import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock DamageNumber before importing DamageAccumulator
vi.mock('../../src/components/DamageNumber', () => {
  return {
    DamageNumber: vi.fn(),
  };
});

import { DamageAccumulator } from '../../src/systems/DamageAccumulator';
import { DamageNumber } from '../../src/components/DamageNumber';

const MockDamageNumber = DamageNumber as unknown as ReturnType<typeof vi.fn>;

function createMockScene(): any {
  return {
    add: { existing: vi.fn(), text: vi.fn(() => ({ setOrigin: vi.fn().mockReturnThis(), setDepth: vi.fn().mockReturnThis() })) },
    tweens: { add: vi.fn(() => ({ on: vi.fn() })) },
  };
}

describe('DamageAccumulator', () => {
  let acc: DamageAccumulator;
  let scene: any;

  beforeEach(() => {
    acc = new DamageAccumulator();
    scene = createMockScene();
    MockDamageNumber.mockClear();
  });

  describe('accumulation', () => {
    it('does not flush before timer expires', () => {
      acc.addDamage('unit1', scene, 100, 200, 25);
      acc.addDamage('unit1', scene, 100, 200, 30);
      acc.update(100); // only 100ms, window is 150ms
      expect(MockDamageNumber).not.toHaveBeenCalled();
    });

    it('flushes merged total after timer expires', () => {
      acc.addDamage('unit1', scene, 100, 200, 25);
      acc.addDamage('unit1', scene, 100, 200, 30);
      acc.update(160); // past 150ms window
      expect(MockDamageNumber).toHaveBeenCalledTimes(1);
      // amount = 25 + 30 = 55
      expect(MockDamageNumber).toHaveBeenCalledWith(
        scene, 100, expect.any(Number), 55, false, false, undefined, undefined,
      );
    });

    it('accumulates multiple hits into one number', () => {
      acc.addDamage('unit1', scene, 100, 200, 10);
      acc.addDamage('unit1', scene, 100, 200, 20);
      acc.addDamage('unit1', scene, 100, 200, 30);
      acc.update(200);
      expect(MockDamageNumber).toHaveBeenCalledTimes(1);
      expect(MockDamageNumber.mock.calls[0][3]).toBe(60); // total amount
    });
  });

  describe('crit propagation', () => {
    it('marks merged number as crit if any hit was crit', () => {
      acc.addDamage('unit1', scene, 100, 200, 10);
      acc.addDamage('unit1', scene, 100, 200, 40, { isCrit: true });
      acc.addDamage('unit1', scene, 100, 200, 5);
      acc.update(200);
      expect(MockDamageNumber).toHaveBeenCalledTimes(1);
      // args: scene, x, y, amount, isHeal, isCrit, element, comboCount
      const call = MockDamageNumber.mock.calls[0];
      expect(call[3]).toBe(55); // total
      expect(call[4]).toBe(false); // isHeal
      expect(call[5]).toBe(true); // isCrit
    });
  });

  describe('heal vs damage separation', () => {
    it('creates separate DamageNumbers for heal and damage on same target', () => {
      acc.addDamage('unit1', scene, 100, 200, 30);
      acc.addHeal('unit1', scene, 100, 200, 20);
      acc.update(200);
      expect(MockDamageNumber).toHaveBeenCalledTimes(2);

      const calls = MockDamageNumber.mock.calls;
      // One should be damage (isHeal=false), one heal (isHeal=true)
      const damageCall = calls.find((c: any) => c[4] === false);
      const healCall = calls.find((c: any) => c[4] === true);
      expect(damageCall).toBeDefined();
      expect(healCall).toBeDefined();
      expect(damageCall![3]).toBe(30);
      expect(healCall![3]).toBe(20);
    });
  });

  describe('element and combo', () => {
    it('keeps first element seen and highest comboCount', () => {
      acc.addDamage('unit1', scene, 100, 200, 10, { element: 'fire', comboCount: 1 });
      acc.addDamage('unit1', scene, 100, 200, 20, { element: 'ice', comboCount: 3 });
      acc.addDamage('unit1', scene, 100, 200, 5, { comboCount: 2 });
      acc.update(200);
      const call = MockDamageNumber.mock.calls[0];
      expect(call[6]).toBe('fire'); // first element
      expect(call[7]).toBe(3); // highest comboCount
    });
  });

  describe('independent targets', () => {
    it('flushes different targets independently', () => {
      acc.addDamage('unit1', scene, 100, 200, 10);
      acc.update(50);
      acc.addDamage('unit2', scene, 300, 200, 20);
      acc.update(110); // unit1 at 160ms total, unit2 at 110ms
      // unit1 should flush, unit2 should not
      expect(MockDamageNumber).toHaveBeenCalledTimes(1);
      expect(MockDamageNumber.mock.calls[0][3]).toBe(10);

      acc.update(50); // unit2 now at 160ms
      expect(MockDamageNumber).toHaveBeenCalledTimes(2);
      expect(MockDamageNumber.mock.calls[1][3]).toBe(20);
    });
  });

  describe('reset', () => {
    it('clears all pending entries', () => {
      acc.addDamage('unit1', scene, 100, 200, 50);
      acc.reset();
      acc.update(200);
      expect(MockDamageNumber).not.toHaveBeenCalled();
    });
  });

  describe('vertical spacing', () => {
    it('offsets subsequent damage numbers upward', () => {
      // First batch
      acc.addDamage('unit1', scene, 100, 200, 10);
      acc.update(200);
      const y1 = MockDamageNumber.mock.calls[0][2];

      // Second batch (within 800ms active window)
      acc.addDamage('unit1', scene, 100, 200, 20);
      acc.update(200);
      const y2 = MockDamageNumber.mock.calls[1][2];

      // y2 should be higher (more negative) than y1 by 18px
      expect(y2).toBe(y1 - 18);
    });
  });
});
