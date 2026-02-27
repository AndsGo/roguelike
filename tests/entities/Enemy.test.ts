import { describe, it, expect, beforeEach } from 'vitest';
import { createMockLocalStorage } from '../mocks/phaser';

const mockStorage = createMockLocalStorage();
Object.defineProperty(globalThis, 'localStorage', { value: mockStorage, writable: true });

import Phaser from 'phaser';
import { Enemy } from '../../src/entities/Enemy';
import { EnemyData } from '../../src/types';
import { EventBus } from '../../src/systems/EventBus';

function makeEnemyData(overrides?: Partial<EnemyData>): EnemyData {
  return {
    id: 'test_enemy',
    name: '测试敌人',
    role: 'melee_dps',
    element: undefined,
    race: 'beast',
    baseStats: {
      maxHp: 200,
      hp: 200,
      attack: 30,
      defense: 10,
      magicPower: 0,
      magicResist: 5,
      speed: 80,
      attackSpeed: 1.0,
      attackRange: 40,
      critChance: 0.05,
      critDamage: 1.5,
    },
    scalingPerLevel: {
      maxHp: 30,
      attack: 3,
      defense: 2,
      magicPower: 0,
      magicResist: 1,
    },
    skills: [],
    spriteKey: 'enemy_test',
    goldReward: 10,
    expReward: 25,
    isBoss: false,
    ...overrides,
  } as EnemyData;
}

describe('Enemy', () => {
  beforeEach(() => {
    EventBus.getInstance().reset();
  });

  describe('calculateStats', () => {
    it('returns base stats at level 1', () => {
      const data = makeEnemyData();
      const stats = Enemy.calculateStats(data, 1);

      expect(stats.maxHp).toBe(200);
      expect(stats.attack).toBe(30);
      expect(stats.defense).toBe(10);
    });

    it('scales with level', () => {
      const data = makeEnemyData();
      const stats = Enemy.calculateStats(data, 5);

      // 200 + 30 * 4 = 320
      expect(stats.maxHp).toBe(320);
      // 30 + 3 * 4 = 42
      expect(stats.attack).toBe(42);
      // 10 + 2 * 4 = 18
      expect(stats.defense).toBe(18);
    });

    it('non-scaling stats remain constant', () => {
      const data = makeEnemyData();
      const stats = Enemy.calculateStats(data, 10);

      expect(stats.speed).toBe(80);
      expect(stats.attackSpeed).toBe(1.0);
      expect(stats.attackRange).toBe(40);
      expect(stats.critChance).toBe(0.05);
      expect(stats.critDamage).toBe(1.5);
    });

    it('hp matches maxHp', () => {
      const data = makeEnemyData();
      const stats = Enemy.calculateStats(data, 3);

      expect(stats.hp).toBe(stats.maxHp);
    });
  });

  describe('constructor', () => {
    it('creates an enemy with correct identity', () => {
      const scene = new Phaser.Scene();
      const data = makeEnemyData();
      const enemy = new Enemy(scene, 500, 300, data, 1);

      expect(enemy.unitId).toBe('test_enemy');
      expect(enemy.unitName).toBe('测试敌人');
      expect(enemy.isHero).toBe(false);
      expect(enemy.role).toBe('melee_dps');
    });

    it('stores enemyData and level', () => {
      const scene = new Phaser.Scene();
      const data = makeEnemyData();
      const enemy = new Enemy(scene, 500, 300, data, 3);

      expect(enemy.enemyData).toBe(data);
      expect(enemy.level).toBe(3);
    });

    it('stores gold and exp rewards', () => {
      const scene = new Phaser.Scene();
      const data = makeEnemyData({ goldReward: 15, expReward: 40 });
      const enemy = new Enemy(scene, 500, 300, data, 1);

      expect(enemy.goldReward).toBe(15);
      expect(enemy.expReward).toBe(40);
    });

    it('sets currentHp to calculated maxHp', () => {
      const scene = new Phaser.Scene();
      const data = makeEnemyData();
      const enemy = new Enemy(scene, 500, 300, data, 1);

      expect(enemy.currentHp).toBe(200);
    });

    it('handles element', () => {
      const scene = new Phaser.Scene();
      const data = makeEnemyData({ element: 'fire' });
      const enemy = new Enemy(scene, 500, 300, data, 1);

      expect(enemy.element).toBe('fire');
    });

    it('boss enemy gets boss status', () => {
      const scene = new Phaser.Scene();
      const data = makeEnemyData({ isBoss: true });
      const enemy = new Enemy(scene, 500, 300, data, 1);

      expect(enemy.isBoss).toBe(true);
    });

    it('non-boss enemy has isBoss false', () => {
      const scene = new Phaser.Scene();
      const data = makeEnemyData({ isBoss: false });
      const enemy = new Enemy(scene, 500, 300, data, 1);

      expect(enemy.isBoss).toBe(false);
    });
  });
});
