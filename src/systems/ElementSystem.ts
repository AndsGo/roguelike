import { ElementType, StatusEffect } from '../types';
import { EventBus } from './EventBus';
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
    const reactionDamage = Math.round(baseDamage * (reaction.damageMultiplier - 1) * (1 + reactionBonus));

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
        id: `reaction_${reaction.name}_${Date.now()}`,
        type: 'debuff',
        name: reaction.statusEffect,
        duration: reaction.duration,
        value: reaction.statusEffect === 'defense_down' ? -15 : 0,
        stat: reaction.statusEffect === 'defense_down' ? 'defense' : undefined,
        element: incomingElement,
      };
      target.statusEffects.push(statusEffect);
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
          id: `reaction_chain_${Date.now()}`,
          type: 'debuff',
          name: `element_${incomingElement}`,
          duration: 3,
          value: 0,
          element: incomingElement,
        };
        spreadTarget.statusEffects.push(spreadEffect);
      }
    }

    return reactionDamage;
  }
}
