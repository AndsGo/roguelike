# Unit Sprite Animation First Batch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate, process, register, and verify the first batch of eight authored unit spritesheets for battle animations.

**Architecture:** Keep the existing authored sprite runtime contract: `UnitSpriteAssets.ts` registers spritesheet metadata, `BootScene` preloads registered sprites, and `Unit` falls back to generated chibi when a sprite is missing. Use Codex built-in image generation for project-bound bitmap assets, then local chroma-key removal for runtime alpha PNGs.

**Tech Stack:** Phaser 3, TypeScript, Vite, Vitest, Codex built-in `image_gen`, Python chroma-key helper from the imagegen skill.

---

## File Structure

- `assets-src/ai-sprites/units/first-batch/`: source generated spritesheets before alpha cleanup.
- `public/assets/units/first-batch/`: runtime alpha spritesheets consumed by Phaser.
- `src/systems/UnitSpriteAssets.ts`: spritesheet metadata registry for all authored units.
- `tests/systems/UnitSpriteAssets.test.ts`: unit tests for registry completeness and row mapping.
- `docs/superpowers/specs/2026-06-06-unit-sprite-animation-upgrade-design.md`: approved design reference.

## First Batch Keys

```ts
const FIRST_BATCH_KEYS = [
  'hero_archer',
  'hero_mage',
  'hero_priest',
  'hero_rogue',
  'enemy_goblin',
  'enemy_skeleton_archer',
  'enemy_dark_mage',
  'enemy_dragon',
] as const;
```

## Shared Spritesheet Prompt Requirements

Use this exact shared requirement block in every image generation prompt:

```text
Create a production-ready fantasy game character spritesheet on a perfectly flat solid #00ff00 chroma-key background for background removal.
The sheet must be exactly a 4 columns x 5 rows grid, 20 frames total.
Each frame is a side-view battle sprite pose with generous padding and no clipping.
Rows from top to bottom: idle, attack, cast, hurt, death.
Each row has 4 sequential animation frames showing visible progression; no row may repeat the exact same pose.
Keep the character centered within each cell, consistent scale across frames, transparent-ready clean edges, no shadows, no gradients, no text, no watermark, no frame labels, no grid lines.
Use readable stylized fantasy pixel-inspired illustration suitable for a Phaser auto-battler at small battle scale.
Avoid using #00ff00 anywhere in the character.
```

---

### Task 1: Add Registry Tests Before Expanding the Manifest

**Files:**
- Create: `tests/systems/UnitSpriteAssets.test.ts`
- Modify: none

- [ ] **Step 1: Write the failing registry test**

Create `tests/systems/UnitSpriteAssets.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { getAllUnitSpriteSheets, getUnitSpriteSheet } from '../../src/systems/UnitSpriteAssets';

const EXPECTED_FIRST_BATCH = [
  'hero_archer',
  'hero_mage',
  'hero_priest',
  'hero_rogue',
  'enemy_goblin',
  'enemy_skeleton_archer',
  'enemy_dark_mage',
  'enemy_dragon',
] as const;

describe('UnitSpriteAssets registry', () => {
  it('registers the first batch sprite keys', () => {
    for (const key of EXPECTED_FIRST_BATCH) {
      expect(getUnitSpriteSheet(key), `${key} should be registered`).toBeDefined();
    }
  });

  it('uses the expected 4x5 row mapping for every registered sheet', () => {
    for (const config of getAllUnitSpriteSheets()) {
      expect(config.frameWidth).toBe(320);
      expect(config.frameHeight).toBe(256);
      expect(config.frames.idle).toEqual({ start: 0, end: 3, repeat: -1 });
      expect(config.frames.attack).toEqual({ start: 4, end: 7, repeat: 0 });
      expect(config.frames.cast).toEqual({ start: 8, end: 11, repeat: 0 });
      expect(config.frames.hurt).toEqual({ start: 12, end: 15, repeat: 0 });
      expect(config.frames.death).toEqual({ start: 16, end: 19, repeat: 0 });
    }
  });
});
```

- [ ] **Step 2: Run the new test and verify it fails**

Run:

```bash
npx vitest run tests/systems/UnitSpriteAssets.test.ts
```

Expected: FAIL because `getAllUnitSpriteSheets` is not exported and the first batch keys are not registered yet.

- [ ] **Step 3: Commit the failing test if working with separate commits**

