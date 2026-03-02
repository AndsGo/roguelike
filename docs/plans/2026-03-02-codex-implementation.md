# Codex Feature (英雄图鉴 & 怪物图鉴) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Hero Codex and Monster Codex accessible from the main menu, showing all heroes/monsters with stats, skills, and unlock status.

**Architecture:** Single CodexPanel modal (600×400) with tab switching, card grid of chibi sprites, and CodexDetailPopup overlay for detailed unit info. Monster encounters tracked in MetaManager and persisted via SaveManager.

**Tech Stack:** TypeScript, Phaser 3, existing Panel/Button UI components, UnitRenderer for chibi sprites, Vitest for tests.

---

### Task 1: Add `encounteredEnemies` to MetaProgressionData type

**Files:**
- Modify: `src/types/index.ts:314-323`

**Step 1: Add the field to MetaProgressionData**

In `src/types/index.ts`, find the `MetaProgressionData` interface and add the new field:

```ts
export interface MetaProgressionData {
  totalRuns: number;
  totalVictories: number;
  highestFloor: number;
  unlockedHeroes: string[];
  unlockedRelics: string[];
  permanentUpgrades: PermanentUpgrade[];
  achievements: string[];
  metaCurrency: number;
  encounteredEnemies: string[];   // enemy IDs seen in battle (codex tracking)
}
```

**Step 2: Update SaveManager default meta**

In `src/managers/SaveManager.ts`, find the `defaultMeta()` method (line ~140) and add the new field:

```ts
private static defaultMeta(): MetaProgressionData {
  return {
    totalRuns: 0,
    totalVictories: 0,
    highestFloor: 0,
    unlockedHeroes: ['warrior', 'archer', 'mage'],
    unlockedRelics: [],
    permanentUpgrades: [],
    achievements: [],
    metaCurrency: 0,
    encounteredEnemies: [],
  };
}
```

**Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS (the field is optional in serialized data, MetaManager will handle migration)

**Step 4: Commit**

```bash
git add src/types/index.ts src/managers/SaveManager.ts
git commit -m "feat(codex): add encounteredEnemies field to MetaProgressionData"
```

---

### Task 2: Add MetaManager encounter tracking methods + tests

**Files:**
- Modify: `src/managers/MetaManager.ts`
- Create: `tests/managers/meta-codex.test.ts`

**Step 1: Write the failing tests**

Create `tests/managers/meta-codex.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock localStorage
const store: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, val: string) => { store[key] = val; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); },
});

import { MetaManager } from '../../src/managers/MetaManager';

describe('MetaManager enemy encounter tracking', () => {
  beforeEach(() => {
    Object.keys(store).forEach(k => delete store[k]);
    // Reset singleton
    (MetaManager as any).instance = undefined;
  });

  it('records a new enemy encounter', () => {
    MetaManager.recordEnemyEncounter('slime');
    expect(MetaManager.hasEncounteredEnemy('slime')).toBe(true);
  });

  it('does not duplicate encounters', () => {
    MetaManager.recordEnemyEncounter('goblin');
    MetaManager.recordEnemyEncounter('goblin');
    expect(MetaManager.getEncounteredEnemies()).toEqual(['goblin']);
  });

  it('tracks multiple different enemies', () => {
    MetaManager.recordEnemyEncounter('slime');
    MetaManager.recordEnemyEncounter('goblin');
    MetaManager.recordEnemyEncounter('skeleton');
    expect(MetaManager.getEncounteredEnemies()).toHaveLength(3);
    expect(MetaManager.hasEncounteredEnemy('slime')).toBe(true);
    expect(MetaManager.hasEncounteredEnemy('goblin')).toBe(true);
    expect(MetaManager.hasEncounteredEnemy('skeleton')).toBe(true);
  });

  it('returns false for unencountered enemies', () => {
    expect(MetaManager.hasEncounteredEnemy('dragon_boss')).toBe(false);
  });

  it('persists encounters across getInstance() resets', () => {
    MetaManager.recordEnemyEncounter('slime');
    // Reset singleton to simulate reload
    (MetaManager as any).instance = undefined;
    expect(MetaManager.hasEncounteredEnemy('slime')).toBe(true);
  });

  it('handles legacy data missing encounteredEnemies field', () => {
    // Simulate old save data without the field
    const oldMeta = {
      totalRuns: 5,
      totalVictories: 2,
      highestFloor: 15,
      unlockedHeroes: ['warrior'],
      unlockedRelics: [],
      permanentUpgrades: [],
      achievements: [],
      metaCurrency: 100,
      // no encounteredEnemies field
    };
    const json = JSON.stringify(oldMeta);
    // Simple checksum to match SaveManager format
    let hash = 0;
    for (let i = 0; i < json.length; i++) {
      const ch = json.charCodeAt(i);
      hash = ((hash << 5) - hash) + ch;
      hash |= 0;
    }
    store['roguelike_meta'] = JSON.stringify({ data: json, checksum: hash.toString(36) });

    (MetaManager as any).instance = undefined;
    // Should not crash, should default to empty array
    expect(MetaManager.getEncounteredEnemies()).toEqual([]);
    // Should still be able to add encounters
    MetaManager.recordEnemyEncounter('slime');
    expect(MetaManager.hasEncounteredEnemy('slime')).toBe(true);
  });

  it('resetAll clears encountered enemies', () => {
    MetaManager.recordEnemyEncounter('slime');
    MetaManager.resetAll();
    expect(MetaManager.getEncounteredEnemies()).toEqual([]);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/managers/meta-codex.test.ts`
