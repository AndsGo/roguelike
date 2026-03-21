# Visual Differentiation Phase 3 — Animation Differentiation + Elite Integration

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the visual differentiation trilogy: role/monsterType-specific animation rhythms for attack/hit/idle, elite enemy activation in BattleScene, and boss health bar phase notch marks.

**Architecture:** `UnitAnimationSystem` gets role/monsterType-aware animation parameters (different durations, distances, scales for tank vs assassin vs beast vs construct). `BattleScene` calls `setElite()` on enemies for elite node battles. Boss `HealthBar` draws phase threshold notches by reading `BossPhaseSystem` config. All changes are parameter-driven — no new systems, just differentiated constants.

**Tech Stack:** TypeScript, Phaser 3

---

## File Map

| File | Responsibility | Tasks |
|------|---------------|-------|
| `src/systems/UnitAnimationSystem.ts` | Unit animations | Task 1 (role/monsterType-aware params) |
| `src/config/visual.ts` | Visual constants | Task 1 (animation param tables) |
| `src/scenes/BattleScene.ts` | Battle orchestration | Task 2 (setElite for elite nodes) |
| `src/components/HealthBar.ts` | Health bar rendering | Task 3 (boss phase notches) |
| `src/entities/Unit.ts` | Unit entity | Task 2 (setElite method + health bar recreation) |
| `tests/systems/UnitAnimationSystem.test.ts` | **NEW** — Animation param tests | Task 1 |

---

## Task 1: Role/MonsterType-Aware Animation Parameters

**Context:** Currently all units share identical animation timing: idle 800ms/3px, attack 80ms/30px, cast 150ms/1.2x. Design requires different "rhythms" per unit archetype:
- Tank: slow heavy hits, minimal knockback
- Assassin: fast rush, deep forward lunge
- Healer: gentle cast, slow float
- Beast monster: pounce attack, quick recovery
- Construct monster: slow heavy slam
- Caster monster: float pulse, no rush

**Files:**
- Modify: `src/config/visual.ts`
- Modify: `src/systems/UnitAnimationSystem.ts`
- Create: `tests/systems/UnitAnimationSystem.test.ts`

- [ ] **Step 1: Define animation parameter tables in visual.ts**

Add to `src/config/visual.ts`:

```typescript
// ─── Unit Animation Parameters ───
// Per-role hero animation timing
export const HERO_ANIM_PARAMS: Record<string, {
  idleDuration: number; idleDelta: number;
  attackDuration: number; attackDistance: number;
  castDuration: number; castScale: number;
}> = {
  tank:       { idleDuration: 1000, idleDelta: 2, attackDuration: 120, attackDistance: 20, castDuration: 180, castScale: 1.1 },
  melee_dps:  { idleDuration: 800,  idleDelta: 3, attackDuration: 70,  attackDistance: 35, castDuration: 150, castScale: 1.2 },
  ranged_dps: { idleDuration: 800,  idleDelta: 3, attackDuration: 60,  attackDistance: 15, castDuration: 140, castScale: 1.15 },
  healer:     { idleDuration: 1200, idleDelta: 4, attackDuration: 100, attackDistance: 10, castDuration: 200, castScale: 1.25 },
  support:    { idleDuration: 1000, idleDelta: 4, attackDuration: 90,  attackDistance: 12, castDuration: 180, castScale: 1.2 },
};

// Per-monsterType animation timing (enemies only)
export const MONSTER_ANIM_PARAMS: Record<string, {
  idleDuration: number; idleDelta: number;
  attackDuration: number; attackDistance: number;
  castDuration: number; castScale: number;
}> = {
  beast:     { idleDuration: 600,  idleDelta: 2, attackDuration: 50,  attackDistance: 40, castDuration: 120, castScale: 1.1 },
  undead:    { idleDuration: 1200, idleDelta: 2, attackDuration: 100, attackDistance: 25, castDuration: 160, castScale: 1.15 },
  construct: { idleDuration: 1400, idleDelta: 1, attackDuration: 140, attackDistance: 15, castDuration: 200, castScale: 1.05 },
  caster:    { idleDuration: 1000, idleDelta: 5, attackDuration: 80,  attackDistance: 8,  castDuration: 160, castScale: 1.3 },
  humanoid:  { idleDuration: 800,  idleDelta: 3, attackDuration: 80,  attackDistance: 30, castDuration: 150, castScale: 1.2 },
  draconic:  { idleDuration: 1000, idleDelta: 2, attackDuration: 100, attackDistance: 20, castDuration: 180, castScale: 1.15 },
};
```

