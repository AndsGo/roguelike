import { ElementType } from '../types';

/**
 * Element advantage table.
 * advantageTable[attacker] = list of elements the attacker is strong against.
 * Advantage multiplier: 1.2x damage
 * Disadvantage multiplier: 0.85x damage
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
    name: '融化',
    description: '火焰与冰霜相遇，造成额外伤害',
    damageMultiplier: 1.5,
    statusEffect: 'wet',
    duration: 3,
  },
  'fire+lightning': {
    name: '超载',
    description: '爆炸性反应，造成范围伤害',
    damageMultiplier: 1.8,
  },
  'ice+lightning': {
    name: '超导',
    description: '降低目标防御',
    damageMultiplier: 1.2,
    statusEffect: 'defense_down',
    duration: 5,
  },
  'dark+holy': {
    name: '湮灭',
    description: '对立之力引发毁灭性伤害',
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
