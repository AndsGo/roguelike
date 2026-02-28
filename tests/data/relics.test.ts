import { describe, it, expect } from 'vitest';
import relicsData from '../../src/data/relics.json';
import { RelicConfig, GameEventType, UnitStats } from '../../src/types';

const relics = relicsData as RelicConfig[];

const VALID_RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
const VALID_EFFECT_TYPES = ['stat_boost', 'on_damage', 'on_heal', 'on_kill', 'on_battle_start', 'on_battle_end', 'passive'];
const VALID_TRIGGER_EVENTS: GameEventType[] = [
  'battle:start', 'battle:end', 'battle:turn',
  'unit:damage', 'unit:heal', 'unit:kill', 'unit:death', 'unit:attack',
  'skill:use', 'skill:cooldown', 'skill:ready', 'skill:queue', 'skill:manualFire', 'skill:targetRequest', 'skill:interrupt',
  'status:apply', 'status:expire',
  'combo:hit', 'combo:break',
  'element:reaction',
  'node:complete', 'run:end',
  'item:equip', 'item:unequip',
  'relic:acquire', 'relic:trigger',
  'achievement:unlock', 'error:report',
];
const VALID_STAT_KEYS: (keyof UnitStats)[] = [
  'maxHp', 'hp', 'attack', 'defense', 'magicPower', 'magicResist',
  'speed', 'attackSpeed', 'attackRange', 'critChance', 'critDamage',
];

describe('Relics 数据验证', () => {
  it('应有 35 个遗物', () => {
    expect(relics.length).toBe(35);
  });

  it('无重复 ID', () => {
    const ids = relics.map(r => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('每个遗物都有 id/name/description/rarity/triggerEvent/effect', () => {
    for (const relic of relics) {
      expect(relic.id, `${relic.id} missing id`).toBeTruthy();
      expect(relic.name, `${relic.id} missing name`).toBeTruthy();
      expect(relic.description, `${relic.id} missing description`).toBeTruthy();
      expect(relic.rarity, `${relic.id} missing rarity`).toBeTruthy();
      expect(relic.triggerEvent, `${relic.id} missing triggerEvent`).toBeTruthy();
      expect(relic.effect, `${relic.id} missing effect`).toBeTruthy();
    }
  });

  it('所有 rarity 值合法', () => {
    for (const relic of relics) {
      expect(VALID_RARITIES, `${relic.id} rarity "${relic.rarity}" invalid`)
        .toContain(relic.rarity);
    }
  });

  it('所有 triggerEvent 值合法', () => {
    for (const relic of relics) {
      expect(VALID_TRIGGER_EVENTS, `${relic.id} triggerEvent "${relic.triggerEvent}" invalid`)
        .toContain(relic.triggerEvent);
    }
  });

  it('所有 effect.type 值合法', () => {
    for (const relic of relics) {
      expect(VALID_EFFECT_TYPES, `${relic.id} effect.type "${relic.effect.type}" invalid`)
        .toContain(relic.effect.type);
    }
  });

  it('stat_boost 类型的 stat 字段引用有效 UnitStats 属性', () => {
    const statBoosts = relics.filter(r => r.effect.type === 'stat_boost' && r.effect.stat);
    expect(statBoosts.length).toBeGreaterThan(0);
    for (const relic of statBoosts) {
      expect(VALID_STAT_KEYS, `${relic.id} stat "${relic.effect.stat}" invalid`)
        .toContain(relic.effect.stat);
    }
  });

  it('带 chance 的遗物 chance 值在 0-1 之间', () => {
    const withChance = relics.filter(r => r.effect.chance !== undefined);
    expect(withChance.length).toBeGreaterThan(0);
    for (const relic of withChance) {
      expect(relic.effect.chance, `${relic.id} chance out of range`)
        .toBeGreaterThan(0);
      expect(relic.effect.chance, `${relic.id} chance out of range`)
        .toBeLessThanOrEqual(1);
    }
  });

  it('稀有度分布合理 (common >= 5, rare >= 5, legendary >= 1)', () => {
    const byCounts: Record<string, number> = {};
    for (const relic of relics) {
      byCounts[relic.rarity] = (byCounts[relic.rarity] ?? 0) + 1;
    }
    expect(byCounts['common']).toBeGreaterThanOrEqual(5);
    expect(byCounts['rare']).toBeGreaterThanOrEqual(5);
    expect(byCounts['legendary']).toBeGreaterThanOrEqual(1);
  });

  it('所有 name 均为中文', () => {
    for (const relic of relics) {
      expect(relic.name, `${relic.id} name "${relic.name}" contains non-CJK`)
        .toMatch(/[\u4e00-\u9fff]/);
    }
  });
});
