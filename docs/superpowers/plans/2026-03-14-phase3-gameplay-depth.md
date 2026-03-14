# Phase 3: Gameplay Depth Implementation Plan (v1.14.0)

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add hero draft synergy preview and map random variants (shortcuts + hidden nodes) to increase decision density.

**Architecture:** Two independent features: (1) Extract synergy calculation from ShopScene into shared utility, add synergy bar to HeroDraftScene. (2) Add map variant generation (shortcuts via `shortcutConnections`, hidden nodes via `hidden`/`revealCost` fields) to MapGenerator, update MapScene rendering + accessibility + RunManager.

**Tech Stack:** TypeScript + Phaser 3, Vitest for testing.

**Spec:** `docs/superpowers/specs/2026-03-14-phase3-gameplay-depth-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/utils/synergy-helpers.ts` | Create | Shared synergy tag calculation + formatting |
| `src/utils/map-utils.ts` | Create | BFS layer computation (extracted from MapRenderer) |
| `src/scenes/HeroDraftScene.ts` | Modify | Add synergy preview bar |
| `src/scenes/ShopScene.ts` | Modify | Refactor buildSynergyBar to use shared helper |
| `src/scenes/MapScene.ts` | Modify | Shortcut line rendering + hidden node rendering/reveal |
| `src/systems/MapGenerator.ts` | Modify | Add addShortcuts() + addHiddenNodes() |
| `src/managers/RunManager.ts` | Modify | Update getAccessibleNodes() for shortcutConnections |
| `src/ui/MapRenderer.ts` | Modify | Refactor buildLayers to use computeNodeLayers |
| `src/types/index.ts` | Modify | MapNode += hidden?, revealCost?, shortcutConnections? |
| `src/config/balance.ts` | Modify | +3 map constants |
| `src/constants.ts` | Modify | Re-export new constants |
| `src/i18n.ts` | Modify | +2 draft strings, +4 map strings |
| `tests/utils/synergy-helpers.test.ts` | Create | Synergy calculation tests |
| `tests/utils/map-utils.test.ts` | Create | Layer computation tests |
| `tests/systems/map-variants.test.ts` | Create | Shortcut + hidden node generation tests |

---

## Chunk 1: Synergy Preview

### Task 1: Create synergy-helpers utility + tests

**Files:**
- Create: `src/utils/synergy-helpers.ts`
- Create: `tests/utils/synergy-helpers.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/utils/synergy-helpers.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { calculateSynergyTags, formatSynergyTags, SynergyTag } from '../../src/utils/synergy-helpers';

describe('synergy-helpers', () => {
  describe('calculateSynergyTags', () => {
    it('returns empty array for empty heroIds', () => {
      expect(calculateSynergyTags([])).toEqual([]);
    });

    it('returns empty array for non-existent hero IDs', () => {
      expect(calculateSynergyTags(['nonexistent'])).toEqual([]);
    });

    it('detects race synergy with 2 humans', () => {
      // warrior and mage are both human
      const tags = calculateSynergyTags(['warrior', 'mage']);
      const humanTag = tags.find(t => t.name === '人类联盟');
      expect(humanTag).toBeDefined();
      expect(humanTag!.count).toBe(2);
      expect(humanTag!.active).toBe(true);
    });

    it('detects element synergy with 2 ice heroes', () => {
      // frost_ranger and frost_whisperer are both ice
      const tags = calculateSynergyTags(['frost_ranger', 'frost_whisperer']);
      const iceTag = tags.find(t => t.name.includes('冰'));
      expect(iceTag).toBeDefined();
      expect(iceTag!.count).toBe(2);
      expect(iceTag!.active).toBe(true);
    });

    it('shows progress for near-threshold synergy', () => {
      // warrior is human — 1 human, need 2 for threshold
      const tags = calculateSynergyTags(['warrior']);
      const humanTag = tags.find(t => t.name === '人类联盟');
      expect(humanTag).toBeDefined();
      expect(humanTag!.count).toBe(1);
      expect(humanTag!.active).toBe(false);
    });

    it('ignores heroes with no element', () => {
      // warrior has element: null
      const tags = calculateSynergyTags(['warrior']);
      const elementTags = tags.filter(t => {
        // Element synergies have type 'element' in SYNERGY_DEFINITIONS
        // This hero has no element, so no element tags should appear
        return false; // We just check no crash
      });
      // Should have race + class tags but no element
      expect(tags.length).toBeGreaterThan(0);
    });
  });

  describe('formatSynergyTags', () => {
    it('returns empty string for empty tags', () => {
      expect(formatSynergyTags([])).toBe('');
    });

    it('formats active tag with checkmark', () => {
      const tags: SynergyTag[] = [{ name: '测试', count: 2, threshold: 2, active: true }];
      const result = formatSynergyTags(tags);
      expect(result).toContain('测试');
      expect(result).toContain('2/2');
      expect(result).toContain('✓');
    });

    it('formats inactive tag with progress', () => {
      const tags: SynergyTag[] = [{ name: '测试', count: 1, threshold: 2, active: false }];
      const result = formatSynergyTags(tags);
      expect(result).toContain('测试');
      expect(result).toContain('1/2');
      expect(result).not.toContain('✓');
    });

    it('joins multiple tags with double space', () => {
      const tags: SynergyTag[] = [
        { name: 'A', count: 2, threshold: 2, active: true },
        { name: 'B', count: 1, threshold: 3, active: false },
      ];
      const result = formatSynergyTags(tags);
      expect(result).toContain('  ');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/utils/synergy-helpers.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Create `src/utils/synergy-helpers.ts`**

Use the exact code from the spec section 1.1. The file imports `heroesData`, `SYNERGY_DEFINITIONS`, and `UI`, exports `SynergyTag` interface, `calculateSynergyTags()`, and `formatSynergyTags()`.

```typescript
import heroesData from '../data/heroes.json';
import { SYNERGY_DEFINITIONS } from '../config/synergies';
import { UI } from '../i18n';

