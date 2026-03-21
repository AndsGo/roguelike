# Hero/Monster Visual Differentiation — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make heroes and monsters visually distinct through silhouette differentiation — enhanced hero race heads, separated hero role bodies, monster-specific body/head templates by archetype, and explicit `monsterType` data field.

**Architecture:** The existing 16×20 pixel grid compositing system (`pixel-templates.ts` → `UnitRenderer.ts`) is extended, not replaced. Heroes continue using `HEAD_TEMPLATES[race]` + `BODY_TEMPLATES[role]` + `WEAPON_TEMPLATES[class]`. Monsters get new `MONSTER_HEAD_TEMPLATES[monsterType]` + `MONSTER_BODY_TEMPLATES[monsterType]` keyed by a new `monsterType` field on `EnemyData`. `UnitRenderer.compositePixelGrid()` is modified to branch: heroes use existing pipeline, enemies use monster templates when `monsterType` is present, falling back to hero templates otherwise. `compositePixelGrid` is exported for direct testability.

**Tech Stack:** TypeScript, Phaser 3, 16×20 pixel grid compositing

**Scope clarifications (from review):**
- **Posture/stance:** Phase 1 achieves posture through pixel distribution within the fixed 16×20 grid (e.g., beast pixels cluster lower-left = forward-leaning). True offset/rotation posture is deferred to Phase 2.
- **Caster sub-variants:** Phase 1 uses one shared caster template. If `light_sprite` doesn't look "ethereal enough" after visual review, a `caster_spirit` sub-variant will be added as a follow-up.
- **Draconic:** Phase 1 only — Boss special-case template, not a general-purpose archetype.
- **Goblin → beast:** This is a visual experiment. After Phase 1 implementation, goblin gets a dedicated visual review to decide if it should stay `beast` or move to `humanoid`.

---

## File Map

| File | Responsibility | Tasks |
|------|---------------|-------|
| `src/data/pixel-templates.ts` | Pixel template data | Tasks 1, 2, 3, 4, 5 |
| `src/data/enemies.json` | Enemy data (28 enemies) | Task 6 |
| `src/types/index.ts` | Type definitions | Task 6 |
| `src/systems/UnitRenderer.ts` | Texture compositing | Task 7 |
| `src/entities/Unit.ts` | Unit entity | Task 7 |
| `tests/data/pixel-templates.test.ts` | **NEW** — Template integrity tests | Tasks 1-5 |
| `tests/systems/UnitRenderer.test.ts` | Renderer tests | Task 7 |

---

## Task 1: Enhance Hero Race HEAD_TEMPLATES

**Context:** Current race heads have minimal distinguishing marks. Human has zero markers (1/5 distinctiveness). Elf ears are only 2 pixels. All heads are essentially the same round shape with tiny accent differences.

**Files:**
- Modify: `src/data/pixel-templates.ts:107-174`
- Create: `tests/data/pixel-templates.test.ts`

- [ ] **Step 1: Write template integrity test**

Create `tests/data/pixel-templates.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  HEAD_TEMPLATES, BODY_TEMPLATES, WEAPON_TEMPLATES,
  GRID_W, GRID_H,
} from '../../src/data/pixel-templates';
import { RaceType } from '../../src/types';

describe('pixel-templates integrity', () => {
  it('all HEAD_TEMPLATES are 16×8 grids', () => {
    for (const [race, template] of Object.entries(HEAD_TEMPLATES)) {
      expect(template.length, `${race} head should have 8 rows`).toBe(8);
      for (const row of template) {
        expect(row.length, `${race} head row should have 16 cols`).toBe(GRID_W);
      }
    }
  });

  it('all BODY_TEMPLATES are 16×9 grids', () => {
    for (const [role, template] of Object.entries(BODY_TEMPLATES)) {
      expect(template.length, `${role} body should have 9 rows`).toBe(9);
      for (const row of template) {
        expect(row.length, `${role} body row should have 16 cols`).toBe(GRID_W);
      }
    }
  });

  it('all WEAPON_TEMPLATES are 16×9 grids', () => {
    for (const [cls, template] of Object.entries(WEAPON_TEMPLATES)) {
      expect(template.length, `${cls} weapon should have 9 rows`).toBe(9);
      for (const row of template) {
        expect(row.length, `${cls} weapon row should have 16 cols`).toBe(GRID_W);
      }
    }
  });

  it('any two race heads differ by at least 10 pixels', () => {
    const races = Object.keys(HEAD_TEMPLATES);
    for (let i = 0; i < races.length; i++) {
      for (let j = i + 1; j < races.length; j++) {
        const a = HEAD_TEMPLATES[races[i] as RaceType];
        const b = HEAD_TEMPLATES[races[j] as RaceType];
        let diff = 0;
        for (let r = 0; r < a.length; r++) {
          for (let c = 0; c < a[r].length; c++) {
            if (a[r][c] !== b[r][c]) diff++;
          }
        }
        expect(diff, `${races[i]} vs ${races[j]} should differ by >=10 pixels`).toBeGreaterThanOrEqual(10);
      }
    }
  });
});
```

- [ ] **Step 2: Run test to verify current state**

```bash
npm test -- tests/data/pixel-templates.test.ts
```
Expected: Grid size tests PASS. Human distinctiveness test may FAIL (human row 0 has 6 pixels currently — might pass, will verify).

