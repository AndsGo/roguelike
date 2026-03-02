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

### UI Patterns

- **Modal panel pattern:** backdrop at depth 799 (bounds-check close) + `Panel` at depth 800 + close button at depth 801. Detail popups at 802+.
- **Button:** fires callback on `pointerup` (not pointerdown) with distance check <20px to allow drag-to-cancel.
- **Panel:** scrollable container with wheel + drag + scrollbar. Has `clearContent()` for tab switching.
- **Container origin gotcha:** `container.setSize(w,h) + setInteractive()` auto-sets origin=0.5. Hit area must use `Rectangle(0,0,w,h)` not `Rectangle(-w/2,-h/2,w,h)`.

### Data Files

All game content is in `src/data/` as JSON: heroes (19), enemies (21), skills (46), items (48), relics (35), events (34), achievements (25), acts (3). Type interfaces in `src/types/index.ts`.

### Seeded RNG

`SeededRNG` (Mulberry32) for deterministic map generation, shops, events. Supports `getState()`/`fromState()` for save/load reproducibility.

## Testing

**Framework:** Vitest in Node environment. Phaser is completely mocked via `tests/mocks/phaser-stub.ts` (aliased in vitest.config.ts). No browser needed.

**Phaser stub provides:** Scene, Container, Graphics, Text, Image, Rectangle, Zone, Circle, Particles. `Graphics.generateTexture()` registers keys in `scene.textures._keys`. Tweens execute `onComplete` synchronously.

**Test helpers:** `tests/helpers/scene-harness.ts` — `createScene()`, `tickFrames()`, `findText()`.

**44 test suites, 615 tests.** Key test categories:
- Content integrity (cross-reference validation between heroes/skills/items)
- Manager unit tests (RunManager, SaveManager, MetaManager, StatsManager)
- System tests (BattleEffects, DamageSystem, StatusEffects, Difficulty)
- Integration (battle flow, save/load cycle, codex data)

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
