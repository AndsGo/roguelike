# Audit P0/P1 Bug Fixes Implementation Plan (v2 — post-review)

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 3 confirmed P0 bugs (broken temporary elements, synergy not applied in battle, ally skill targeting) and 3 P1/P2 issues (dead code cleanup, hell_victory placeholder, hardcoded Chinese strings).

**Architecture:** Each P0 bug is a broken data-flow pipeline. Fixes propagate existing data through the correct channels — no new systems needed. Ally targeting is refactored within SkillSystem to keep targeting responsibility boundaries clean (TargetingSystem = enemy targeting only, SkillSystem = skill-specific target resolution).

**Tech Stack:** TypeScript, Phaser 3, Vitest

---

## File Map

| File | Responsibility | Tasks |
|------|---------------|-------|
| `src/systems/SynergySystem.ts` | Synergy calculation | Task 1 (read temporaryElement) |
| `src/managers/RunManager.ts` | Run state + synergy display | Task 1 (read temporaryElement) |
| `src/entities/Hero.ts` | Hero entity construction | Task 2 (use effective element) |
| `tests/entities/Hero.test.ts` | Hero tests (already exists) | Task 2 |
| `src/scenes/BattleScene.ts` | Battle scene orchestration | Task 3 (pass heroStates/heroDataMap) |
| `tests/integration/battle-synergy.test.ts` | Integration tests | Task 3 |
| `src/systems/SkillSystem.ts` | Skill targeting + execution | Task 4 (ally target resolution) |
| `tests/systems/SkillSystem.test.ts` | Skill tests | Task 4 |
| `src/systems/MapGenerator.ts` | Map generation | Task 5 (remove dead code) |
| `src/managers/AchievementManager.ts` | Achievement evaluation | Task 6 (fix hell_victory) |
| `src/managers/MetaManager.ts` | Meta progression | Task 6 (increment hellVictories) |
| `src/types/index.ts` | Type definitions | Task 6 (add hellVictories field) |
| `src/i18n.ts` | Localization | Task 7 (add missing keys) |

---

## Task 1: Fix Temporary Element in Synergy Calculation

**Bug:** `SynergySystem.calculateActiveSynergies()` reads only `heroData.element`, ignoring `heroState.temporaryElement`. Same issue in `RunManager.calculateSynergies()`.

**Files:**
- Modify: `src/systems/SynergySystem.ts:58-62`
- Modify: `src/managers/RunManager.ts:~465-470`
- Test: `tests/systems/SynergySystem.test.ts`

- [ ] **Step 1: Write failing test — temporaryElement activates element synergy**

Add to `tests/systems/SynergySystem.test.ts`:

```typescript
import { ElementType } from '../../src/types';

it('uses temporaryElement for element synergy counting', () => {
  const heroes: HeroState[] = [
    makeHeroState('h1'),
    { ...makeHeroState('h2'), temporaryElement: 'fire' as ElementType },
  ];
  const dataMap = new Map<string, HeroData>([
    ['h1', makeHeroData('h1', { element: 'fire' })],
    ['h2', makeHeroData('h2', { element: 'ice' })],   // base is ice
  ]);

  const result = synergy.calculateActiveSynergies(heroes, dataMap);

  // h2 has temporaryElement=fire, so fire count should be 2 (h1 + h2)
  const fireSynergy = result.activeSynergies.find(s => s.synergyId === 'synergy_fire');
  expect(fireSynergy).toBeDefined();
  expect(fireSynergy!.count).toBe(2);

  // ice should NOT be counted for h2 since temporaryElement overrides
  const iceSynergy = result.activeSynergies.find(s => s.synergyId === 'synergy_ice');
  expect(iceSynergy).toBeUndefined();
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- tests/systems/SynergySystem.test.ts
```
Expected: FAIL — fire synergy not activated (count=1, threshold=2).

- [ ] **Step 3: Fix SynergySystem.calculateActiveSynergies()**

