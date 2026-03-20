# Character UI Conservative Refactor Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor character UI for better identification, decision support, and visual consistency while preserving the compact 800×450 layout and battle visibility.

**Architecture:** Conservative "信息层级重组" approach — keep all component sizes, rearrange internal layouts, add role/element visual semantics, and enhance BattleHUD incrementally. No layout-breaking changes. All visuals built with Phaser Graphics primitives (no external assets).

**Tech Stack:** TypeScript, Phaser 3, pixel-art programmatic icons (8×8 Graphics)

---

## File Map

| File | Responsibility | Tasks |
|------|---------------|-------|
| `src/ui/Theme.ts` | Theme + color helpers (**single source of truth** for all colors) | Task 1 (update role/element color values) |
| `src/ui/PixelIcons.ts` | **NEW** — 8×8 programmatic role/element icons | Task 2 |
| `src/ui/HeroCard.ts` | Hero card display | Task 3 (three-layer reorg) |
| `src/ui/BattleHUD.ts` | Battle hero portraits | Task 4 (incremental enhancement) |
| `src/ui/HeroDetailPopup.ts` | Hero detail overlay | Task 5 (collapse-by-default stats) |
| `src/ui/FormationPanel.ts` | Formation editor | Task 6 (add recommendations) |
| `tests/ui/HeroCard.test.ts` | Card tests | Tasks 1-3 |
| `tests/ui/PixelIcons.test.ts` | **NEW** — Icon tests | Task 2 |

---

## Task 1: Unify Visual Color Semantics

**Context:** Currently HeroCard border uses equipment rarity color. The new spec separates: role colors for character identity, element colors for element system, rarity colors for items only.

**Files:**
- Modify: `src/ui/Theme.ts:101-137` (single source of truth for all colors)
- Modify: `src/ui/HeroCard.ts:29,60`

**Design decision (from review):** Theme.ts is the **single source of truth** for role/element/rarity colors. Do NOT add duplicate color constants to `visual.ts`. PixelIcons and all other consumers import colors via `getRoleColor()` / `getElementColor()` from Theme.ts.

- [ ] **Step 1: Verify and update Theme.ts color values**

In `src/ui/Theme.ts`, verify the `role` property inside `Theme.colors` has these values. Update if different:
```typescript
role: {
  tank: 0x4488cc,       // blue — frontline absorber
  melee_dps: 0xdd8833,  // orange — close-range damage
  ranged_dps: 0xcc4444, // red — ranged damage
  healer: 0x44aa44,     // green — restoration
  support: 0xccaa33,    // yellow — utility
} as Record<string, number>,
```

Also add a doc comment above to clarify semantic usage:
```typescript
/** Role colors: ONLY for character positioning identity. Never for items/rarity. */
```

- [ ] **Step 3: Change HeroCard border from rarity to role color**

In `src/ui/HeroCard.ts`, change line 29:

```typescript
// BEFORE:
const rarityColor = this.getRarityBorderColor();

// AFTER:
import { getRoleColor } from './Theme';
const borderColor = getRoleColor(heroData.role);
```

And line 35-36:
```typescript
// BEFORE:
this.bg.lineStyle(2, rarityColor, 1);
this.bg.strokeRoundedRect(...)

// AFTER:
this.bg.lineStyle(2, borderColor, 1);
this.bg.strokeRoundedRect(...)
```

Remove the `getRarityBorderColor()` private method if it's no longer used elsewhere.

- [ ] **Step 4: Run verification**

```bash
npx tsc --noEmit && npm test
```

- [ ] **Step 5: Commit**

```bash
git add src/ui/Theme.ts src/ui/HeroCard.ts
git commit -m "refactor: unify color semantics — role colors for identity, rarity for items only"
```

---

## Task 2: Create Programmatic 8×8 Pixel Icons

**Context:** Need role icons (shield/sword/bow/cross/star) and element icons (flame/snowflake/bolt/moon/sun) as 8×8 pixel Graphics, matching the chibi art style.

**Files:**
- Create: `src/ui/PixelIcons.ts`
- Create: `tests/ui/PixelIcons.test.ts`

- [ ] **Step 1: Write test for icon generation**

