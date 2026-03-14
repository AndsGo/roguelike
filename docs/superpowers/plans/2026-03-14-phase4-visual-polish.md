# Phase 4: Visual Polish + Balance Implementation Plan (v1.15.0)

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve visual feedback (heal flash, idle desync, weapon clarity, status tooltips), text sharpness (TextFactory + full migration), and balance (cleric energy, human synergy, shadow strike).

**Architecture:** Features 1-7 are small independent changes. Feature 8 (TextFactory) creates shared infrastructure then migrates all 280 `scene.add.text()` calls across 35 files. TextFactory done first so Features 1-7 can use it for any new text they add.

**Tech Stack:** TypeScript + Phaser 3, Vitest for testing.

**Spec:** `docs/superpowers/specs/2026-03-14-phase4-visual-polish-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/ui/TextFactory.ts` | Create | Text preset factory with resolution:2 + LINEAR filter |
| `src/entities/Unit.ts` | Modify | Heal flash + status tooltip |
| `src/systems/UnitAnimationSystem.ts` | Modify | Idle phase offset |
| `src/data/pixel-templates.ts` | Modify | Mage/cleric weapon templates + colors |
| `src/systems/UltimateSystem.ts` | Modify | Cleric energy multiplier |
| `src/config/synergies.ts` | Modify | Human synergy 5→10 |
| `src/data/skills.json` | Modify | Shadow strike buff |
| `src/config/balance.ts` | Modify | +1 constant (CLERIC_ENERGY_MULTIPLIER) |
| `src/constants.ts` | Modify | Re-export new constant |
| `src/i18n.ts` | Modify | Status tooltip strings |
| 35 files | Modify | scene.add.text → TextFactory.create migration |
| `tests/ui/TextFactory.test.ts` | Create | TextFactory tests |
| `tests/data/phase4-balance.test.ts` | Create | Balance change tests |

---

## Chunk 1: TextFactory + Balance (Features 5-8 foundation)

### Task 1: Create TextFactory utility + tests

**Files:**
- Create: `src/ui/TextFactory.ts`
- Create: `tests/ui/TextFactory.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/ui/TextFactory.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { TextFactory } from '../../src/ui/TextFactory';
import { SceneTestHarness } from '../helpers/scene-harness';

describe('TextFactory', () => {
  it('creates text with resolution 2', () => {
    const scene = SceneTestHarness.createMinimalScene();
    const text = TextFactory.create(scene, 100, 50, 'test', 'body');
    expect(text).toBeDefined();
    expect(text.text).toBe('test');
    // resolution is set via setResolution(2)
    expect((text as any).resolution).toBe(2);
  });

  it('applies preset font sizes', () => {
    const scene = SceneTestHarness.createMinimalScene();
    const title = TextFactory.create(scene, 0, 0, 'T', 'title');
    const body = TextFactory.create(scene, 0, 0, 'T', 'body');
    const small = TextFactory.create(scene, 0, 0, 'T', 'small');
    expect(title.style.fontSize).toBe('20px');
    expect(body.style.fontSize).toBe('11px');
    expect(small.style.fontSize).toBe('9px');
  });

  it('allows style overrides', () => {
    const scene = SceneTestHarness.createMinimalScene();
    const text = TextFactory.create(scene, 0, 0, 'T', 'body', { color: '#ff0000' });
    expect(text.style.color).toBe('#ff0000');
  });

  it('defaults to body preset', () => {
    const scene = SceneTestHarness.createMinimalScene();
    const text = TextFactory.create(scene, 0, 0, 'T');
    expect(text.style.fontSize).toBe('11px');
  });
});
```

Note: `SceneTestHarness.createMinimalScene()` may not exist — check `tests/helpers/scene-harness.ts` for available helpers. If not available, create a minimal scene mock inline or use an existing scene class. The Phaser stub should support `scene.add.text()` returning an object with `.text`, `.style`, `.setResolution()`, `.texture.setFilter()`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/ui/TextFactory.test.ts`

- [ ] **Step 3: Create `src/ui/TextFactory.ts`**

```typescript
import Phaser from 'phaser';

