# v1.25 Phase B3+B4 — Enemy AI Behaviors + Difficulty Affix System

## Overview

Two subsystems in one release:
1. **Enemy AI Behaviors** — 5 enumerated AI strategies (`aiType`) replacing uniform role-based targeting
2. **Difficulty Affixes** — 10 random combat modifiers on elite/boss nodes, visible on map

**Goal:** Make each encounter feel distinct. AI behaviors add strategic depth (enemies that focus healers, protect allies). Affixes add per-run variety (this boss regenerates; that elite reflects damage).

---

## §1: Enemy AI Behavior System

### Data Layer

`EnemyData` gains an optional field:

```typescript
type AIType = 'default' | 'aggressive' | 'defensive' | 'disruptor' | 'berserker';
```

| aiType | Target Selection Strategy | Typical Enemies |
|--------|--------------------------|-----------------|
| `default` | Existing role-based logic (tank→nearest, melee_dps→lowest_hp, ranged_dps→highest_threat, healer→lowest_hp_ally). Fallback when field is absent. | slime, goblin, fire_lizard, ice_wolf, light_sprite |
| `aggressive` | Always target lowest HP unit, ignoring role preference | orc_warrior, fire_elemental, elemental_chimera |
| `defensive` | Prioritize units attacking the lowest-HP ally (+0.5 score bonus) | frost_giant, holy_guardian, frost_sentinel |
| `disruptor` | Prioritize back-row roles: ranged_dps, healer, support (+0.5 score bonus) | dark_cultist, shadow_wraith, void_weaver |
| `berserker` | Below 50% HP → switch to aggressive + inject attackSpeed buff. Above 50% → default. | flame_knight, flame_construct |

### Boss AI Assignments

| Boss | aiType | Rationale |
|------|--------|-----------|
| dragon_boss | `aggressive` | Relentless fire-breather, always targets weakest |
| frost_queen | `defensive` | Protects minions, punishes attackers of her allies |
| thunder_titan | `berserker` | Enters rage mode at low HP |
| shadow_lord | `disruptor` | Assassin archetype, hunts back-row |
| heart_of_the_forge | `defensive` | Construct guardian, shields allies |

### Implementation in TargetingSystem

Modify `TargetingSystem.selectTarget()`:

```
selectTarget(unit, potentialTargets):
  // Taunt ALWAYS takes precedence (unchanged)
  if taunted: return tauntSource

  // Check staleness cache (unchanged)
  if cachedTarget alive && in range && < 500ms: return cached

  if unit.aiType exists AND unit is Enemy:
    switch aiType:
      'aggressive':  → score all by lowest_hp (ignore unit.role)
      'defensive':   → base role score + 0.5 bonus for attackers of lowest-HP ally
      'disruptor':   → base role score + 0.5 bonus for backRow roles
      'berserker':   → if currentHp < 50% maxHp: score by lowest_hp
                       else: fall through to role-based
      'default':     → fall through

  // Existing role-based scoring (unchanged)
  ...
```

**Constraints:**
- `aiType` is optional; absent = `default`. Zero-impact on existing enemies.
- Scoring remains O(n) single-pass, only weights change.
- Berserker's attackSpeed buff: inject once via `StatusEffect` when crossing 50% threshold. Use a `Set<string>` to track already-triggered units (prevent re-injection on heal-back-above-threshold scenarios).
- Element advantage bonus (+0.3) and formation bonus still apply on top of AI scoring.

### Enemy Assignment Summary

10 enemies get non-default AI out of 28 total:
- 5 bosses: all assigned
- 5 regular enemies: orc_warrior, fire_elemental, elemental_chimera (aggressive), dark_cultist, shadow_wraith, void_weaver (disruptor), frost_giant, holy_guardian, frost_sentinel (defensive), flame_knight, flame_construct (berserker)

Remaining 18 enemies keep `default` (field omitted from JSON).

---

## §2: Affix Data & System Architecture

### AffixData Interface

```typescript
type AffixId = string;

interface AffixData {
  id: AffixId;
  name: string;           // Chinese display name
  shortDesc: string;      // ≤6 chars for NodeTooltip (e.g. "攻+20%")
  description: string;    // Full Chinese description
  category: 'offensive' | 'defensive' | 'special';
  symbol: string;         // Single-char marker for UI (e.g. "★", "▲", "●")
  symbolColor: string;    // Hex color: red=offensive, blue=defensive, purple=special
  params: Record<string, number>;  // Effect-specific parameters
}
```

### 10 Affixes

