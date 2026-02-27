import { describe, it, expect, beforeEach } from 'vitest';
import { ComboSystem } from '../../src/systems/ComboSystem';
import { EventBus } from '../../src/systems/EventBus';

describe('ComboSystem', () => {
  let combo: ComboSystem;

  beforeEach(() => {
    EventBus.getInstance().reset();
    combo = new ComboSystem();
  });

  describe('registerHit', () => {
    it('increments combo count for same target', () => {
      combo.registerHit('attacker1', 'target1');
      expect(combo.getComboCount('attacker1')).toBe(1);

      combo.registerHit('attacker1', 'target1');
      expect(combo.getComboCount('attacker1')).toBe(2);

      combo.registerHit('attacker1', 'target1');
      expect(combo.getComboCount('attacker1')).toBe(3);
    });

    it('resets combo when switching targets', () => {
      combo.registerHit('attacker1', 'target1');
      combo.registerHit('attacker1', 'target1');
      combo.registerHit('attacker1', 'target1');
      expect(combo.getComboCount('attacker1')).toBe(3);

      combo.registerHit('attacker1', 'target2');
      expect(combo.getComboCount('attacker1')).toBe(1);
    });

    it('tracks multiple attackers independently', () => {
      combo.registerHit('attacker1', 'target1');
      combo.registerHit('attacker1', 'target1');
      combo.registerHit('attacker2', 'target1');

      expect(combo.getComboCount('attacker1')).toBe(2);
      expect(combo.getComboCount('attacker2')).toBe(1);
    });
  });

  describe('getComboMultiplier', () => {
    it('returns 1.0 for no combo', () => {
      expect(combo.getComboMultiplier('nonexistent')).toBe(1.0);
    });

    it('returns 1.0 for fewer than 5 hits', () => {
      for (let i = 0; i < 4; i++) {
        combo.registerHit('a', 't');
      }
      expect(combo.getComboMultiplier('a')).toBe(1.0);
    });

    it('returns 1.1 at exactly 5 hits', () => {
      for (let i = 0; i < 5; i++) {
        combo.registerHit('a', 't');
      }
      expect(combo.getComboMultiplier('a')).toBeCloseTo(1.1);
    });

    it('returns 1.2 at 10 hits', () => {
      for (let i = 0; i < 10; i++) {
        combo.registerHit('a', 't');
      }
      expect(combo.getComboMultiplier('a')).toBeCloseTo(1.2);
    });

    it('returns 1.3 at 15 hits', () => {
      for (let i = 0; i < 15; i++) {
        combo.registerHit('a', 't');
      }
      expect(combo.getComboMultiplier('a')).toBeCloseTo(1.3);
    });
  });

  describe('update (timeout)', () => {
    it('resets combo after timer expires', () => {
      combo.registerHit('a', 't');
      combo.registerHit('a', 't');
      expect(combo.getComboCount('a')).toBe(2);

      // Advance time by 2100ms (combo window is 2s)
      combo.update(2100);
      expect(combo.getComboCount('a')).toBe(0);
    });

    it('does not reset combo within the window', () => {
      combo.registerHit('a', 't');
      combo.registerHit('a', 't');

      combo.update(1000); // 1 second elapsed
      expect(combo.getComboCount('a')).toBe(2);
    });

    it('timer resets on new hit', () => {
      combo.registerHit('a', 't');
      combo.update(1500); // 1.5s, close to timeout
      combo.registerHit('a', 't'); // resets timer
      combo.update(1500); // another 1.5s, but from reset
      expect(combo.getComboCount('a')).toBe(2); // still alive
    });
  });

  describe('reset', () => {
    it('clears all combo tracking', () => {
      combo.registerHit('a', 't1');
      combo.registerHit('b', 't2');
      combo.reset();
      expect(combo.getComboCount('a')).toBe(0);
      expect(combo.getComboCount('b')).toBe(0);
    });
  });
});
