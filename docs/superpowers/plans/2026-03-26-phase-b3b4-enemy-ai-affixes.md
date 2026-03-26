# v1.25 Phase B3+B4 — Enemy AI + Difficulty Affixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 5 AI behavior types to 16 enemies and 10 combat affixes on elite/boss nodes, making each encounter feel distinct.

**Architecture:** `EnemyData.aiType` drives TargetingSystem scoring variants. New `AffixSystem` singleton (like RelicSystem/ActModifierSystem) manages combat modifiers via EventBus listeners + tick timers. `MapGenerator` assigns affixes at map creation time using SeededRNG for determinism.

**Tech Stack:** TypeScript, Phaser 3, Vitest

**Spec:** `docs/superpowers/specs/2026-03-26-phase-b3b4-enemy-ai-affixes-design.md`

---

## File Map

| File | Responsibility | Tasks |
|------|---------------|-------|
| `src/types/index.ts` | AIType, AffixId, AffixData, EnemyData.aiType, MapNode.affixes, GameEventMap update | Task 1 |
| `src/config/balance.ts` | AFFIX_COUNT constant | Task 1 |
| `src/constants.ts` | Re-export AFFIX_COUNT | Task 1 |
| `src/i18n.ts` | Affix UI strings | Task 1 |
| `src/data/enemies.json` | Add aiType field to 16 enemies | Task 2 |
| `src/data/affixes.json` | NEW: 10 affix entries | Task 2 |
| `src/entities/Unit.ts` | Add aiType property | Task 3 |
| `src/entities/Enemy.ts` | Copy aiType from EnemyData | Task 3 |
| `src/systems/TargetingSystem.ts` | AI behavior scoring by aiType | Task 3 |
| `tests/systems/TargetingSystem.test.ts` | AI behavior tests | Task 3 |
| `src/systems/AffixSystem.ts` | NEW: Affix lifecycle management singleton | Task 4 |
| `tests/systems/AffixSystem.test.ts` | NEW: Affix lifecycle + effect tests | Task 4 |
| `src/systems/MapGenerator.ts` | Affix assignment on elite/boss nodes | Task 5 |
| `tests/systems/MapGenerator.test.ts` | Affix assignment tests | Task 5 |
| `src/ui/NodeTooltip.ts` | Display affix symbol + shortDesc | Task 6 |
| `src/scenes/BattleScene.ts` | AffixSystem activate/deactivate + banner + overhead icons | Task 6 |
| `src/systems/BattleSystem.ts` | AffixSystem.tick() in updateCombat | Task 6 |
| `src/systems/DamageSystem.ts` | Query AffixSystem.getAffixElementBonus() | Task 6 |
| `tests/data/affix-integrity.test.ts` | NEW: Data validation tests | Task 7 |
| `tests/integration/affix-save.test.ts` | NEW: Save compat tests | Task 7 |

---

## Task 1: Types, Constants, and i18n

**Context:** Foundation for all subsequent tasks. Adds AIType, AffixData interface, EnemyData/MapNode extensions, AFFIX_COUNT constant, GameEventMap update for isAffixDamage flag, and UI strings.

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/config/balance.ts`
- Modify: `src/constants.ts`
- Modify: `src/i18n.ts`

- [ ] **Step 1: Add AIType and AffixData to types**

In `src/types/index.ts`, add before `EnemyData` (before line 77):

```typescript
// ============ AI Behaviors ============

export type AIType = 'default' | 'aggressive' | 'defensive' | 'disruptor' | 'berserker';

// ============ Affixes ============

export type AffixId = string;

export interface AffixData {
  id: AffixId;
  name: string;
  shortDesc: string;
  description: string;
  category: 'offensive' | 'defensive' | 'special';
  symbol: string;
  symbolColor: string;
  params: Record<string, number>;
}
```

- [ ] **Step 2: Add aiType to EnemyData**

In `src/types/index.ts`, add after `isBoss?: boolean;` (line 91):

```typescript
  aiType?: AIType;
```

- [ ] **Step 3: Add affixes to MapNode**

In `src/types/index.ts`, add after `shortcutConnections?: number[];` (line 224):

```typescript
  affixes?: AffixId[];
```

- [ ] **Step 4: Add isAffixDamage to GameEventMap**

In `src/types/index.ts`, find the `unit:damage` event type (line 409) and add `isAffixDamage`:

```typescript
  'unit:damage': { sourceId: string; targetId: string; amount: number; damageType: DamageType; element?: ElementType; isCrit: boolean; isAffixDamage?: boolean };
```

- [ ] **Step 5: Add AFFIX_COUNT constant**

In `src/config/balance.ts`, add after the Skill Evolution section (after `EVOLUTION_ENHANCE_LEVEL`):

```typescript

// ============ Affixes ============

export const AFFIX_COUNT: Record<string, { elite: number; boss: number }> = {
  normal:    { elite: 0, boss: 1 },
  hard:      { elite: 1, boss: 1 },
  nightmare: { elite: 1, boss: 2 },
  hell:      { elite: 2, boss: 2 },
};
```

- [ ] **Step 6: Re-export in constants.ts**

In `src/constants.ts`, add `AFFIX_COUNT` to the re-export block from `'./config/balance'`.

- [ ] **Step 7: Add i18n strings**

In `src/i18n.ts`, add an `affix` section in the `UI` object (after the `evolution` section):

```typescript
  affix: {
    bannerTitle: '战斗词缀',
    pendingWarning: '当前战斗带有词缀！',
  },