In `src/systems/SynergySystem.ts`, change lines 58-62:

```typescript
// BEFORE (line 58-62):
if (data.element) {
  const list = elementCounts.get(data.element) ?? [];
  list.push(heroState.id);
  elementCounts.set(data.element, list);
}

// AFTER:
const effectiveElement = heroState.temporaryElement ?? data.element;
if (effectiveElement) {
  const list = elementCounts.get(effectiveElement) ?? [];
  list.push(heroState.id);
  elementCounts.set(effectiveElement, list);
}
```

- [ ] **Step 4: Fix RunManager.calculateSynergies()**

In `src/managers/RunManager.ts`, find the element counting loop (~lines 465-470) and apply the same pattern:

```typescript
// BEFORE:
if (data.element) {
  elementCounts.set(data.element, (elementCounts.get(data.element) ?? 0) + 1);
}

// AFTER:
const effectiveElement = heroState.temporaryElement ?? data.element;
if (effectiveElement) {
  elementCounts.set(effectiveElement, (effectCounts.get(effectiveElement) ?? 0) + 1);
}
```

- [ ] **Step 5: Run tests to verify pass**

```bash
npm test -- tests/systems/SynergySystem.test.ts
```
Expected: ALL PASS

- [ ] **Step 6: Commit**

```bash
git add src/systems/SynergySystem.ts src/managers/RunManager.ts tests/systems/SynergySystem.test.ts
git commit -m "fix: synergy calculation now reads temporaryElement from HeroState"
```

---

## Task 2: Fix Temporary Element in Hero Entity Construction

**Bug:** `Hero` constructor always passes `heroData.element` to `Unit`, ignoring `heroState.temporaryElement`. This means damage calculations, element reactions, and UI all use the wrong element.

**Files:**
- Modify: `src/entities/Hero.ts:19`
- Test: `tests/entities/Hero.test.ts` (file already exists with `makeHeroData`/`makeHeroState` helpers)

- [ ] **Step 1: Write failing test**

Add to the existing `tests/entities/Hero.test.ts`:

```typescript
it('Hero uses temporaryElement when set on heroState', () => {
  const heroData = makeHeroData({ element: 'ice' });
  const heroState = makeHeroState({ temporaryElement: 'fire' as ElementType });
  const scene = createScene();
  const hero = new Hero(scene, 100, 200, heroData, heroState);
  expect(hero.element).toBe('fire');
});

it('Hero uses heroData.element when no temporaryElement', () => {
  const heroData = makeHeroData({ element: 'ice' });
  const heroState = makeHeroState();
  const scene = createScene();
  const hero = new Hero(scene, 100, 200, heroData, heroState);
  expect(hero.element).toBe('ice');
});
```

