import { describe, it, expect, beforeEach } from 'vitest';
import { MetaManager } from '../../src/managers/MetaManager';
import { ShopGenerator } from '../../src/systems/ShopGenerator';
import { RunManager } from '../../src/managers/RunManager';
import { SeededRNG } from '../../src/utils/rng';

// Helper: buy upgrades until total levels >= target, then purchase a mutation
function unlockAndPurchase(mutationId: string): void {
  MetaManager.addMetaCurrency(10000);
  const ids = ['starting_gold', 'starting_hp', 'exp_bonus', 'crit_bonus', 'relic_chance'];
  let bought = 0;
  let idx = 0;
  while (bought < 10 && idx < ids.length * 10) {
    if (MetaManager.purchaseUpgrade(ids[idx % ids.length])) {
      bought++;
    }
    idx++;
  }
  MetaManager.purchaseMutation(mutationId);
}

describe('Run-start mutations', () => {
  beforeEach(() => {
    MetaManager.resetAll();
  });

  describe('shop_extra_item', () => {
    it('adds 1 item to shop when mutation is active', () => {
      const rng1 = new SeededRNG(42);
      const baseCount = ShopGenerator.generate(rng1, 0).length;

      unlockAndPurchase('shop_extra_item');
      const rng2 = new SeededRNG(42);
      const mutatedCount = ShopGenerator.generate(rng2, 0).length;

      expect(mutatedCount).toBe(baseCount + 1);
    });

    it('shop without mutation has normal item count', () => {
      const rng = new SeededRNG(42);
      const count = ShopGenerator.generate(rng, 0).length;
      expect(count).toBeGreaterThanOrEqual(4);
      expect(count).toBeLessThanOrEqual(6);
    });
  });

  describe('start_with_relic', () => {
    it('starts run with a common relic when mutation is active', () => {
      unlockAndPurchase('start_with_relic');
      const rm = RunManager.getInstance();
      rm.newRun(123, 'normal', ['warrior', 'archer']);
      const relics = rm.getRelics();
      expect(relics.length).toBe(1);
      expect(relics[0].triggerCount).toBe(0);
    });

    it('starts run with no relics without mutation', () => {
      const rm = RunManager.getInstance();
      rm.newRun(123, 'normal', ['warrior', 'archer']);
      expect(rm.getRelics().length).toBe(0);
    });
  });
});
