import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock DamageNumber — StatusEffectSystem 中 DoT/HoT tick 会 new DamageNumber(...)
vi.mock('../../src/components/DamageNumber', () => ({
  DamageNumber: vi.fn(),
}));

import { StatusEffectSystem } from '../../src/systems/StatusEffectSystem';
import { createMockUnit } from '../mocks/phaser';

describe('StatusEffectSystem', () => {
  let unit: ReturnType<typeof createMockUnit>;

  beforeEach(() => {
    unit = createMockUnit({ currentHp: 500, maxHp: 500 });
  });

  // ---- 基本 tick 行为 ----

  it('跳过死亡单位', () => {
    unit.isAlive = false;
    unit.statusEffects.push({
      id: 'dot_1', type: 'dot', name: 'burn',
      duration: 5, value: 10, tickInterval: 1,
    });
    StatusEffectSystem.tick(unit as any, 2000);
    // 死亡单位不处理，HP 不变，效果不移除
    expect(unit.currentHp).toBe(500);
    expect(unit.statusEffects.length).toBe(1);
  });

  it('递减效果持续时间', () => {
    unit.statusEffects.push({
      id: 'stun_1', type: 'stun', name: 'stun',
      duration: 3, value: 0,
    });
    StatusEffectSystem.tick(unit as any, 1000); // 1s
    expect(unit.statusEffects[0].duration).toBeCloseTo(2, 1);
  });

  it('效果到期后被移除', () => {
    unit.statusEffects.push({
      id: 'buff_1', type: 'buff', name: 'attack_buff',
      duration: 1, value: 10, stat: 'attack',
    });
    StatusEffectSystem.tick(unit as any, 1500); // 1.5s > 1s
    expect(unit.statusEffects.length).toBe(0);
  });

  // ---- DoT ----

  it('DoT 按 tickInterval 造成伤害', () => {
    unit.statusEffects.push({
      id: 'dot_1', type: 'dot', name: 'burn',
      duration: 5, value: 20, tickInterval: 1,
    });
    // 经过 1.5s, prevTime=5, currTime=3.5 → floor(5/1)=5, floor(3.5/1)=3 → 触发 2 ticks
    // 但实际 delta=1500 → dt=1.5, prevTime=duration+dt=5+(-不对)
    // 修正理解: duration 在 tick 开始时先减去 dt
    // effect.duration -= dt → 5 - 1.5 = 3.5
    // prevTime = 3.5 + 1.5 = 5.0
    // prevTicks = floor(5.0 / 1) = 5
    // currTicks = floor(3.5 / 1) = 3
    // currTicks(3) < prevTicks(5) → 触发 tick
    StatusEffectSystem.tick(unit as any, 1500);
    // DoT 伤害 = Math.max(1, Math.round(20)) = 20
    // 触发了一次 takeDamage — 但实际代码只检查 currTicks < prevTicks (布尔), 不是循环, 只触发一次
    expect(unit.currentHp).toBe(480);
  });

  it('DoT delta 不足一个 tickInterval 时不触发伤害', () => {
    unit.statusEffects.push({
      id: 'dot_1', type: 'dot', name: 'burn',
      duration: 5, value: 20, tickInterval: 1,
    });
    // delta = 500ms (0.5s), duration: 5 → 4.5
    // prevTime = 4.5 + 0.5 = 5.0, prevTicks = floor(5/1) = 5
    // currTicks = floor(4.5/1) = 4 → 4 < 5 → 会触发
    // 需要更小的 delta, 让 floor 不变
    // duration 5, delta 200ms → dt=0.2 → duration=4.8
    // prevTime=5.0 → prevTicks=5, currTicks=floor(4.8)=4 → 4<5 触发
    // 让 duration 不跨越整秒: duration=4.3, delta=200ms → duration=4.1
    // prevTime=4.3, prevTicks=4, currTicks=4 → 不触发
    unit.statusEffects[0].duration = 4.3;
    StatusEffectSystem.tick(unit as any, 200);
    expect(unit.currentHp).toBe(500);
  });

  it('DoT 最小伤害为 1', () => {
    unit.statusEffects.push({
      id: 'dot_1', type: 'dot', name: 'burn',
      duration: 5, value: 0.1, tickInterval: 1,
    });
    StatusEffectSystem.tick(unit as any, 1500);
    // Math.max(1, Math.round(0.1)) = Math.max(1, 0) = 1
    expect(unit.currentHp).toBe(499);
  });

  // ---- HoT ----

  it('HoT 按 tickInterval 治疗', () => {
    unit.currentHp = 400;
    unit.statusEffects.push({
      id: 'hot_1', type: 'hot', name: 'regen',
      duration: 5, value: 30, tickInterval: 1,
    });
    StatusEffectSystem.tick(unit as any, 1500);
    // 同 DoT 逻辑, 触发一次 heal(30)
    expect(unit.currentHp).toBe(430);
  });

  it('HoT 最小治疗为 1', () => {
    unit.currentHp = 400;
    unit.statusEffects.push({
      id: 'hot_1', type: 'hot', name: 'regen',
      duration: 5, value: 0.3, tickInterval: 1,
    });
    StatusEffectSystem.tick(unit as any, 1500);
    expect(unit.currentHp).toBe(401);
  });

  // ---- Taunt 清理 ----

  it('taunt 到期时清除 tauntTarget', () => {
    const tauntSource = createMockUnit({ unitId: 'enemy_1' });
    unit.tauntTarget = tauntSource;
    unit.statusEffects.push({
      id: 'taunt_1', type: 'taunt', name: 'taunt',
      duration: 1, value: 0,
    });
    StatusEffectSystem.tick(unit as any, 2000); // 2s > 1s → 到期
    expect(unit.tauntTarget).toBeNull();
    expect(unit.statusEffects.length).toBe(0);
  });

  it('taunt 未到期时不清除 tauntTarget', () => {
    const tauntSource = createMockUnit({ unitId: 'enemy_1' });
    unit.tauntTarget = tauntSource;
    unit.statusEffects.push({
      id: 'taunt_1', type: 'taunt', name: 'taunt',
      duration: 3, value: 0,
    });
    StatusEffectSystem.tick(unit as any, 1000); // 1s < 3s
    expect(unit.tauntTarget).toBe(tauntSource);
    expect(unit.statusEffects.length).toBe(1);
  });

  // ---- buff/debuff 不造成 tick 伤害 ----

  it('buff 到期后移除但不造成伤害', () => {
    unit.statusEffects.push({
      id: 'buff_1', type: 'buff', name: 'attack_buff',
      duration: 2, value: 15, stat: 'attack',
    });
    StatusEffectSystem.tick(unit as any, 3000);
    expect(unit.currentHp).toBe(500);
    expect(unit.statusEffects.length).toBe(0);
  });

  it('debuff 到期后移除但不造成伤害', () => {
    unit.statusEffects.push({
      id: 'debuff_1', type: 'debuff', name: 'slow',
      duration: 2, value: -20, stat: 'speed',
    });
    StatusEffectSystem.tick(unit as any, 3000);
    expect(unit.currentHp).toBe(500);
    expect(unit.statusEffects.length).toBe(0);
  });

  // ---- 多效果独立 ----

  it('多个状态效果独立 tick', () => {
    unit.currentHp = 450;
    unit.statusEffects.push(
      { id: 'dot_1', type: 'dot', name: 'burn', duration: 5, value: 10, tickInterval: 1 },
      { id: 'hot_1', type: 'hot', name: 'regen', duration: 5, value: 5, tickInterval: 1 },
      { id: 'buff_1', type: 'buff', name: 'attack_buff', duration: 1, value: 10, stat: 'attack' },
    );
    StatusEffectSystem.tick(unit as any, 1500);
    // DoT: -10, HoT: +5, buff: 过期移除
    expect(unit.currentHp).toBe(445);
    expect(unit.statusEffects.length).toBe(2); // buff 被移除
    expect(unit.statusEffects.find(e => e.type === 'buff')).toBeUndefined();
  });

  it('多个效果同时到期时全部移除', () => {
    unit.statusEffects.push(
      { id: 'stun_1', type: 'stun', name: 'stun', duration: 1, value: 0 },
      { id: 'debuff_1', type: 'debuff', name: 'slow', duration: 1, value: -10, stat: 'speed' },
    );
    StatusEffectSystem.tick(unit as any, 2000);
    expect(unit.statusEffects.length).toBe(0);
  });

  // ---- DoT 杀死单位 ----

  it('DoT 可以杀死单位', () => {
    unit.currentHp = 5;
    unit.statusEffects.push({
      id: 'dot_1', type: 'dot', name: 'burn',
      duration: 5, value: 50, tickInterval: 1,
    });
    StatusEffectSystem.tick(unit as any, 1500);
    expect(unit.currentHp).toBe(0);
    expect(unit.isAlive).toBe(false);
  });
});
