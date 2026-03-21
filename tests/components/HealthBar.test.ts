import { describe, it, expect } from 'vitest';
import { HEALTH_BAR_STYLES } from '../../src/config/visual';

describe('HealthBar styles', () => {
  it('defines all 4 unit type styles', () => {
    expect(HEALTH_BAR_STYLES).toHaveProperty('hero');
    expect(HEALTH_BAR_STYLES).toHaveProperty('normal');
    expect(HEALTH_BAR_STYLES).toHaveProperty('elite');
    expect(HEALTH_BAR_STYLES).toHaveProperty('boss');
  });

  it('boss bar is wider and taller than normal', () => {
    expect(HEALTH_BAR_STYLES.boss.width).toBeGreaterThan(HEALTH_BAR_STYLES.normal.width);
    expect(HEALTH_BAR_STYLES.boss.height).toBeGreaterThan(HEALTH_BAR_STYLES.normal.height);
  });

  it('elite has visible border, normal does not', () => {
    expect(HEALTH_BAR_STYLES.elite.borderAlpha).toBeGreaterThan(0);
    expect(HEALTH_BAR_STYLES.normal.borderAlpha).toBe(0);
  });
});