- [ ] **Step 3: Enhance HEAD_TEMPLATES**

Replace all 6 head templates in `src/data/pixel-templates.ts:107-174`. Key changes per race:

**Human** — Add short hair silhouette (wider top rows):
```typescript
human: [
  [_, _, _, _, O, O, O, O, O, O, O, O, _, _, _, _],  // wider top = hair
  [_, _, _, O, SK, O,SK,SK,SK,SK, O,SK, O, _, _, _],  // hair parting
  [_, _, _, O, SK,SK,SK,SK,SK,SK,SK,SK, O, _, _, _],
  [_, _, _, O, SK,SK,SK,SK,SK,SK,SK,SK, O, _, _, _],
  [_, _, _, O, SK,SK,SK,SK,SK,SK,SK,SK, O, _, _, _],
  [_, _, _, O, SK,SD,SK,SK,SK,SK,SD,SK, O, _, _, _],
  [_, _, _, _, O, SK,SK,SK,SK,SK,SK, O, _, _, _, _],
  [_, _, _, _, _, O, O, O, O, O, O, _, _, _, _, _],
],
```

**Elf** — Larger pointed ears (2px → 4px with full ear shape):
```typescript
elf: [
  [_, _, _, _, _, O, O, O, O, O, O, _, _, _, _, _],
  [_, _, _, _, O, SK,SK,SK,SK,SK,SK, O, _, _, _, _],
  [_, _, _, O, SK,SK,SK,SK,SK,SK,SK,SK, O, _, _, _],
  [_, _, A, A, SK,SK,SK,SK,SK,SK,SK,SK, A, A, _, _],  // full ear
  [_, A, A, O, SK,SK,SK,SK,SK,SK,SK,SK, O, A, A, _],  // ear extends
  [_, _, _, O, SK,SD,SK,SK,SK,SK,SD,SK, O, _, _, _],
  [_, _, _, _, O, SK,SK,SK,SK,SK,SK, O, _, _, _, _],
  [_, _, _, _, _, O, O, O, O, O, O, _, _, _, _, _],
],
```

**Demon** — Taller horns (2px → 4px, more prominent):
```typescript
demon: [
  [_, _, O, A, _, _, _, _, _, _, _, _, A, O, _, _],  // tall horns
  [_, _, _, O, A, _, _, _, _, _, _, A, O, _, _, _],  // horn mid
  [_, _, _, _, O,SK,SK,SK,SK,SK,SK, O, _, _, _, _],
  [_, _, _, O, SK,SK,SK,SK,SK,SK,SK,SK, O, _, _, _],
  [_, _, _, O, SK,SK,SK,SK,SK,SK,SK,SK, O, _, _, _],
  [_, _, _, O, SK,SD,SK,SK,SK,SK,SD,SK, O, _, _, _],
  [_, _, _, _, O, SK,SK,SK,SK,SK,SK, O, _, _, _, _],
  [_, _, _, _, _, O, O, O, O, O, O, _, _, _, _, _],
],
```

**Beast** — Larger pointed ears (full triangular ear shape):
```typescript
beast: [
  [_, _, _, A, O, _, _, _, _, _, _, O, A, _, _, _],  // ear tips
  [_, _, _, O, A, O, O, O, O, O, O, A, O, _, _, _],  // ear base
  [_, _, _, O, SK,SK,SK,SK,SK,SK,SK,SK, O, _, _, _],
  [_, _, _, O, SK,SK,SK,SK,SK,SK,SK,SK, O, _, _, _],
  [_, _, _, O, SK,SK,SK,SK,SK,SK,SK,SK, O, _, _, _],
  [_, _, _, O, SK,SD,SK,SK,SK,SK,SD,SK, O, _, _, _],
  [_, _, _, _, O, SK,SK,SD,SD,SK,SK, O, _, _, _, _],  // snout hint
  [_, _, _, _, _, O, O, O, O, O, O, _, _, _, _, _],
],
```

**Undead** and **Dragon** — keep current designs (already rated 4/5 distinctiveness), just verify they're correct.

- [ ] **Step 4: Run tests**

```bash
npx tsc --noEmit && npm test -- tests/data/pixel-templates.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/data/pixel-templates.ts tests/data/pixel-templates.test.ts
git commit -m "feat: enhance hero race head templates for better silhouette differentiation"
```

---

## Task 2: Differentiate Support Body from Melee DPS

**Context:** Support body (lines 90-101) is nearly identical to melee_dps (lines 54-65) — only 1px width difference, invisible at 32×40. Need a visually distinct "mystic robe" or "floating" silhouette.

**Files:**
- Modify: `src/data/pixel-templates.ts:90-101`

- [ ] **Step 1: Add test for support vs melee distinction**

Add to `tests/data/pixel-templates.test.ts`:

```typescript
it('support body differs from melee_dps by at least 8 pixels', () => {
  const support = BODY_TEMPLATES.support;
  const melee = BODY_TEMPLATES.melee_dps;
  let diffCount = 0;
  for (let r = 0; r < support.length; r++) {
    for (let c = 0; c < support[r].length; c++) {
      if (support[r][c] !== melee[r][c]) diffCount++;
    }
  }
  expect(diffCount).toBeGreaterThanOrEqual(8);
});
```

- [ ] **Step 2: Redesign support body template**

Replace `BODY_TEMPLATES.support` with a robe+orb silhouette — wider bottom (like healer) but asymmetric with a floating orb/book accent:

