import { describe, it, expect, beforeEach } from 'vitest';
import { SkillSystem } from '../../src/systems/SkillSystem';
import { DamageSystem } from '../../src/systems/DamageSystem';
import { SeededRNG } from '../../src/utils/rng';
import { EventBus } from '../../src/systems/EventBus';
import { createMockUnit } from '../mocks/phaser';

describe('SkillSystem', () => {
  let skillSystem: SkillSystem;
  let damageSystem: DamageSystem;
  let rng: SeededRNG;

  beforeEach(() => {
    EventBus.getInstance().reset();
    rng = new SeededRNG(42);
    damageSystem = new DamageSystem(rng);
    skillSystem = new SkillSystem(rng, damageSystem);
  });

  describe('initializeSkills', () => {
    it('loads skills from data by ID', () => {
      const unit = createMockUnit({ unitId: 'warrior1' });
      skillSystem.initializeSkills(unit as any, ['shield_bash', 'taunt_shout']);

      expect(unit.skills.length).toBeGreaterThanOrEqual(1);
      // At least shield_bash should be loaded
      const skillIds = unit.skills.map((s: any) => s.id);
      expect(skillIds).toContain('shield_bash');
    });

    it('initializes cooldowns to 0', () => {
      const unit = createMockUnit({ unitId: 'warrior1' });
      skillSystem.initializeSkills(unit as any, ['shield_bash']);

      expect(unit.skillCooldowns.get('shield_bash')).toBe(0);
    });

    it('filters out non-existent skill IDs gracefully', () => {
      const unit = createMockUnit({ unitId: 'test' });
      skillSystem.initializeSkills(unit as any, ['nonexistent_skill']);
      // Should not crash, just have 0 skills
      expect(unit.skills.length).toBe(0);
    });
  });

  describe('tickCooldowns', () => {
    it('reduces cooldown by delta time', () => {
      const unit = createMockUnit({ unitId: 'test' });
      unit.skillCooldowns.set('skill1', 5.0);

      skillSystem.tickCooldowns(unit as any, 2000); // 2 seconds

      expect(unit.skillCooldowns.get('skill1')).toBeCloseTo(3.0);
    });

    it('cooldown does not go below 0', () => {
      const unit = createMockUnit({ unitId: 'test' });
      unit.skillCooldowns.set('skill1', 1.0);

      skillSystem.tickCooldowns(unit as any, 5000); // 5 seconds

      expect(unit.skillCooldowns.get('skill1')).toBe(0);
    });
  });

  describe('findReadySkill', () => {
    it('returns null when no skills assigned', () => {
      const unit = createMockUnit({ unitId: 'test' });
      const result = skillSystem.findReadySkill(unit as any, [], []);
      expect(result).toBeNull();
    });

    it('returns null when all skills are on cooldown', () => {
      const unit = createMockUnit({ unitId: 'test' });
      skillSystem.initializeSkills(unit as any, ['shield_bash']);
      // Put on cooldown
      for (const skill of unit.skills) {
        unit.skillCooldowns.set((skill as any).id, 10);
      }
      const result = skillSystem.findReadySkill(unit as any, [], []);
      expect(result).toBeNull();
    });

    it('returns a self-targeted skill when ready', () => {
      const unit = createMockUnit({ unitId: 'test' });
      // Manually add a self-targeted skill
      const selfSkill = {
        id: 'test_self', name: 'Test Self', description: '',
        cooldown: 5, damageType: 'physical', targetType: 'self',
        baseDamage: 0, scalingStat: 'attack', scalingRatio: 0, range: 0,
      };
      unit.skills = [selfSkill as any];
      unit.skillCooldowns.set('test_self', 0);

      const result = skillSystem.findReadySkill(unit as any, [], []);
      expect(result).toBeDefined();
      expect(result!.id).toBe('test_self');
    });
  });
});
