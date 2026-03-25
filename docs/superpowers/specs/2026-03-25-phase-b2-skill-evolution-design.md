# v1.24 Phase B2 — Skill Evolution System Design Spec

**Goal:** Add branching skill evolution at hero level 5 (2-choose-1) with auto-enhancement at level 10, creating differentiated hero growth paths that significantly increase Build depth.

**Scope:** 10 core heroes (2 per role), first regular skill only (skills[0]), 20 evolution options + 10 embedded level-10 enhancements.

**Non-goals:** No evolution for skills[1] (keeps existing skill-advancements), no evolution for ultimates, no "reset evolution" feature, no second fork at level 10.

---

## 1. Core Mechanism

- **Level 5**: Hero's first skill (skills[0]) offers 2-choose-1 evolution branch
- **Level 10**: Automatically enhances the chosen branch (numerical bonus, no new choice)
- **Other skills**: skills[1] retains existing skill-advancements system unchanged
- **Ultimates**: Unaffected

### Constraints

1. **One-time binding**: Once an evolution is chosen for a hero+skill pair, it cannot be overwritten during the run. Only a future "reset evolution" feature (out of scope) would change it.
2. **Event-driven trigger**: `RunManager.addExp()` detects level-5 crossing and produces a `pendingEvolutions` list. RewardScene consumes this list — it does not derive it. Note: `applyBattleResult()` (which calls `addExp()`) runs in BattleScene before transitioning to RewardScene, so pendingEvolutions is already populated when RewardScene.create() runs.
3. **Interrupt recovery**: If player exits before choosing, the pending state is recoverable from `heroLevel >= 5 && hero has evolution config && !skillEvolutions[heroId:skillId]`. MapScene forces the choice before allowing next battle.

---

## 2. Evolution Data Structure

**New file: `src/data/skill-evolutions.json`**

```typescript
interface SkillEvolution {
  id: string;              // Evolution skill ID, e.g. "fireball_aoe"
  heroId: string;          // Hero ID (denormalized for readability — also encoded in lookup key)
  sourceSkillId: string;   // Original skill ID, e.g. "fireball"
  branch: 'A' | 'B';      // Branch identifier
  name: string;            // Chinese name
  description: string;     // Chinese description
  // Fields to override on the base skill (MUST NOT include 'id' — evolved skill keeps base ID for cooldown tracking)
  overrides: Omit<Partial<SkillData>, 'id'>;
  // Level 10 auto-enhancement (additive, same semantics as skill-advancements bonuses)
  level10Bonus?: Partial<{
    baseDamage: number;
    scalingRatio: number;
    cooldown: number;
    aoeRadius: number;
    effectDuration: number;
  }>;
}
```

**Merge semantics**: `{ ...baseSkill, ...overrides }` shallow spread. The evolved skill retains the original `id` (base skill ID) so that `unit.skillCooldowns` map keys are unaffected. The evolution's display `name` and `description` are used for UI only (stored in the SkillEvolution entry, not in overrides). **Note on nested fields**: `overrides.effects` (if present) completely replaces `baseSkill.effects` — no array merging. If an evolution needs base effects plus new effects, `overrides.effects` must contain the full array.

**Data loading**: Import in SkillSystem.ts as `import evolutionsData from '../data/skill-evolutions.json'`. Build a lookup map `Map<string, SkillEvolution[]>` keyed by `heroId:sourceSkillId` on module load.

### Evolution Content (10 heroes × 2 branches = 20 entries)