```typescript
support: [
  // Slim upper torso with decorative shoulders
  [_, _, _, _, O, O, O, O, O, O, O, O, _, _, _, _],
  [_, _, _, O, S, F, F, F, F, F, F, S, O, _, _, _],
  [_, _, _, O, F, F, A, F, F, A, F, F, O, _, _, _],  // accent shoulders
  [_, _, _, O, S, F, F, F, F, F, F, S, O, _, _, _],
  [_, _, O, S, F, F, F, F, F, F, F, F, S, O, _, _],  // widens
  [_, _, O, S, F, F, F, F, F, F, F, F, S, O, _, _],
  [_, O, S, F, F, F, F, F, F, F, F, F, F, S, O, _],  // robe flare
  [_, O, S, F, F, F, F, F, F, F, F, F, F, S, O, _],
  [_, _, O, O, O, O, O, O, O, O, O, O, O, O, _, _],
],
```

Key differences from melee_dps: wider bottom (robe flare like healer), accent pixels on shoulders (A palette), and wider overall silhouette in bottom rows.

- [ ] **Step 3: Run tests**

```bash
npx tsc --noEmit && npm test -- tests/data/pixel-templates.test.ts
```

- [ ] **Step 4: Commit**

```bash
git add src/data/pixel-templates.ts tests/data/pixel-templates.test.ts
git commit -m "feat: differentiate support body template with robe silhouette"
```

---

## Task 3: Optimize Assassin Weapon

**Context:** Assassin weapon is only 3 grey pixels — invisible at game scale. Needs to be larger and use contrasting colors.

**Files:**
- Modify: `src/data/pixel-templates.ts:264-275` (WEAPON_TEMPLATES.assassin)
- Modify: `src/data/pixel-templates.ts:315` (WEAPON_COLORS.assassin)

- [ ] **Step 1: Redesign assassin weapon template**

Replace with dual daggers / larger blade with glow:

```typescript
assassin: [
  // Dual daggers — crossed, with glow accents
  [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, _, _, _, _, _, _,WG, _, _],
  [_, _, _, _, _, _, _, _, _, _, _, _,WG, W, _, _],
  [_, _, _, _, _, _, _, _, _, _, _, W, W, _, _, _],
  [_, _, _, _, _, _, _, _, _, _, W,WG, _, _, _, _],
  [_, _, _, _, _, _, _, _, _, _,WG, _, _, _, _, _],
  [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
],
```

- [ ] **Step 2: Update assassin weapon colors for contrast**

In `WEAPON_COLORS`:
```typescript
// BEFORE:
assassin: { base: 0x888888, glow: 0xaaaaaa },

// AFTER:
assassin: { base: 0xaabbcc, glow: 0xddeeff },  // bright silver-blue for visibility
```

- [ ] **Step 3: Run tests**

```bash
npx tsc --noEmit && npm test
```

- [ ] **Step 4: Commit**

```bash
git add src/data/pixel-templates.ts
git commit -m "feat: enlarge assassin weapon template and improve color contrast"
```

---

## Task 4: Create Monster Body Templates

**Context:** Monsters currently reuse hero body templates (BODY_TEMPLATES keyed by UnitRole). This makes all monsters look humanoid. Need 6 monster-specific body templates keyed by archetype.

**Files:**
- Modify: `src/data/pixel-templates.ts` (add after BODY_TEMPLATES)

- [ ] **Step 1: Add MONSTER_BODY_TEMPLATES**

**Important:** `MonsterType` is defined ONLY in `src/types/index.ts` (added in Task 6). In this task, import it:
```typescript
import { UnitRole, RaceType, ClassType, MonsterType } from '../types';
```

Add templates after `BODY_TEMPLATES` (~line 102). Do NOT define MonsterType here:

