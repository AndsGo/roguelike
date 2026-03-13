# Act 4: Elemental Forge — Design Spec

**Date:** 2026-03-13
**Version:** v1.11.0
**Scope:** New act, 4 heroes, 7 enemies, BossPhaseSystem, supporting content

## Overview

Act 4 "元素熔炉" (Elemental Forge) is the final act, unlocked after defeating the Act 3 boss (shadow_lord). It tests the player's mastery of the 5-element system with enemies spanning all elements, a multi-phase final boss that spawns adds at HP thresholds, and 4 new heroes that fill critical roster gaps (support role, beast/dragon races, assassin class).

### Content Summary

| Category | New | Total After |
|----------|-----|-------------|
| Heroes | 4 | 23 |
| Enemies | 7 | 28 |
| Skills | 19 (12 hero + 7 enemy) | 82 |
| Items | 4 | 52 |
| Events | 3 | 37 |
| Acts | 1 | 4 |
| Systems | 1 (BossPhaseSystem) | — |

---

## Act 4 Configuration

```
id: act4
name: 元素熔炉
description: 传说中的元素熔炉，五种元素在此交汇融合。
nodeCount: 10
difficultyMultiplier: 2.2
elementAffinity: null (all elements equally present)
enemyPool: [flame_construct, frost_sentinel, lightning_strider, holy_smith, void_weaver]
elitePool: [elemental_chimera]
bossPool: [heart_of_the_forge]
unlockCondition: defeatedBosses includes "shadow_lord"
```

**Node count:** 10 (vs 8 for Acts 1-3). The final act is longer to feel climactic.

---

## New Heroes (4)

### 1. 元素织者 (Elemental Weaver)

| Field | Value |
|-------|-------|
| ID | `elemental_weaver` |
| Race | Dragon |
| Class | Mage |
| Role | Support |
| Element | None (multi-element) |
| Unlock | `victory` — 3 total victories |

**Base Stats:**
- HP: 550, Attack: 30, Defense: 18, MagicPower: 65, Speed: 55
- CritChance: 0.08, CritDamage: 1.5, AttackRange: 300, AttackSpeed: 0.9
- MagicResist: 25

**Skills:**
1. `elemental_infusion` — Buffs an ally's next attack with a random element (fire/ice/lightning). Target: ally. Cooldown: 6s. ScalingRatio: 0 (buff only). Element: none.
2. `resonance_pulse` — Deals minor AoE damage to all enemies and reduces magic resist by 10 for 5s. Target: all_enemies. Cooldown: 8s. ScalingRatio: 0.6 magicPower. Element: none.
3. `ult_elemental_convergence` (Ultimate) — Triggers all 4 element reactions (ignite/freeze/shock/decay) on all enemies. Target: all_enemies. ScalingRatio: 1.2 magicPower. Element: none.

**Design Intent:** First support hero in the game. Enables dragon synergy (3 dragons reachable). Multi-element theme fits Act 4. Low direct damage but massive team amplification via element infusion and magic resist shred.

---

### 2. 深林猎手 (Forest Stalker)

| Field | Value |
|-------|-------|
| ID | `forest_stalker` |
| Race | Beast |
| Class | Assassin |
| Role | Melee DPS |
| Element | None (physical) |
| Unlock | `hero_used` — beast_warden used in 3 runs |

**Base Stats:**
- HP: 480, Attack: 72, Defense: 15, MagicPower: 10, Speed: 60
- CritChance: 0.25, CritDamage: 2.2, AttackRange: 80, AttackSpeed: 1.2
- MagicResist: 12

**Skills:**
1. `predator_strike` — Single target high-damage attack with +25% crit chance bonus. Target: enemy. Cooldown: 5s. ScalingRatio: 1.8 attack. Element: none.
2. `pack_instinct` — Self buff: +20% attack speed for 4s. Triggered after any ally kills an enemy. Target: self. Cooldown: 7s. ScalingRatio: 0 (buff).
3. `ult_apex_predator` (Ultimate) — Massive damage to lowest HP enemy, guaranteed crit. Target: enemy. ScalingRatio: 3.0 attack. Element: none.

