import { describe, it, expect } from 'vitest';
import { SYNERGY_DEFINITIONS } from '../../src/config/synergies';
import skillsData from '../../src/data/skills.json';
import { CLERIC_ENERGY_MULTIPLIER } from '../../src/constants';

const skills = skillsData as { id: string; baseDamage: number; scalingRatio: number }[];

describe('Phase 4 Balance Changes', () => {
  it('human synergy 2-person threshold is +10 attack and defense', () => {
    const human = SYNERGY_DEFINITIONS.find(s => s.id === 'synergy_human')!;
    const t2 = human.thresholds.find(t => t.count === 2)!;
    const atkEffect = t2.effects.find((e: any) => e.stat === 'attack');
    const defEffect = t2.effects.find((e: any) => e.stat === 'defense');
    expect(atkEffect!.value).toBe(10);
    expect(defEffect!.value).toBe(10);
  });

  it('shadow_strike has buffed damage', () => {
    const ss = skills.find(s => s.id === 'shadow_strike')!;
    expect(ss.baseDamage).toBe(45);
    expect(ss.scalingRatio).toBe(1.0);
  });

  it('CLERIC_ENERGY_MULTIPLIER is 1.5', () => {
    expect(CLERIC_ENERGY_MULTIPLIER).toBe(1.5);
  });
});