Create `tests/ui/PixelIcons.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  ROLE_ICON_TEMPLATES, ELEMENT_ICON_TEMPLATES,
  drawRoleIcon, drawElementIcon,
} from '../../src/ui/PixelIcons';

// All valid business keys that must have templates
const ROLE_KEYS = ['tank', 'melee_dps', 'ranged_dps', 'healer', 'support'];
const ELEMENT_KEYS = ['fire', 'ice', 'lightning', 'dark', 'holy'];

describe('PixelIcons', () => {
  it('has templates for all 5 roles matching UnitRole enum', () => {
    for (const role of ROLE_KEYS) {
      expect(ROLE_ICON_TEMPLATES).toHaveProperty(role);
    }
  });

  it('has templates for all 5 elements matching ElementType enum', () => {
    for (const el of ELEMENT_KEYS) {
      expect(ELEMENT_ICON_TEMPLATES).toHaveProperty(el);
    }
  });

  it('each template is an 8×8 grid with valid values (0, 1, or 2)', () => {
    for (const [key, t] of Object.entries(ROLE_ICON_TEMPLATES)) {
      expect(t.length, `${key} should have 8 rows`).toBe(8);
      for (const row of t) {
        expect(row.length, `${key} row should have 8 cols`).toBe(8);
        for (const val of row) expect([0, 1, 2]).toContain(val);
      }
    }
    for (const [key, t] of Object.entries(ELEMENT_ICON_TEMPLATES)) {
      expect(t.length, `${key} should have 8 rows`).toBe(8);
      for (const row of t) {
        expect(row.length, `${key} row should have 8 cols`).toBe(8);
        for (const val of row) expect([0, 1, 2]).toContain(val);
      }
    }
  });

  it('drawRoleIcon does not throw for unknown role key', () => {
    const mockG = { fillStyle: () => {}, fillRect: () => {} } as any;
    expect(() => drawRoleIcon(mockG, 0, 0, 'nonexistent_role')).not.toThrow();
  });

  it('drawElementIcon does not throw for unknown element key', () => {
    const mockG = { fillStyle: () => {}, fillRect: () => {} } as any;
    expect(() => drawElementIcon(mockG, 0, 0, 'nonexistent_element')).not.toThrow();
  });

  it('drawRoleIcon calls fillRect for scale=2', () => {
    let fillCount = 0;
    const mockG = { fillStyle: () => {}, fillRect: () => { fillCount++; } } as any;
    drawRoleIcon(mockG, 0, 0, 'tank', 2);
    expect(fillCount).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

```bash
npm test -- tests/ui/PixelIcons.test.ts
```

- [ ] **Step 3: Implement PixelIcons.ts**

Create `src/ui/PixelIcons.ts`:

```typescript
import Phaser from 'phaser';
import { getRoleColor, getElementColor } from './Theme';

/**
 * 8×8 pixel icon templates for roles and elements.
 * 0 = transparent, 1 = primary fill, 2 = highlight/accent
 */

// Role icons: shield, blade, bow, cross, star
export const ROLE_ICON_TEMPLATES: Record<string, number[][]> = {
  tank: [ // Shield
    [0,0,1,1,1,1,0,0],
    [0,1,1,1,1,1,1,0],
    [1,1,1,2,2,1,1,1],
    [1,1,1,2,2,1,1,1],
    [1,1,1,1,1,1,1,1],
    [0,1,1,1,1,1,1,0],
    [0,0,1,1,1,1,0,0],
    [0,0,0,1,1,0,0,0],
  ],
  melee_dps: [ // Sword
    [0,0,0,0,0,0,1,2],
    [0,0,0,0,0,1,2,0],
    [0,0,0,0,1,2,0,0],
    [0,0,0,1,2,0,0,0],
    [0,1,1,2,0,0,0,0],
    [1,1,2,0,0,0,0,0],
    [0,1,0,0,0,0,0,0],
    [1,0,0,0,0,0,0,0],
  ],
  ranged_dps: [ // Bow
    [0,0,1,1,0,0,0,0],
    [0,1,0,0,1,0,0,0],
    [1,0,0,0,0,1,2,2],
    [1,0,0,0,0,1,2,2],
    [1,0,0,0,0,1,2,2],
    [0,1,0,0,1,0,0,0],
    [0,0,1,1,0,0,0,0],
    [0,0,0,0,0,0,0,0],
  ],
  healer: [ // Cross
    [0,0,0,1,1,0,0,0],
    [0,0,0,1,1,0,0,0],
    [0,0,0,1,1,0,0,0],
    [1,1,1,2,2,1,1,1],
    [1,1,1,2,2,1,1,1],
    [0,0,0,1,1,0,0,0],
    [0,0,0,1,1,0,0,0],
    [0,0,0,1,1,0,0,0],
  ],
  support: [ // Star
    [0,0,0,1,0,0,0,0],
    [0,0,1,2,1,0,0,0],
    [1,1,1,2,1,1,1,0],
    [0,0,1,2,1,0,0,0],
    [0,1,2,1,2,1,0,0],
    [1,2,0,0,0,2,1,0],
    [1,0,0,0,0,0,1,0],
    [0,0,0,0,0,0,0,0],
  ],
};