```typescript

// ── Monster body templates (16×9, same dimensions as hero body templates) ──
export const MONSTER_BODY_TEMPLATES: Record<MonsterType, PixelLayer> = {
  beast: [
    // Low-slung quadruped feel — wide, forward-leaning
    [_, _, _, _, _, O, O, O, O, O, O, O, O, _, _, _],
    [_, _, _, _, O, F, F, F, F, F, F, F, F, O, _, _],
    [_, _, _, O, S, F, F, F, F, F, F, F, F, S, O, _],
    [_, _, O, S, F, F, F, F, F, F, F, F, F, F, O, _],
    [_, O, S, F, F, F, F, F, F, F, F, F, F, F, S, O],
    [_, O, S, F, F, F, F, F, F, F, F, F, F, S, O, _],
    [_, _, O, F, F, S, _, _, _, _, S, F, F, O, _, _],
    [_, _, O, F, O, _, _, _, _, _, _, O, F, O, _, _],
    [_, _, O, O, _, _, _, _, _, _, _, _, O, O, _, _],
  ],
  undead: [
    // Skeletal — narrow, gaps in torso, bony
    [_, _, _, _, _, O, O, O, O, O, O, _, _, _, _, _],
    [_, _, _, _, O, S, _, F, F, _, S, O, _, _, _, _],
    [_, _, _, _, O, _, F, F, F, F, _, O, _, _, _, _],
    [_, _, _, _, O, S, _, F, F, _, S, O, _, _, _, _],
    [_, _, _, _, _, O, F, F, F, F, O, _, _, _, _, _],
    [_, _, _, _, _, O, S, F, F, S, O, _, _, _, _, _],
    [_, _, _, _, _, O, _, F, F, _, O, _, _, _, _, _],
    [_, _, _, _, _, O, S, _, _, S, O, _, _, _, _, _],
    [_, _, _, _, _, _, O, O, O, O, _, _, _, _, _, _],
  ],
  construct: [
    // Blocky, thick, no taper — mechanical/golem
    [_, O, O, O, O, O, O, O, O, O, O, O, O, O, O, _],
    [O, S, F, F, F, F, F, F, F, F, F, F, F, F, S, O],
    [O, F, F, H, H, F, F, F, F, F, F, H, H, F, F, O],
    [O, F, F, F, F, F, F, F, F, F, F, F, F, F, F, O],
    [O, S, F, F, F, F, F, F, F, F, F, F, F, F, S, O],
    [O, S, F, F, F, F, F, F, F, F, F, F, F, F, S, O],
    [O, F, F, F, F, F, F, F, F, F, F, F, F, F, F, O],
    [O, S, F, F, F, F, F, F, F, F, F, F, F, F, S, O],
    [O, O, O, O, O, O, O, O, O, O, O, O, O, O, O, O],
  ],
  caster: [
    // Floating/ethereal — narrow torso, wispy bottom
    [_, _, _, _, _, _, O, O, O, O, _, _, _, _, _, _],
    [_, _, _, _, _, O, F, H, H, F, O, _, _, _, _, _],
    [_, _, _, _, O, F, F, H, H, F, F, O, _, _, _, _],
    [_, _, _, _, O, S, F, F, F, F, S, O, _, _, _, _],
    [_, _, _, _, _, O, F, F, F, F, O, _, _, _, _, _],
    [_, _, _, _, O, S, F, H, H, F, S, O, _, _, _, _],
    [_, _, _, O, S, _, F, F, F, F, _, S, O, _, _, _],
    [_, _, O, S, _, _, _, F, F, _, _, _, S, O, _, _],
    [_, O, _, _, _, _, _, _, _, _, _, _, _, _, O, _],
  ],
  humanoid: [
    // Reuses melee_dps but slightly wider/rougher
    [_, _, _, O, O, O, O, O, O, O, O, O, O, _, _, _],
    [_, _, O, S, F, F, F, F, F, F, F, F, S, O, _, _],
    [_, _, O, F, F, H, F, F, F, F, H, F, F, O, _, _],
    [_, _, O, S, F, F, F, F, F, F, F, F, S, O, _, _],
    [_, _, O, S, F, F, F, F, F, F, F, F, S, O, _, _],
    [_, _, _, O, S, F, F, F, F, F, F, S, O, _, _, _],
    [_, _, _, O, S, F, F, F, F, F, F, S, O, _, _, _],
    [_, _, _, _, O, S, F, F, F, F, S, O, _, _, _, _],
    [_, _, _, _, _, O, O, O, O, O, O, _, _, _, _, _],
  ],
  draconic: [
    // Massive — widest body, thick limbs, tail hint
    [O, O, O, O, O, O, O, O, O, O, O, O, O, O, O, O],
    [O, S, F, F, F, F, F, F, F, F, F, F, F, F, S, O],
    [O, F, F, H, F, F, F, F, F, F, F, F, H, F, F, O],
    [O, S, F, F, F, F, F, F, F, F, F, F, F, F, S, O],
    [O, S, F, F, F, F, F, F, F, F, F, F, F, F, S, O],
    [O, F, F, F, F, F, F, F, F, F, F, F, F, F, F, O],
    [_, O, S, F, F, F, F, F, F, F, F, F, F, S, O, A],
    [_, _, O, S, F, F, F, F, F, F, F, F, S, O, A, _],
    [_, _, _, O, O, O, O, O, O, O, O, O, O, _, _, _],
  ],
};
```

- [ ] **Step 2: Add tests for monster body templates**

Add to `tests/data/pixel-templates.test.ts`:

```typescript
import { MONSTER_BODY_TEMPLATES, MONSTER_HEAD_TEMPLATES } from '../../src/data/pixel-templates';

it('all MONSTER_BODY_TEMPLATES are 16×9 grids', () => {
  const types = ['beast', 'undead', 'construct', 'caster', 'humanoid', 'draconic'];
  for (const type of types) {
    const template = MONSTER_BODY_TEMPLATES[type as any];
    expect(template, `${type} body template should exist`).toBeDefined();
    expect(template.length, `${type} body should have 9 rows`).toBe(9);
    for (const row of template) {
      expect(row.length, `${type} body row should have 16 cols`).toBe(GRID_W);
    }
  }
});
```

- [ ] **Step 3: Run tests**

```bash
npx tsc --noEmit && npm test -- tests/data/pixel-templates.test.ts
```

- [ ] **Step 4: Commit**

```bash
git add src/data/pixel-templates.ts tests/data/pixel-templates.test.ts
git commit -m "feat: add 6 monster body templates (beast/undead/construct/caster/humanoid/draconic)"
```

---

## Task 5: Create Monster Head Templates

**Context:** Monsters need distinct head shapes per archetype — fangs for beasts, hollow eyes for undead, flat/angular for constructs, energy core for casters, horned crown for draconic.

**Files:**
- Modify: `src/data/pixel-templates.ts` (add after MONSTER_BODY_TEMPLATES)

