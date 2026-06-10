import { Unit } from '../entities/Unit';
import { Hero } from '../entities/Hero';
import { StatusEffect } from '../types';
import { nextEffectId } from '../utils/id-generator';
import { SeededRNG } from '../utils/rng';
import { EventBus } from './EventBus';

/**
 * Weapon special effects — rare weapons carry an on-hit or on-kill proc in
 * addition to their flat stats, so equipment choice changes how a hero plays
 * rather than just raising numbers.
 *
 * Effects are declared in WEAPON_EFFECTS and applied from BattleSystem's
 * basic-attack path. Procs roll on the battle's seeded RNG to keep combat
 * reproducible from a saved RNG state.
 */

interface WeaponEffectSpec {
  /** Proc chance per qualifying event (0..1). */
  chance: number;
  /** 'hit' procs on every landed basic attack; 'kill' when the attack kills. */
  trigger: 'hit' | 'kill';
  /** true = apply to the attacker (self-buff); false = apply to the target. */
  targetSelf: boolean;
  build: (attacker: Unit) => StatusEffect;
}

const WEAPON_EFFECTS: Record<string, WeaponEffectSpec> = {
  // 烈焰之刃: hits can ignite the target (burn DoT)
  flame_blade: {
    chance: 0.2,
    trigger: 'hit',
    targetSelf: false,
    build: () => ({
      id: nextEffectId('item_flame_blade'),
      type: 'dot',
      name: 'burn',
      duration: 3,
      tickInterval: 1,
      value: 8,
      element: 'fire',
    }),
  },
  // 冰霜之刃: hits can briefly freeze the target (matches its描述「攻击附带冰冻效果」)
  frost_blade: {
    chance: 0.15,
    trigger: 'hit',
    targetSelf: false,
    build: () => ({
      id: nextEffectId('item_frost_blade'),
      type: 'stun',
      name: 'freeze',
      duration: 0.6,
      value: 0,
      element: 'ice',
    }),
  },
  // 暗影匕首: kills grant a short attack-speed frenzy (assassin tempo)
  shadow_dagger: {
    chance: 1,
    trigger: 'kill',
    targetSelf: true,
    build: (attacker) => ({
      id: nextEffectId('item_shadow_dagger'),
      type: 'buff',
      name: 'shadow_frenzy',
      duration: 4,
      value: Math.round(attacker.getEffectiveStats().attackSpeed * 0.25 * 100) / 100,
      stat: 'attackSpeed',
    }),
  },
};

export class ItemEffectSystem {
  /** Roll the equipped weapon's proc for the given trigger. */
  static tryProc(attacker: Unit, target: Unit, trigger: 'hit' | 'kill', rng: SeededRNG): void {
    if (!(attacker instanceof Hero)) return;
    const weapon = attacker.heroState.equipment.weapon;
    if (!weapon) return;
    const spec = WEAPON_EFFECTS[weapon.id];
    if (!spec || spec.trigger !== trigger) return;
    if (!rng.chance(spec.chance)) return;

    const recipient = spec.targetSelf ? attacker : target;
    if (!recipient.isAlive) return;
    const effect = spec.build(attacker);

    // Refresh instead of stacking: replace any live effect from the same weapon
    const prefix = `item_${weapon.id}`;
    recipient.statusEffects = recipient.statusEffects.filter(e => !e.id.startsWith(prefix));
    recipient.statusEffects.push(effect);
    if (effect.type === 'buff' || effect.type === 'debuff') {
      recipient.invalidateStats();
    }
    EventBus.getInstance().emit('status:apply', {
      targetId: recipient.unitId,
      effectId: effect.id,
      effectType: effect.type,
    });
  }
}