export type TextPreset = 'title' | 'subtitle' | 'body' | 'label' | 'small' | 'tiny';

const PRESETS: Record<TextPreset, Phaser.Types.GameObjects.Text.TextStyle> = {
  title:    { fontSize: '20px', fontFamily: 'monospace', fontStyle: 'bold' },
  subtitle: { fontSize: '14px', fontFamily: 'monospace', fontStyle: 'bold' },
  body:     { fontSize: '11px', fontFamily: 'monospace' },
  label:    { fontSize: '10px', fontFamily: 'monospace' },
  small:    { fontSize: '9px',  fontFamily: 'monospace' },
  tiny:     { fontSize: '8px',  fontFamily: 'monospace' },
};

export class TextFactory {
  static create(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    preset: TextPreset = 'body',
    overrides?: Partial<Phaser.Types.GameObjects.Text.TextStyle>,
  ): Phaser.GameObjects.Text {
    const style = { ...PRESETS[preset], ...overrides };
    const textObj = scene.add.text(x, y, text, style);
    textObj.setResolution(2);
    textObj.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
    return textObj;
  }
}
```

Note: The Phaser stub may not support `texture.setFilter()`. If `textObj.texture.setFilter` throws in tests, wrap it in a try-catch or check `textObj.texture?.setFilter`. The test should still pass because it tests text content and style, not the filter.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/ui/TextFactory.test.ts`

- [ ] **Step 5: Run tsc**

Run: `npx tsc --noEmit`

- [ ] **Step 6: Commit**

```bash
git add src/ui/TextFactory.ts tests/ui/TextFactory.test.ts
git commit -m "feat: add TextFactory with resolution:2 and LINEAR filter for crisp text"
```

---

### Task 2: Balance changes (human synergy + shadow strike + cleric energy)

**Files:**
- Modify: `src/config/synergies.ts` — human synergy 5→10
- Modify: `src/data/skills.json` — shadow_strike buff
- Modify: `src/config/balance.ts` — add CLERIC_ENERGY_MULTIPLIER
- Modify: `src/constants.ts` — re-export
- Modify: `src/systems/UltimateSystem.ts` — cleric energy boost
- Create: `tests/data/phase4-balance.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/data/phase4-balance.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { SYNERGY_DEFINITIONS } from '../../src/config/synergies';
import skillsData from '../../src/data/skills.json';
import { CLERIC_ENERGY_MULTIPLIER } from '../../src/constants';

const skills = skillsData as { id: string; baseDamage: number; scalingRatio: number }[];

describe('Phase 4 Balance Changes', () => {
  it('human synergy 2-person threshold is +10 attack and defense', () => {
    const human = SYNERGY_DEFINITIONS.find(s => s.id === 'synergy_human')!;
    const t2 = human.thresholds.find(t => t.count === 2)!;
    const atkEffect = t2.effects.find((e: any) => e.stat === 'attack');
    const defEffect = t2.effects.find((e: any) => e.stat === 'defense');
    expect(atkEffect!.value).toBe(10);
    expect(defEffect!.value).toBe(10);
  });

  it('shadow_strike has buffed damage', () => {
    const ss = skills.find(s => s.id === 'shadow_strike')!;
    expect(ss.baseDamage).toBe(45);
    expect(ss.scalingRatio).toBe(1.0);
  });

  it('CLERIC_ENERGY_MULTIPLIER is 1.5', () => {
    expect(CLERIC_ENERGY_MULTIPLIER).toBe(1.5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/data/phase4-balance.test.ts`

- [ ] **Step 3: Apply balance changes**