// Element icons: flame, snowflake, bolt, crescent, sun
export const ELEMENT_ICON_TEMPLATES: Record<string, number[][]> = {
  fire: [ // Flame
    [0,0,0,1,0,0,0,0],
    [0,0,1,2,1,0,0,0],
    [0,0,1,2,1,0,0,0],
    [0,1,2,2,2,1,0,0],
    [0,1,2,1,2,1,0,0],
    [1,2,1,1,1,2,1,0],
    [1,2,2,2,2,2,1,0],
    [0,1,1,1,1,1,0,0],
  ],
  ice: [ // Snowflake
    [0,0,0,1,0,0,0,0],
    [1,0,0,1,0,0,1,0],
    [0,1,0,1,0,1,0,0],
    [0,0,1,2,1,0,0,0],
    [1,1,2,2,2,1,1,0],
    [0,0,1,2,1,0,0,0],
    [0,1,0,1,0,1,0,0],
    [1,0,0,1,0,0,1,0],
  ],
  lightning: [ // Bolt
    [0,0,0,1,1,0,0,0],
    [0,0,1,1,0,0,0,0],
    [0,1,2,0,0,0,0,0],
    [1,2,2,2,2,0,0,0],
    [0,0,0,2,1,0,0,0],
    [0,0,1,1,0,0,0,0],
    [0,1,1,0,0,0,0,0],
    [1,1,0,0,0,0,0,0],
  ],
  dark: [ // Crescent moon
    [0,0,1,1,1,0,0,0],
    [0,1,2,0,0,1,0,0],
    [1,2,0,0,0,0,0,0],
    [1,2,0,0,0,0,0,0],
    [1,2,0,0,0,0,0,0],
    [0,1,2,0,0,1,0,0],
    [0,0,1,1,1,0,0,0],
    [0,0,0,0,0,0,0,0],
  ],
  holy: [ // Sun
    [0,0,0,1,0,0,0,0],
    [0,1,0,1,0,1,0,0],
    [0,0,1,1,1,0,0,0],
    [1,1,1,2,1,1,1,0],
    [0,0,1,1,1,0,0,0],
    [0,1,0,1,0,1,0,0],
    [0,0,0,1,0,0,0,0],
    [0,0,0,0,0,0,0,0],
  ],
};

/**
 * Render an 8×8 pixel icon onto a Graphics object.
 * @param g - Phaser Graphics to draw on
 * @param x - top-left x position
 * @param y - top-left y position
 * @param template - 8×8 grid (0=transparent, 1=fill, 2=highlight)
 * @param fillColor - primary fill color
 * @param highlightColor - accent/highlight color (defaults to white)
 * @param scale - pixel scale (default 1 = 8×8px total, 2 = 16×16px)
 */
export function drawPixelIcon(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number,
  template: number[][],
  fillColor: number,
  highlightColor: number = 0xffffff,
  scale: number = 1,
): void {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const val = template[row][col];
      if (val === 0) continue;
      const color = val === 1 ? fillColor : highlightColor;
      g.fillStyle(color, 1);
      g.fillRect(x + col * scale, y + row * scale, scale, scale);
    }
  }
}

/**
 * Draw a role icon at the given position.
 */
export function drawRoleIcon(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number,
  role: string,
  scale: number = 1,
): void {
  const template = ROLE_ICON_TEMPLATES[role];
  if (!template) return;
  const color = getRoleColor(role);
  drawPixelIcon(g, x, y, template, color, 0xffffff, scale);
}

