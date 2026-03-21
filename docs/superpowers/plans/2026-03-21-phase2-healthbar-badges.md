# Visual Differentiation Phase 2 — Health Bar Differentiation + Monster Badges

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Differentiate unit types visually through 4-tier health bar styles (hero/normal/elite/boss) and monster role badges, so players can instantly assess threat level without reading names.

**Architecture:** `HealthBar` gets a new `style` parameter that controls border color, bar height, and background style. `Unit.ts` passes the style based on `isHero`, `isBoss`, and enemy node type. Monster badges are drawn as small text/icon indicators above enemy sprites in `BattleHUD`. No new files — all changes extend existing components.

**Tech Stack:** TypeScript, Phaser 3

---

## File Map

| File | Responsibility | Tasks |
|------|---------------|-------|
| `src/components/HealthBar.ts` | Health bar rendering | Task 1 (add style parameter + 4 visual tiers) |
| `src/entities/Unit.ts` | Unit entity | Task 2 (pass health bar style based on unit type) |
| `src/ui/BattleHUD.ts` | Battle HUD portraits | Task 3 (enemy badge indicators) |
| `src/config/visual.ts` | Visual constants | Task 1 (health bar style constants) |
| `tests/components/HealthBar.test.ts` | **NEW** — Health bar style tests | Task 1 |

---

## Task 1: Add 4-Tier Health Bar Styles

**Context:** Currently all units share the same HealthBar (40×5px, grey bg, no border). Design requires:
- **Hero:** Clean green bar, thin white border (current + border)
- **Normal enemy:** Same dimensions but red-tinted bg, no border
- **Elite enemy:** Purple border, slightly taller (40×6px)
- **Boss:** Wider (56×7px), gold border (2px). Phase notch marks deferred to Phase 3 (requires BossPhaseSystem data integration)

**Files:**
- Modify: `src/components/HealthBar.ts:7-47`
- Modify: `src/config/visual.ts`
- Create: `tests/components/HealthBar.test.ts`

- [ ] **Step 1: Define health bar style types and constants**

Add to `src/config/visual.ts`:

```typescript
// ─── Health Bar Styles ───
export const HEALTH_BAR_STYLES = {
  hero: {
    borderColor: 0x4488cc,
    borderAlpha: 0.5,
    borderWidth: 1,
    bgColor: 0x333333,
    width: 40,
    height: 5,
  },
  normal: {
    borderColor: 0,
    borderAlpha: 0,
    borderWidth: 0,
    bgColor: 0x442222,
    width: 40,
    height: 5,
  },
  elite: {
    borderColor: 0x9944cc,
    borderAlpha: 0.8,
    borderWidth: 1,
    bgColor: 0x332233,
    width: 40,
    height: 6,
  },
  boss: {
    borderColor: 0xffd700,
    borderAlpha: 0.9,
    borderWidth: 2,
    bgColor: 0x333322,
    width: 56,
    height: 7,
  },
} as const;

export type HealthBarStyle = keyof typeof HEALTH_BAR_STYLES;
```

- [ ] **Step 2: Write health bar style test**

Create `tests/components/HealthBar.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { HEALTH_BAR_STYLES } from '../../src/config/visual';

describe('HealthBar styles', () => {
  it('defines all 4 unit type styles', () => {
    expect(HEALTH_BAR_STYLES).toHaveProperty('hero');
    expect(HEALTH_BAR_STYLES).toHaveProperty('normal');
    expect(HEALTH_BAR_STYLES).toHaveProperty('elite');
    expect(HEALTH_BAR_STYLES).toHaveProperty('boss');
  });

  it('boss bar is wider and taller than normal', () => {
    expect(HEALTH_BAR_STYLES.boss.width).toBeGreaterThan(HEALTH_BAR_STYLES.normal.width);
    expect(HEALTH_BAR_STYLES.boss.height).toBeGreaterThan(HEALTH_BAR_STYLES.normal.height);
  });

  it('elite has visible border, normal does not', () => {
    expect(HEALTH_BAR_STYLES.elite.borderAlpha).toBeGreaterThan(0);
    expect(HEALTH_BAR_STYLES.normal.borderAlpha).toBe(0);
  });

  it('hero and boss have distinct border colors', () => {
    expect(HEALTH_BAR_STYLES.hero.borderColor).not.toBe(HEALTH_BAR_STYLES.boss.borderColor);
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npm test -- tests/components/HealthBar.test.ts
```

