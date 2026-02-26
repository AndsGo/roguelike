import { Unit } from '../entities/Unit';
import { DamageType } from '../types';
import { DAMAGE_VARIANCE, DEFENSE_FORMULA_BASE } from '../constants';
import { DamageNumber } from '../components/DamageNumber';
import { SeededRNG } from '../utils/rng';

export interface DamageResult {
  rawDamage: number;
  finalDamage: number;
  isCrit: boolean;
  isHeal: boolean;
}

export class DamageSystem {
  private rng: SeededRNG;

  constructor(rng: SeededRNG) {
    this.rng = rng;
  }

  /**
   * Calculate and apply damage from attacker to target.
   */
  calculateDamage(
    attacker: Unit,
    target: Unit,
    baseDamage: number,
    damageType: DamageType,
    forceCrit: boolean = false,
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

    // Random variance ±10%
    const variance = 1 + this.rng.nextFloat(-DAMAGE_VARIANCE, DAMAGE_VARIANCE);
    raw *= variance;

    const finalDamage = Math.max(1, Math.round(raw));

    return {
      rawDamage: baseDamage,
      finalDamage,
      isCrit,
      isHeal: false,
    };
  }

  /**
   * Apply damage and show floating number.
   */
  applyDamage(attacker: Unit, target: Unit, damageType: DamageType, baseDamage?: number): DamageResult {
    const stats = attacker.getEffectiveStats();
    const base = baseDamage ?? (damageType === 'magical' ? stats.magicPower : stats.attack);

    const result = this.calculateDamage(attacker, target, base, damageType);
    target.takeDamage(result.finalDamage);

    // Show damage number
    new DamageNumber(
      target.scene,
      target.x + this.rng.nextInt(-10, 10),
      target.y - 20,
      result.finalDamage,
      false,
      result.isCrit,
    );

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