/**
 * Draw an element icon at the given position.
 */
export function drawElementIcon(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number,
  element: string,
  scale: number = 1,
): void {
  const template = ELEMENT_ICON_TEMPLATES[element];
  if (!template) return;
  const color = getElementColor(element);
  drawPixelIcon(g, x, y, template, color, 0xffffff, scale);
}
```

- [ ] **Step 4: Run tests**

```bash
npm test -- tests/ui/PixelIcons.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/ui/PixelIcons.ts tests/ui/PixelIcons.test.ts
git commit -m "feat: add 8×8 programmatic pixel icons for roles and elements"
```

---

## Task 3: Reorganize HeroCard into Three-Layer Layout

**Context:** Current HeroCard (130×160) mixes identity, stats, and equipment without clear hierarchy. Reorganize into: identity layer (top ~46px), status layer (mid ~44px), summary layer (bottom ~30px). Keep same dimensions.

**Files:**
- Modify: `src/ui/HeroCard.ts:18-175`

- [ ] **Step 1: Refactor HeroCard constructor layout**

Rewrite the constructor's content creation (after background drawing) to follow three-layer structure. The key changes:

**Top identity layer (y: -80 to -34):**
- Role icon (8×8 pixel, scale=2 → 16×16) at top-left corner (-50, -68)
- Element icon (8×8 pixel, scale=2 → 16×16) at top-right corner (+34, -68)
- Chibi sprite centered (using `getOrCreateTexture` from UnitRenderer)
- Remove the old 32×32 solid color rectangle role placeholder

**Mid status layer (y: -34 to +10):**
- Hero name (body size, white, centered)
- Level text (small, secondary color)
- HP bar (100×6, same as current)
- Role tag text below HP (tiny, role-colored): e.g. "坦克", "输出", "治疗"

**Bottom summary layer (y: +10 to +80):**
- Attack value with ⚔ prefix (small, left-aligned at x=-40)
- Defense value with 🛡 prefix (small, right-aligned at x=+10)
- 3 equipment slot indicators (same as current, shifted down)

Import `drawRoleIcon, drawElementIcon` from `./PixelIcons` and `getOrCreateTexture, ChibiConfig` from `../systems/UnitRenderer`.

Note: The chibi sprite for the card needs a `ChibiConfig` built from heroData. **All fields are required** — see `UnitRenderer.ts:20-28` and `FormationPanel.ts:117-124` for reference. Use this pattern:
```typescript
import { getOrCreateTexture, ChibiConfig } from '../systems/UnitRenderer';
import { getRoleColor } from './Theme';

