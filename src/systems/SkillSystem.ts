import { Unit } from '../entities/Unit';
import { SkillData, StatusEffect, StatusEffectType } from '../types';
import { DamageSystem } from './DamageSystem';
import { DamageNumber } from '../components/DamageNumber';
import { SeededRNG } from '../utils/rng';
import skillsData from '../data/skills.json';

export class SkillSystem {
  private rng: SeededRNG;
  private damageSystem: DamageSystem;

  constructor(rng: SeededRNG, damageSystem: DamageSystem) {
    this.rng = rng;
    this.damageSystem = damageSystem;
  }

  /** Initialize skills for a unit from skill IDs */
  initializeSkills(unit: Unit, skillIds: string[]): void {
    unit.skills = skillIds
      .map(id => skillsData.find(s => s.id === id) as SkillData)
      .filter(Boolean);
    for (const skill of unit.skills) {
      unit.skillCooldowns.set(skill.id, 0);
    }
  }

  /** Tick cooldowns for a unit */
  tickCooldowns(unit: Unit, delta: number): void {
    const dt = delta / 1000;
    for (const [id, cd] of unit.skillCooldowns) {
      if (cd > 0) {
        unit.skillCooldowns.set(id, Math.max(0, cd - dt));
      }
    }
  }

  /** Find a ready skill that can be used on the current target */
  findReadySkill(unit: Unit, allies: Unit[], enemies: Unit[]): SkillData | null {
    for (const skill of unit.skills) {
      const cd = unit.skillCooldowns.get(skill.id) ?? 0;
      if (cd > 0) continue;

      // Check if target type matches
      if (skill.targetType === 'ally' || skill.targetType === 'all_allies') {
        if (unit.role !== 'healer' && unit.role !== 'support') continue;
      }

      // Check range to target
      if (unit.target && unit.distanceTo(unit.target) <= skill.range) {
        return skill;
      }

      // Self-targeted skills are always usable
      if (skill.targetType === 'self') return skill;

      // AOE skills that hit all - check if any enemy is in range
      if (skill.targetType === 'all_enemies') {
        const targets = unit.isHero ? enemies : allies;
        if (targets.some(t => t.isAlive && unit.distanceTo(t) <= skill.range)) {
          return skill;
        }
      }

      if (skill.targetType === 'all_allies') {
        const targets = unit.isHero ? allies : enemies;
        if (targets.some(t => t.isAlive)) {
          return skill;
        }
      }
    }
    return null;
  }

  /** Execute a skill */
  executeSkill(unit: Unit, skill: SkillData, allies: Unit[], enemies: Unit[]): void {
    // Put skill on cooldown
    unit.skillCooldowns.set(skill.id, skill.cooldown);

    const stats = unit.getEffectiveStats();
    const scaleStat = skill.scalingStat === 'magicPower' ? stats.magicPower : stats.attack;
    const totalDamage = skill.baseDamage + scaleStat * skill.scalingRatio;

    // Determine targets
    let targets: Unit[] = [];
    switch (skill.targetType) {
      case 'enemy':
        if (unit.target && unit.target.isAlive) targets = [unit.target];
        break;
      case 'ally':
        if (unit.target && unit.target.isAlive) targets = [unit.target];
        break;
      case 'self':
        targets = [unit];
        break;
      case 'all_enemies':
        targets = (unit.isHero ? enemies : allies).filter(u => u.isAlive);
        break;
      case 'all_allies':
        targets = (unit.isHero ? allies : enemies).filter(u => u.isAlive);
        break;
    }

    for (const target of targets) {
      if (totalDamage < 0) {
        // Healing skill
        this.damageSystem.applyHeal(unit, target, Math.abs(totalDamage));
      } else if (totalDamage > 0) {
        // Damage skill
        const forceCrit = skill.id === 'backstab';
        const result = this.damageSystem.calculateDamage(
          unit, target, totalDamage, skill.damageType, forceCrit,
        );
        target.takeDamage(result.finalDamage);
        new DamageNumber(
          target.scene,
          target.x + this.rng.nextInt(-10, 10),
          target.y - 20,
          result.finalDamage,
          false,
          result.isCrit,
        );
      }

      // Apply status effect
      if (skill.statusEffect && skill.effectDuration) {
        this.applyStatusEffect(unit, target, skill);
      }
    }

    // Visual flash for skill use
    unit.sprite.setFillStyle(0xffff88);
    unit.scene.time.delayedCall(150, () => {
      if (unit.isAlive) {
        unit.sprite.setFillStyle(unit.isHero ? 0x4488ff : 0xff4444);
      }
    });
  }

  private applyStatusEffect(source: Unit, target: Unit, skill: SkillData): void {
    const effectType = this.mapEffectType(skill.statusEffect!);
    const effect: StatusEffect = {
      id: `${skill.statusEffect}_${Date.now()}`,
      type: effectType,
      name: skill.statusEffect!,
      duration: skill.effectDuration!,
      value: effectType === 'buff' || effectType === 'debuff' ? skill.baseDamage * 0.5 : skill.baseDamage * 0.2,
      tickInterval: effectType === 'dot' || effectType === 'hot' ? 1 : undefined,
      stat: effectType === 'buff' ? 'attack' : undefined,
      sourceId: source.unitId,
    };

    if (effectType === 'taunt') {
      target.tauntTarget = source;
    }

    target.statusEffects.push(effect);
  }

  private mapEffectType(effectName: string): StatusEffectType {
    switch (effectName) {
      case 'stun': return 'stun';
      case 'taunt': return 'taunt';
      case 'burn': return 'dot';
      case 'attack_buff': return 'buff';
      default: return 'debuff';
    }
  }
}
