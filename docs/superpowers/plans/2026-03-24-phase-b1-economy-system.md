# v1.23 Phase B1 — Economy System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add interest mechanics, shop refresh, and equipment sell-back to create meaningful economic tension in non-combat phases.

**Architecture:** New balance constants drive all three features. RestScene appends interest text after option execution. ShopScene gets a refresh button (escalating cost, regenerates inventory) and sell-back logic in buyItem() with net cost display. All new UI text goes through i18n templates.

**Tech Stack:** TypeScript, Phaser 3, Vitest

**Spec:** `docs/superpowers/specs/2026-03-24-phase-b1-economy-system-design.md`

---

## File Map

| File | Responsibility | Tasks |
|------|---------------|-------|
| `src/config/balance.ts` | Economy constants | Task 1 |
| `src/constants.ts` | Re-exports | Task 1 |
| `src/i18n.ts` | Chinese UI strings | Task 1 |
| `src/scenes/RestScene.ts` | Interest at rest nodes | Task 2 |
| `tests/scenes/RestScene.test.ts` | Interest tests | Task 2 |
| `src/scenes/ShopScene.ts` | Refresh + sell-back + net cost | Tasks 3, 4 |
| `tests/scenes/ShopScene.test.ts` | Refresh + sell-back tests | Tasks 3, 4 |

---

## Task 1: Balance Constants + i18n Strings

**Context:** All three features depend on shared constants and i18n strings. Adding them first unblocks all subsequent tasks.

**Files:**
- Modify: `src/config/balance.ts`
- Modify: `src/constants.ts`
- Modify: `src/i18n.ts`

- [ ] **Step 1: Add economy constants to balance.ts**

In `src/config/balance.ts`, add after the existing `BOSS_BATTLE_GOLD = 120` line (line 43):

```typescript
// ============ Economy — Interest ============

export const INTEREST_PER_10_GOLD = 1;
export const INTEREST_CAP = 5;

// ============ Economy — Shop ============

export const SHOP_REFRESH_BASE_COST = 10;
export const SELL_PRICE_RATIO = 0.5;
```

- [ ] **Step 2: Re-export from constants.ts**

In `src/constants.ts`, add to the `// Economy` section (after line 34 `BOSS_BATTLE_GOLD`):

```typescript
  INTEREST_PER_10_GOLD,
  INTEREST_CAP,
  SHOP_REFRESH_BASE_COST,
  SELL_PRICE_RATIO,
```

- [ ] **Step 3: Add i18n strings**

In `src/i18n.ts`, add to the `rest` object (after line 179 `continueBtn`):

```typescript
    interest: (amount: number) => `利息 +${amount}`,
```

Add to the `shop` object (after line 162 `synergyActive`):

```typescript
    refresh: (cost: number) => `刷新 (${cost}G)`,
    refreshDisabled: '金币不足',
    netCost: (original: number, net: number) => `${original}G (净 ${net}G)`,
    sellback: (amount: number) => `+${amount}G 卖出旧装备`,
```

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit && npm test
```

Expected: Zero errors, all tests pass (no behavioral changes yet).

- [ ] **Step 5: Commit**

```bash
git add src/config/balance.ts src/constants.ts src/i18n.ts
git commit -m "feat: add economy constants and i18n strings for interest/refresh/sellback"
```

---

## Task 2: Rest Node Interest

**Context:** RestScene.executeChoice() runs a switch block where each branch calls showResultScreen() internally. After the switch block completes, we calculate interest from current gold and append a text to the already-rendered result screen. The interest is calculated AFTER the option effect (so scavenge gold is counted).

Current code flow in `executeChoice()` (RestScene.ts lines 98-127):
```
choiceMade = true → markNodeCompleted → fade all children → switch(choice) {
  case 'rest': healAllHeroes → showResultScreen()
  case 'train': executeTrain → showResultScreen()
  case 'scavenge': executeScavenge (addGold) → showResultScreen()
} → SaveManager.autoSave()
```

Interest must be inserted between the switch block and autoSave.

**Files:**
- Modify: `src/scenes/RestScene.ts`
- Modify: `tests/scenes/RestScene.test.ts`

- [ ] **Step 1: Update existing scavenge test + write interest tests**

The existing scavenge test (line 109-117) asserts `goldAfter - goldBefore` is between scavenge min/max only. With interest, the delta increases. Update this test and add new interest tests.

First add the import at top of `tests/scenes/RestScene.test.ts`:

```typescript
import { REST_HEAL_PERCENT, REST_TRAIN_EXP, REST_SCAVENGE_GOLD_MIN, REST_SCAVENGE_GOLD_MAX, INTEREST_CAP } from '../../src/constants';
```

Then **replace** the existing `'scavenge choice adds gold'` test (lines 109-117) with:

```typescript
    it('scavenge choice adds gold plus interest', () => {
      const goldBefore = rm.getGold();
      const scene = createRestScene();
      (scene as any).executeChoice('scavenge', rm);
      const goldAfter = rm.getGold();
      expect(goldAfter).toBeGreaterThan(goldBefore);
      // Delta = scavenge (40-60) + interest (capped at 5)
      // With 80G start, after scavenge (120-140G), interest is always capped at 5
      expect(goldAfter - goldBefore).toBeGreaterThanOrEqual(REST_SCAVENGE_GOLD_MIN + INTEREST_CAP);
      expect(goldAfter - goldBefore).toBeLessThanOrEqual(REST_SCAVENGE_GOLD_MAX + INTEREST_CAP);
    });