```

- [ ] **Step 8: Verify**

```bash
npx tsc --noEmit && npm test
```

Expected: Zero errors, all 1100 tests pass.

- [ ] **Step 9: Commit**

```bash
git add src/types/index.ts src/config/balance.ts src/constants.ts src/i18n.ts
git commit -m "feat: add AIType, AffixData types, AFFIX_COUNT constant, and affix i18n"
```

---

## Task 2: Enemy AI Data + Affix Data Content

**Context:** Add `aiType` field to 16 enemies in enemies.json and create the 10-entry affixes.json. Both are pure data files with no code dependencies beyond Task 1 types.

**Files:**
- Modify: `src/data/enemies.json`
- Create: `src/data/affixes.json`

- [ ] **Step 1: Add aiType to enemies.json**

Add `"aiType": "<value>"` field to 16 enemies. Place it after `"isBoss"` (or after `"expReward"` for non-bosses):

| Enemy ID | aiType |
|----------|--------|
| orc_warrior | aggressive |
| fire_elemental | aggressive |
| elemental_chimera | aggressive |
| frost_giant | defensive |
| holy_guardian | defensive |
| frost_sentinel | defensive |
| dark_cultist | disruptor |
| shadow_wraith | disruptor |
| void_weaver | disruptor |
| flame_knight | berserker |
| flame_construct | berserker |
| dragon_boss | aggressive |
| frost_queen | defensive |
| thunder_titan | berserker |
| shadow_lord | disruptor |
| heart_of_the_forge | defensive |

The remaining 12 enemies do NOT get the field (absence = default).

- [ ] **Step 2: Create affixes.json**

Create `src/data/affixes.json` with 10 entries:

```json
[
  {
    "id": "berserk",
    "name": "狂暴",
    "shortDesc": "攻+20%",
    "description": "所有敌人攻击力提升20%",
    "category": "offensive",
    "symbol": "★",
    "symbolColor": "#ff4444",
    "params": { "attackBonus": 0.2 }
  },
  {
    "id": "swift",
    "name": "迅捷",
    "shortDesc": "攻速+30%",
    "description": "所有敌人攻击速度提升30%",
    "category": "offensive",
    "symbol": "★",
    "symbolColor": "#ff4444",
    "params": { "speedBonus": 0.3 }
  },
  {
    "id": "splitting",
    "name": "分裂",
    "shortDesc": "溅射40%",
    "description": "敌人攻击时对目标附近英雄造成40%溅射伤害",
    "category": "offensive",
    "symbol": "★",
    "symbolColor": "#ff4444",
    "params": { "splashRatio": 0.4 }
  },
  {
    "id": "regeneration",
    "name": "再生",
    "shortDesc": "回血2%/s",
    "description": "所有敌人每秒回复2%最大生命值",
    "category": "defensive",
    "symbol": "▲",
    "symbolColor": "#4488ff",
    "params": { "healPercent": 0.02, "interval": 1.0 }
  },
  {
    "id": "shielded",
    "name": "护盾",
    "shortDesc": "+20%护盾",
    "description": "战斗开始时所有敌人获得20%最大生命值的护盾",
    "category": "defensive",
    "symbol": "▲",
    "symbolColor": "#4488ff",
    "params": { "shieldPercent": 0.2 }
  },
  {
    "id": "fortified",
    "name": "坚韧",
    "shortDesc": "防+25%",
    "description": "所有敌人防御力提升25%",
    "category": "defensive",
    "symbol": "▲",
    "symbolColor": "#4488ff",
    "params": { "defenseBonus": 0.25 }
  },
  {
    "id": "reflective",
    "name": "反射",
    "shortDesc": "反弹15%",
    "description": "敌人受到攻击时反弹15%伤害给攻击者",
    "category": "special",
    "symbol": "●",
    "symbolColor": "#aa44ff",
    "params": { "reflectRatio": 0.15 }
  },
  {
    "id": "elemental",
    "name": "元素亲和",
    "shortDesc": "元素+25%",
    "description": "所有敌人的元素伤害提升25%",
    "category": "special",
    "symbol": "●",
    "symbolColor": "#aa44ff",
    "params": { "elementBonus": 0.25 }
  },
  {
    "id": "vengeful",
    "name": "复仇",
    "shortDesc": "低血+35%攻",
    "description": "敌人血量低于40%时攻击力额外提升35%",
    "category": "special",
    "symbol": "●",
    "symbolColor": "#aa44ff",
    "params": { "hpThreshold": 0.4, "attackBonus": 0.35 }
  },
  {
    "id": "deathburst",
    "name": "亡语",
    "shortDesc": "死亡爆炸",
    "description": "敌人死亡时对全体英雄造成其最大生命值8%的伤害",
    "category": "special",
    "symbol": "●",
    "symbolColor": "#aa44ff",
    "params": { "damagePercent": 0.08 }
  }
]
```

- [ ] **Step 3: Verify JSON parses**

```bash
node -e "const d = require('./src/data/affixes.json'); console.log(d.length + ' affixes'); console.log(d.map(e => e.id).join(', '));"
```

Expected: `10 affixes` and all 10 IDs listed.

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit && npm test
```

- [ ] **Step 5: Commit**

```bash
git add src/data/enemies.json src/data/affixes.json
git commit -m "content: add aiType to 16 enemies + 10 affix entries"
```

---

## Task 3: TargetingSystem AI Behaviors

**Context:** Add `aiType` property to Unit/Enemy and implement 4 new targeting strategies in TargetingSystem. The `default` strategy is the existing role-based logic — no changes needed for it.

**Files:**
- Modify: `src/entities/Unit.ts`
- Modify: `src/entities/Enemy.ts`
- Modify: `src/systems/TargetingSystem.ts`
- Create: `tests/systems/ai-behavior.test.ts`

- [ ] **Step 1: Write AI behavior tests**

Create `tests/systems/ai-behavior.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { TargetingSystem } from '../../src/systems/TargetingSystem';
import { createMockUnit } from '../mocks/phaser';

describe('TargetingSystem AI behaviors', () => {
  beforeEach(() => {
    TargetingSystem.beginFrame(0);
  });

  function makeUnit(overrides: Record<string, unknown>) {
    const u = createMockUnit(overrides as any);
    // Ensure aiType and formation exist
    if (!('aiType' in u)) (u as any).aiType = 'default';
    if (!('formation' in u)) (u as any).formation = 'front';
    // Add distanceTo if missing
    if (!u.distanceTo) {
      (u as any).distanceTo = (other: any) => Math.abs(u.x - other.x) + Math.abs(u.y - other.y);
    }
    // Add isInRange
    if (!u.isInRange) {
      (u as any).isInRange = (other: any) => u.distanceTo(other) <= u.currentStats.attackRange;
    }
    // Add getTauntSource
    if (!u.getTauntSource) {
      (u as any).getTauntSource = () => null;
    }
    return u;
  }

  it('default aiType uses existing role-based targeting', () => {
    const attacker = makeUnit({ unitId: 'enemy1', isHero: false, role: 'melee_dps', x: 600 });
    const lowHp = makeUnit({ unitId: 'hero1', isHero: true, currentHp: 50, maxHp: 500, x: 100 });
    const fullHp = makeUnit({ unitId: 'hero2', isHero: true, currentHp: 500, maxHp: 500, x: 200 });

    // melee_dps default = lowest_hp
    const target = TargetingSystem.selectTarget(attacker as any, [lowHp, fullHp] as any[], [attacker] as any[]);
    expect(target?.unitId).toBe('hero1');
  });

  it('aggressive always targets lowest HP enemy', () => {
    const attacker = makeUnit({ unitId: 'enemy1', isHero: false, role: 'tank', x: 600 });
    (attacker as any).aiType = 'aggressive';
    const lowHp = makeUnit({ unitId: 'hero1', isHero: true, currentHp: 50, maxHp: 500, x: 400 });
    const fullHp = makeUnit({ unitId: 'hero2', isHero: true, currentHp: 500, maxHp: 500, x: 100 });

    // Tank default would be nearest (hero2 at x=100 closer), but aggressive ignores role
    const target = TargetingSystem.selectTarget(attacker as any, [lowHp, fullHp] as any[], [attacker] as any[]);
    expect(target?.unitId).toBe('hero1');
  });

  it('disruptor prioritizes backRow roles', () => {
    const attacker = makeUnit({ unitId: 'enemy1', isHero: false, role: 'melee_dps', x: 600 });
    (attacker as any).aiType = 'disruptor';
    const tank = makeUnit({ unitId: 'hero1', isHero: true, role: 'tank', currentHp: 100, maxHp: 500, x: 100 });
    const healer = makeUnit({ unitId: 'hero2', isHero: true, role: 'healer', currentHp: 400, maxHp: 500, x: 200 });

    // Even though tank has lower HP, disruptor should prefer healer
    const target = TargetingSystem.selectTarget(attacker as any, [tank, healer] as any[], [attacker] as any[]);
    expect(target?.unitId).toBe('hero2');
  });

  it('defensive prioritizes attacker of lowest-HP ally', () => {
    const attacker = makeUnit({ unitId: 'enemy1', isHero: false, role: 'tank', x: 600 });
    (attacker as any).aiType = 'defensive';
    const hero1 = makeUnit({ unitId: 'hero1', isHero: true, currentHp: 500, maxHp: 500, x: 100 });
    const hero2 = makeUnit({ unitId: 'hero2', isHero: true, currentHp: 300, maxHp: 500, x: 200 });

    // Ally enemy2 is lowest HP and was attacked by hero2
    const ally = makeUnit({ unitId: 'enemy2', isHero: false, currentHp: 50, maxHp: 500, x: 500 });
    (ally as any).lastAttacker = hero2;

    const target = TargetingSystem.selectTarget(attacker as any, [hero1, hero2] as any[], [attacker, ally] as any[]);
    expect(target?.unitId).toBe('hero2');
  });

  it('berserker uses default above 50% HP', () => {
    const attacker = makeUnit({ unitId: 'enemy1', isHero: false, role: 'tank', currentHp: 400, maxHp: 500, x: 600 });
    (attacker as any).aiType = 'berserker';
    const near = makeUnit({ unitId: 'hero1', isHero: true, currentHp: 500, maxHp: 500, x: 500 });
    const far = makeUnit({ unitId: 'hero2', isHero: true, currentHp: 50, maxHp: 500, x: 100 });

    // Above 50%: tank default = nearest
    const target = TargetingSystem.selectTarget(attacker as any, [near, far] as any[], [attacker] as any[]);
    expect(target?.unitId).toBe('hero1');
  });

  it('berserker switches to aggressive below 50% HP', () => {
    const attacker = makeUnit({ unitId: 'enemy1', isHero: false, role: 'tank', currentHp: 200, maxHp: 500, x: 600 });
    (attacker as any).aiType = 'berserker';
    const near = makeUnit({ unitId: 'hero1', isHero: true, currentHp: 500, maxHp: 500, x: 500 });
    const far = makeUnit({ unitId: 'hero2', isHero: true, currentHp: 50, maxHp: 500, x: 100 });

    // Below 50%: aggressive = lowest_hp
    const target = TargetingSystem.selectTarget(attacker as any, [near, far] as any[], [attacker] as any[]);
    expect(target?.unitId).toBe('hero2');
  });

  it('taunt overrides all aiType strategies', () => {
    const tauntSource = makeUnit({ unitId: 'hero1', isHero: true, currentHp: 500, maxHp: 500, x: 100 });
    const lowHp = makeUnit({ unitId: 'hero2', isHero: true, currentHp: 10, maxHp: 500, x: 200 });
    const attacker = makeUnit({ unitId: 'enemy1', isHero: false, role: 'melee_dps', x: 600 });
    (attacker as any).aiType = 'aggressive';
    (attacker as any).getTauntSource = () => tauntSource;

    const target = TargetingSystem.selectTarget(attacker as any, [tauntSource, lowHp] as any[], [attacker] as any[]);
    expect(target?.unitId).toBe('hero1');
  });

  it('aiType undefined defaults to role-based', () => {
    const attacker = makeUnit({ unitId: 'enemy1', isHero: false, role: 'ranged_dps', x: 600 });
    // aiType not set (undefined) — should use role-based
    delete (attacker as any).aiType;
    const target1 = makeUnit({ unitId: 'hero1', isHero: true, currentHp: 500, maxHp: 500, x: 100 });
    const target2 = makeUnit({ unitId: 'hero2', isHero: true, currentHp: 500, maxHp: 500, x: 200 });

    // ranged_dps = highest_threat, both equal threat → first match or nearest
    const target = TargetingSystem.selectTarget(attacker as any, [target1, target2] as any[], [attacker] as any[]);
    expect(target).toBeDefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/systems/ai-behavior.test.ts
```