**Design Intent:** Beast race (enables beast 2-count synergy). Assassin class (3 assassins for synergy threshold). Pure physical burst — no element but extremely high crit scaling. Glass cannon that rewards kill momentum.

---

### 3. 熔岩守卫 (Magma Warden)

| Field | Value |
|-------|-------|
| ID | `magma_warden` |
| Race | Dragon |
| Class | Warrior |
| Role | Tank |
| Element | Fire |
| Unlock | `boss_kill` — thunder_titan |

**Base Stats:**
- HP: 900, Attack: 40, Defense: 45, MagicPower: 20, Speed: 30
- CritChance: 0.05, CritDamage: 1.5, AttackRange: 80, AttackSpeed: 0.7
- MagicResist: 30

**Skills:**
1. `molten_shield` — Gains shield equal to 15% maxHp for 5s. Enemies attacking the shielded unit take 20 fire damage. Target: self. Cooldown: 8s. ScalingRatio: 0 (shield). Element: fire.
2. `eruption_slam` — AoE fire damage + 2s stun on primary target. Target: all_enemies. Cooldown: 10s. ScalingRatio: 1.0 attack. Element: fire.
3. `ult_magma_fortress` (Ultimate) — Taunts all enemies for 4s, gains 30% damage reduction, reflects 20% damage taken as fire. Target: self. ScalingRatio: 0 (utility). Element: fire.

**Design Intent:** Dragon race (4 dragons reachable). Warrior class (4 warriors). First fire-element tank — current tanks are all neutral/holy. Extremely durable with self-shield and damage reduction. Taunt ultimate forces enemies to attack him.

---

### 4. 风暴隼 (Storm Falcon)

| Field | Value |
|-------|-------|
| ID | `storm_falcon` |
| Race | Beast |
| Class | Ranger |
| Role | Ranged DPS |
| Element | Lightning |
| Unlock | `element_wins` — lightning, 5 wins |

**Base Stats:**
- HP: 500, Attack: 55, Defense: 16, MagicPower: 35, Speed: 65
- CritChance: 0.15, CritDamage: 1.8, AttackRange: 350, AttackSpeed: 1.3
- MagicResist: 15

**Skills:**
1. `lightning_volley` — Fires 3 lightning bolts at random enemies. Target: all_enemies. Cooldown: 6s. ScalingRatio: 0.7 attack. Element: lightning.
2. `static_charge` — Marks an enemy; next 3 attacks from any ally deal +25 bonus lightning damage. Target: enemy. Cooldown: 8s. ScalingRatio: 0 (debuff). Element: lightning.
3. `ult_thunderstrike_barrage` (Ultimate) — Rapid 5-hit lightning attack on random enemies. Target: all_enemies. ScalingRatio: 0.6 attack (per hit, 3.0 total). Element: lightning.

**Design Intent:** Beast race (2 beasts for synergy). Ranger class (4 rangers). Lightning element. Fast attack speed harasser. `static_charge` has support-like utility — marks enemies for team bonus damage.

---

### Synergy Impact

| Synergy | Before | After | New Thresholds Reachable |
|---------|--------|-------|--------------------------|
| Dragon (race) | 2 | 4 | 2-count ✓ (unchanged) |
| Beast (race) | 1 | 3 | 2-count ✓ (new!), 3-count ✓ (new!) |
| Assassin (class) | 2 | 3 | 3-count ✓ (new!) |
| Warrior (class) | 3 | 4 | 3-count ✓ (unchanged) |
| Ranger (class) | 3 | 4 | 3-count ✓ (unchanged) |
| Mage (class) | 5 | 6 | — |
| Support (role) | 0 | 1 | First support in game |

---

## New Enemies (7)

### Regular Enemies (5)

#### 火焰铸体 (Flame Construct)
- **ID:** `flame_construct` | **Role:** Melee DPS | **Element:** Fire
- **HP:** 450 | **Attack:** 55 | **Defense:** 20 | **Speed:** 45
- **Skill:** `forge_fire_strike` — Fire melee attack, applies ignite DoT (3s). ScalingRatio: 1.2 attack. Cooldown: 5s.
- **Rewards:** 15-22 gold, 30 EXP