Use this only if the implementation workflow allows committing red tests:

```bash
git add tests/systems/UnitSpriteAssets.test.ts
git commit -m "test: cover first batch sprite registry"
```

If committing red tests is not desired, keep the file staged or unstaged until Task 2 turns it green.

---

### Task 2: Refactor and Expand `UnitSpriteAssets.ts`

**Files:**
- Modify: `src/systems/UnitSpriteAssets.ts`
- Test: `tests/systems/UnitSpriteAssets.test.ts`

- [ ] **Step 1: Replace duplicated config literals with a helper**

In `src/systems/UnitSpriteAssets.ts`, add this helper above `AI_UNIT_SPRITES`:

```ts
function createUnitSpriteSheetConfig(
  spriteKey: string,
  path: string,
  displayWidth: number,
  displayHeight: number,
  frameRate = 8,
): UnitSpriteSheetConfig {
  return {
    spriteKey,
    textureKey: `ai_unit_${spriteKey}`,
    path,
    frameWidth: 320,
    frameHeight: 256,
    displayWidth,
    displayHeight,
    frameRate,
    frames: {
      idle: { start: 0, end: 3, repeat: -1 },
      attack: { start: 4, end: 7, repeat: 0 },
      cast: { start: 8, end: 11, repeat: 0 },
      hurt: { start: 12, end: 15, repeat: 0 },
      death: { start: 16, end: 19, repeat: 0 },
    },
  };
}
```

- [ ] **Step 2: Register prototypes and first batch keys**

Replace `AI_UNIT_SPRITES` with:

```ts
const AI_UNIT_SPRITES: Record<string, UnitSpriteSheetConfig> = {
  hero_warrior: createUnitSpriteSheetConfig(
    'hero_warrior',
    'assets/units/prototypes/hero_warrior_spritesheet.png',
    64,
    64,
  ),
  enemy_slime: createUnitSpriteSheetConfig(
    'enemy_slime',
    'assets/units/prototypes/enemy_slime_spritesheet.png',
    58,
    58,
  ),
  hero_archer: createUnitSpriteSheetConfig(
    'hero_archer',
    'assets/units/first-batch/hero_archer_spritesheet.png',
    64,
    64,
  ),
  hero_mage: createUnitSpriteSheetConfig(
    'hero_mage',
    'assets/units/first-batch/hero_mage_spritesheet.png',
    64,
    64,
  ),
  hero_priest: createUnitSpriteSheetConfig(
    'hero_priest',
    'assets/units/first-batch/hero_priest_spritesheet.png',
    64,
    64,
  ),
  hero_rogue: createUnitSpriteSheetConfig(
    'hero_rogue',
    'assets/units/first-batch/hero_rogue_spritesheet.png',
    64,
    64,
  ),
  enemy_goblin: createUnitSpriteSheetConfig(
    'enemy_goblin',
    'assets/units/first-batch/enemy_goblin_spritesheet.png',
    58,
    58,
  ),
  enemy_skeleton_archer: createUnitSpriteSheetConfig(
    'enemy_skeleton_archer',
    'assets/units/first-batch/enemy_skeleton_archer_spritesheet.png',
    58,
    58,
  ),
  enemy_dark_mage: createUnitSpriteSheetConfig(
    'enemy_dark_mage',
    'assets/units/first-batch/enemy_dark_mage_spritesheet.png',
    58,
    58,
  ),
  enemy_dragon: createUnitSpriteSheetConfig(
    'enemy_dragon',
    'assets/units/first-batch/enemy_dragon_spritesheet.png',
    92,
    92,
    7,
  ),
};
```

- [ ] **Step 3: Export all registered configs**

Add this function below `getUnitSpriteSheet`:

```ts
export function getAllUnitSpriteSheets(): UnitSpriteSheetConfig[] {
  return Object.values(AI_UNIT_SPRITES);
}
```

- [ ] **Step 4: Run targeted tests**

Run:

