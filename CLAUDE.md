# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Vite dev server (port 3000, auto-open)
npm run build        # tsc --noEmit + vite build (production)
npm test             # vitest run (all tests)
npm test -- tests/managers/meta-codex.test.ts   # single test file
npm run preview      # preview production build locally
```

TypeScript strict mode is enforced. Always run `npx tsc --noEmit` before committing.

## Architecture

**Tech:** TypeScript + Phaser 3 + Vite. 800x450 pixel art canvas. All UI is Phaser GameObjects (no DOM). Chinese localization only (`src/i18n.ts`).

### Core Loop

```
MainMenuScene → HeroDraftScene → MapScene ──┐
    ↑                                        │
    └── GameOver/Victory ← BattleScene ←─────┤
                             ShopScene ←──────┤
                             EventScene ←─────┤
                             RestScene ←──────┘
```

### Key Singletons

- **RunManager** — Current run state (heroes, gold, map position, relics, synergies, difficulty). Serializable for save/load.
- **MetaManager** — Cross-run progression: hero unlocks, permanent upgrades, meta currency, enemy encounter tracking (codex). Static methods on singleton.
- **SaveManager** — 3 save slots, localStorage, checksum validation. `saveMeta()`/`loadMeta()` for meta progression.
- **EventBus** — Type-safe pub/sub (`GameEventMap` with 25+ events). **Must call `.off()` in scene `shutdown()` to prevent listener leaks.**

### Battle System Pipeline

`BattleSystem` orchestrates combat. Key subsystems:
- **DamageSystem** — `base × defMod × critMod × elementMod × comboMod × variance(±10%)`
- **SkillSystem** — Cooldown-based skills with targeting, advancement tracking
- **TargetingSystem** — O(n) scoring with typed arrays + 500ms staleness cache
- **ElementSystem** — fire>ice>lightning>fire cycle, dark↔holy mutual. 4 reactions (ignite/freeze/shock/decay)
- **SynergySystem** — 6 race + 6 class + 5 element synergies with threshold-based bonuses
- **StatusEffectSystem** — DoT, HoT, stun, taunt, buff/debuff

### Entity Hierarchy

`Unit` (Container with Image sprite) → `Hero` (level/exp/equipment/event bonuses) → `Enemy` (boss flag, AI)

**Effective stats pipeline:** `baseStats + (scalingPerLevel × level) + synergyBonuses + eventStatBonuses + buff/debuff`

### Pixel Rendering

Units are 16×20 pixel grids composited from layered templates (`src/data/pixel-templates.ts`): body (by role) + head (by race) + face + weapon (by class) + crown (boss). Palette-mapped at runtime, rendered once to texture via `Graphics.generateTexture()`, displayed as `Phaser.GameObjects.Image`. Flash effects use `setTintFill()`/`clearTint()`.

- `getOrCreateTexture(scene, ChibiConfig)` — cached by config hash
- Scale: 2x normal (32×40), 2x+4 tank (36×44), 3x boss (48×69)

**Authored spritesheets** (`public/assets/units/`, configs in `src/systems/UnitSpriteAssets.ts`) are preferred over chibi when loaded. They are **NOT preloaded at boot** (~24MB total): `BattleScene.preload()` queues only the sheets that battle needs (party heroes + current act's enemy/boss pools) via `queueUnitSpriteSheets()`. Anything missing falls back to chibi automatically — under-loading is safe. New sheets must be run through `node scripts/compress-sprites.mjs` (256-color palette quantization).

### Mobile Adaptation

- **No hover-only or right-click-only UI.** Use `attachPressInteraction(scene, target, {onTap, onShowInfo, onHideInfo, onSecondary})` from `src/ui/PressInteraction.ts`: desktop hover → info, touch long-press (350ms) → info/secondary, right-click → secondary, tap → action. Don't hand-roll pointerdown/up distance checks.
- **Touch detection:** `isTouchDevice()` / `tapTolerance()` (35px touch, 20px mouse) in `src/utils/device.ts`. Tests force results via `__setTouchDeviceForTest()`.
- **Text scale:** touch devices default to `textScale: 1.25` (set in `Theme.getAccessibility()`, applied inside TextFactory). Any fixed-size layout must tolerate 1.5×: advance rows by measured `text.height`, clamp labels with scale-to-fit (see `Button.fitLabel()`), don't hardcode row spacing tighter than the scaled line height.
- **Touch targets:** ≥52 game px (≈44 CSS px at phone FIT scale). `Button` auto-expands its hit area on touch; for raw hit zones, size them explicitly.
- **Canvas centering:** Phaser `CENTER_BOTH` centers inside `#game-container` — do NOT add flex centering to that container (double-centering skews the canvas). Safe-area insets are handled as container padding in index.html.

### UI Patterns

- **Modal panel pattern:** backdrop at depth 799 (bounds-check close) + `Panel` at depth 800 + close button at depth 801. Detail popups at 802+.
- **Button:** fires callback on `pointerup` (not pointerdown) with distance check (`tapTolerance()`: 20px mouse / 35px touch) to allow drag-to-cancel. Long labels auto-shrink to fit.
- **Panel:** scrollable container with wheel + drag (10px touch threshold) + flick inertia + scrollbar. Has `clearContent()` for tab switching.
- **Container origin gotcha:** `container.setSize(w,h) + setInteractive()` auto-sets origin=0.5. Hit area must use `Rectangle(0,0,w,h)` not `Rectangle(-w/2,-h/2,w,h)`.

