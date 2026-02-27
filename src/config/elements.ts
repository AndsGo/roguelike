import { ElementType } from '../types';

/**
 * Element advantage table.
 * advantageTable[attacker] = list of elements the attacker is strong against.
 * Advantage multiplier: 1.3x damage
 * Disadvantage multiplier: 0.7x damage
 */
export const ELEMENT_ADVANTAGE: Record<ElementType, ElementType[]> = {
  fire: ['ice'],
  ice: ['lightning'],
  lightning: ['fire'],
  dark: ['holy'],
  holy: ['dark'],
};

export const ELEMENT_ADVANTAGE_MULTIPLIER = 1.2;
export const ELEMENT_DISADVANTAGE_MULTIPLIER = 0.85;

/**
 * Element reaction table.
 * When two different elements collide on a target, a reaction occurs.
 */
export interface ElementReaction {
  name: string;
  description: string;
  damageMultiplier: number;
  statusEffect?: string;
  duration?: number;
}

export const ELEMENT_REACTIONS: Record<string, ElementReaction> = {
  'fire+ice': {
    name: 'Melt',
    description: 'Fire meets ice, dealing bonus damage',
    damageMultiplier: 1.5,
    statusEffect: 'wet',
    duration: 3,
  },
  'fire+lightning': {
    name: 'Overload',
    description: 'Explosive reaction dealing AoE damage',
    damageMultiplier: 1.8,
  },
  'ice+lightning': {
    name: 'Superconduct',
    description: 'Reduces target defense',
    damageMultiplier: 1.2,
    statusEffect: 'defense_down',
    duration: 5,
  },
  'dark+holy': {
    name: 'Annihilation',
    description: 'Opposing forces cause massive damage',
    damageMultiplier: 2.0,
  },
};

/** Get the reaction key for two elements (order-independent) */
export function getReactionKey(a: ElementType, b: ElementType): string | null {
  if (a === b) return null;
  const sorted = [a, b].sort();
  const key = `${sorted[0]}+${sorted[1]}`;
  return key in ELEMENT_REACTIONS ? key : null;
}

/** Check if attacker element has advantage over target element */
export function hasElementAdvantage(attacker: ElementType, target: ElementType): boolean {
  return ELEMENT_ADVANTAGE[attacker]?.includes(target) ?? false;
}
