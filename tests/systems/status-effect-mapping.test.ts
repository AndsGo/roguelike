import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock DamageNumber — executeSkill 中会调用 DamageNumber.spawn(...)
vi.mock('../../src/components/DamageNumber', () => ({
  DamageNumber: { spawn: vi.fn() },
}));

import { SkillSystem } from '../../src/systems/SkillSystem';
import { DamageSystem } from '../../src/systems/DamageSystem';
import { SeededRNG } from '../../src/utils/rng';
import { createMockUnit } from '../mocks/phaser';
import { SkillData } from '../../src/types';

/**
 * Regression for the "13 unmapped statusEffect names" bug: names like
 * slow/freeze/attack_speed_up used to fall through to a stat-less 'debuff'
 * and silently did nothing (ice bolt didn't slow, pack_instinct didn't
 * speed up). Every name now maps to a concrete type and, for stat effects,
 * carries a stat + non-zero value.
 */

function makeSkill(overrides: Partial<SkillData>): SkillData {
  return {
    id: 'test_skill',
    name: '测试',
    description: '',
    cooldown: 5,
    targetType: 'enemy',
    baseDamage: 50,
    scalingRatio: 0,
    range: 100,
    effectDuration: 3,
    ...overrides,
  } as SkillData;
}

describe('statusEffect mapping', () => {
  let system: SkillSystem;
  let caster: ReturnType<typeof createMockUnit>;
  let target: ReturnType<typeof createMockUnit>;

  beforeEach(() => {
    system = new SkillSystem(new DamageSystem(new SeededRNG(42)), new SeededRNG(42));
    caster = createMockUnit({ unitId: 'caster', stats: { attack: 50, magicPower: 50 } });
    target = createMockUnit({ unitId: 'target', currentHp: 500, maxHp: 500 });
  });

  const cast = (skill: SkillData): void => {
    // Drive the status path directly (same entry the battle pipeline uses)
    (system as unknown as { applyStatusEffect(c: unknown, t: unknown, s: SkillData): void })
      .applyStatusEffect(caster, target, skill);
  };

  it('test_status_slow_applies_negative_speed_debuff', () => {
    // Arrange + Act
    cast(makeSkill({ id: 'ice_bolt_t', statusEffect: 'slow' }));

    // Assert
    const eff = target.statusEffects.find((e: { name: string }) => e.name === 'slow') as { type: string; stat?: string; value: number };
    expect(eff).toBeDefined();
    expect(eff.type).toBe('debuff');
    expect(eff.stat).toBe('speed');
    expect(eff.value).toBeLessThan(0);
  });

  it('test_status_freeze_maps_to_stun', () => {
    cast(makeSkill({ id: 'frost_nova_t', statusEffect: 'freeze' }));
    const eff = target.statusEffects.find((e: { name: string }) => e.name === 'freeze') as { type: string };
    expect(eff.type).toBe('stun');
  });

  it('test_status_attack_speed_up_carries_stat_and_value', () => {
    cast(makeSkill({ id: 'pack_t', statusEffect: 'attack_speed_up', baseDamage: 0 }));
    const eff = target.statusEffects.find((e: { name: string }) => e.name === 'attack_speed_up') as { type: string; stat?: string; value: number };
    expect(eff.type).toBe('buff');
    expect(eff.stat).toBe('attackSpeed');
    expect(eff.value).toBeGreaterThan(0);
  });

  it('test_status_zero_basedamage_buff_gets_fallback_value', () => {
    // war_cry regression: baseDamage=0 used to produce value=0 (no-op buff)
    cast(makeSkill({ id: 'war_cry_t', statusEffect: 'attack_buff', baseDamage: 0 }));
    const eff = target.statusEffects.find((e: { name: string }) => e.name === 'attack_buff') as { value: number };
    expect(eff.value).toBeGreaterThan(0);
  });

  it('test_status_regen_maps_to_hot_with_positive_tick', () => {
    cast(makeSkill({ id: 'regen_t', statusEffect: 'regen', baseDamage: -50 }));
    const eff = target.statusEffects.find((e: { name: string }) => e.name === 'regen') as { type: string; value: number; tickInterval?: number };
    expect(eff.type).toBe('hot');
    expect(eff.value).toBeGreaterThan(0);
    expect(eff.tickInterval).toBe(1);
  });

  it('test_status_every_json_name_resolves_to_effective_spec', () => {
    // Arrange: every distinct statusEffect name actually shipped in skills.json
    const shipped = ['stun', 'taunt', 'burn', 'attack_buff', 'slow', 'freeze', 'dark_dot',
      'divine_shield', 'regen', 'berserk', 'ice_armor', 'attack_debuff', 'defense_buff',
      'speed_buff', 'magic_resist_down', 'attack_speed_up', 'buff'];

    for (const name of shipped) {
      target.statusEffects.length = 0;
      // Act
      cast(makeSkill({ id: `probe_${name}`, statusEffect: name, baseDamage: 40 }));
      // Assert: applied, and stat-type effects always carry a stat + non-zero value
      const eff = target.statusEffects[0] as { type: string; stat?: string; value: number } | undefined;
      expect(eff, name).toBeDefined();
      if (eff!.type === 'buff' || eff!.type === 'debuff') {
        expect(eff!.stat, `${name} must carry stat`).toBeTruthy();
        expect(Math.abs(eff!.value), `${name} must have magnitude`).toBeGreaterThan(0);
      }
    }
  });
});
