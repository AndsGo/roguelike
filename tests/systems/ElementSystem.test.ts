import { describe, it, expect, beforeEach } from 'vitest';
import { ElementSystem } from '../../src/systems/ElementSystem';
import { EventBus } from '../../src/systems/EventBus';
import {
  ELEMENT_ADVANTAGE_MULTIPLIER,
  ELEMENT_DISADVANTAGE_MULTIPLIER,
  ELEMENT_REACTIONS,
  getReactionKey,
  hasElementAdvantage,
} from '../../src/config/elements';
import { createMockUnit } from '../mocks/phaser';

describe('ElementSystem', () => {
  beforeEach(() => {
    EventBus.getInstance().reset();
  });

  describe('getElementMultiplier', () => {
    it('fire > ice returns advantage multiplier', () => {
      expect(ElementSystem.getElementMultiplier('fire', 'ice')).toBe(ELEMENT_ADVANTAGE_MULTIPLIER);
    });

    it('ice > fire returns disadvantage multiplier', () => {
      expect(ElementSystem.getElementMultiplier('ice', 'fire')).toBe(ELEMENT_DISADVANTAGE_MULTIPLIER);
    });

    it('ice > lightning returns advantage multiplier', () => {
      expect(ElementSystem.getElementMultiplier('ice', 'lightning')).toBe(ELEMENT_ADVANTAGE_MULTIPLIER);
    });

    it('lightning > fire returns advantage multiplier', () => {
      expect(ElementSystem.getElementMultiplier('lightning', 'fire')).toBe(ELEMENT_ADVANTAGE_MULTIPLIER);
    });

    it('dark > holy returns advantage multiplier', () => {
      expect(ElementSystem.getElementMultiplier('dark', 'holy')).toBe(ELEMENT_ADVANTAGE_MULTIPLIER);
    });

    it('holy > dark returns advantage multiplier', () => {
      expect(ElementSystem.getElementMultiplier('holy', 'dark')).toBe(ELEMENT_ADVANTAGE_MULTIPLIER);
    });

    it('advantage multiplier is > 1.0', () => {
      expect(ELEMENT_ADVANTAGE_MULTIPLIER).toBeGreaterThan(1.0);
    });

    it('disadvantage multiplier is < 1.0', () => {
      expect(ELEMENT_DISADVANTAGE_MULTIPLIER).toBeLessThan(1.0);
    });

    it('same element returns 1.0x', () => {
      expect(ElementSystem.getElementMultiplier('fire', 'fire')).toBe(1.0);
      expect(ElementSystem.getElementMultiplier('ice', 'ice')).toBe(1.0);
    });

    it('no attacker element returns 1.0x', () => {
      expect(ElementSystem.getElementMultiplier(undefined, 'fire')).toBe(1.0);
    });

    it('no target element returns 1.0x', () => {
      expect(ElementSystem.getElementMultiplier('fire', undefined)).toBe(1.0);
    });

    it('both undefined returns 1.0x', () => {
      expect(ElementSystem.getElementMultiplier(undefined, undefined)).toBe(1.0);
    });

    it('neutral matchups return 1.0x', () => {
      // fire vs dark: neither has advantage
      expect(ElementSystem.getElementMultiplier('fire', 'dark')).toBe(1.0);
      expect(ElementSystem.getElementMultiplier('ice', 'holy')).toBe(1.0);
    });
  });

  describe('getReactionKey', () => {
    it('fire+ice returns a valid key (order-independent)', () => {
      const key1 = getReactionKey('fire', 'ice');
      const key2 = getReactionKey('ice', 'fire');
      expect(key1).toBe(key2);
      expect(key1).toBe('fire+ice');
    });

    it('fire+lightning returns a valid key', () => {
      const key = getReactionKey('fire', 'lightning');
      expect(key).toBe('fire+lightning');
    });

    it('ice+lightning returns a valid key', () => {
      const key = getReactionKey('ice', 'lightning');
      expect(key).toBe('ice+lightning');
    });

    it('dark+holy returns a valid key', () => {
      const key = getReactionKey('dark', 'holy');
      expect(key).toBe('dark+holy');
    });

    it('same element returns null', () => {
      expect(getReactionKey('fire', 'fire')).toBeNull();
    });

    it('non-reacting elements return null', () => {
      expect(getReactionKey('fire', 'dark')).toBeNull();
    });
  });

  describe('ELEMENT_REACTIONS existence', () => {
    it('fire+ice (融化) exists', () => {
      expect(ELEMENT_REACTIONS['fire+ice']).toBeDefined();
      expect(ELEMENT_REACTIONS['fire+ice'].name).toBe('融化');
    });

    it('fire+lightning (超载) exists', () => {
      expect(ELEMENT_REACTIONS['fire+lightning']).toBeDefined();
      expect(ELEMENT_REACTIONS['fire+lightning'].name).toBe('超载');
    });

    it('ice+lightning (超导) exists', () => {
      expect(ELEMENT_REACTIONS['ice+lightning']).toBeDefined();
      expect(ELEMENT_REACTIONS['ice+lightning'].name).toBe('超导');
    });

    it('dark+holy (湮灭) exists', () => {
      expect(ELEMENT_REACTIONS['dark+holy']).toBeDefined();
      expect(ELEMENT_REACTIONS['dark+holy'].name).toBe('湮灭');
    });
  });

  describe('hasElementAdvantage', () => {
    it('fire beats ice', () => {
      expect(hasElementAdvantage('fire', 'ice')).toBe(true);
    });

    it('ice beats lightning', () => {
      expect(hasElementAdvantage('ice', 'lightning')).toBe(true);
    });

    it('lightning beats fire', () => {
      expect(hasElementAdvantage('lightning', 'fire')).toBe(true);
    });

    it('dark beats holy', () => {
      expect(hasElementAdvantage('dark', 'holy')).toBe(true);
    });

    it('holy beats dark', () => {
      expect(hasElementAdvantage('holy', 'dark')).toBe(true);
    });

    it('fire does NOT beat fire', () => {
      expect(hasElementAdvantage('fire', 'fire')).toBe(false);
    });

    it('fire does NOT beat dark', () => {
      expect(hasElementAdvantage('fire', 'dark')).toBe(false);
    });
  });

  describe('checkElementReaction', () => {
    it('returns reaction when target has a different element status effect', () => {
      const target = createMockUnit({
        element: 'ice',
        statusEffects: [
          { id: 'eff1', type: 'dot', name: 'freeze', duration: 3, value: 5, element: 'ice' },
        ],
      });
      const result = ElementSystem.checkElementReaction('fire', target as any);
      expect(result).not.toBeNull();
      expect(result!.reaction.name).toBe('融化');
      expect(result!.existingElement).toBe('ice');
    });

    it('returns null when no element status effects on target', () => {
      const target = createMockUnit({ element: 'ice', statusEffects: [] });
      const result = ElementSystem.checkElementReaction('fire', target as any);
      expect(result).toBeNull();
    });

    it('returns null when same element status effect on target', () => {
      const target = createMockUnit({
        element: 'fire',
        statusEffects: [
          { id: 'eff1', type: 'dot', name: 'burn', duration: 3, value: 5, element: 'fire' },
        ],
      });
      const result = ElementSystem.checkElementReaction('fire', target as any);
      expect(result).toBeNull();
    });
  });

  describe('applyElementReaction', () => {
    it('deals reaction bonus damage to target', () => {
      const target = createMockUnit({ currentHp: 200, maxHp: 200 });
      const reaction = ELEMENT_REACTIONS['fire+ice']; // Melt: 1.5x
      const reactionDmg = ElementSystem.applyElementReaction(
        reaction, 'fire', 'ice', target as any, 100,
      );
      // damageMultiplier 1.5 -> bonus = round(100 * (1.5 - 1)) = 50
      expect(reactionDmg).toBe(50);
      expect(target.currentHp).toBe(150); // 200 - 50
    });

    it('Overload deals 80% bonus damage', () => {
      const target = createMockUnit({ currentHp: 500, maxHp: 500 });
      const reaction = ELEMENT_REACTIONS['fire+lightning']; // 1.8x
      const reactionDmg = ElementSystem.applyElementReaction(
        reaction, 'fire', 'lightning', target as any, 100,
      );
      expect(reactionDmg).toBe(80); // round(100 * 0.8)
    });

    it('Annihilation deals 100% bonus damage', () => {
      const target = createMockUnit({ currentHp: 500, maxHp: 500 });
      const reaction = ELEMENT_REACTIONS['dark+holy']; // 2.0x
      const reactionDmg = ElementSystem.applyElementReaction(
        reaction, 'dark', 'holy', target as any, 100,
      );
      expect(reactionDmg).toBe(100); // round(100 * 1.0)
    });

    it('Superconduct (ice+lightning) deals 20% bonus damage', () => {
      const target = createMockUnit({ currentHp: 500, maxHp: 500 });
      const reaction = ELEMENT_REACTIONS['ice+lightning']; // 1.2x
      const reactionDmg = ElementSystem.applyElementReaction(
        reaction, 'ice', 'lightning', target as any, 100,
      );
      expect(reactionDmg).toBe(20); // round(100 * 0.2)
      expect(target.currentHp).toBe(480);
    });

    it('Superconduct applies defense_down status effect', () => {
      const target = createMockUnit({ currentHp: 500, maxHp: 500 });
      const reaction = ELEMENT_REACTIONS['ice+lightning'];
      ElementSystem.applyElementReaction(
        reaction, 'ice', 'lightning', target as any, 100,
      );
      expect(target.statusEffects.length).toBe(1);
      const effect = target.statusEffects[0];
      expect(effect.name).toBe('defense_down');
      expect(effect.type).toBe('debuff');
      expect(effect.stat).toBe('defense');
      expect(effect.value).toBe(-15);
      expect(effect.duration).toBe(5);
    });

    it('Melt applies wet status effect', () => {
      const target = createMockUnit({ currentHp: 500, maxHp: 500 });
      const reaction = ELEMENT_REACTIONS['fire+ice'];
      ElementSystem.applyElementReaction(
        reaction, 'fire', 'ice', target as any, 100,
      );
      expect(target.statusEffects.length).toBe(1);
      expect(target.statusEffects[0].name).toBe('wet');
      expect(target.statusEffects[0].duration).toBe(3);
    });

    it('Overload does not apply status effect', () => {
      const target = createMockUnit({ currentHp: 500, maxHp: 500 });
      const reaction = ELEMENT_REACTIONS['fire+lightning'];
      ElementSystem.applyElementReaction(
        reaction, 'fire', 'lightning', target as any, 100,
      );
      expect(target.statusEffects.length).toBe(0);
    });

    it('emits element:reaction event', () => {
      const events: any[] = [];
      EventBus.getInstance().on('element:reaction', (data: any) => events.push(data));

      const target = createMockUnit({ currentHp: 500, maxHp: 500, unitId: 'target1' });
      const reaction = ELEMENT_REACTIONS['fire+ice'];
      ElementSystem.applyElementReaction(
        reaction, 'fire', 'ice', target as any, 100,
      );
      expect(events.length).toBe(1);
      expect(events[0].element1).toBe('fire');
      expect(events[0].element2).toBe('ice');
      expect(events[0].targetId).toBe('target1');
      expect(events[0].reactionType).toBe('融化');
    });

    it('baseDamage=0 时 reactionDamage=0 且不调用 takeDamage', () => {
      const target = createMockUnit({ currentHp: 500, maxHp: 500 });
      const reaction = ELEMENT_REACTIONS['fire+ice'];
      const reactionDmg = ElementSystem.applyElementReaction(
        reaction, 'fire', 'ice', target as any, 0,
      );
      expect(reactionDmg).toBe(0);
      expect(target.currentHp).toBe(500); // 无伤害
    });
  });

  describe('checkElementReaction — 补充', () => {
    it('非反应元素对返回 null (fire effect + dark incoming)', () => {
      const target = createMockUnit({
        statusEffects: [
          { id: 'eff1', type: 'dot', name: 'burn', duration: 3, value: 5, element: 'fire' },
        ],
      });
      const result = ElementSystem.checkElementReaction('dark', target as any);
      expect(result).toBeNull();
    });

    it('target 有多个效果时匹配第一个可反应的', () => {
      const target = createMockUnit({
        statusEffects: [
          { id: 'eff1', type: 'debuff', name: 'slow', duration: 3, value: -10, element: 'dark' },
          { id: 'eff2', type: 'dot', name: 'freeze', duration: 3, value: 5, element: 'ice' },
        ],
      });
      // incoming = fire, dark+fire = no reaction, ice+fire = 融化
      const result = ElementSystem.checkElementReaction('fire', target as any);
      expect(result).not.toBeNull();
      expect(result!.reaction.name).toBe('融化');
      expect(result!.existingElement).toBe('ice');
    });
  });
});