#### 寒冰哨兵 (Frost Sentinel)
- **ID:** `frost_sentinel` | **Role:** Tank | **Element:** Ice
- **HP:** 700 | **Attack:** 30 | **Defense:** 45 | **Speed:** 25
- **Skill:** `frost_guard` — Self shield (10% maxHp, 4s). Attackers get frozen 1s. ScalingRatio: 0 (shield). Cooldown: 9s.
- **Rewards:** 15-22 gold, 30 EXP

#### 雷光行者 (Lightning Strider)
- **ID:** `lightning_strider` | **Role:** Ranged DPS | **Element:** Lightning
- **HP:** 350 | **Attack:** 50 | **Defense:** 12 | **Speed:** 70
- **Skill:** `spark_barrage` — 2-hit lightning ranged attack. ScalingRatio: 0.8 attack (per hit). Cooldown: 6s.
- **Rewards:** 15-22 gold, 30 EXP

#### 圣光铸师 (Holy Smith)
- **ID:** `holy_smith` | **Role:** Healer | **Element:** Holy
- **HP:** 400 | **Attack:** 25 | **Defense:** 20 | **Speed:** 40 | **MagicPower:** 50
- **Skill:** `forge_mend` — Heals lowest HP ally for 15% maxHp + cleanses 1 debuff. ScalingRatio: 0.8 magicPower. Cooldown: 7s. Target: ally.
- **Rewards:** 15-22 gold, 30 EXP
- **Note:** Fills the holy enemy gap (only 2 holy enemies before). Priority kill target in encounters.

#### 虚空织工 (Void Weaver)
- **ID:** `void_weaver` | **Role:** Support | **Element:** Dark
- **HP:** 380 | **Attack:** 35 | **Defense:** 15 | **Speed:** 50 | **MagicPower:** 45
- **Skill:** `void_debuff` — AoE magic resist reduction (-15 for 5s) on all heroes. ScalingRatio: 0 (debuff). Cooldown: 8s. Target: all_enemies (from enemy perspective).
- **Rewards:** 15-22 gold, 30 EXP

---

### Mini-Boss: 元素嵌合体 (Elemental Chimera)

- **ID:** `elemental_chimera` | **Role:** Melee DPS | **Element:** None (cycles)
- **HP:** 2000 | **Attack:** 65 | **Defense:** 35 | **Speed:** 45 | **MagicPower:** 40
- **Boss flag:** false (elite tier, appears on elite nodes)
- **Skill:** `chimera_shift` — Deals damage with current cycle element (fire→ice→lightning→dark→holy, advances each cast). ScalingRatio: 1.4 attack. Cooldown: 5s.
- **Rewards:** 50-75 gold, 60 EXP

---

### Final Boss: 元素熔炉之心 (Heart of the Forge)

- **ID:** `heart_of_the_forge` | **Role:** Tank | **Element:** None (multi-element)
- **HP:** 5000 | **Attack:** 55 | **Defense:** 80 | **Speed:** 30 | **MagicPower:** 50 | **MagicResist:** 40
- **Boss flag:** true
- **Skill:** `forge_hammer` — High damage AoE + random element applied. ScalingRatio: 1.3 attack. Cooldown: 6s. Target: all_enemies (from boss perspective).
- **Rewards:** 200 gold, 120 EXP

#### Phase Configuration

```json
{
  "bossId": "heart_of_the_forge",
  "phases": [
    {
      "hpPercent": 0.75,
      "spawns": ["flame_construct", "frost_sentinel"],
      "bossEffect": { "type": "shield", "value": 3000 }
    },
    {
      "hpPercent": 0.50,
      "spawns": ["lightning_strider", "holy_smith"],
      "bossEffect": { "type": "enrage", "value": 30 }
    },
    {
      "hpPercent": 0.25,
      "spawns": ["void_weaver", "flame_construct"],
      "bossEffect": { "type": "damage_reduction", "value": 20 }
    }
  ]
}
```

**Phase behavior:**
- Phase 1 (75% HP): Boss gains 3s shield (immune). Spawns Flame Construct + Frost Sentinel.
- Phase 2 (50% HP): Boss enrages (+30% attack). Spawns Lightning Strider + Holy Smith. The healer is the critical priority target.
- Phase 3 (25% HP): Boss gains 20% damage reduction. Spawns Void Weaver (MR debuff on party) + Flame Construct. Final push — DPS race.