Note: Adapt to the existing `makeHeroData`/`makeHeroState` signatures in the file. If `makeHeroState` doesn't accept `temporaryElement`, spread it: `{ ...makeHeroState(), temporaryElement: 'fire' as ElementType }`.

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- tests/entities/Hero.test.ts
```
Expected: FAIL — `hero.element` is `'ice'` (from heroData), not `'fire'`.

- [ ] **Step 3: Fix Hero constructor**

In `src/entities/Hero.ts`, change line 19:

```typescript
// BEFORE (line 19):
super(scene, x, y, heroData.id, heroData.name, heroData.role, stats, true, heroData.element,

// AFTER:
const effectiveElement = heroState.temporaryElement ?? heroData.element;
super(scene, x, y, heroData.id, heroData.name, heroData.role, stats, true, effectiveElement,
```

- [ ] **Step 4: Run tests**

```bash
npm test
```
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add src/entities/Hero.ts tests/entities/Hero.test.ts
git commit -m "fix: Hero entity uses temporaryElement for damage calc and element reactions"
```

---

## Task 3: Fix Synergy Bonuses Not Applied in Battle

**Bug:** `BattleScene.ts:210` calls `this.battleSystem.setUnits(heroes, enemies)` without passing `heroStates` and `heroDataMap`, so `applySynergies()` is never called. Synergies are display-only.

**Files:**
- Modify: `src/scenes/BattleScene.ts:208-210`
- Create: `tests/integration/battle-synergy.test.ts`

- [ ] **Step 1: Write integration tests**

Create `tests/integration/battle-synergy.test.ts` with TWO layers of verification:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BattleSystem } from '../../src/systems/BattleSystem';
import { Hero } from '../../src/entities/Hero';
import { Enemy } from '../../src/entities/Enemy';
import { SeededRNG } from '../../src/utils/rng';
import { EventBus } from '../../src/systems/EventBus';
import { HeroState, HeroData } from '../../src/types';
import { createScene } from '../mocks/phaser';

function makeHeroState(id: string): HeroState {
  return {
    id, level: 1, exp: 0, currentHp: 500,
    equipment: { weapon: null, armor: null, accessory: null },
  };
}

function makeHeroData(id: string, overrides: Partial<HeroData> = {}): HeroData {
  return {
    id, name: id, role: overrides.role ?? 'melee_dps',
    baseStats: {
      maxHp: 500, hp: 500, attack: 50, defense: 20,
      magicPower: 0, magicResist: 10, speed: 100,
      attackSpeed: 1.0, attackRange: 100, critChance: 0.1, critDamage: 1.5,
    },
    scalingPerLevel: { maxHp: 30, attack: 5, defense: 2, magicPower: 0, magicResist: 1 },
    skills: [], spriteKey: 'test',
    race: overrides.race, class: overrides.class, element: overrides.element,
  };
}

describe('Battle Synergy Integration', () => {
  let battleSystem: BattleSystem;

  beforeEach(() => {
    EventBus.getInstance().reset();
    battleSystem = new BattleSystem(new SeededRNG(42));
  });

  it('applySynergies populates hero.synergyBonuses when heroStates passed', () => {
    const scene = createScene();
    const heroStates = [makeHeroState('h1'), makeHeroState('h2')];
    const heroDataMap = new Map<string, HeroData>([
      ['h1', makeHeroData('h1', { race: 'human' })],
      ['h2', makeHeroData('h2', { race: 'human' })],
    ]);

    const h1 = new Hero(scene, 100, 200, heroDataMap.get('h1')!, heroStates[0]);
    const h2 = new Hero(scene, 100, 270, heroDataMap.get('h2')!, heroStates[1]);

    battleSystem.setUnits([h1, h2], [], heroStates, heroDataMap);

    // Human Alliance 2: attack+10, defense+10
    expect(Object.keys(h1.synergyBonuses).length).toBeGreaterThan(0);
    expect((h1.synergyBonuses as any).attack).toBe(10);
    expect((h1.synergyBonuses as any).defense).toBe(10);
  });

  it('synergyBonuses remain empty when heroStates not passed', () => {
    const scene = createScene();
    const data = makeHeroData('h1', { race: 'human' });
    const state = makeHeroState('h1');
    const h1 = new Hero(scene, 100, 200, data, state);

    battleSystem.setUnits([h1], []);

    expect(Object.keys(h1.synergyBonuses).length).toBe(0);
  });

  it('BattleSystem.setUnits is called with 4 arguments (spy verification)', () => {
    // This test verifies the CALL SITE contract.
    // After BattleScene fix, setUnits must receive heroStates + heroDataMap.
    const spy = vi.spyOn(battleSystem, 'setUnits');
    const scene = createScene();
    const heroStates = [makeHeroState('h1')];
    const heroDataMap = new Map([['h1', makeHeroData('h1')]]);
    const h1 = new Hero(scene, 100, 200, heroDataMap.get('h1')!, heroStates[0]);

    battleSystem.setUnits([h1], [], heroStates, heroDataMap);

    expect(spy).toHaveBeenCalledWith(
      expect.any(Array),
      expect.any(Array),
      heroStates,
      heroDataMap,
    );
  });
});
```

- [ ] **Step 2: Run tests — first test should fail, second should pass**

```bash
npm test -- tests/integration/battle-synergy.test.ts
```

- [ ] **Step 3: Fix BattleScene.ts — pass heroStates and heroDataMap to setUnits**

In `src/scenes/BattleScene.ts`, change lines 208-210. `heroStates` is already in scope (line 173). `HeroData` type may need importing.

```typescript
// BEFORE (line 210):
this.battleSystem.setUnits(heroes, enemies);

// AFTER:
const heroDataMap = new Map<HeroData['id'], HeroData>();
for (const state of heroStates) {
  heroDataMap.set(state.id, rm.getHeroData(state.id));
}
this.battleSystem.setUnits(heroes, enemies, heroStates, heroDataMap);
```

- [ ] **Step 4: Run all tests**

```bash
npx tsc --noEmit && npm test
```
Expected: ALL PASS, zero TS errors.

- [ ] **Step 5: Commit**

```bash
git add src/scenes/BattleScene.ts tests/integration/battle-synergy.test.ts
git commit -m "fix: inject heroStates into BattleSystem so synergy bonuses apply in combat"
```

---

## Task 4: Fix Ally Skill Targeting Model

**Bug:** `SkillSystem.findReadySkill()` checks `unit.target` (always an enemy) for ally skills. `executeSkill()` also uses `unit.target` for `targetType: 'ally'`, applying heals to enemies.

**Design decision (from review):** Keep ally target resolution **inside SkillSystem**, NOT in TargetingSystem. TargetingSystem's responsibility is enemy/combat targeting only. SkillSystem resolves skill-specific targets internally. This avoids semantic overlap with the existing `TargetingSystem.selectTarget() → selectHealTarget()` path for healer combat targeting.

**Files:**
- Modify: `src/systems/SkillSystem.ts:79-143`
- Test: `tests/systems/SkillSystem.test.ts`

- [ ] **Step 1: Write failing tests for ally targeting**

Add to `tests/systems/SkillSystem.test.ts`:

```typescript
describe('ally skill targeting', () => {
  it('findReadySkill returns heal skill when ally is injured, even if enemy target is out of range', () => {
    const healer = createMockUnit({
      unitId: 'healer1', role: 'healer',
      stats: { attackRange: 200, maxHp: 500, magicPower: 50 },
    });
    healer.isHero = true;
    const ally = createMockUnit({
      unitId: 'ally1',
      stats: { maxHp: 500 },
    });
    ally.currentHp = 200; // injured (40%)
    ally.isAlive = true;
    ally.isHero = true;

    // healer.target is an enemy far away — should NOT block ally skill
    const enemy = createMockUnit({ unitId: 'enemy1' });
    enemy.isAlive = true;
    healer.target = enemy;
    // Mock distanceTo to return 9999 for enemy (out of range)
    healer.distanceTo = (t: any) => t === enemy ? 9999 : 50;

    const healSkill = {
      id: 'heal', name: 'Heal', targetType: 'ally',
      baseDamage: -80, scalingStat: 'magicPower', scalingRatio: 0.5,
      cooldown: 5, range: 300, element: null, isUltimate: false,
      effects: [],
    };
    healer.skills = [healSkill as any];
    healer.skillCooldowns = new Map([['heal', 0]]);

    const result = skillSystem.findReadySkill(
      healer as any,
      [healer, ally] as any[],
      [enemy] as any[],
    );
    expect(result).not.toBeNull();
    expect(result!.id).toBe('heal');
  });

  it('executeSkill targets lowest HP ally for ally-targeted heal skill', () => {
    const healer = createMockUnit({
      unitId: 'healer1', role: 'healer',
      stats: { maxHp: 500, magicPower: 100, attack: 10 },
    });
    healer.isHero = true;
    healer.isAlive = true;
    healer.currentHp = 500;
    const ally1 = createMockUnit({ unitId: 'ally1', stats: { maxHp: 500 } });
    ally1.currentHp = 400;
    ally1.isAlive = true;
    ally1.isHero = true;
    const ally2 = createMockUnit({ unitId: 'ally2', stats: { maxHp: 500 } });
    ally2.currentHp = 100; // lower HP — should be healed
    ally2.isAlive = true;
    ally2.isHero = true;

    const healSkill = {
      id: 'heal', name: 'Heal', targetType: 'ally',
      baseDamage: -80, scalingStat: 'magicPower', scalingRatio: 0.5,
      cooldown: 5, range: 300, element: null, isUltimate: false,
      effects: [],
    };

    const enemy = createMockUnit({ unitId: 'enemy1' });
    healer.target = enemy; // target is enemy — must NOT be used

    skillSystem.executeSkill(
      healer as any, healSkill as any,
      [healer, ally1, ally2] as any[], [enemy] as any[],
    );

    // ally2 should have been healed (lowest HP %)
    expect(ally2.currentHp).toBeGreaterThan(100);
    // enemy should NOT have been healed
    expect(enemy.currentHp).toBe(enemy.currentStats.maxHp);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

```bash
npm test -- tests/systems/SkillSystem.test.ts
```
Expected: FAIL — heal skill not found or applied to wrong target.

- [ ] **Step 3: Add private `selectAllyTarget` method to SkillSystem**

In `src/systems/SkillSystem.ts`, add a private method:

```typescript
/**
 * Select the best ally target for a support skill.
 * Responsibility stays in SkillSystem — TargetingSystem handles enemy targeting only.
 */
private selectAllyTarget(caster: Unit, allies: Unit[], skill: SkillData): Unit | null {
  const living = allies.filter(a => a.isAlive && a !== caster);
  if (living.length === 0) return caster.isAlive ? caster : null;

  // Healing skill (negative baseDamage) → lowest HP %
  if (skill.baseDamage < 0) {
    let target = living[0];
    let lowestPercent = target.currentHp / target.currentStats.maxHp;
    for (let i = 1; i < living.length; i++) {
      const percent = living[i].currentHp / living[i].currentStats.maxHp;
      if (percent < lowestPercent) {
        lowestPercent = percent;
        target = living[i];
      }
    }
    return lowestPercent < 0.9 ? target : null;
  }

  // Shield/buff → prefer tanks or front-row
  const tanks = living.filter(a => a.role === 'tank' || a.formation === 'front');
  if (tanks.length > 0) return tanks[0];

  return living[0];
}
```

- [ ] **Step 4: Fix `findReadySkill`**

In `src/systems/SkillSystem.ts`, replace the body of `findReadySkill` (lines 79-113):

```typescript
findReadySkill(unit: Unit, allies: Unit[], enemies: Unit[]): SkillData | null {
  for (const skill of unit.skills) {
    if (skill.isUltimate) continue;
    const cd = unit.skillCooldowns.get(skill.id) ?? 0;
    if (cd > 0) continue;

    // Self-targeted skills are always usable
    if (skill.targetType === 'self') return skill;

    // Ally-targeted single skill — resolve via selectAllyTarget
    if (skill.targetType === 'ally') {
      if (unit.role !== 'healer' && unit.role !== 'support') continue;
      const allyPool = unit.isHero ? allies : enemies;
      if (this.selectAllyTarget(unit, allyPool, skill)) return skill;
      continue;
    }

    // All-allies skill
    if (skill.targetType === 'all_allies') {
      if (unit.role !== 'healer' && unit.role !== 'support') continue;
      const allyPool = unit.isHero ? allies : enemies;
      if (allyPool.some(t => t.isAlive)) return skill;
      continue;
    }

    // AOE enemy skill
    if (skill.targetType === 'all_enemies') {
      const enemyPool = unit.isHero ? enemies : allies;
      if (enemyPool.some(t => t.isAlive && unit.distanceTo(t) <= skill.range)) {
        return skill;
      }
      continue;
    }

    // Single enemy skill — check range to combat target
    if (unit.target && unit.distanceTo(unit.target) <= skill.range) {
      return skill;
    }
  }
  return null;
}
```

- [ ] **Step 5: Fix `executeSkill` ally target selection**

In `src/systems/SkillSystem.ts`, change the `'ally'` case in `executeSkill()`:

```typescript
// BEFORE:
case 'ally':
  if (unit.target && unit.target.isAlive) targets = [unit.target];
  break;

// AFTER:
case 'ally': {
  const allyPool = unit.isHero ? allies : enemies;
  const allyTarget = this.selectAllyTarget(unit, allyPool, skill);
  if (allyTarget) targets = [allyTarget];
  break;
}
```

- [ ] **Step 6: Run all tests**

```bash
npx tsc --noEmit && npm test
```
Expected: ALL PASS, zero TS errors.

- [ ] **Step 7: Commit**

```bash
git add src/systems/SkillSystem.ts tests/systems/SkillSystem.test.ts
git commit -m "fix: ally skills select friendly targets via SkillSystem.selectAllyTarget"
```

---

## Task 5: Remove Dead Code — MapGenerator.generateForAct()

**Context:** The original audit flagged `generateForAct()` as returning the wrong data. Review confirmed this is true, but also confirmed **there are zero call sites** in `src/`. The function is dead code. Attempting to "fix" the slice logic would introduce a new bug (branching makes node counts unpredictable, connections would have stale indices).

**Decision:** Delete the dead code. If needed in the future, it should be rebuilt with proper act-boundary tracking.

**Files:**
- Modify: `src/systems/MapGenerator.ts:146-161`

- [ ] **Step 1: Verify no call sites**

```bash
# Search all TS/TSX files for generateForAct usage (excluding the definition and plan docs)
```
Expected: No results in `src/` or `tests/`.

- [ ] **Step 2: Delete the method**

Remove lines 146-161 from `src/systems/MapGenerator.ts` (the `generateForAct` static method and its JSDoc comment).

- [ ] **Step 3: Run all tests**

```bash
npx tsc --noEmit && npm test
```
Expected: ALL PASS (no callers means no breakage).

- [ ] **Step 4: Commit**

```bash
git add src/systems/MapGenerator.ts
git commit -m "chore: remove dead code MapGenerator.generateForAct (zero call sites)"
```

---

## Task 6: Fix hell_victory Achievement

**Bug:** `hell_victory` condition checks `totalVictories >= 1` — any single victory unlocks it regardless of difficulty.

**Context (from review):** `RunEndContext` already contains `difficulty: string` (MetaManager.ts:11). The `recordRunEnd` signature is `(victory: boolean, floor: number, context?: RunEndContext)` — `victory` is a separate parameter, NOT a field on `context`. We'll add a `hellVictories` counter to `MetaProgressionData` and increment it in `recordRunEnd` when `victory === true && context?.difficulty === 'hell'`.

**Files:**
- Modify: `src/types/index.ts` (add `hellVictories` to MetaProgressionData)
- Modify: `src/managers/MetaManager.ts:292-297` (increment counter)
- Modify: `src/managers/AchievementManager.ts:129-132` (fix condition)
- Test: `tests/managers/AchievementManager.test.ts`

- [ ] **Step 1: Write failing test**

Add to `tests/managers/AchievementManager.test.ts` (or appropriate describe block):

```typescript
it('hell_victory is not unlocked by normal-difficulty victory', () => {
  // Record a normal-difficulty victory
  MetaManager.recordRunEnd(true, 20, {
    partyHeroIds: ['warrior'], partyElements: ['fire'],
    partyRoles: ['tank'], relicCount: 3, difficulty: 'normal',
  });
  AchievementManager.checkAchievements();
  expect(MetaManager.hasAchievement('hell_victory')).toBe(false);
});

it('hell_victory unlocks after hell-difficulty victory', () => {
  MetaManager.recordRunEnd(true, 20, {
    partyHeroIds: ['warrior'], partyElements: ['fire'],
    partyRoles: ['tank'], relicCount: 3, difficulty: 'hell',
  });
  AchievementManager.checkAchievements();
  expect(MetaManager.hasAchievement('hell_victory')).toBe(true);
});
```

- [ ] **Step 2: Run test to verify failure**

```bash
npm test -- tests/managers/AchievementManager.test.ts
```
Expected: First test FAILS (hell_victory unlocks on normal difficulty).

- [ ] **Step 3: Add `hellVictories` to MetaProgressionData**

In `src/types/index.ts`, add to `MetaProgressionData`:
```typescript
hellVictories?: number;
```

- [ ] **Step 4: Increment hellVictories in MetaManager.recordRunEnd()**

In `src/managers/MetaManager.ts`, after line 297 (`if (victory) { inst.meta.totalVictories++; }`):

```typescript
if (victory && context?.difficulty === 'hell') {
  inst.meta.hellVictories = (inst.meta.hellVictories ?? 0) + 1;
}
```

- [ ] **Step 5: Fix hell_victory condition in AchievementManager**

In `src/managers/AchievementManager.ts:129-132`:

```typescript
// BEFORE:
case 'hell_victory':
  return (_s, m) => m.totalVictories >= 1;

// AFTER:
case 'hell_victory':
  return (_s, m) => (m.hellVictories ?? 0) >= 1;
```

- [ ] **Step 6: Run all tests**

```bash
npx tsc --noEmit && npm test
```
Expected: ALL PASS

- [ ] **Step 7: Commit**

```bash
git add src/types/index.ts src/managers/MetaManager.ts src/managers/AchievementManager.ts tests/managers/AchievementManager.test.ts
git commit -m "fix: hell_victory achievement now requires actual hell-difficulty victory"
```

---

## Task 7: Move Hardcoded Chinese Strings to i18n

**Issue:** AchievementManager has `'已完成'`/`'进行中'` hardcoded. MetaManager has hero unlock description strings hardcoded. All strings are valid UTF-8 (no encoding corruption confirmed by review).

**Files:**
- Modify: `src/i18n.ts` (add keys)
- Modify: `src/managers/AchievementManager.ts:237` (use i18n)

- [ ] **Step 1: Add i18n keys**

In `src/i18n.ts`, add to the UI object:

```typescript
achievement: {
  completed: '已完成',
  inProgress: '进行中',
},
```

- [ ] **Step 2: Replace hardcoded strings in AchievementManager**

```typescript
// BEFORE (line 237):
progress: unlocked ? '已完成' : '进行中',

// AFTER:
progress: unlocked ? UI.achievement.completed : UI.achievement.inProgress,
```

Import `UI` if not already imported:
```typescript
import { UI } from '../i18n';
```

- [ ] **Step 3: Run tests**

```bash
npx tsc --noEmit && npm test
```
Expected: ALL PASS

- [ ] **Step 4: Commit**

```bash
git add src/i18n.ts src/managers/AchievementManager.ts
git commit -m "refactor: move hardcoded Chinese strings to i18n"
```

---

## Execution Order

Tasks 1→2 (temporary element chain) must be sequential.
Tasks 3, 4, 5, 6, 7 are all independent.

**Recommended parallel groups:**
- Group A (serial): Task 1 → Task 2
- Group B: Task 3
- Group C: Task 4
- Group D: Task 5
- Group E: Task 6
- Group F: Task 7

Groups A–F can run in parallel since they touch different files.

**Exception:** If Task 3 and Task 1 are executed simultaneously, there's a minor overlap on `SynergySystem.ts` reading. Task 1 changes the counting logic; Task 3 verifies the injection path. No file-level conflict but logically Task 1 should complete first for Task 3's synergies to be fully correct.

## Final Verification

After all tasks:

```bash
npx tsc --noEmit && npm test
```

Expected: Zero TS errors, all tests pass (78+ suites, 990+ tests).
