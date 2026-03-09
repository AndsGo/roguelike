import { describe, it, expect, beforeEach } from 'vitest';
import { BattleSystem } from '../../src/systems/BattleSystem';
import { Hero } from '../../src/entities/Hero';
import { Enemy } from '../../src/entities/Enemy';
import { EventBus } from '../../src/systems/EventBus';
import { RelicSystem } from '../../src/systems/RelicSystem';
import { SeededRNG } from '../../src/utils/rng';
import { HeroData, HeroState, EnemyData } from '../../src/types';
import Phaser from 'phaser';

function mockScene(): Phaser.Scene {
  return new Phaser.Scene() as Phaser.Scene;
}

const heroData: HeroData = {
  id: 'warrior', name: 'W', role: 'tank',
  baseStats: {
    maxHp: 200, hp: 200, attack: 30, defense: 15,
    magicPower: 10, magicResist: 10, speed: 80,
    attackSpeed: 1.0, attackRange: 100, critChance: 0.1, critDamage: 1.5,
  },
  scalingPerLevel: { maxHp: 10, attack: 2, defense: 1, magicPower: 0, magicResist: 1 },
  skills: [], spriteKey: 'warrior',
};

const heroState: HeroState = {
  id: 'warrior', level: 1, exp: 0, currentHp: 200,
  equipment: { weapon: null, armor: null, accessory: null },
};

const enemyData: EnemyData = {
  id: 'slime', name: 'S', role: 'tank',
  baseStats: {
    maxHp: 150, hp: 150, attack: 20, defense: 10,
    magicPower: 5, magicResist: 5, speed: 70,
    attackSpeed: 1.0, attackRange: 100, critChance: 0.05, critDamage: 1.5,
  },
  scalingPerLevel: { maxHp: 5, attack: 1, defense: 1, magicPower: 0, magicResist: 0 },
  skills: [], spriteKey: 'slime', goldReward: 10, expReward: 5,
};

const enemyData2: EnemyData = {
  id: 'goblin', name: 'G', role: 'melee_dps',
  baseStats: {
    maxHp: 100, hp: 100, attack: 25, defense: 8,
    magicPower: 3, magicResist: 3, speed: 90,
    attackSpeed: 1.2, attackRange: 80, critChance: 0.1, critDamage: 1.5,
  },
  scalingPerLevel: { maxHp: 5, attack: 1, defense: 1, magicPower: 0, magicResist: 0 },
  skills: [], spriteKey: 'goblin', goldReward: 15, expReward: 8,
};