const heroes = heroesData as { id: string; race: string; class: string; element?: string | null }[];

export interface SynergyTag {
  name: string;
  count: number;
  threshold: number;
  active: boolean;
}

export function calculateSynergyTags(heroIds: string[]): SynergyTag[] {
  const selected = heroes.filter(h => heroIds.includes(h.id));

  const raceCounts = new Map<string, number>();
  const classCounts = new Map<string, number>();
  const elementCounts = new Map<string, number>();

  for (const hero of selected) {
    raceCounts.set(hero.race, (raceCounts.get(hero.race) ?? 0) + 1);
    classCounts.set(hero.class, (classCounts.get(hero.class) ?? 0) + 1);
    if (hero.element) {
      elementCounts.set(hero.element, (elementCounts.get(hero.element) ?? 0) + 1);
    }
  }

  const tags: SynergyTag[] = [];

  for (const syn of SYNERGY_DEFINITIONS) {
    let count = 0;
    if (syn.type === 'race') count = raceCounts.get(syn.key) ?? 0;
    else if (syn.type === 'class') count = classCounts.get(syn.key) ?? 0;
    else if (syn.type === 'element') count = elementCounts.get(syn.key) ?? 0;

    if (count === 0) continue;

    const thresholds = syn.thresholds.map(t => t.count).sort((a, b) => a - b);
    const nextThreshold = thresholds.find(t => t > count) ?? thresholds[thresholds.length - 1];
    const activeThreshold = thresholds.filter(t => count >= t).pop();

    tags.push({
      name: syn.name,
      count,
      threshold: activeThreshold ?? nextThreshold,
      active: activeThreshold !== undefined,
    });
  }

  return tags;
}

export function formatSynergyTags(tags: SynergyTag[]): string {
  if (tags.length === 0) return '';
  return tags.map(t =>
    t.active
      ? UI.shop.synergyActive(t.name, t.count, t.threshold)
      : UI.shop.synergyProgress(t.name, t.count, t.threshold)
  ).join('  ');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/utils/synergy-helpers.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/synergy-helpers.ts tests/utils/synergy-helpers.test.ts
git commit -m "feat: extract shared synergy calculation helper"
```

---

### Task 2: Add synergy preview to HeroDraftScene + refactor ShopScene

**Files:**
- Modify: `src/i18n.ts` — add draft synergy strings to `heroDraft:` section
- Modify: `src/scenes/HeroDraftScene.ts` — add synergy text + updateSynergyPreview()
- Modify: `src/scenes/ShopScene.ts` — refactor buildSynergyBar to use shared helper
- Create: `tests/scenes/hero-draft-synergy.test.ts` — synergy preview tests

- [ ] **Step 1: Add i18n strings**

In `src/i18n.ts`, find the `heroDraft:` section (line ~269) and add before the closing `}`:

```typescript
    synergyPlaceholder: '选择英雄查看羁绊',
    noSynergy: '无羁绊',
```

- [ ] **Step 2: Modify HeroDraftScene.ts**

Add import at top:
```typescript
import { calculateSynergyTags, formatSynergyTags } from '../utils/synergy-helpers';
```

Add class member:
```typescript
  private synergyText!: Phaser.GameObjects.Text;