- [ ] **Step 4: Modify HealthBar constructor to accept style**

In `src/components/HealthBar.ts`, add a `style` parameter to the constructor and apply it:

```typescript
import { HEALTH_BAR_STYLES, HealthBarStyle } from '../config/visual';

export class HealthBar extends Phaser.GameObjects.Container {
  // ... existing fields ...
  private borderGfx: Phaser.GameObjects.Graphics | null = null;

  constructor(
    scene: Phaser.Scene, x: number, y: number,
    width: number, height: number,
    style: HealthBarStyle = 'hero',  // NEW parameter with default
  ) {
    super(scene, x, y);
    const styleConfig = HEALTH_BAR_STYLES[style];
    this.barWidth = styleConfig.width;    // override width from style
    this.barHeight = styleConfig.height;  // override height from style

    // Background — style-specific bg color
    this.bgBar = scene.add.graphics();
    this.bgBar.fillStyle(styleConfig.bgColor, 1);
    this.bgBar.fillRoundedRect(-this.barWidth / 2, -this.barHeight / 2, this.barWidth, this.barHeight, 1);
    this.add(this.bgBar);

    // Border — only if style has border
    if (styleConfig.borderWidth > 0 && styleConfig.borderAlpha > 0) {
      this.borderGfx = scene.add.graphics();
      this.borderGfx.lineStyle(styleConfig.borderWidth, styleConfig.borderColor, styleConfig.borderAlpha);
      this.borderGfx.strokeRoundedRect(
        -this.barWidth / 2 - 1, -this.barHeight / 2 - 1,
        this.barWidth + 2, this.barHeight + 2, 2,
      );
      this.add(this.borderGfx);
    }

    // ... rest of constructor (delayBar, fillBar, shieldBar, drawFill) unchanged ...
  }
```

**Design decision (from review):** Remove the `width`/`height` params entirely — they become dead parameters once style is applied. Constructor signature changes to `(scene, x, y, style)`. All callers updated to pass style instead of width/height. This keeps the interface clean.

- [ ] **Step 5: Run full verification**

```bash
npx tsc --noEmit && npm test
```

- [ ] **Step 6: Commit**

```bash
git add src/components/HealthBar.ts src/config/visual.ts tests/components/HealthBar.test.ts
git commit -m "feat: 4-tier health bar styles (hero/normal/elite/boss)"
```

---

## Task 2: Pass Health Bar Style from Unit Based on Type

**Context:** `Unit.ts` creates `new HealthBar(scene, x, y, HEALTH_BAR_WIDTH, HEALTH_BAR_HEIGHT)` without any style. Need to determine the correct style based on `isHero`, `isBoss`, and the battle node type (elite).

**Files:**
- Modify: `src/entities/Unit.ts:116-117`

- [ ] **Step 1: Add method to determine health bar style**

In `Unit.ts`, add a private helper:

```typescript
import { HealthBarStyle } from '../config/visual';

private getHealthBarStyle(): HealthBarStyle {
  if (this.isHero) return 'hero';
  if (this.isBoss) return 'boss';
  return 'normal';  // elite detection added in Step 2
}
```

- [ ] **Step 2: Pass style to HealthBar constructor**

Change the HealthBar creation line (~line 117):