```bash
npx vitest run tests/systems/UnitSpriteAssets.test.ts tests/systems/UnitAnimationSystem.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit registry changes**

```bash
git add src/systems/UnitSpriteAssets.ts tests/systems/UnitSpriteAssets.test.ts
git commit -m "feat: register first batch unit sprites"
```

---

### Task 3: Generate First Batch Spritesheet Sources

**Files:**
- Create: `assets-src/ai-sprites/units/first-batch/*_spritesheet_source.png`
- No code changes

- [ ] **Step 1: Create source and runtime directories**

Run:

```powershell
New-Item -ItemType Directory -Force assets-src\ai-sprites\units\first-batch
New-Item -ItemType Directory -Force public\assets\units\first-batch
```

- [ ] **Step 2: Generate `hero_archer` with built-in image generation**

Use the built-in Codex image generation tool with this prompt:

```text
Create a production-ready fantasy game character spritesheet on a perfectly flat solid #00ff00 chroma-key background for background removal.
The sheet must be exactly a 4 columns x 5 rows grid, 20 frames total.
Each frame is a side-view battle sprite pose with generous padding and no clipping.
Rows from top to bottom: idle, attack, cast, hurt, death.
Each row has 4 sequential animation frames showing visible progression; no row may repeat the exact same pose.
Keep the character centered within each cell, consistent scale across frames, transparent-ready clean edges, no shadows, no gradients, no text, no watermark, no frame labels, no grid lines.
Use readable stylized fantasy pixel-inspired illustration suitable for a Phaser auto-battler at small battle scale.
Avoid using #00ff00 anywhere in the character.

Subject: agile elf ranger hero, light leather armor, green-brown cloak accents, longbow as the main silhouette, heroic but practical.
Action row details: idle steady bow-ready stance; attack draw-and-release arrow; cast empowered glowing arrow volley; hurt recoil while holding bow; death drop bow and collapse cleanly.
Composition: full body visible in every frame, side-view, facing right.
```

Save the selected generated image as:

```text
assets-src/ai-sprites/units/first-batch/hero_archer_spritesheet_source.png
```

- [ ] **Step 3: Generate `hero_mage`**

Prompt:

```text
Create a production-ready fantasy game character spritesheet on a perfectly flat solid #00ff00 chroma-key background for background removal.
The sheet must be exactly a 4 columns x 5 rows grid, 20 frames total.
Each frame is a side-view battle sprite pose with generous padding and no clipping.
Rows from top to bottom: idle, attack, cast, hurt, death.
Each row has 4 sequential animation frames showing visible progression; no row may repeat the exact same pose.
Keep the character centered within each cell, consistent scale across frames, transparent-ready clean edges, no shadows, no gradients, no text, no watermark, no frame labels, no grid lines.
Use readable stylized fantasy pixel-inspired illustration suitable for a Phaser auto-battler at small battle scale.
Avoid using #00ff00 anywhere in the character.

Subject: human fire mage hero, red-orange robe, short staff or glowing hands, bright flame accents, clear caster silhouette.
Action row details: idle staff held with small flame aura; attack quick fire bolt gesture; cast larger fire gathering pose; hurt spell interrupted with backward recoil; death flame fades as the mage falls.
Composition: full body visible in every frame, side-view, facing right.
```

Save as:

```text
assets-src/ai-sprites/units/first-batch/hero_mage_spritesheet_source.png
```

- [ ] **Step 4: Generate `hero_priest`**

Prompt:

```text
Create a production-ready fantasy game character spritesheet on a perfectly flat solid #00ff00 chroma-key background for background removal.
The sheet must be exactly a 4 columns x 5 rows grid, 20 frames total.
Each frame is a side-view battle sprite pose with generous padding and no clipping.
Rows from top to bottom: idle, attack, cast, hurt, death.
Each row has 4 sequential animation frames showing visible progression; no row may repeat the exact same pose.
Keep the character centered within each cell, consistent scale across frames, transparent-ready clean edges, no shadows, no gradients, no text, no watermark, no frame labels, no grid lines.
Use readable stylized fantasy pixel-inspired illustration suitable for a Phaser auto-battler at small battle scale.
Avoid using #00ff00 anywhere in the character.

Subject: holy priest healer hero, white and gold robes, staff or holy book, calm upright silhouette, soft sacred light accents.
Action row details: idle composed blessing stance; attack small holy smite gesture; cast strong healing light with raised staff; hurt stagger while protecting holy focus; death kneel or fade softly.
Composition: full body visible in every frame, side-view, facing right.
```

Save as:

```text
assets-src/ai-sprites/units/first-batch/hero_priest_spritesheet_source.png
```

- [ ] **Step 5: Generate `hero_rogue`**

Prompt:

```text
Create a production-ready fantasy game character spritesheet on a perfectly flat solid #00ff00 chroma-key background for background removal.
The sheet must be exactly a 4 columns x 5 rows grid, 20 frames total.
Each frame is a side-view battle sprite pose with generous padding and no clipping.
Rows from top to bottom: idle, attack, cast, hurt, death.
Each row has 4 sequential animation frames showing visible progression; no row may repeat the exact same pose.
Keep the character centered within each cell, consistent scale across frames, transparent-ready clean edges, no shadows, no gradients, no text, no watermark, no frame labels, no grid lines.
Use readable stylized fantasy pixel-inspired illustration suitable for a Phaser auto-battler at small battle scale.
Avoid using #00ff00 anywhere in the character.

Subject: dark rogue assassin hero, hooded leather armor, dual daggers, low agile silhouette, purple-black shadow accents.
Action row details: idle crouched ready stance; attack quick dagger slash or lunge; cast shadow technique with dark afterimage energy; hurt sharp backward recoil; death fast collapse.
Composition: full body visible in every frame, side-view, facing right.
```

Save as:

```text
assets-src/ai-sprites/units/first-batch/hero_rogue_spritesheet_source.png
```

- [ ] **Step 6: Generate `enemy_goblin`**

Prompt:

```text
Create a production-ready fantasy game character spritesheet on a perfectly flat solid #00ff00 chroma-key background for background removal.
The sheet must be exactly a 4 columns x 5 rows grid, 20 frames total.
Each frame is a side-view battle sprite pose with generous padding and no clipping.
Rows from top to bottom: idle, attack, cast, hurt, death.
Each row has 4 sequential animation frames showing visible progression; no row may repeat the exact same pose.
Keep the character centered within each cell, consistent scale across frames, transparent-ready clean edges, no shadows, no gradients, no text, no watermark, no frame labels, no grid lines.
Use readable stylized fantasy pixel-inspired illustration suitable for a Phaser auto-battler at small battle scale.
Avoid using #00ff00 anywhere in the character.

Subject: small hostile goblin enemy, hunched body, crude dagger or club, scrappy armor scraps, mischievous aggressive silhouette.
Action row details: idle twitchy ready pose; attack quick stab or rush; cast taunt or dirty trick gesture; hurt squash backward; death readable small collapse.
Composition: full body visible in every frame, side-view, facing left.
```

Save as:

```text
assets-src/ai-sprites/units/first-batch/enemy_goblin_spritesheet_source.png
```

- [ ] **Step 7: Generate `enemy_skeleton_archer`**

Prompt:

```text
Create a production-ready fantasy game character spritesheet on a perfectly flat solid #00ff00 chroma-key background for background removal.
The sheet must be exactly a 4 columns x 5 rows grid, 20 frames total.
Each frame is a side-view battle sprite pose with generous padding and no clipping.
Rows from top to bottom: idle, attack, cast, hurt, death.
Each row has 4 sequential animation frames showing visible progression; no row may repeat the exact same pose.
Keep the character centered within each cell, consistent scale across frames, transparent-ready clean edges, no shadows, no gradients, no text, no watermark, no frame labels, no grid lines.
Use readable stylized fantasy pixel-inspired illustration suitable for a Phaser auto-battler at small battle scale.
Avoid using #00ff00 anywhere in the character.

Subject: undead skeleton archer enemy, exposed bones, ragged dark cloth, old bow, clear bony silhouette, faint dark magic accents.
Action row details: idle slight rattling stance; attack nock and fire arrow; cast dark charged arrow; hurt bones jolt apart but stay readable; death collapse into loose bones.
Composition: full body visible in every frame, side-view, facing left.
```

Save as:

```text
assets-src/ai-sprites/units/first-batch/enemy_skeleton_archer_spritesheet_source.png
```

- [ ] **Step 8: Generate `enemy_dark_mage`**

Prompt:

```text
Create a production-ready fantasy game character spritesheet on a perfectly flat solid #00ff00 chroma-key background for background removal.
The sheet must be exactly a 4 columns x 5 rows grid, 20 frames total.
Each frame is a side-view battle sprite pose with generous padding and no clipping.
Rows from top to bottom: idle, attack, cast, hurt, death.
Each row has 4 sequential animation frames showing visible progression; no row may repeat the exact same pose.
Keep the character centered within each cell, consistent scale across frames, transparent-ready clean edges, no shadows, no gradients, no text, no watermark, no frame labels, no grid lines.
Use readable stylized fantasy pixel-inspired illustration suitable for a Phaser auto-battler at small battle scale.
Avoid using #00ff00 anywhere in the character.

Subject: dark robed enemy mage, black-purple robe, skull-like or shadowed face, crooked staff, purple-black magic energy.
Action row details: idle hovering or swaying caster stance; attack small dark bolt gesture; cast larger dark spell wind-up; hurt broken spell posture; death dissolve into shadow.
Composition: full body visible in every frame, side-view, facing left.
```

Save as:

```text
assets-src/ai-sprites/units/first-batch/enemy_dark_mage_spritesheet_source.png
```

- [ ] **Step 9: Generate `enemy_dragon`**

Prompt:

```text
Create a production-ready fantasy game boss spritesheet on a perfectly flat solid #00ff00 chroma-key background for background removal.
The sheet must be exactly a 4 columns x 5 rows grid, 20 frames total.
Each frame is a side-view battle sprite pose with generous padding and no clipping.
Rows from top to bottom: idle, attack, cast, hurt, death.
Each row has 4 sequential animation frames showing visible progression; no row may repeat the exact same pose.
Keep the creature centered within each cell, consistent scale across frames, transparent-ready clean edges, no shadows, no gradients, no text, no watermark, no frame labels, no grid lines.
Use readable stylized fantasy pixel-inspired illustration suitable for a Phaser auto-battler at small battle scale.
Avoid using #00ff00 anywhere in the creature.

Subject: imposing black fire dragon boss, large wings folded enough to fit frame, horns, heavy claws, ember-red accents, much more massive silhouette than normal enemies.
Action row details: idle heavy breathing with slight wing flex; attack claw, bite, or tail motion; cast fire breath or boss flame magic; hurt powerful flinch while staying massive; death slower heavy collapse.
Composition: full body visible in every frame, side-view, facing left, boss-scale but not clipped.
```

Save as:

```text
assets-src/ai-sprites/units/first-batch/enemy_dragon_spritesheet_source.png
```

- [ ] **Step 10: Commit source images after visual spot check**

Before committing, inspect each source image and confirm it has 20 cells, no text, and a flat green background. Then run:

```bash
git add assets-src/ai-sprites/units/first-batch
git commit -m "art: add first batch unit sprite sources"
```

---

### Task 4: Remove Chroma-Key Backgrounds and Verify Runtime PNGs

**Files:**
- Create: `public/assets/units/first-batch/*_spritesheet.png`
- No code changes

- [ ] **Step 1: Process all first-batch source images**

Run one command per source image. Example for `hero_archer`:

```powershell
python "C:\Users\Administrator\.codex\skills\.system\imagegen\scripts\remove_chroma_key.py" `
  --input assets-src\ai-sprites\units\first-batch\hero_archer_spritesheet_source.png `
  --out public\assets\units\first-batch\hero_archer_spritesheet.png `
  --auto-key border `
  --soft-matte `
  --transparent-threshold 12 `
  --opaque-threshold 220 `
  --despill
```

Repeat with these output pairs:

```text
assets-src/ai-sprites/units/first-batch/hero_mage_spritesheet_source.png -> public/assets/units/first-batch/hero_mage_spritesheet.png
assets-src/ai-sprites/units/first-batch/hero_priest_spritesheet_source.png -> public/assets/units/first-batch/hero_priest_spritesheet.png
assets-src/ai-sprites/units/first-batch/hero_rogue_spritesheet_source.png -> public/assets/units/first-batch/hero_rogue_spritesheet.png
assets-src/ai-sprites/units/first-batch/enemy_goblin_spritesheet_source.png -> public/assets/units/first-batch/enemy_goblin_spritesheet.png
assets-src/ai-sprites/units/first-batch/enemy_skeleton_archer_spritesheet_source.png -> public/assets/units/first-batch/enemy_skeleton_archer_spritesheet.png
assets-src/ai-sprites/units/first-batch/enemy_dark_mage_spritesheet_source.png -> public/assets/units/first-batch/enemy_dark_mage_spritesheet.png
assets-src/ai-sprites/units/first-batch/enemy_dragon_spritesheet_source.png -> public/assets/units/first-batch/enemy_dragon_spritesheet.png
```

- [ ] **Step 2: Verify runtime image dimensions and alpha**

Run:

```powershell
Add-Type -AssemblyName System.Drawing
$files = @(
  'hero_archer_spritesheet.png',
  'hero_mage_spritesheet.png',
  'hero_priest_spritesheet.png',
  'hero_rogue_spritesheet.png',
  'enemy_goblin_spritesheet.png',
  'enemy_skeleton_archer_spritesheet.png',
  'enemy_dark_mage_spritesheet.png',
  'enemy_dragon_spritesheet.png'
)
foreach ($file in $files) {
  $full = Join-Path 'public\assets\units\first-batch' $file
  $bmp = [System.Drawing.Bitmap]::new((Resolve-Path $full))
  try {
    if ($bmp.Width -ne 1280 -or $bmp.Height -ne 1280) {
      throw "$file must be 1280x1280, got $($bmp.Width)x$($bmp.Height)"
    }
    $corners = @(
      $bmp.GetPixel(0, 0).A,
      $bmp.GetPixel($bmp.Width - 1, 0).A,
      $bmp.GetPixel(0, $bmp.Height - 1).A,
      $bmp.GetPixel($bmp.Width - 1, $bmp.Height - 1).A
    )
    if (($corners | Where-Object { $_ -ne 0 }).Count -gt 0) {
      throw "$file corners are not transparent"
    }
  } finally {
    $bmp.Dispose()
  }
}
Write-Host 'first batch runtime spritesheets verified'
```

Expected: `first batch runtime spritesheets verified`.

- [ ] **Step 3: Commit runtime images**

```bash
git add public/assets/units/first-batch
git commit -m "art: add first batch runtime unit sprites"
```

---

### Task 5: Run Build, Tests, and Battle Review

**Files:**
- No file changes unless visual review finds an asset that needs regeneration

- [ ] **Step 1: Run targeted sprite tests**

```bash
npx vitest run tests/systems/UnitSpriteAssets.test.ts tests/systems/UnitAnimationSystem.test.ts tests/entities/UnitAnimationBehavior.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run production build**

```bash
npm run build
```

Expected: PASS. The existing Phaser chunk size warning is acceptable.

- [ ] **Step 3: Run full tests**

```bash
npm test
```

Expected: PASS.

- [ ] **Step 4: Review in the running game**

Open the local dev server and start battles that include first-batch units. Confirm:

```text
hero_archer: idle, attack, cast, hurt, death are visible and not clipped
hero_mage: idle, attack, cast, hurt, death are visible and not clipped
hero_priest: idle, attack, cast, hurt, death are visible and not clipped
hero_rogue: idle, attack, cast, hurt, death are visible and not clipped
enemy_goblin: idle, attack, cast, hurt, death are visible and not clipped
enemy_skeleton_archer: idle, attack, cast, hurt, death are visible and not clipped
enemy_dark_mage: idle, attack, cast, hurt, death are visible and not clipped
enemy_dragon: idle, attack, cast, hurt, death are visible, boss scale is readable, and UI is not covered
```

- [ ] **Step 5: Regenerate failed assets once per issue**

If a unit fails review, regenerate only that unit with a targeted correction. Example correction prompt:

```text
Regenerate the same spritesheet, preserving the same character identity and 4 columns x 5 rows layout, but fix this issue: the attack row is too static and needs clearer motion across all four frames.
Keep the flat #00ff00 chroma-key background and all previous constraints.
```

After regeneration, rerun Task 4 for that unit and repeat Task 5 checks.

- [ ] **Step 6: Final commit for any review fixes**

```bash
git add assets-src/ai-sprites/units/first-batch public/assets/units/first-batch src/systems/UnitSpriteAssets.ts tests/systems/UnitSpriteAssets.test.ts
git commit -m "feat: add first batch authored unit animations"
```

Use this commit only for final changed files that were not already committed in earlier steps.

---

## Self-Review Checklist

- Spec coverage: first-batch unit list, spritesheet format, generation workflow, runtime registry, fallback preservation, tests, and visual acceptance are all covered by Tasks 1-5.
- Open item scan: this plan contains no incomplete steps; every generated unit has an explicit prompt and file path.
- Type consistency: `getAllUnitSpriteSheets`, `UnitSpriteSheetConfig`, `spriteKey`, `textureKey`, and frame names match the existing TypeScript runtime.