Expected: Tests fail because `aiType` property doesn't exist on Unit yet.

- [ ] **Step 3: Add aiType to Unit.ts**

In `src/entities/Unit.ts`, add after `formation: 'front' | 'back' = 'front';` (line 26):

```typescript
  aiType: AIType;
```

Add `AIType` to the import from `'../types'` at the top of the file.

In the constructor, after `this.formation = 'front';` (or wherever formation is set), add:

```typescript
    this.aiType = 'default';
```

- [ ] **Step 4: Copy aiType in Enemy.ts**

In `src/entities/Enemy.ts`, add after `this.expReward = enemyData.expReward;` (line 27):

```typescript
    this.aiType = enemyData.aiType ?? 'default';
```

Add `AIType` to the import from `'../types'` if not already there.

- [ ] **Step 5: Implement AI behavior in TargetingSystem**

In `src/systems/TargetingSystem.ts`, modify `selectTarget()`. After the staleness cache check (line 102) and before the healer check (line 107), add AI behavior routing:

```typescript
    // AI behavior: override strategy for non-default aiType
    if (unit.aiType && unit.aiType !== 'default' && !unit.isHero) {
      const livingEnemies = enemies.filter(e => e.isAlive);
      if (livingEnemies.length === 0) return null;
      const livingAllies = allies.filter(a => a.isAlive);

      let aiResult: Unit | null = null;
      switch (unit.aiType) {
        case 'aggressive':
          aiResult = this.selectWithElementWeight(unit, livingEnemies, 'lowest_hp');
          break;
        case 'defensive': {
          // Find lowest-HP ally, check its lastAttacker
          const lowestAlly = livingAllies.reduce((min, a) =>
            a.currentHp < min.currentHp ? a : min, livingAllies[0]);
          const protectTarget = lowestAlly?.lastAttacker;
          if (protectTarget && protectTarget.isAlive && livingEnemies.includes(protectTarget)) {
            // Give this target a strong score boost via strategy override
            aiResult = this.selectWithAIBonus(unit, livingEnemies, 'nearest', protectTarget.unitId, 0.5);
          } else {
            aiResult = this.selectWithElementWeight(unit, livingEnemies, 'nearest');
          }
          break;
        }
        case 'disruptor': {
          // Boost score for backRow roles
          const backRowRoles = new Set(['ranged_dps', 'healer', 'support']);
          const backRowTargets = livingEnemies.filter(e => backRowRoles.has(e.role));
          if (backRowTargets.length > 0) {
            aiResult = this.selectWithAIBonus(unit, livingEnemies, 'lowest_hp', null, 0, backRowRoles);
          } else {
            aiResult = this.selectWithElementWeight(unit, livingEnemies, 'lowest_hp');
          }
          break;
        }
        case 'berserker': {
          const maxHp = unit.getEffectiveStats().maxHp;
          if (unit.currentHp < maxHp * 0.5) {
            aiResult = this.selectWithElementWeight(unit, livingEnemies, 'lowest_hp');
          }
          // else: fall through to role-based
          break;
        }
      }

      if (aiResult) {
        targetCache.set(unit.unitId, {
          targetId: aiResult.unitId,
          expiry: TargetingSystem.frameTime + TARGET_STALE_MS,
        });
        return aiResult;
      }
    }
```

- [ ] **Step 6: Add selectWithAIBonus helper method**

In `src/systems/TargetingSystem.ts`, add after `selectWithElementWeight()` (after line 254):