- [ ] **Step 1: Add MONSTER_HEAD_TEMPLATES**

```typescript
// ── Monster head templates (16×8, same dimensions as hero head templates) ──
export const MONSTER_HEAD_TEMPLATES: Record<MonsterType, PixelLayer> = {
  beast: [
    // Forward-facing snout, fangs, wide ears
    [_, _, _, A, O, _, _, _, _, _, _, O, A, _, _, _],
    [_, _, _, O, A, O, O, O, O, O, O, A, O, _, _, _],
    [_, _, _, O, SK,SK,SK,SK,SK,SK,SK,SK, O, _, _, _],
    [_, _, _, O, SK, E,SK,SK,SK,SK, E,SK, O, _, _, _],
    [_, _, O, SK,SK,SK,SK,SK,SK,SK,SK,SK,SK, O, _, _],
    [_, _, O, SK,SK,SK, O,SK,SK, O,SK,SK,SK, O, _, _],  // nostrils
    [_, _, _, O, _, O,SK,SK,SK,SK, O, _, O, _, _, _],  // open jaw with fangs
    [_, _, _, _, _, _, O, O, O, O, _, _, _, _, _, _, ],
  ],
  undead: [
    // Skull — hollow eyes, jaw cracks, exposed teeth
    [_, _, _, _, _, O, O, O, O, O, O, _, _, _, _, _],
    [_, _, _, _, O, SK, O, SK,SK, O,SK, O, _, _, _, _],
    [_, _, _, O, SK, O, O, SK,SK, O, O,SK, O, _, _, _],  // deep sockets
    [_, _, _, O, SK,SK,SK,SK,SK,SK,SK,SK, O, _, _, _],
    [_, _, _, O, SK,SK,SK,SK,SK,SK,SK,SK, O, _, _, _],
    [_, _, _, O, SD, O,SK,SK,SK,SK, O,SD, O, _, _, _],  // cheek cracks
    [_, _, _, _, O, SK, O, O, O, O,SK, O, _, _, _, _],  // teeth
    [_, _, _, _, _, O, O, _, _, O, O, _, _, _, _, _],
  ],
  construct: [
    // Flat-top, angular, no organic features — visor slit for eyes
    [_, _, _, O, O, O, O, O, O, O, O, O, O, _, _, _],
    [_, _, O, F, F, F, F, F, F, F, F, F, F, O, _, _],
    [_, _, O, F, F, F, F, F, F, F, F, F, F, O, _, _],
    [_, _, O, F, F, F, F, F, F, F, F, F, F, O, _, _],
    [_, _, O, O, O, E, E, O, O, E, E, O, O, O, _, _],  // visor slit
    [_, _, O, F, F, F, F, F, F, F, F, F, F, O, _, _],
    [_, _, O, F, F, F, F, F, F, F, F, F, F, O, _, _],
    [_, _, _, O, O, O, O, O, O, O, O, O, O, _, _, _],
  ],
  caster: [
    // Ethereal — hood/cowl shape, glowing eyes, no solid jaw
    [_, _, _, _, _, O, O, O, O, O, O, _, _, _, _, _],
    [_, _, _, _, O, A, A, A, A, A, A, O, _, _, _, _],  // hood
    [_, _, _, O, A,SK,SK,SK,SK,SK,SK, A, O, _, _, _],  // hood sides
    [_, _, _, O, SK,SK,SK,SK,SK,SK,SK,SK, O, _, _, _],
    [_, _, _, O, SK, E,SK,SK,SK,SK, E,SK, O, _, _, _],  // glowing eyes
    [_, _, _, _, O, SK,SK,SK,SK,SK,SK, O, _, _, _, _],
    [_, _, _, _, _, O, SK,SK,SK,SK, O, _, _, _, _, _],
    [_, _, _, _, _, _, O, _, _, O, _, _, _, _, _, _],  // wispy bottom
  ],
  humanoid: [
    // Rougher human-like — heavier brow, wider jaw
    [_, _, _, _, _, O, O, O, O, O, O, _, _, _, _, _],
    [_, _, _, _, O, SK,SK,SK,SK,SK,SK, O, _, _, _, _],
    [_, _, _, O, SK,SK,SK,SK,SK,SK,SK,SK, O, _, _, _],
    [_, _, _, O, O, O,SK,SK,SK,SK, O, O, O, _, _, _],  // heavy brow
    [_, _, _, O, SK, E,SK,SK,SK,SK, E,SK, O, _, _, _],
    [_, _, _, O, SK,SK,SK,SK,SK,SK,SK,SK, O, _, _, _],
    [_, _, _, O, SK,SK,SK,SD,SD,SK,SK,SK, O, _, _, _],  // wider jaw
    [_, _, _, _, O, O, O, O, O, O, O, O, _, _, _, _],
  ],
  draconic: [
    // Large horned head, jaw ridges, crown-like top
    [_, _, O, A, A, _, _, _, _, _, _, A, A, O, _, _],  // tall horns
    [_, _, _, O, A, _, _, _, _, _, _, A, O, _, _, _],
    [_, _, _, _, O,SK,SK,SK,SK,SK,SK, O, _, _, _, _],
    [_, _, _, O, SK,SK,SK,SK,SK,SK,SK,SK, O, _, _, _],
    [_, _, _, O, SK, E,SK,SK,SK,SK, E,SK, O, _, _, _],
    [_, _, _, O, SK,SK,SK,SK,SK,SK,SK,SK, O, _, _, _],
    [_, _, O, A, SK,SK,SK,SK,SK,SK,SK,SK, A, O, _, _],  // jaw ridges
    [_, _, _, _, O, O, O, O, O, O, O, O, _, _, _, _],
  ],
};
```

