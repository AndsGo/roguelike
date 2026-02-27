import { describe, it, expect, beforeEach } from 'vitest';
import { SynergySystem } from '../../src/systems/SynergySystem';
import { HeroState, HeroData } from '../../src/types';

function makeHeroState(id: string): HeroState {
  return {
    id,
    level: 1,
    exp: 0,
    currentHp: 500,
    equipment: { weapon: null, armor: null, accessory: null },
  };
}

function makeHeroData(id: string, overrides: Partial<HeroData> = {}): HeroData {
  return {
    id,
    name: id,
    role: overrides.role ?? 'melee_dps',
    baseStats: overrides.baseStats ?? {
      maxHp: 500, hp: 500, attack: 50, defense: 20,
      magicPower: 0, magicResist: 10, speed: 100,
      attackSpeed: 1.0, attackRange: 100, critChance: 0.1, critDamage: 1.5,
    },
    scalingPerLevel: overrides.scalingPerLevel ?? {
      maxHp: 30, attack: 5, defense: 2, magicPower: 0, magicResist: 1,
    },
    skills: [],
    spriteKey: 'test',
    race: overrides.race,
    class: overrides.class,
    element: overrides.element,
  };
}

describe('SynergySystem', () => {
  let synergy: SynergySystem;

  beforeEach(() => {
    synergy = new SynergySystem();
  });

  it('activates Human Alliance with 2 human heroes', () => {
    const heroes: HeroState[] = [makeHeroState('h1'), makeHeroState('h2')];
    const dataMap = new Map<string, HeroData>([
      ['h1', makeHeroData('h1', { race: 'human' })],
      ['h2', makeHeroData('h2', { race: 'human' })],
    ]);

    const result = synergy.calculateActiveSynergies(heroes, dataMap);

    const humanSynergy = result.activeSynergies.find(s => s.synergyId === 'synergy_human');
    expect(humanSynergy).toBeDefined();
    expect(humanSynergy!.count).toBe(2);
    expect(humanSynergy!.activeThreshold).toBe(2);
  });

  it('does not activate synergy when threshold not reached', () => {
    const heroes: HeroState[] = [makeHeroState('h1')];
    const dataMap = new Map<string, HeroData>([
      ['h1', makeHeroData('h1', { race: 'human' })],
    ]);

    const result = synergy.calculateActiveSynergies(heroes, dataMap);
    const humanSynergy = result.activeSynergies.find(s => s.synergyId === 'synergy_human');
    expect(humanSynergy).toBeUndefined();
  });

  it('activates higher threshold with 4 human heroes', () => {
    const heroes: HeroState[] = [
      makeHeroState('h1'), makeHeroState('h2'),
      makeHeroState('h3'), makeHeroState('h4'),
    ];
    const dataMap = new Map<string, HeroData>([
      ['h1', makeHeroData('h1', { race: 'human' })],
      ['h2', makeHeroData('h2', { race: 'human' })],
      ['h3', makeHeroData('h3', { race: 'human' })],
      ['h4', makeHeroData('h4', { race: 'human' })],
    ]);

    const result = synergy.calculateActiveSynergies(heroes, dataMap);
    const humanSynergy = result.activeSynergies.find(s => s.synergyId === 'synergy_human');
    expect(humanSynergy).toBeDefined();
    expect(humanSynergy!.activeThreshold).toBe(4);

    // Each human should get +5 attack (from threshold 2) + +15 attack (from threshold 4) = +20
    const bonusH1 = result.heroBonuses.get('h1');
    expect(bonusH1).toBeDefined();
    expect(bonusH1!.attack).toBe(20); // 5 + 15
    expect(bonusH1!.defense).toBe(20); // 5 + 15
  });

  it('activates multiple synergies simultaneously', () => {
    const heroes: HeroState[] = [
      makeHeroState('h1'), makeHeroState('h2'),
    ];
    const dataMap = new Map<string, HeroData>([
      ['h1', makeHeroData('h1', { race: 'human', class: 'warrior' })],
      ['h2', makeHeroData('h2', { race: 'human', class: 'warrior' })],
    ]);

    const result = synergy.calculateActiveSynergies(heroes, dataMap);

    const humanSynergy = result.activeSynergies.find(s => s.synergyId === 'synergy_human');
    const warriorSynergy = result.activeSynergies.find(s => s.synergyId === 'synergy_warrior');

    expect(humanSynergy).toBeDefined();
    expect(warriorSynergy).toBeDefined();
  });

  it('getSynergyBonuses returns correct bonuses for a hero', () => {
    const heroes: HeroState[] = [makeHeroState('h1'), makeHeroState('h2')];
    const dataMap = new Map<string, HeroData>([
      ['h1', makeHeroData('h1', { race: 'human' })],
      ['h2', makeHeroData('h2', { race: 'human' })],
    ]);

    synergy.calculateActiveSynergies(heroes, dataMap);
    const bonus = synergy.getSynergyBonuses('h1');
    expect(bonus.attack).toBe(5);
    expect(bonus.defense).toBe(5);
  });

  it('getSynergyBonuses returns empty object before calculation', () => {
    const bonus = synergy.getSynergyBonuses('nonexistent');
    expect(bonus).toEqual({});
  });

  it('class synergy warrior gives +15 defense with 2 warriors', () => {
    const heroes: HeroState[] = [makeHeroState('h1'), makeHeroState('h2')];
    const dataMap = new Map<string, HeroData>([
      ['h1', makeHeroData('h1', { class: 'warrior' })],
      ['h2', makeHeroData('h2', { class: 'warrior' })],
    ]);

    const result = synergy.calculateActiveSynergies(heroes, dataMap);
    const warriorSynergy = result.activeSynergies.find(s => s.synergyId === 'synergy_warrior');
    expect(warriorSynergy).toBeDefined();

    const bonus = result.heroBonuses.get('h1');
    expect(bonus!.defense).toBe(15);
  });

  it('cleric synergy applies global magic resist to all heroes', () => {
    const heroes: HeroState[] = [
      makeHeroState('h1'), makeHeroState('h2'), makeHeroState('h3'),
    ];
    const dataMap = new Map<string, HeroData>([
      ['h1', makeHeroData('h1', { class: 'cleric' })],
      ['h2', makeHeroData('h2', { class: 'cleric' })],
      ['h3', makeHeroData('h3', { class: 'warrior' })],
    ]);

    const result = synergy.calculateActiveSynergies(heroes, dataMap);

    // Cleric (2): +15 magic resist for ALL heroes
    for (const heroState of heroes) {
      const bonus = result.heroBonuses.get(heroState.id);
      expect(bonus!.magicResist).toBe(15);
    }
  });

  it('damage_bonus synergy is tracked', () => {
    const heroes: HeroState[] = [
      makeHeroState('h1'), makeHeroState('h2'),
    ];
    const dataMap = new Map<string, HeroData>([
      ['h1', makeHeroData('h1', { race: 'dragon' })],
      ['h2', makeHeroData('h2', { race: 'dragon' })],
    ]);

    const result = synergy.calculateActiveSynergies(heroes, dataMap);
    // Dragon (2): +25% all damage
    const dmgBonus = result.damageBonuses.get('all');
    expect(dmgBonus).toBe(0.25);
  });

  it('reset clears the cache', () => {
    const heroes: HeroState[] = [makeHeroState('h1'), makeHeroState('h2')];
    const dataMap = new Map<string, HeroData>([
      ['h1', makeHeroData('h1', { race: 'human' })],
      ['h2', makeHeroData('h2', { race: 'human' })],
    ]);

    synergy.calculateActiveSynergies(heroes, dataMap);
    synergy.reset();
    expect(synergy.getSynergyBonuses('h1')).toEqual({});
    expect(synergy.getActiveSynergies()).toEqual([]);
  });

  it('getSynergyDamageMultiplier includes element-specific and all bonuses', () => {
    const heroes: HeroState[] = [
      makeHeroState('h1'), makeHeroState('h2'),
      makeHeroState('h3'), makeHeroState('h4'),
    ];
    const dataMap = new Map<string, HeroData>([
      ['h1', makeHeroData('h1', { race: 'dragon' })], // dragon (2): +25% all damage
      ['h2', makeHeroData('h2', { race: 'dragon' })],
      ['h3', makeHeroData('h3', { race: 'undead' })], // undead needs 4 for dark damage bonus
      ['h4', makeHeroData('h4', { race: 'undead' })],
    ]);

    synergy.calculateActiveSynergies(heroes, dataMap);
    // Dragon gives 0.25 to 'all'
    const mult = synergy.getSynergyDamageMultiplier('fire');
    expect(mult).toBeCloseTo(1.25); // 1.0 + 0.25 (all)
  });
});