| ID | name | shortDesc | symbol | category | params | Implementation |
|----|------|-----------|--------|----------|--------|---------------|
| `berserk` | 狂暴 | 攻+20% | ★ | offensive | `{ attackBonus: 0.2 }` | battle:start → buff StatusEffect (+attack%) on all enemies |
| `swift` | 迅捷 | 攻速+30% | ★ | offensive | `{ speedBonus: 0.3 }` | battle:start → buff StatusEffect (+attackSpeed%) on all enemies |
| `splitting` | 分裂 | 溅射40% | ★ | offensive | `{ splashRatio: 0.4 }` | unit:damage listener → deal splash to nearest ally of target |
| `regeneration` | 再生 | 回血2%/s | ▲ | defensive | `{ healPercent: 0.02, interval: 1.0 }` | tick timer → heal each enemy 2% maxHp per second |
| `shielded` | 护盾 | +20%临时HP | ▲ | defensive | `{ shieldPercent: 0.2 }` | battle:start → add 20% maxHp to currentHp (capped at maxHp + shield) |
| `fortified` | 坚韧 | 防+25% | ▲ | defensive | `{ defenseBonus: 0.25 }` | battle:start → buff StatusEffect (+defense%) on all enemies |
| `reflective` | 反射 | 反弹15% | ● | special | `{ reflectRatio: 0.15 }` | unit:damage listener → deal 15% of damage back to attacker |
| `elemental` | 元素亲和 | 元素+25% | ● | special | `{ elementBonus: 0.25 }` | Formula modifier → DamageSystem queries getAffixElementBonus() |
| `vengeful` | 复仇 | 低血+35%攻 | ● | special | `{ hpThreshold: 0.4, attackBonus: 0.35 }` | tick check → inject/remove conditional buff below/above 40% HP |
| `deathburst` | 亡语 | 死亡爆炸 | ● | special | `{ damagePercent: 0.08 }` | unit:kill listener → deal 8% of dead enemy's maxHp to all heroes |

### AffixSystem Singleton

```
class AffixSystem {
  private static instance: AffixSystem;

  private activeAffixes: AffixData[] = [];
  private enemies: Enemy[] = [];
  private listeners: Map<string, (...args: any[]) => void> = new Map();
  private timers: { regenTimer: number; vengefulChecked: Set<string> } = ...;
  private berserkerTriggered: Set<string> = new Set();  // for vengeful one-shot

  activate(affixIds: string[], enemies: Enemy[]): void
    // Load AffixData from affixes.json
    // Buff type: inject StatusEffect on each enemy
    // Listener type: register EventBus handlers (unit:damage, unit:kill)
    // Timer type: initialize tick counters
    // Shielded: directly modify currentHp

  tick(delta: number): void
    // regeneration: heal interval check
    // vengeful: HP threshold check + conditional buff inject/remove

  deactivate(): void
    // Remove all EventBus listeners (stored refs)
    // Clear all state

  // Formula query interfaces
  getAffixElementBonus(): number      // for 'elemental' affix
  hasAffix(id: string): boolean       // general query
}
```

**Responsibility boundary:** AffixSystem ONLY manages enemy-side combat modifiers. It does NOT interfere with skills, synergies, relics, or ActModifierSystem.

### Integration Points

- `DamageSystem`: Query `AffixSystem.getAffixElementBonus()` for elemental affix
- `splitting` and `reflective`: Handled via unit:damage EventBus listener inside AffixSystem
- `deathburst`: Handled via unit:kill EventBus listener inside AffixSystem
- Damage dealt by affixes (splash, reflect, deathburst) emits proper `unit:damage` events for DamageNumber display

### Throttle Rule

Same affix effect on the same unit throttled to once per 150ms, preventing visual flicker from reflective/deathburst chain reactions.

---

## §3: Map Generation & Affix Assignment

### Affix Count by Difficulty

New constant in `src/config/balance.ts`:

```typescript
export const AFFIX_COUNT: Record<string, { elite: number; boss: number }> = {
  normal:    { elite: 0, boss: 1 },
  hard:      { elite: 1, boss: 1 },
  nightmare: { elite: 1, boss: 2 },
  hell:      { elite: 2, boss: 2 },
};
```

### MapNode Extension

```typescript
// In MapNode interface
affixes?: AffixId[];  // Assigned affix IDs for elite/boss nodes
```

### Assignment Logic in MapGenerator

After generating all nodes, for each `elite` or `boss` node:

