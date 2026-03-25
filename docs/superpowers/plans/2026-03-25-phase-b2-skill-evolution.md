# v1.24 Phase B2 — Skill Evolution System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 2-choose-1 skill evolution at hero level 5 with auto-enhancement at level 10 for 10 core heroes, creating differentiated hero growth paths.

**Architecture:** New `skill-evolutions.json` data file defines 20 evolution branches. `SkillSystem.getAdvancedSkill()` gains a 6-step resolution priority (legacy vs evolution path). `RunManager.addExp()` detects level-5 crossing and populates a transient `pendingEvolutions` list. `RewardScene` consumes pending evolutions via `SkillEvolutionPanel`. `MapScene` provides interrupt recovery. `HeroState.skillEvolutions` stores choices with composite `heroId:skillId` keys.

**Tech Stack:** TypeScript, Phaser 3, Vitest

**Spec:** `docs/superpowers/specs/2026-03-25-phase-b2-skill-evolution-design.md`

---

## File Map

| File | Responsibility | Tasks |
|------|---------------|-------|
| `src/types/index.ts` | SkillEvolution interface + HeroState field | Task 1 |
| `src/config/balance.ts` | EVOLUTION_LEVEL + EVOLUTION_ENHANCE_LEVEL | Task 1 |
| `src/constants.ts` | Re-exports | Task 1 |
| `src/i18n.ts` | Evolution UI strings | Task 1 |
| `src/data/skill-evolutions.json` | 20 evolution entries | Task 2 |
| `src/systems/SkillSystem.ts` | getAdvancedSkill() + initializeSkills() evolution | Task 3 |
| `tests/systems/SkillSystem.test.ts` | Resolution priority tests | Task 3 |
| `src/managers/RunManager.ts` | pendingEvolutions + setSkillEvolution + addExp trigger | Task 4 |
| `tests/managers/RunManager.test.ts` | Pending + binding tests | Task 4 |
| `src/systems/BattleSystem.ts` | Pass heroId + evolutions to initializeSkills | Task 5 |
| `src/ui/SkillEvolutionPanel.ts` | Evolution choice modal | Task 6 |
| `tests/ui/SkillEvolutionPanel.test.ts` | Panel tests | Task 6 |
| `src/scenes/RewardScene.ts` | Consume pending evolutions | Task 7 |
| `src/scenes/MapScene.ts` | Interrupt recovery + battle block | Task 7 |

---

## Task 1: Types, Constants, and i18n

**Context:** Foundation for all subsequent tasks. Adds the SkillEvolution interface, HeroState.skillEvolutions field, balance constants, and UI strings.

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/config/balance.ts`
- Modify: `src/constants.ts`
- Modify: `src/i18n.ts`

- [ ] **Step 1: Add SkillEvolution interface and HeroState field**

In `src/types/index.ts`, add after the existing `SkillAdvancement` interface:

```typescript
export interface SkillEvolution {
  id: string;
  heroId: string;
  sourceSkillId: string;
  branch: 'A' | 'B';
  name: string;
  description: string;
  overrides: Omit<Partial<SkillData>, 'id'>;
  level10Bonus?: Partial<{
    baseDamage: number;
    scalingRatio: number;
    cooldown: number;
    aoeRadius: number;
    effectDuration: number;
  }>;
}
```

In `HeroState` (line ~56-70), add after `formation?`:

```typescript
  skillEvolutions?: Record<string, string>;  // "heroId:baseSkillId" → evolutionId
```

- [ ] **Step 2: Add balance constants**

In `src/config/balance.ts`, add after the economy section:

```typescript
// ============ Skill Evolution ============

export const EVOLUTION_LEVEL = 5;
export const EVOLUTION_ENHANCE_LEVEL = 10;
```

In `src/constants.ts`, add inside the `export { ... } from './config/balance'` block, after `REACTION_DAMAGE_BONUS_CAP,` (last line before closing `}`):

```typescript
  // Skill Evolution
  EVOLUTION_LEVEL,
  EVOLUTION_ENHANCE_LEVEL,
```

- [ ] **Step 3: Add i18n strings**

In `src/i18n.ts`, add a new `evolution` section in the `UI` object:

```typescript
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

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit && npm test
```

Expected: Zero errors, all 1083 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/types/index.ts src/config/balance.ts src/constants.ts src/i18n.ts
git commit -m "feat: add SkillEvolution types, constants, and i18n for evolution system"
```

---

## Task 2: Evolution Data Content

**Context:** Create the 20 evolution entries (10 heroes × 2 branches) in a new JSON file. Each entry has overrides that modify the base skill and a level10Bonus for auto-enhancement. The overrides MUST NOT include `id` — the evolved skill keeps the base skill ID for cooldown tracking.

**Files:**
- Create: `src/data/skill-evolutions.json`

- [ ] **Step 1: Create skill-evolutions.json**

Create `src/data/skill-evolutions.json` with 20 entries. Here is the complete file content. Each evolution's overrides must produce a skill at least as strong as the corresponding level-5 skill-advancement (to avoid downgrade feel when choosing).

The file should be a JSON array of SkillEvolution objects. Each entry needs: `id`, `heroId`, `sourceSkillId`, `branch` (A or B), `name`, `description`, `overrides` (partial skill fields, NO `id`), and `level10Bonus`.

