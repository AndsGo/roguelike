import { Unit } from '../entities/Unit';
import { DamageNumber } from '../components/DamageNumber';
import { EventBus } from './EventBus';

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
            const dmg = Math.max(1, Math.round(effect.value));
            unit.takeDamage(dmg);
            new DamageNumber(unit.scene, unit.x, unit.y - 20, dmg, false, false);
            // Emit damage event so AudioManager plays sfx_hit
            const bus = EventBus.getInstance();
            bus.emit('unit:damage', {
              sourceId: effect.id,
              targetId: unit.unitId,
              amount: dmg,
              damageType: 'magical' as const,
              element: effect.element,
              isCrit: false,
            });
            // Emit kill event for DoT kills (DamageSystem won't emit it)
            if (!unit.isAlive) {
              bus.emit('unit:kill', {
                killerId: effect.id,
                targetId: unit.unitId,
              });
            }
          } else {
            const heal = Math.max(1, Math.round(effect.value));
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