| Role | Hero | Skill (skills[0]) | Branch A | Branch B |
|------|------|--------------------|----------|----------|
| Tank | warrior | shield_bash | AOE taunt (aoeRadius+, taunt effect) | High-damage stun (baseDamage×1.8, stun 1.5s) |
| Tank | knight | holy_smite | Holy burst AOE (all_enemies, +aoe, -damage) | Judgment strike (single, ×2 damage, +heal self) |
| Melee DPS | rogue | backstab | Bleed combo (3-hit, DOT) | Crit burst (baseDamage×2.5, +30% crit) |
| Melee DPS | berserker | berserk_rage | Lifesteal rage (heal 20% of damage) | Frenzy AOE (all_enemies, +cooldown) |
| Ranged DPS | mage | fireball | Flame storm (all_enemies, +aoe, -damage) | Precision rocket (single, ×2 damage, -cooldown) |
| Ranged DPS | archer | multi_shot | Barrage (5 targets, -20% damage each) | Focused shot (single, ×2.5 damage, +range) |
| Healer | priest | heal | Group heal (all_allies, -40% healing) | Shield heal (single, +50% heal, +shield effect) |
| Healer | druid | nature_heal | HOT bloom (ally, HOT 5s) | Heal + attack buff (heal + 15% attack 8s) |
| Support | elemental_weaver | elemental_infusion | Element amplify (apply element vulnerability) | Resist shred (reduce magic resist 20, 5s) |
| Support | frost_whisperer | frost_shield | Ice fortress (self+adjacent, +shield amount) | Frostbite aura (enemies nearby take ice DOT) |