Expected: FAIL — methods `recordEnemyEncounter`, `hasEncounteredEnemy`, `getEncounteredEnemies` don't exist yet.

**Step 3: Implement the methods in MetaManager**

In `src/managers/MetaManager.ts`, add the following section after the Achievements section (around line 254):

```ts
// ---- Enemy Encounters (Codex) ----

static getEncounteredEnemies(): string[] {
  return MetaManager.getInstance().meta.encounteredEnemies ?? [];
}

static recordEnemyEncounter(enemyId: string): void {
  const inst = MetaManager.getInstance();
  if (!inst.meta.encounteredEnemies) {
    inst.meta.encounteredEnemies = [];
  }
  if (!inst.meta.encounteredEnemies.includes(enemyId)) {
    inst.meta.encounteredEnemies.push(enemyId);
    inst.persist();
  }
}

static hasEncounteredEnemy(enemyId: string): boolean {
  return (MetaManager.getInstance().meta.encounteredEnemies ?? []).includes(enemyId);
}
```

Also update `resetAll()` (line ~257) to include:

```ts
inst.meta.encounteredEnemies = [];
```

Add it after `inst.meta.metaCurrency = 0;`.

**Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/managers/meta-codex.test.ts`
Expected: PASS — all 7 tests green.

**Step 5: Run full test suite**

Run: `npx vitest run`
Expected: All 600+ tests pass.

**Step 6: Commit**

```bash
git add src/managers/MetaManager.ts tests/managers/meta-codex.test.ts
git commit -m "feat(codex): add enemy encounter tracking to MetaManager with tests"
```

---

### Task 3: Add i18n strings for Codex UI

**Files:**
- Modify: `src/i18n.ts`

**Step 1: Add codex strings to the UI object**

In `src/i18n.ts`, add a new `codex` section to the `UI` object (after the `settings` section, around line 262):

```ts
// Codex
codex: {
  title: '图鉴',
  heroTab: '英雄图鉴',
  monsterTab: '怪物图鉴',
  locked: '未解锁',
  unlockCondition: '解锁条件',
  unknown: '???',
  stats: '属性',
  skills: '技能',
  noSkills: '无技能',
  encounterUnlock: '在战斗中遇见即解锁',
  close: '[ 关闭 ]',
  heroCount: (unlocked: number, total: number) => `已解锁: ${unlocked}/${total}`,
  monsterCount: (seen: number, total: number) => `已发现: ${seen}/${total}`,
  baseStats: '基础属性',
  rewards: (gold: number, exp: number) => `奖励: ${gold}G / ${exp}EXP`,
  boss: '首领',
},
```

**Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add src/i18n.ts
git commit -m "feat(codex): add Chinese localization strings for codex UI"
```

---

### Task 4: Hook BattleScene to record enemy encounters

**Files:**
- Modify: `src/scenes/BattleScene.ts`

**Step 1: Add import**

At the top of `src/scenes/BattleScene.ts`, add MetaManager to imports:

```ts
import { MetaManager } from '../managers/MetaManager';
```

