import { ElementType, StatusEffect } from '../types';
import { EventBus } from './EventBus';
import { REACTION_DAMAGE_BONUS_CAP } from '../config/balance';
import {
  ELEMENT_ADVANTAGE_MULTIPLIER,
  ELEMENT_DISADVANTAGE_MULTIPLIER,
  ELEMENT_REACTIONS,
  ElementReaction,
  getReactionKey,
  hasElementAdvantage,
} from '../config/elements';
import { Unit } from '../entities/Unit';
import { RelicSystem } from './RelicSystem';
import { SeededRNG } from '../utils/rng';
import { MetaManager } from '../managers/MetaManager';
import { nextEffectId } from '../utils/id-generator';

/**
 * Handles element-based combat mechanics:
 * - Element advantage/disadvantage multipliers
 * - Element reactions when two different elements collide on a target
 */
export class ElementSystem {
  /**
   * Get the damage multiplier based on attacker and target elements.
   * Returns 1.3 for advantage, 0.7 for disadvantage, 1.0 for neutral.
   */
  static getElementMultiplier(
    attackerElement?: ElementType,
    targetElement?: ElementType,
  ): number {
    if (!attackerElement || !targetElement) return 1.0;
    if (attackerElement === targetElement) return 1.0;

    if (hasElementAdvantage(attackerElement, targetElement)) {
      return ELEMENT_ADVANTAGE_MULTIPLIER;
    }

    // Check reverse: if target has advantage over attacker, attacker is at disadvantage
    if (hasElementAdvantage(targetElement, attackerElement)) {
      return ELEMENT_DISADVANTAGE_MULTIPLIER;
    }

    return 1.0;
  }

  /**
   * Check if a target has status effects with a different element, which would
   * trigger an element reaction with the incoming element.
   * Returns the reaction if found, null otherwise.
   */
  static checkElementReaction(
    incomingElement: ElementType,
    target: Unit,
  ): { reaction: ElementReaction; existingElement: ElementType } | null {
    // Look for existing element status effects on the target
    for (const effect of target.statusEffects) {
      if (effect.element && effect.element !== incomingElement) {
        const key = getReactionKey(incomingElement, effect.element);
        if (key) {
          const reaction = ELEMENT_REACTIONS[key];
          if (reaction) {
            return { reaction, existingElement: effect.element };
          }
        }
      }
    }
    return null;
  }

  /**
   * Apply an element reaction effect to the target.
   * - Deals bonus damage based on the reaction's damageMultiplier
   * - Optionally applies a status effect
   * - Emits 'element:reaction' event via EventBus
   */
  static applyElementReaction(
    reaction: ElementReaction,
    incomingElement: ElementType,
    existingElement: ElementType,
    target: Unit,
    baseDamage: number,
    attacker?: Unit,
    rng?: SeededRNG,
  ): number {
    // Calculate reaction bonus damage
    const reactionBonus = RelicSystem.getReactionDamageBonus();
    const cappedBonus = Math.min(reactionBonus, REACTION_DAMAGE_BONUS_CAP);
    const reactionDamage = Math.round(baseDamage * (reaction.damageMultiplier - 1) * (1 + cappedBonus));

    if (reactionDamage > 0) {
      target.takeDamage(reactionDamage);
    }

    // Chain reaction splash: 30% of reaction damage to up to 2 nearby enemies
    if (RelicSystem.hasChainReactionSplash() && reactionDamage > 0) {
      const splashDamage = Math.round(reactionDamage * 0.3);
      if (splashDamage > 0) {
        const splashTargets = RelicSystem.getSplashTargets(target.unitId, 2);
        for (const nearby of splashTargets) {
          nearby.takeDamage(splashDamage);
        }
      }
    }

    // Apply reaction status effect if defined
    if (reaction.statusEffect && reaction.duration) {
      const statusEffect: StatusEffect = {
        id: nextEffectId(`reaction_${reaction.name}`),
        type: 'debuff',
        name: reaction.statusEffect,
        duration: reaction.duration,
        value: reaction.statusEffect === 'defense_down' ? -15 : 0,
        stat: reaction.statusEffect === 'defense_down' ? 'defense' : undefined,
        element: incomingElement,
      };
      target.statusEffects.push(statusEffect);
      target.invalidateStats();
    }

    // --- Relic reaction-bound secondary effects ---

    // fire_emblem: burn DoT on melt (fire+ice)
    if (reaction.name === '融化' && RelicSystem.hasRelic('fire_emblem') && reactionDamage > 0) {
      const burnDot: StatusEffect = {
        id: nextEffectId('fire_emblem_burn'),
        type: 'dot',
        name: 'burn',
        duration: 3,
        value: Math.round(reactionDamage * 0.15),
        element: 'fire',
      };
      target.statusEffects.push(burnDot);
      target.invalidateStats();
    }

    // ice_crystal_pendant: extend defense_down on superconduct (ice+lightning)
    if (reaction.name === '超导' && RelicSystem.hasRelic('ice_crystal_pendant')) {
      const defDown = target.statusEffects.find(e => e.name === 'defense_down');
      if (defDown) {
        defDown.duration += 2; // 5s → 7s
      }
    }

    // lightning_rod: chain 50% reaction damage on overload (fire+lightning)
    if (reaction.name === '超载' && RelicSystem.hasRelic('lightning_rod') && reactionDamage > 0) {
      const chainDamage = Math.round(reactionDamage * 0.5);
      if (chainDamage > 0) {
        const chainTargets = RelicSystem.getSplashTargets(target.unitId, 1);
        for (const t of chainTargets) {
          t.takeDamage(chainDamage);
        }
      }
    }

    // Emit element reaction event
    EventBus.getInstance().emit('element:reaction', {
      element1: incomingElement,
      element2: existingElement,
      targetId: target.unitId,
      reactionType: reaction.name,
      attackerId: attacker?.unitId ?? '',
      damage: reactionDamage,
    });

    // Mutation: reaction_chain — 25% chance to spread trigger element to nearby enemy
    if (MetaManager.hasMutation('reaction_chain') && attacker && rng && rng.chance(0.25)) {
      const spreadTargets = RelicSystem.getSplashTargets(target.unitId, 1);
      if (spreadTargets.length > 0) {
        const spreadTarget = spreadTargets[0];
        const spreadEffect: StatusEffect = {
          id: nextEffectId('reaction_chain'),
          type: 'debuff',
          name: `element_${incomingElement}`,
          duration: 3,
          value: 0,
          element: incomingElement,
        };
        spreadTarget.statusEffects.push(spreadEffect);
        spreadTarget.invalidateStats();
      }
    }

    return reactionDamage;
  }
}
