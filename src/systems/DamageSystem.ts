import { Unit } from '../entities/Unit';
import { DamageType, ElementType } from '../types';
import { DAMAGE_VARIANCE, DEFENSE_FORMULA_BASE } from '../constants';
import { DamageNumber } from '../components/DamageNumber';
import { SeededRNG } from '../utils/rng';
import { ElementSystem } from './ElementSystem';
import { ComboSystem } from './ComboSystem';
import { EventBus } from './EventBus';

export interface DamageResult {
  rawDamage: number;
  finalDamage: number;
  isCrit: boolean;
  isHeal: boolean;
  elementReactionDamage: number;
}

export class DamageSystem {
  private rng: SeededRNG;
  comboSystem: ComboSystem | null = null;

  constructor(rng: SeededRNG) {
    this.rng = rng;
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
      raw = raw * (DEFENSE_FORMULA_BASE / (DEFENSE_FORMULA_BASE + Math.max(0, defense)));
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

    // Combo multiplier
    if (this.comboSystem) {
      const comboMod = this.comboSystem.getComboMultiplier(attacker.unitId);
      raw *= comboMod;
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
    target.takeDamage(result.finalDamage);

    // Register combo hit
    if (this.comboSystem) {
      this.comboSystem.registerHit(attacker.unitId, target.unitId);
    }

    // Show damage number
    new DamageNumber(
      target.scene,
      target.x + this.rng.nextInt(-10, 10),
      target.y - 20,
      result.finalDamage,
      false,
      result.isCrit,
    );

    // Show reaction damage as separate number
    if (result.elementReactionDamage > 0) {
      new DamageNumber(
        target.scene,
        target.x + this.rng.nextInt(-10, 10),
        target.y - 30,
        result.elementReactionDamage,
        false,
        false,
      );
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
    const actual = target.heal(baseHeal);
    if (actual > 0) {
      new DamageNumber(
        target.scene,
        target.x + this.rng.nextInt(-10, 10),
        target.y - 20,
        actual,
        true,
      );
    }
    return actual;
  }
}
