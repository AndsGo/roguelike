import { describe, it, expect } from 'vitest';
import { SeededRNG } from '../../src/utils/rng';

describe('SeededRNG', () => {
  describe('determinism', () => {
    it('same seed produces same sequence', () => {
      const a = new SeededRNG(42);
      const b = new SeededRNG(42);

      for (let i = 0; i < 100; i++) {
        expect(a.next()).toBe(b.next());
      }
    });

    it('different seeds produce different sequences', () => {
      const a = new SeededRNG(42);
      const b = new SeededRNG(43);

      const seqA = Array.from({ length: 10 }, () => a.next());
      const seqB = Array.from({ length: 10 }, () => b.next());

      expect(seqA).not.toEqual(seqB);
    });
  });

  describe('next', () => {
    it('returns values in [0, 1)', () => {
      const rng = new SeededRNG(12345);
      for (let i = 0; i < 1000; i++) {
        const val = rng.next();
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(1);
      }
    });
  });

  describe('nextInt', () => {
    it('returns integers within [min, max] inclusive', () => {
      const rng = new SeededRNG(99);
      for (let i = 0; i < 500; i++) {
        const val = rng.nextInt(1, 6);
        expect(val).toBeGreaterThanOrEqual(1);
        expect(val).toBeLessThanOrEqual(6);
        expect(Number.isInteger(val)).toBe(true);
      }
    });

    it('returns min when min === max', () => {
      const rng = new SeededRNG(1);
      expect(rng.nextInt(5, 5)).toBe(5);
    });
  });

  describe('nextFloat', () => {
    it('returns floats within [min, max)', () => {
      const rng = new SeededRNG(123);
      for (let i = 0; i < 500; i++) {
        const val = rng.nextFloat(-10, 10);
        expect(val).toBeGreaterThanOrEqual(-10);
        expect(val).toBeLessThan(10);
      }
    });
  });

  describe('chance', () => {
    it('probability 0 always returns false', () => {
      const rng = new SeededRNG(1);
      for (let i = 0; i < 100; i++) {
        expect(rng.chance(0)).toBe(false);
      }
    });

    it('probability 1 always returns true', () => {
      const rng = new SeededRNG(1);
      for (let i = 0; i < 100; i++) {
        expect(rng.chance(1)).toBe(true);
      }
    });

    it('probability 0.5 returns roughly 50% true', () => {
      const rng = new SeededRNG(42);
      let trueCount = 0;
      const trials = 1000;
      for (let i = 0; i < trials; i++) {
        if (rng.chance(0.5)) trueCount++;
      }
      const ratio = trueCount / trials;
      expect(ratio).toBeGreaterThan(0.4);
      expect(ratio).toBeLessThan(0.6);
    });
  });

  describe('shuffle', () => {
    it('returns same-length array', () => {
      const rng = new SeededRNG(1);
      const arr = [1, 2, 3, 4, 5];
      const result = rng.shuffle([...arr]);
      expect(result.length).toBe(arr.length);
    });

    it('contains same elements', () => {
      const rng = new SeededRNG(1);
      const arr = [1, 2, 3, 4, 5];
      const result = rng.shuffle([...arr]);
      expect(result.sort()).toEqual(arr.sort());
    });

    it('is deterministic', () => {
      const a = new SeededRNG(42);
      const b = new SeededRNG(42);
      const arrA = a.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      const arrB = b.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      expect(arrA).toEqual(arrB);
    });
  });

  describe('pick', () => {
    it('returns an element from the array', () => {
      const rng = new SeededRNG(1);
      const arr = ['a', 'b', 'c'];
      for (let i = 0; i < 50; i++) {
        expect(arr).toContain(rng.pick(arr));
      }
    });
  });

  describe('pickN', () => {
    it('returns N unique elements', () => {
      const rng = new SeededRNG(1);
      const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const result = rng.pickN(arr, 3);
      expect(result.length).toBe(3);
      // All unique
      expect(new Set(result).size).toBe(3);
    });

    it('returns all elements when n >= array length', () => {
      const rng = new SeededRNG(1);
      const arr = [1, 2, 3];
      const result = rng.pickN(arr, 10);
      expect(result.length).toBe(3);
    });
  });

  describe('weightedPick', () => {
    it('heavily weighted item is picked most often', () => {
      const rng = new SeededRNG(42);
      const items = ['common', 'rare', 'legendary'];
      const weights = [100, 10, 1];

      const counts: Record<string, number> = { common: 0, rare: 0, legendary: 0 };
      for (let i = 0; i < 1000; i++) {
        counts[rng.weightedPick(items, weights)]++;
      }

      expect(counts.common).toBeGreaterThan(counts.rare);
      expect(counts.rare).toBeGreaterThan(counts.legendary);
    });
  });
});
