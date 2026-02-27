import { describe, it, expect, beforeEach } from 'vitest';
import { ShopScene } from '../../src/scenes/ShopScene';
import { RunManager } from '../../src/managers/RunManager';
import { EventBus } from '../../src/systems/EventBus';
import { SceneTestHarness } from '../helpers/scene-harness';

describe('ShopScene', () => {
  let rm: RunManager;

  beforeEach(() => {
    EventBus.getInstance().reset();
    rm = RunManager.getInstance();
    rm.newRun(42);
  });

  function ensureShopNode(nodeIndex: number): void {
    const map = rm.getMap();
    while (map.length <= nodeIndex) {
      map.push({
        index: map.length,
        type: 'battle',
        completed: false,
        connections: [],
      });
    }
    map[nodeIndex] = {
      index: nodeIndex,
      type: 'shop',
      completed: false,
      connections: [],
    };
    rm.setMap(map);
  }

  describe('lifecycle', () => {
    it('creates without errors', () => {
      ensureShopNode(0);
      const scene = SceneTestHarness.createScene(ShopScene, { nodeIndex: 0 });
      expect(scene).toBeDefined();
    });

    it('init sets nodeIndex and resets state', () => {
      ensureShopNode(2);
      const scene = SceneTestHarness.createScene(ShopScene, { nodeIndex: 2 });
      expect((scene as any).nodeIndex).toBe(2);
      expect((scene as any).selectedHero).toBeNull();
      expect((scene as any).itemCards).toBeDefined();
      expect((scene as any).heroButtons).toBeDefined();
    });

    it('defaults nodeIndex to 0', () => {
      ensureShopNode(0);
      const scene = SceneTestHarness.createScene(ShopScene, {});
      expect((scene as any).nodeIndex).toBe(0);
    });
  });

  describe('shop items', () => {
    it('generates shop items from ShopGenerator', () => {
      ensureShopNode(0);
      const scene = SceneTestHarness.createScene(ShopScene, { nodeIndex: 0 });
      const items = (scene as any).shopItems;
      expect(items).toBeDefined();
      expect(items.length).toBeGreaterThan(0);
    });

    it('creates item cards for each shop item', () => {
      ensureShopNode(0);
      const scene = SceneTestHarness.createScene(ShopScene, { nodeIndex: 0 });
      const cards = (scene as any).itemCards;
      const items = (scene as any).shopItems;
      expect(cards.length).toBe(items.length);
    });

    it('no items are sold initially', () => {
      ensureShopNode(0);
      const scene = SceneTestHarness.createScene(ShopScene, { nodeIndex: 0 });
      const cards = (scene as any).itemCards;
      for (const card of cards) {
        expect(card.sold).toBe(false);
      }
    });
  });

  describe('hero selection', () => {
    it('creates hero buttons for each hero', () => {
      ensureShopNode(0);
      const scene = SceneTestHarness.createScene(ShopScene, { nodeIndex: 0 });
      const buttons = (scene as any).heroButtons;
      expect(buttons.length).toBe(rm.getHeroes().length);
    });

    it('selectedHero starts as null', () => {
      ensureShopNode(0);
      const scene = SceneTestHarness.createScene(ShopScene, { nodeIndex: 0 });
      expect((scene as any).selectedHero).toBeNull();
    });
  });

  describe('buyItem', () => {
    it('rejects purchase without selected hero', () => {
      ensureShopNode(0);
      const scene = SceneTestHarness.createScene(ShopScene, { nodeIndex: 0 });
      const cards = (scene as any).itemCards;
      if (cards.length === 0) return;

      const initialGold = rm.getGold();
      const card = cards[0];

      // buyItem without selectedHero
      (scene as any).buyItem(card.item, card.container, card.priceText);

      // Gold should not change
      expect(rm.getGold()).toBe(initialGold);
    });

    it('rejects purchase without enough gold', () => {
      ensureShopNode(0);
      const scene = SceneTestHarness.createScene(ShopScene, { nodeIndex: 0 });
      const cards = (scene as any).itemCards;
      if (cards.length === 0) return;

      // Select a hero
      (scene as any).selectedHero = rm.getHeroes()[0];

      // Drain gold
      rm.spendGold(rm.getGold());
      expect(rm.getGold()).toBe(0);

      const card = cards[0];
      (scene as any).buyItem(card.item, card.container, card.priceText);

      // Still no gold, item not sold
      expect(card.sold).toBe(false);
    });

    it('successful purchase deducts gold and marks card sold', () => {
      ensureShopNode(0);
      const scene = SceneTestHarness.createScene(ShopScene, { nodeIndex: 0 });
      const cards = (scene as any).itemCards;
      if (cards.length === 0) return;

      // Select a hero
      (scene as any).selectedHero = rm.getHeroes()[0];

      // Give enough gold
      rm.addGold(1000);
      const beforeGold = rm.getGold();

      const card = cards[0];
      const cost = card.item.cost;

      (scene as any).buyItem(card.item, card.container, card.priceText);

      expect(rm.getGold()).toBe(beforeGold - cost);
      expect(card.sold).toBe(true);
    });
  });

  describe('comparison texts', () => {
    it('updateComparisonTexts does not throw when no hero selected', () => {
      ensureShopNode(0);
      const scene = SceneTestHarness.createScene(ShopScene, { nodeIndex: 0 });

      (scene as any).selectedHero = null;
      (scene as any).updateComparisonTexts();
      // No error
    });

    it('updateComparisonTexts updates when hero is selected', () => {
      ensureShopNode(0);
      const scene = SceneTestHarness.createScene(ShopScene, { nodeIndex: 0 });

      (scene as any).selectedHero = rm.getHeroes()[0];
      (scene as any).updateComparisonTexts();
      // No error
    });
  });

  describe('gold display', () => {
    it('creates gold text element', () => {
      ensureShopNode(0);
      const scene = SceneTestHarness.createScene(ShopScene, { nodeIndex: 0 });
      expect((scene as any).goldText).toBeDefined();
    });
  });
});