```typescript
  /**
   * Like selectWithElementWeight but adds a score bonus for specific targets.
   * Used by defensive (bonus for specific unitId) and disruptor (bonus for roles).
   */
  private static selectWithAIBonus(
    unit: Unit,
    targets: Unit[],
    baseStrategy: 'nearest' | 'lowest_hp' | 'highest_threat',
    bonusTargetId: string | null,
    bonusAmount: number,
    bonusRoles?: Set<string>,
  ): Unit | null {
    if (targets.length === 0) return null;
    if (targets.length === 1) return targets[0];

    const n = targets.length;
    const rawBase = new Float64Array(n);
    const hasAdv = new Uint8Array(n);
    let maxBase = 0;

    for (let i = 0; i < n; i++) {
      const t = targets[i];
      switch (baseStrategy) {
        case 'nearest':
          rawBase[i] = TargetingSystem.cachedDistance(unit, t);
          break;
        case 'lowest_hp':
          rawBase[i] = t.currentHp;
          break;
        case 'highest_threat':
          rawBase[i] = this.calculateThreat(t);
          break;
      }
      if (rawBase[i] > maxBase) maxBase = rawBase[i];
      if (unit.element && t.element && hasElementAdvantage(unit.element, t.element)) {
        hasAdv[i] = 1;
      }
    }

    const invMaxBase = maxBase > 0 ? 1 / maxBase : 0;
    let bestIdx = 0;
    let bestScore = -Infinity;

    for (let i = 0; i < n; i++) {
      let score: number;
      if (baseStrategy === 'highest_threat') {
        score = rawBase[i] * invMaxBase;
      } else {
        score = 1 - rawBase[i] * invMaxBase;
      }
      if (hasAdv[i]) score += 0.3;

      // AI bonus
      if (bonusTargetId && targets[i].unitId === bonusTargetId) {
        score += bonusAmount;
      }
      if (bonusRoles && bonusRoles.has(targets[i].role)) {
        score += 0.5;
      }

      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    return targets[bestIdx];
  }
```

Add `import { hasElementAdvantage } from '../config/elements';` if not already imported.

- [ ] **Step 7: Run tests**

```bash
npm test -- tests/systems/ai-behavior.test.ts
```

Expected: All 8 tests pass.

- [ ] **Step 8: Full verification**

```bash
npx tsc --noEmit && npm test
```

- [ ] **Step 9: Commit**

```bash
git add src/entities/Unit.ts src/entities/Enemy.ts src/systems/TargetingSystem.ts tests/systems/ai-behavior.test.ts
git commit -m "feat: 5 AI behavior types in TargetingSystem with 8 tests"
```

---

## Task 4: AffixSystem Singleton

**Context:** Core system managing combat affixes. Follows RelicSystem/ActModifierSystem patterns: activate on battle start, tick each frame, deactivate on shutdown. Handles buff injection, EventBus listeners (splitting/reflective/deathburst), periodic effects (regeneration/vengeful), and berserker aiType buff.

**Files:**
- Create: `src/systems/AffixSystem.ts`
- Create: `tests/systems/AffixSystem.test.ts`

- [ ] **Step 1: Write AffixSystem tests**

Create `tests/systems/AffixSystem.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AffixSystem } from '../../src/systems/AffixSystem';
import { EventBus } from '../../src/systems/EventBus';
import { createMockUnit } from '../mocks/phaser';

describe('AffixSystem', () => {
  let affixSystem: AffixSystem;

  beforeEach(() => {
    affixSystem = AffixSystem.getInstance();
    affixSystem.deactivate(); // clean state
    EventBus.getInstance().reset();
  });

  function makeEnemy(overrides: Record<string, unknown> = {}) {
    const u = createMockUnit({ isHero: false, ...overrides } as any);
    (u as any).shieldHp = 0;
    (u as any).shieldDuration = 0;
    (u as any).aiType = (overrides as any).aiType ?? 'default';
    // Add setShield if missing
    if (!(u as any).setShield) {
      (u as any).setShield = (hp: number, dur: number) => {
        (u as any).shieldHp = hp;
        (u as any).shieldDuration = dur;
      };
    }
    return u;
  }

  function makeHero(overrides: Record<string, unknown> = {}) {
    return createMockUnit({ isHero: true, ...overrides } as any);
  }

  describe('lifecycle', () => {
    it('activate registers effects for given affix IDs', () => {
      const enemies = [makeEnemy({ unitId: 'e1' })];
      affixSystem.activate(['berserk'], enemies as any[], []);
      expect(affixSystem.hasAffix('berserk')).toBe(true);
      expect(affixSystem.hasAffix('swift')).toBe(false);
    });

    it('deactivate clears all listeners and state', () => {
      const enemies = [makeEnemy({ unitId: 'e1' })];
      affixSystem.activate(['reflective'], enemies as any[], []);
      affixSystem.deactivate();
      expect(affixSystem.hasAffix('reflective')).toBe(false);
    });

    it('tick updates timers correctly', () => {
      const enemies = [makeEnemy({ unitId: 'e1', currentHp: 500, maxHp: 500 })];
      affixSystem.activate(['regeneration'], enemies as any[], []);
      // Tick 1.1 seconds — should trigger one heal
      affixSystem.tick(1.1);
      expect(enemies[0].currentHp).toBeGreaterThanOrEqual(500); // healed (capped at max)
    });
  });

  describe('buff affixes', () => {
    it('berserk injects +20% attack buff on all enemies', () => {
      const enemy = makeEnemy({ unitId: 'e1', stats: { attack: 100 } });
      affixSystem.activate(['berserk'], [enemy] as any[], []);
      const buff = enemy.statusEffects.find((e: any) => e.id === 'affix_berserk');
      expect(buff).toBeDefined();
      expect(buff!.value).toBe(20); // 100 * 0.2
      expect(buff!.stat).toBe('attack');
    });

    it('swift injects +30% attackSpeed buff on all enemies', () => {
      const enemy = makeEnemy({ unitId: 'e1', stats: { attackSpeed: 1.0 } });
      affixSystem.activate(['swift'], [enemy] as any[], []);
      const buff = enemy.statusEffects.find((e: any) => e.id === 'affix_swift');
      expect(buff).toBeDefined();
      expect(buff!.stat).toBe('attackSpeed');
    });

    it('fortified injects +25% defense buff on all enemies', () => {
      const enemy = makeEnemy({ unitId: 'e1', stats: { defense: 40 } });
      affixSystem.activate(['fortified'], [enemy] as any[], []);
      const buff = enemy.statusEffects.find((e: any) => e.id === 'affix_fortified');
      expect(buff).toBeDefined();
      expect(buff!.stat).toBe('defense');
      expect(buff!.value).toBe(10); // 40 * 0.25
    });

    it('shielded adds 20% maxHp as shield at battle start', () => {
      const enemy = makeEnemy({ unitId: 'e1', maxHp: 500 });
      affixSystem.activate(['shielded'], [enemy] as any[], []);
      expect((enemy as any).shieldHp).toBe(100); // 500 * 0.2
    });
  });

  describe('reactive affixes', () => {
    it('splitting deals 40% splash to nearest hero of damaged hero', () => {
      const enemy = makeEnemy({ unitId: 'e1' });
      const hero1 = makeHero({ unitId: 'h1', currentHp: 500, maxHp: 500, x: 100 });
      const hero2 = makeHero({ unitId: 'h2', currentHp: 500, maxHp: 500, x: 150 });
      affixSystem.activate(['splitting'], [enemy] as any[], [hero1, hero2] as any[]);

      // Simulate enemy dealing 100 damage to hero1
      EventBus.getInstance().emit('unit:damage', {
        sourceId: 'e1', targetId: 'h1', amount: 100,
        damageType: 'physical', isCrit: false,
      });
      // hero2 should take splash (40% of 100 = 40)
      expect(hero2.currentHp).toBeLessThan(500);
    });

    it('reflective reflects 15% damage back to attacker', () => {
      const enemy = makeEnemy({ unitId: 'e1', currentHp: 500, maxHp: 500 });
      const hero1 = makeHero({ unitId: 'h1', currentHp: 500, maxHp: 500 });
      affixSystem.activate(['reflective'], [enemy] as any[], [hero1] as any[]);

      // Simulate hero dealing 100 damage to enemy
      EventBus.getInstance().emit('unit:damage', {
        sourceId: 'h1', targetId: 'e1', amount: 100,
        damageType: 'physical', isCrit: false,
      });
      // hero1 should take 15 reflect damage
      expect(hero1.currentHp).toBeLessThan(500);
    });

    it('deathburst deals 8% maxHp damage to all heroes on enemy death', () => {
      const enemy = makeEnemy({ unitId: 'e1', maxHp: 1000 });
      const hero1 = makeHero({ unitId: 'h1', currentHp: 500, maxHp: 500 });
      const hero2 = makeHero({ unitId: 'h2', currentHp: 500, maxHp: 500 });
      affixSystem.activate(['deathburst'], [enemy] as any[], [hero1, hero2] as any[]);

      EventBus.getInstance().emit('unit:kill', { killerId: 'h1', targetId: 'e1' });
      // Each hero should take 80 damage (1000 * 0.08)
      expect(hero1.currentHp).toBeLessThan(500);
      expect(hero2.currentHp).toBeLessThan(500);
    });

    it('affix damage with isAffixDamage flag does not re-trigger affix listeners', () => {
      const enemy = makeEnemy({ unitId: 'e1', currentHp: 500, maxHp: 500 });
      const hero1 = makeHero({ unitId: 'h1', currentHp: 500, maxHp: 500 });
      affixSystem.activate(['reflective'], [enemy] as any[], [hero1] as any[]);

      // Affix-originated damage should be ignored
      EventBus.getInstance().emit('unit:damage', {
        sourceId: 'h1', targetId: 'e1', amount: 100,
        damageType: 'physical', isCrit: false, isAffixDamage: true,
      });
      // hero1 should NOT take reflect damage
      expect(hero1.currentHp).toBe(500);
    });
  });

  describe('periodic affixes', () => {
    it('regeneration heals 2% maxHp per second', () => {
      const enemy = makeEnemy({ unitId: 'e1', currentHp: 400, maxHp: 500 });
      affixSystem.activate(['regeneration'], [enemy] as any[], []);
      affixSystem.tick(1.0); // 1 second
      expect(enemy.currentHp).toBe(410); // 500 * 0.02 = 10
    });

    it('vengeful activates +35% attack below 40% HP', () => {
      const enemy = makeEnemy({ unitId: 'e1', currentHp: 150, maxHp: 500, stats: { attack: 100 } });
      affixSystem.activate(['vengeful'], [enemy] as any[], []);
      affixSystem.tick(0.1); // trigger check
      const buff = enemy.statusEffects.find((e: any) => e.id === 'affix_vengeful');
      expect(buff).toBeDefined();
      expect(buff!.value).toBe(35); // 100 * 0.35
    });

    it('vengeful does not activate above 40% HP', () => {
      const enemy = makeEnemy({ unitId: 'e1', currentHp: 400, maxHp: 500, stats: { attack: 100 } });
      affixSystem.activate(['vengeful'], [enemy] as any[], []);
      affixSystem.tick(0.1);
      const buff = enemy.statusEffects.find((e: any) => e.id === 'affix_vengeful');
      expect(buff).toBeUndefined();
    });
  });

  describe('formula queries', () => {
    it('getAffixElementBonus returns 0.25 when elemental affix active', () => {
      const enemy = makeEnemy({ unitId: 'e1' });
      affixSystem.activate(['elemental'], [enemy] as any[], []);
      expect(affixSystem.getAffixElementBonus()).toBe(0.25);
    });

    it('getAffixElementBonus returns 0 when no elemental affix', () => {
      const enemy = makeEnemy({ unitId: 'e1' });
      affixSystem.activate(['berserk'], [enemy] as any[], []);
      expect(affixSystem.getAffixElementBonus()).toBe(0);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/systems/AffixSystem.test.ts
```