describe('Gauntlet wave management', () => {
  let scene: Phaser.Scene;
  let bs: BattleSystem;

  beforeEach(() => {
    scene = mockScene();
    bs = new BattleSystem(new SeededRNG(42));
    EventBus.getInstance().reset();
    RelicSystem.reset();
  });

  it('single-wave battle defaults to 1 wave', () => {
    const heroes = [new Hero(scene, 100, 200, heroData, { ...heroState })];
    const enemies = [new Enemy(scene, 600, 200, enemyData, 1)];
    bs.setUnits(heroes, enemies);

    expect(bs.getTotalWaves()).toBe(1);
    expect(bs.getWaveIndex()).toBe(0);
    expect(bs.hasMoreWaves()).toBe(false);
  });

  it('multi-wave battle reports correct wave count', () => {
    const heroes = [new Hero(scene, 100, 200, heroData, { ...heroState })];
    const enemies = [new Enemy(scene, 600, 200, enemyData, 1)];
    bs.setUnits(heroes, enemies);
    bs.setWaveData(
      [[{ id: 'goblin', level: 2 }], [{ id: 'slime', level: 3 }]],
      () => {},
    );

    expect(bs.getTotalWaves()).toBe(3);
    expect(bs.getWaveIndex()).toBe(0);
    expect(bs.hasMoreWaves()).toBe(true);
  });

  it('setUnits resets wave state from previous battle', () => {
    const heroes = [new Hero(scene, 100, 200, heroData, { ...heroState })];
    const enemies = [new Enemy(scene, 600, 200, enemyData, 1)];
    bs.setUnits(heroes, enemies);
    bs.setWaveData(
      [[{ id: 'goblin', level: 2 }]],
      () => {},
    );
    expect(bs.getTotalWaves()).toBe(2);

    // Re-setting units resets wave data
    bs.setUnits(heroes, enemies);
    expect(bs.getTotalWaves()).toBe(1);
    expect(bs.hasMoreWaves()).toBe(false);
  });

  it('wave transition callback fires when wave clears', () => {
    const heroes = [new Hero(scene, 100, 200, heroData, { ...heroState })];
    const enemies = [new Enemy(scene, 600, 200, enemyData, 1)];
    bs.setUnits(heroes, enemies);

    let transitionCalled = false;
    let receivedWave = -1;
    let receivedTotal = -1;
    bs.setWaveData(
      [[{ id: 'goblin', level: 2 }]],
      (waveIdx, total) => {
        transitionCalled = true;
        receivedWave = waveIdx;
        receivedTotal = total;
      },
    );

    // Kill all enemies to trigger wave end
    for (const e of enemies) {
      e.currentHp = 0;
      e.isAlive = false;
    }

    // Force into combat phase and run update to trigger checkBattleEnd
    (bs as any).internalPhase = 'combat';
    bs.update(16);

    expect(transitionCalled).toBe(true);
    expect(receivedWave).toBe(1);
    expect(receivedTotal).toBe(2);
  });

  it('does not emit battle:end when transitioning waves', () => {
    const heroes = [new Hero(scene, 100, 200, heroData, { ...heroState })];
    const enemies = [new Enemy(scene, 600, 200, enemyData, 1)];
    bs.setUnits(heroes, enemies);
    bs.setWaveData(
      [[{ id: 'goblin', level: 2 }]],
      () => {},
    );

    let battleEndCalled = false;
    EventBus.getInstance().on('battle:end', () => { battleEndCalled = true; });

    // Kill all enemies
    for (const e of enemies) {
      e.currentHp = 0;
      e.isAlive = false;
    }

    (bs as any).internalPhase = 'combat';
    bs.update(16);

    expect(battleEndCalled).toBe(false);
    expect(bs.battleState).toBe('fighting');
  });

  it('enters preparing phase after wave transition', () => {
    const heroes = [new Hero(scene, 100, 200, heroData, { ...heroState })];
    const enemies = [new Enemy(scene, 600, 200, enemyData, 1)];
    bs.setUnits(heroes, enemies);
    bs.setWaveData(
      [[{ id: 'goblin', level: 2 }]],
      () => {},
    );

    for (const e of enemies) {
      e.currentHp = 0;
      e.isAlive = false;
    }

    (bs as any).internalPhase = 'combat';
    bs.update(16);

    expect((bs as any).internalPhase).toBe('preparing');
  });

  it('replaceEnemies banks rewards and sets new enemies', () => {
    const heroes = [new Hero(scene, 100, 200, heroData, { ...heroState })];
    const enemies = [new Enemy(scene, 600, 200, enemyData, 1)];
    bs.setUnits(heroes, enemies);

    // Gold from wave 1 enemies: 10
    const newEnemies = [new Enemy(scene, 600, 200, enemyData2, 1)];
    bs.replaceEnemies(newEnemies);

    // After replace, enemies should be the new set
    expect(bs.enemies).toEqual(newEnemies);
    // Accumulated gold should include wave 1 rewards
    expect((bs as any).accumulatedGold).toBe(10);
    expect((bs as any).accumulatedExp).toBe(5);
  });

  it('accumulated rewards are included in final battle result', () => {
    const heroes = [new Hero(scene, 100, 200, heroData, { ...heroState })];
    const wave1Enemies = [new Enemy(scene, 600, 200, enemyData, 1)]; // gold=10, exp=5
    bs.setUnits(heroes, wave1Enemies);
    bs.setWaveData(
      [[{ id: 'goblin', level: 2 }]],
      () => {},
    );

    // Simulate wave 1 clear: bank rewards and replace enemies
    const wave2Enemies = [new Enemy(scene, 600, 200, enemyData2, 1)]; // gold=15, exp=8
    bs.replaceEnemies(wave2Enemies);

    // Now manually advance waveIndex past all waves so endBattle fires
    (bs as any).waveIndex = 1; // last wave

    // Kill wave 2 enemies
    for (const e of wave2Enemies) {
      e.currentHp = 0;
      e.isAlive = false;
    }

    (bs as any).internalPhase = 'combat';
    bs.update(16);

    // Should now be in settling with accumulated rewards
    const result = bs.getBattleResult();
    expect(result).toBeDefined();
    expect(result!.victory).toBe(true);
    expect(result!.goldEarned).toBe(20); // (10 + 15) * 0.8 = 20 (gauntlet scaling)
    expect(result!.expEarned).toBe(10);  // (5 + 8) * 0.8 = 10.4 → 10 (gauntlet scaling)
  });

  it('defeat does not award gold even with accumulated rewards', () => {
    const heroes = [new Hero(scene, 100, 200, heroData, { ...heroState })];
    const wave1Enemies = [new Enemy(scene, 600, 200, enemyData, 1)];
    bs.setUnits(heroes, wave1Enemies);
    bs.setWaveData(
      [[{ id: 'goblin', level: 2 }]],
      () => {},
    );

    // Bank wave 1 rewards
    bs.replaceEnemies([new Enemy(scene, 600, 200, enemyData2, 1)]);
    (bs as any).waveIndex = 1;

    // Kill all heroes
    for (const h of heroes) {
      h.currentHp = 0;
      h.isAlive = false;
    }

    (bs as any).internalPhase = 'combat';
    bs.update(16);

    const result = bs.getBattleResult();
    expect(result).toBeDefined();
    expect(result!.victory).toBe(false);
    expect(result!.goldEarned).toBe(0);
    expect(result!.expEarned).toBe(0);
  });
});