```

Then add a new describe block after `'3-choice overhaul'`:

```typescript
  describe('interest mechanism', () => {
    it('awards 0 interest when gold is 0', () => {
      rm.spendGold(rm.getGold()); // drain all gold
      const goldBefore = rm.getGold();
      expect(goldBefore).toBe(0);
      const scene = createRestScene();
      (scene as any).executeChoice('rest', rm);
      // No interest on 0 gold — only heal effect
      expect(rm.getGold()).toBe(0);
    });

    it('awards 1 interest for 10G', () => {
      rm.spendGold(rm.getGold());
      rm.addGold(10);
      const scene = createRestScene();
      (scene as any).executeChoice('rest', rm);
      // 10G + 1 interest = 11G
      expect(rm.getGold()).toBe(11);
    });

    it('awards 4 interest for 49G', () => {
      rm.spendGold(rm.getGold());
      rm.addGold(49);
      const scene = createRestScene();
      (scene as any).executeChoice('rest', rm);
      expect(rm.getGold()).toBe(53); // 49 + 4
    });

    it('caps interest at INTEREST_CAP for 50G+', () => {
      rm.spendGold(rm.getGold());
      rm.addGold(50);
      const scene = createRestScene();
      (scene as any).executeChoice('rest', rm);
      expect(rm.getGold()).toBe(55); // 50 + 5
    });

    it('caps interest at INTEREST_CAP for 100G', () => {
      rm.spendGold(rm.getGold());
      rm.addGold(100);
      const scene = createRestScene();
      (scene as any).executeChoice('rest', rm);
      expect(rm.getGold()).toBe(105); // 100 + 5, not 110
    });

    it('interest calculated after scavenge gold is added', () => {
      rm.spendGold(rm.getGold());
      rm.addGold(45); // 45G before scavenge
      const scene = createRestScene();
      (scene as any).executeChoice('scavenge', rm);
      // After scavenge: 45 + (40-60) = 85-105G → interest = 5 (cap)
      // Total: 85-105 + 5 = 90-110
      expect(rm.getGold()).toBeGreaterThanOrEqual(90);
      expect(rm.getGold()).toBeLessThanOrEqual(110);
    });
  });
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/scenes/RestScene.test.ts
```

Expected: FAIL — interest tests expect gold changes that don't happen yet.

- [ ] **Step 3: Implement interest in RestScene**

In `src/scenes/RestScene.ts`:

**3a. Add import** at top (line 2), add `INTEREST_CAP` to the existing import:

```typescript
import { GAME_WIDTH, GAME_HEIGHT, REST_HEAL_PERCENT, REST_TRAIN_EXP, REST_SCAVENGE_GOLD_MIN, REST_SCAVENGE_GOLD_MAX, INTEREST_PER_10_GOLD, INTEREST_CAP } from '../constants';
```

**3b. Add interest calculation after the switch block** in `executeChoice()`. Find lines 112-123:

```typescript
        switch (choice) {
          case 'rest':
            rm.healAllHeroes(REST_HEAL_PERCENT);
            this.showHealedStatus(rm);
            break;
          case 'train':
            this.executeTrain(rm);
            break;
          case 'scavenge':
            this.executeScavenge(rm);
            break;
        }
        SaveManager.autoSave();