### Data Files

All game content is in `src/data/` as JSON: heroes (26), enemies (28), skills (93), items (52), relics (48), events (49), achievements (26), acts (4). Type interfaces in `src/types/index.ts`.

### Seeded RNG

`SeededRNG` (Mulberry32) for deterministic map generation, shops, events. Supports `getState()`/`fromState()` for save/load reproducibility.

## Testing

**Framework:** Vitest in Node environment. Phaser is completely mocked via `tests/mocks/phaser-stub.ts` (aliased in vitest.config.ts). No browser needed.

**Phaser stub provides:** Scene, Container, Graphics, Text, Image, Rectangle, Zone, Circle, Particles. `Graphics.generateTexture()` registers keys in `scene.textures._keys`. Tweens execute `onComplete` synchronously.

**Test helpers:** `tests/helpers/scene-harness.ts` — `createScene()`, `tickFrames()`, `findText()`.

**99 test suites, 1198 tests.** Key test categories:
- Content integrity (cross-reference validation between heroes/skills/items)
- Manager unit tests (RunManager, SaveManager, MetaManager, StatsManager)
- System tests (BattleEffects, DamageSystem, StatusEffects, Difficulty)
- Integration (battle flow, save/load cycle, codex data)
- Mobile interaction (device detection, PressInteraction gesture state machine)

**DamageNumber is a pooled static factory** (`DamageNumber.spawn(...)`, not `new`). Tests that mock it must mock `{ DamageNumber: { spawn: vi.fn() } }`.

## Key Types

```typescript
UnitRole:    'tank' | 'melee_dps' | 'ranged_dps' | 'healer' | 'support'
ElementType: 'fire' | 'ice' | 'lightning' | 'dark' | 'holy'
RaceType:    'human' | 'elf' | 'undead' | 'demon' | 'beast' | 'dragon'
ClassType:   'warrior' | 'mage' | 'ranger' | 'cleric' | 'assassin' | 'paladin'
NodeType:    'battle' | 'elite' | 'boss' | 'shop' | 'event' | 'rest'
```

## Gotchas

- **EventBus listener cleanup:** Every scene must remove its EventBus listeners in `shutdown()`. Forgetting causes duplicate handlers and ghost behavior.
- **Legacy save migration:** New fields on `MetaProgressionData` must use `?? defaultValue` guards since old saves won't have them. See `encounteredEnemies ?? []` pattern in MetaManager.
- **Phaser Container hit areas:** See "Container origin gotcha" above. This has caused bugs in Panel.ts and Button.ts.
- **Constants re-export:** `src/constants.ts` re-exports from `src/config/balance.ts` for backward compatibility. New constants go in `src/config/balance.ts`.

---

# Claude Code Game Studios (CCGS)

This project has the [Claude Code Game Studios](https://github.com/Donchitos/Claude-Code-Game-Studios)
studio agent system installed under `.claude/`: **49 specialized subagents**, **73 slash commands**,
**11 path-scoped rules**, and document templates in `.claude/docs/templates/`. Run `/start` for guided
onboarding or `/help` for "what should I do next". Type `/` to browse commands — e.g. `/brainstorm`,
`/design-system`, `/create-stories`, `/dev-story`, `/code-review`, `/balance-check`, `/team-combat`.

> **Intentionally NOT installed:** the CCGS `settings.json`, `hooks/`, and `statusline.sh`. This
> project's permissions, hooks, and statusline are unchanged.

## Stack adaptation (important)

CCGS ships configured for native engines (Godot / Unity / Unreal). **This project is the exception:
TypeScript + Phaser 3 + Vite (web).** Therefore:

- The **Architecture / Commands / Testing sections above take precedence** over any CCGS doc. Where
  CCGS docs assume a different layout (`src/gameplay/**`, `design/gdd/`, `tests/unit/`,
  `docs/architecture/` ADRs, engine CI commands), map them onto this repo's real structure: `src/`
  (scenes / systems / entities / data), Vitest in `tests/`, balance config in `src/config/balance.ts`.
- **Ignore the engine-specialist agents** (`godot-*`, `unity-*`, `unreal-*`) — they don't apply to
  Phaser. The engine-agnostic agents (directors, leads, design / QA / production / release
  specialists) and the process skills are the usable part.
- `.claude/docs/coding-standards.md` and `.claude/docs/directory-structure.md` are **reference-only**
  here — they describe the generic engine template, not this codebase.

## Collaboration Protocol

CCGS agents are collaborative, not autonomous. Every task follows:
**Question → Options → Decision → Draft → Approval.**

- Ask before writing files; present 2–4 options with trade-offs; the user decides.
- Show drafts / summaries before finalizing; multi-file changes need explicit approval.
- No commits without user instruction.

## Coordination Rules

@.claude/docs/coordination-rules.md
