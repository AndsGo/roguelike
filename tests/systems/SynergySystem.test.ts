import { describe, it, expect, beforeEach } from 'vitest';
import { SynergySystem } from '../../src/systems/SynergySystem';
import { HeroState, HeroData, ElementType } from '../../src/types';

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

    // Human "全属性+X%" is now a percentage bonus: +10% (threshold 2) + +15% (threshold 4) = +25%
    const pctH1 = result.heroPercentBonuses.get('h1');
    expect(pctH1).toBeDefined();
    expect(pctH1!.attack).toBeCloseTo(0.25); // 0.10 + 0.15
    expect(pctH1!.defense).toBeCloseTo(0.25); // 0.10 + 0.15
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

  it('getSynergyBonuses returns correct flat bonuses for a hero', () => {
    // Warrior synergy grants flat +15 defense at count 2 (human is now a % bonus).
    const heroes: HeroState[] = [makeHeroState('h1'), makeHeroState('h2')];
    const dataMap = new Map<string, HeroData>([
      ['h1', makeHeroData('h1', { class: 'warrior' })],
      ['h2', makeHeroData('h2', { class: 'warrior' })],
    ]);

    synergy.calculateActiveSynergies(heroes, dataMap);
    const bonus = synergy.getSynergyBonuses('h1');
    expect(bonus.defense).toBe(15);
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
      makeHeroState('h1'), makeHeroState('h2'), makeHeroState('h3'),
    ];
    const dataMap = new Map<string, HeroData>([
      ['h1', makeHeroData('h1', { race: 'dragon' })],
      ['h2', makeHeroData('h2', { race: 'dragon' })],
      ['h3', makeHeroData('h3', { race: 'dragon' })],
    ]);

    const result = synergy.calculateActiveSynergies(heroes, dataMap);
    // Dragon (3): +18% all damage — capstone now requires 3, not 2
    const dmgBonus = result.damageBonuses.get('all');
    expect(dmgBonus).toBe(0.18);
  });

  it('dragon count-2 grants the maxHp entry tier, not the damage capstone', () => {
    const heroes: HeroState[] = [makeHeroState('h1'), makeHeroState('h2')];
    const dataMap = new Map<string, HeroData>([
      ['h1', makeHeroData('h1', { race: 'dragon' })],
      ['h2', makeHeroData('h2', { race: 'dragon' })],
    ]);

    const result = synergy.calculateActiveSynergies(heroes, dataMap);
    // 2 dragons: +60 maxHp entry tier only; the +18% all-damage capstone needs 3.
    expect(result.heroBonuses.get('h1')!.maxHp).toBe(60);
    expect(result.damageBonuses.get('all')).toBeUndefined();
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

  it('activates ice element synergy with 2 ice heroes', () => {
    const heroes: HeroState[] = [makeHeroState('h1'), makeHeroState('h2')];
    const dataMap = new Map<string, HeroData>([
      ['h1', makeHeroData('h1', { element: 'ice' })],
      ['h2', makeHeroData('h2', { element: 'ice' })],
    ]);

    const result = synergy.calculateActiveSynergies(heroes, dataMap);
    const iceSynergy = result.activeSynergies.find(s => s.synergyId === 'synergy_ice');
    expect(iceSynergy).toBeDefined();
    expect(iceSynergy!.count).toBe(2);
    expect(iceSynergy!.activeThreshold).toBe(2);

    const dmgBonus = result.damageBonuses.get('ice');
    expect(dmgBonus).toBe(0.20);
  });

  it('activates lightning element synergy with 2 lightning heroes', () => {
    const heroes: HeroState[] = [makeHeroState('h1'), makeHeroState('h2')];
    const dataMap = new Map<string, HeroData>([
      ['h1', makeHeroData('h1', { element: 'lightning' })],
      ['h2', makeHeroData('h2', { element: 'lightning' })],
    ]);

    const result = synergy.calculateActiveSynergies(heroes, dataMap);
    const lightningSynergy = result.activeSynergies.find(s => s.synergyId === 'synergy_lightning');
    expect(lightningSynergy).toBeDefined();
    expect(lightningSynergy!.count).toBe(2);

    const dmgBonus = result.damageBonuses.get('lightning');
    expect(dmgBonus).toBe(0.20);
  });

  it('ice synergy damage multiplier applies correctly', () => {
    const heroes: HeroState[] = [makeHeroState('h1'), makeHeroState('h2')];
    const dataMap = new Map<string, HeroData>([
      ['h1', makeHeroData('h1', { element: 'ice' })],
      ['h2', makeHeroData('h2', { element: 'ice' })],
    ]);

    synergy.calculateActiveSynergies(heroes, dataMap);
    const mult = synergy.getSynergyDamageMultiplier('ice');
    expect(mult).toBeCloseTo(1.20);
    // Non-ice element should be unaffected
    expect(synergy.getSynergyDamageMultiplier('fire')).toBeCloseTo(1.0);
  });

  it('uses temporaryElement for element synergy counting', () => {
    const heroes: HeroState[] = [
      makeHeroState('h1'),
      { ...makeHeroState('h2'), temporaryElement: 'fire' as ElementType },
    ];
    const dataMap = new Map<string, HeroData>([
      ['h1', makeHeroData('h1', { element: 'fire' })],
      ['h2', makeHeroData('h2', { element: 'ice' })],
    ]);
    const result = synergy.calculateActiveSynergies(heroes, dataMap);
    const fireSynergy = result.activeSynergies.find(s => s.synergyId === 'synergy_fire');
    expect(fireSynergy).toBeDefined();
    expect(fireSynergy!.count).toBe(2);
    const iceSynergy = result.activeSynergies.find(s => s.synergyId === 'synergy_ice');
    expect(iceSynergy).toBeUndefined();
  });

  it('getSynergyDamageMultiplier includes element-specific and all bonuses', () => {
    const heroes: HeroState[] = [
      makeHeroState('h1'), makeHeroState('h2'),
      makeHeroState('h3'), makeHeroState('h4'),
    ];
    const dataMap = new Map<string, HeroData>([
      ['h1', makeHeroData('h1', { race: 'dragon' })], // dragon (3): +18% all damage
      ['h2', makeHeroData('h2', { race: 'dragon' })],
      ['h3', makeHeroData('h3', { race: 'dragon' })],
      ['h4', makeHeroData('h4', { race: 'undead' })], // undead needs more for dark damage bonus
    ]);

    synergy.calculateActiveSynergies(heroes, dataMap);
    // Dragon (3) gives 0.18 to 'all'
    const mult = synergy.getSynergyDamageMultiplier('fire');
    expect(mult).toBeCloseTo(1.18); // 1.0 + 0.18 (all)
  });

  it('fire element capstone (count>=4) stacks damage and grants the team-identity bonus', () => {
    // Arrange: a committed mono-fire party of 4.
    const heroes: HeroState[] = [
      makeHeroState('f1'), makeHeroState('f2'),
      makeHeroState('f3'), makeHeroState('f4'),
    ];
    const dataMap = new Map<string, HeroData>([
      ['f1', makeHeroData('f1', { element: 'fire' })],
      ['f2', makeHeroData('f2', { element: 'fire' })],
      ['f3', makeHeroData('f3', { element: 'fire' })],
      ['f4', makeHeroData('f4', { element: 'fire' })],
    ]);

    // Act
    const result = synergy.calculateActiveSynergies(heroes, dataMap);

    // Assert: capstone threshold reached; entry (+0.20) and capstone (+0.25)
    // element-damage bonuses stack cumulatively to +0.45.
    const fireSynergy = result.activeSynergies.find(s => s.synergyId === 'synergy_fire');
    expect(fireSynergy!.activeThreshold).toBe(4);
    expect(result.damageBonuses.get('fire')).toBeCloseTo(0.45);
    expect(synergy.getSynergyDamageMultiplier('fire')).toBeCloseTo(1.45);
    // Distinct team identity: fire capstone grants +10% attack to members.
    expect(result.heroPercentBonuses.get('f1')!.attack).toBeCloseTo(0.10);
  });

  it('fire element with 3 heroes gets only the entry tier, not the capstone', () => {
    // Arrange: 3 fire heroes — between the two thresholds.
    const heroes: HeroState[] = [
      makeHeroState('f1'), makeHeroState('f2'), makeHeroState('f3'),
    ];
    const dataMap = new Map<string, HeroData>([
      ['f1', makeHeroData('f1', { element: 'fire' })],
      ['f2', makeHeroData('f2', { element: 'fire' })],
      ['f3', makeHeroData('f3', { element: 'fire' })],
    ]);

    // Act
    const result = synergy.calculateActiveSynergies(heroes, dataMap);

    // Assert: entry tier only — no capstone damage stack, no identity bonus.
    const fireSynergy = result.activeSynergies.find(s => s.synergyId === 'synergy_fire');
    expect(fireSynergy!.activeThreshold).toBe(2);
    expect(result.damageBonuses.get('fire')).toBeCloseTo(0.20);
    expect(result.heroPercentBonuses.get('f1')!.attack).toBeUndefined();
  });
});