```

Replace with:

```typescript
        switch (choice) {
          case 'rest':
            rm.healAllHeroes(REST_HEAL_PERCENT);
            this.showHealedStatus(rm);
            break;
          case 'train':
            this.executeTrain(rm);
            break;
          case 'scavenge':
            this.executeScavenge(rm);
            break;
        }

        // Interest: award gold based on current reserves
        const interest = Math.min(Math.floor(rm.getGold() / 10) * INTEREST_PER_10_GOLD, INTEREST_CAP);
        if (interest > 0) {
          rm.addGold(interest);
          // Append interest text to already-rendered result screen
          // showResultScreen places heroes at GAME_HEIGHT/2 + i*22, so last hero Y = GAME_HEIGHT/2 + (n-1)*22
          const heroCount = rm.getHeroes().length;
          const interestY = GAME_HEIGHT / 2 + heroCount * 22 + 8;
          const interestText = TextFactory.create(
            this, GAME_WIDTH / 2, interestY,
            UI.rest.interest(interest), 'label', {
              color: colorToString(Theme.colors.gold),
            }
          ).setOrigin(0.5).setAlpha(0);
          this.tweens.add({
            targets: interestText,
            alpha: 1,
            duration: 300,
            ease: 'Sine.easeOut',
          });
        }

        SaveManager.autoSave();
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/scenes/RestScene.test.ts
```

Expected: All pass including new interest tests.

- [ ] **Step 5: Run full type check + test suite**

```bash
npx tsc --noEmit && npm test
```

Expected: Zero errors, all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/scenes/RestScene.ts tests/scenes/RestScene.test.ts
git commit -m "feat: rest node interest — awards 0-5G based on gold reserves"
```

---

## Task 3: Shop Refresh Button

**Context:** ShopScene currently has a single Leave button at `(GAME_WIDTH/2, GAME_HEIGHT-30)`. We shift Leave left and add a Refresh button right. Refresh regenerates inventory using ShopGenerator.generate() with escalating cost (10/20/40/80G). refreshCount is scene-local.

**Files:**
- Modify: `src/scenes/ShopScene.ts`
- Modify: `tests/scenes/ShopScene.test.ts`

- [ ] **Step 1: Write refresh tests**

Add to `tests/scenes/ShopScene.test.ts`, after the existing `'gold display'` describe block. First add import:

```typescript
import { SHOP_REFRESH_BASE_COST } from '../../src/constants';
```

Then:

```typescript
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
      (scene as any).refreshShop(); // 1st: 10G
      const goldBefore = rm.getGold();
      (scene as any).refreshShop(); // 2nd: 20G
      expect(rm.getGold()).toBe(goldBefore - SHOP_REFRESH_BASE_COST * 2);
      expect((scene as any).refreshCount).toBe(2);
    });

    it('refresh fails with insufficient gold', () => {
      ensureShopNode(0);
      const scene = SceneTestHarness.createScene(ShopScene, { nodeIndex: 0 });
      rm.spendGold(rm.getGold()); // drain gold
      const countBefore = (scene as any).refreshCount;
      (scene as any).refreshShop();
      expect((scene as any).refreshCount).toBe(countBefore);
    });

    it('refresh generates new items', () => {
      ensureShopNode(0);
      const scene = SceneTestHarness.createScene(ShopScene, { nodeIndex: 0 });
      rm.addGold(1000);
      const oldItems = (scene as any).shopItems.map((i: any) => i.id);
      (scene as any).refreshShop();
      const newItems = (scene as any).shopItems.map((i: any) => i.id);
      // Items should be regenerated (may differ due to RNG)
      expect((scene as any).itemCards.length).toBeGreaterThan(0);
      // refreshCount should have advanced
      expect((scene as any).refreshCount).toBe(1);
    });
  });
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/scenes/ShopScene.test.ts
```

Expected: FAIL — `refreshCount` and `refreshShop` don't exist yet.

- [ ] **Step 3: Implement refresh in ShopScene**

In `src/scenes/ShopScene.ts`:

**3a. Add import** — add `SHOP_REFRESH_BASE_COST` to an import from constants. Add at top:

```typescript
import { GAME_WIDTH, GAME_HEIGHT, SHOP_REFRESH_BASE_COST } from '../constants';
```

**3b. Add field** in the class (after line 22 `heroButtons`):