- [ ] **Step 2: Add tests**

```typescript
it('all MONSTER_HEAD_TEMPLATES are 16×8 grids', () => {
  const types = ['beast', 'undead', 'construct', 'caster', 'humanoid', 'draconic'];
  for (const type of types) {
    const template = MONSTER_HEAD_TEMPLATES[type as any];
    expect(template, `${type} head template should exist`).toBeDefined();
    expect(template.length, `${type} head should have 8 rows`).toBe(8);
    for (const row of template) {
      expect(row.length, `${type} head row should have 16 cols`).toBe(GRID_W);
    }
  }
});
```

- [ ] **Step 3: Run tests**

```bash
npx tsc --noEmit && npm test -- tests/data/pixel-templates.test.ts
```

- [ ] **Step 4: Commit**

```bash
git add src/data/pixel-templates.ts tests/data/pixel-templates.test.ts
git commit -m "feat: add 6 monster head templates (beast/undead/construct/caster/humanoid/draconic)"
```

---

## Task 6: Add monsterType Field to Enemy Data

**Context:** 28 enemies need a new `monsterType` field in their JSON data. The type must also be added to `EnemyData` interface.

**Files:**
- Modify: `src/types/index.ts:74-88`
- Modify: `src/data/enemies.json`

- [ ] **Step 1: Add MonsterType to types and EnemyData**

In `src/types/index.ts`, import MonsterType and add to EnemyData:

```typescript
// At top of types, or import from pixel-templates:
export type MonsterType = 'beast' | 'undead' | 'construct' | 'caster' | 'humanoid' | 'draconic';

export interface EnemyData {
  id: string;
  name: string;
  role: UnitRole;
  element?: ElementType;
  race?: RaceType;
  class?: ClassType;
  monsterType?: MonsterType;  // NEW — visual archetype for enemy rendering
  baseStats: UnitStats;
  scalingPerLevel: UnitScaling;
  skills: string[];
  spriteKey: string;
  goldReward: number;
  expReward: number;
  isBoss?: boolean;
}
```

Note: Remove `MonsterType` export from `pixel-templates.ts` and put it in `types/index.ts` instead, since it's a data type used across the codebase.

- [ ] **Step 2: Add monsterType to all 28 enemies in enemies.json**

Apply this mapping:

| monsterType | Enemy IDs |
|-------------|-----------|
| `beast` | slime, goblin, fire_lizard, ice_wolf, storm_hawk, lightning_strider, elemental_chimera |
| `undead` | skeleton_archer, shadow_wraith, void_weaver, shadow_lord |
| `construct` | thunder_golem, flame_construct, frost_sentinel, frost_giant, thunder_titan, heart_of_the_forge |
| `caster` | fire_elemental, dark_cultist, enemy_ice_mage, dark_mage, frost_queen, light_sprite |
| `humanoid` | flame_knight, holy_guardian, holy_smith, orc_warrior |
| `draconic` | dragon_boss |

For each enemy, add `"monsterType": "beast"` (etc.) as a field.

- [ ] **Step 3: Add content integrity test**

Add to `tests/data/content-integrity.test.ts` (or create new test):

```typescript
it('all enemies have valid monsterType', () => {
  const validTypes = ['beast', 'undead', 'construct', 'caster', 'humanoid', 'draconic'];
  for (const enemy of enemiesData) {
    if (enemy.monsterType) {
      expect(validTypes).toContain(enemy.monsterType);
    }
  }
});

it('all enemies have monsterType field', () => {
  for (const enemy of enemiesData) {
    expect(enemy.monsterType, `${enemy.id} should have monsterType`).toBeDefined();
  }
});
```

- [ ] **Step 4: Run tests**

```bash
npx tsc --noEmit && npm test
```

- [ ] **Step 5: Commit**

```bash
git add src/types/index.ts src/data/enemies.json tests/data/content-integrity.test.ts
git commit -m "feat: add monsterType field to all 28 enemies (beast/undead/construct/caster/humanoid/draconic)"
```

---

## Task 7: Update UnitRenderer to Use Monster Templates

**Context:** `UnitRenderer.compositePixelGrid()` currently always uses `BODY_TEMPLATES[role]` and `HEAD_TEMPLATES[race]`. For enemies with `monsterType`, it should use `MONSTER_BODY_TEMPLATES[monsterType]` and `MONSTER_HEAD_TEMPLATES[monsterType]` instead.

**Files:**
- Modify: `src/systems/UnitRenderer.ts:20-28,126-154`
- Modify: `src/entities/Unit.ts:183-193`

- [ ] **Step 1: Extend ChibiConfig to include monsterType**

In `src/systems/UnitRenderer.ts`, update the interface:

```typescript
import { MonsterType } from '../types';

export interface ChibiConfig {
  role: UnitRole;
  race: RaceType;
  classType: ClassType;
  fillColor: number;
  borderColor: number;
  isHero: boolean;
  isBoss: boolean;
  monsterType?: MonsterType;  // NEW — if set, use monster templates instead of hero templates
}
```

