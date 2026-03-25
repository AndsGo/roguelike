import { Unit } from '../entities/Unit';
import { SkillData, SkillEffect, StatusEffect, StatusEffectType, SkillAdvancement, SkillEvolution } from '../types';
import { DamageSystem } from './DamageSystem';
import { DamageNumber } from '../components/DamageNumber';
import { DamageAccumulator } from './DamageAccumulator';
import { SeededRNG } from '../utils/rng';
import { EventBus } from './EventBus';
import { TargetingSystem } from './TargetingSystem';
import { MetaManager } from '../managers/MetaManager';
import skillsData from '../data/skills.json';
import advancementsData from '../data/skill-advancements.json';
import evolutionsData from '../data/skill-evolutions.json';
import { EVOLUTION_LEVEL, EVOLUTION_ENHANCE_LEVEL } from '../constants';
import { nextEffectId } from '../utils/id-generator';

const evolutionMap = new Map<string, SkillEvolution[]>();
for (const evo of evolutionsData as SkillEvolution[]) {
  const key = `${evo.heroId}:${evo.sourceSkillId}`;
  if (!evolutionMap.has(key)) evolutionMap.set(key, []);
  evolutionMap.get(key)!.push(evo);
}

export function hasEvolutionConfig(heroId: string, skillId: string): boolean {
  return evolutionMap.has(`${heroId}:${skillId}`);
}

export function getEvolutionBranches(heroId: string, skillId: string): SkillEvolution[] {
  return evolutionMap.get(`${heroId}:${skillId}`) ?? [];
}

export function getEvolutionById(evolutionId: string): SkillEvolution | undefined {
  return (evolutionsData as SkillEvolution[]).find(e => e.id === evolutionId);
}

export class SkillSystem {
  private rng: SeededRNG;
  private damageSystem: DamageSystem;
  private accumulator?: DamageAccumulator;

  constructor(rng: SeededRNG, damageSystem: DamageSystem) {
    this.rng = rng;
    this.damageSystem = damageSystem;
  }

  setAccumulator(acc: DamageAccumulator): void {
    this.accumulator = acc;
  }

  /** Initialize skills for a unit from skill IDs, applying advancements based on unit level */
  initializeSkills(unit: Unit, skillIds: string[], heroLevel?: number, heroId?: string, evolutions?: Record<string, string>): void {
    unit.skills = skillIds
      .map(id => {
        const base = (skillsData as SkillData[]).find(s => s.id === id);
        if (!base) return null;
        return heroLevel ? this.getAdvancedSkill(base, heroLevel, heroId, evolutions) : { ...base };
      })
      .filter(Boolean) as SkillData[];
    for (const skill of unit.skills) {
      unit.skillCooldowns.set(skill.id, 0);
    }
  }

  /** Apply skill advancements based on hero level, with 6-step evolution resolution */
  getAdvancedSkill(baseSkill: SkillData, heroLevel: number, heroId?: string, evolutions?: Record<string, string>): SkillData {
    // Step 1: Check if this hero:skill has evolution config
    const hasEvo = heroId ? hasEvolutionConfig(heroId, baseSkill.id) : false;

    if (!hasEvo) {
      // Step 2: LEGACY PATH
      return this.applyLegacyAdvancements(baseSkill, heroLevel);
    }

    // Step 3: Below evolution level — return base skill as-is
    if (heroLevel < EVOLUTION_LEVEL) {
      return { ...baseSkill };
    }

    // Step 4: Check if player has chosen an evolution
    const evoKey = `${heroId}:${baseSkill.id}`;
    const chosenId = evolutions?.[evoKey];

    if (!chosenId) {
      // Pending — fall back to legacy advancements (no power cliff)
      return this.applyLegacyAdvancements(baseSkill, heroLevel);
    }

    // Step 5: Apply evolution overrides
    const evolution = getEvolutionById(chosenId);
    if (!evolution) {
      return this.applyLegacyAdvancements(baseSkill, heroLevel);
    }

    const evolved: SkillData = { ...baseSkill, ...evolution.overrides };
    evolved.id = baseSkill.id; // Ensure base ID retained

    // Step 6: Apply level10Bonus if hero >= EVOLUTION_ENHANCE_LEVEL
    if (heroLevel >= EVOLUTION_ENHANCE_LEVEL && evolution.level10Bonus) {
      const bonus = evolution.level10Bonus;
      if (bonus.baseDamage) evolved.baseDamage += bonus.baseDamage;
      if (bonus.scalingRatio) evolved.scalingRatio += bonus.scalingRatio;
      if (bonus.cooldown) evolved.cooldown = Math.max(0.5, evolved.cooldown + bonus.cooldown);
      if (bonus.aoeRadius) evolved.aoeRadius = (evolved.aoeRadius ?? 0) + bonus.aoeRadius;
      if (bonus.effectDuration) evolved.effectDuration = (evolved.effectDuration ?? 0) + bonus.effectDuration;
    }

    return evolved;
  }