const chibiConfig: ChibiConfig = {
  role: heroData.role as ChibiConfig['role'],
  race: (heroData.race ?? 'human') as ChibiConfig['race'],
  classType: (heroData.class ?? 'warrior') as ChibiConfig['classType'],
  fillColor: getRoleColor(heroData.role),  // NOTE: 以视觉验证为准，如果职业色填充导致信息重复（边框+徽记+sprite都是同色），可改为中性色 0x8899aa
  borderColor: 0x000000,
  isHero: true,
  isBoss: false,
};
const textureKey = getOrCreateTexture(scene, chibiConfig);
const sprite = scene.add.image(0, -50, textureKey).setScale(1.5);
this.add(sprite);
```

- [ ] **Step 2: Add role tag i18n labels**

In `src/i18n.ts`, add to the UI object if not present:
```typescript
roleTag: {
  tank: '坦克',
  melee_dps: '近战',
  ranged_dps: '远程',
  healer: '治疗',
  support: '辅助',
},
```

- [ ] **Step 3: Run verification**

```bash
npx tsc --noEmit && npm test
```

- [ ] **Step 4: (Optional) Visual verification — run `npm run dev` and check in browser**

Start dev server, navigate to HeroDraftScene, take screenshot, verify card layout.

- [ ] **Step 5: Commit**

```bash
git add src/ui/HeroCard.ts src/ui/PixelIcons.ts src/i18n.ts
git commit -m "refactor: HeroCard three-layer layout with pixel role/element icons"
```

---

## Task 4: BattleHUD Incremental Enhancement

**Context:** Current hero portraits are minimal (12×12 color box + name + 40×5 HP bar). Add role identity and status signals without expanding the portrait size.

**Files:**
- Modify: `src/ui/BattleHUD.ts:110-144` (createHeroPortraits)
- Modify: `src/ui/BattleHUD.ts` (update method)

- [ ] **Step 1: Enhance createHeroPortraits with role color and element dot**

In `src/ui/BattleHUD.ts`, modify `createHeroPortraits()` (~line 110):

```typescript
private createHeroPortraits(): void {
  this.heroes.forEach((hero, i) => {
    const container = this.scene.add.container(8, 32 + i * 22);

    // Role color bar (left edge, 3px wide)
    const roleBar = this.scene.add.graphics();
    const roleColor = getRoleColor(hero.role);
    roleBar.fillStyle(roleColor, 1);
    roleBar.fillRect(0, -6, 3, 12);
    container.add(roleBar);

    // Element dot (if hero has element)
    if (hero.element) {
      const elDot = this.scene.add.graphics();
      elDot.fillStyle(getElementColor(hero.element), 1);
      elDot.fillCircle(8, 0, 3);
      container.add(elDot);
    }

    // Name (shifted right to accommodate role bar + element dot)
    const name = TextFactory.create(this.scene, 14, 0, hero.unitName.substring(0, 6), 'small', {
      color: '#ffffff',
    }).setOrigin(0, 0.5);
    container.add(name);

    // Mini HP bar (same position)
    const hpBg = this.scene.add.graphics();
    hpBg.fillStyle(0x333333, 1);
    hpBg.fillRect(60, -3, 40, 5);
    container.add(hpBg);

    const hpFill = this.scene.add.graphics();
    container.add(hpFill);

    container.setData('hpFill', hpFill);
    container.setData('unit', hero);
    container.setData('isHero', true);
    container.setData('lastRatio', -1);
    container.setData('lastAlive', true);
    container.setData('nameText', name);

    this.heroPortraits.push(container);
    this.add(container);
  });
}
```

- [ ] **Step 2: Add low-HP flash effect using Phaser Tween (scene-driven, not Date.now)**

**Design decision (from review):** Do NOT use `Date.now()` — it would flash during pause/slow-mo and cause test instability. Use scene-driven tween instead.

In `createHeroPortraits()`, after storing `nameText` in container data, set up a tween that activates when HP is low:

```typescript
// Low HP tween (created once, controlled by update)
const flashTween = this.scene.tweens.add({
  targets: name,
  alpha: { from: 1, to: 0.3 },
  duration: 400,
  yoyo: true,
  repeat: -1,
  paused: true, // starts paused, activated in update when HP < 20%
});
container.setData('flashTween', flashTween);
```

Then in the update loop, after HP bar redraw:
```typescript
const flashTween = container.getData('flashTween') as Phaser.Tweens.Tween;
const nameText = container.getData('nameText') as Phaser.GameObjects.Text;
if (ratio < 0.2 && alive) {
  nameText.setColor('#ff4444');
  if (flashTween && !flashTween.isPlaying()) flashTween.resume();
} else {
  nameText.setColor('#ffffff');
  nameText.setAlpha(1);
  if (flashTween && flashTween.isPlaying()) flashTween.pause();
}
```

- [ ] **Step 3: Add stun status indicator (only stun, no shield — shieldHp is private)**

**Design decision (from review):** Only detect `stun` from the public `statusEffects` array. Do NOT access `shieldHp` (it's a private field). Shield and silence indicators deferred to P2 after adding proper public getters.

After HP bar update:
```typescript
// Status indicator — only stun (public field statusEffects)
const unit = container.getData('unit') as Unit;
let statusIcon = container.getData('statusIcon') as Phaser.GameObjects.Text | null;
const hasStun = (unit.statusEffects ?? []).some(e => e.type === 'stun');

