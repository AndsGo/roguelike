import { Unit } from '../entities/Unit';
import { DamageNumber } from '../components/DamageNumber';

export class StatusEffectSystem {
  /**
   * Tick all status effects on a unit.
   * Handles DoT/HoT, buff/debuff expiration, stun duration.
   */
  static tick(unit: Unit, delta: number): void {
    if (!unit.isAlive) return;

    const dt = delta / 1000;
    const expiredIndices: number[] = [];

    for (let i = 0; i < unit.statusEffects.length; i++) {
      const effect = unit.statusEffects[i];
      effect.duration -= dt;

      // DoT / HoT tick
      if ((effect.type === 'dot' || effect.type === 'hot') && effect.tickInterval) {
        // Check if a tick should occur this frame
        const prevTime = effect.duration + dt;
        const prevTicks = Math.floor(prevTime / effect.tickInterval);
        const currTicks = Math.floor(Math.max(0, effect.duration) / effect.tickInterval);

        if (currTicks < prevTicks) {
          if (effect.type === 'dot') {
            const dmg = Math.round(effect.value);
            unit.takeDamage(dmg);
            new DamageNumber(unit.scene, unit.x, unit.y - 20, dmg, false, false);
          } else {
            const heal = Math.round(effect.value);
            unit.heal(heal);
            new DamageNumber(unit.scene, unit.x, unit.y - 20, heal, true, false);
          }
        }
      }

      // Mark expired
      if (effect.duration <= 0) {
        expiredIndices.push(i);
        // Clean up taunt reference
        if (effect.type === 'taunt') {
          unit.tauntTarget = null;
        }
      }
    }

    // Remove expired effects (reverse order)
    for (let i = expiredIndices.length - 1; i >= 0; i--) {
      unit.statusEffects.splice(expiredIndices[i], 1);
    }
  }
}
