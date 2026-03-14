import { describe, it, expect } from 'vitest';
import skillsData from '../../src/data/skills.json';
import skillVisualsData from '../../src/data/skill-visuals.json';
import heroesData from '../../src/data/heroes.json';
import { MetaManager } from '../../src/managers/MetaManager';

const skills = skillsData as { id: string; name: string; element?: string; isUltimate?: boolean; cooldown: number; damageType: string; targetType: string; baseDamage: number; scalingStat: string; scalingRatio: number; range: number; statusEffect?: string; effectDuration?: number }[];
const skillVisuals = skillVisualsData as Record<string, { type: string; color: string; count?: number }>;

const NEW_SKILL_IDS = [
  'frost_shield', 'glacial_pulse', 'ult_frozen_sanctuary',
  'holy_blessing', 'radiant_burst', 'ult_divine_empowerment',
  'frost_arrow', 'dragon_ice_breath', 'ult_glacial_barrage',
];

describe('Phase 2b: New Skills', () => {
  const skillMap = new Map(skills.map(s => [s.id, s]));

  it('all 9 new skills exist in skills.json', () => {
    for (const id of NEW_SKILL_IDS) {
      expect(skillMap.has(id), `Missing skill: ${id}`).toBe(true);
    }
  });

  it('3 skills are ultimates with cooldown 0', () => {
    const ultIds = ['ult_frozen_sanctuary', 'ult_divine_empowerment', 'ult_glacial_barrage'];
    for (const id of ultIds) {
      const skill = skillMap.get(id)!;
      expect(skill.isUltimate).toBe(true);
      expect(skill.cooldown).toBe(0);
    }
  });

  it('all new skills have valid targetType', () => {
    const validTargets = ['enemy', 'ally', 'all_enemies', 'all_allies', 'self'];
    for (const id of NEW_SKILL_IDS) {
      const skill = skillMap.get(id)!;
      expect(validTargets).toContain(skill.targetType);
    }
  });

  it('all new skills have ice or holy element', () => {
    for (const id of NEW_SKILL_IDS) {
      const skill = skillMap.get(id)!;
      expect(['ice', 'holy']).toContain(skill.element);
    }
  });

  it('all 9 new skills have visual entries', () => {
    for (const id of NEW_SKILL_IDS) {
      expect(skillVisuals[id], `Missing visual for: ${id}`).toBeDefined();
      expect(skillVisuals[id].color).toMatch(/^0x[0-9a-fA-F]{6}$/);
    }
  });

  it('frost_shield is a healing/buff skill', () => {
    const s = skillMap.get('frost_shield')!;
    expect(s.baseDamage).toBeLessThan(0);
    expect(s.targetType).toBe('ally');
    expect(s.statusEffect).toBe('buff');
  });

  it('dragon_ice_breath uses attack scaling with magical damageType', () => {
    const s = skillMap.get('dragon_ice_breath')!;
    expect(s.damageType).toBe('magical');
    expect(s.scalingStat).toBe('attack');
  });
});

const heroes = heroesData as { id: string; name: string; role: string; element: string | null; race: string; class: string; skills: string[]; baseStats: Record<string, number>; scalingPerLevel: Record<string, number>; spriteKey: string }[];
const NEW_HERO_IDS = ['frost_whisperer', 'holy_emissary', 'ice_dragon_hunter'];

describe('Phase 2b: New Heroes', () => {
  const heroMap = new Map(heroes.map(h => [h.id, h]));

  it('all 3 new heroes exist', () => {
    for (const id of NEW_HERO_IDS) {
      expect(heroMap.has(id), `Missing hero: ${id}`).toBe(true);
    }
  });

  it('each hero has 3 skills (2 regular + 1 ultimate)', () => {
    for (const id of NEW_HERO_IDS) {
      const hero = heroMap.get(id)!;
      expect(hero.skills).toHaveLength(3);
      expect(hero.skills[2]).toMatch(/^ult_/);
    }
  });

  it('frost_whisperer is elf/cleric/ice/support', () => {
    const h = heroMap.get('frost_whisperer')!;
    expect(h.race).toBe('elf');
    expect(h.class).toBe('cleric');
    expect(h.element).toBe('ice');
    expect(h.role).toBe('support');
  });

  it('holy_emissary is human/paladin/holy/support', () => {
    const h = heroMap.get('holy_emissary')!;
    expect(h.race).toBe('human');
    expect(h.class).toBe('paladin');
    expect(h.element).toBe('holy');
    expect(h.role).toBe('support');
  });

  it('ice_dragon_hunter is dragon/ranger/ice/ranged_dps', () => {
    const h = heroMap.get('ice_dragon_hunter')!;
    expect(h.race).toBe('dragon');
    expect(h.class).toBe('ranger');
    expect(h.element).toBe('ice');
    expect(h.role).toBe('ranged_dps');
  });

  it('all hero skills reference valid skills', () => {
    const skillIds = new Set((skillsData as { id: string }[]).map(s => s.id));
    for (const id of NEW_HERO_IDS) {
      const hero = heroMap.get(id)!;
      for (const skillId of hero.skills) {
        expect(skillIds.has(skillId), `Hero ${id} references missing skill: ${skillId}`).toBe(true);
      }
    }
  });

  it('all heroes have required baseStats fields', () => {
    const requiredStats = ['maxHp', 'hp', 'attack', 'defense', 'magicPower', 'magicResist', 'speed', 'attackSpeed', 'attackRange', 'critChance', 'critDamage'];
    for (const id of NEW_HERO_IDS) {
      const hero = heroMap.get(id)!;
      for (const stat of requiredStats) {
        expect(hero.baseStats[stat], `Hero ${id} missing baseStats.${stat}`).toBeDefined();
      }
    }
  });

  it('all heroes have unlock conditions in MetaManager', () => {
    for (const id of NEW_HERO_IDS) {
      const cond = MetaManager.getHeroUnlockCondition(id);
      expect(cond, `Missing unlock condition for ${id}`).toBeDefined();
      expect(cond!.type).not.toBe('default');
    }
  });
});