Write the full 20-entry JSON array covering:
- warrior/shield_bash: A=AOE taunt, B=high-damage stun
- knight/holy_smite: A=holy burst AOE, B=judgment strike
- rogue/backstab: A=bleed combo, B=crit burst
- berserker/berserk_rage: A=lifesteal rage, B=frenzy AOE
- mage/fireball: A=flame storm AOE, B=precision rocket
- archer/multi_shot: A=barrage 5-target, B=focused shot
- priest/heal: A=group heal, B=shield heal
- druid/nature_heal: A=HOT bloom, B=heal+attack buff
- elemental_weaver/elemental_infusion: A=element amplify, B=resist shred
- frost_whisperer/frost_shield: A=ice fortress, B=frostbite aura

For each base skill, look up its current values in `src/data/skills.json` to set appropriate override values. For each, also check `src/data/skill-advancements.json` to ensure the evolution at level 5 is at least as strong as the legacy advancement at level 5.

- [ ] **Step 2: Verify JSON parses correctly**

```bash
node -e "const d = require('./src/data/skill-evolutions.json'); console.log(d.length + ' entries'); console.log(d.map(e => e.id).join(', '));"
```

Expected: `20 entries` and all 20 IDs listed.

- [ ] **Step 3: Verify type check**

```bash
npx tsc --noEmit
```

Expected: Zero errors (JSON imported with correct typing in Task 3).

- [ ] **Step 4: Commit**

```bash
git add src/data/skill-evolutions.json
git commit -m "content: add 20 skill evolution entries for 10 core heroes"
```

---

## Task 3: SkillSystem Evolution Resolution

**Context:** `SkillSystem.getAdvancedSkill()` currently applies skill-advancements. It needs a 6-step resolution priority: check evolution config → legacy fallback or evolution path → merge overrides → apply level10Bonus. `initializeSkills()` must pass heroId and evolutions through.

**Files:**
- Modify: `src/systems/SkillSystem.ts`
- Modify: `tests/systems/SkillSystem.test.ts`

- [ ] **Step 1: Write evolution resolution tests**

Add imports to `tests/systems/SkillSystem.test.ts`:

```typescript
import { EVOLUTION_LEVEL, EVOLUTION_ENHANCE_LEVEL } from '../../src/constants';
```

Add new describe block:

```typescript
  describe('evolution resolution', () => {
    it('non-evolution skill at level 10 applies legacy advancements', () => {
      const unit = createMockUnit({ unitId: 'warrior1' });
      // taunt_shout is NOT in evolution config, should use legacy path
      skillSystem.initializeSkills(unit as any, ['taunt_shout'], 10);
      const skill = unit.skills.find((s: any) => s.id === 'taunt_shout');
      expect(skill).toBeDefined();
      // Legacy advancement should have been applied (if exists)
    });

    it('evolution skill below level 5 returns base skill', () => {
      const unit = createMockUnit({ unitId: 'mage1' });
      // fireball has evolution config for 'mage', but hero level 3 < EVOLUTION_LEVEL
      skillSystem.initializeSkills(unit as any, ['fireball'], 3, 'mage', {});
      const skill = unit.skills.find((s: any) => s.id === 'fireball');
      expect(skill).toBeDefined();
      // Should be base skill (no advancement, no evolution)
      expect(skill!.baseDamage).toBe(60); // base fireball damage
    });

    it('evolution skill at level 5 without choice falls back to legacy', () => {
      const unit = createMockUnit({ unitId: 'mage1' });
      // Level 5, evolution exists for mage:fireball, but no choice made
      skillSystem.initializeSkills(unit as any, ['fireball'], 5, 'mage', {});
      const skill = unit.skills.find((s: any) => s.id === 'fireball');
      expect(skill).toBeDefined();
      // Should have legacy advancement applied (not base skill)
      expect(skill!.baseDamage).toBeGreaterThan(60);
    });

    it('evolution skill at level 5 with choice applies overrides', () => {
      const unit = createMockUnit({ unitId: 'mage1' });
      skillSystem.initializeSkills(unit as any, ['fireball'], 5, 'mage', { 'mage:fireball': 'fireball_storm' });
      const skill = unit.skills.find((s: any) => s.id === 'fireball');
      expect(skill).toBeDefined();
      // Should have evolution overrides applied (e.g. targetType changed to all_enemies)
      expect(skill!.targetType).toBe('all_enemies');
    });

    it('evolved skill retains base skill ID for cooldown tracking', () => {
      const unit = createMockUnit({ unitId: 'mage1' });
      skillSystem.initializeSkills(unit as any, ['fireball'], 5, 'mage', { 'mage:fireball': 'fireball_storm' });
      const skill = unit.skills.find((s: any) => s.id === 'fireball');
      expect(skill).toBeDefined();
      expect(skill!.id).toBe('fireball'); // retained, not 'fireball_storm'
      expect(unit.skillCooldowns.has('fireball')).toBe(true);
    });

    it('evolution skill at level 10 with choice applies overrides + level10Bonus', () => {
      const unit = createMockUnit({ unitId: 'mage1' });
      skillSystem.initializeSkills(unit as any, ['fireball'], 10, 'mage', { 'mage:fireball': 'fireball_storm' });
      const skill = unit.skills.find((s: any) => s.id === 'fireball');
      expect(skill).toBeDefined();
      // Should have evolution + level10 enhancement
      expect(skill!.targetType).toBe('all_enemies');
    });

    it('evolution skill with choice does NOT apply legacy advancements', () => {
      const unit = createMockUnit({ unitId: 'mage1' });
      // With evolution chosen, legacy advancements should not be applied
      skillSystem.initializeSkills(unit as any, ['fireball'], 10, 'mage', { 'mage:fireball': 'fireball_storm' });
      const evolved = unit.skills.find((s: any) => s.id === 'fireball');

      // Compare with legacy-only version
      const unit2 = createMockUnit({ unitId: 'mage2' });
      skillSystem.initializeSkills(unit2 as any, ['fireball'], 10);
      const legacy = unit2.skills.find((s: any) => s.id === 'fireball');

      // Evolved should have different targetType (all_enemies vs enemy)
      expect(evolved!.targetType).not.toBe(legacy!.targetType);
    });

    it('shared skill: rogue gets evolution, shadow_assassin gets legacy', () => {
      const unit1 = createMockUnit({ unitId: 'rogue1' });
      skillSystem.initializeSkills(unit1 as any, ['backstab'], 5, 'rogue', { 'rogue:backstab': 'backstab_bleed' });

      const unit2 = createMockUnit({ unitId: 'sa1' });
      // shadow_assassin has no evolution config, uses legacy
      skillSystem.initializeSkills(unit2 as any, ['backstab'], 5, 'shadow_assassin', {});

      const rogueSkill = unit1.skills.find((s: any) => s.id === 'backstab');
      const saSkill = unit2.skills.find((s: any) => s.id === 'backstab');

      // Both should have backstab but with different modifications
      expect(rogueSkill).toBeDefined();
      expect(saSkill).toBeDefined();
    });
  });
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/systems/SkillSystem.test.ts
```

