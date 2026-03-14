import { describe, it, expect } from 'vitest';
import skillsData from '../../src/data/skills.json';
import skillVisualsData from '../../src/data/skill-visuals.json';

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