**`src/config/synergies.ts`** — line 15, change human synergy 2-person threshold:
```typescript
// Change value: 5 → 10 for both attack and defense
{ count: 2, description: '全属性+10%', effects: [{ type: 'stat_boost', stat: 'attack', value: 10 }, { type: 'stat_boost', stat: 'defense', value: 10 }] },
```

**`src/data/skills.json`** — find `shadow_strike` entry, change:
- `"baseDamage": 30` → `"baseDamage": 45`
- `"scalingRatio": 0.7` → `"scalingRatio": 1.0`
- `"description": "快速连续攻击三次"` → `"description": "从暗影中发起致命一击，造成大量暗属性伤害"`

**`src/config/balance.ts`** — add after `MAP_HIDDEN_NODE_COST`:
```typescript
export const CLERIC_ENERGY_MULTIPLIER = 1.5;
```

**`src/constants.ts`** — add to re-export list:
```typescript
  CLERIC_ENERGY_MULTIPLIER,
```

**`src/systems/UltimateSystem.ts`** — add import at top:
```typescript
import heroesData from '../data/heroes.json';
import { CLERIC_ENERGY_MULTIPLIER } from '../constants';
```

In `update()` method, replace line 93:
```typescript
// Before:
this.addEnergy(heroId, PASSIVE_RATE * dt);

// After:
const hData = (heroesData as { id: string; class: string }[]).find(h => h.id === heroId);
const classMult = hData?.class === 'cleric' ? CLERIC_ENERGY_MULTIPLIER : 1.0;
this.addEnergy(heroId, PASSIVE_RATE * classMult * dt);
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/data/phase4-balance.test.ts`

- [ ] **Step 5: Run tsc**

Run: `npx tsc --noEmit`

- [ ] **Step 6: Commit**

```bash
git add src/config/synergies.ts src/data/skills.json src/config/balance.ts src/constants.ts src/systems/UltimateSystem.ts tests/data/phase4-balance.test.ts
git commit -m "feat: balance changes — human synergy +10%, shadow strike buff, cleric energy boost"
```

---

## Chunk 2: Visual Effects (Features 1-3)

### Task 3: Heal flash + idle phase offset

**Files:**
- Modify: `src/entities/Unit.ts` — add flashColor in heal()
- Modify: `src/systems/UnitAnimationSystem.ts` — add delay + onStart to playIdle

- [ ] **Step 1: Add heal flash**

In `src/entities/Unit.ts`, find the `heal()` method (line ~311). After `this.healthBar.updateHealth(...)` and before the EventBus emit, add:

```typescript
    if (actual > 0) {
      this.flashColor(0x44ff88, 120); // Green heal flash
      EventBus.getInstance().emit('unit:heal', {
        // ...existing emit...
```

- [ ] **Step 2: Add idle phase offset**

In `src/systems/UnitAnimationSystem.ts`, find `playIdle()` (line ~48). Replace the tween creation:

```typescript
  playIdle(unit: Unit): void {
    if (this.idleTweens.has(unit.unitId)) return;

    const randomDelay = Math.random() * 400;
    const tween = this.scene.tweens.add({
      targets: unit,
      y: unit.y - 3,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: randomDelay,
      onStart: () => {
        tween.updateTo('y', unit.y - 3, true);
      },
    });
    this.idleTweens.set(unit.unitId, tween);
  }
```

- [ ] **Step 3: Run tsc + tests**

Run: `npx tsc --noEmit && npx vitest run`

- [ ] **Step 4: Commit**

```bash
git add src/entities/Unit.ts src/systems/UnitAnimationSystem.ts
git commit -m "feat: add heal flash effect and idle animation phase offset"
```

---

### Task 4: Weapon template differentiation

**Files:**
- Modify: `src/data/pixel-templates.ts` — mage + cleric weapon templates and colors

- [ ] **Step 1: Update mage weapon template**