---

## BossPhaseSystem

### Purpose

Monitors boss HP during battle and triggers mid-combat enemy spawns + boss effects at configured HP thresholds.

### Interface

```typescript
interface BossPhase {
  hpPercent: number;        // Trigger when boss HP falls to this percentage
  spawns: string[];         // Enemy IDs to instantiate
  bossEffect?: {
    type: 'shield' | 'enrage' | 'damage_reduction';
    value: number;          // shield: duration ms, enrage: attack% bonus, reduction: % reduction
  };
}

interface BossPhaseConfig {
  bossId: string;
  phases: BossPhase[];
}
```

### File: `src/systems/BossPhaseSystem.ts` (~80-100 lines)

**Not a singleton.** Instance created per boss battle, destroyed in shutdown.

**State:**
- `bossUnit: Enemy` — reference to the boss unit
- `config: BossPhaseConfig` — loaded from boss-phases.json
- `firedPhases: Set<number>` — tracks which phase indices have triggered (each fires once)
- `onDamageRef` — stored EventBus listener reference for cleanup

**Methods:**
- `constructor(scene, bossUnit, config)` — stores refs, registers `unit:damage` listener
- `onBossDamaged(data)` — checks if damaged unit is boss, calculates HP%, fires any crossed thresholds
- `triggerPhase(phase)` — emits `boss:phase` event with spawn list + effect. BattleScene handles actual instantiation.
- `deactivate()` — removes EventBus listener, clears refs

### Integration

**BattleScene changes:**
1. In `create()`, after boss Enemy is created, check if `bossPhaseData[bossId]` exists. If so, create `BossPhaseSystem` instance.
2. Listen for `boss:phase` event. On trigger:
   - Instantiate each spawn as new `Enemy` at `ENEMY_START_X + 40`, Y-spaced from current enemy count
   - Add to `this.allUnits`, add to scene, register with `BattleSystem.addUnit()`
   - Apply boss effect (shield → statusEffect, enrage → stat buff, damage_reduction → stat buff)
   - Show phase transition visual (screen flash + text "Phase 2!" etc.)
3. In `shutdown()`, call `bossPhaseSystem.deactivate()`

**BattleSystem changes:**
- Add `addUnit(unit: Unit)` method — pushes to enemy array, runs existing per-unit setup

**EventBus changes:**
- Add `boss:phase` to `GameEventMap`: `{ bossId: string; phaseIndex: number; spawns: string[]; effect?: BossPhase['bossEffect'] }`

---

## Supporting Content

### New Items (4)

| ID | Name | Slot | Rarity | Cost | Stats |
|----|------|------|--------|------|-------|
| `forge_hammer` | 熔炉之锤 | weapon | rare | 180 | attack: 35, magicPower: 15 |
| `elemental_plate` | 元素护甲 | armor | rare | 170 | defense: 25, magicResist: 20 |
| `forge_core` | 熔炉核心 | accessory | epic | 280 | magicPower: 30, critChance: 0.10 |
| `elemental_fusion_blade` | 元素融合之刃 | weapon | legendary | 400 | attack: 50, magicPower: 30, critDamage: 0.15 |

### New Events (3)

#### 熔炉试炼 (Forge Trial) — `forge_trial`
- **Risk tag:** high
- Choose an element to attune: gain +20% damage for that element, take +15% damage from its weakness.
- Safe option: decline (+30 gold consolation).

#### 元素碎片 (Element Shard) — `element_shard`
- **Risk tag:** low
- Find a shard: absorb (random stat +8-15) or sell (80 gold).

#### 锻造大师 (Master Smith) — `master_smith`
- **Risk tag:** medium
- Pay 60-100 gold to upgrade a random equipped item's stats by 20%.
- Fail option: keep gold, leave.

### Skill Visuals (19 entries)

All 12 hero skills + 7 enemy skills need entries in `skill-visuals.json`:

| Skill ID | Visual Type | Color |
|----------|-------------|-------|
| `elemental_infusion` | aoe_ally | 88ffaa |
| `resonance_pulse` | aoe_enemy | aa88ff |
| `ult_elemental_convergence` | aoe_enemy | ff88ff |
| `predator_strike` | melee_impact | ff8844 |
| `pack_instinct` | aoe_self | 88ff44 |
| `ult_apex_predator` | melee_impact | ff4422 |
| `molten_shield` | aoe_self | ff6600 |
| `eruption_slam` | aoe_enemy | ff4400 |
| `ult_magma_fortress` | aoe_self | ff8800 |
| `lightning_volley` | projectile (count: 3) | 88aaff |
| `static_charge` | projectile | aaccff |
| `ult_thunderstrike_barrage` | projectile (count: 5) | 4488ff |
| `forge_fire_strike` | melee_impact | ff4400 |
| `frost_guard` | aoe_self | 88ddff |
| `spark_barrage` | projectile (count: 2) | 88aaff |
| `forge_mend` | aoe_ally | ffff88 |
| `void_debuff` | aoe_enemy | 8844aa |
| `chimera_shift` | melee_impact | cc88ff |
| `forge_hammer` | aoe_enemy | ffaa44 |

### Pixel Templates

4 hero chibi configs (race+role+class combinations) and 7 enemy configs. All use existing layered template system — body by role, head by race, weapon by class. Palette colors chosen to match element theme.

### Hero Unlock Conditions

| Hero ID | Condition Type | Params |
|---------|---------------|--------|
| `elemental_weaver` | `victory` | threshold: 3 |
| `forest_stalker` | `hero_used` | heroId: beast_warden, threshold: 3 |
| `magma_warden` | `boss_kill` | bossId: thunder_titan |
| `storm_falcon` | `element_wins` | element: lightning, threshold: 5 |

### Act 4 Unlock Gate

Act 4 nodes appear on the map only when `MetaManager.getDefeatedBosses()` includes `"shadow_lord"`. This follows the existing `defeatedBosses` tracking pattern.

---

## Files Changed

### New Files
- `src/systems/BossPhaseSystem.ts` (~80-100 lines)
- `src/data/boss-phases.json` (phase config for heart_of_the_forge)

### Modified Data Files
- `src/data/heroes.json` — add 4 hero entries
- `src/data/enemies.json` — add 7 enemy entries
- `src/data/skills.json` — add 19 skill entries
- `src/data/items.json` — add 4 item entries
- `src/data/events.json` — add 3 event entries
- `src/data/acts.json` — add act4 entry
- `src/data/skill-visuals.json` — add 19 visual entries
- `src/data/skill-advancements.json` — add advancement entries for 12 hero skills
- `src/data/pixel-templates.ts` — add ChibiConfig entries for 4 heroes + 7 enemies

### Modified Source Files
- `src/systems/BattleSystem.ts` — add `addUnit()` method
- `src/scenes/BattleScene.ts` — create BossPhaseSystem for boss nodes, handle `boss:phase` event
- `src/systems/EventBus.ts` / `src/types/index.ts` — add `boss:phase` to GameEventMap
- `src/scenes/MapScene.ts` — Act 4 unlock gate (check defeatedBosses)
- `src/i18n.ts` — Chinese strings for new content
- `src/config/balance.ts` — Act 4 boss reward (200 gold)

### Test Files
- `tests/data/content-integrity.test.ts` — updated counts, cross-reference validation for new content
- `tests/systems/boss-phase.test.ts` — new: BossPhaseSystem unit tests (phase triggers, spawn events, deactivation)

---

## Verification Criteria

1. `npx tsc --noEmit` — zero errors
2. `npx vitest run` — all tests pass (existing + new)
3. Content integrity tests validate all cross-references (skills↔heroes, enemies↔acts, visuals↔skills)
4. Dev server: Act 4 accessible after defeating shadow_lord
5. Boss fight: phases trigger at 75%/50%/25%, adds spawn correctly, boss effects apply
6. New heroes: appear in draft with correct unlock conditions, chibi sprites render
7. New enemies: appear in Act 4 battles with correct element types and skills
8. Synergy table: beast 2/3-count, assassin 3-count, dragon 2-count all reachable with new heroes
