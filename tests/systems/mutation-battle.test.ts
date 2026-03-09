import { describe, it, expect, beforeEach } from 'vitest';
import { MetaManager } from '../../src/managers/MetaManager';

// Helper: unlock mutation tier and purchase a specific mutation
function unlockAndPurchase(mutationId: string): void {
  MetaManager.addMetaCurrency(10000);
  for (let i = 0; i < 10; i++) {
    MetaManager.purchaseUpgrade('starting_gold');
    if (MetaManager.getUpgrade('starting_gold')!.level >= 5) {
      MetaManager.purchaseUpgrade('starting_hp');
    }
  }
  MetaManager.purchaseMutation(mutationId);
}

describe('Battle mutations', () => {
  beforeEach(() => {
    MetaManager.resetAll();
  });

  describe('overkill_splash', () => {
    it('mutation can be purchased and checked', () => {
      unlockAndPurchase('overkill_splash');
      expect(MetaManager.hasMutation('overkill_splash')).toBe(true);
    });

    it('costs 150 meta currency', () => {
      const def = MetaManager.MUTATION_DEFS.find(d => d.id === 'overkill_splash');
      expect(def?.cost).toBe(150);
    });

    it('is not active before purchase', () => {
      expect(MetaManager.hasMutation('overkill_splash')).toBe(false);
    });
  });

  describe('crit_cooldown', () => {
    it('mutation can be purchased and checked', () => {
      unlockAndPurchase('crit_cooldown');
      expect(MetaManager.hasMutation('crit_cooldown')).toBe(true);
    });

    it('costs 120 meta currency', () => {
      const def = MetaManager.MUTATION_DEFS.find(d => d.id === 'crit_cooldown');
      expect(def?.cost).toBe(120);
    });

    it('is not active before purchase', () => {
      expect(MetaManager.hasMutation('crit_cooldown')).toBe(false);
    });
  });

  describe('heal_shield', () => {
    it('mutation can be purchased and checked', () => {
      unlockAndPurchase('heal_shield');
      expect(MetaManager.hasMutation('heal_shield')).toBe(true);
    });

    it('costs 100 meta currency', () => {
      const def = MetaManager.MUTATION_DEFS.find(d => d.id === 'heal_shield');
      expect(def?.cost).toBe(100);
    });

    it('is not active before purchase', () => {
      expect(MetaManager.hasMutation('heal_shield')).toBe(false);
    });
  });

  describe('reaction_chain', () => {
    it('mutation can be purchased and checked', () => {
      unlockAndPurchase('reaction_chain');
      expect(MetaManager.hasMutation('reaction_chain')).toBe(true);
    });

    it('costs 130 meta currency', () => {
      const def = MetaManager.MUTATION_DEFS.find(d => d.id === 'reaction_chain');
      expect(def?.cost).toBe(130);
    });

    it('is not active before purchase', () => {
      expect(MetaManager.hasMutation('reaction_chain')).toBe(false);
    });
  });

  describe('mutation gate requirement', () => {
    it('cannot purchase mutations without enough total upgrade levels', () => {
      MetaManager.addMetaCurrency(10000);
      // Try to purchase without any upgrades
      const result = MetaManager.purchaseMutation('overkill_splash');
      expect(result).toBe(false);
      expect(MetaManager.hasMutation('overkill_splash')).toBe(false);
    });
  });
});