```typescript
// BEFORE:
this.healthBar = new HealthBar(scene, 0, this.spriteHeight / 2 + 4, HEALTH_BAR_WIDTH, HEALTH_BAR_HEIGHT);

// AFTER:
const hbStyle = this.getHealthBarStyle();
this.healthBar = new HealthBar(scene, 0, this.spriteHeight / 2 + 4, HEALTH_BAR_WIDTH, HEALTH_BAR_HEIGHT, hbStyle);
```

- [ ] **Step 3: Handle elite enemies**

Elite enemies are determined by the battle node type ('elite'), but Unit doesn't know the node type at construction. Two options:

**Option A (simple):** Add an `isElite` flag to Unit, set from BattleScene when creating enemies for elite nodes.

In `Unit.ts`, add field: `isElite: boolean = false;`

Update `getHealthBarStyle()`:
```typescript
private getHealthBarStyle(): HealthBarStyle {
  if (this.isHero) return 'hero';
  if (this.isBoss) return 'boss';
  if (this.isElite) return 'elite';
  return 'normal';
}
```

In `BattleScene.ts`, after creating enemies for elite nodes, set `enemy.isElite = true`:
```typescript
// Find where enemies are created — check if node.type === 'elite'
// After enemy creation loop:
if (node.type === 'elite') {
  for (const enemy of enemies) {
    enemy.isElite = true;
  }
}
```

Note: Since `isElite` is set AFTER construction, the health bar style is already determined. We need to either:
- Pass elite status to the constructor, or
- Add a `setElite()` method that recreates the health bar

**Recommended approach:** Add `setElite()` similar to `setBoss()`. Must restore all attached state (element, level, shield):

```typescript
/** Recreate health bar with a new style, preserving attached display state */
private recreateHealthBar(style: HealthBarStyle): void {
  const hbY = this.healthBar.y;
  const oldElement = this.element;
  this.healthBar.destroy();
  this.healthBar = new HealthBar(this.scene, 0, hbY, style);
  this.add(this.healthBar);
  this.healthBar.updateHealth(this.currentHp, this.currentStats.maxHp);
  // Restore attached state
  if (oldElement) this.healthBar.setElement(oldElement);
}

setElite(): void {
  this.isElite = true;
  this.recreateHealthBar('elite');
}
```

- [ ] **Step 4: Call setElite in BattleScene**

In `src/scenes/BattleScene.ts`, find where enemies are created for elite nodes and call `enemy.setElite()`:

```typescript
// After enemy creation, check node type
if (node.type === 'elite') {
  for (const enemy of enemies) {
    enemy.setElite();
  }
}
```

Search for `node.type` or `'elite'` in BattleScene to find the right location.

- [ ] **Step 5: Handle boss health bar in setBoss**

Update the existing `setBoss()` method in `Unit.ts` to use `recreateHealthBar()`:

```typescript
setBoss(): void {
  this.isBoss = true;
  const sizeInfo = this.computeSize();
  this.spriteWidth = sizeInfo.w;
  this.spriteHeight = sizeInfo.h;
  this.regenerateTexture();
  this.recreateHealthBar('boss');
}
```

- [ ] **Step 6: Run verification**

```bash
npx tsc --noEmit && npm test
```

- [ ] **Step 7: Commit**

```bash
git add src/entities/Unit.ts src/scenes/BattleScene.ts
git commit -m "feat: units use tier-specific health bar styles (hero/normal/elite/boss)"
```

---

## Task 3: Add Threat Tier Badges to BattleHUD Enemy Portraits

**Context:** Enemy portraits in BattleHUD are minimal (colored box + name + HP bar). Add small badges showing enemy threat level. This is a **threat tier badge** system (boss/elite/normal), not a monsterType badge. MonsterType visual identity is handled by the sprite templates (Phase 1).

**Badge priority rules (from review — prevents information overload):**
- **Left slot (fixed, 1 icon):** Boss ♛ OR Elite ★ OR element dot (mutually exclusive, highest wins)
- **Right slot (conditional, 1 icon):** Stun ! only when active (from Phase 1 BattleHUD enhancement)
- **Name color:** Gold (boss) / Purple (elite) / Red (normal)
- Total portrait width must stay ≤ 110px

