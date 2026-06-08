import { describe, it, expect, beforeEach } from 'vitest';
import Phaser from 'phaser';
import { BattleSystem } from '../../src/systems/BattleSystem';
import { DamageSystem } from '../../src/systems/DamageSystem';
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
    // Human Alliance 2: +10% attack, +10% defense (now a percentage bonus)
    expect(Object.keys(h1.synergyPercentBonuses).length).toBeGreaterThan(0);
    expect((h1.synergyPercentBonuses as any).attack).toBeCloseTo(0.10);
    expect((h1.synergyPercentBonuses as any).defense).toBeCloseTo(0.10);
  });

  it('wires synergy damage into DamageSystem and applies the bonus (regression: P0-1)', () => {
    const scene = new Phaser.Scene();
    // Two dragons => synergy_dragon active (+all-damage bonus)
    const heroStates = [makeHeroState('d1'), makeHeroState('d2')];
    const heroDataMap = new Map<string, HeroData>([
      ['d1', makeHeroData('d1', { race: 'dragon' })],
      ['d2', makeHeroData('d2', { race: 'dragon' })],
    ]);
    const d1 = new Hero(scene, 100, 200, heroDataMap.get('d1')!, heroStates[0]);
    const d2 = new Hero(scene, 100, 270, heroDataMap.get('d2')!, heroStates[1]);
    battleSystem.setUnits([d1, d2], [], heroStates, heroDataMap);

    // Synergy must be active and the DamageSystem must be wired to it.
    const mult = battleSystem.synergySystem.getSynergyDamageMultiplier();
    expect(mult).toBeGreaterThan(1.0);
    expect(battleSystem.damageSystem.synergySystem).toBe(battleSystem.synergySystem);

    // calculateDamage must actually multiply by the synergy bonus. Compare to an
    // identical DamageSystem without a synergy system, using the same seed so
    // variance/crit cancel out in the ratio.
    const withSyn = new DamageSystem(new SeededRNG(7));
    withSyn.synergySystem = battleSystem.synergySystem;
    const without = new DamageSystem(new SeededRNG(7));
    const a = withSyn.calculateDamage(d1, d2, 100, 'physical');
    const b = without.calculateDamage(d1, d2, 100, 'physical');
    expect(a.finalDamage / b.finalDamage).toBeCloseTo(mult, 1);
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
