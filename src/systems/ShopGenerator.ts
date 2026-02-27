import { ItemData, Rarity } from '../types';
import { SeededRNG } from '../utils/rng';
import itemsData from '../data/items.json';

const RARITY_WEIGHTS: Record<string, Record<Rarity, number>> = {
  early: { common: 50, uncommon: 30, rare: 15, epic: 5, legendary: 0 },
  mid: { common: 30, uncommon: 35, rare: 25, epic: 10, legendary: 0 },
  late: { common: 15, uncommon: 25, rare: 35, epic: 20, legendary: 5 },
};

export class ShopGenerator {
  /**
   * Generate a shop inventory.
   * @param rng Seeded RNG
   * @param actIndex Current act (0 = early, 1 = mid, 2+ = late)
   * @param itemCount Number of items to offer (4-6)
   */
  static generate(rng: SeededRNG, actIndex: number, itemCount?: number): ItemData[] {
    const count = itemCount ?? rng.nextInt(4, 6);
    const stage = actIndex <= 0 ? 'early' : actIndex === 1 ? 'mid' : 'late';
    const weights = RARITY_WEIGHTS[stage];

    const allItems = itemsData as ItemData[];
    const rarities: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    const rarityWeights = rarities.map(r => weights[r]);

    const selected: ItemData[] = [];
    const usedIds = new Set<string>();

    for (let i = 0; i < count; i++) {
      // Roll rarity
      const rarity = rng.weightedPick(rarities, rarityWeights);
      const candidates = allItems.filter(item => item.rarity === rarity && !usedIds.has(item.id));

      if (candidates.length > 0) {
        const item = rng.pick(candidates);
        selected.push(item);
        usedIds.add(item.id);
      } else {
        // Fallback: pick any unused item
        const fallback = allItems.filter(item => !usedIds.has(item.id));
        if (fallback.length > 0) {
          const item = rng.pick(fallback);
          selected.push(item);
          usedIds.add(item.id);
        }
      }
    }

    return selected;
  }
}
