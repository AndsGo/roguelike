# v1.23 Phase B1 — Economy System Design Spec

**Goal:** Create meaningful non-combat decision density through interest mechanics, shop refresh, and equipment selling — establishing a "save for interest vs invest in power" tension that is the hallmark of successful auto-battlers.

**Scope:** Interest at rest nodes, shop refresh with escalating cost, auto sell-back on equipment replacement.

**Non-goals:** No new item types, no inventory/backpack system, no changes to battle rewards or enemy gold values, no changes to equipment stats or slots.

---

## 1. Interest Mechanism

### Problem
Gold is currently linear accumulation with no incentive to save. Players always spend ASAP because there's no opportunity cost to being broke.

### Solution
At rest nodes, after the player selects any option (rest/train/scavenge), calculate and award interest based on current gold reserves.

**Formula:**
```
interest = Math.min(Math.floor(currentGold / 10), INTEREST_CAP)
```

**Constants:**
```typescript
INTEREST_PER_10_GOLD = 1   // 1 gold per 10 held
INTEREST_CAP = 5           // Max 5 gold per rest node
```

**Key thresholds:**
- 10G → 1 interest
- 30G → 3 interest
- 50G+ → 5 interest (cap)

**Integration:**
- Interest is awarded regardless of which option was chosen
- **Sequencing approach:** Each branch method (`executeHeal`/`executeTrain`/`executeScavenge`) calls `showResultScreen()` internally. To avoid refactoring this flow, **append the interest text to the already-rendered result screen after the switch block** in `executeChoice()`:
  1. The switch block executes the chosen option (which calls `showResultScreen()` internally)
  2. After the switch, calculate interest from current gold: `const interest = Math.min(Math.floor(rm.getGold() / 10), INTEREST_CAP)`
  3. If interest > 0, call `rm.addGold(interest)` and create a new Text object appended to the existing result screen (positioned below the last result text, e.g. y offset +30 from the option result)
- If interest === 0, do not show any interest text

**Balance rationale:**
- ~2-3 rest nodes per run → max 10-15G total interest income
- Equivalent to roughly one normal battle's worth of gold
- The 50G threshold creates a meaningful savings target without requiring players to hoard excessively
- Tension: spending gold at a shop before a rest node forfeits potential interest

**Storage:** No new fields needed. Interest is calculated on-the-fly from current gold (after the option effect, e.g. scavenge adds gold first) and awarded immediately via `addGold()`. Fully compatible with existing save system.

---

## 2. Shop Refresh Mechanism

### Problem
Shop offers 4-6 items with no way to see alternatives. If the items don't match the player's build, the shop node feels wasted.

### Solution
Add a "Refresh" button to the shop that regenerates the entire inventory for an escalating gold cost.

**Pricing formula:**
```
refreshCost = SHOP_REFRESH_BASE_COST * (2 ** refreshCount)
```

| Refresh # | Cost |
|-----------|------|
| 1st | 10G |
| 2nd | 20G |
| 3rd | 40G |
| 4th | 80G |

**Constants:**
```typescript
SHOP_REFRESH_BASE_COST = 10  // First refresh cost
```

**Integration:**
- `refreshCount` is local to ShopScene (not persisted — resets when leaving shop)
- **Button layout:** Leave button shifts left to x=340, Refresh button at x=460. Both y = GAME_HEIGHT - 30. This gives ~120px between centers on the 800px canvas.
- Button text displays current refresh cost via i18n template: `UI.shop.refresh(cost)`
- Button disabled (red text, 0.5 alpha) when gold insufficient
- On click: `spendGold(refreshCost)` → `refreshCount++` → regenerate inventory → rebuild item cards
- Regeneration: call `ShopGenerator.generate(rng, actIndex)` with the run's `SeededRNG` instance
- **Card cleanup on refresh:** Destroy all existing item card containers (`this.itemCards.forEach(c => c.destroy())`), clear the `itemCards` array (sold state is implicitly reset when recreating cards), then create new cards via existing `createItemCard()` pattern
- Animation: Old cards alpha tween to 0 (150ms) → destroy → create new cards at alpha 0 → tween to 1 (200ms)