```
for each node where type === 'elite' || type === 'boss':
  count = AFFIX_COUNT[difficulty][node.type]
  if count === 0: continue
  node.affixes = seededRng.sample(ALL_AFFIX_IDS, count)  // No-replacement sampling
```

**Constraints:**
- Only `elite` and `boss` nodes receive affixes. `battle`, `gauntlet`, `shop`, `event`, `rest` never get affixes.
- No duplicate affixes on the same node (no-replacement sampling).
- Uses `SeededRNG` for deterministic generation. Same seed + same difficulty = same affix assignment.
- `MapNode.affixes` serialized with the map via existing RunManager serialize/deserialize. No new RunState fields.
- Old saves without `affixes` field load normally (`affixes ?? []` guard).

### NodeTooltip Display

When a node has affixes, append affix info below existing tooltip content:

```
精英战斗
敌人: Lv.8 暗影刺客
★ 狂暴 攻+20%
```

- Each affix: `symbol` (colored) + `name` + `shortDesc`
- Uses `shortDesc` (≤6 chars) to fit within TOOLTIP_MAX_WIDTH (180px)
- Max 2 lines of affixes (current system cap)

---

## §4: BattleScene Integration & Combat Visuals

### Battle Start Banner

During preparing phase (500ms), display affix names at screen center:

```
         ★ 狂暴  ● 反射         ← depth 750, centered
```

- Symbols rendered via `TextFactory` with category color, `subtitle` size
- Horizontal layout for 1-2 affixes; vertical for >2 (future-proof)
- Fade: alpha 0→1 (200ms) → hold → 0 (400ms), total 1.2s
- **Not tied to battle state machine** — combat starts after 500ms regardless of banner state
- If banner still fading when combat begins, it continues its natural fadeout

### Unit Overhead Affix Icons

Elite/boss enemies display affix symbols above their head:

- Rendered as part of the **Unit overhead UI container** (same container that holds HealthBar and name)
- Positioned at y offset -12 above HealthBar
- Symbols use `tiny` font size with category color
- Moves with unit position (synced via container, not HealthBar child)
- Only elite/boss display this; regular enemies never show affix icons

### Visual Feedback on Affix Triggers

| Affix | Trigger Feedback |
|-------|-----------------|
| `splitting` | Splash target: setTintFill(white) for 100ms |
| `reflective` | Attacker: setTintFill(red) for 100ms |
| `regeneration` | Green DamageNumber on healed unit each tick |
| `deathburst` | All heroes: setTintFill(red) for 100ms |
| `vengeful` | Enemy tinted red while below HP threshold (persistent) |
| buff affixes | No extra feedback (StatusEffect visual already applies) |

All feedback reuses existing mechanisms: `setTintFill()`/`clearTint()`, `DamageNumber`, EventBus events. No new particle or animation systems.

**Throttle:** Same unit + same affix feedback: max once per 150ms.

### BattleSystem Tick Order

```
BattleSystem.updateCombat(delta):
  1. Update relic timers
  2. Reset distance cache
  3. Update combo timers
  4. Process skill queue
  5. For each unit: statusEffect tick, skill cooldowns, AI select target, attack/skill/move
  6. Separate overlapping units
  7. ActModifierSystem.tick(delta)
  8. AffixSystem.tick(delta)              ← NEW: after act modifier, before battle end check
  9. Flush damage numbers
  10. Check battle end
```

AffixSystem ticks after all combat resolution so it reads post-frame effective HP state.

### Lifecycle in BattleScene

```
BattleScene.create():
  BattleSystem.setUnits(heroes, enemies)
  RelicSystem.activateWithUnits(...)
  AffixSystem.activate(node.affixes ?? [], enemies)    ← NEW
  Show affix banner (parallel, non-blocking)

BattleScene.shutdown():
  RelicSystem.deactivate()
  AffixSystem.deactivate()                             ← NEW
```

### Gauntlet Handling

- Gauntlet nodes do not receive affixes (§3 constraint).
- AffixSystem initializes once per battle lifecycle, not per-wave.
- If future expansion adds gauntlet affixes, the activate/deactivate lifecycle naturally supports re-initialization between waves.

---

## §5: Testing Strategy & Acceptance Criteria

### Test Matrix

| Category | Coverage | Est. Count |
|----------|---------|------------|
| AI behavior | 5 aiTypes target selection correctness | ~8 |
| Affix data integrity | affixes.json field validation, ID uniqueness | ~4 |
| AffixSystem unit | activate/tick/deactivate lifecycle, each affix effect | ~12 |
| Map generation | Affix count by difficulty, SeededRNG determinism, node type protection | ~5 |
| Integration | BattleScene affix pass-through, save compat, difficulty config | ~4 |
| **Total new tests** | | **~33** |