Expected: FAIL — AffixSystem doesn't exist yet.

- [ ] **Step 3: Implement AffixSystem**

Create `src/systems/AffixSystem.ts`:

```typescript
import { AffixData, AffixId, StatusEffect } from '../types';
import { EventBus } from './EventBus';
import affixesData from '../data/affixes.json';

type AffixDamageEvent = {
  sourceId: string; targetId: string; amount: number;
  damageType: string; isCrit: boolean; isAffixDamage?: boolean;
};

export class AffixSystem {
  private static instance: AffixSystem;

  private activeAffixes: AffixData[] = [];
  private enemies: any[] = [];
  private heroes: any[] = [];
  private listeners: Map<string, (...args: any[]) => void> = new Map();

  // Timers
  private regenTimer: number = 0;

  // One-shot trackers
  private vengefulTriggered: Set<string> = new Set();
  private berserkerTriggered: Set<string> = new Set();

  // Throttle
  private lastEffectTime: Map<string, number> = new Map();
  private elapsedTime: number = 0;

  static getInstance(): AffixSystem {
    if (!AffixSystem.instance) {
      AffixSystem.instance = new AffixSystem();
    }
    return AffixSystem.instance;
  }

  hasAffix(id: string): boolean {
    return this.activeAffixes.some(a => a.id === id);
  }

  getAffixElementBonus(): number {
    const elemental = this.activeAffixes.find(a => a.id === 'elemental');
    return elemental ? elemental.params.elementBonus : 0;
  }

  getActiveAffixes(): AffixData[] {
    return [...this.activeAffixes];
  }

  activate(affixIds: AffixId[], enemies: any[], heroes: any[]): void {
    this.deactivate();
    this.enemies = enemies;
    this.heroes = heroes;

    for (const id of affixIds) {
      const data = (affixesData as AffixData[]).find(a => a.id === id);
      if (data) this.activeAffixes.push(data);
    }

    if (this.activeAffixes.length === 0) return;

    const eb = EventBus.getInstance();

    for (const affix of this.activeAffixes) {
      switch (affix.id) {
        // Buff affixes: inject StatusEffect on all enemies
        case 'berserk':
          this.injectBuff('affix_berserk', 'attack', affix.params.attackBonus);
          break;
        case 'swift':
          this.injectBuff('affix_swift', 'attackSpeed', affix.params.speedBonus);
          break;
        case 'fortified':
          this.injectBuff('affix_fortified', 'defense', affix.params.defenseBonus);
          break;

        // Shield affix: use existing shield mechanism
        case 'shielded':
          for (const enemy of this.enemies) {
            if (!enemy.isAlive) continue;
            const shieldAmount = Math.floor(enemy.currentStats.maxHp * affix.params.shieldPercent);
            if (enemy.setShield) {
              enemy.setShield(shieldAmount, 9999);
            } else {
              enemy.shieldHp = shieldAmount;
              enemy.shieldDuration = 9999;
            }
          }
          break;

        // Reactive affixes: register EventBus listeners
        case 'splitting': {
          const onSplitting = (event: AffixDamageEvent) => {
            if (event.isAffixDamage) return;
            if (!this.isEnemySource(event.sourceId)) return;
            if (!this.throttle(`splitting:${event.targetId}`)) return;
            const target = this.heroes.find(h => h.unitId === event.targetId && h.isAlive);
            if (!target) return;
            const nearest = this.findNearestHero(target);
            if (!nearest) return;
            const splashDmg = Math.floor(event.amount * affix.params.splashRatio);
            nearest.currentHp = Math.max(0, nearest.currentHp - splashDmg);
            if (nearest.currentHp <= 0) nearest.isAlive = false;
            eb.emit('unit:damage', {
              sourceId: event.sourceId, targetId: nearest.unitId,
              amount: splashDmg, damageType: event.damageType,
              isCrit: false, isAffixDamage: true,
            });
          };
          eb.on('unit:damage', onSplitting);
          this.listeners.set('splitting', onSplitting);
          break;
        }

        case 'reflective': {
          const onReflect = (event: AffixDamageEvent) => {
            if (event.isAffixDamage) return;
            if (!this.isEnemyTarget(event.targetId)) return;
            if (!this.throttle(`reflect:${event.sourceId}`)) return;
            const attacker = this.heroes.find(h => h.unitId === event.sourceId && h.isAlive);
            if (!attacker) return;
            const reflectDmg = Math.floor(event.amount * affix.params.reflectRatio);
            attacker.currentHp = Math.max(0, attacker.currentHp - reflectDmg);
            if (attacker.currentHp <= 0) attacker.isAlive = false;
            eb.emit('unit:damage', {
              sourceId: event.targetId, targetId: event.sourceId,
              amount: reflectDmg, damageType: 'physical',
              isCrit: false, isAffixDamage: true,
            });
          };
          eb.on('unit:damage', onReflect);
          this.listeners.set('reflective', onReflect);
          break;
        }

        case 'deathburst': {
          const onDeath = (event: { killerId: string; targetId: string }) => {
            const deadEnemy = this.enemies.find(e => e.unitId === event.targetId);
            if (!deadEnemy) return;
            const dmg = Math.floor(deadEnemy.currentStats.maxHp * affix.params.damagePercent);
            for (const hero of this.heroes) {
              if (!hero.isAlive) continue;
              if (!this.throttle(`deathburst:${hero.unitId}`)) continue;
              hero.currentHp = Math.max(0, hero.currentHp - dmg);
              if (hero.currentHp <= 0) hero.isAlive = false;
              eb.emit('unit:damage', {
                sourceId: event.targetId, targetId: hero.unitId,
                amount: dmg, damageType: 'physical',
                isCrit: false, isAffixDamage: true,
              });
            }
          };
          eb.on('unit:kill', onDeath);
          this.listeners.set('deathburst', onDeath);
          break;
        }

        // Periodic and conditional: handled in tick()
        case 'regeneration':
        case 'vengeful':
        case 'elemental':
          break;
      }
    }
  }

  tick(delta: number): void {
    if (this.activeAffixes.length === 0) return;
    this.elapsedTime += delta;

    // Regeneration: heal 2% maxHp per interval
    if (this.hasAffix('regeneration')) {
      const regen = this.activeAffixes.find(a => a.id === 'regeneration')!;
      this.regenTimer += delta;
      if (this.regenTimer >= regen.params.interval) {
        this.regenTimer -= regen.params.interval;
        for (const enemy of this.enemies) {
          if (!enemy.isAlive) continue;
          const healAmount = Math.floor(enemy.currentStats.maxHp * regen.params.healPercent);
          enemy.currentHp = Math.min(enemy.currentStats.maxHp, enemy.currentHp + healAmount);
        }
      }
    }

    // Vengeful: conditional buff below HP threshold
    if (this.hasAffix('vengeful')) {
      const vengeful = this.activeAffixes.find(a => a.id === 'vengeful')!;
      for (const enemy of this.enemies) {
        if (!enemy.isAlive) continue;
        const key = enemy.unitId;
        const belowThreshold = enemy.currentHp < enemy.currentStats.maxHp * vengeful.params.hpThreshold;
        if (belowThreshold && !this.vengefulTriggered.has(key)) {
          this.vengefulTriggered.add(key);
          const bonus = Math.floor(enemy.currentStats.attack * vengeful.params.attackBonus);
          enemy.statusEffects.push({
            id: 'affix_vengeful', type: 'buff', name: '复仇之怒',
            duration: 9999, value: bonus, stat: 'attack',
          });
        }
      }
    }

    // Berserker aiType: inject attackSpeed buff below 50% HP
    for (const enemy of this.enemies) {
      if (!enemy.isAlive) continue;
      if (enemy.aiType !== 'berserker') continue;
      if (this.berserkerTriggered.has(enemy.unitId)) continue;
      const maxHp = enemy.currentStats.maxHp;
      if (enemy.currentHp < maxHp * 0.5) {
        this.berserkerTriggered.add(enemy.unitId);
        const bonus = Math.round(enemy.currentStats.attackSpeed * 0.5 * 100) / 100;
        enemy.statusEffects.push({
          id: 'affix_berserker_rage', type: 'buff', name: '狂暴之怒',
          duration: 9999, value: bonus, stat: 'attackSpeed',
        });
      }
    }
  }

  deactivate(): void {
    const eb = EventBus.getInstance();
    for (const [key, listener] of this.listeners) {
      if (key === 'deathburst') {
        eb.off('unit:kill', listener);
      } else {
        eb.off('unit:damage', listener);
      }
    }
    this.listeners.clear();
    this.activeAffixes = [];
    this.enemies = [];
    this.heroes = [];
    this.regenTimer = 0;
    this.vengefulTriggered.clear();
    this.berserkerTriggered.clear();
    this.lastEffectTime.clear();
    this.elapsedTime = 0;
  }

  // --- Private helpers ---

  private injectBuff(id: string, stat: string, ratio: number): void {
    for (const enemy of this.enemies) {
      if (!enemy.isAlive) continue;
      const base = (enemy.currentStats as Record<string, number>)[stat] ?? 0;
      const bonus = stat === 'attackSpeed'
        ? Math.round(base * ratio * 100) / 100
        : Math.floor(base * ratio);
      enemy.statusEffects.push({
        id, type: 'buff', name: id,
        duration: 9999, value: bonus, stat,
      } as StatusEffect);
    }
  }

  private isEnemySource(unitId: string): boolean {
    return this.enemies.some(e => e.unitId === unitId);
  }

  private isEnemyTarget(unitId: string): boolean {
    return this.enemies.some(e => e.unitId === unitId);
  }

  private findNearestHero(excludeHero: any): any | null {
    let nearest: any = null;
    let minDist = Infinity;
    for (const hero of this.heroes) {
      if (!hero.isAlive || hero.unitId === excludeHero.unitId) continue;
      const dist = Math.abs(hero.x - excludeHero.x) + Math.abs(hero.y - excludeHero.y);
      if (dist < minDist) {
        minDist = dist;
        nearest = hero;
      }
    }
    return nearest;
  }

  private throttle(key: string): boolean {
    const last = this.lastEffectTime.get(key) ?? 0;
    if (this.elapsedTime - last < 0.15) return false;
    this.lastEffectTime.set(key, this.elapsedTime);
    return true;
  }
}
```