In `src/data/pixel-templates.ts`, find the `mage:` entry in `WEAPON_TEMPLATES` (line ~228). The current 9-row template has a 3×3 orb at cols 11-13. Replace with an enlarged 4×3 orb + staff:

```typescript
  mage: [
    // Enlarged orb + staff
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _,WG,WG, _, _, _],
    [_, _, _, _, _, _, _, _, _, _,WG,WG,WG,WG, _, _],
    [_, _, _, _, _, _, _, _, _, _, _,WG,WG, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _,W, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
  ],
```

- [ ] **Step 2: Update cleric weapon template**

Find the `cleric:` entry (line ~252). Replace with a wider 5×3 cross:

```typescript
  cleric: [
    // Wide cross/plus
    [_, _, _, _, _, _, _, _, _, _, _, _, _,WG, _, _],
    [_, _, _, _, _, _, _, _, _, _, _,WG,WG,WG,WG,WG],
    [_, _, _, _, _, _, _, _, _, _, _, _, _,WG, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _,WG, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
  ],
```

- [ ] **Step 3: Update weapon colors**

Find `WEAPON_COLORS` (line ~310). Change mage and cleric:

```typescript
  mage:     { base: 0x7744ff, glow: 0xaa88ff },   // Saturated purple-blue
  cleric:   { base: 0xffdd44, glow: 0xffff99 },   // Bright gold
```

- [ ] **Step 4: Run tsc**

Run: `npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git add src/data/pixel-templates.ts
git commit -m "feat: differentiate mage and cleric weapon templates"
```

---

## Chunk 3: Status Tooltips (Feature 4)

### Task 5: Add status effect click tooltips to Unit

**Files:**
- Modify: `src/entities/Unit.ts` — status tooltip panel
- Modify: `src/i18n.ts` — status effect name strings

- [ ] **Step 1: Add i18n strings**

In `src/i18n.ts`, find the `battle:` section. Add before its closing `}`:

```typescript
    statusDot: '灼烧',
    statusHot: '回复',
    statusStun: '眩晕',
    statusBuff: '增益',
    statusDebuff: '减益',
    statusSlow: '减速',
    statusTaunt: '嘲讽',
    statusPerSec: (v: number) => `${v}/秒`,
    statusRemaining: (s: number) => `${s.toFixed(1)}s`,
```

- [ ] **Step 2: Add tooltip to Unit.ts**

In `src/entities/Unit.ts`:

Add member:
```typescript
  private statusTooltip: Phaser.GameObjects.Container | null = null;
```

After `statusIcons` creation in the constructor (line ~134-139), make it interactive:
```typescript
    this.statusIcons.setInteractive({ useHandCursor: true });
    this.statusIcons.on('pointerup', () => this.toggleStatusTooltip());
```

Add methods:

```typescript
  private toggleStatusTooltip(): void {
    if (this.statusTooltip) {
      this.hideStatusTooltip();
    } else {
      this.showStatusTooltip();
    }
  }

  private showStatusTooltip(): void {
    if (this.statusEffects.length === 0) return;
    this.hideStatusTooltip();

    const container = this.scene.add.container(this.x + 30, this.y - this.spriteHeight / 2 - 10);
    container.setDepth(500);

    const lineHeight = 16;
    const padding = 6;
    const width = 130;
    const height = this.statusEffects.length * lineHeight + padding * 2;

    // Background
    const bg = this.scene.add.graphics();
    bg.fillStyle(Theme.colors.panel, 0.9);
    bg.fillRoundedRect(0, 0, width, height, 4);
    bg.lineStyle(1, Theme.colors.panelBorder, 0.8);
    bg.strokeRoundedRect(0, 0, width, height, 4);
    container.add(bg);

    // Effect names mapping
    const nameMap: Record<string, string> = {
      dot: UI.battle.statusDot,
      hot: UI.battle.statusHot,
      stun: UI.battle.statusStun,
      buff: UI.battle.statusBuff,
      debuff: UI.battle.statusDebuff,
      slow: UI.battle.statusSlow,
      taunt: UI.battle.statusTaunt,
    };

    const iconMap: Record<string, string> = {
      dot: '🔥', hot: '♥', stun: '✦', buff: '▲', debuff: '▼', slow: '❄', taunt: '⊕',
    };

    this.statusEffects.forEach((effect, i) => {
      const name = nameMap[effect.type] ?? effect.type;
      const icon = iconMap[effect.type] ?? '•';
      const remaining = Math.max(0, effect.duration / 1000);
      const valueStr = effect.value ? `${Math.abs(effect.value)}` : '';
      const line = `${icon} ${name}  ${valueStr}  ${remaining.toFixed(1)}s`;

      const text = this.scene.add.text(padding, padding + i * lineHeight, line, {
        fontSize: '9px',
        color: effect.type === 'buff' || effect.type === 'hot' ? '#88ff88' : '#ff8888',
        fontFamily: 'monospace',
      });
      container.add(text);
    });

    this.statusTooltip = container;
  }

  private hideStatusTooltip(): void {
    if (this.statusTooltip) {
      this.statusTooltip.destroy();
      this.statusTooltip = null;
    }
  }
```

