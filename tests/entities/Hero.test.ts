import { describe, it, expect, beforeEach } from 'vitest';
import { createMockLocalStorage } from '../mocks/phaser';

const mockStorage = createMockLocalStorage();
Object.defineProperty(globalThis, 'localStorage', { value: mockStorage, writable: true });

import Phaser from 'phaser';
import { Hero } from '../../src/entities/Hero';
import { HeroData, HeroState, UnitStats } from '../../src/types';
import { EventBus } from '../../src/systems/EventBus';

function makeHeroData(overrides?: Partial<HeroData>): HeroData {
  return {
    id: 'test_hero',
    name: '测试英雄',
    role: 'melee_dps',
    element: 'fire',
    race: 'human',
    class: 'warrior',
    baseStats: {
      maxHp: 500,
      hp: 500,
      attack: 50,
      defense: 20,
      magicPower: 10,
      magicResist: 15,
      speed: 100,
      attackSpeed: 1.0,
      attackRange: 40,
      critChance: 0.1,
      critDamage: 1.5,
    },
    scalingPerLevel: {
      maxHp: 50,
      attack: 5,
      defense: 3,
      magicPower: 2,
      magicResist: 2,
    },
    skills: ['fireball'],
    spriteKey: 'hero_test',
    ...overrides,
  } as HeroData;
}

function makeHeroState(overrides?: Partial<HeroState>): HeroState {
  return {
    id: 'test_hero',
    level: 1,
    exp: 0,
    currentHp: 500,
    equipment: {
      weapon: null,
      armor: null,
      accessory: null,
    },
    ...overrides,
  };
}

describe('Hero', () => {
  beforeEach(() => {
    EventBus.getInstance().reset();
  });

  describe('calculateStats', () => {
    it('returns base stats at level 1', () => {
      const data = makeHeroData();
      const state = makeHeroState({ level: 1 });
      const stats = Hero.calculateStats(data, state);

      expect(stats.maxHp).toBe(500);
      expect(stats.attack).toBe(50);
      expect(stats.defense).toBe(20);
      expect(stats.magicPower).toBe(10);
      expect(stats.magicResist).toBe(15);
    });

    it('scales stats with level', () => {
      const data = makeHeroData();
      const state = makeHeroState({ level: 5 });
      const stats = Hero.calculateStats(data, state);

      // base + scaling * (level - 1) = 500 + 50 * 4 = 700
      expect(stats.maxHp).toBe(700);
      // 50 + 5 * 4 = 70
      expect(stats.attack).toBe(70);
      // 20 + 3 * 4 = 32
      expect(stats.defense).toBe(32);
      // 10 + 2 * 4 = 18
      expect(stats.magicPower).toBe(18);
    });

    it('non-scaling stats remain constant', () => {
      const data = makeHeroData();
      const state = makeHeroState({ level: 10 });
      const stats = Hero.calculateStats(data, state);

      expect(stats.speed).toBe(100);
      expect(stats.attackSpeed).toBe(1.0);
      expect(stats.attackRange).toBe(40);
      expect(stats.critChance).toBe(0.1);
      expect(stats.critDamage).toBe(1.5);
    });

    it('applies weapon equipment bonus', () => {
      const data = makeHeroData();
      const state = makeHeroState({
        level: 1,
        equipment: {
          weapon: {
            id: 'sword1',
            name: 'Test Sword',
            slot: 'weapon',
            rarity: 'common',
            stats: { attack: 15, critChance: 0.05 },
            price: 100,
          } as any,
          armor: null,
          accessory: null,
        },
      });
      const stats = Hero.calculateStats(data, state);

      expect(stats.attack).toBe(65); // 50 + 15
      expect(stats.critChance).toBeCloseTo(0.15); // 0.1 + 0.05
    });

    it('applies multiple equipment bonuses', () => {
      const data = makeHeroData();
      const state = makeHeroState({
        level: 1,
        equipment: {
          weapon: {
            id: 'sword1',
            name: 'Sword',
            slot: 'weapon',
            rarity: 'common',
            stats: { attack: 10 },
            price: 100,
          } as any,
          armor: {
            id: 'armor1',
            name: 'Armor',
            slot: 'armor',
            rarity: 'common',
            stats: { defense: 8, maxHp: 100 },
            price: 100,
          } as any,
          accessory: {
            id: 'ring1',
            name: 'Ring',
            slot: 'accessory',
            rarity: 'rare',
            stats: { magicPower: 5, speed: 10 },
            price: 200,
          } as any,
        },
      });
      const stats = Hero.calculateStats(data, state);

      expect(stats.attack).toBe(60);     // 50 + 10
      expect(stats.defense).toBe(28);    // 20 + 8
      expect(stats.maxHp).toBe(600);     // 500 + 100
      expect(stats.magicPower).toBe(15); // 10 + 5
      expect(stats.speed).toBe(110);     // 100 + 10
    });

    it('combines level scaling with equipment', () => {
      const data = makeHeroData();
      const state = makeHeroState({
        level: 5,
        equipment: {
          weapon: {
            id: 'sword1',
            name: 'Sword',
            slot: 'weapon',
            rarity: 'common',
            stats: { attack: 10 },
            price: 100,
          } as any,
          armor: null,
          accessory: null,
        },
      });
      const stats = Hero.calculateStats(data, state);

      // attack = base(50) + scaling(5*4) + equip(10) = 80
      expect(stats.attack).toBe(80);
    });
  });

  describe('constructor', () => {
    it('creates a hero with correct identity', () => {
      const scene = new Phaser.Scene();
      const data = makeHeroData();
      const state = makeHeroState();
      const hero = new Hero(scene, 100, 200, data, state);

      expect(hero.unitId).toBe('test_hero');
      expect(hero.unitName).toBe('测试英雄');
      expect(hero.isHero).toBe(true);
      expect(hero.element).toBe('fire');
      expect(hero.role).toBe('melee_dps');
    });

    it('sets currentHp from heroState', () => {
      const scene = new Phaser.Scene();
      const data = makeHeroData();
      const state = makeHeroState({ currentHp: 300 });
      const hero = new Hero(scene, 100, 200, data, state);

      expect(hero.currentHp).toBe(300);
    });

    it('exposes heroData and heroState', () => {
      const scene = new Phaser.Scene();
      const data = makeHeroData();
      const state = makeHeroState();
      const hero = new Hero(scene, 100, 200, data, state);

      expect(hero.heroData).toBe(data);
      expect(hero.heroState).toBe(state);
    });

    it('level getter returns heroState level', () => {
      const scene = new Phaser.Scene();
      const data = makeHeroData();
      const state = makeHeroState({ level: 7 });
      const hero = new Hero(scene, 100, 200, data, state);

      expect(hero.level).toBe(7);
    });
  });
});
