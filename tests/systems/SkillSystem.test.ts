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

  describe('ally skill targeting', () => {
    it('findReadySkill returns heal skill when ally is injured, even if enemy target is out of range', () => {
      const healer = createMockUnit({
        unitId: 'healer1', role: 'healer',
        stats: { attackRange: 200, maxHp: 500, magicPower: 50 },
      });
      healer.isHero = true;
      const ally = createMockUnit({
        unitId: 'ally1',
        stats: { maxHp: 500 },
      });
      ally.currentHp = 200;
      ally.isAlive = true;
      ally.isHero = true;

      const enemy = createMockUnit({ unitId: 'enemy1' });
      enemy.isAlive = true;
      healer.target = enemy;
      healer.distanceTo = (t: any) => t === enemy ? 9999 : 50;

      const healSkill = {
        id: 'heal', name: 'Heal', targetType: 'ally',
        baseDamage: -80, scalingStat: 'magicPower', scalingRatio: 0.5,
        cooldown: 5, range: 300, element: null, isUltimate: false,
        effects: [],
      };
      healer.skills = [healSkill as any];
      healer.skillCooldowns = new Map([['heal', 0]]);

      const result = skillSystem.findReadySkill(
        healer as any, [healer, ally] as any[], [enemy] as any[]
      );
      expect(result).not.toBeNull();
      expect(result!.id).toBe('heal');
    });

    it('executeSkill targets lowest HP ally for ally-targeted heal skill', () => {
      const healer = createMockUnit({
        unitId: 'healer1', role: 'healer',
        stats: { maxHp: 500, magicPower: 100, attack: 10 },
      });
      healer.isHero = true;
      healer.isAlive = true;
      healer.currentHp = 500;
      const ally1 = createMockUnit({ unitId: 'ally1', stats: { maxHp: 500 } });
      ally1.currentHp = 400;
      ally1.isAlive = true;
      ally1.isHero = true;
      const ally2 = createMockUnit({ unitId: 'ally2', stats: { maxHp: 500 } });
      ally2.currentHp = 100;
      ally2.isAlive = true;
      ally2.isHero = true;

      const healSkill = {
        id: 'heal', name: 'Heal', targetType: 'ally',
        baseDamage: -80, scalingStat: 'magicPower', scalingRatio: 0.5,
        cooldown: 5, range: 300, element: null, isUltimate: false,
        effects: [],
      };

      const enemy = createMockUnit({ unitId: 'enemy1' });
      healer.target = enemy;

      skillSystem.executeSkill(
        healer as any, healSkill as any,
        [healer, ally1, ally2] as any[], [enemy] as any[]
      );

      expect(ally2.currentHp).toBeGreaterThan(100);
    });
  });
});