In `updateStatusVisuals()`, add at the start:
```typescript
    // Auto-close tooltip when no effects remain
    if (this.statusEffects.length === 0) {
      this.hideStatusTooltip();
    }
```

In `destroy()`, add:
```typescript
    this.hideStatusTooltip();
```

Import `Theme` and `UI` at top if not already imported:
```typescript
import { Theme } from '../ui/Theme';
import { UI } from '../i18n';
```

- [ ] **Step 3: Run tsc + tests**

Run: `npx tsc --noEmit && npx vitest run`

- [ ] **Step 4: Commit**

```bash
git add src/entities/Unit.ts src/i18n.ts
git commit -m "feat: add status effect click tooltips"
```

---

## Chunk 4: TextFactory Migration (Feature 8)

The migration is mechanical: replace `this.add.text(x, y, text, { fontSize: '...', color: '...', fontFamily: 'monospace' })` with `TextFactory.create(this, x, y, text, preset, { color: '...' })`.

**Mapping rules:**
- `fontSize: '18-24px'` → preset `'title'`
- `fontSize: '14-16px'` → preset `'subtitle'`
- `fontSize: '11-12px'` → preset `'body'`
- `fontSize: '10px'` → preset `'label'`
- `fontSize: '9px'` → preset `'small'`
- `fontSize: '8px'` → preset `'tiny'`

**Pattern:**
```typescript
// Before:
this.add.text(x, y, text, { fontSize: '11px', color: '#aaa', fontFamily: 'monospace' })
// After:
TextFactory.create(this, x, y, text, 'body', { color: '#aaa' })
```

Keep chain calls like `.setOrigin(0.5)` — `TextFactory.create()` returns the Text object.

Add `import { TextFactory } from '../ui/TextFactory';` (or `'../../ui/TextFactory'` depending on depth) to each migrated file.

### Task 6: Migrate batch 1 — UI components

**Files:** `src/ui/Button.ts`, `src/ui/Panel.ts`, `src/ui/HeroCard.ts`, `src/components/HealthBar.ts`, `src/components/DamageNumber.ts` (~14 calls)

- [ ] **Step 1:** Read each file, identify all `this.add.text()` or `scene.add.text()` calls
- [ ] **Step 2:** Replace each with `TextFactory.create()` using the preset mapping. Add TextFactory import.
- [ ] **Step 3:** Run `npx tsc --noEmit && npx vitest run`
- [ ] **Step 4:** Commit: `git commit -m "refactor: migrate UI component text to TextFactory (batch 1/8)"`

### Task 7: Migrate batch 2 — Battle UI

**Files:** `src/ui/BattleHUD.ts`, `src/ui/SkillBar.ts`, `src/ui/UltimateBar.ts`, `src/systems/BattleEffects.ts`, `src/entities/Unit.ts` (~26 calls)