**Scope note:** Phase 2 elite style only applies to map `node.type === 'elite'`. Boss summon adds, gauntlet elites, event elites deferred to future phases.

**Files:**
- Modify: `src/ui/BattleHUD.ts:167-199` (createEnemyPortraits)

- [ ] **Step 1: Enhance createEnemyPortraits with monsterType badge and elite/boss indicator**

In `BattleHUD.ts`, modify `createEnemyPortraits()`:

```typescript
private createEnemyPortraits(): void {
  this.enemies.forEach((enemy, i) => {
    const container = this.scene.add.container(GAME_WIDTH - 108, 32 + i * 22);

    // Boss/Elite badge (leftmost indicator)
    if (enemy.isBoss) {
      const badge = TextFactory.create(this.scene, -2, 0, '♛', 'tiny', {
        color: '#ffd700',
      }).setOrigin(0.5);
      container.add(badge);
    } else if (enemy.isElite) {
      const badge = TextFactory.create(this.scene, -2, 0, '★', 'tiny', {
        color: '#9944cc',
      }).setOrigin(0.5);
      container.add(badge);
    }

    // Element dot (if enemy has element)
    if (enemy.element) {
      const elDot = this.scene.add.graphics();
      elDot.fillStyle(getElementColor(enemy.element), 1);
      elDot.fillCircle(6, 0, 3);
      container.add(elDot);
    }

    // Name — color varies by threat level
    const nameColor = enemy.isBoss ? '#ffd700' : enemy.isElite ? '#cc88ff' : '#ff8888';
    const name = TextFactory.create(this.scene, 12, 0, enemy.unitName.substring(0, 5), 'small', {
      color: nameColor,
    }).setOrigin(0, 0.5);
    container.add(name);

    // Mini HP bar
    const hpBg = this.scene.add.graphics();
    hpBg.fillStyle(0x333333, 1);
    hpBg.fillRect(58, -3, 40, 5);
    container.add(hpBg);

    const hpFill = this.scene.add.graphics();
    container.add(hpFill);
    container.setData('hpFill', hpFill);
    container.setData('unit', enemy);
    container.setData('isHero', false);
    container.setData('lastRatio', -1);
    container.setData('lastAlive', true);
    container.setData('nameText', name);

    this.enemyPortraits.push(container);
    this.add(container);
  });
}
```

Key changes from current:
- Boss names in gold, elite in purple, normal in red
- Boss crown badge (♛) or elite star (★) at leftmost position
- Element dot for elemental enemies
- Name text stored for low-HP flash (consistent with hero portraits)

- [ ] **Step 2: Run verification**

```bash
npx tsc --noEmit && npm test
```

- [ ] **Step 3: Commit**

```bash
git add src/ui/BattleHUD.ts
git commit -m "feat: enemy portrait badges — boss crown, elite star, element dots, threat-colored names"
```

---

## Execution Order

Tasks 1→2 are sequential (HealthBar style → Unit passes style).
Task 3 is independent (BattleHUD badges don't depend on HealthBar changes).

**Recommended:**
- Serial: Task 1 → Task 2
- Parallel with Task 1: Task 3

## Final Verification

```bash
npx tsc --noEmit && npm test
```

Then visual verification (run `npm run dev`):

**Acceptance criteria:**
1. **Hero health bars** — thin blue border visible, green fill, 40×5px
2. **Normal enemy health bars** — red-tinted background, no border, 40×5px
3. **Elite enemy health bars** — purple border visible, slightly taller (40×6px)
4. **Boss health bars** — gold border (2px), wider (56×7px), visually dominant
5. **Enemy portraits in HUD** — boss name in gold with ♛, elite name in purple with ★, normal in red
6. **No regressions** — hero sprites, formation panel, codex all render correctly