  /** Apply legacy skill advancements based on hero level */
  private applyLegacyAdvancements(baseSkill: SkillData, heroLevel: number): SkillData {
    const advancements = (advancementsData as SkillAdvancement[])
      .filter(a => a.skillId === baseSkill.id && heroLevel >= a.requiredHeroLevel)
      .sort((a, b) => a.level - b.level);

    if (advancements.length === 0) return { ...baseSkill };

    const advanced = { ...baseSkill };
    for (const adv of advancements) {
      if (adv.bonuses.baseDamage) advanced.baseDamage += adv.bonuses.baseDamage;
      if (adv.bonuses.scalingRatio) advanced.scalingRatio += adv.bonuses.scalingRatio;
      if (adv.bonuses.cooldown) advanced.cooldown = Math.max(0.5, advanced.cooldown + adv.bonuses.cooldown);
      if (adv.bonuses.range) advanced.range += adv.bonuses.range;
      if (adv.bonuses.aoeRadius) advanced.aoeRadius = (advanced.aoeRadius ?? 0) + adv.bonuses.aoeRadius;
      if (adv.bonuses.effectDuration) advanced.effectDuration = (advanced.effectDuration ?? 0) + adv.bonuses.effectDuration;
    }
    return advanced;
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

  /** Check if a specific skill is off cooldown for a unit */
  isSkillReady(unit: Unit, skillId: string): boolean {
    const cd = unit.skillCooldowns.get(skillId) ?? 0;
    return cd <= 0;
  }

  /** Find a ready skill that can be used on the current target */
  findReadySkill(unit: Unit, allies: Unit[], enemies: Unit[]): SkillData | null {
    for (const skill of unit.skills) {
      if (skill.isUltimate) continue;
      const cd = unit.skillCooldowns.get(skill.id) ?? 0;
      if (cd > 0) continue;

      // Self-targeted skills are always usable
      if (skill.targetType === 'self') return skill;

      // Ally-targeted single skill — resolve via selectAllyTarget
      if (skill.targetType === 'ally') {
        if (unit.role !== 'healer' && unit.role !== 'support') continue;
        const allyPool = unit.isHero ? allies : enemies;
        if (this.selectAllyTarget(unit, allyPool, skill)) return skill;
        continue;
      }

      // All-allies skill
      if (skill.targetType === 'all_allies') {
        if (unit.role !== 'healer' && unit.role !== 'support') continue;
        const allyPool = unit.isHero ? allies : enemies;
        if (allyPool.some(t => t.isAlive)) return skill;
        continue;
      }

      // AOE enemy skill
      if (skill.targetType === 'all_enemies') {
        const enemyPool = unit.isHero ? enemies : allies;
        if (enemyPool.some(t => t.isAlive && unit.distanceTo(t) <= skill.range)) {
          return skill;
        }
        continue;
      }

      // Single enemy skill — check range to combat target
      if (unit.target && unit.distanceTo(unit.target) <= skill.range) {
        return skill;
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
      case 'ally': {
        const allyPool = unit.isHero ? allies : enemies;
        const allyTarget = this.selectAllyTarget(unit, allyPool, skill);
        if (allyTarget) targets = [allyTarget];
        break;
      }
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

    // Emit skill:use event (with role + ally info for audio dispatch)
    const isAlly = skill.targetType === 'ally' || skill.targetType === 'all_allies' || skill.targetType === 'self';
    EventBus.getInstance().emit('skill:use', {
      casterId: unit.unitId,
      skillId: skill.id,
      targets: targets.map(t => t.unitId),
      casterRole: unit.role,
      isAllySkill: isAlly,
    });

    // Determine skill element (from skill data or unit element)
    const skillElement = skill.element ?? unit.element;

    for (const target of targets) {
      if (totalDamage < 0) {
        // Healing skill
        this.damageSystem.applyHeal(unit, target, Math.abs(totalDamage));
      } else if (totalDamage > 0) {
        // Damage skill - pass element through
        const forceCrit = skill.id === 'backstab';
        const result = this.damageSystem.calculateDamage(
          unit, target, totalDamage, skill.damageType, forceCrit, skillElement,
        );
        target.takeDamage(result.finalDamage);

        // Register combo hit
        if (this.damageSystem.comboSystem) {
          this.damageSystem.comboSystem.registerHit(unit.unitId, target.unitId);
        }

        if (this.accumulator) {
          this.accumulator.addDamage(target.unitId, target.scene, target.x + this.rng.nextInt(-10, 10), target.y, result.finalDamage, {
            isCrit: result.isCrit,
            element: skillElement,
          });
        } else {
          new DamageNumber(
            target.scene,
            target.x + this.rng.nextInt(-10, 10),
            target.y - 20,
            result.finalDamage,
            false,
            result.isCrit,
          );
        }

        // Show reaction damage
        if (result.elementReactionDamage > 0) {
          if (this.accumulator) {
            this.accumulator.addDamage(`${target.unitId}_reaction`, target.scene, target.x + this.rng.nextInt(-10, 10), target.y, result.elementReactionDamage);
          } else {
            new DamageNumber(
              target.scene,
              target.x + this.rng.nextInt(-10, 10),
              target.y - 30,
              result.elementReactionDamage,
              false,
              false,
            );
          }
        }

        // Emit damage event
        EventBus.getInstance().emit('unit:damage', {
          sourceId: unit.unitId,
          targetId: target.unitId,
          amount: result.finalDamage + result.elementReactionDamage,
          damageType: skill.damageType,
          element: skillElement,
          isCrit: result.isCrit,
        });

        // Mutation: crit_cooldown — reduce all cooldowns by 1s on crit
        if (result.isCrit && MetaManager.hasMutation('crit_cooldown') && unit.isHero) {
          for (const [skillId, cd] of unit.skillCooldowns) {
            if (cd > 0) {
              unit.skillCooldowns.set(skillId, Math.max(0, cd - 1));
            }
          }
        }

        // Check for kill
        if (!target.isAlive) {
          EventBus.getInstance().emit('unit:kill', {
            killerId: unit.unitId,
            targetId: target.unitId,
          });
        }

        // Register threat
        TargetingSystem.registerThreat(target.unitId, unit.unitId, result.finalDamage);
      }

      // Apply status effect
      if (skill.statusEffect && skill.effectDuration) {
        this.applyStatusEffect(unit, target, skill);
      }

      // Process chain effects if present
      if (skill.effects) {
        this.processEffectChain(unit, target, skill.effects, allies, enemies);
      }
    }

    // Visual flash for skill use
    unit.flashColor(0xffff88, 150);

    // Special: ult_iron_bastion — apply counter_aura to caster + shield to all allies
    if (skill.id === 'ult_iron_bastion') {
      const counterAura: StatusEffect = {
        id: nextEffectId('counter_aura'),
        type: 'counter_aura',
        name: 'counter_aura',
        duration: 8,
        value: 0.15,
      };
      unit.statusEffects.push(counterAura);
      unit.invalidateStats();

      const alliedUnits = unit.isHero ? allies : enemies;
      for (const ally of alliedUnits) {
        if (ally.isAlive) {
          ally.addShield(50, 8);
        }
      }
    }
  }

  /**
   * Process a chain of SkillEffects sequentially on a target.
   */
  private processEffectChain(
    caster: Unit,
    target: Unit,
    effects: SkillEffect[],
    allies: Unit[],
    enemies: Unit[],
  ): void {
    for (const effect of effects) {
      this.processEffect(caster, target, effect, allies, enemies);
    }
  }

  private processEffect(
    caster: Unit,
    target: Unit,
    effect: SkillEffect,
    allies: Unit[],
    enemies: Unit[],
  ): void {
    if (!target.isAlive && effect.type !== 'heal') return;

    const stats = caster.getEffectiveStats();
    const effectElement = effect.element ?? caster.element;

    switch (effect.type) {
      case 'damage': {
        const scaleStat = effect.scalingStat === 'magicPower' ? stats.magicPower : stats.attack;
        const base = (effect.baseDamage ?? 0) + scaleStat * (effect.scalingRatio ?? 0);
        if (base > 0) {
          this.damageSystem.applyDamage(
            caster, target,
            effect.damageType ?? 'physical',
            base,
            effectElement,
          );
        }
        break;
      }
      case 'heal': {
        const scaleStat = effect.scalingStat === 'magicPower' ? stats.magicPower : stats.attack;
        const heal = (effect.baseDamage ?? 0) + scaleStat * (effect.scalingRatio ?? 0);
        if (heal > 0) {
          this.damageSystem.applyHeal(caster, target, heal);
        }
        break;
      }
      case 'status': {
        if (effect.statusEffectId && effect.statusDuration) {
          const statusEffect: StatusEffect = {
            id: nextEffectId(effect.statusEffectId),
            type: this.mapEffectType(effect.statusEffectId),
            name: effect.statusEffectId,
            duration: effect.statusDuration,
            value: effect.baseDamage ?? 0,
            element: effectElement,
          };
          target.statusEffects.push(statusEffect);
          target.invalidateStats();
        }
        break;
      }
      case 'element_reaction': {
        // Deliberately trigger an element reaction check
        break;
      }
    }

    // Process chained effect
    if (effect.chain) {
      this.processEffect(caster, target, effect.chain, allies, enemies);
    }
  }

  private applyStatusEffect(source: Unit, target: Unit, skill: SkillData): void {
    const effectType = this.mapEffectType(skill.statusEffect!);
    const skillElement = skill.element ?? source.element;
    const effect: StatusEffect = {
      id: nextEffectId(skill.statusEffect!),
      type: effectType,
      name: skill.statusEffect!,
      duration: skill.effectDuration!,
      value: effectType === 'buff' || effectType === 'debuff' ? skill.baseDamage * 0.5 : skill.baseDamage * 0.2,
      tickInterval: effectType === 'dot' || effectType === 'hot' ? 1 : undefined,
      stat: effectType === 'buff' ? 'attack' : undefined,
      sourceId: source.unitId,
      element: skillElement,
    };

    if (effectType === 'taunt') {
      target.tauntTarget = source;
    }

    target.statusEffects.push(effect);
    target.invalidateStats();

    // Emit status apply event
    EventBus.getInstance().emit('status:apply', {
      targetId: target.unitId,
      effectId: effect.id,
      effectType: effectType,
    });
  }

  /**
   * Select the best ally target for a support skill.
   * Responsibility stays in SkillSystem — TargetingSystem handles enemy targeting only.
   */
  private selectAllyTarget(caster: Unit, allies: Unit[], skill: SkillData): Unit | null {
    const living = allies.filter(a => a.isAlive && a !== caster);
    if (living.length === 0) return caster.isAlive ? caster : null;

    // Healing skill (negative baseDamage) → lowest HP %
    if (skill.baseDamage < 0) {
      let target = living[0];
      let lowestPercent = target.currentHp / target.getEffectiveStats().maxHp;
      for (let i = 1; i < living.length; i++) {
        const percent = living[i].currentHp / living[i].getEffectiveStats().maxHp;
        if (percent < lowestPercent) {
          lowestPercent = percent;
          target = living[i];
        }
      }
      return lowestPercent < 0.9 ? target : null;
    }

    // Shield/buff → prefer tanks or front-row
    const tanks = living.filter(a => a.role === 'tank' || a.formation === 'front');
    if (tanks.length > 0) return tanks[0];

    return living[0];
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
