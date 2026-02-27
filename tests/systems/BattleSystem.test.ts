import { describe, it, expect, beforeEach } from 'vitest';
import { BattleSystem } from '../../src/systems/BattleSystem';
import { TargetingSystem } from '../../src/systems/TargetingSystem';
import { EventBus } from '../../src/systems/EventBus';
import { SeededRNG } from '../../src/utils/rng';
import { UnitStats, HeroData, HeroState, EnemyData } from '../../src/types';
import { Hero } from '../../src/entities/Hero';
import { Enemy } from '../../src/entities/Enemy';
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

describe('BattleSystem', () => {
  let bs: BattleSystem;
  let rng: SeededRNG;
  let scene: Phaser.Scene;

  beforeEach(() => {
    rng = new SeededRNG(42);
    bs = new BattleSystem(rng);
    scene = mockScene();
    EventBus.getInstance().reset();
  });

  describe('setUnits and initial state', () => {
    it('starts in fighting state', () => {
      const heroes = [new Hero(scene, 100, 200, heroData, { ...heroState })];
      const enemies = [new Enemy(scene, 600, 200, enemyData, 1)];
      bs.setUnits(heroes, enemies);
      expect(bs.battleState).toBe('fighting');
    });

    it('emits battle:start event', () => {
      let emitted = false;
      EventBus.getInstance().on('battle:start', () => { emitted = true; });

      bs.setUnits(
        [new Hero(scene, 100, 200, heroData, { ...heroState })],
        [new Enemy(scene, 600, 200, enemyData, 1)],
      );
      expect(emitted).toBe(true);
    });

    it('resets threat tracking', () => {
      TargetingSystem.registerThreat('a', 'b', 50);
      expect(TargetingSystem.getThreatLevel('a')).toBe(50);

      bs.setUnits([], []);
      expect(TargetingSystem.getThreatLevel('a')).toBe(0);
    });
  });

  describe('update phases', () => {
    it('does nothing when state is not fighting', () => {
      bs.battleState = 'victory';
      bs.update(16); // should not throw
    });

    it('stays in fighting during prepare phase', () => {
      bs.setUnits([], []);
      bs.update(200);
      expect(bs.battleState).toBe('fighting');
    });
  });

  describe('speed multiplier', () => {
    it('defaults to 1x', () => {
      expect(bs.speedMultiplier).toBe(1);
    });

    it('can be set to 2x and 3x', () => {
      bs.speedMultiplier = 2;
      expect(bs.speedMultiplier).toBe(2);
      bs.speedMultiplier = 3;
      expect(bs.speedMultiplier).toBe(3);
    });
  });

  describe('battle end conditions', () => {
    it('defeat when all heroes die', () => {
      const hero = new Hero(scene, 100, 200, heroData, { ...heroState });
      const enemy = new Enemy(scene, 600, 200, enemyData, 1);
      bs.setUnits([hero], [enemy]);

      hero.isAlive = false;

      // Skip prepare (500ms) + enter combat + settle (500ms)
      bs.update(600);
      bs.update(16);
      bs.update(600);
      expect(bs.battleState).toBe('defeat');
    });

    it('victory when all enemies die', () => {
      const hero = new Hero(scene, 100, 200, heroData, { ...heroState });
      const enemy = new Enemy(scene, 600, 200, enemyData, 1);
      bs.setUnits([hero], [enemy]);

      enemy.isAlive = false;

      bs.update(600);
      bs.update(16);
      bs.update(600);
      expect(bs.battleState).toBe('victory');
    });

    it('battle result contains gold and exp on victory', () => {
      const hero = new Hero(scene, 100, 200, heroData, { ...heroState });
      const enemy = new Enemy(scene, 600, 200, enemyData, 1);
      bs.setUnits([hero], [enemy]);

      enemy.isAlive = false;
      bs.update(600);
      bs.update(16);
      bs.update(600);

      const result = bs.getBattleResult();
      expect(result).toBeDefined();
      expect(result!.victory).toBe(true);
      expect(result!.goldEarned).toBe(10);
      expect(result!.expEarned).toBe(5);
      expect(result!.survivors).toContain('warrior');
    });
  });

  describe('reward calculations', () => {
    it('sums gold from multiple enemies', () => {
      const e1 = new Enemy(scene, 600, 200, enemyData, 1);
      const e2 = new Enemy(scene, 650, 200, enemyData2, 1);
      bs.setUnits([], [e1, e2]);
      expect(bs.getTotalGoldReward()).toBe(25);
      expect(bs.getTotalExpReward()).toBe(13);
    });
  });

  describe('getBattleResult', () => {
    it('returns null before battle ends', () => {
      bs.setUnits([], []);
      expect(bs.getBattleResult()).toBeNull();
    });
  });

  describe('skill interrupt on stun', () => {
    it('emits skill:interrupt when stunned unit has a ready skill', () => {
      // Place hero and enemy at same position so no movement occurs
      const h1 = new Hero(scene, 200, 200, heroData, { ...heroState });
      const e1 = new Enemy(scene, 200, 200, enemyData, 1);
      // Kill the enemy so only the hero is processed (avoids movement issues)
      e1.isAlive = false;
      bs.setUnits([h1], [e1]);

      // Give the hero a skill with 0 cooldown (ready)
      h1.skills = [{ id: 'test_skill', name: 'Test', description: '', cooldown: 5, damageType: 'physical', targetType: 'enemy', baseDamage: 50, scalingStat: 'attack', scalingRatio: 1.0, range: 200 }];
      h1.skillCooldowns.set('test_skill', 0);

      // Stun the hero
      h1.statusEffects.push({
        id: 'stun_1', type: 'stun', name: 'stun', duration: 5, value: 0,
      });

      const events: { unitId: string; skillId: string; reason: string }[] = [];
      const eb = EventBus.getInstance();
      const listener = (data: { unitId: string; skillId: string; reason: string }) => {
        events.push(data);
      };
      eb.on('skill:interrupt', listener);

      // Advance past prepare phase (500ms) then run combat tick
      bs.update(600);
      bs.update(100);

      eb.off('skill:interrupt', listener);

      expect(events.length).toBeGreaterThanOrEqual(1);
      expect(events[0].unitId).toBe(h1.unitId);
      expect(events[0].skillId).toBe('test_skill');
      expect(events[0].reason).toBe('stun');
    });

    it('does not emit skill:interrupt when no skills are ready', () => {
      const h1 = new Hero(scene, 200, 200, heroData, { ...heroState });
      const e1 = new Enemy(scene, 200, 200, enemyData, 1);
      e1.isAlive = false;
      bs.setUnits([h1], [e1]);

      // Give the hero a skill on cooldown
      h1.skills = [{ id: 'test_skill', name: 'Test', description: '', cooldown: 5, damageType: 'physical', targetType: 'enemy', baseDamage: 50, scalingStat: 'attack', scalingRatio: 1.0, range: 200 }];
      h1.skillCooldowns.set('test_skill', 3); // still on cooldown

      // Stun the hero
      h1.statusEffects.push({
        id: 'stun_1', type: 'stun', name: 'stun', duration: 5, value: 0,
      });

      const events: any[] = [];
      const eb = EventBus.getInstance();
      const listener = (data: any) => events.push(data);
      eb.on('skill:interrupt', listener);

      // Advance past prepare phase then run combat tick
      bs.update(600);
      bs.update(100);

      eb.off('skill:interrupt', listener);

      expect(events.length).toBe(0);
    });
  });

  describe('TargetingSystem.beginFrame', () => {
    it('clears distance cache without error', () => {
      TargetingSystem.beginFrame();
      // Verify it can be called multiple times
      TargetingSystem.beginFrame();
    });

    it('cachedDistance is symmetric', () => {
      const h = new Hero(scene, 100, 200, heroData, { ...heroState });
      const e = new Enemy(scene, 300, 200, enemyData, 1);

      TargetingSystem.beginFrame();
      const d1 = TargetingSystem.cachedDistance(h, e);
      const d2 = TargetingSystem.cachedDistance(e, h);
      expect(d1).toBe(d2);
      expect(d1).toBeCloseTo(200, 0);
    });
  });
});