(Check if it's already imported — it may be. If not, add it.)

**Step 2: Record encounters after enemy creation**

Find the enemy creation block (around line 158-169). After `this.battleSystem.setUnits(heroes, enemies);` (line 169), add:

```ts
// Record enemy encounters for codex
for (const enemy of enemies) {
  MetaManager.recordEnemyEncounter(enemy.unitId);
}
```

Note: `enemy.unitId` comes from the Enemy constructor which passes `data.id`. Verify by checking `src/entities/Enemy.ts` constructor.

**Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 4: Commit**

```bash
git add src/scenes/BattleScene.ts
git commit -m "feat(codex): record enemy encounters when battle starts"
```

---

### Task 5: Create CodexPanel UI component

**Files:**
- Create: `src/ui/CodexPanel.ts`

**Step 1: Create the CodexPanel**

Create `src/ui/CodexPanel.ts`. This follows the same pattern as `AchievementPanel.ts`:

```ts
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { Panel } from './Panel';
import { Theme, colorToString } from './Theme';
import { MetaManager } from '../managers/MetaManager';
import { UI, RACE_NAMES, CLASS_NAMES, ROLE_NAMES, ELEMENT_NAMES, STAT_LABELS } from '../i18n';
import { getOrCreateTexture, getDisplaySize, ChibiConfig } from '../systems/UnitRenderer';
import { CodexDetailPopup } from './CodexDetailPopup';
import heroesData from '../data/heroes.json';
import enemiesData from '../data/enemies.json';
import skillsData from '../data/skills.json';

interface HeroEntry {
  id: string;
  name: string;
  role: string;
  race?: string;
  class?: string;
  element?: string | null;
  baseStats: Record<string, number>;
  skills: string[];
}

interface EnemyEntry {
  id: string;
  name: string;
  role: string;
  race?: string;
  element?: string | null;
  baseStats: Record<string, number>;
  skills: string[];
  goldReward?: number;
  expReward?: number;
  isBoss?: boolean;
}

const CARD_W = 90;
const CARD_H = 100;
const COLS = 5;
const CARD_GAP = 8;
const GRID_START_Y = -120;

/**
 * Codex modal panel with two tabs: Hero Codex and Monster Codex.
 * Shows a scrollable grid of unit cards. Click a card to see details.
 */
export class CodexPanel {
  private panel: Panel;
  private scene: Phaser.Scene;
  private backdrop: Phaser.GameObjects.Rectangle;
  private closeText: Phaser.GameObjects.Text;
  private closeHit: Phaser.GameObjects.Rectangle;
  private onCloseCallback: () => void;
  private activeTab: 'hero' | 'monster' = 'hero';
  private tabButtons: Phaser.GameObjects.Text[] = [];
  private tabBgs: Phaser.GameObjects.Graphics[] = [];
  private detailPopup: CodexDetailPopup | null = null;

  private static readonly PANEL_WIDTH = 560;
  private static readonly PANEL_HEIGHT = 400;

  constructor(scene: Phaser.Scene, onClose: () => void) {
    this.scene = scene;
    this.onCloseCallback = onClose;

    // Semi-transparent backdrop
    this.backdrop = scene.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2,
      GAME_WIDTH, GAME_HEIGHT,
      0x000000, 0.5,
    ).setInteractive({ useHandCursor: true }).setDepth(799);
    this.backdrop.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const hw = CodexPanel.PANEL_WIDTH / 2;
      const hh = CodexPanel.PANEL_HEIGHT / 2;
      if (pointer.x < GAME_WIDTH / 2 - hw || pointer.x > GAME_WIDTH / 2 + hw ||
          pointer.y < GAME_HEIGHT / 2 - hh || pointer.y > GAME_HEIGHT / 2 + hh) {
        this.close();
      }
    });

    this.panel = new Panel(scene, GAME_WIDTH / 2, GAME_HEIGHT / 2, CodexPanel.PANEL_WIDTH, CodexPanel.PANEL_HEIGHT, {
      title: UI.codex.title,
      animate: true,
    });
    this.panel.setDepth(800);

    // Tab buttons (above scrollable content, fixed position)
    this.createTabs();

    // Render initial tab
    this.renderTab();

    // Fixed close button
    this.closeText = scene.add.text(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2 + CodexPanel.PANEL_HEIGHT / 2 - 16,
      UI.codex.close,
      { fontSize: '10px', color: '#888888', fontFamily: 'monospace' },
    ).setOrigin(0.5).setDepth(801);

    this.closeHit = scene.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2 + CodexPanel.PANEL_HEIGHT / 2 - 16,
      80, 24, 0x000000, 0,
    ).setInteractive({ useHandCursor: true }).setDepth(801);
    this.closeHit.on('pointerdown', () => this.close());
  }

  private createTabs(): void {
    const tabY = GAME_HEIGHT / 2 - CodexPanel.PANEL_HEIGHT / 2 + 38;
    const tabs: { key: 'hero' | 'monster'; label: string }[] = [
      { key: 'hero', label: UI.codex.heroTab },
      { key: 'monster', label: UI.codex.monsterTab },
    ];

    tabs.forEach((tab, i) => {
      const x = GAME_WIDTH / 2 - 80 + i * 160;

      const bg = this.scene.add.graphics().setDepth(801);
      this.tabBgs.push(bg);

      const text = this.scene.add.text(x, tabY, tab.label, {
        fontSize: '11px',
        color: '#ffffff',
        fontFamily: 'monospace',
        fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(801).setInteractive({ useHandCursor: true });

      text.on('pointerdown', () => {
        if (this.activeTab !== tab.key) {
          this.activeTab = tab.key;
          this.renderTab();
          this.updateTabStyles();
        }
      });

      this.tabButtons.push(text);
    });

    this.updateTabStyles();
  }

  private updateTabStyles(): void {
    const tabY = GAME_HEIGHT / 2 - CodexPanel.PANEL_HEIGHT / 2 + 38;

    this.tabButtons.forEach((text, i) => {
      const isActive = (i === 0 && this.activeTab === 'hero') || (i === 1 && this.activeTab === 'monster');
      const x = GAME_WIDTH / 2 - 80 + i * 160;

      text.setColor(isActive ? colorToString(Theme.colors.secondary) : '#888888');

      const bg = this.tabBgs[i];
      bg.clear();
      if (isActive) {
        bg.fillStyle(Theme.colors.panelBorder, 0.4);
        bg.fillRoundedRect(x - 55, tabY - 10, 110, 20, 3);
      }
    });
  }

  private renderTab(): void {
    // Clear existing content
    this.panel.clearContent();

    if (this.activeTab === 'hero') {
      this.renderHeroGrid();
    } else {
      this.renderMonsterGrid();
    }
  }

  private renderHeroGrid(): void {
    const heroes = heroesData as HeroEntry[];
    const unlocked = new Set(MetaManager.getUnlockedHeroes());

    // Summary
    const summary = this.scene.add.text(0, GRID_START_Y - 20, UI.codex.heroCount(unlocked.size, heroes.length), {
      fontSize: '10px',
      color: colorToString(Theme.colors.secondary),
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.panel.addContent(summary);

    // Card grid
    const gridW = COLS * (CARD_W + CARD_GAP) - CARD_GAP;
    const startX = -gridW / 2;
    let maxY = GRID_START_Y;

    heroes.forEach((hero, idx) => {
      const col = idx % COLS;
      const row = Math.floor(idx / COLS);
      const x = startX + col * (CARD_W + CARD_GAP) + CARD_W / 2;
      const y = GRID_START_Y + row * (CARD_H + CARD_GAP);
      const isUnlocked = unlocked.has(hero.id);

      this.renderCard(x, y, hero.name, isUnlocked, hero, 'hero');
      maxY = Math.max(maxY, y + CARD_H);
    });

    this.panel.setContentHeight(maxY - GRID_START_Y + 40);
  }

  private renderMonsterGrid(): void {
    const enemies = enemiesData as EnemyEntry[];
    const encountered = new Set(MetaManager.getEncounteredEnemies());

    // Summary
    const summary = this.scene.add.text(0, GRID_START_Y - 20, UI.codex.monsterCount(encountered.size, enemies.length), {
      fontSize: '10px',
      color: colorToString(Theme.colors.secondary),
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.panel.addContent(summary);

    // Card grid
    const gridW = COLS * (CARD_W + CARD_GAP) - CARD_GAP;
    const startX = -gridW / 2;
    let maxY = GRID_START_Y;

    enemies.forEach((enemy, idx) => {
      const col = idx % COLS;
      const row = Math.floor(idx / COLS);
      const x = startX + col * (CARD_W + CARD_GAP) + CARD_W / 2;
      const y = GRID_START_Y + row * (CARD_H + CARD_GAP);
      const isEncountered = encountered.has(enemy.id);

      this.renderCard(x, y, enemy.name, isEncountered, enemy, 'monster');
      maxY = Math.max(maxY, y + CARD_H);
    });

    this.panel.setContentHeight(maxY - GRID_START_Y + 40);
  }

  private renderCard(
    x: number,
    y: number,
    name: string,
    isRevealed: boolean,
    data: HeroEntry | EnemyEntry,
    type: 'hero' | 'monster',
  ): void {
    const scene = this.scene;

    // Card background
    const cardBg = scene.add.graphics();
    const bgColor = isRevealed ? 0x1a2a3a : 0x1a1a22;
    cardBg.fillStyle(bgColor, 0.8);
    cardBg.fillRoundedRect(x - CARD_W / 2, y, CARD_W, CARD_H, 4);
    cardBg.lineStyle(1, isRevealed ? Theme.colors.panelBorder : 0x333344, 0.6);
    cardBg.strokeRoundedRect(x - CARD_W / 2, y, CARD_W, CARD_H, 4);
    this.panel.addContent(cardBg);

    if (isRevealed) {
      // Try to render chibi sprite
      try {
        const isHero = type === 'hero';
        const config: ChibiConfig = {
          role: (data.role as any) ?? 'melee_dps',
          race: ((data as any).race as any) ?? 'human',
          classType: ((data as any).class as any) ?? 'warrior',
          fillColor: isHero
            ? (Theme.colors.role[data.role] ?? 0x4488ff)
            : 0xff4444,
          borderColor: isHero ? 0xffffff : 0xcc2222,
          isHero,
          isBoss: (data as EnemyEntry).isBoss ?? false,
        };
        const textureKey = getOrCreateTexture(scene, config);
        const sprite = scene.add.image(x, y + 38, textureKey).setOrigin(0.5);
        const size = getDisplaySize(config.role, config.isBoss);
        // Scale down to fit card (max 60px tall)
        const maxH = 55;
        if (size.h > maxH) {
          const ratio = maxH / size.h;
          sprite.setScale(ratio);
        }
        this.panel.addContent(sprite);
      } catch {
        // Fallback: just show a colored rectangle
        const fallback = scene.add.graphics();
        fallback.fillStyle(Theme.colors.role[data.role] ?? 0x4488ff, 0.6);
        fallback.fillRect(x - 10, y + 20, 20, 30);
        this.panel.addContent(fallback);
      }

      // Name
      const displayName = name.length > 5 ? name.substring(0, 5) : name;
      const nameText = scene.add.text(x, y + CARD_H - 12, displayName, {
        fontSize: '9px',
        color: '#ffffff',
        fontFamily: 'monospace',
      }).setOrigin(0.5);
      this.panel.addContent(nameText);

      // Boss indicator
      if ((data as EnemyEntry).isBoss) {
        const bossTag = scene.add.text(x + CARD_W / 2 - 4, y + 4, UI.codex.boss, {
          fontSize: '7px',
          color: colorToString(Theme.colors.danger),
          fontFamily: 'monospace',
          fontStyle: 'bold',
        }).setOrigin(1, 0);
        this.panel.addContent(bossTag);
      }

      // Click handler — open detail popup
      const hitArea = scene.add.rectangle(x, y + CARD_H / 2, CARD_W, CARD_H, 0x000000, 0)
        .setInteractive({ useHandCursor: true });
      hitArea.on('pointerdown', () => {
        if (this.detailPopup) return;
        this.detailPopup = new CodexDetailPopup(scene, data, type, () => {
          this.detailPopup = null;
        });
      });
      this.panel.addContent(hitArea);
    } else {
      // Unknown card
      const unknownText = scene.add.text(x, y + 35, UI.codex.unknown, {
        fontSize: '18px',
        color: '#444455',
        fontFamily: 'monospace',
      }).setOrigin(0.5);
      this.panel.addContent(unknownText);

      // Lock indicator for heroes / encounter hint for monsters
      const hintText = type === 'hero' ? UI.codex.locked : UI.codex.encounterUnlock;
      const hint = scene.add.text(x, y + CARD_H - 12, hintText, {
        fontSize: '7px',
        color: '#555566',
        fontFamily: 'monospace',
        wordWrap: { width: CARD_W - 8 },
        align: 'center',
      }).setOrigin(0.5);
      this.panel.addContent(hint);
    }
  }

  close(onComplete?: () => void): void {
    // Clean up detail popup if open
    if (this.detailPopup) {
      this.detailPopup.close();
      this.detailPopup = null;
    }

    // Clean up tabs
    this.tabButtons.forEach(t => t.destroy());
    this.tabBgs.forEach(g => g.destroy());

    this.backdrop.destroy();
    this.closeText.destroy();
    this.closeHit.destroy();
    this.panel.close(() => {
      this.onCloseCallback();
      if (onComplete) onComplete();
    });
  }
}
```

**Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: Will fail because `CodexDetailPopup` doesn't exist yet. That's OK — we'll create it in the next task.

**Step 3: Commit (hold until Task 6)**

---

### Task 6: Create CodexDetailPopup UI component

**Files:**
- Create: `src/ui/CodexDetailPopup.ts`

**Step 1: Create the detail popup**

Create `src/ui/CodexDetailPopup.ts`. This follows the `HeroDetailPopup` pattern (Container + backdrop + Graphics panel):

```ts
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { Theme, colorToString } from './Theme';
import { UI, RACE_NAMES, CLASS_NAMES, ROLE_NAMES, ELEMENT_NAMES, STAT_LABELS } from '../i18n';
import { getOrCreateTexture, getDisplaySize, ChibiConfig } from '../systems/UnitRenderer';
import { MetaManager } from '../managers/MetaManager';
import skillsData from '../data/skills.json';

const POPUP_WIDTH = 480;
const POPUP_HEIGHT = 340;

interface UnitData {
  id: string;
  name: string;
  role: string;
  race?: string;
  class?: string;
  element?: string | null;
  baseStats: Record<string, number>;
  skills: string[];
  goldReward?: number;
  expReward?: number;
  isBoss?: boolean;
}

/**
 * Detail popup overlay for a codex entry.
 * Shows chibi sprite, stats, skills, and unlock info.
 * Click outside to dismiss.
 */
export class CodexDetailPopup extends Phaser.GameObjects.Container {
  private backdrop: Phaser.GameObjects.Rectangle;
  private onCloseCallback: () => void;

  constructor(scene: Phaser.Scene, data: UnitData, type: 'hero' | 'monster', onClose: () => void) {
    super(scene, 0, 0);
    this.setDepth(802);
    this.onCloseCallback = onClose;

    // Backdrop
    this.backdrop = scene.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2,
      GAME_WIDTH, GAME_HEIGHT,
      0x000000, 0.4,
    ).setInteractive({ useHandCursor: true });
    this.add(this.backdrop);

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    // Panel background
    const panel = scene.add.graphics();
    panel.fillStyle(Theme.colors.panel, 0.97);
    panel.fillRoundedRect(cx - POPUP_WIDTH / 2, cy - POPUP_HEIGHT / 2, POPUP_WIDTH, POPUP_HEIGHT, 8);
    panel.lineStyle(2, Theme.colors.panelBorder, 1);
    panel.strokeRoundedRect(cx - POPUP_WIDTH / 2, cy - POPUP_HEIGHT / 2, POPUP_WIDTH, POPUP_HEIGHT, 8);
    this.add(panel);

    const leftX = cx - POPUP_WIDTH / 2 + 20;
    const rightX = cx - POPUP_WIDTH / 2 + 140;
    const topY = cy - POPUP_HEIGHT / 2 + 20;

    // ── Left side: Chibi sprite ──
    try {
      const isHero = type === 'hero';
      const config: ChibiConfig = {
        role: (data.role as any) ?? 'melee_dps',
        race: ((data.race as any) ?? 'human'),
        classType: ((data.class as any) ?? 'warrior'),
        fillColor: isHero
          ? (Theme.colors.role[data.role] ?? 0x4488ff)
          : 0xff4444,
        borderColor: isHero ? 0xffffff : 0xcc2222,
        isHero,
        isBoss: data.isBoss ?? false,
      };
      const key = getOrCreateTexture(scene, config);
      const sprite = scene.add.image(leftX + 50, cy, key).setOrigin(0.5);
      // Scale up for detail view
      const targetH = 80;
      const actualH = getDisplaySize(config.role, config.isBoss).h;
      if (actualH > 0) {
        sprite.setScale(targetH / actualH);
      }
      this.add(sprite);
    } catch {
      // Fallback
    }

    // ── Right side: Info ──
    // Name + boss tag
    const nameStr = data.name + (data.isBoss ? ` [${UI.codex.boss}]` : '');
    const nameText = scene.add.text(rightX, topY, nameStr, {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setDepth(803);
    this.add(nameText);

    // Tags: race / class / element / role
    const tags: string[] = [];
    if (data.race) tags.push(RACE_NAMES[data.race] ?? data.race);
    if (data.class) tags.push(CLASS_NAMES[data.class] ?? data.class);
    if (data.element) tags.push(ELEMENT_NAMES[data.element] ?? data.element);
    tags.push(ROLE_NAMES[data.role] ?? data.role);

    const tagText = scene.add.text(rightX, topY + 18, tags.join(' / '), {
      fontSize: '9px',
      color: '#aaaacc',
      fontFamily: 'monospace',
    }).setDepth(803);
    this.add(tagText);

    // ── Stats ──
    const statsY = topY + 40;
    const statsLabel = scene.add.text(rightX, statsY, UI.codex.baseStats, {
      fontSize: '10px',
      color: colorToString(Theme.colors.secondary),
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setDepth(803);
    this.add(statsLabel);

    const statOrder = ['maxHp', 'attack', 'defense', 'magicPower', 'magicResist',
                       'speed', 'attackSpeed', 'attackRange', 'critChance', 'critDamage'];

    const col1X = rightX;
    const col2X = rightX + 140;
    let statIdx = 0;

    for (const key of statOrder) {
      const value = data.baseStats[key];
      if (value == null) continue;

      const label = STAT_LABELS[key] ?? key;
      let valueStr: string;
      if (key === 'critChance') {
        valueStr = `${Math.round(value * 100)}%`;
      } else if (key === 'attackSpeed' || key === 'critDamage') {
        valueStr = value.toFixed(1);
      } else {
        valueStr = `${Math.round(value)}`;
      }

      const xPos = statIdx < 5 ? col1X : col2X;
      const yPos = statsY + 16 + (statIdx % 5) * 14;

      const statText = scene.add.text(xPos, yPos, `${label}: ${valueStr}`, {
        fontSize: '9px',
        color: '#ccccdd',
        fontFamily: 'monospace',
      }).setDepth(803);
      this.add(statText);
      statIdx++;
    }

    // ── Skills ──
    const skillsY = statsY + 16 + 5 * 14 + 10;
    const allSkills = skillsData as { id: string; name: string; description: string }[];

    const skillHeader = scene.add.text(rightX, skillsY, UI.codex.skills, {
      fontSize: '10px',
      color: '#88aaff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setDepth(803);
    this.add(skillHeader);

    if (data.skills.length === 0) {
      const noSkill = scene.add.text(rightX, skillsY + 16, UI.codex.noSkills, {
        fontSize: '9px',
        color: '#666677',
        fontFamily: 'monospace',
      }).setDepth(803);
      this.add(noSkill);
    } else {
      let skillY = skillsY + 16;
      for (const skillId of data.skills) {
        const skill = allSkills.find(s => s.id === skillId);
        const name = skill?.name ?? skillId;
        const desc = skill?.description ?? '';
        const shortDesc = desc.length > 35 ? desc.substring(0, 35) + '...' : desc;
        const t = scene.add.text(rightX, skillY, `${name} - ${shortDesc}`, {
          fontSize: '8px',
          color: '#aabbdd',
          fontFamily: 'monospace',
          wordWrap: { width: POPUP_WIDTH - 160 },
        }).setDepth(803);
        this.add(t);
        skillY += 14;
      }
    }

    // ── Monster rewards ──
    if (type === 'monster' && data.goldReward && data.expReward) {
      const rewardY = cy + POPUP_HEIGHT / 2 - 50;
      const rewardText = scene.add.text(rightX, rewardY, UI.codex.rewards(data.goldReward, data.expReward), {
        fontSize: '9px',
        color: colorToString(Theme.colors.gold),
        fontFamily: 'monospace',
      }).setDepth(803);
      this.add(rewardText);
    }

    // ── Hero unlock condition ──
    if (type === 'hero') {
      const isUnlocked = MetaManager.isHeroUnlocked(data.id);
      if (!isUnlocked) {
        const lockY = cy + POPUP_HEIGHT / 2 - 50;
        const condition = (MetaManager as any).constructor.HERO_UNLOCK_CONDITIONS?.[data.id];
        const condStr = condition?.description ?? UI.codex.locked;
        const lockText = scene.add.text(rightX, lockY, `${UI.codex.unlockCondition}: ${condStr}`, {
          fontSize: '9px',
          color: colorToString(Theme.colors.danger),
          fontFamily: 'monospace',
        }).setDepth(803);
        this.add(lockText);
      }
    }

    // ── Close ──
    const closeText = scene.add.text(cx, cy + POPUP_HEIGHT / 2 - 14, UI.codex.close, {
      fontSize: '9px',
      color: '#666677',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(803);
    this.add(closeText);

    this.backdrop.on('pointerdown', () => this.close());

    // Animate in
    this.setAlpha(0);
    scene.tweens.add({
      targets: this,
      alpha: 1,
      duration: 150,
      ease: 'Sine.easeOut',
    });

    scene.add.existing(this);
  }

  close(): void {
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 100,
      onComplete: () => {
        this.onCloseCallback();
        this.destroy();
      },
    });
  }
}
```

**Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit both UI files**

```bash
git add src/ui/CodexPanel.ts src/ui/CodexDetailPopup.ts
git commit -m "feat(codex): add CodexPanel and CodexDetailPopup UI components"
```

---

### Task 7: Add "图鉴" button to MainMenuScene

**Files:**
- Modify: `src/scenes/MainMenuScene.ts`

**Step 1: Add CodexPanel import and instance variable**

At the top imports (around line 14), add:

```ts
import { CodexPanel } from '../ui/CodexPanel';
```

Add instance variable in the class (around line 24, after `helpPanel`):

```ts
private codexPanel: CodexPanel | null = null;
```

In `create()` (around line 33), add initialization:

```ts
this.codexPanel = null;
```

**Step 2: Add the button**

In `create()`, after the Help button (around line 120), add:

```ts
// Codex button
new Button(this, GAME_WIDTH / 2, btnY, UI.codex.title, 180, 40, () => {
  this.showCodexPanel();
}, Theme.colors.panelBorder);
btnY += 50;
```

**Step 3: Add showCodexPanel method**

After `showAchievementPanel()` (around line 362), add:

```ts
private showCodexPanel(): void {
  if (this.codexPanel) {
    this.codexPanel.close(() => { this.codexPanel = null; });
    return;
  }
  this.codexPanel = new CodexPanel(this, () => {
    this.codexPanel = null;
  });
}
```

**Step 4: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 5: Commit**

```bash
git add src/scenes/MainMenuScene.ts
git commit -m "feat(codex): add codex button to main menu"
```

---

### Task 8: Add Panel.clearContent() method if missing

**Files:**
- Modify: `src/ui/Panel.ts` (if `clearContent()` doesn't exist)

**Step 1: Check if Panel has clearContent()**

Search `src/ui/Panel.ts` for `clearContent`. If it exists, skip this task.

If it doesn't exist, add it to the Panel class:

```ts
/** Remove all content children (for tab switching / re-render) */
clearContent(): void {
  this.contentContainer.removeAll(true);
  this.scrollY = 0;
  this.contentContainer.y = 0;
  this.drawScrollbar();
}
```

**Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add src/ui/Panel.ts
git commit -m "feat(codex): add clearContent() to Panel for tab switching"
```

---

### Task 9: Write integration tests

**Files:**
- Create: `tests/ui/codex-panel.test.ts`

**Step 1: Write integration tests**

Create `tests/ui/codex-panel.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock localStorage
const store: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, val: string) => { store[key] = val; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); },
});