**RNG determinism note:** Each `generate()` call consumes RNG calls internally. Refreshes advance the RNG state. If a player saves and reloads mid-shop, `refreshCount` is lost (scene-local) and the scene re-runs `create()` with the saved RNG state — the initial inventory will be the same as the first generation, not the refreshed one. This is acceptable: refresh results are ephemeral, and save/reload mid-shop is equivalent to "undoing" the refresh.

**Interaction with interest:**
- Spending 10-40G on refreshes reduces gold reserves, potentially dropping below the 50G interest threshold
- This creates a direct tension: "refresh to find better gear" vs "keep gold for interest at the next rest node"

---

## 3. Equipment Sell-Back (Auto Trade-In)

### Problem
When buying equipment that replaces an existing item, the old item is silently discarded (`equipItem()` returns it but the return value is ignored). Players lose value and may hesitate to upgrade.

### Solution
Automatically sell the replaced equipment when purchasing a new item in the same slot, crediting the player with 50% of the old item's original cost.

**Formula:**
```
sellPrice = Math.floor(oldItem.cost * SELL_PRICE_RATIO)
```

**Constants:**
```typescript
SELL_PRICE_RATIO = 0.5  // 50% of original price
```

**Integration in ShopScene `buyItem()` method:**

Current flow:
1. Validate hero selected
2. `spendGold(item.cost)`
3. `equipItem(heroId, item)` → returns old item (discarded)
4. Update UI

New flow:
1. Validate hero selected
2. `spendGold(item.cost)`
3. `const oldItem = equipItem(heroId, item)` → capture returned item
4. **If `oldItem !== null && oldItem.cost > 0`: `addGold(Math.floor(oldItem.cost * SELL_PRICE_RATIO))`**
5. Update UI with sell-back feedback
6. Emit `item:equip` event (unchanged)

Note: `ItemData.cost` is typed as `number` (not optional), so only null-check on `oldItem` itself is needed, plus `cost > 0` guard.

**UI changes:**

1. **Net cost display on item cards:**
   - The existing `priceText` on each item card is modified to show net cost when applicable
   - When a hero is selected and the target slot (`item.slot`) has an existing equipped item, show: `"60G (净 45G)"` where 45 = 60 - floor(old.cost * 0.5)
   - When target slot is empty, show original price only: `"60G"`
   - **Dynamic update:** Extend `updateComparisonTexts()` (called on hero switch) to also update each card's `priceText` based on the newly selected hero's equipment. Rename to `updateCardDisplayForHero()` or add a separate `updatePriceTexts()` call within the existing method.

2. **Sell-back feedback:**
   - After purchase with trade-in, show feedback text: `"+15G 卖出旧装备"` using `UI.shop.sellback(amount)`
   - Text appears near the gold display, fades out after 1.5s

**Edge cases:**
- Empty slot: No sell-back, full price charged (current behavior)
- Old item cost is 0: No sell-back (guard: `oldItem.cost > 0`)
- Downgrading for gold: Valid strategy — player pays full new item price, gets 50% of old item back

---

## 4. i18n Strings

Add to `src/i18n.ts` under the `UI` object:

```typescript
// In UI.rest:
interest: (amount: number) => `利息 +${amount}`,

// In UI.shop:
refresh: (cost: number) => `刷新 (${cost}G)`,
refreshDisabled: '金币不足',
netCost: (original: number, net: number) => `${original}G (净 ${net}G)`,
sellback: (amount: number) => `+${amount}G 卖出旧装备`,
```

No emoji — consistent with project convention of plain Chinese text.

---

## 5. Balance Constants Summary

All new constants go in `src/config/balance.ts` and are re-exported via `src/constants.ts` (per project convention):