- [ ] **Step 1-4:** Same pattern as Task 6.
- [ ] **Commit:** `git commit -m "refactor: migrate battle UI text to TextFactory (batch 2/8)"`

### Task 8: Migrate batch 3 — Map/Shop

**Files:** `src/scenes/MapScene.ts`, `src/ui/MapRenderer.ts`, `src/scenes/ShopScene.ts`, `src/ui/NodeTooltip.ts` (~34 calls)

- [ ] **Step 1-4:** Same pattern.
- [ ] **Commit:** `git commit -m "refactor: migrate map/shop text to TextFactory (batch 3/8)"`

### Task 9: Migrate batch 4 — Main menu/Draft/Settings

**Files:** `src/scenes/MainMenuScene.ts`, `src/scenes/HeroDraftScene.ts`, `src/scenes/SettingsScene.ts`, `src/scenes/BootScene.ts` (~52 calls)

- [ ] **Step 1-4:** Same pattern.
- [ ] **Commit:** `git commit -m "refactor: migrate menu/draft/settings text to TextFactory (batch 4/8)"`

### Task 10: Migrate batch 5 — Event/Rest/Reward

**Files:** `src/scenes/EventScene.ts`, `src/scenes/RestScene.ts`, `src/scenes/RewardScene.ts`, `src/scenes/BaseEndScene.ts` (~36 calls)

- [ ] **Step 1-4:** Same pattern.
- [ ] **Commit:** `git commit -m "refactor: migrate event/rest/reward text to TextFactory (batch 5/8)"`

### Task 11: Migrate batch 6 — Popups/Panels

**Files:** `src/ui/HeroDetailPopup.ts`, `src/ui/CodexPanel.ts`, `src/ui/CodexDetailPopup.ts`, `src/ui/AchievementPanel.ts` (~44 calls)

- [ ] **Step 1-4:** Same pattern.
- [ ] **Commit:** `git commit -m "refactor: migrate popup/panel text to TextFactory (batch 6/8)"`

### Task 12: Migrate batch 7 — Overview panels

**Files:** `src/ui/HelpPanel.ts`, `src/ui/BuildReviewPanel.ts`, `src/ui/RunOverviewPanel.ts`, `src/ui/RunEndPanel.ts`, `src/ui/FormationPanel.ts` (~46 calls)

- [ ] **Step 1-4:** Same pattern.
- [ ] **Commit:** `git commit -m "refactor: migrate overview panel text to TextFactory (batch 7/8)"`

### Task 13: Migrate batch 8 — Systems/End scenes

**Files:** `src/systems/TutorialSystem.ts`, `src/scenes/GameOverScene.ts`, `src/scenes/VictoryScene.ts` (~28 calls)

- [ ] **Step 1-4:** Same pattern.
- [ ] **Commit:** `git commit -m "refactor: migrate system/end scene text to TextFactory (batch 8/8)"`

---

## Chunk 5: Finalization

### Task 14: Remove Theme.fonts + version bump

**Files:**
- Modify: `src/ui/Theme.ts` — remove unused `fonts` object (if no other references)
- Modify: `package.json` — version 1.14.0 → 1.15.0

- [ ] **Step 1:** Check if `Theme.fonts` is referenced anywhere. Run: `grep -r "Theme.fonts" src/`
- [ ] **Step 2:** If unused, remove the `fonts` property from Theme.ts
- [ ] **Step 3:** Bump version in `package.json`: `"version": "1.14.0"` → `"version": "1.15.0"`
- [ ] **Step 4:** Run `npx tsc --noEmit && npx vitest run` — full suite must pass
- [ ] **Step 5:** Commit:

```bash
git add src/ui/Theme.ts package.json
git commit -m "chore: remove unused Theme.fonts and bump version to v1.15.0"
```