import { MetaManager } from '../../src/managers/MetaManager';
import heroesData from '../../src/data/heroes.json';
import enemiesData from '../../src/data/enemies.json';

describe('Codex data integration', () => {
  beforeEach(() => {
    Object.keys(store).forEach(k => delete store[k]);
    (MetaManager as any).instance = undefined;
  });

  it('all heroes are accessible from heroes.json', () => {
    const heroes = heroesData as { id: string; name: string; role: string; skills: string[] }[];
    expect(heroes.length).toBeGreaterThan(0);
    for (const h of heroes) {
      expect(h.id).toBeTruthy();
      expect(h.name).toBeTruthy();
      expect(h.role).toBeTruthy();
    }
  });

  it('all enemies are accessible from enemies.json', () => {
    const enemies = enemiesData as { id: string; name: string; role: string }[];
    expect(enemies.length).toBeGreaterThan(0);
    for (const e of enemies) {
      expect(e.id).toBeTruthy();
      expect(e.name).toBeTruthy();
    }
  });

  it('hero unlock status is queryable for codex', () => {
    const defaultUnlocked = MetaManager.getUnlockedHeroes();
    expect(defaultUnlocked).toContain('warrior');
    expect(defaultUnlocked).toContain('archer');
    expect(defaultUnlocked).toContain('mage');
    expect(MetaManager.isHeroUnlocked('warrior')).toBe(true);
    expect(MetaManager.isHeroUnlocked('thunder_monk')).toBe(false);
  });

  it('enemy encounter tracking works end-to-end', () => {
    expect(MetaManager.getEncounteredEnemies()).toEqual([]);

    // Simulate a battle recording encounters
    const battleEnemies = ['slime', 'goblin', 'slime']; // slime appears twice
    for (const id of battleEnemies) {
      MetaManager.recordEnemyEncounter(id);
    }

    expect(MetaManager.hasEncounteredEnemy('slime')).toBe(true);
    expect(MetaManager.hasEncounteredEnemy('goblin')).toBe(true);
    expect(MetaManager.hasEncounteredEnemy('skeleton')).toBe(false);
    expect(MetaManager.getEncounteredEnemies()).toHaveLength(2); // No duplicates
  });

  it('codex counts match data sources', () => {
    const heroes = heroesData as { id: string }[];
    const enemies = enemiesData as { id: string }[];

    // Initially: 3 heroes unlocked, 0 enemies encountered
    expect(MetaManager.getUnlockedHeroes().length).toBe(3);
    expect(MetaManager.getEncounteredEnemies().length).toBe(0);

    // After encountering all enemies
    for (const e of enemies) {
      MetaManager.recordEnemyEncounter(e.id);
    }
    expect(MetaManager.getEncounteredEnemies().length).toBe(enemies.length);
  });
});
```

**Step 2: Run the tests**

Run: `npx vitest run tests/ui/codex-panel.test.ts`
Expected: PASS — all tests green.

**Step 3: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass (600+ existing + 12+ new).

**Step 4: Commit**

```bash
git add tests/ui/codex-panel.test.ts
git commit -m "test(codex): add codex data integration tests"
```

---

### Task 10: Full verification

**Step 1: Type check**

Run: `npx tsc --noEmit`
Expected: Zero errors.

**Step 2: Full test suite**

Run: `npx vitest run`
Expected: All tests pass.

**Step 3: Build check**

Run: `npx vite build`
Expected: Build succeeds (only pre-existing Phaser chunk warning).

**Step 4: Visual verification**

Start dev server: `npx vite`
Navigate to `http://localhost:5173` in browser.

Verify:
1. Main menu shows "图鉴" button between Help and bottom stats
2. Click "图鉴" → CodexPanel opens with hero tab active
3. Hero grid shows 19 heroes (3 unlocked in full color, 16 as "???")
4. Click an unlocked hero → detail popup shows name, stats, skills
5. Switch to monster tab → all show "???" (none encountered yet)
6. Start a new game → enter battle → return to menu → monster tab shows encountered enemies
7. Click outside panel → closes
8. Click close button → closes

**Step 5: Final commit**

If any fixes were needed during visual verification, commit them:

```bash
git add -A
git commit -m "fix(codex): visual adjustments from testing"
```

---

## Task Dependency Summary

```
Task 1 (types)
  └→ Task 2 (MetaManager + tests)
       └→ Task 4 (BattleScene hook)
Task 3 (i18n) — independent
Task 8 (Panel.clearContent) — independent
  └→ Task 5 (CodexPanel) + Task 6 (CodexDetailPopup) — parallel
       └→ Task 7 (MainMenuScene button)
            └→ Task 9 (integration tests)
                 └→ Task 10 (full verification)
```

Tasks 1, 3, 8 can be done in parallel.
Tasks 5 and 6 can be done in parallel (both depend on i18n).