- [ ] **Step 4: Run tests**

```bash
npm test -- tests/systems/AffixSystem.test.ts
```

Expected: All 13 tests pass.

- [ ] **Step 5: Full verification**

```bash
npx tsc --noEmit && npm test
```

- [ ] **Step 6: Commit**

```bash
git add src/systems/AffixSystem.ts tests/systems/AffixSystem.test.ts
git commit -m "feat: AffixSystem singleton with 10 affix effects and 13 tests"
```

---

## Task 5: MapGenerator Affix Assignment

**Context:** Assign affixes to elite/boss nodes during map generation using SeededRNG. Uses AFFIX_COUNT constant from balance.ts keyed by difficulty.

**Files:**
- Modify: `src/systems/MapGenerator.ts`
- Create: `tests/systems/map-affix.test.ts`

- [ ] **Step 1: Write map affix tests**

Create `tests/systems/map-affix.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { MapGenerator } from '../../src/systems/MapGenerator';
import { SeededRNG } from '../../src/utils/rng';

describe('MapGenerator affix assignment', () => {
  it('normal difficulty: elite gets 0 affixes, boss gets 1', () => {
    const rng = new SeededRNG(42);
    const nodes = MapGenerator.generate(rng, 1, 'normal');

    const elites = nodes.filter(n => n.type === 'elite');
    const bosses = nodes.filter(n => n.type === 'boss');

    for (const elite of elites) {
      expect((elite.affixes ?? []).length).toBe(0);
    }
    for (const boss of bosses) {
      expect((boss.affixes ?? []).length).toBe(1);
    }
  });

  it('hell difficulty: elite gets 2 affixes, boss gets 2', () => {
    const rng = new SeededRNG(42);
    const nodes = MapGenerator.generate(rng, 1, 'hell');

    const elites = nodes.filter(n => n.type === 'elite');
    const bosses = nodes.filter(n => n.type === 'boss');

    for (const elite of elites) {
      expect((elite.affixes ?? []).length).toBe(2);
    }
    for (const boss of bosses) {
      expect((boss.affixes ?? []).length).toBe(2);
    }
  });

  it('battle nodes never receive affixes', () => {
    const rng = new SeededRNG(42);
    const nodes = MapGenerator.generate(rng, 1, 'hell');

    const battles = nodes.filter(n => n.type === 'battle');
    for (const battle of battles) {
      expect(battle.affixes).toBeUndefined();
    }
  });

  it('same seed produces same affix assignment', () => {
    const nodes1 = MapGenerator.generate(new SeededRNG(123), 1, 'hard');
    const nodes2 = MapGenerator.generate(new SeededRNG(123), 1, 'hard');

    const elites1 = nodes1.filter(n => n.type === 'elite').map(n => n.affixes);
    const elites2 = nodes2.filter(n => n.type === 'elite').map(n => n.affixes);

    expect(elites1).toEqual(elites2);
  });

  it('no duplicate affixes on same node', () => {
    const rng = new SeededRNG(42);
    const nodes = MapGenerator.generate(rng, 1, 'hell');

    const affixedNodes = nodes.filter(n => n.affixes && n.affixes.length > 1);
    for (const node of affixedNodes) {
      const unique = new Set(node.affixes);
      expect(unique.size).toBe(node.affixes!.length);
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/systems/map-affix.test.ts
```