- [ ] **Step 2: Update compositePixelGrid to branch on monsterType**

In `compositePixelGrid()` (~line 126), change head and body layer selection:

```typescript
function compositePixelGrid(config: ChibiConfig): PaletteIndex[][] {
  const { role, race, classType, isHero, isBoss, monsterType } = config;
  const h = isBoss ? GRID_H + 3 : GRID_H;
  const grid = createEmptyGrid(GRID_W, h);
  const rowBase = isBoss ? 3 : 0;

  // Layer 1: Head — monsters use MONSTER_HEAD_TEMPLATES if monsterType is set
  if (monsterType && MONSTER_HEAD_TEMPLATES[monsterType]) {
    blitLayer(grid, MONSTER_HEAD_TEMPLATES[monsterType], rowBase, 0);
  } else {
    blitLayer(grid, HEAD_TEMPLATES[race], rowBase, 0);
  }

  // Layer 2: Body — monsters use MONSTER_BODY_TEMPLATES if monsterType is set
  if (monsterType && MONSTER_BODY_TEMPLATES[monsterType]) {
    blitLayer(grid, MONSTER_BODY_TEMPLATES[monsterType], rowBase + 7, 0);
  } else {
    blitLayer(grid, BODY_TEMPLATES[role], rowBase + 7, 0);
  }

  // Layer 3: Legs
  blitLayer(grid, LEG_TEMPLATE, rowBase + 17, 0);

  // Layer 4: Face
  blitLayer(grid, isHero ? FACE_HERO : FACE_ENEMY, rowBase, 0);

  // Layer 5: Weapon (only for heroes and humanoid monsters)
  if (isHero || !monsterType || monsterType === 'humanoid') {
    blitLayer(grid, WEAPON_TEMPLATES[classType], rowBase + 7, 0);
  }

  // Layer 6: Boss crown
  if (isBoss) {
    blitLayer(grid, CROWN_TEMPLATE, 0, 0);
  }

  return grid;
}
```

Import the new templates at the top:
```typescript
import {
  P, PaletteIndex, PixelLayer,
  BODY_TEMPLATES, HEAD_TEMPLATES, FACE_HERO, FACE_ENEMY,
  LEG_TEMPLATE, WEAPON_TEMPLATES, CROWN_TEMPLATE,
  MONSTER_BODY_TEMPLATES, MONSTER_HEAD_TEMPLATES,
  SKIN_TONES, WEAPON_COLORS, GRID_W, GRID_H,
} from '../data/pixel-templates';
```

- [ ] **Step 3: Update cache key to include monsterType**

In `computeConfigHash()`:

```typescript
function computeConfigHash(c: ChibiConfig): string {
  const mt = c.monsterType ?? 'none';
  return `chibi_${c.role}_${c.race}_${c.classType}_${c.fillColor.toString(16)}_${c.borderColor.toString(16)}_${c.isHero ? 'h' : 'e'}_${c.isBoss ? 'b' : 'n'}_${mt}`;
}
```

- [ ] **Step 4: Update Unit.buildChibiConfig() to pass monsterType**

In `src/entities/Unit.ts`, modify `buildChibiConfig()`:

```typescript
protected buildChibiConfig(): ChibiConfig {
  return {
    role: this.role,
    race: this.race,
    classType: this.classType,
    fillColor: this.fillColor,
    borderColor: this.borderColor,
    isHero: this.isHero,
    isBoss: this.isBoss,
    monsterType: this.monsterType,
  };
}
```

Add `monsterType` as a field on Unit (set from Enemy constructor):

In `Unit.ts`, add property:
```typescript
monsterType?: MonsterType;
```

In `Enemy.ts`, pass monsterType after construction:
```typescript
constructor(...) {
  super(...);
  // ... existing code ...
  this.monsterType = enemyData.monsterType;
}
```

Import `MonsterType` in both files.

- [ ] **Step 5: Export compositePixelGrid for testability**

In `UnitRenderer.ts`, change `compositePixelGrid` from private to exported:

```typescript
// BEFORE:
function compositePixelGrid(config: ChibiConfig): PaletteIndex[][] {

// AFTER:
export function compositePixelGrid(config: ChibiConfig): PaletteIndex[][] {
```

- [ ] **Step 6: Add renderer tests that verify actual pixel content**

