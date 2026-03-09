import { describe, it, expect } from 'vitest';
import { FRONT_ROW_X, BACK_ROW_X } from '../../src/config/balance';

describe('Formation battle positioning', () => {
  it('front row X is closer to enemies than back row X', () => {
    expect(FRONT_ROW_X).toBeGreaterThan(BACK_ROW_X);
  });

  it('both row positions are positive and within game bounds', () => {
    expect(FRONT_ROW_X).toBeGreaterThan(0);
    expect(BACK_ROW_X).toBeGreaterThan(0);
    expect(FRONT_ROW_X).toBeLessThan(400); // well within hero side
    expect(BACK_ROW_X).toBeLessThan(400);
  });
});
