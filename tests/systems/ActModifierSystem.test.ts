import { describe, it, expect, beforeEach } from 'vitest';
import { ActModifierSystem } from '../../src/systems/ActModifierSystem';
import { createMockUnit } from '../mocks/phaser';

describe('ActModifierSystem', () => {
  // ===== 工具函数 =====
  function makeHeroes(count: number, overrides: Record<string, any> = {}) {
    return Array.from({ length: count }, (_, i) =>
      createMockUnit({ unitId: `hero_${i}`, isHero: true, currentHp: 500, maxHp: 500, ...overrides })
    );
  }
  function makeEnemies(count: number, overrides: Record<string, any> = {}) {
    return Array.from({ length: count }, (_, i) =>
      createMockUnit({ unitId: `enemy_${i}`, isHero: false, currentHp: 400, maxHp: 400, ...overrides })
    );
  }

  // ===== Forest (Act 0) =====
  describe('Forest (Act 0) — 周期治疗', () => {
    let system: ActModifierSystem;

    beforeEach(() => {
      system = new ActModifierSystem(0);
    });

    it('15s 后治疗存活英雄 5% maxHp', () => {
      const heroes = makeHeroes(2);
      heroes[0].currentHp = 400;
      heroes[1].currentHp = 300;
      system.tick(15000, heroes as any[], []);
      // 5% of 500 = 25
      expect(heroes[0].currentHp).toBe(425);
      expect(heroes[1].currentHp).toBe(325);
    });

    it('不满 15s 不触发治疗', () => {
      const heroes = makeHeroes(1);
      heroes[0].currentHp = 400;
      system.tick(14999, heroes as any[], []);
      expect(heroes[0].currentHp).toBe(400);
    });

    it('跳过死亡英雄', () => {
      const heroes = makeHeroes(2);
      heroes[0].currentHp = 400;
      heroes[1].isAlive = false;
      heroes[1].currentHp = 0;
      system.tick(15000, heroes as any[], []);
      expect(heroes[0].currentHp).toBe(425);
      expect(heroes[1].currentHp).toBe(0); // 不变
    });

    it('治疗不超过 maxHp', () => {
      const heroes = makeHeroes(1);
      heroes[0].currentHp = 490; // 490 + 25 = 515 > 500
      system.tick(15000, heroes as any[], []);
      expect(heroes[0].currentHp).toBe(500);
    });

    it('不治疗敌人', () => {
      const enemies = makeEnemies(1);
      enemies[0].currentHp = 300;
      system.tick(15000, [], enemies as any[]);
      expect(enemies[0].currentHp).toBe(300);
    });

    it('累计 delta 可触发多次', () => {
      const heroes = makeHeroes(1);
      heroes[0].currentHp = 400;
      // 两次 tick 各 10s，合计触发一次
      system.tick(10000, heroes as any[], []);
      expect(heroes[0].currentHp).toBe(400);
      system.tick(5000, heroes as any[], []);
      expect(heroes[0].currentHp).toBe(425);
    });
  });

  // ===== Volcano (Act 1) =====
  describe('Volcano (Act 1) — 静止灼烧', () => {
    let system: ActModifierSystem;

    beforeEach(() => {
      system = new ActModifierSystem(1);
    });

    it('静止单位 2s 后受 2% maxHp 伤害', () => {
      const heroes = makeHeroes(1);
      const enemies = makeEnemies(1);
      system.applyBattleStart(heroes as any[], enemies as any[]);
      // 不移动
      system.tick(2000, heroes as any[], enemies as any[]);
      // 2% of 500 = 10, 2% of 400 = 8
      expect(heroes[0].currentHp).toBe(490);
      expect(enemies[0].currentHp).toBe(392);
    });

    it('移动单位不受伤害 (移动 >= 5px)', () => {
      const heroes = makeHeroes(1);
      const enemies = makeEnemies(1);
      system.applyBattleStart(heroes as any[], enemies as any[]);
      // 移动
      heroes[0].x += 10;
      enemies[0].x += 6;
      system.tick(2000, heroes as any[], enemies as any[]);
      expect(heroes[0].currentHp).toBe(500);
      expect(enemies[0].currentHp).toBe(400);
    });

    it('移动不足 5px 仍受伤害', () => {
      const heroes = makeHeroes(1);
      system.applyBattleStart(heroes as any[], []);
      heroes[0].x += 4; // < 5
      system.tick(2000, heroes as any[], []);
      expect(heroes[0].currentHp).toBe(490);
    });

    it('跳过死亡单位', () => {
      const heroes = makeHeroes(1);
      heroes[0].isAlive = false;
      heroes[0].currentHp = 0;
      system.applyBattleStart(heroes as any[], []);
      system.tick(2000, heroes as any[], []);
      expect(heroes[0].currentHp).toBe(0);
    });

    it('最小伤害为 1', () => {
      // maxHp 很低, 2% 向下取整可能为 0 → Math.max(1, ...)
      const heroes = [createMockUnit({
        unitId: 'tiny', maxHp: 30, currentHp: 30,
        stats: { maxHp: 30, hp: 30, attack: 10, defense: 5, magicPower: 0, magicResist: 5, speed: 100, attackSpeed: 1, attackRange: 100, critChance: 0.1, critDamage: 1.5 },
      })];
      system.applyBattleStart(heroes as any[], []);
      system.tick(2000, heroes as any[], []);
      // 2% of 30 = 0.6, floor = 0, max(1,0) = 1
      expect(heroes[0].currentHp).toBe(29);
    });
  });

  // ===== Abyss (Act 2) =====
  describe('Abyss (Act 2) — 攻击范围缩减', () => {
    let system: ActModifierSystem;

    beforeEach(() => {
      system = new ActModifierSystem(2);
    });

    it('10s 后所有存活单位攻击范围 -20', () => {
      const heroes = makeHeroes(1, { stats: { maxHp: 500, hp: 500, attack: 50, defense: 20, magicPower: 0, magicResist: 10, speed: 100, attackSpeed: 1, attackRange: 120, critChance: 0.1, critDamage: 1.5 } });
      const enemies = makeEnemies(1, { stats: { maxHp: 400, hp: 400, attack: 40, defense: 15, magicPower: 0, magicResist: 10, speed: 80, attackSpeed: 1, attackRange: 100, critChance: 0.1, critDamage: 1.5 } });
      system.tick(10000, heroes as any[], enemies as any[]);
      expect(heroes[0].currentStats.attackRange).toBe(100); // 120 - 20
      expect(enemies[0].currentStats.attackRange).toBe(80);  // 100 - 20
    });

    it('攻击范围不低于 20', () => {
      const heroes = makeHeroes(1, { stats: { maxHp: 500, hp: 500, attack: 50, defense: 20, magicPower: 0, magicResist: 10, speed: 100, attackSpeed: 1, attackRange: 30, critChance: 0.1, critDamage: 1.5 } });
      system.tick(10000, heroes as any[], []);
      expect(heroes[0].currentStats.attackRange).toBe(20); // max(20, 30-20)
    });

    it('跳过死亡单位', () => {
      const heroes = makeHeroes(1);
      heroes[0].isAlive = false;
      const initialRange = heroes[0].currentStats.attackRange;
      system.tick(10000, heroes as any[], []);
      expect(heroes[0].currentStats.attackRange).toBe(initialRange);
    });

    it('不满 10s 不触发缩减', () => {
      const heroes = makeHeroes(1);
      const initialRange = heroes[0].currentStats.attackRange;
      system.tick(9999, heroes as any[], []);
      expect(heroes[0].currentStats.attackRange).toBe(initialRange);
    });
  });

  // ===== getActDescription =====
  describe('getActDescription', () => {
    it('Act 0 返回森林描述', () => {
      expect(new ActModifierSystem(0).getActDescription()).toBe('森林祝福: 每15秒全体治疗5%');
    });
    it('Act 1 返回火山描述', () => {
      expect(new ActModifierSystem(1).getActDescription()).toBe('火焰大地: 静止单位受灼烧伤害');
    });
    it('Act 2 返回深渊描述', () => {
      expect(new ActModifierSystem(2).getActDescription()).toBe('深渊黑暗: 周期性降低攻击范围');
    });
    it('无效 act 返回空字符串', () => {
      expect(new ActModifierSystem(99).getActDescription()).toBe('');
    });
  });

  // ===== 无效 act index =====
  it('无效 act index 时 tick 不执行任何操作', () => {
    const system = new ActModifierSystem(5);
    const heroes = makeHeroes(1);
    heroes[0].currentHp = 400;
    const initialRange = heroes[0].currentStats.attackRange;
    system.tick(20000, heroes as any[], []);
    expect(heroes[0].currentHp).toBe(400);
    expect(heroes[0].currentStats.attackRange).toBe(initialRange);
  });
});