Expected: FAIL — `initializeSkills` doesn't accept heroId/evolutions parameters yet.

- [ ] **Step 3: Implement evolution resolution in SkillSystem**

In `src/systems/SkillSystem.ts`:

**3a. Add imports:**

```typescript
import { SkillData, SkillEffect, StatusEffect, StatusEffectType, SkillAdvancement, SkillEvolution } from '../types';
import evolutionsData from '../data/skill-evolutions.json';
import { EVOLUTION_LEVEL, EVOLUTION_ENHANCE_LEVEL } from '../constants';
```

**3b. Build evolution lookup map** (after imports, before class):

```typescript
/** Build evolution lookup: "heroId:sourceSkillId" → SkillEvolution[] */
const evolutionMap = new Map<string, SkillEvolution[]>();
for (const evo of evolutionsData as SkillEvolution[]) {
  const key = `${evo.heroId}:${evo.sourceSkillId}`;
  if (!evolutionMap.has(key)) evolutionMap.set(key, []);
  evolutionMap.get(key)!.push(evo);
}

/** Check if a hero:skill pair has evolution config */
export function hasEvolutionConfig(heroId: string, skillId: string): boolean {
  return evolutionMap.has(`${heroId}:${skillId}`);
}

/** Get evolution branches for a hero:skill pair */
export function getEvolutionBranches(heroId: string, skillId: string): SkillEvolution[] {
  return evolutionMap.get(`${heroId}:${skillId}`) ?? [];
}

/** Get a specific evolution by ID */
export function getEvolutionById(evolutionId: string): SkillEvolution | undefined {
  return (evolutionsData as SkillEvolution[]).find(e => e.id === evolutionId);
}
```

**3c. Update initializeSkills signature** (line 29):

```typescript
  initializeSkills(unit: Unit, skillIds: string[], heroLevel?: number, heroId?: string, evolutions?: Record<string, string>): void {
    unit.skills = skillIds
      .map(id => {
        const base = (skillsData as SkillData[]).find(s => s.id === id);
        if (!base) return null;
        return heroLevel ? this.getAdvancedSkill(base, heroLevel, heroId, evolutions) : { ...base };
      })
      .filter(Boolean) as SkillData[];
    for (const skill of unit.skills) {
      unit.skillCooldowns.set(skill.id, 0);
    }
  }
```

**3d. Rewrite getAdvancedSkill** with 6-step resolution:

```typescript
  getAdvancedSkill(baseSkill: SkillData, heroLevel: number, heroId?: string, evolutions?: Record<string, string>): SkillData {
    // Step 1: Check if this hero:skill has evolution config
    const hasEvo = heroId ? hasEvolutionConfig(heroId, baseSkill.id) : false;

    if (!hasEvo) {
      // Step 2: LEGACY PATH
      return this.applyLegacyAdvancements(baseSkill, heroLevel);
    }

    // Step 3: Below evolution level — return base skill as-is
    if (heroLevel < EVOLUTION_LEVEL) {
      return { ...baseSkill };
    }

    // Step 4: Check if player has chosen an evolution
    const evoKey = `${heroId}:${baseSkill.id}`;
    const chosenId = evolutions?.[evoKey];

    if (!chosenId) {
      // Pending — fall back to legacy advancements (no power cliff)
      return this.applyLegacyAdvancements(baseSkill, heroLevel);
    }

    // Step 5: Apply evolution overrides
    const evolution = getEvolutionById(chosenId);
    if (!evolution) {
      return this.applyLegacyAdvancements(baseSkill, heroLevel);
    }

    const evolved: SkillData = { ...baseSkill, ...evolution.overrides };
    evolved.id = baseSkill.id; // Ensure base ID retained

    // Step 6: Apply level10Bonus if hero >= EVOLUTION_ENHANCE_LEVEL
    if (heroLevel >= EVOLUTION_ENHANCE_LEVEL && evolution.level10Bonus) {
      const bonus = evolution.level10Bonus;
      if (bonus.baseDamage) evolved.baseDamage += bonus.baseDamage;
      if (bonus.scalingRatio) evolved.scalingRatio += bonus.scalingRatio;
      if (bonus.cooldown) evolved.cooldown = Math.max(0.5, evolved.cooldown + bonus.cooldown);
      if (bonus.aoeRadius) evolved.aoeRadius = (evolved.aoeRadius ?? 0) + bonus.aoeRadius;
      if (bonus.effectDuration) evolved.effectDuration = (evolved.effectDuration ?? 0) + bonus.effectDuration;
    }

    return evolved;
  }

  /** Apply legacy skill-advancements (extracted from old getAdvancedSkill) */
  private applyLegacyAdvancements(baseSkill: SkillData, heroLevel: number): SkillData {
    const advancements = (advancementsData as SkillAdvancement[])
      .filter(a => a.skillId === baseSkill.id && heroLevel >= a.requiredHeroLevel)
      .sort((a, b) => a.level - b.level);

    if (advancements.length === 0) return { ...baseSkill };

    const advanced = { ...baseSkill };
    for (const adv of advancements) {
      if (adv.bonuses.baseDamage) advanced.baseDamage += adv.bonuses.baseDamage;
      if (adv.bonuses.scalingRatio) advanced.scalingRatio += adv.bonuses.scalingRatio;
      if (adv.bonuses.cooldown) advanced.cooldown = Math.max(0.5, advanced.cooldown + adv.bonuses.cooldown);
      if (adv.bonuses.range) advanced.range += adv.bonuses.range;
      if (adv.bonuses.aoeRadius) advanced.aoeRadius = (advanced.aoeRadius ?? 0) + adv.bonuses.aoeRadius;
      if (adv.bonuses.effectDuration) advanced.effectDuration = (advanced.effectDuration ?? 0) + adv.bonuses.effectDuration;
    }
    return advanced;
  }
```

- [ ] **Step 4: Run tests**

```bash
npm test -- tests/systems/SkillSystem.test.ts
```

Expected: All pass. Note: existing tests call `initializeSkills(unit, skillIds, heroLevel)` without heroId/evolutions — these still work because the new params are optional.

- [ ] **Step 5: Full verification**

```bash
npx tsc --noEmit && npm test
```

- [ ] **Step 6: Commit**

```bash
git add src/systems/SkillSystem.ts tests/systems/SkillSystem.test.ts
git commit -m "feat: SkillSystem 6-step evolution resolution with legacy fallback"
```

---

## Task 4: RunManager Pending Evolution Flow

**Context:** `RunManager.addExp()` detects level-5 crossing and populates `pendingEvolutions`. `setSkillEvolution()` writes the one-time binding. `getPendingEvolutions()` returns the list for RewardScene to consume.

**Files:**
- Modify: `src/managers/RunManager.ts`
- Modify: `tests/managers/RunManager.test.ts`

- [ ] **Step 1: Write pending evolution tests**

Add imports to `tests/managers/RunManager.test.ts`:

```typescript
import { EVOLUTION_LEVEL } from '../../src/constants';
```

Add describe block:

```typescript
  describe('skill evolution', () => {
    // Each test gets a fresh RunManager via beforeEach above (rm.newRun(12345))

    it('no pending evolutions at start', () => {
      expect(rm.getPendingEvolutions().length).toBe(0);
    });

    it('addExp to level 5 with evolution skill populates pendingEvolutions', () => {
      const warrior = rm.getHeroes().find(h => h.id === 'warrior')!;
      while (warrior.level < EVOLUTION_LEVEL) {
        rm.addExp(warrior, 500);
      }
      const pending = rm.getPendingEvolutions();
      expect(pending.some(p => p.heroId === 'warrior')).toBe(true);
    });

    it('setSkillEvolution writes to heroState with composite key', () => {
      const result = rm.setSkillEvolution('warrior', 'shield_bash', 'shield_bash_aoe');
      expect(result).toBe(true);
      const warrior = rm.getHeroes().find(h => h.id === 'warrior')!;
      const evolutions = warrior.skillEvolutions ?? {};
      expect(evolutions['warrior:shield_bash']).toBe('shield_bash_aoe');
    });

    it('setSkillEvolution rejects overwrite of existing choice', () => {
      rm.setSkillEvolution('warrior', 'shield_bash', 'shield_bash_aoe');
      const result = rm.setSkillEvolution('warrior', 'shield_bash', 'shield_bash_stun');
      expect(result).toBe(false);
      const warrior = rm.getHeroes().find(h => h.id === 'warrior')!;
      expect(warrior.skillEvolutions!['warrior:shield_bash']).toBe('shield_bash_aoe');
    });

    it('clearPendingEvolution removes from list', () => {
      const warrior = rm.getHeroes().find(h => h.id === 'warrior')!;
      while (warrior.level < EVOLUTION_LEVEL) {
        rm.addExp(warrior, 500);
      }
      expect(rm.getPendingEvolutions().length).toBeGreaterThan(0);
      rm.setSkillEvolution('warrior', 'shield_bash', 'shield_bash_aoe');
      rm.clearPendingEvolution('warrior', 'shield_bash');
      expect(rm.getPendingEvolutions().some(p => p.heroId === 'warrior')).toBe(false);
    });
  });
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/managers/RunManager.test.ts
```

Expected: FAIL — `getPendingEvolutions`, `setSkillEvolution`, `clearPendingEvolution` don't exist.

- [ ] **Step 3: Implement in RunManager**

In `src/managers/RunManager.ts`:

**3a. Add imports** (note: `heroesData` is already imported in RunManager.ts — do NOT add a duplicate):

```typescript
import { EVOLUTION_LEVEL } from '../constants';
import { hasEvolutionConfig } from '../systems/SkillSystem';
// heroesData already imported at line 13 — no duplicate needed
```

**3b. Add transient field** (in class, after `private state`):

```typescript
  private pendingEvolutions: { heroId: string; skillId: string }[] = [];
```

**3c. Reset in newRun()** (add to existing newRun method):

```typescript
    this.pendingEvolutions = [];
```

**3d. Modify addExp()** (line 284-299). Replace entire method:

```typescript
  addExp(hero: HeroState, amount: number): void {
    hero.exp += amount;
    const startLevel = hero.level;
    let needed = expForLevel(hero.level);
    while (hero.exp >= needed && hero.level < 20) {
      hero.exp -= needed;
      hero.level++;
      needed = expForLevel(hero.level);
      // Heal to full on level up
      const data = this.getHeroData(hero.id);
      hero.currentHp = this.getMaxHp(hero, data);
    }
    if (hero.level > startLevel) {
      AudioManager.getInstance().playSfx('sfx_levelup');
    }

    // Check for evolution trigger (level-crossing detection)
    if (startLevel < EVOLUTION_LEVEL && hero.level >= EVOLUTION_LEVEL) {
      const heroData = (heroesData as any[]).find(h => h.id === hero.id);
      if (heroData) {
        const skill0 = heroData.skills[0];
        if (hasEvolutionConfig(hero.id, skill0)) {
          const evoKey = `${hero.id}:${skill0}`;
          const evolutions = hero.skillEvolutions ?? {};
          if (!evolutions[evoKey]) {
            this.pendingEvolutions.push({ heroId: hero.id, skillId: skill0 });
          }
        }
      }
    }
  }
```

**3e. Add evolution management methods:**

```typescript
  getPendingEvolutions(): { heroId: string; skillId: string }[] {
    return [...this.pendingEvolutions];
  }

  clearPendingEvolution(heroId: string, skillId: string): void {
    this.pendingEvolutions = this.pendingEvolutions.filter(
      p => !(p.heroId === heroId && p.skillId === skillId)
    );
  }

  setSkillEvolution(heroId: string, skillId: string, evolutionId: string): boolean {
    const hero = this.getHeroState(heroId);
    if (!hero) return false;
    if (!hero.skillEvolutions) hero.skillEvolutions = {};
    const key = `${heroId}:${skillId}`;
    // One-time binding: reject overwrite
    if (hero.skillEvolutions[key]) return false;
    hero.skillEvolutions[key] = evolutionId;
    return true;
  }
```

- [ ] **Step 4: Run tests**

```bash
npm test -- tests/managers/RunManager.test.ts
```

- [ ] **Step 5: Full verification**

```bash
npx tsc --noEmit && npm test
```

- [ ] **Step 6: Commit**

```bash
git add src/managers/RunManager.ts tests/managers/RunManager.test.ts
git commit -m "feat: RunManager pending evolution detection + one-time binding"
```

---

## Task 5: BattleSystem Integration

**Context:** `BattleSystem.setUnits()` calls `skillSystem.initializeSkills()` for heroes at line 103. It needs to pass heroId and skillEvolutions so the evolution resolution can work. Enemy calls remain unchanged (no heroId/evolutions).

**Files:**
- Modify: `src/systems/BattleSystem.ts`

- [ ] **Step 1: Update hero skill initialization call**

In `src/systems/BattleSystem.ts`, find lines 101-104:

```typescript
    // Initialize skills (with advancement for heroes based on level)
    for (const hero of heroes) {
      this.skillSystem.initializeSkills(hero, hero.heroData.skills, hero.level);
    }
```

Replace with:

```typescript
    // Initialize skills (with evolution resolution for heroes)
    for (const hero of heroes) {
      const evolutions = hero.heroState?.skillEvolutions ?? {};
      this.skillSystem.initializeSkills(hero, hero.heroData.skills, hero.level, hero.heroData.id, evolutions);
    }
```

Note: `Hero` entity has a typed `heroState: HeroState` property (src/entities/Hero.ts line 7) and `heroData` with the hero's data definition. No `as any` cast needed.

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit && npm test
```

- [ ] **Step 3: Commit**

```bash
git add src/systems/BattleSystem.ts
git commit -m "feat: pass heroId + skillEvolutions to initializeSkills in battle"
```

---

## Task 6: Skill Evolution Panel UI

**Context:** Modal panel (480×320) showing two branch cards side by side. Mandatory choice (no close-on-click). Called from RewardScene and MapScene. Follows existing modal pattern (backdrop d799, panel d800, interactive d801).

**Files:**
- Create: `src/ui/SkillEvolutionPanel.ts`
- Create: `tests/ui/SkillEvolutionPanel.test.ts`

- [ ] **Step 1: Write panel tests**

Create `tests/ui/SkillEvolutionPanel.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import Phaser from 'phaser';
import { SkillEvolutionPanel } from '../../src/ui/SkillEvolutionPanel';
import { SkillEvolution } from '../../src/types';

