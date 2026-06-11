import { describe, expect, it } from 'vitest';
import { getEquipmentIconFrame, getRelicIconFrame, getRarityIconFrame } from '../../src/ui/ItemIconMapping';

describe('ItemIconMapping', () => {
  it('maps equipment slots to item icon frames', () => {
    expect(getEquipmentIconFrame('weapon')).toBe('weapon');
    expect(getEquipmentIconFrame('armor')).toBe('armor');
    expect(getEquipmentIconFrame('accessory')).toBe('accessory');
  });

  it('maps relics and rarities to item icon frames', () => {
    expect(getRelicIconFrame()).toBe('relic');
    expect(getRarityIconFrame('common')).toBe('common');
    expect(getRarityIconFrame('uncommon')).toBe('uncommon');
    expect(getRarityIconFrame('rare')).toBe('rare');
    expect(getRarityIconFrame('epic')).toBe('epic');
    expect(getRarityIconFrame('legendary')).toBe('legendary');
  });

  it('falls back unknown rarity values to common', () => {
    expect(getRarityIconFrame('broken')).toBe('common');
  });
});