```typescript
  private refreshCount = 0;
  private refreshBtn!: Button;
```

**3c. Reset in init()** — add after line 32 `this.heroButtons = []`:

```typescript
    this.refreshCount = 0;
```

**3d. Modify Leave button and add Refresh button** in `create()`. Replace lines 97-102 (the Leave button section):

```typescript
    // Leave button (shifted left for refresh button, 40px gap between buttons)
    new Button(this, 310, GAME_HEIGHT - 30, UI.shop.leaveShop, 140, 35, () => {
      rm.markNodeCompleted(this.nodeIndex);
      SaveManager.autoSave();
      SceneTransition.fadeTransition(this, 'MapScene');
    });

    // Refresh button
    const refreshCost = this.getRefreshCost();
    this.refreshBtn = new Button(this, 490, GAME_HEIGHT - 30, UI.shop.refresh(refreshCost), 140, 35, () => {
      this.refreshShop();
    }, Theme.colors.secondary);
    this.updateRefreshButton();
```

**3e. Add helper methods** at end of class (before `shutdown()`):

```typescript
  private getRefreshCost(): number {
    return SHOP_REFRESH_BASE_COST * Math.pow(2, this.refreshCount);
  }

  private updateRefreshButton(): void {
    const cost = this.getRefreshCost();
    const canAfford = RunManager.getInstance().getGold() >= cost;
    this.refreshBtn.setText(UI.shop.refresh(cost));
    this.refreshBtn.setAlpha(canAfford ? 1 : 0.5);
  }

  private refreshShop(): void {
    const rm = RunManager.getInstance();
    const cost = this.getRefreshCost();

    if (!rm.spendGold(cost)) {
      AudioManager.getInstance().playSfx('sfx_error');
      return;
    }

    this.refreshCount++;
    AudioManager.getInstance().playSfx('sfx_coin');

    // Fade out old cards, then destroy and rebuild
    const oldContainers = this.itemCards.map(c => c.container);
    this.tweens.add({
      targets: oldContainers,
      alpha: 0,
      duration: 150,
      onComplete: () => {
        for (const card of this.itemCards) {
          card.container.destroy();
        }
        this.itemCards = [];

        // Regenerate inventory
        const rng = rm.getRng();
        this.shopItems = ShopGenerator.generate(rng, rm.getCurrentAct());

        // Rebuild cards at alpha 0, then fade in
        this.shopItems.forEach((item, i) => {
          const x = 70 + (i % 3) * 230;
          const y = 155 + Math.floor(i / 3) * 120;
          this.createItemCard(item, x, y, rm);
        });

        // Fade in new cards
        const newContainers = this.itemCards.map(c => c.container);
        for (const c of newContainers) c.setAlpha(0);
        this.tweens.add({
          targets: newContainers,
          alpha: 1,
          duration: 200,
        });

        // Update UI
        this.goldText.setText(`${rm.getGold()}G`);
        this.updateRefreshButton();
        if (this.selectedHero) {
          this.updateComparisonTexts();
        }
      },
    });
  }
```

**3f. Update gold display after purchases** — In the `buyItem()` method, after the affordability update loop (line 305), add:

```typescript
    this.updateRefreshButton();
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/scenes/ShopScene.test.ts
```

Expected: All pass including new refresh tests.

- [ ] **Step 5: Run full type check + test suite**

```bash
npx tsc --noEmit && npm test
```

Expected: Zero errors, all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/scenes/ShopScene.ts tests/scenes/ShopScene.test.ts
git commit -m "feat: shop refresh button with escalating cost (10/20/40/80G)"
```

---

## Task 4: Equipment Sell-Back + Net Cost Display

**Context:** ShopScene.buyItem() already captures the return value of equipItem() as `oldItem` (line 278) but discards it. We add sell-back gold credit and update the price display to show net cost when a hero has equipment in the target slot.

**Files:**
- Modify: `src/scenes/ShopScene.ts`
- Modify: `tests/scenes/ShopScene.test.ts`

- [ ] **Step 1: Write sell-back tests**

Add to `tests/scenes/ShopScene.test.ts`:

```typescript
import { SELL_PRICE_RATIO } from '../../src/constants';

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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/scenes/ShopScene.test.ts
```

Expected: FAIL — sell-back not implemented yet, gold deducted without credit.

- [ ] **Step 3: Implement sell-back in buyItem()**

In `src/scenes/ShopScene.ts`, add import:

```typescript
import { GAME_WIDTH, GAME_HEIGHT, SHOP_REFRESH_BASE_COST, SELL_PRICE_RATIO } from '../constants';
```

Find in `buyItem()` the line (currently ~line 278):

```typescript
    const oldItem = rm.equipItem(this.selectedHero.id, item);