if (hasStun && !statusIcon) {
  statusIcon = TextFactory.create(this.scene, 104, 0, '!', 'tiny', {
    color: '#ff4444', fontStyle: 'bold',
  }).setOrigin(0.5);
  container.add(statusIcon);
  container.setData('statusIcon', statusIcon);
} else if (!hasStun && statusIcon) {
  statusIcon.destroy();
  container.setData('statusIcon', null);
}
```

- [ ] **Step 4: Run verification**

```bash
npx tsc --noEmit && npm test
```

- [ ] **Step 5: Commit**

```bash
git add src/ui/BattleHUD.ts
git commit -m "feat: BattleHUD incremental enhancement — role bars, element dots, low-HP flash"
```

---

## Task 5: HeroDetailPopup — Default-Collapsed Stats

**Context:** Currently all stat breakdowns (base + equipment + synergy + event) are always visible, creating visual noise. Change to show only final values by default, with click/tap to toggle source breakdown.

**Design decision (from review):** Use **click/tap toggle** as primary interaction, NOT hover. Hover does not work on mobile/touch browsers. The toggle pattern is consistent with the project's pointerup convention.

**Files:**
- Modify: `src/ui/HeroDetailPopup.ts`

- [ ] **Step 1: Refactor stat display to show final value only, click to toggle breakdown**

Find the stat grid section in HeroDetailPopup. Change from always-expanded:
```
攻击 50 (+10装备 +5羁绊)
```

To default-collapsed with click-to-expand:
```
▸ 攻击  65          ← default (click to expand)
▾ 攻击  65          ← expanded
   基础50 / 装备+10 / 羁绊+5
```

Implementation:
```typescript
// For each stat:
const finalValue = base + equipBonus + synergyBonus + eventBonus;
const statRow = scene.add.container(statX, statY);

const hasBonuses = equipBonus !== 0 || synergyBonus !== 0 || eventBonus !== 0;
const prefix = hasBonuses ? '▸ ' : '  ';

const valueText = TextFactory.create(scene, 0, 0,
  `${prefix}${STAT_LABELS[key]} ${formatStat(key, finalValue)}`, 'small', {
  color: '#ffffff',
}).setOrigin(0, 0.5);
statRow.add(valueText);

if (hasBonuses) {
  // Click/tap to toggle breakdown (not hover — must work on touch)
  const hitZone = scene.add.rectangle(60, 0, 120, 14, 0x000000, 0)
    .setInteractive({ useHandCursor: true });
  statRow.add(hitZone);

  let breakdown: Phaser.GameObjects.Text | null = null;
  let expanded = false;

  // Interaction rule: **only one stat expanded at a time** (accordion mode).
  // When clicking a new stat, collapse any previously expanded stat first.
  // Store the currently expanded statRow reference on the parent container.
  hitZone.on('pointerup', () => {
    // Collapse previously expanded row (accordion — only one open at a time)
    const prevRow = this.getData('expandedStatRow') as Phaser.GameObjects.Container | null;
    if (prevRow && prevRow !== statRow) {
      prevRow.emit('collapse');
    }

    if (expanded && breakdown) {
      breakdown.destroy();
      breakdown = null;
      valueText.setText(`▸ ${STAT_LABELS[key]} ${formatStat(key, finalValue)}`);
      expanded = false;
      this.setData('expandedStatRow', null);
    } else {
      const parts: string[] = [`基础${base}`];
      if (equipBonus) parts.push(`装备+${equipBonus}`);
      if (synergyBonus) parts.push(`羁绊+${synergyBonus}`);
      if (eventBonus) parts.push(`事件+${eventBonus}`);
      breakdown = TextFactory.create(scene, 12, 10, parts.join(' / '), 'tiny', {
        color: '#aaaaaa',
      }).setOrigin(0, 0);
      statRow.add(breakdown);
      valueText.setText(`▾ ${STAT_LABELS[key]} ${formatStat(key, finalValue)}`);
      expanded = true;
      this.setData('expandedStatRow', statRow);
    }
  });

  // Allow external collapse (for accordion behavior)
  statRow.on('collapse', () => {
    if (expanded && breakdown) {
      breakdown.destroy();
      breakdown = null;
      valueText.setText(`▸ ${STAT_LABELS[key]} ${formatStat(key, finalValue)}`);
      expanded = false;
    }
  });
}
```

- [ ] **Step 2: Run verification**

```bash
npx tsc --noEmit && npm test
```

- [ ] **Step 3: (Optional) Visual verification — run `npm run dev`, open hero detail popup, verify stats collapsed by default, click to expand**

- [ ] **Step 4: Commit**

```bash
git add src/ui/HeroDetailPopup.ts
git commit -m "refactor: HeroDetailPopup stats collapsed by default, hover to expand breakdown"
```

---

## Task 6: FormationPanel — Add Recommendations and Risk Warnings

**Context:** Current FormationPanel lets players swap front/back but doesn't explain formation value. Add role-based recommended position tags and risk warnings.

**Files:**
- Modify: `src/ui/FormationPanel.ts`
- Modify: `src/i18n.ts` (add formation tips)

- [ ] **Step 1: Add formation recommendation logic**

Add helper function in FormationPanel:

```typescript
private getRecommendedPosition(role: string): 'front' | 'back' {
  return (role === 'tank' || role === 'melee_dps') ? 'front' : 'back';
}

