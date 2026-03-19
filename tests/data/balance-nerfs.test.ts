import { describe, it, expect } from 'vitest';
import heroesData from '../../src/data/heroes.json';
import skillsData from '../../src/data/skills.json';
import relicsData from '../../src/data/relics.json';

const heroes = heroesData as { id: string; baseStats: { attack: number; critDamage: number } }[];
const skills = skillsData as { id: string; scalingRatio: number }[];
const relics = relicsData as { id: string; description: string; effect: { value: number } }[];

describe('v1.12.0 Balance Nerfs', () => {
  it('shadow_assassin attack nerfed to 58', () => {
    const hero = heroes.find(h => h.id === 'shadow_assassin')!;
    expect(hero.baseStats.attack).toBe(58);
  });

  it('shadow_assassin critDamage nerfed to 2.0', () => {
    const hero = heroes.find(h => h.id === 'shadow_assassin')!;
    expect(hero.baseStats.critDamage).toBe(2.0);
  });

  it('forest_stalker attack nerfed to 62', () => {
    const hero = heroes.find(h => h.id === 'forest_stalker')!;
    expect(hero.baseStats.attack).toBe(62);
  });

  it('forest_stalker critDamage nerfed to 2.0', () => {
    const hero = heroes.find(h => h.id === 'forest_stalker')!;
    expect(hero.baseStats.critDamage).toBe(2.0);
  });

  it('predator_strike scalingRatio nerfed to 1.3', () => {
    const skill = skills.find(s => s.id === 'predator_strike')!;
    expect(skill.scalingRatio).toBe(1.3);
  });

  it('ult_apex_predator scalingRatio nerfed to 2.0', () => {
    const skill = skills.find(s => s.id === 'ult_apex_predator')!;
    expect(skill.scalingRatio).toBe(2.0);
  });

  it('glass_cannon effect value nerfed to 0.25', () => {
    const relic = relics.find(r => r.id === 'glass_cannon')!;
    expect(relic.effect.value).toBe(0.25);
  });

  it('overflow_shield effect value nerfed to 0.1', () => {
    const relic = relics.find(r => r.id === 'overflow_shield')!;
    expect(relic.effect.value).toBe(0.1);
  });

  it('shield_charm description mentions 8 seconds', () => {
    const relic = relics.find(r => r.id === 'shield_charm')!;
    expect(relic.description).toContain('8秒');
  });
});
