import { EquipmentSlot } from '../types';

const RARITY_ICON_FRAMES = new Set(['common', 'uncommon', 'rare', 'epic', 'legendary']);

export function getEquipmentIconFrame(slot: EquipmentSlot): string {
  return slot;
}

export function getRelicIconFrame(): string {
  return 'relic';
}

export function getRarityIconFrame(rarity: string): string {
  return RARITY_ICON_FRAMES.has(rarity) ? rarity : 'common';
}