Expected: FAIL — MapGenerator.generate doesn't accept difficulty parameter yet (or affixes not assigned).

- [ ] **Step 3: Implement affix assignment in MapGenerator**

In `src/systems/MapGenerator.ts`, add imports:

```typescript
import { AFFIX_COUNT } from '../constants';
import affixesData from '../data/affixes.json';
```

Modify the `generate()` method signature (line 23) to accept an optional difficulty parameter:

```typescript
  static generate(rng: SeededRNG, floor: number, difficulty: string = 'normal'): MapNode[] {
```

After the `MapGenerator.addHiddenNodes(allNodes, rng, acts);` call (line 141) and before `return allNodes;` (line 143), add affix assignment:

```typescript
    // Assign affixes to elite/boss nodes based on difficulty
    const affixConfig = AFFIX_COUNT[difficulty] ?? AFFIX_COUNT['normal'];
    const allAffixIds = (affixesData as { id: string }[]).map(a => a.id);
    for (const node of allNodes) {
      if (node.type === 'elite' && affixConfig.elite > 0) {
        node.affixes = rng.pickN(allAffixIds, affixConfig.elite);
      } else if (node.type === 'boss' && affixConfig.boss > 0) {
        node.affixes = rng.pickN(allAffixIds, affixConfig.boss);
      }
    }
```

- [ ] **Step 4: Update callers to pass difficulty**

Search for `MapGenerator.generate(` calls. The main caller is in `RunManager` or `MapScene`. Update to pass difficulty. Read the file to find the exact call site and pass `RunManager.getInstance().getDifficulty()` or equivalent.

If `MapGenerator.generate` is called with only `(rng, floor)` currently, the new default `'normal'` ensures backward compatibility. But for proper integration, update the main call site to pass difficulty.

- [ ] **Step 5: Run tests**

```bash
npm test -- tests/systems/map-affix.test.ts
```

Expected: All 5 tests pass.

- [ ] **Step 6: Full verification**

```bash
npx tsc --noEmit && npm test
```

- [ ] **Step 7: Commit**

```bash
git add src/systems/MapGenerator.ts tests/systems/map-affix.test.ts
git commit -m "feat: MapGenerator assigns affixes to elite/boss nodes by difficulty"
```

---

## Task 6: BattleScene, BattleSystem, NodeTooltip, and DamageSystem Integration

**Context:** Wire AffixSystem into the battle lifecycle, add affix info to NodeTooltip, add battle start banner, unit overhead icons, and DamageSystem element bonus query.

**Files:**
- Modify: `src/scenes/BattleScene.ts`
- Modify: `src/systems/BattleSystem.ts`
- Modify: `src/ui/NodeTooltip.ts`
- Modify: `src/systems/DamageSystem.ts`

- [ ] **Step 1: Add AffixSystem to BattleScene.create()**

In `src/scenes/BattleScene.ts`, add import:

```typescript
import { AffixSystem } from '../systems/AffixSystem';
import affixesData from '../data/affixes.json';
import { AffixData } from '../types';
import { TextFactory } from '../ui/TextFactory';
```

After `RelicSystem.activateWithUnits(...)` (line 215), add:

```typescript
    // Activate affix system for this battle
    const affixSystem = AffixSystem.getInstance();
    affixSystem.activate(node.affixes ?? [], enemies, heroes);

    // Show affix banner if any affixes active
    const activeAffixes = affixSystem.getActiveAffixes();
    if (activeAffixes.length > 0) {
      this.showAffixBanner(activeAffixes);
    }

    // Add overhead affix icons to elite/boss enemies
    if (activeAffixes.length > 0 && (node.type === 'elite' || node.type === 'boss')) {
      for (const enemy of enemies) {
        this.addAffixIcons(enemy, activeAffixes);
      }
    }
```

Add methods to the class:

```typescript
  private showAffixBanner(affixes: AffixData[]): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2 - 40;
    const text = affixes.map(a => `${a.symbol} ${a.name}`).join('  ');
    const banner = TextFactory.create(this, cx, cy, text, 'subtitle', {
      color: '#ffdd44',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(750).setAlpha(0);

    this.tweens.add({
      targets: banner,
      alpha: { from: 0, to: 1 },
      duration: 200,
      hold: 600,
      yoyo: true,
      onComplete: () => banner.destroy(),
    });
  }

  private addAffixIcons(enemy: Enemy, affixes: AffixData[]): void {
    const iconText = affixes.map(a => a.symbol).join(' ');
    const avgColor = affixes[0].symbolColor;
    const icon = TextFactory.create(this, 0, -35, iconText, 'tiny', {
      color: avgColor,
    }).setOrigin(0.5);
    enemy.add(icon);
  }
```

- [ ] **Step 2: Add AffixSystem.deactivate() to shutdown()**

In `src/scenes/BattleScene.ts`, in `shutdown()` (line 1141), after `RelicSystem.deactivate();`:

```typescript
    AffixSystem.getInstance().deactivate();
```

- [ ] **Step 3: Add AffixSystem.tick() to BattleSystem**