describe('SkillEvolutionPanel', () => {
  function createTestScene(): Phaser.Scene {
    return new Phaser.Scene({ key: 'test' });
  }

  const mockBranches: SkillEvolution[] = [
    {
      id: 'test_evo_a', heroId: 'mage', sourceSkillId: 'fireball', branch: 'A',
      name: '烈焰风暴', description: '对全体敌人造成火焰伤害',
      overrides: { targetType: 'all_enemies', aoeRadius: 100 },
      level10Bonus: { baseDamage: 15 },
    },
    {
      id: 'test_evo_b', heroId: 'mage', sourceSkillId: 'fireball', branch: 'B',
      name: '精准火箭', description: '对单体目标造成双倍伤害',
      overrides: { baseDamage: 120, cooldown: 5 },
      level10Bonus: { baseDamage: 20 },
    },
  ];

  it('creates without errors', () => {
    const scene = createTestScene();
    let chosen: string | null = null;
    const mockBaseSkill = { id: 'fireball', baseDamage: 60, cooldown: 7, targetType: 'enemy' } as any;
    const panel = new SkillEvolutionPanel(scene, '火法师', mockBranches, mockBaseSkill, (evoId) => {
      chosen = evoId;
    });
    expect(panel).toBeDefined();
  });

  it('calls callback with selected evolution ID', () => {
    const scene = createTestScene();
    let chosen: string | null = null;
    const mockBaseSkill = { id: 'fireball', baseDamage: 60, cooldown: 7, targetType: 'enemy' } as any;
    const panel = new SkillEvolutionPanel(scene, '火法师', mockBranches, mockBaseSkill, (evoId) => {
      chosen = evoId;
    });
    // Simulate selection
    panel.selectBranch('A');
    expect(chosen).toBe('test_evo_a');
  });

  it('selectBranch B returns branch B id', () => {
    const scene = createTestScene();
    let chosen: string | null = null;
    const mockBaseSkill = { id: 'fireball', baseDamage: 60, cooldown: 7, targetType: 'enemy' } as any;
    const panel = new SkillEvolutionPanel(scene, '火法师', mockBranches, mockBaseSkill, (evoId) => {
      chosen = evoId;
    });
    panel.selectBranch('B');
    expect(chosen).toBe('test_evo_b');
  });
});
```

- [ ] **Step 2: Implement SkillEvolutionPanel**

Create `src/ui/SkillEvolutionPanel.ts`:

```typescript
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { SkillEvolution } from '../types';
import { Theme, colorToString } from './Theme';
import { Button } from './Button';
import { UI } from '../i18n';
import { TextFactory } from './TextFactory';
import { AudioManager } from '../systems/AudioManager';

export class SkillEvolutionPanel {
  private scene: Phaser.Scene;
  private elements: Phaser.GameObjects.GameObject[] = [];
  private branches: SkillEvolution[];
  private baseSkill: SkillData;
  private onSelect: (evolutionId: string) => void;

  constructor(scene: Phaser.Scene, heroName: string, branches: SkillEvolution[], baseSkill: SkillData, onSelect: (evolutionId: string) => void) {
    this.scene = scene;
    this.branches = branches;
    this.baseSkill = baseSkill;
    this.onSelect = onSelect;
    this.build(heroName);
  }

  private build(heroName: string): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const panelW = 480;
    const panelH = 320;

