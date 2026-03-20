import { describe, it, expect, beforeEach } from 'vitest';
import Phaser from 'phaser';
import { BattleSystem } from '../../src/systems/BattleSystem';
import { Hero } from '../../src/entities/Hero';
import { SeededRNG } from '../../src/utils/rng';
import { EventBus } from '../../src/systems/EventBus';
import { HeroState, HeroData } from '../../src/types';

function makeHeroState(id: string): HeroState {
  return {
    id, level: 1, exp: 0, currentHp: 500,
    equipment: { weapon: null, armor: null, accessory: null },
  };
}

function makeHeroData(id: string, overrides: Partial<HeroData> = {}): HeroData {
  return {
    id, name: id, role: overrides.role ?? 'melee_dps',
    baseStats: {
      maxHp: 500, hp: 500, attack: 50, defense: 20,
      magicPower: 0, magicResist: 10, speed: 100,
      attackSpeed: 1.0, attackRange: 100, critChance: 0.1, critDamage: 1.5,
    },
    scalingPerLevel: { maxHp: 30, attack: 5, defense: 2, magicPower: 0, magicResist: 1 },
    skills: [], spriteKey: 'test',
    race: overrides.race, class: overrides.class, element: overrides.element,
  };
}

describe('Battle Synergy Integration', () => {
  let battleSystem: BattleSystem;

  beforeEach(() => {
    EventBus.getInstance().reset();
    battleSystem = new BattleSystem(new SeededRNG(42));
  });

  it('applySynergies populates hero.synergyBonuses when heroStates passed', () => {
    const scene = new Phaser.Scene();
    const heroStates = [makeHeroState('h1'), makeHeroState('h2')];
    const heroDataMap = new Map<string, HeroData>([
      ['h1', makeHeroData('h1', { race: 'human' })],
      ['h2', makeHeroData('h2', { race: 'human' })],
    ]);
    const h1 = new Hero(scene, 100, 200, heroDataMap.get('h1')!, heroStates[0]);
    const h2 = new Hero(scene, 100, 270, heroDataMap.get('h2')!, heroStates[1]);
    battleSystem.setUnits([h1, h2], [], heroStates, heroDataMap);
    // Human Alliance 2: attack+10, defense+10
    expect(Object.keys(h1.synergyBonuses).length).toBeGreaterThan(0);
    expect((h1.synergyBonuses as any).attack).toBe(10);
    expect((h1.synergyBonuses as any).defense).toBe(10);
  });

  it('synergyBonuses remain empty when heroStates not passed', () => {
    const scene = new Phaser.Scene();
    const data = makeHeroData('h1', { race: 'human' });
    const state = makeHeroState('h1');
    const h1 = new Hero(scene, 100, 200, data, state);
    battleSystem.setUnits([h1], []);
    expect(Object.keys(h1.synergyBonuses).length).toBe(0);
  });
});