Create or add to `tests/systems/UnitRenderer.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { compositePixelGrid, ChibiConfig } from '../../src/systems/UnitRenderer';
import { P } from '../../src/data/pixel-templates';

/** Count non-transparent pixels in a row range of a grid */
function countFilledPixels(grid: number[][], rowStart: number, rowEnd: number): number {
  let count = 0;
  for (let r = rowStart; r < rowEnd && r < grid.length; r++) {
    for (const px of grid[r]) { if (px !== P._) count++; }
  }
  return count;
}

/** Count filled pixels in the leftmost/rightmost N columns (edge density) */
function countEdgePixels(grid: number[][], rowStart: number, rowEnd: number, edgeCols: number): number {
  let count = 0;
  for (let r = rowStart; r < rowEnd && r < grid.length; r++) {
    for (let c = 0; c < edgeCols; c++) { if (grid[r][c] !== P._) count++; }
    for (let c = grid[r].length - edgeCols; c < grid[r].length; c++) { if (grid[r][c] !== P._) count++; }
  }
  return count;
}

/** Check if weapon palette indices (W=9, WG=10) exist in body region */
function hasWeaponPixels(grid: number[][]): boolean {
  for (let r = 7; r < 16; r++) {
    for (const px of grid[r]) { if (px === P.W || px === P.WG) return true; }
  }
  return false;
}

describe('UnitRenderer compositePixelGrid', () => {
  const baseConfig: ChibiConfig = {
    role: 'melee_dps', race: 'human', classType: 'warrior',
    fillColor: 0xdd8833, borderColor: 0x000000, isHero: false, isBoss: false,
  };

  it('construct body is wider than hero melee_dps body (edge density)', () => {
    const construct = compositePixelGrid({ ...baseConfig, monsterType: 'construct' });
    const hero = compositePixelGrid({ ...baseConfig, monsterType: undefined });
    // Construct should fill edge columns more densely (blocky = full-width)
    const constructEdge = countEdgePixels(construct, 7, 16, 2);
    const heroEdge = countEdgePixels(hero, 7, 16, 2);
    expect(constructEdge).toBeGreaterThan(heroEdge);
  });

  it('caster body has fewer filled pixels in bottom rows (wispy/ethereal)', () => {
    const caster = compositePixelGrid({ ...baseConfig, monsterType: 'caster' });
    const humanoid = compositePixelGrid({ ...baseConfig, monsterType: 'humanoid' });
    // Caster bottom rows (14-16) should be sparser than humanoid
    const casterBottom = countFilledPixels(caster, 13, 16);
    const humanoidBottom = countFilledPixels(humanoid, 13, 16);
    expect(casterBottom).toBeLessThan(humanoidBottom);
  });

  it('falls back gracefully when monsterType is undefined', () => {
    const grid = compositePixelGrid({ ...baseConfig, monsterType: undefined });
    expect(grid.length).toBe(20);
    expect(grid[0].length).toBe(16);
    // Should still have filled pixels (not an empty grid)
    const total = countFilledPixels(grid, 0, 20);
    expect(total).toBeGreaterThan(30);
  });

  it('does NOT render weapon for non-humanoid monsters', () => {
    const beast = compositePixelGrid({ ...baseConfig, monsterType: 'beast' });
    expect(hasWeaponPixels(beast)).toBe(false);
  });

  it('renders weapon for humanoid monsters', () => {
    const humanoid = compositePixelGrid({ ...baseConfig, monsterType: 'humanoid' });
    expect(hasWeaponPixels(humanoid)).toBe(true);
  });

  it('monster grid differs significantly from hero grid with same role/race', () => {
    const monster = compositePixelGrid({ ...baseConfig, monsterType: 'undead' });
    const hero = compositePixelGrid({ ...baseConfig, monsterType: undefined });
    let diff = 0;
    for (let r = 0; r < Math.min(monster.length, hero.length); r++) {
      for (let c = 0; c < monster[r].length; c++) {
        if (monster[r][c] !== hero[r][c]) diff++;
      }
    }
    // Undead skeleton body vs hero melee body — should differ substantially
    expect(diff).toBeGreaterThan(20);
  });
});
```

- [ ] **Step 6: Run full verification**

```bash
npx tsc --noEmit && npm test
```

- [ ] **Step 7: Commit**

```bash
git add src/systems/UnitRenderer.ts src/entities/Unit.ts src/entities/Enemy.ts src/types/index.ts
git commit -m "feat: UnitRenderer uses monster templates when monsterType is set"
```

---

## Execution Order

Tasks 1-5 modify `pixel-templates.ts` — execute **serially** (shared file).
Task 6 modifies `enemies.json` + `types/index.ts` — independent of Tasks 1-5.
Task 7 modifies `UnitRenderer.ts` + `Unit.ts` + `Enemy.ts` — depends on Tasks 4, 5, 6.

**Recommended execution:**
- Serial: Task 1 → Task 2 → Task 3 → Task 4 → Task 5
- Parallel after Task 5: Task 6
- After Tasks 5+6 both complete: Task 7

## Final Verification

After all tasks:

```bash
npx tsc --noEmit && npm test
```

Then visual verification (run `npm run dev` and check in browser):

**Acceptance criteria:**
1. **Heroes** — each race has visibly distinct head silhouette (human=hair, elf=large ears, demon=tall horns, beast=pointed ears+snout, undead=skull, dragon=horns+jaw). Cross-race pixel diff ≥10.
2. **Support vs Melee** — support body has wider robe bottom, ≥8 pixels different from melee_dps
3. **Assassin weapon** — dagger clearly visible at 32×40 scale with bright silver-blue color
4. **Monsters** — beast enemies look distinct from humanoid (wider/lower body), undead look skeletal (gaps in torso), constructs look blocky (full-width), casters look ethereal (narrow/wispy)
5. **Monsters vs Heroes** — at a glance, monsters and heroes read as different "species" even when same race/role
6. **No regressions** — all existing hero sprites still render correctly; `monsterType=undefined` falls back to hero templates without errors
7. **Goblin visual review** — after implementation, goblin gets a dedicated screenshot review. If it looks wrong as `beast`, it may be remapped to `humanoid` (not a failure of this phase)
8. **Caster sub-variant note** — if `light_sprite` looks too humanoid after implementation, a `caster_spirit` sub-variant is an accepted follow-up, not a Phase 1 blocker