Key design rationale:
- **Beast:** fastest attack (50ms) + deepest lunge (40px) = pounce feel
- **Construct:** slowest attack (140ms) + shortest lunge (15px) = heavy slam
- **Caster:** highest idle delta (5px) = noticeable float + largest cast scale (1.3x)
- **Undead:** slow jerky idle (1200ms) + moderate attack = stiff/undead feel
- **Tank hero:** slowest hero attack (120ms) + short lunge (20px) = heavy but steady

- [ ] **Step 2: Write animation param tests**

Create `tests/systems/UnitAnimationSystem.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { HERO_ANIM_PARAMS, MONSTER_ANIM_PARAMS } from '../../src/config/visual';

describe('Unit Animation Parameters', () => {
  it('defines params for all 5 hero roles', () => {
    for (const role of ['tank', 'melee_dps', 'ranged_dps', 'healer', 'support']) {
      expect(HERO_ANIM_PARAMS[role], `${role} should have anim params`).toBeDefined();
    }
  });

  it('defines params for all 6 monster types', () => {
    for (const type of ['beast', 'undead', 'construct', 'caster', 'humanoid', 'draconic']) {
      expect(MONSTER_ANIM_PARAMS[type], `${type} should have anim params`).toBeDefined();
    }
  });

  it('beast attack is faster than construct attack', () => {
    expect(MONSTER_ANIM_PARAMS.beast.attackDuration).toBeLessThan(MONSTER_ANIM_PARAMS.construct.attackDuration);
  });

  it('tank hero attack is slower than melee_dps', () => {
    expect(HERO_ANIM_PARAMS.tank.attackDuration).toBeGreaterThan(HERO_ANIM_PARAMS.melee_dps.attackDuration);
  });

  it('healer has gentler idle than melee_dps (longer duration)', () => {
    expect(HERO_ANIM_PARAMS.healer.idleDuration).toBeGreaterThan(HERO_ANIM_PARAMS.melee_dps.idleDuration);
  });

  it('caster monster has largest cast scale', () => {
    const allScales = Object.values(MONSTER_ANIM_PARAMS).map(p => p.castScale);
    expect(MONSTER_ANIM_PARAMS.caster.castScale).toBe(Math.max(...allScales));
  });
});
```

- [ ] **Step 3: Modify UnitAnimationSystem to use per-unit params**

Read `src/systems/UnitAnimationSystem.ts`. Modify the three animation methods to look up params from the unit:

**For `playIdle(unit)`:**
```typescript
import { HERO_ANIM_PARAMS, MONSTER_ANIM_PARAMS } from '../config/visual';

private getAnimParams(unit: Unit) {
  if (!unit.isHero && unit.monsterType && MONSTER_ANIM_PARAMS[unit.monsterType]) {
    return MONSTER_ANIM_PARAMS[unit.monsterType];
  }
  return HERO_ANIM_PARAMS[unit.role] ?? HERO_ANIM_PARAMS.melee_dps;
}

playIdle(unit: Unit): void {
  const params = this.getAnimParams(unit);
  this.scene.tweens.add({
    targets: unit,
    y: unit.y - params.idleDelta,  // was hardcoded 3
    duration: params.idleDuration,  // was hardcoded 800
    ease: 'Sine.easeInOut',
    yoyo: true,
    repeat: -1,
    delay: Math.random() * 400,
  });
}
```