```typescript
// ============ Economy — Interest ============
export const INTEREST_PER_10_GOLD = 1;
export const INTEREST_CAP = 5;

// ============ Economy — Shop ============
export const SHOP_REFRESH_BASE_COST = 10;
export const SELL_PRICE_RATIO = 0.5;
```

Add re-exports in `src/constants.ts`:
```typescript
export { INTEREST_PER_10_GOLD, INTEREST_CAP, SHOP_REFRESH_BASE_COST, SELL_PRICE_RATIO } from './config/balance';
```

---

## 6. File Change Map

| File | Change | Section |
|------|--------|---------|
| `src/config/balance.ts` | Modify | §5 Add 4 economy constants |
| `src/constants.ts` | Modify | §5 Re-export 4 new constants |
| `src/i18n.ts` | Modify | §4 Add interest/refresh/sell i18n strings |
| `src/scenes/RestScene.ts` | Modify | §1 Interest calculation in `executeChoice()` + feedback in `showResultScreen()` |
| `src/scenes/ShopScene.ts` | Modify | §2 Refresh button + §3 Sell-back in `buyItem()` + net cost display + `updateComparisonTexts()` extension |
| `tests/scenes/RestScene.test.ts` | Create/Modify | §1 Interest calculation tests |
| `tests/scenes/ShopScene.test.ts` | Create/Modify | §2 Refresh tests + §3 sell-back tests |

**Files NOT changed:**
- `src/systems/ShopGenerator.ts` — existing `generate()` API already supports refresh
- `src/managers/RunManager.ts` — existing `addGold()`/`spendGold()`/`equipItem()` sufficient
- `src/types/index.ts` — no new types needed
- Save format — no new persistent fields

---

## 7. Save Compatibility

**No breaking changes.** All new state is either:
- Calculated on-the-fly (interest from current gold)
- Scene-local (refreshCount in ShopScene, lost on scene exit)

Old saves load and work identically. No migration guards needed.

**Note:** Save/reload mid-shop after refreshing will show the original inventory (not refreshed), since `refreshCount` is not persisted and the initial `generate()` call replays from saved RNG state. This is acceptable and consistent with the "refresh is ephemeral" design.

---

## 8. Key Test Scenarios

### Interest tests
- 0G gold → 0 interest
- 10G gold → 1 interest
- 49G gold → 4 interest
- 50G gold → 5 interest (cap)
- 100G gold → 5 interest (cap, not 10)
- Interest awarded after scavenge (gold increases first, then interest calculated)

### Shop refresh tests
- First refresh costs 10G
- Second refresh costs 20G (escalating)
- Refresh with insufficient gold fails (gold unchanged, refreshCount unchanged)
- Refresh generates new items (different from initial)
- refreshCount resets on scene re-creation

### Sell-back tests
- Buy item in empty slot → no sell-back, full price deducted
- Buy item replacing existing → sell-back = floor(old.cost * 0.5) credited
- Old item with cost 0 → no sell-back
- Net cost display: item 60G replacing 30G item → shows "60G (净 45G)"

---

## 9. Acceptance Criteria

1. **Interest**: Rest node awards 0-5G interest based on `floor(gold/10)` after any option
2. **Interest UI**: Feedback text shows interest earned in result screen (hidden when 0)
3. **Refresh**: Shop refresh button generates new inventory for escalating cost (10/20/40/80G)
4. **Refresh UI**: Button at x=460 shows current cost, disabled when unaffordable
5. **Refresh cleanup**: Old item cards destroyed, no dangling references or tweens
6. **Sell-back**: Buying equipment with existing item in slot auto-sells old item at 50% price
7. **Net cost**: Item cards show net cost when hero has equipment in the target slot, updates on hero switch
8. **Sell feedback**: Text confirms sell-back amount after trade-in purchase
9. **i18n**: All new UI text uses i18n template functions, no hardcoded strings
10. **Constants**: New constants in balance.ts, re-exported from constants.ts
11. **Save compat**: Old saves load without errors, new features work on continued runs
12. **Tests**: `npx tsc --noEmit && npm test` passes with zero errors
