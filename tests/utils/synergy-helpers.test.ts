import { describe, it, expect } from 'vitest';
import { calculateSynergyTags, formatSynergyTags, SynergyTag } from '../../src/utils/synergy-helpers';

describe('synergy-helpers', () => {
  describe('calculateSynergyTags', () => {
    it('returns empty array for empty heroIds', () => {
      expect(calculateSynergyTags([])).toEqual([]);
    });

    it('returns empty array for non-existent hero IDs', () => {
      expect(calculateSynergyTags(['nonexistent'])).toEqual([]);
    });

    it('detects race synergy with 2 humans', () => {
      const tags = calculateSynergyTags(['warrior', 'mage']);
      const humanTag = tags.find(t => t.name === '人类联盟');
      expect(humanTag).toBeDefined();
      expect(humanTag!.count).toBe(2);
      expect(humanTag!.active).toBe(true);
    });

    it('detects element synergy with 2 ice heroes', () => {
      const tags = calculateSynergyTags(['frost_ranger', 'frost_whisperer']);
      const iceTag = tags.find(t => t.name === '永冬之力');
      expect(iceTag).toBeDefined();
      expect(iceTag!.count).toBe(2);
      expect(iceTag!.active).toBe(true);
    });

    it('shows progress for near-threshold synergy', () => {
      const tags = calculateSynergyTags(['warrior']);
      const humanTag = tags.find(t => t.name === '人类联盟');
      expect(humanTag).toBeDefined();
      expect(humanTag!.count).toBe(1);
      expect(humanTag!.active).toBe(false);
    });

    it('ignores heroes with no element', () => {
      const tags = calculateSynergyTags(['warrior']);
      expect(tags.length).toBeGreaterThan(0);
    });
  });

  describe('formatSynergyTags', () => {
    it('returns empty string for empty tags', () => {
      expect(formatSynergyTags([])).toBe('');
    });

    it('formats active tag with checkmark', () => {
      const tags: SynergyTag[] = [{ name: '测试', count: 2, threshold: 2, active: true }];
      const result = formatSynergyTags(tags);
      expect(result).toContain('测试');
      expect(result).toContain('2/2');
      expect(result).toContain('✓');
    });

    it('formats inactive tag with progress', () => {
      const tags: SynergyTag[] = [{ name: '测试', count: 1, threshold: 2, active: false }];
      const result = formatSynergyTags(tags);
      expect(result).toContain('测试');
      expect(result).toContain('1/2');
      expect(result).not.toContain('✓');
    });

    it('joins multiple tags with double space', () => {
      const tags: SynergyTag[] = [
        { name: 'A', count: 2, threshold: 2, active: true },
        { name: 'B', count: 1, threshold: 3, active: false },
      ];
      const result = formatSynergyTags(tags);
      expect(result).toContain('  ');
    });
  });
});
