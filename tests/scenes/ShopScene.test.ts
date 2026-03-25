import { describe, it, expect, beforeEach } from 'vitest';
import { ShopScene } from '../../src/scenes/ShopScene';
import { RunManager } from '../../src/managers/RunManager';
import { EventBus } from '../../src/systems/EventBus';
import { SceneTestHarness } from '../helpers/scene-harness';
import { SHOP_REFRESH_BASE_COST, SELL_PRICE_RATIO } from '../../src/constants';

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

  describe('shop refresh', () => {
    it('refreshCount starts at 0', () => {
      ensureShopNode(0);
      const scene = SceneTestHarness.createScene(ShopScene, { nodeIndex: 0 });
      expect((scene as any).refreshCount).toBe(0);
    });

    it('first refresh costs SHOP_REFRESH_BASE_COST', () => {
      ensureShopNode(0);
      const scene = SceneTestHarness.createScene(ShopScene, { nodeIndex: 0 });
      rm.addGold(1000);
      const goldBefore = rm.getGold();
      (scene as any).refreshShop();
      expect(rm.getGold()).toBe(goldBefore - SHOP_REFRESH_BASE_COST);
      expect((scene as any).refreshCount).toBe(1);
    });

    it('second refresh costs double', () => {
      ensureShopNode(0);
      const scene = SceneTestHarness.createScene(ShopScene, { nodeIndex: 0 });
      rm.addGold(1000);
      (scene as any).refreshShop();
      const goldBefore = rm.getGold();
      (scene as any).refreshShop();
      expect(rm.getGold()).toBe(goldBefore - SHOP_REFRESH_BASE_COST * 2);
      expect((scene as any).refreshCount).toBe(2);
    });

    it('refresh fails with insufficient gold', () => {
      ensureShopNode(0);
      const scene = SceneTestHarness.createScene(ShopScene, { nodeIndex: 0 });
      rm.spendGold(rm.getGold());
      const countBefore = (scene as any).refreshCount;
      (scene as any).refreshShop();
      expect((scene as any).refreshCount).toBe(countBefore);
    });

    it('refresh generates new items', () => {
      ensureShopNode(0);
      const scene = SceneTestHarness.createScene(ShopScene, { nodeIndex: 0 });
      rm.addGold(1000);
      (scene as any).refreshShop();
      expect((scene as any).itemCards.length).toBeGreaterThan(0);
      expect((scene as any).refreshCount).toBe(1);
    });
  });

  describe('sell-back', () => {
    it('buy in empty slot: no sell-back, full price deducted', () => {
      ensureShopNode(0);
      const scene = SceneTestHarness.createScene(ShopScene, { nodeIndex: 0 });
      rm.addGold(1000);
      const hero = rm.getHeroes()[0];
      (scene as any).selectedHero = hero;

      const cards = (scene as any).itemCards;
      if (cards.length === 0) return;
      const card = cards[0];
      const slot = card.item.slot;

      // Ensure slot is empty
      hero.equipment[slot] = null;

      const goldBefore = rm.getGold();
      (scene as any).buyItem(card.item, card.container, card.priceText);
      expect(rm.getGold()).toBe(goldBefore - card.item.cost);
    });

    it('buy replacing existing: sell-back credits 50% of old item cost', () => {
      ensureShopNode(0);
      const scene = SceneTestHarness.createScene(ShopScene, { nodeIndex: 0 });
      rm.addGold(1000);
      const hero = rm.getHeroes()[0];
      (scene as any).selectedHero = hero;

      const cards = (scene as any).itemCards;
      if (cards.length === 0) return;
      const card = cards[0];
      const slot = card.item.slot;

      // Pre-equip an item in the same slot
      const oldItem = { id: 'old_sword', name: 'Old Sword', slot, cost: 30, rarity: 'common', description: '', stats: { attack: 5 } };
      hero.equipment[slot] = oldItem as any;

      const goldBefore = rm.getGold();
      (scene as any).buyItem(card.item, card.container, card.priceText);
      const expectedSellback = Math.floor(oldItem.cost * SELL_PRICE_RATIO);
      expect(rm.getGold()).toBe(goldBefore - card.item.cost + expectedSellback);
    });

    it('net cost display shows reduced price when hero has equipment', () => {
      ensureShopNode(0);
      const scene = SceneTestHarness.createScene(ShopScene, { nodeIndex: 0 });
      rm.addGold(1000);
      const hero = rm.getHeroes()[0];
      (scene as any).selectedHero = hero;

      const cards = (scene as any).itemCards;
      if (cards.length === 0) return;
      const card = cards[0];
      const slot = card.item.slot;

      // Pre-equip a 30G item
      hero.equipment[slot] = { id: 'old_item', name: 'Old', slot, cost: 30, rarity: 'common', description: '', stats: {} } as any;

      (scene as any).updateComparisonTexts();
      // priceText should show net cost format
      const expectedNet = card.item.cost - Math.floor(30 * SELL_PRICE_RATIO);
      expect(card.priceText.text).toContain(`净 ${expectedNet}G`);
    });

    it('old item with cost 0: no sell-back', () => {
      ensureShopNode(0);
      const scene = SceneTestHarness.createScene(ShopScene, { nodeIndex: 0 });
      rm.addGold(1000);
      const hero = rm.getHeroes()[0];
      (scene as any).selectedHero = hero;

      const cards = (scene as any).itemCards;
      if (cards.length === 0) return;
      const card = cards[0];
      const slot = card.item.slot;

      // Pre-equip a zero-cost item
      hero.equipment[slot] = { id: 'free_item', name: 'Free', slot, cost: 0, rarity: 'common', description: '', stats: {} } as any;

      const goldBefore = rm.getGold();
      (scene as any).buyItem(card.item, card.container, card.priceText);
      expect(rm.getGold()).toBe(goldBefore - card.item.cost); // No sell-back
    });
  });
});