Each entry includes a `level10Bonus` (+15-25% enhancement to the branch's signature stat).

**Note on shared skills**: `backstab` is shared by `rogue` and `shadow_assassin`. Evolution entries are keyed by `heroId:sourceSkillId`, so rogue's backstab evolution does NOT affect shadow_assassin (who is not in the 10-hero scope and uses legacy advancement).

---

## 3. HeroState Storage

Add to `HeroState` in `src/types/index.ts`:

```typescript
interface HeroState {
  // ... existing fields ...
  skillEvolutions?: Record<string, string>;  // "heroId:baseSkillId" → evolutionId
}
```

**Rules:**
- Key format: `"heroId:baseSkillId"` (e.g. `"rogue:backstab"`) — composite key disambiguates shared skills
- Value is the evolution ID (e.g. `"backstab_bleed"`)
- Once written, not overwritable during the run
- Missing field (`?? {}`) = no evolutions chosen (old save compat)

---

## 4. Runtime Skill Resolution Priority

`SkillSystem.getAdvancedSkill(baseSkill, heroLevel, heroId?, evolutions?)` follows this exact priority:

```
1. Is heroId:baseSkill.id in the evolution config lookup?
   NO  → Step 2 (legacy path)
   YES → Step 3 (evolution path)

2. LEGACY PATH: Apply existing skill-advancements bonuses for qualifying levels.
   Return enhanced skill. (Unchanged from current behavior.)

3. Is heroLevel < EVOLUTION_LEVEL (5)?
   YES → Return base skill as-is (no advancement, no evolution)

4. Does evolutions["heroId:baseSkill.id"] exist (player has chosen)?
   NO  → Fall back to LEGACY PATH (Step 2) — apply skill-advancements until player chooses.
         This avoids a power cliff where the hero loses advancement bonuses while waiting to choose.
   YES → Step 5

5. Load SkillEvolution by evolutionId. Merge: { ...baseSkill, ...overrides }.
   Create evolved skill copy (retains original baseSkill.id for cooldown tracking).

6. Is heroLevel >= EVOLUTION_ENHANCE_LEVEL (10)?
   YES → Apply level10Bonus on top of evolved skill.
   NO  → Return evolved skill as-is.
```

**Key invariant**: For skills in the evolution config, once an evolution is **chosen**, old `skill-advancements.json` entries are **never applied** for that skill. Before a choice is made (pending state), legacy advancements still apply as a fallback to avoid power cliffs. Evolution data should be designed so that each branch at level 5 is at least as strong as the corresponding legacy advancement.

**`initializeSkills()` update**: This method calls `getAdvancedSkill()` internally. It must be updated to accept and pass `heroId` and `evolutions` parameters. Call site in BattleScene passes `hero.id` and `hero.skillEvolutions ?? {}`.

---

## 5. Pending Evolution Flow

### Producer: RunManager.addExp()

When a hero levels up and crosses `EVOLUTION_LEVEL`, detect using **level-crossing check** (not per-level callback):
```
const startLevel = hero.level;  // capture before addExp loop
// ... after while loop completes ...
if (startLevel < EVOLUTION_LEVEL && hero.level >= EVOLUTION_LEVEL) { ... }
```

Steps:
1. Look up hero's skills[0] from hero data
2. Check if `heroId:skills[0]` has evolution config entries
3. Check if `skillEvolutions["heroId:skills[0]"]` is already set (guard)
4. If evolution available and not yet chosen: add `{ heroId, skillId }` to `RunManager.pendingEvolutions`

`pendingEvolutions` is a **transient array** on RunManager (not serialized). It's populated during `addExp()` — which is called by `applyBattleResult()` in BattleScene context — and consumed by RewardScene.

### Consumer: RewardScene

When RewardScene.create() runs, exp has already been applied:
1. Check `RunManager.getPendingEvolutions()`
2. For each pending evolution, show SkillEvolutionPanel (queued, one at a time)
3. Player makes choice → `RunManager.setSkillEvolution(heroId, skillId, evolutionId)`
4. Clear from pending list
5. After all choices made, show continue button to MapScene

### Interrupt Recovery: MapScene

On MapScene.create():
1. Scan all heroes: for each hero, check if `heroLevel >= EVOLUTION_LEVEL && heroId:skills[0] in evolutionConfig && !skillEvolutions["heroId:skills[0]"]`
2. If any found, show SkillEvolutionPanel before allowing node selection
3. **Block battle entry** (safety net): If pending evolutions still exist after the panel flow (e.g., app crash mid-selection restored with partial pending), clicking battle/elite/boss nodes shows warning `UI.evolution.pendingWarning` instead of starting. In normal flow the panel is mandatory (no close-on-click), so this guard only fires in edge cases.

This makes pending state **derivable from data** (level + missing mapping), not a separate persisted flag.

---

## 6. Skill Evolution Panel UI

**Component: `src/ui/SkillEvolutionPanel.ts`**

- **Size**: 480×320, centered, depth 800+ (standard modal pattern)
- **Backdrop**: Semi-transparent black at depth 799 (no close-on-click — must choose)
- **Title**: "[英雄名] 技能进化！" (subtitle preset, gold color)
- **Layout**: Two branch cards side by side (200×240 each, 20px gap)

**Each branch card shows:**
- Evolution name (body, bold)
- Description (small, 2-3 lines)
- Key stat changes vs base skill (color-coded: green=buff, red=nerf)
  - e.g. "伤害 60→120 ▲" / "冷却 7s→10s ▼" / "目标 单体→全体"
- "选择" button at bottom

**On selection:**
- Confirm animation (selected card pulses, other fades)
- Call `RunManager.setSkillEvolution(heroId, baseSkillId, evolutionId)`
- Play sfx_levelup
- Panel closes, next pending evolution (if any) or continue

---

## 7. Balance Constants

Add to `src/config/balance.ts`:

```typescript
export const EVOLUTION_LEVEL = 5;          // Level that triggers evolution choice
export const EVOLUTION_ENHANCE_LEVEL = 10; // Level that auto-enhances chosen evolution
```

Re-export from `src/constants.ts`.

---

## 8. i18n Strings

```typescript
// In UI.evolution:
evolution: {
  title: (heroName: string) => `${heroName} 技能进化！`,
  choose: '选择',
  branchA: 'A路线',
  branchB: 'B路线',
  damageChange: (before: number, after: number) => `伤害 ${before}→${after}`,
  cooldownChange: (before: number, after: number) => `冷却 ${before}s→${after}s`,
  targetChange: (before: string, after: string) => `目标 ${before}→${after}`,
  pendingWarning: '有英雄尚未完成技能进化选择！',
  enhanced: (skillName: string) => `${skillName} 已强化！`,
},
```

---

## 9. File Change Map

| File | Change | Section |
|------|--------|---------|
| `src/data/skill-evolutions.json` | **Create** | §2 — 20 evolution entries (each with embedded level10Bonus) |
| `src/types/index.ts` | Modify | §2+§3 — SkillEvolution interface + HeroState.skillEvolutions |
| `src/config/balance.ts` | Modify | §7 — EVOLUTION_LEVEL + EVOLUTION_ENHANCE_LEVEL |
| `src/constants.ts` | Modify | §7 — Re-export 2 new constants |
| `src/i18n.ts` | Modify | §8 — Evolution UI strings |
| `src/systems/SkillSystem.ts` | Modify | §4 — getAdvancedSkill() + initializeSkills() evolution resolution |
| `src/managers/RunManager.ts` | Modify | §5 — pendingEvolutions + setSkillEvolution() + addExp() trigger |
| `src/scenes/RewardScene.ts` | Modify | §5 — Consume pending evolutions after rewards |
| `src/scenes/MapScene.ts` | Modify | §5 — Interrupt recovery check + battle entry block |
| `src/systems/BattleSystem.ts` | Modify | §4 — Pass heroId + skillEvolutions to initializeSkills() (~line 103) |
| `src/ui/SkillEvolutionPanel.ts` | **Create** | §6 — Evolution choice modal |
| `tests/systems/SkillSystem.test.ts` | Modify | Evolution resolution tests |
| `tests/managers/RunManager.test.ts` | Modify | Pending evolution + setSkillEvolution tests |
| `tests/ui/SkillEvolutionPanel.test.ts` | **Create** | Panel tests |

**Files NOT changed:**
- `src/data/skill-advancements.json` — unchanged, still applies to non-evolution skills
- `src/systems/SkillQueueSystem.ts` — evolution doesn't change queue behavior
- `src/systems/UltimateSystem.ts` — ultimates unaffected

---

## 10. Save Compatibility

- `HeroState.skillEvolutions` is optional (`?? {}`)
- Old saves: all heroes use base skills, no evolutions — correct behavior
- Pending evolutions are derivable (level ≥ 5 + no mapping), not persisted separately
- No migration needed

---

## 11. Key Test Scenarios

### Skill resolution tests
- Non-evolution skill at level 10 → applies skill-advancements (legacy)
- Evolution skill at level 3 → returns base skill, no advancement
- Evolution skill at level 5 without choice → falls back to legacy advancement (not base skill)
- Evolution skill at level 5 with choice → applies overrides, retains base skill ID
- Evolution skill at level 10 with choice → applies overrides + level10Bonus
- Evolution skill with choice, verify old skill-advancements NOT applied
- Shared skill (backstab): rogue gets evolution, shadow_assassin gets legacy advancement

### RunManager tests
- addExp to level 5 with evolution skill → pendingEvolutions populated
- addExp to level 5 without evolution skill → pendingEvolutions empty
- setSkillEvolution writes to heroState.skillEvolutions with composite key
- setSkillEvolution rejects overwrite of existing choice
- getPendingEvolutions returns correct list

### Evolution panel tests
- Panel renders two branch cards with correct data
- Selection writes evolution and closes panel
- Multiple pending evolutions queue correctly

---

## 12. Acceptance Criteria

1. **Evolution choice**: Level 5 heroes with evolution skills see 2-choose-1 panel in RewardScene
2. **Level 10 enhance**: Chosen branch auto-strengthens at level 10
3. **Mutual exclusion**: Evolution skills never use old skill-advancements
4. **Pending fallback**: Pending evolution heroes use legacy skill-advancements (no power cliff)
5. **One-time binding**: Chosen evolution cannot be overwritten
6. **Interrupt recovery**: MapScene catches missed choices, blocks battle entry
7. **Composite key**: Evolution keyed by heroId:skillId, shared skills disambiguated
8. **Cooldown tracking**: Evolved skill retains base skill ID for skillCooldowns map
9. **10 heroes covered**: warrior, knight, rogue, berserker, mage, archer, priest, druid, elemental_weaver, frost_whisperer
10. **Save compat**: Old saves work without errors
11. **shadow_assassin isolation**: shadow_assassin's backstab still uses legacy skill-advancements, unaffected by rogue's evolution
12. **Tests**: `npx tsc --noEmit && npm test` passes with zero errors
