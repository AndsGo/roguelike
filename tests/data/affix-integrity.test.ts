import { describe, it, expect } from 'vitest';
import affixesData from '../../src/data/affixes.json';

describe('affix data integrity', () => {
  it('has exactly 10 affixes', () => {
    expect(affixesData.length).toBe(10);
  });

  it('all affix IDs are unique', () => {
    const ids = affixesData.map(a => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all affixes have required fields', () => {
    for (const affix of affixesData) {
      expect(affix.id).toBeTruthy();
      expect(affix.name).toBeTruthy();
      expect(affix.shortDesc).toBeTruthy();
      expect(affix.description).toBeTruthy();
      expect(['offensive', 'defensive', 'special']).toContain(affix.category);
      expect(affix.symbol).toBeTruthy();
      expect(affix.symbolColor).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(typeof affix.params).toBe('object');
      expect(Object.keys(affix.params).length).toBeGreaterThan(0);
    }
  });

  it('shortDesc is at most 8 characters', () => {
    for (const affix of affixesData) {
      expect(affix.shortDesc.length).toBeLessThanOrEqual(8);
    }
  });
});
