import { describe, it, expect } from 'vitest';
import { ELEMENT_ADVANTAGE_MULTIPLIER, ELEMENT_DISADVANTAGE_MULTIPLIER } from '../../src/config/elements';
import { SYNERGY_DEFINITIONS } from '../../src/config/synergies';
import heroesData from '../../src/data/heroes.json';

describe('Phase 2a numeric balance', () => {
  describe('element multipliers (P1-1)', () => {
    it('advantage multiplier is 1.35', () => {
      expect(ELEMENT_ADVANTAGE_MULTIPLIER).toBe(1.35);
    });
    it('disadvantage multiplier is 0.7', () => {
      expect(ELEMENT_DISADVANTAGE_MULTIPLIER).toBe(0.7);
    });
  });

  describe('element synergy bonus (P1-2)', () => {
    const elementSynergies = SYNERGY_DEFINITIONS.filter(s => s.type === 'element');
    it('all 5 element synergies have bonus 0.20', () => {
      expect(elementSynergies).toHaveLength(5);
      for (const syn of elementSynergies) {
        const effect = syn.thresholds[0].effects[0];
        expect(effect.value, `${syn.key} synergy bonus`).toBe(0.20);
      }
    });
  });

  describe('tank defense scaling (P1-8)', () => {
    const warrior = (heroesData as any[]).find(h => h.id === 'warrior');
    const knight = (heroesData as any[]).find(h => h.id === 'knight');
    it('warrior defense scaling is 7', () => {
      expect(warrior.scalingPerLevel.defense).toBe(7);
    });
    it('knight defense scaling is 8', () => {
      expect(knight.scalingPerLevel.defense).toBe(8);
    });
  });

  describe('magma_warden speed (P1-9)', () => {
    const magma = (heroesData as any[]).find(h => h.id === 'magma_warden');
    it('base speed is 50', () => {
      expect(magma.baseStats.speed).toBe(50);
    });
  });
});