private getFormationWarnings(heroes: HeroState[]): string[] {
  const rm = RunManager.getInstance();
  const warnings: string[] = [];

  const frontCount = heroes.filter(h => rm.getHeroFormation(h.id) === 'front').length;
  const backCount = heroes.filter(h => rm.getHeroFormation(h.id) === 'back').length;

  if (frontCount === 0) warnings.push(UI.formation.noFrontWarning);

  // Check if healer is in front row
  for (const h of heroes) {
    const data = rm.getHeroData(h.id);
    if (data.role === 'healer' && rm.getHeroFormation(h.id) === 'front') {
      warnings.push(UI.formation.healerFrontWarning);
      break;
    }
  }

  return warnings;
}
```

- [ ] **Step 2: Add recommended position tag next to each hero**

After each hero's name in the formation columns, add a small colored tag:

```typescript
// After hero name text:
const recommended = this.getRecommendedPosition(data.role);
const current = rm.getHeroFormation(state.id);
if (recommended !== current) {
  const warnTag = TextFactory.create(scene, nameX, nameY + 10,
    `推荐:${recommended === 'front' ? '前排' : '后排'}`, 'tiny', {
    color: '#ffaa44',
  }).setOrigin(0.5);
  this.objects.push(warnTag);
}
```

- [ ] **Step 3: Add warning text area in center of panel**

Between the two columns, show formation warnings:

```typescript
const warnings = this.getFormationWarnings(heroStates);
warnings.forEach((warn, i) => {
  const warnText = TextFactory.create(scene, GAME_WIDTH / 2, panelY + PANEL_H - 50 - i * 14,
    warn, 'tiny', { color: '#ff8844' }).setOrigin(0.5);
  this.objects.push(warnText);
});
```

- [ ] **Step 4: Add i18n strings**

In `src/i18n.ts`, add:
```typescript
formation: {
  noFrontWarning: '⚠ 前排无人，后排英雄将直接承伤',
  healerFrontWarning: '⚠ 治疗在前排，生存风险高',
  recommended: '推荐',
  front: '前排',
  back: '后排',
},
```

- [ ] **Step 5: Run verification**

```bash
npx tsc --noEmit && npm test
```

- [ ] **Step 6: Commit**

```bash
git add src/ui/FormationPanel.ts src/i18n.ts
git commit -m "feat: FormationPanel adds role-based recommendations and risk warnings"
```

---

## Execution Order

Tasks 1→2→3 must be sequential (color constants → icons → card uses both).
Task 4 (BattleHUD) is independent after Task 1.
Task 5 (DetailPopup) is independent.
Task 6 (FormationPanel) is independent.

**Recommended execution:**
- Serial: Task 1 → Task 2 → Task 3
- After Task 1 completes: Task 4, Task 5, Task 6 can run in parallel

## Final Verification

After all tasks:

```bash
npx tsc --noEmit && npm test
```

Then optional visual verification (run `npm run dev` and check in browser).

**Concrete acceptance criteria:**
1. **HeroDraftScene** — each HeroCard fits within 130×160, chibi sprite visible, role/element icons in corners, no text overflow
2. **BattleScene** — hero portraits: role color bar (3px) visible on left edge, element dot visible, name flashes red when HP < 20%, total portrait width ≤ 110px (no overlap with battle area)
3. **HeroDetailPopup** — stats show final values by default (no breakdown visible), clicking one stat expands it, clicking another auto-collapses the previous (accordion), expanded breakdown text does NOT overlap the stat row below it
4. **FormationPanel** — warning text visible when healer is in front row, warning area does not overlap close/auto-assign buttons
5. **BattleHUD low-HP tween** — pauses when battle is paused (scene.time driven, not wall-clock)

Expected: Zero TS errors, all tests pass.