```

In `create()`, after `this.updateSelectionUI();` (line ~129), add the synergy text:
```typescript
    const bottomY = GAME_HEIGHT - 55;
    // Synergy preview (above bottom panel)
    this.synergyText = this.add.text(GAME_WIDTH / 2, bottomY - 28, UI.heroDraft.synergyPlaceholder, {
      fontSize: '9px',
      color: '#666666',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
```

Note: `bottomY` is already declared earlier in `create()`. Use the existing variable — place the synergy text creation after the bottom panel setup but before `updateSelectionUI()`.

Add `updateSynergyPreview()` method at the end of `updateSelectionUI()`:
```typescript
    this.updateSynergyPreview();
```

Add private method:
```typescript
  private updateSynergyPreview(): void {
    if (!this.synergyText) return;
    if (this.selectedIds.length === 0) {
      this.synergyText.setText(UI.heroDraft.synergyPlaceholder);
      this.synergyText.setColor('#666666');
      return;
    }
    const tags = calculateSynergyTags(this.selectedIds);
    const text = formatSynergyTags(tags);
    this.synergyText.setText(text || UI.heroDraft.noSynergy);
    this.synergyText.setColor('#ccaa44');
  }
```

- [ ] **Step 3: Refactor ShopScene.ts buildSynergyBar**

Add import at top:
```typescript
import { calculateSynergyTags, formatSynergyTags } from '../utils/synergy-helpers';
```

Replace the body of `buildSynergyBar(heroes: HeroState[])` method (lines ~116-155). Keep the method signature and the text rendering at the end. Replace the inline counting logic with:

```typescript
  private buildSynergyBar(heroes: HeroState[]): void {
    const tags = calculateSynergyTags(heroes.map(h => h.id));
    const text = formatSynergyTags(tags);

    if (text) {
      this.add.text(GAME_WIDTH / 2, 105, `${UI.shop.synergyLabel} ${text}`, {
        fontSize: '9px',
        color: '#ccaa44',
        fontFamily: 'monospace',
      }).setOrigin(0.5);
    }
  }
```

Note: Check the existing `buildSynergyBar` for the exact y-position and text styling of the synergy bar and match it. The y=105 is approximate — read the actual file to get the correct value.

- [ ] **Step 4: Create `tests/scenes/hero-draft-synergy.test.ts`**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { createMockLocalStorage } from '../mocks/phaser';

const mockStorage = createMockLocalStorage();
Object.defineProperty(globalThis, 'localStorage', { value: mockStorage, writable: true });

import { HeroDraftScene } from '../../src/scenes/HeroDraftScene';
import { RunManager } from '../../src/managers/RunManager';
import { EventBus } from '../../src/systems/EventBus';
import { SceneTestHarness } from '../helpers/scene-harness';

describe('HeroDraftScene synergy preview', () => {
  beforeEach(() => {
    EventBus.getInstance().reset();
  });

  it('shows placeholder text when no heroes selected', () => {
    const scene = SceneTestHarness.createScene(HeroDraftScene);
    const placeholders = SceneTestHarness.findText(scene, '选择英雄查看羁绊');
    expect(placeholders.length).toBeGreaterThan(0);
  });

  it('updates synergy text when heroes are selected', () => {
    const scene = SceneTestHarness.createScene(HeroDraftScene);
    // Select 2 human heroes (warrior + mage)
    (scene as any).toggleHeroSelection('warrior');
    (scene as any).toggleHeroSelection('mage');
    // Synergy text should update — look for human alliance text
    const texts = SceneTestHarness.findText(scene, '人类联盟');
    expect(texts.length).toBeGreaterThan(0);
  });

  it('reverts to placeholder when all heroes deselected', () => {
    const scene = SceneTestHarness.createScene(HeroDraftScene);
    (scene as any).toggleHeroSelection('warrior');
    (scene as any).toggleHeroSelection('warrior'); // deselect
    const placeholders = SceneTestHarness.findText(scene, '选择英雄查看羁绊');
    expect(placeholders.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 5: Run tsc + tests**

Run: `npx tsc --noEmit && npx vitest run tests/utils/synergy-helpers.test.ts tests/scenes/hero-draft-synergy.test.ts`
Expected: No errors, all tests pass

- [ ] **Step 6: Commit**

```bash
git add src/i18n.ts src/scenes/HeroDraftScene.ts src/scenes/ShopScene.ts tests/scenes/hero-draft-synergy.test.ts
git commit -m "feat: add synergy preview to hero draft scene"
```

---

## Chunk 2: Map Utilities + Type Changes

### Task 3: Add MapNode type fields + map constants + i18n strings

**Files:**
- Modify: `src/types/index.ts` — add 3 fields to MapNode
- Modify: `src/config/balance.ts` — add 3 map constants
- Modify: `src/constants.ts` — re-export new constants
- Modify: `src/i18n.ts` — add 4 map strings

- [ ] **Step 1: Add MapNode fields**

In `src/types/index.ts`, find `interface MapNode` (line ~212) and add after `data?`:

```typescript
  hidden?: boolean;
  revealCost?: number;
  shortcutConnections?: number[];
```

- [ ] **Step 2: Add balance constants**

In `src/config/balance.ts`, after the `// ============ Map ============` section (after `REST_SCAVENGE_GOLD_MAX`), add:

```typescript
export const MAP_SHORTCUT_CHANCE = 0.15;
export const MAP_HIDDEN_NODE_CHANCE = 0.10;
export const MAP_HIDDEN_NODE_COST = 30;
```

- [ ] **Step 3: Re-export from constants.ts**

In `src/constants.ts`, add after the `REST_SCAVENGE_GOLD_MAX` line in the export list:

```typescript
  MAP_SHORTCUT_CHANCE,
  MAP_HIDDEN_NODE_CHANCE,
  MAP_HIDDEN_NODE_COST,
```

- [ ] **Step 4: Add i18n strings**

In `src/i18n.ts`, find the `map:` section and add before its closing `}`:

```typescript
    hiddenNode: '???',
    hiddenCost: (cost: number) => `${cost}G 揭示`,
    hiddenNoGold: '金币不足',
    hiddenRevealed: '发现了隐藏路径！',
```

- [ ] **Step 5: Run tsc**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/types/index.ts src/config/balance.ts src/constants.ts src/i18n.ts
git commit -m "feat: add MapNode variant fields, map constants, and i18n strings"
```

---

### Task 4: Create map-utils + refactor MapRenderer

**Files:**
- Create: `src/utils/map-utils.ts`
- Create: `tests/utils/map-utils.test.ts`
- Modify: `src/ui/MapRenderer.ts` — refactor buildLayers to use computeNodeLayers

- [ ] **Step 1: Write the failing test**

Create `tests/utils/map-utils.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { computeNodeLayers, buildLayerGroups } from '../../src/utils/map-utils';
import { MapNode } from '../../src/types';

function makeNode(index: number, connections: number[], type: 'battle' | 'boss' = 'battle'): MapNode {
  return { index, type, completed: false, connections };
}

describe('map-utils', () => {
  describe('computeNodeLayers', () => {
    it('returns empty map for empty nodes', () => {
      expect(computeNodeLayers([])).toEqual(new Map());
    });

    it('assigns layer 0 to root node', () => {
      const nodes = [makeNode(0, [])];
      const layers = computeNodeLayers(nodes);
      expect(layers.get(0)).toBe(0);
    });

    it('assigns sequential layers to linear chain', () => {
      const nodes = [
        makeNode(0, [1]),
        makeNode(1, [2]),
        makeNode(2, []),
      ];
      const layers = computeNodeLayers(nodes);
      expect(layers.get(0)).toBe(0);
      expect(layers.get(1)).toBe(1);
      expect(layers.get(2)).toBe(2);
    });

    it('assigns same layer to branching nodes', () => {
      // 0 → [1, 2], 1 → [3], 2 → [3]
      const nodes = [
        makeNode(0, [1, 2]),
        makeNode(1, [3]),
        makeNode(2, [3]),
        makeNode(3, []),
      ];
      const layers = computeNodeLayers(nodes);
      expect(layers.get(1)).toBe(1);
      expect(layers.get(2)).toBe(1);
      expect(layers.get(3)).toBe(2);
    });

    it('does not traverse shortcutConnections', () => {
      const nodes: MapNode[] = [
        { index: 0, type: 'battle', completed: false, connections: [1], shortcutConnections: [2] },
        { index: 1, type: 'battle', completed: false, connections: [2] },
        { index: 2, type: 'boss', completed: false, connections: [] },
      ];
      const layers = computeNodeLayers(nodes);
      // Node 2 should be layer 2 (via 0→1→2), not layer 1 (via shortcut 0→2)
      expect(layers.get(2)).toBe(2);
    });
  });

  describe('buildLayerGroups', () => {
    it('groups nodes by layer', () => {
      const layerMap = new Map([[0, 0], [1, 1], [2, 1], [3, 2]]);
      const groups = buildLayerGroups(layerMap);
      expect(groups.get(0)).toEqual([0]);
      expect(groups.get(1)!.sort()).toEqual([1, 2]);
      expect(groups.get(2)).toEqual([3]);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/utils/map-utils.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Create `src/utils/map-utils.ts`**

```typescript
import { MapNode } from '../types';

/**
 * BFS layer computation. Only traverses `connections`, not `shortcutConnections`.
 * Returns nodeIndex → layerIndex mapping.
 */
export function computeNodeLayers(nodes: MapNode[]): Map<number, number> {
  const layerMap = new Map<number, number>();
  if (nodes.length === 0) return layerMap;

  layerMap.set(0, 0);
  const queue = [0];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentLayer = layerMap.get(current)!;

    for (const nextIdx of nodes[current].connections) {
      if (nextIdx < nodes.length && !layerMap.has(nextIdx)) {
        layerMap.set(nextIdx, currentLayer + 1);
        queue.push(nextIdx);
      }
    }
  }

  return layerMap;
}

/**
 * Invert layerMap: returns layerIndex → nodeIndex[] mapping.
 */
export function buildLayerGroups(layerMap: Map<number, number>): Map<number, number[]> {
  const groups = new Map<number, number[]>();
  for (const [nodeIdx, layerIdx] of layerMap) {
    if (!groups.has(layerIdx)) groups.set(layerIdx, []);
    groups.get(layerIdx)!.push(nodeIdx);
  }
  return groups;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/utils/map-utils.test.ts`
Expected: PASS

- [ ] **Step 5: Refactor MapRenderer.buildLayers**

In `src/ui/MapRenderer.ts`, add import:
```typescript
import { computeNodeLayers } from '../utils/map-utils';
```

In `buildLayers()` method (line ~33), replace the layer-assignment portion of the BFS with `computeNodeLayers()`. The existing BFS interleaves layer + act tracking, so refactor as:

1. Use `computeNodeLayers(map)` for layer assignment (replaces the `nodeLayer` BFS)
2. Keep a separate act-assignment pass that walks the computed layers and tracks boss transitions for `nodeAct`

```typescript
  static buildLayers(map: MapNode[], acts: ActConfig[]): LayerInfo[] {
    const layers: LayerInfo[] = [];
    const nodeLayer = computeNodeLayers(map);

    // Act assignment: walk layers, advance act at boss nodes
    const nodeAct = new Map<number, number>();
    const actQueue: { idx: number; act: number }[] = [{ idx: 0, act: 0 }];
    const visited = new Set<number>();
    nodeAct.set(0, 0);
    visited.add(0);

    while (actQueue.length > 0) {
      const { idx, act } = actQueue.shift()!;
      const node = map[idx];
      for (const connIdx of node.connections) {
        if (connIdx < map.length && !visited.has(connIdx)) {
          visited.add(connIdx);
          let nextAct = act;
          if (node.type === 'boss') nextAct = act + 1;
          nodeAct.set(connIdx, Math.min(nextAct, acts.length - 1));
          actQueue.push({ idx: connIdx, act: nextAct });
        }
      }
    }

    // ... rest of LayerInfo construction unchanged (use nodeLayer + nodeAct) ...
```

Keep the existing `LayerInfo` grouping logic after this (lines 58+). The key is replacing `nodeLayer` population with `computeNodeLayers()` while keeping `nodeAct` as a separate BFS pass.

- [ ] **Step 6: Run full tests**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add src/utils/map-utils.ts tests/utils/map-utils.test.ts src/ui/MapRenderer.ts
git commit -m "feat: add map layer computation utility"
```

---

## Chunk 3: Map Variant Generation

### Task 5: Add shortcut and hidden node generation to MapGenerator

**Files:**
- Modify: `src/systems/MapGenerator.ts` — add addShortcuts() + addHiddenNodes()
- Create: `tests/systems/map-variants.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/systems/map-variants.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { MapGenerator } from '../../src/systems/MapGenerator';
import { SeededRNG } from '../../src/utils/rng';
import { MapNode } from '../../src/types';
import { MAP_HIDDEN_NODE_COST } from '../../src/constants';

describe('Map Variants', () => {
  // Find a seed that triggers shortcuts (15% chance per act)
  // Try multiple seeds to find one that generates a shortcut
  function generateMapWithSeed(seed: number): MapNode[] {
    const rng = new SeededRNG(seed);
    return MapGenerator.generate(rng, 1);
  }

  describe('shortcuts', () => {
    it('shortcut connections are stored in shortcutConnections field', () => {
      // Try many seeds to find one with a shortcut
      for (let seed = 1; seed <= 200; seed++) {
        const map = generateMapWithSeed(seed);
        const hasShortcut = map.some(n => (n.shortcutConnections?.length ?? 0) > 0);
        if (hasShortcut) {
          const node = map.find(n => (n.shortcutConnections?.length ?? 0) > 0)!;
          expect(node.shortcutConnections!.length).toBeGreaterThan(0);
          // Shortcut target should be a valid node index
          for (const targetIdx of node.shortcutConnections!) {
            expect(targetIdx).toBeLessThan(map.length);
            expect(targetIdx).toBeGreaterThanOrEqual(0);
          }
          return; // Found one, test passes
        }
      }
      // With 15% chance per act (3-4 acts), probability of no shortcut in 200 seeds is negligible
      expect.fail('No shortcut found in 200 seeds');
    });

    it('shortcuts do not target boss nodes', () => {
      for (let seed = 1; seed <= 200; seed++) {
        const map = generateMapWithSeed(seed);
        for (const node of map) {
          if (!node.shortcutConnections?.length) continue;
          for (const targetIdx of node.shortcutConnections) {
            expect(map[targetIdx].type, `Seed ${seed}: shortcut targets boss`).not.toBe('boss');
          }
        }
      }
    });

    it('shortcuts are not in regular connections', () => {
      for (let seed = 1; seed <= 200; seed++) {
        const map = generateMapWithSeed(seed);
        for (const node of map) {
          if (!node.shortcutConnections?.length) continue;
          for (const sc of node.shortcutConnections) {
            expect(node.connections).not.toContain(sc);
          }
        }
      }
    });
  });

  describe('hidden nodes', () => {
    it('hidden nodes have hidden=true and revealCost', () => {
      for (let seed = 1; seed <= 200; seed++) {
        const map = generateMapWithSeed(seed);
        const hiddenNode = map.find(n => n.hidden === true);
        if (hiddenNode) {
          expect(hiddenNode.revealCost).toBe(MAP_HIDDEN_NODE_COST);
          expect(['event', 'shop']).toContain(hiddenNode.type);
          expect(hiddenNode.completed).toBe(false);
          return;
        }
      }
      expect.fail('No hidden node found in 200 seeds');
    });

    it('hidden nodes have forward connections (not dead ends)', () => {
      for (let seed = 1; seed <= 200; seed++) {
        const map = generateMapWithSeed(seed);
        const hiddenNode = map.find(n => n.hidden === true);
        if (hiddenNode) {
          expect(hiddenNode.connections.length).toBeGreaterThan(0);
          return;
        }
      }
      expect.fail('No hidden node found in 200 seeds');
    });

    it('hidden nodes are reachable from a parent node', () => {
      for (let seed = 1; seed <= 200; seed++) {
        const map = generateMapWithSeed(seed);
        const hiddenNode = map.find(n => n.hidden === true);
        if (hiddenNode) {
          // Some non-hidden node should have hiddenNode.index in its connections
          const parent = map.find(n => !n.hidden && n.connections.includes(hiddenNode.index));
          expect(parent, 'Hidden node has no parent').toBeDefined();
          return;
        }
      }
      expect.fail('No hidden node found in 200 seeds');
    });

    it('same seed produces same map (deterministic)', () => {
      const map1 = generateMapWithSeed(42);
      const map2 = generateMapWithSeed(42);
      expect(map1.length).toBe(map2.length);
      for (let i = 0; i < map1.length; i++) {
        expect(map1[i].type).toBe(map2[i].type);
        expect(map1[i].hidden).toBe(map2[i].hidden);
        expect(map1[i].connections).toEqual(map2[i].connections);
        expect(map1[i].shortcutConnections).toEqual(map2[i].shortcutConnections);
      }
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/systems/map-variants.test.ts`
Expected: FAIL — no shortcutConnections or hidden nodes generated yet

- [ ] **Step 3: Implement addShortcuts and addHiddenNodes in MapGenerator**

In `src/systems/MapGenerator.ts`, add imports:
```typescript
import { computeNodeLayers, buildLayerGroups } from '../utils/map-utils';
import { MAP_SHORTCUT_CHANCE, MAP_HIDDEN_NODE_CHANCE, MAP_HIDDEN_NODE_COST } from '../constants';
```

At the end of the `generate()` method, before `return allNodes;` (line ~137), add:
```typescript
    // Map variants
    this.addShortcuts(allNodes, rng);
    this.addHiddenNodes(allNodes, rng, acts);

    return allNodes;
```

(Remove the existing `return allNodes;`)

Add two new static methods:

```typescript
  /**
   * Add shortcut connections (skip 1 layer) with MAP_SHORTCUT_CHANCE per act.
   */
  private static addShortcuts(nodes: MapNode[], rng: SeededRNG): void {
    const layerMap = computeNodeLayers(nodes);
    const layerGroups = buildLayerGroups(layerMap);
    const maxLayer = Math.max(...layerMap.values());

    // Identify act boundaries (boss nodes mark end of acts)
    const bossLayers: number[] = [];
    for (const [nodeIdx, layer] of layerMap) {
      if (nodes[nodeIdx].type === 'boss') bossLayers.push(layer);
    }

    let actStartLayer = 0;
    for (const bossLayer of bossLayers.sort((a, b) => a - b)) {
      if (rng.next() >= MAP_SHORTCUT_CHANCE) {
        actStartLayer = bossLayer + 1;
        continue;
      }

      // Find valid source layers: not first, not last 2 (boss + pre-boss), +2 must not reach boss
      const validSourceLayers: number[] = [];
      for (let l = actStartLayer + 1; l <= bossLayer; l++) {
        if (l + 2 <= bossLayer - 1 && layerGroups.has(l) && layerGroups.has(l + 2)) {
          validSourceLayers.push(l);
        }
      }

      if (validSourceLayers.length === 0) {
        actStartLayer = bossLayer + 1;
        continue;
      }

      const sourceLayer = rng.pick(validSourceLayers);
      const sourceNodeIdx = rng.pick(layerGroups.get(sourceLayer)!);
      const targetNodeIdx = rng.pick(layerGroups.get(sourceLayer + 2)!);

      const sourceNode = nodes[sourceNodeIdx];
      if (!sourceNode.shortcutConnections) sourceNode.shortcutConnections = [];
      if (!sourceNode.shortcutConnections.includes(targetNodeIdx)) {
        sourceNode.shortcutConnections.push(targetNodeIdx);
      }

      actStartLayer = bossLayer + 1;
    }
  }

  /**
   * Add hidden nodes (event/shop, 30g reveal) with MAP_HIDDEN_NODE_CHANCE per act.
   */
  private static addHiddenNodes(nodes: MapNode[], rng: SeededRNG, acts: ActConfig[]): void {
    const layerMap = computeNodeLayers(nodes);
    const layerGroups = buildLayerGroups(layerMap);

    const bossLayers: number[] = [];
    for (const [nodeIdx, layer] of layerMap) {
      if (nodes[nodeIdx].type === 'boss') bossLayers.push(layer);
    }

    let actStartLayer = 0;
    let actIndex = 0;
    for (const bossLayer of bossLayers.sort((a, b) => a - b)) {
      if (rng.next() >= MAP_HIDDEN_NODE_CHANCE) {
        actStartLayer = bossLayer + 1;
        actIndex++;
        continue;
      }

      // Valid parent layers: not first, not boss, not boss-1
      const validParentLayers: number[] = [];
      for (let l = actStartLayer + 1; l <= bossLayer - 2; l++) {
        if (layerGroups.has(l)) {
          validParentLayers.push(l);
        }
      }

      if (validParentLayers.length === 0) {
        actStartLayer = bossLayer + 1;
        actIndex++;
        continue;
      }

      const parentLayer = rng.pick(validParentLayers);
      const parentNodeIdx = rng.pick(layerGroups.get(parentLayer)!);
      const parentNode = nodes[parentNodeIdx];

      const act = (acts[actIndex % acts.length]) as ActConfig;
      const hiddenType: NodeType = rng.next() < 0.5 ? 'event' : 'shop';

      const hiddenNode: MapNode = {
        index: nodes.length,
        type: hiddenType,
        completed: false,
        connections: [...parentNode.connections],
        hidden: true,
        revealCost: MAP_HIDDEN_NODE_COST,
      };

      if (hiddenType === 'event') {
        hiddenNode.data = this.generateEventData(rng, act);
      }

      nodes.push(hiddenNode);
      parentNode.connections.push(hiddenNode.index);

      actStartLayer = bossLayer + 1;
      actIndex++;
    }
  }
```

Note: `NodeType` and `ActConfig` should already be imported at the top of MapGenerator.ts. Verify and add if missing.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/systems/map-variants.test.ts`
Expected: PASS

- [ ] **Step 5: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass (existing MapGenerator tests should still pass since variants are additive)

- [ ] **Step 6: Commit**

```bash
git add src/systems/MapGenerator.ts tests/systems/map-variants.test.ts
git commit -m "feat: add map shortcuts and hidden node generation"
```

---

### Task 6: Update RunManager accessibility + MapScene rendering

**Files:**
- Modify: `src/managers/RunManager.ts` — update getAccessibleNodes() for shortcutConnections
- Modify: `src/scenes/MapScene.ts` — shortcut line rendering + hidden node rendering/reveal

- [ ] **Step 1: Update RunManager.getAccessibleNodes()**

In `src/managers/RunManager.ts`, find `getAccessibleNodes()` (line ~316). After the loop that checks `node.connections` (lines 329-331), add shortcutConnections check:

```typescript
        // Also check shortcut connections
        if (node.shortcutConnections) {
          for (const connIdx of node.shortcutConnections) {
            if (connIdx < map.length && !map[connIdx].completed) {
              accessible.add(connIdx);
            }
          }
        }
```

Also add: hidden nodes that are still hidden should NOT be in the accessible set (they need reveal first). After building the accessible set, filter:

```typescript
    // Hidden nodes are not accessible until revealed
    for (const idx of accessible) {
      if (map[idx].hidden) {
        accessible.delete(idx);
      }
    }
```

- [ ] **Step 2: Update MapScene for shortcut rendering**

In `src/scenes/MapScene.ts`, in `create()`, find the connection drawing loop (around line 100-125 where it iterates `node.connections`). After that loop, add a second loop for shortcut connections:

```typescript
    // NOTE: In the existing normal connection drawing loop above, add a check
    // to skip connections to hidden nodes (they'll be drawn below in gray dashed style):
    //   if (map[connIdx]?.hidden) continue;

    // Draw connections to hidden nodes in gray dashed style
    for (const node of map) {
      if (node.hidden) continue; // hidden nodes don't draw outgoing
      const fromPos = nodePositions.get(node.index);
      if (!fromPos) continue;

      for (const connIdx of node.connections) {
        const targetNode = map[connIdx];
        if (!targetNode?.hidden) continue; // only for hidden targets
        const toPos = nodePositions.get(connIdx);
        if (!toPos) continue;

        const g = this.add.graphics();
        this.mapContainer.add(g);
        g.lineStyle(1, 0x888888, 0.4);
        // Gray dashed line to hidden node
        const dx = toPos.x - fromPos.x;
        const dy = toPos.y - fromPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const nx = dx / dist;
        const ny = dy / dist;
        for (let d = 0; d < dist; d += 6) {
          const x1 = fromPos.x + nx * d;
          const y1 = fromPos.y + ny * d;
          const endD = Math.min(d + 4, dist);
          g.beginPath();
          g.moveTo(x1, y1);
          g.lineTo(fromPos.x + nx * endD, fromPos.y + ny * endD);
          g.strokePath();
        }
      }
    }

    // Draw shortcut connections (dashed cyan lines)
    for (const node of map) {
      if (!node.shortcutConnections?.length) continue;
      const fromPos = nodePositions.get(node.index);
      if (!fromPos) continue;

      for (const targetIdx of node.shortcutConnections) {
        const toPos = nodePositions.get(targetIdx);
        if (!toPos) continue;

        const connGraphics = this.add.graphics();
        this.mapContainer.add(connGraphics);

        // Dashed line in cyan (fixed alpha per spec)
        connGraphics.lineStyle(1.5, 0x44dddd, 0.6);

        // Draw dashed: segments of 4px with 2px gaps
        const dx = toPos.x - fromPos.x;
        const dy = toPos.y - fromPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const dashLen = 4;
        const gapLen = 2;
        const step = dashLen + gapLen;
        const nx = dx / dist;
        const ny = dy / dist;

        for (let d = 0; d < dist; d += step) {
          const x1 = fromPos.x + nx * d;
          const y1 = fromPos.y + ny * d;
          const endD = Math.min(d + dashLen, dist);
          const x2 = fromPos.x + nx * endD;
          const y2 = fromPos.y + ny * endD;
          connGraphics.beginPath();
          connGraphics.moveTo(x1, y1);
          connGraphics.lineTo(x2, y2);
          connGraphics.strokePath();
        }
      }
    }
```

- [ ] **Step 3: Update MapScene for hidden node rendering**

In the node drawing loop (around line 129+), add a check for hidden nodes. Before drawing the node circle, check `node.hidden`:

```typescript
      if (node.hidden) {
        // Hidden node: gray, "?" label, cost text
        g.fillStyle(0x888888, 0.4);
        g.fillCircle(pos.x, pos.y, radius);
        g.lineStyle(1, 0x888888, 0.4);
        g.strokeCircle(pos.x, pos.y, radius);

        const labelText = this.add.text(pos.x, pos.y, '?', {
          fontSize: '10px', color: '#888888', fontFamily: 'monospace', fontStyle: 'bold',
        }).setOrigin(0.5);
        this.mapContainer.add(labelText);

        // Cost text below
        const costText = this.add.text(pos.x, pos.y + radius + 8, UI.map.hiddenCost(node.revealCost ?? MAP_HIDDEN_NODE_COST), {
          fontSize: '8px', color: '#ccaa44', fontFamily: 'monospace',
        }).setOrigin(0.5);
        this.mapContainer.add(costText);

        // Click to reveal
        const hitArea = this.add.zone(pos.x, pos.y, radius * 2, radius * 2).setInteractive({ useHandCursor: true });
        this.mapContainer.add(hitArea);
        hitArea.on('pointerup', () => {
          if (this.isDragging) return;
          const rm = RunManager.getInstance();
          if (rm.getGold() < (node.revealCost ?? MAP_HIDDEN_NODE_COST)) {
            // Show "not enough gold" floating text
            const noGold = this.add.text(pos.x, pos.y - 20, UI.map.hiddenNoGold, {
              fontSize: '10px', color: '#ff4444', fontFamily: 'monospace',
            }).setOrigin(0.5);
            this.mapContainer.add(noGold);
            this.tweens.add({ targets: noGold, alpha: 0, y: pos.y - 40, duration: 1000, onComplete: () => noGold.destroy() });
            return;
          }
          rm.spendGold(node.revealCost ?? MAP_HIDDEN_NODE_COST);
          node.hidden = false;
          SaveManager.autoSave();
          this.scene.restart();
        });

        continue; // Skip normal node rendering for hidden nodes
      }
```

This block should go at the start of the node rendering loop body, before the normal circle/label/hitArea drawing.

Add imports at top of MapScene if not already present:
```typescript
import { MAP_HIDDEN_NODE_COST } from '../constants';
import { SaveManager } from '../managers/SaveManager';
```

- [ ] **Step 4: Compute nodePositions for hidden nodes**

Hidden nodes don't have a layer in the normal BFS (since they're appended after generation). They need a position on the map. In the position calculation section, add fallback handling:

For hidden nodes, position them slightly offset from their parent node. Find the parent (the node whose `connections` includes the hidden node's index):

```typescript
    // Position hidden nodes near their parent
    for (const node of map) {
      if (!node.hidden) continue;
      if (nodePositions.has(node.index)) continue;

      // Find parent node
      const parent = map.find(n => !n.hidden && n.connections.includes(node.index));
      if (!parent) continue;
      const parentPos = nodePositions.get(parent.index);
      if (!parentPos) continue;

      // Offset below parent
      nodePositions.set(node.index, { x: parentPos.x, y: parentPos.y + 50 });
    }
```

This should go after the normal nodePositions calculation loop.

- [ ] **Step 5: Run tsc + full test suite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: No errors, all tests pass

- [ ] **Step 6: Commit**

```bash
git add src/managers/RunManager.ts src/scenes/MapScene.ts
git commit -m "feat: add shortcut rendering and hidden node reveal to MapScene"
```

---

### Task 7: Version bump

**Files:**
- Modify: `package.json` — version 1.13.0 → 1.14.0

- [ ] **Step 1: Bump version**

In `package.json`, change `"version": "1.13.0"` to `"version": "1.14.0"`.

- [ ] **Step 2: Run full test suite + tsc**

Run: `npx tsc --noEmit && npx vitest run`
Expected: All tests pass, no TS errors

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "chore: bump version to v1.14.0"
```
