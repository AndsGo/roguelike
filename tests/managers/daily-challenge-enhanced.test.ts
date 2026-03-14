import { describe, it, expect } from 'vitest';
import { DailyChallengeManager, DailyRule } from '../../src/managers/DailyChallengeManager';

describe('DailyChallengeManager — enhanced rule pool', () => {
  // Helper: get rules for a given seed
  function getRulesForSeed(seed: number): DailyRule[] {
    return DailyChallengeManager.getDailyModifiers(seed).rules;
  }

  describe('All 7 rule types can appear', () => {
    it('finds all 7 rule types across 500 seeds', () => {
      const seen = new Set<string>();
      for (let seed = 0; seed < 500; seed++) {
        const { rules } = DailyChallengeManager.getDailyModifiers(seed * 1337 + 42);
        for (const r of rules) seen.add(r.type);
      }
      expect(seen).toContain('enemy_element');
      expect(seen).toContain('gold_modifier');
      expect(seen).toContain('hp_modifier');
      expect(seen).toContain('double_crit');
      expect(seen).toContain('gold_rush');
      expect(seen).toContain('element_chaos');
      expect(seen).toContain('speed_frenzy');
    });
  });

  describe('gold_rush and gold_modifier mutual exclusion', () => {
    it('never has both gold_rush and gold_modifier in same day', () => {
      for (let seed = 0; seed < 1000; seed++) {
        const rules = getRulesForSeed(seed * 991 + 7);
        const hasGoldModifier = rules.some(r => r.type === 'gold_modifier');
        const hasGoldRush = rules.some(r => r.type === 'gold_rush');
        expect(hasGoldModifier && hasGoldRush).toBe(false);
      }
    });

    it('at most one gold-type rule per day', () => {
      for (let seed = 0; seed < 500; seed++) {
        const rules = getRulesForSeed(seed * 2003 + 13);
        const goldCount = rules.filter(r => r.type === 'gold_modifier' || r.type === 'gold_rush').length;
        expect(goldCount).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('formatDailyRule', () => {
    it('formats enemy_element rule', () => {
      const rule: DailyRule = { type: 'enemy_element', label: '', value: 'fire' };
      const { icon, text } = DailyChallengeManager.formatDailyRule(rule);
      expect(icon).toBe('⚔');
      expect(text).toContain('火属性');
      expect(text).toContain('+20%');
    });

    it('formats gold_modifier rule', () => {
      const rule: DailyRule = { type: 'gold_modifier', label: '', value: 1.5 };
      const { icon, text } = DailyChallengeManager.formatDailyRule(rule);
      expect(icon).toBe('💰');
      expect(text).toContain('1.5');
    });

    it('formats hp_modifier rule', () => {
      const rule: DailyRule = { type: 'hp_modifier', label: '', value: 0.8 };
      const { icon, text } = DailyChallengeManager.formatDailyRule(rule);
      expect(icon).toBe('❤');
      expect(text).toContain('0.8');
    });

    it('formats double_crit rule', () => {
      const rule: DailyRule = { type: 'double_crit', label: '', value: null };
      const { icon, text } = DailyChallengeManager.formatDailyRule(rule);
      expect(icon).toBe('💥');
      expect(text).toContain('暴击');
    });

    it('formats gold_rush rule', () => {
      const rule: DailyRule = { type: 'gold_rush', label: '', value: null };
      const { icon, text } = DailyChallengeManager.formatDailyRule(rule);
      expect(icon).toBe('🏆');
      expect(text).toContain('金币');
    });

    it('formats element_chaos rule', () => {
      const rule: DailyRule = { type: 'element_chaos', label: '', value: null };
      const { icon, text } = DailyChallengeManager.formatDailyRule(rule);
      expect(icon).toBe('🌀');
      expect(text).toContain('元素');
    });

    it('formats speed_frenzy rule', () => {
      const rule: DailyRule = { type: 'speed_frenzy', label: '', value: null };
      const { icon, text } = DailyChallengeManager.formatDailyRule(rule);
      expect(icon).toBe('⚡');
      expect(text).toContain('攻速');
    });

    it('formats hero_restriction rule', () => {
      const rule: DailyRule = { type: 'hero_restriction', label: '', value: 'warrior' };
      const { icon, text } = DailyChallengeManager.formatDailyRule(rule);
      expect(icon).toBe('🚫');
      expect(text).toContain('warrior');
    });

    it('formatDailyRuleShort combines icon and text', () => {
      const rule: DailyRule = { type: 'double_crit', label: '', value: null };
      const short = DailyChallengeManager.formatDailyRuleShort(rule);
      expect(short).toContain('💥');
      expect(short).toContain('暴击');
    });
  });

  describe('generateGhostScores', () => {
    it('returns exactly 5 scores', () => {
      const scores = DailyChallengeManager.generateGhostScores(12345);
      expect(scores).toHaveLength(5);
    });

    it('all scores are in range [200, 1200]', () => {
      const scores = DailyChallengeManager.generateGhostScores(99999);
      for (const entry of scores) {
        expect(entry.score).toBeGreaterThanOrEqual(200);
        expect(entry.score).toBeLessThanOrEqual(1200);
      }
    });

    it('scores are sorted in descending order', () => {
      const scores = DailyChallengeManager.generateGhostScores(77777);
      for (let i = 1; i < scores.length; i++) {
        expect(scores[i - 1].score).toBeGreaterThanOrEqual(scores[i].score);
      }
    });

    it('is deterministic — same seed yields same results', () => {
      const a = DailyChallengeManager.generateGhostScores(42424);
      const b = DailyChallengeManager.generateGhostScores(42424);
      expect(a).toEqual(b);
    });

    it('different seeds yield different results', () => {
      const a = DailyChallengeManager.generateGhostScores(1);
      const b = DailyChallengeManager.generateGhostScores(2);
      // Very unlikely to be identical with different seeds
      const aSig = a.map(e => e.name + e.score).join(',');
      const bSig = b.map(e => e.name + e.score).join(',');
      expect(aSig).not.toBe(bSig);
    });

    it('all names are non-empty strings', () => {
      const scores = DailyChallengeManager.generateGhostScores(55555);
      for (const entry of scores) {
        expect(typeof entry.name).toBe('string');
        expect(entry.name.length).toBeGreaterThan(0);
      }
    });
  });
});
