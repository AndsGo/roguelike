import { describe, it, expect } from 'vitest';
import { buildEnemyTag } from '../../src/ui/NodeTooltip';

describe('buildEnemyTag', () => {
  it('returns element and race tag when both present', () => {
    expect(buildEnemyTag('fire', 'beast')).toBe(' [火/兽]');
  });

  it('returns only element tag when race is missing', () => {
    expect(buildEnemyTag('ice', undefined)).toBe(' [冰]');
    expect(buildEnemyTag('lightning', null as any)).toBe(' [雷]');
  });

  it('returns only race tag when element is missing', () => {
    expect(buildEnemyTag(null as any, 'dragon')).toBe(' [龙]');
    expect(buildEnemyTag(undefined, 'elf')).toBe(' [精]');
  });

  it('returns empty string when both are missing', () => {
    expect(buildEnemyTag(null as any, null as any)).toBe('');
    expect(buildEnemyTag(undefined, undefined)).toBe('');
  });

  it('maps all elements correctly', () => {
    expect(buildEnemyTag('fire', undefined)).toBe(' [火]');
    expect(buildEnemyTag('ice', undefined)).toBe(' [冰]');
    expect(buildEnemyTag('lightning', undefined)).toBe(' [雷]');
    expect(buildEnemyTag('dark', undefined)).toBe(' [暗]');
    expect(buildEnemyTag('holy', undefined)).toBe(' [圣]');
  });

  it('maps all races correctly', () => {
    expect(buildEnemyTag(undefined, 'human')).toBe(' [人]');
    expect(buildEnemyTag(undefined, 'elf')).toBe(' [精]');
    expect(buildEnemyTag(undefined, 'undead')).toBe(' [亡]');
    expect(buildEnemyTag(undefined, 'demon')).toBe(' [魔]');
    expect(buildEnemyTag(undefined, 'beast')).toBe(' [兽]');
    expect(buildEnemyTag(undefined, 'dragon')).toBe(' [龙]');
  });

  it('returns empty for unknown element/race with no valid counterpart', () => {
    expect(buildEnemyTag('unknown_element' as any, undefined)).toBe('');
    expect(buildEnemyTag(undefined, 'unknown_race' as any)).toBe('');
  });
});
