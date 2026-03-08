import { Unit } from '../entities/Unit';
import { DamageType, ElementType } from '../types';
import { DAMAGE_VARIANCE, DEFENSE_FORMULA_BASE } from '../constants';
import { DamageNumber } from '../components/DamageNumber';
import { SeededRNG } from '../utils/rng';
import { ElementSystem } from './ElementSystem';
import { ComboSystem } from './ComboSystem';
import { EventBus } from './EventBus';
import { AudioManager } from './AudioManager';
import { RelicSystem } from './RelicSystem';
import { DamageAccumulator } from './DamageAccumulator';

export interface DamageResult {
  rawDamage: number;
  finalDamage: number;
  isCrit: boolean;
  isHeal: boolean;
  elementReactionDamage: number;
}

export class DamageSystem {
  private rng: SeededRNG;
  private accumulator?: DamageAccumulator;
  comboSystem: ComboSystem | null = null;

  constructor(rng: SeededRNG) {
    this.rng = rng;
  }

  setAccumulator(acc: DamageAccumulator): void {
    this.accumulator = acc;
  }

  /**
   * Calculate and apply damage from attacker to target.
   * Now includes element multiplier and combo multiplier in the pipeline.
   */
  calculateDamage(
    attacker: Unit,
    target: Unit,
    baseDamage: number,
    damageType: DamageType,
    forceCrit: boolean = false,
    element?: ElementType,
  ): DamageResult {
    const stats = attacker.getEffectiveStats();
    const targetStats = target.getEffectiveStats();

    // Calculate raw damage
    let raw = baseDamage;

    // Apply defense reduction
    const defense = damageType === 'magical' ? targetStats.magicResist : targetStats.defense;
    if (damageType !== 'pure') {
      const piercing = RelicSystem.getDefensePiercing();
      const effectiveDefense = Math.max(0, defense) * (1 - piercing);
      raw = raw * (DEFENSE_FORMULA_BASE / (DEFENSE_FORMULA_BASE + effectiveDefense));
    }

    // Crit check
    const isCrit = forceCrit || this.rng.chance(stats.critChance);
    if (isCrit) {
      raw *= stats.critDamage;
    }

    // Element multiplier
    const attackerElement = element ?? attacker.element;
    const elementMod = ElementSystem.getElementMultiplier(attackerElement, target.element);
    raw *= elementMod;

    // Relic element-specific damage bonus
    if (attackerElement && attacker.isHero) {
      const elBonus = RelicSystem.getElementDamageBonus(attackerElement);
      if (elBonus > 0) {
        raw *= (1 + elBonus);
      }
    }

    // Combo multiplier
    if (this.comboSystem) {
      const comboMod = this.comboSystem.getComboMultiplier(attacker.unitId);
      raw *= comboMod;
    }

    // Relic damage bonus (glass_cannon, heart_of_dragon)
    if (attacker.isHero) {
      const relicDmgBonus = RelicSystem.getDamageBonus();
      if (relicDmgBonus > 0) {
        raw *= (1 + relicDmgBonus);
      }
    }

    // Berserker mask: +25% attack when low HP
    if (attacker.isHero) {
      const hpRatio = attacker.currentHp / attacker.currentStats.maxHp;
      const lowHpBonus = RelicSystem.getLowHpAttackBonus(hpRatio);
      if (lowHpBonus > 0) {
        raw *= (1 + lowHpBonus);
      }
    }

    // Random variance +/-10%
    const variance = 1 + this.rng.nextFloat(-DAMAGE_VARIANCE, DAMAGE_VARIANCE);
    raw *= variance;

    const finalDamage = Math.max(1, Math.round(raw));

    // Check for element reaction
    let elementReactionDamage = 0;
    if (attackerElement) {
      const reactionResult = ElementSystem.checkElementReaction(attackerElement, target);
      if (reactionResult) {
        elementReactionDamage = ElementSystem.applyElementReaction(
          reactionResult.reaction,
          attackerElement,
          reactionResult.existingElement,
          target,
          finalDamage,
          attacker,
        );
      }
    }

    return {
      rawDamage: baseDamage,
      finalDamage,
      isCrit,
      isHeal: false,
      elementReactionDamage,
    };
  }

  /**
   * Apply damage and show floating number.
   * Registers hit with combo system and emits events.
   */
  applyDamage(
    attacker: Unit,
    target: Unit,
    damageType: DamageType,
    baseDamage?: number,
    element?: ElementType,
  ): DamageResult {
    const stats = attacker.getEffectiveStats();
    const base = baseDamage ?? (damageType === 'magical' ? stats.magicPower : stats.attack);

    const result = this.calculateDamage(attacker, target, base, damageType, false, element);
    let finalDmg = result.finalDamage;
    if (target.isHero) {
      const takenBonus = RelicSystem.getDamageTakenBonus();
      if (takenBonus > 0) {
        finalDmg = Math.round(finalDmg * (1 + takenBonus));
      }
    }
    target.takeDamage(finalDmg);

    // Register combo hit
    if (this.comboSystem) {
      this.comboSystem.registerHit(attacker.unitId, target.unitId);
    }

    // Show damage number
    if (this.accumulator) {
      this.accumulator.addDamage(target.unitId, target.scene, target.x + this.rng.nextInt(-10, 10), target.y, result.finalDamage, {
        isCrit: result.isCrit,
        element: element ?? attacker.element,
        comboCount: this.comboSystem ? this.comboSystem.getComboCount(attacker.unitId) : undefined,
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

    // Show reaction damage as separate number
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

    // Play crit SFX for critical hits
    if (result.isCrit) {
      AudioManager.getInstance().playSfx('sfx_crit');
    }

    // Emit unit:damage event
    const attackerElement = element ?? attacker.element;
    EventBus.getInstance().emit('unit:damage', {
      sourceId: attacker.unitId,
      targetId: target.unitId,
      amount: result.finalDamage + result.elementReactionDamage,
      damageType,
      element: attackerElement,
      isCrit: result.isCrit,
    });

    // Check for kill
    if (!target.isAlive) {
      EventBus.getInstance().emit('unit:kill', {
        killerId: attacker.unitId,
        targetId: target.unitId,
      });
    }

    return result;
  }

  /**
   * Apply healing.
   */
  applyHeal(healer: Unit, target: Unit, baseHeal: number): number {
    let healAmount = baseHeal;
    const healBonus = RelicSystem.getHealBonus();
    if (healBonus > 0) {
      healAmount = Math.round(healAmount * (1 + healBonus));
    }
    const actual = target.heal(healAmount);

    // Overflow shield: excess healing becomes temporary HP (max 20% maxHp)
    if (RelicSystem.hasOverflowShield() && target.isHero) {
      const overflow = healAmount - actual;
      if (overflow > 0) {
        const maxShield = Math.round(target.currentStats.maxHp * 0.2);
        const currentOverheal = target.currentHp - target.currentStats.maxHp;
        const available = maxShield - Math.max(0, currentOverheal);
        if (available > 0) {
          const shieldAmount = Math.min(overflow, available);
          target.currentHp += shieldAmount;
        }
      }
    }

    if (actual > 0) {
      if (this.accumulator) {
        this.accumulator.addHeal(target.unitId, target.scene, target.x + this.rng.nextInt(-10, 10), target.y, actual);
      } else {
        new DamageNumber(
          target.scene,
          target.x + this.rng.nextInt(-10, 10),
          target.y - 20,
          actual,
          true,
        );
      }
    }
    return actual;
  }
}