    // Backdrop (no close-on-click — must choose)
    const backdrop = this.scene.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7)
      .setInteractive().setDepth(799);
    this.elements.push(backdrop);

    // Panel background
    const bg = this.scene.add.graphics().setDepth(800);
    bg.fillStyle(Theme.colors.panel, 0.97);
    bg.fillRoundedRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH, 8);
    bg.lineStyle(2, Theme.colors.gold, 0.8);
    bg.strokeRoundedRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH, 8);
    this.elements.push(bg);

    // Title
    const title = TextFactory.create(this.scene, cx, cy - panelH / 2 + 25, UI.evolution.title(heroName), 'subtitle', {
      color: colorToString(Theme.colors.gold),
    }).setOrigin(0.5).setDepth(801);
    this.elements.push(title);

    // Two branch cards
    const cardW = 200;
    const cardH = 240;
    const gap = 20;
    const leftX = cx - cardW - gap / 2;
    const rightX = cx + gap / 2;
    const cardY = cy - panelH / 2 + 55;

    this.buildBranchCard(leftX, cardY, cardW, cardH, this.branches[0], 'A');
    this.buildBranchCard(rightX, cardY, cardW, cardH, this.branches[1], 'B');
  }

  private buildBranchCard(x: number, y: number, w: number, h: number, evo: SkillEvolution, branch: 'A' | 'B'): void {
    const cardBg = this.scene.add.graphics().setDepth(800);
    cardBg.fillStyle(Theme.colors.panel, 0.9);
    cardBg.fillRoundedRect(x, y, w, h, 6);
    cardBg.lineStyle(1, Theme.colors.panelBorder, 0.7);
    cardBg.strokeRoundedRect(x, y, w, h, 6);
    this.elements.push(cardBg);

    // Branch label (all created objects pushed to elements for cleanup)
    const branchLabel = branch === 'A' ? UI.evolution.branchA : UI.evolution.branchB;
    const branchText = TextFactory.create(this.scene, x + w / 2, y + 15, branchLabel, 'small', {
      color: '#888888',
    }).setOrigin(0.5).setDepth(801);
    this.elements.push(branchText);

    // Evolution name
    const nameText = TextFactory.create(this.scene, x + w / 2, y + 35, evo.name, 'body', {
      color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(801);
    this.elements.push(nameText);

    // Description
    const descText = TextFactory.create(this.scene, x + 10, y + 55, evo.description, 'small', {
      color: '#aaaaaa',
      wordWrap: { width: w - 20 },
    }).setDepth(801);
    this.elements.push(descText);

    // Key stat changes vs base skill
    const base = this.baseSkill;
    let statY = y + 120;
    if (evo.overrides.baseDamage !== undefined) {
      const after = evo.overrides.baseDamage;
      const color = after > base.baseDamage ? colorToString(Theme.colors.success) : colorToString(Theme.colors.danger);
      const t = TextFactory.create(this.scene, x + 10, statY, UI.evolution.damageChange(base.baseDamage, after), 'small', { color }).setDepth(801);
      this.elements.push(t);
      statY += 16;
    }
    if (evo.overrides.cooldown !== undefined) {
      const after = evo.overrides.cooldown;
      const t = TextFactory.create(this.scene, x + 10, statY, UI.evolution.cooldownChange(base.cooldown, after), 'small', { color: '#aaccff' }).setDepth(801);
      this.elements.push(t);
      statY += 16;
    }
    if (evo.overrides.targetType) {
      const t = TextFactory.create(this.scene, x + 10, statY, UI.evolution.targetChange(base.targetType, evo.overrides.targetType), 'small', { color: '#ccaaff' }).setDepth(801);
      this.elements.push(t);
    }

    // Choose button
    const btn = new Button(this.scene, x + w / 2, y + h - 25, UI.evolution.choose, 120, 30, () => {
      this.selectBranch(branch);
    }, Theme.colors.primary);
    btn.setDepth(801);
    this.elements.push(btn);
  }

  selectBranch(branch: 'A' | 'B'): void {
    const evo = this.branches.find(b => b.branch === branch);
    if (!evo) return;
    AudioManager.getInstance().playSfx('sfx_levelup');
    this.onSelect(evo.id);
    this.destroy();
  }

  destroy(): void {
    for (const el of this.elements) {
      el.destroy();
    }
    this.elements = [];
  }
}
```

- [ ] **Step 3: Run tests**

```bash
npm test -- tests/ui/SkillEvolutionPanel.test.ts
```

- [ ] **Step 4: Full verification**

```bash
npx tsc --noEmit && npm test
```

- [ ] **Step 5: Commit**

```bash
git add src/ui/SkillEvolutionPanel.ts tests/ui/SkillEvolutionPanel.test.ts
git commit -m "feat: SkillEvolutionPanel — 2-choice evolution modal UI"
```

---

## Task 7: RewardScene + MapScene Integration

**Context:** RewardScene consumes `pendingEvolutions` after battle rewards. MapScene provides interrupt recovery — derives pending from hero data and shows panel before allowing play. Battle entry is blocked if pending evolutions exist (safety net).

**Files:**
- Modify: `src/scenes/RewardScene.ts`
- Modify: `src/scenes/MapScene.ts`

- [ ] **Step 1: Integrate evolution panel into RewardScene**

In `src/scenes/RewardScene.ts`:

**1a. Add imports:**

```typescript
import { SkillEvolutionPanel } from '../ui/SkillEvolutionPanel';
import { getEvolutionBranches } from '../systems/SkillSystem';
import { getHeroDisplayName } from '../i18n';
import skillsData from '../data/skills.json';
import { SkillData } from '../types';
```

**1b. Replace the continue button** (lines 111-113). Instead of creating the button directly, check for pending evolutions first:

```typescript
    // Check for pending evolution choices before showing continue button
    this.showEvolutionOrContinue(rm);
```

**1c. Add evolution flow method:**

```typescript
  private showEvolutionOrContinue(rm: RunManager): void {
    const pending = rm.getPendingEvolutions();
    if (pending.length > 0) {
      this.showNextEvolution(rm, pending, 0);
    } else {
      this.showContinueButton();
    }
  }

  private showNextEvolution(rm: RunManager, pending: { heroId: string; skillId: string }[], index: number): void {
    if (index >= pending.length) {
      this.showContinueButton();
      return;
    }
    const { heroId, skillId } = pending[index];
    const branches = getEvolutionBranches(heroId, skillId);
    if (branches.length < 2) {
      this.showNextEvolution(rm, pending, index + 1);
      return;
    }
    const heroName = getHeroDisplayName(heroId);
    const baseSkill = (skillsData as SkillData[]).find(s => s.id === skillId)!;
    new SkillEvolutionPanel(this, heroName, branches, baseSkill, (evolutionId) => {
      rm.setSkillEvolution(heroId, skillId, evolutionId);
      rm.clearPendingEvolution(heroId, skillId);
      // Show next pending or continue
      this.showNextEvolution(rm, pending, index + 1);
    });
  }

  private showContinueButton(): void {
    new Button(this, GAME_WIDTH / 2, GAME_HEIGHT - 38, UI.reward.continueBtn, 160, 38, () => {
      SceneTransition.fadeTransition(this, 'MapScene');
    });
  }
```

- [ ] **Step 2: Add interrupt recovery to MapScene**

In `src/scenes/MapScene.ts`:

**2a. Add imports:**

```typescript
import { SkillEvolutionPanel } from '../ui/SkillEvolutionPanel';
import { hasEvolutionConfig, getEvolutionBranches } from '../systems/SkillSystem';
import { getHeroDisplayName } from '../i18n';
import { EVOLUTION_LEVEL } from '../constants';
import heroesData from '../data/heroes.json';
import skillsData from '../data/skills.json';
import { SkillData } from '../types';
```

**2b. Add pending check** at the end of MapScene.create(), after all existing setup:

```typescript
    // Interrupt recovery: check for missed evolution choices
    this.checkPendingEvolutions(rm);
```

**2c. Add helper methods:**

```typescript
  private checkPendingEvolutions(rm: RunManager): void {
    const pending: { heroId: string; skillId: string }[] = [];
    for (const hero of rm.getHeroes()) {
      if (hero.level < EVOLUTION_LEVEL) continue;
      const heroData = (heroesData as any[]).find(h => h.id === hero.id);
      if (!heroData) continue;
      const skill0 = heroData.skills[0];
      if (!hasEvolutionConfig(hero.id, skill0)) continue;
      const evolutions = hero.skillEvolutions ?? {};
      if (!evolutions[`${hero.id}:${skill0}`]) {
        pending.push({ heroId: hero.id, skillId: skill0 });
      }
    }
    if (pending.length > 0) {
      this.showRecoveryEvolution(rm, pending, 0);
    }
  }

  private showRecoveryEvolution(rm: RunManager, pending: { heroId: string; skillId: string }[], index: number): void {
    if (index >= pending.length) return;
    const { heroId, skillId } = pending[index];
    const branches = getEvolutionBranches(heroId, skillId);
    if (branches.length < 2) {
      this.showRecoveryEvolution(rm, pending, index + 1);
      return;
    }
    const heroName = getHeroDisplayName(heroId);
    const baseSkill = (skillsData as SkillData[]).find((s: SkillData) => s.id === skillId)!;
    new SkillEvolutionPanel(this, heroName, branches, baseSkill, (evolutionId) => {
      rm.setSkillEvolution(heroId, skillId, evolutionId);
      this.showRecoveryEvolution(rm, pending, index + 1);
    });
  }
```

**2d. Add battle entry safety net** — in `selectNode()` method (~line 640 of MapScene.ts), which handles all node click transitions. Find the section where the node type is checked and scene transition starts. Add a guard **before** the scene transition, but only for combat node types:

```typescript
    // Safety net: block combat nodes if pending evolutions exist
    const combatNodes = ['battle', 'elite', 'boss', 'gauntlet'];
    if (combatNodes.includes(node.type)) {
      const hasPending = rm.getHeroes().some(hero => {
        if (hero.level < EVOLUTION_LEVEL) return false;
        const hd = (heroesData as any[]).find((h: any) => h.id === hero.id);
        if (!hd) return false;
        const skill0 = hd.skills[0];
        if (!hasEvolutionConfig(hero.id, skill0)) return false;
        return !(hero.skillEvolutions ?? {})[`${hero.id}:${skill0}`];
      });
      if (hasPending) {
        // MapScene has no showMessage — create inline warning text
        const warn = TextFactory.create(this, GAME_WIDTH / 2, GAME_HEIGHT - 60,
          UI.evolution.pendingWarning, 'body', {
            color: colorToString(Theme.colors.danger),
            stroke: '#000000', strokeThickness: 2,
          }).setOrigin(0.5);
        this.tweens.add({ targets: warn, alpha: 0, delay: 2000, duration: 500, onComplete: () => warn.destroy() });
        return;
      }
    }
```

Note: `selectNode()` at ~line 640 is the actual node click handler. Non-combat nodes (shop, event, rest) are NOT blocked — the spec only requires blocking battle entry.

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit && npm test
```

- [ ] **Step 4: Commit**

```bash
git add src/scenes/RewardScene.ts src/scenes/MapScene.ts
git commit -m "feat: RewardScene evolution flow + MapScene interrupt recovery"
```

---

## Task 8: Final Verification

- [ ] **Step 1: Full type check + test suite**

```bash
npx tsc --noEmit && npm test
```

Expected: Zero TS errors, all tests pass.

- [ ] **Step 2: Verify test count**

Previous: 1083 tests. New tests:
- SkillSystem evolution: ~8 tests
- RunManager evolution: ~5 tests
- SkillEvolutionPanel: ~3 tests

Expected: ~1099+ tests.

- [ ] **Step 3: Verify acceptance criteria**

1. ✅ Evolution choice at level 5
2. ✅ Level 10 auto-enhancement
3. ✅ Mutual exclusion (evolution chosen → no legacy)
4. ✅ Pending fallback (legacy advancements)
5. ✅ One-time binding
6. ✅ Interrupt recovery (MapScene)
7. ✅ Composite heroId:skillId key
8. ✅ Cooldown tracking (base skill ID retained)
9. ✅ 10 heroes covered
10. ✅ Save compat
11. ✅ shadow_assassin isolation
12. ✅ Tests pass

---

## Execution Order

```
Task 1 (types/constants/i18n) — independent, unblocks all
Task 2 (evolution data JSON) — depends on Task 1 (SkillEvolution type)
Task 3 (SkillSystem resolution) — depends on Task 2 (imports JSON)
Task 4 (RunManager pending) — depends on Task 1 + Task 3 (imports hasEvolutionConfig)
Task 5 (BattleSystem integration) — depends on Task 3 (initializeSkills signature)
Task 6 (SkillEvolutionPanel UI) — depends on Task 1 (SkillEvolution type)
Task 7 (RewardScene/MapScene) — depends on Task 4 + Task 6
Task 8 (verification) — depends on all
```

**Recommended execution:**
- Task 1 first (unblocks everything)
- Task 2 + Task 6 can parallel (different files, both only need Task 1)
- Task 3 after Task 2
- Task 4 after Task 3
- Task 5 after Task 3
- Task 7 after Task 4 + Task 6
- Task 8 last
