# Codex Feature Design (英雄图鉴 & 怪物图鉴)

**Date:** 2026-03-02
**Branch:** v1.1.0

## Overview

Add a Codex (图鉴) feature accessible from the main menu. A single modal panel with two tabs allows players to browse all heroes and monsters they've encountered, view stats, skills, and unlock conditions.

## User Decisions

- **Entry point:** New "图鉴" button on MainMenuScene
- **Monster unlock:** Encounter-based (遇见即解锁) — recorded when enemy appears in battle
- **Detail content:** Basic info (name, race, class, element, role, stats) + skills list

## Architecture

```
MainMenuScene
  └─ "图鉴" Button → opens CodexPanel

CodexPanel (600×400 modal, depth 799-801)
  ├─ Tab bar: [英雄图鉴] [怪物图鉴]
  ├─ Scrollable card grid (5 columns)
  │   └─ CodexCard × N
  │       ├─ Unlocked: chibi sprite + name
  │       └─ Locked: "???" silhouette
  └─ Click card → CodexDetailPopup overlay

CodexDetailPopup (500×350 overlay)
  ├─ Left: large chibi sprite (3x scale)
  ├─ Right: name, race/class/element/role, base stats table
  ├─ Bottom: skills list with descriptions
  └─ Close button
```

## Data Flow

### Hero Codex
- Heroes are always fully visible (all 19 heroes shown)
- Data source: `HEROES` array from `src/data/heroes.ts`
- Locked heroes (not yet unlocked via MetaManager) show with a lock icon + unlock condition text
- Unlocked heroes show full detail on click

### Monster Codex
- Monsters unlock when encountered in battle
- Data source: `ENEMIES` array from `src/data/enemies.ts`
- Encounter tracking: `MetaManager.encounteredEnemies: string[]` (persisted via SaveManager)
- `MetaManager.recordEnemyEncounter(enemyId)` called from BattleScene when enemies spawn
- Unencountered monsters show as "???" with silhouette

## MetaManager Extension

```ts
// New field in MetaProgressData
encounteredEnemies: string[]   // enemy IDs that have been seen

// New methods
recordEnemyEncounter(enemyId: string): void
hasEncounteredEnemy(enemyId: string): boolean
getEncounteredEnemies(): string[]
```

## UI Components

### CodexPanel (`src/ui/CodexPanel.ts`)
- Extends the existing modal panel pattern (backdrop d799 + Panel d800 + close btn d801)
- Two tab buttons at top, active tab highlighted
- Card grid: 5 columns, ~100px per card, scrollable if needed
- Cards use chibi textures from UnitRenderer (same `getOrCreateTexture()`)
- Accepts `onClose` callback to destroy and return to main menu

### CodexDetailPopup (`src/ui/CodexDetailPopup.ts`)
- Overlays on top of CodexPanel (depth 802+)
- Left side: 3x scale chibi sprite
- Right side: info fields as Phaser.Text objects
- Stats displayed as labeled rows (HP, ATK, DEF, SPD, etc.)
- Skills section: skill name + description for each skill the unit has
- For heroes: show unlock condition if locked
- For monsters: show element reactions, drops/rewards if applicable

## i18n Additions (`src/i18n.ts`)

```ts
UI.codex = {
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
}
```

## Files Summary

| File | Action | Description |
|------|--------|-------------|
| `src/ui/CodexPanel.ts` | NEW | Main codex modal with tabs + card grid |
| `src/ui/CodexDetailPopup.ts` | NEW | Detail overlay for selected unit |
| `src/managers/MetaManager.ts` | MODIFY | Add enemy encounter tracking |
| `src/scenes/MainMenuScene.ts` | MODIFY | Add "图鉴" button |
| `src/scenes/BattleScene.ts` | MODIFY | Call `recordEnemyEncounter()` on battle start |
| `src/i18n.ts` | MODIFY | Add codex UI strings |
| `tests/` | NEW/MODIFY | Tests for MetaManager + CodexPanel |