In `src/systems/BattleSystem.ts`, add import:

```typescript
import { AffixSystem } from './AffixSystem';
```

In `updateCombat()`, after `this.actModifier.tick(...)` (line 285-286), add:

```typescript
    // Tick affix effects
    AffixSystem.getInstance().tick(adjustedDelta);
```

- [ ] **Step 4: Add affix display to NodeTooltip**

In `src/ui/NodeTooltip.ts`, add import:

```typescript
import affixesData from '../data/affixes.json';
import { AffixData } from '../types';
```

In `buildLines()`, after the battle/elite/boss/gauntlet case block (after line 88, before the closing `break;`), add:

```typescript
        // Show affixes for elite/boss nodes
        if (node.affixes && node.affixes.length > 0) {
          for (const affixId of node.affixes) {
            const affix = (affixesData as AffixData[]).find(a => a.id === affixId);
            if (affix) {
              lines.push(`  ${affix.symbol} ${affix.name} ${affix.shortDesc}`);
            }
          }
        }
```

- [ ] **Step 5: Add element bonus query to DamageSystem**

In `src/systems/DamageSystem.ts`, find where element damage bonus is applied. Add import:

```typescript
import { AffixSystem } from './AffixSystem';
```

In the damage calculation, after the existing element multiplier calculation, add:

```typescript
    // Affix element bonus (enemy-only)
    if (!attacker.isHero) {
      const affixElementBonus = AffixSystem.getInstance().getAffixElementBonus();
      if (affixElementBonus > 0 && attacker.element) {
        finalDamage *= (1 + affixElementBonus);
      }
    }
```

Find the exact location by reading the file — it should be near where `elementMod` is applied.

- [ ] **Step 6: Verify**

```bash
npx tsc --noEmit && npm test
```

- [ ] **Step 7: Commit**

```bash
git add src/scenes/BattleScene.ts src/systems/BattleSystem.ts src/ui/NodeTooltip.ts src/systems/DamageSystem.ts
git commit -m "feat: wire AffixSystem into battle lifecycle, tooltip, and damage pipeline"
```

---

## Task 7: Data Integrity + Save Compatibility Tests

**Context:** Validate affixes.json structure and ensure old saves without `affixes` field load correctly.

**Files:**
- Create: `tests/data/affix-integrity.test.ts`
- Create: `tests/integration/affix-save.test.ts`

- [ ] **Step 1: Write affix data integrity tests**

Create `tests/data/affix-integrity.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import affixesData from '../../src/data/affixes.json';

describe('affix data integrity', () => {
  it('has exactly 10 affixes', () => {
    expect(affixesData.length).toBe(10);
  });

  it('all affix IDs are unique', () => {
    const ids = affixesData.map(a => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all affixes have required fields', () => {
    for (const affix of affixesData) {
      expect(affix.id).toBeTruthy();
      expect(affix.name).toBeTruthy();
      expect(affix.shortDesc).toBeTruthy();
      expect(affix.description).toBeTruthy();
      expect(['offensive', 'defensive', 'special']).toContain(affix.category);
      expect(affix.symbol).toBeTruthy();
      expect(affix.symbolColor).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(typeof affix.params).toBe('object');
      expect(Object.keys(affix.params).length).toBeGreaterThan(0);
    }
  });

  it('shortDesc is at most 6 characters', () => {
    for (const affix of affixesData) {
      expect(affix.shortDesc.length).toBeLessThanOrEqual(6);
    }
  });
});
```

- [ ] **Step 2: Write save compatibility tests**

Create `tests/integration/affix-save.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { MapNode } from '../../src/types';

describe('affix save compatibility', () => {
  it('old save without node.affixes loads without error', () => {
    const oldNode: MapNode = {
      index: 0,
      type: 'elite',
      completed: false,
      connections: [1],
      data: { enemies: [{ id: 'orc_warrior', level: 5 }] },
    };
    // affixes field is optional — accessing it should return undefined
    expect(oldNode.affixes).toBeUndefined();
    expect((oldNode.affixes ?? []).length).toBe(0);
  });

  it('node.affixes survives serialize/deserialize cycle', () => {
    const node: MapNode = {
      index: 0,
      type: 'boss',
      completed: false,
      connections: [1],
      data: { enemies: [{ id: 'dragon_boss', level: 10 }] },
      affixes: ['berserk', 'reflective'],
    };
    const json = JSON.stringify(node);
    const restored = JSON.parse(json) as MapNode;
    expect(restored.affixes).toEqual(['berserk', 'reflective']);
  });

  it('MapNode with empty affixes array treated as no affixes', () => {
    const node: MapNode = {
      index: 0,
      type: 'elite',
      completed: false,
      connections: [1],
      affixes: [],
    };
    expect((node.affixes ?? []).length).toBe(0);
  });

  it('BattleScene handles undefined node.affixes gracefully', () => {
    // This tests the ?? [] guard used in BattleScene.create()
    const affixes: string[] | undefined = undefined;
    const resolved = affixes ?? [];
    expect(resolved).toEqual([]);
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npm test -- tests/data/affix-integrity.test.ts tests/integration/affix-save.test.ts
```

Expected: All 8 tests pass.

- [ ] **Step 4: Full verification**

```bash
npx tsc --noEmit && npm test
```

- [ ] **Step 5: Commit**

```bash
git add tests/data/affix-integrity.test.ts tests/integration/affix-save.test.ts
git commit -m "test: affix data integrity and save compatibility tests"
```

---

## Task 8: Final Verification

- [ ] **Step 1: Full type check + test suite**

```bash
npx tsc --noEmit && npm test
```

Expected: Zero TS errors, all tests pass.

- [ ] **Step 2: Verify test count**

Previous: 1100 tests. New tests:
- AI behavior: 8 tests
- AffixSystem: 13 tests
- Map affix: 5 tests
- Data integrity: 4 tests
- Save compat: 4 tests

Expected: ~1134+ tests.

- [ ] **Step 3: Verify acceptance criteria**

1. ✅ 16 enemies have non-default aiType, all 5 bosses assigned
2. ✅ 10 affixes fully implemented
3. ✅ Elite/boss nodes receive correct affix count per difficulty
4. ✅ NodeTooltip displays affix symbol + shortDesc
5. ✅ Battle start banner parallel to preparing, non-blocking
6. ✅ All affix effects function (buff/reflect/splash/regen/deathburst/vengeful/elemental/shielded)
7. ✅ AffixSystem.deactivate() fully cleans up
8. ✅ Old saves without affixes load without error
9. ✅ SeededRNG determinism
10. ✅ Throttle at 150ms
11. ✅ Existing tests unaffected
12. ✅ Zero TS errors

---

## Execution Order

```
Task 1 (types/constants/i18n)     — independent, unblocks all
Task 2 (enemy/affix data)         — depends on Task 1
Task 3 (TargetingSystem AI)       — depends on Task 1 + 2
Task 4 (AffixSystem)              — depends on Task 1 + 2
Task 5 (MapGenerator affixes)     — depends on Task 1 + 2
Task 6 (BattleScene integration)  — depends on Task 4 + 5
Task 7 (data/save tests)          — depends on Task 1 + 2
Task 8 (verification)             — depends on all
```

**Recommended execution:**
- Task 1 first (unblocks everything)
- Task 2 after Task 1
- Task 3 + Task 4 + Task 5 + Task 7 can parallel (all depend on Task 1+2, touch different files)
- Task 6 after Task 4 + Task 5
- Task 8 last