**For `playAttack(unit, targetX)`:**
```typescript
playAttack(unit: Unit, targetX: number): void {
  const params = this.getAnimParams(unit);
  const direction = targetX > unit.x ? 1 : -1;
  const distance = Math.min(params.attackDistance, Math.abs(targetX - unit.x) * 0.3);
  this.scene.tweens.add({
    targets: unit,
    x: unit.x + direction * distance,
    duration: params.attackDuration,  // was hardcoded 80
    ease: 'Quad.easeOut',
    yoyo: true,
  });
}
```

**For `playCast(unit)`:**
```typescript
playCast(unit: Unit): void {
  const params = this.getAnimParams(unit);
  this.scene.tweens.add({
    targets: unit,
    scaleX: params.castScale,  // was hardcoded 1.2
    scaleY: params.castScale,
    duration: params.castDuration,  // was hardcoded 150
    ease: 'Sine.easeOut',
    yoyo: true,
  });
}
```

Note: `unit.monsterType` and `unit.role` are public fields already available on Unit.

- [ ] **Step 4: Run verification**

```bash
npx tsc --noEmit && npm test
```

- [ ] **Step 5: Commit**

```bash
git add src/config/visual.ts src/systems/UnitAnimationSystem.ts tests/systems/UnitAnimationSystem.test.ts
git commit -m "feat: role/monsterType-specific animation rhythms (idle/attack/cast)"
```

---

## Task 2: Activate Elite Enemy Status in BattleScene

**Context:** `Unit.setElite()` exists but is never called. BattleScene knows node type is 'elite' but doesn't set enemies as elite. Need to wire this up so elite enemies get purple health bars and ★ badges.

**Files:**
- Modify: `src/scenes/BattleScene.ts`
- Modify: `src/entities/Unit.ts` (add setElite if not present)

- [ ] **Step 1: Verify setElite exists on Unit**

Read `src/entities/Unit.ts` and check if `setElite()` method exists. If not, add it:

```typescript
setElite(): void {
  this.isElite = true;
  this.recreateHealthBar('elite');
}
```

Also ensure `isElite: boolean = false;` is declared as a public field, and `recreateHealthBar` helper exists (from Phase 2 plan). If `recreateHealthBar` doesn't exist yet, add it:

```typescript
private recreateHealthBar(style: HealthBarStyle): void {
  const hbY = this.healthBar.y;
  const oldElement = this.element;
  this.healthBar.destroy();
  this.healthBar = new HealthBar(this.scene, 0, hbY, style);
  this.add(this.healthBar);
  this.healthBar.updateHealth(this.currentHp, this.currentStats.maxHp);
  if (oldElement) this.healthBar.setElement(oldElement);
}
```

Import `HealthBarStyle` if needed.

- [ ] **Step 2: Call setElite in BattleScene for elite nodes**

Read `src/scenes/BattleScene.ts`. Find where enemies are created (look for the enemy creation loop, around line 200-210). After enemies are created and before `battleSystem.setUnits()`, add:

```typescript
// Mark enemies as elite for elite node battles
if (node.type === 'elite') {
  for (const enemy of enemies) {
    enemy.setElite();
  }
}
```

Find the exact location by searching for `node.type` or the elite tutorial trigger (`first_elite`).

- [ ] **Step 3: Run verification**

```bash
npx tsc --noEmit && npm test
```

- [ ] **Step 4: Commit**

```bash
git add src/entities/Unit.ts src/scenes/BattleScene.ts
git commit -m "feat: activate elite enemy status in BattleScene for elite nodes"
```

---

## Task 3: Boss Health Bar Phase Notches

**Context:** Boss health bars (56×7px, gold border) should show phase threshold notches — small vertical lines at HP percentages where phase transitions occur. Data comes from `boss-phases.json` via `BossPhaseSystem`.

**Files:**
- Modify: `src/components/HealthBar.ts`
- Modify: `src/entities/Unit.ts` (pass phase thresholds to health bar)
- Modify: `src/scenes/BattleScene.ts` (read phase config and pass to boss)

- [ ] **Step 1: Add phase notch rendering to HealthBar**

In `src/components/HealthBar.ts`, add a method and storage for phase thresholds:

```typescript
private phaseNotches: number[] = [];  // HP ratios where phases trigger (e.g., [0.75, 0.5, 0.25])
private notchGfx: Phaser.GameObjects.Graphics | null = null;

/** Set boss phase thresholds to draw notch marks on the health bar */
setPhaseThresholds(thresholds: number[]): void {
  this.phaseNotches = thresholds.sort((a, b) => b - a);  // descending
  this.drawNotches();
}

private drawNotches(): void {
  if (this.notchGfx) {
    this.notchGfx.destroy();
    this.notchGfx = null;
  }
  if (this.phaseNotches.length === 0) return;

  this.notchGfx = this.scene.add.graphics();
  for (const threshold of this.phaseNotches) {
    const x = -this.barWidth / 2 + this.barWidth * threshold;
    // Small vertical notch line
    this.notchGfx.lineStyle(1, 0xffd700, 0.8);
    this.notchGfx.lineBetween(x, -this.barHeight / 2 - 1, x, this.barHeight / 2 + 1);
    // Small triangle marker at top
    this.notchGfx.fillStyle(0xffd700, 0.6);
    this.notchGfx.fillTriangle(x - 2, -this.barHeight / 2 - 2, x + 2, -this.barHeight / 2 - 2, x, -this.barHeight / 2);
  }
  this.add(this.notchGfx);
}
```

- [ ] **Step 2: Add method on Unit to receive phase thresholds**

In `src/entities/Unit.ts`, add:

```typescript
/** Set boss phase thresholds for health bar notch display */
setPhaseThresholds(thresholds: number[]): void {
  this.healthBar.setPhaseThresholds(thresholds);
}
```

- [ ] **Step 3: Pass phase thresholds from BattleScene to boss units**

In `src/scenes/BattleScene.ts`, find where `BossPhaseSystem` is created (search for `BossPhaseSystem` or `boss:phase`). After the boss phase system is initialized, extract thresholds and pass to the boss unit:

```typescript
// Read boss-phases.json data
import bossPhaseData from '../data/boss-phases.json';

// After boss unit is identified (in the enemy creation or setBoss area):
if (enemyData.isBoss) {
  const phaseConfig = (bossPhaseData as any[]).find(p => p.bossId === enemyData.id);
  if (phaseConfig && phaseConfig.phases) {
    const thresholds = phaseConfig.phases.map((p: any) => p.hpPercent);
    enemy.setPhaseThresholds(thresholds);
  }
}
```

Search for where boss enemies are identified in BattleScene to find the exact insertion point.

- [ ] **Step 4: Run verification**

```bash
npx tsc --noEmit && npm test
```

- [ ] **Step 5: Commit**

```bash
git add src/components/HealthBar.ts src/entities/Unit.ts src/scenes/BattleScene.ts
git commit -m "feat: boss health bar phase notches from BossPhaseSystem thresholds"
```

---

## Execution Order

Task 1 (animation params) is independent.
Task 2 (elite activation) is independent.
Task 3 (boss phase notches) is independent.

**All 3 tasks can run in parallel** — they modify different files:
- Task 1: visual.ts + UnitAnimationSystem.ts
- Task 2: Unit.ts + BattleScene.ts
- Task 3: HealthBar.ts + Unit.ts (setPhaseThresholds) + BattleScene.ts

**Conflict note:** Tasks 2 and 3 both modify `Unit.ts` and `BattleScene.ts`. To avoid conflicts:
- Run Task 2 first, then Task 3 (serial)
- Or: Task 1 parallel with (Task 2 → Task 3 serial)

## Final Verification

```bash
npx tsc --noEmit && npm test
```

**Acceptance criteria:**
1. **Animation differentiation** — tank attacks visibly slower than assassin, beast pounces fast, construct slams heavy, caster floats more
2. **Elite enemies** — purple health bar border + ★ badge in HUD when entering elite node
3. **Boss phase notches** — gold notch lines visible on boss health bar at phase thresholds (e.g., 75%, 50%, 25%)
4. **No regressions** — normal enemies, hero animations, formation panel all work correctly