### AI Behavior Tests

```
describe('TargetingSystem AI behaviors')
  'default aiType uses existing role-based targeting'
  'aggressive always targets lowest HP enemy'
  'defensive prioritizes attacker of lowest-HP ally'
  'disruptor prioritizes backRow roles (ranged_dps/healer/support)'
  'berserker switches to aggressive below 50% HP'
  'berserker uses default above 50% HP'
  'taunt overrides all aiType strategies'
  'aiType undefined defaults to role-based'
```

### AffixSystem Unit Tests

```
describe('AffixSystem')
  describe('lifecycle')
    'activate registers effects for given affix IDs'
    'deactivate clears all listeners and state'
    'tick updates timers correctly'
  describe('buff affixes')
    'berserk injects +20% attack buff on all enemies'
    'swift injects +30% attackSpeed buff on all enemies'
    'fortified injects +25% defense buff on all enemies'
    'shielded adds 20% maxHp temporary HP at battle start'
  describe('reactive affixes')
    'splitting deals 40% splash to adjacent target'
    'reflective reflects 15% damage back to attacker'
    'deathburst deals 8% maxHp damage to all heroes on enemy death'
  describe('periodic affixes')
    'regeneration heals 2% maxHp per second'
    'vengeful activates +35% attack below 40% HP'
    'vengeful deactivates above 40% HP threshold'
```

### Map Generation Tests

```
describe('MapGenerator affix assignment')
  'normal difficulty: elite gets 0 affixes, boss gets 1'
  'hell difficulty: elite gets 2 affixes, boss gets 2'
  'battle nodes never receive affixes'
  'same seed produces same affix assignment'
  'no duplicate affixes on same node'
```

### Save Compatibility Tests

```
describe('affix save compatibility')
  'old save without node.affixes loads without error'
  'node.affixes survives serialize/deserialize cycle'
  'MapNode with empty affixes array treated as no affixes'
  'BattleScene handles undefined node.affixes gracefully'
```

### Acceptance Criteria

1. 10+ enemies have non-default aiType, all 5 bosses assigned
2. 10 affixes fully implemented with correct effects
3. Elite/boss nodes receive correct affix count per difficulty
4. NodeTooltip displays affix symbol + shortDesc within 180px width
5. Battle start banner plays parallel to preparing phase, does not block combat
6. All affix effects function in battle (buff/reflect/splash/regen/deathburst/vengeful/elemental/shielded)
7. AffixSystem.deactivate() fully cleans up — no EventBus listener leaks
8. Old saves without `affixes` field load without error
9. SeededRNG determinism: same seed + same difficulty = same affix assignment
10. Affix visual feedback throttled at 150ms per unit per effect
11. All existing 1100 tests unaffected
12. Zero TS errors, `npx tsc --noEmit && npm test` passes

---

## File Map

| File | Responsibility |
|------|---------------|
| `src/types/index.ts` | AIType, AffixId, AffixData interface, EnemyData.aiType, MapNode.affixes |
| `src/config/balance.ts` | AFFIX_COUNT constant |
| `src/constants.ts` | Re-export AFFIX_COUNT |
| `src/data/enemies.json` | Add aiType field to 10+ enemies |
| `src/data/affixes.json` | NEW: 10 affix entries |
| `src/systems/AffixSystem.ts` | NEW: Affix lifecycle management singleton |
| `src/systems/TargetingSystem.ts` | AI behavior scoring by aiType |
| `src/systems/MapGenerator.ts` | Affix assignment on elite/boss nodes |
| `src/systems/DamageSystem.ts` | Query AffixSystem.getAffixElementBonus() |
| `src/ui/NodeTooltip.ts` | Display affix symbol + shortDesc |
| `src/scenes/BattleScene.ts` | AffixSystem activate/deactivate + banner |
| `src/systems/BattleSystem.ts` | AffixSystem.tick() in updateCombat |
| `src/i18n.ts` | Affix-related UI strings (banner, warnings) |
| `tests/systems/TargetingSystem.test.ts` | AI behavior tests |
| `tests/systems/AffixSystem.test.ts` | NEW: Affix lifecycle + effect tests |
| `tests/systems/MapGenerator.test.ts` | Affix assignment tests |
| `tests/data/affix-integrity.test.ts` | NEW: Data validation tests |
| `tests/integration/affix-save.test.ts` | NEW: Save compat tests |