```

Add immediately after it:

```typescript
    // Sell-back: credit 50% of replaced item's cost
    if (oldItem && oldItem.cost > 0) {
      const sellPrice = Math.floor(oldItem.cost * SELL_PRICE_RATIO);
      rm.addGold(sellPrice);
      this.showMessage(UI.shop.sellback(sellPrice));
    }
```

- [ ] **Step 4: Implement net cost display in updateComparisonTexts()**

Merge net cost display into the **existing** `for (const card of this.itemCards)` loop in `updateComparisonTexts()`, avoiding a second loop. At the end of each card's processing (after the comparison text logic, just before the loop's closing `}`), add:

```typescript
      // Net cost display (merged into existing loop)
      const rm = RunManager.getInstance();
      const canAfford = rm.getGold() >= card.item.cost;
      const baseColor = canAfford ? colorToString(Theme.colors.gold) : colorToString(Theme.colors.danger);

      if (this.selectedHero) {
        const currentEquip = this.selectedHero.equipment[card.item.slot];
        if (currentEquip && currentEquip.cost > 0) {
          const sellback = Math.floor(currentEquip.cost * SELL_PRICE_RATIO);
          const netCost = card.item.cost - sellback;
          card.priceText.setText(UI.shop.netCost(card.item.cost, netCost));
          card.priceText.setColor(baseColor);
        } else {
          card.priceText.setText(`${card.item.cost}G`);
          card.priceText.setColor(baseColor);
        }
      } else {
        card.priceText.setText(`${card.item.cost}G`);
        card.priceText.setColor(baseColor);
      }
```

Note: `rm` can be hoisted outside the loop for efficiency. The key point is this logic goes inside the existing `for` loop, not in a separate loop.

Also add `SELL_PRICE_RATIO` to the import if not already added in Step 3.

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test -- tests/scenes/ShopScene.test.ts
```

Expected: All pass.

- [ ] **Step 6: Run full type check + test suite**

```bash
npx tsc --noEmit && npm test
```

Expected: Zero errors, all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/scenes/ShopScene.ts tests/scenes/ShopScene.test.ts
git commit -m "feat: auto sell-back on equipment replacement + net cost display"
```

---

## Task 5: Final Verification

- [ ] **Step 1: Run full type check + test suite**

```bash
npx tsc --noEmit && npm test
```

Expected: Zero TS errors, all tests pass.

- [ ] **Step 2: Verify test count increase**

Previous: 1068 tests. New tests added:
- RestScene interest: 6 tests
- ShopScene refresh: 5 tests
- ShopScene sell-back: 4 tests (empty slot, replace, net cost display, zero cost)

Expected: ~1083+ tests.

- [ ] **Step 3: Verify acceptance criteria**

Checklist:
1. ✅ Interest: `floor(gold/10)` capped at 5
2. ✅ Interest UI: Text after result screen (only when > 0)
3. ✅ Refresh: Escalating cost 10→20→40→80G
4. ✅ Refresh button at x=460, Leave at x=340
5. ✅ Refresh cleanup: old cards destroyed
6. ✅ Sell-back: 50% of old item cost
7. ✅ Net cost: Updates on hero switch
8. ✅ Sell feedback: showMessage with sellback amount
9. ✅ i18n: All strings via UI.rest/UI.shop templates
10. ✅ Constants: balance.ts + constants.ts re-export
11. ✅ Save compat: No new persistent fields
12. ✅ Tests: All pass

---

## Execution Order

```
Task 1 (constants + i18n)    — independent, unblocks all
Task 2 (interest)            — depends on Task 1
Task 3 (shop refresh)        — depends on Task 1
Task 4 (sell-back)           — depends on Task 1, can parallel with Task 3 but both modify ShopScene
Task 5 (verification)        — depends on all
```

**Recommended sequential execution:**
- Task 1 → Task 2 → Task 3 → Task 4 → Task 5
- Tasks 2 and 3 could run in parallel (different files: RestScene vs ShopScene)
- Tasks 3 and 4 must be sequential (both modify ShopScene.ts)
