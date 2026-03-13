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

```json
{
  "id": "act4",
  "name": "元素熔炉",
  "description": "传说中的元素熔炉，五种元素在此交汇融合。",
  "nodeCount": 10,
  "difficultyMultiplier": 2.2,
  "elementAffinity": null,
  "enemyPool": ["flame_construct", "frost_sentinel", "lightning_strider", "holy_smith", "void_weaver", "elemental_chimera"],
  "bossPool": ["heart_of_the_forge"],
  "eventPool": ["forge_trial", "element_shard", "master_smith", "ancient_altar", "blacksmith", "elemental_rift", "elemental_shrine"]
}
```

**Notes:**
- `nodeCount: 10` (vs 8 for Acts 1-3). The final act is longer to feel climactic.
- `elemental_chimera` is in `enemyPool` (not a separate `elitePool`). The existing MapGenerator picks stronger enemies for elite nodes from the same pool. The chimera's 2000 HP naturally makes it an elite-tier encounter.
- `eventPool` includes 3 new Act 4 events + 4 reused cross-act events (ancient_altar, blacksmith, elemental_rift, elemental_shrine) for sufficient variety.
- **Act 4 unlock gate:** Handled in `MapScene` code — Act 4 nodes only appear when `MetaManager.getDefeatedBosses()` includes `"shadow_lord"`. This is a code-level check, not a data field on `ActConfig`.

---

## New Heroes (4)

All heroes use `"element": null` in JSON for no-element (matching existing pattern in `heroes.json`). All hero `spriteKey` values follow the `hero_<id>` convention: `hero_elemental_weaver`, `hero_forest_stalker`, `hero_magma_warden`, `hero_storm_falcon`.

### 1. 元素织者 (Elemental Weaver)

| Field | Value |
|-------|-------|
| ID | `elemental_weaver` |
| Race | `dragon` |
| Class | `mage` |
| Role | `support` |
| Element | `null` (multi-element) |
| Unlock | `victory` — 3 total victories |

**Base Stats (UnitStats):**
```json
{
  "maxHp": 550, "hp": 550, "attack": 30, "defense": 18,
  "magicPower": 65, "speed": 55, "critChance": 0.08, "critDamage": 1.5,
  "attackRange": 300, "attackSpeed": 0.9, "magicResist": 25
}
```

**Scaling Per Level:**
```json
{ "maxHp": 35, "attack": 2, "defense": 1.5, "magicPower": 5, "magicResist": 1.5 }
```

**Skills:** `["elemental_infusion", "resonance_pulse", "ult_elemental_convergence"]`

**Design Intent:** First support-role hero. Enables dragon synergy (3 dragons reachable). Low direct damage but massive team amplification via element infusion and magic resist shred.

**Note on `support` role:** The `UnitRole` type already includes `'support'`, but no hero has used it. Verify that `TargetingSystem`, `SkillSystem`, and formation logic handle `support` correctly for heroes (not just enemies like `dark_cultist`). The `autoFormationByRole()` function should place support in the back row.

---

### 2. 深林猎手 (Forest Stalker)

| Field | Value |
|-------|-------|
| ID | `forest_stalker` |
| Race | `beast` |
| Class | `assassin` |
| Role | `melee_dps` |
| Element | `null` (physical) |
| Unlock | `hero_used` — beast_warden used in 3 runs |

**Base Stats (UnitStats):**
```json
{
  "maxHp": 480, "hp": 480, "attack": 72, "defense": 15,
  "magicPower": 10, "speed": 60, "critChance": 0.25, "critDamage": 2.2,
  "attackRange": 80, "attackSpeed": 1.2, "magicResist": 12
}
```

**Scaling Per Level:**
```json
{ "maxHp": 28, "attack": 6, "defense": 1, "magicPower": 0.5, "magicResist": 0.8 }
```

**Skills:** `["predator_strike", "pack_instinct", "ult_apex_predator"]`

**Design Intent:** Beast race (enables beast 2-count synergy). Assassin class (3 assassins for threshold). Pure physical burst — extremely high crit scaling. Glass cannon that rewards kill momentum.

---

### 3. 熔岩守卫 (Magma Warden)

| Field | Value |
|-------|-------|
| ID | `magma_warden` |
| Race | `dragon` |
| Class | `warrior` |
| Role | `tank` |
| Element | `fire` |
| Unlock | `boss_kill` — thunder_titan |

**Base Stats (UnitStats):**
```json
{
  "maxHp": 900, "hp": 900, "attack": 40, "defense": 45,
  "magicPower": 20, "speed": 30, "critChance": 0.05, "critDamage": 1.5,
  "attackRange": 80, "attackSpeed": 0.7, "magicResist": 30
}
```

**Scaling Per Level:**
```json
{ "maxHp": 55, "attack": 3, "defense": 3.5, "magicPower": 1, "magicResist": 2 }
```

**Skills:** `["molten_shield", "eruption_slam", "ult_magma_fortress"]`

**Design Intent:** Dragon race (4 dragons reachable). Warrior class (4 warriors). First fire-element tank. Extremely durable with self-shield and damage reduction ultimate.

---

### 4. 风暴隼 (Storm Falcon)

| Field | Value |
|-------|-------|
| ID | `storm_falcon` |
| Race | `beast` |
| Class | `ranger` |
| Role | `ranged_dps` |
| Element | `lightning` |
| Unlock | `element_wins` — lightning, 5 wins |

**Base Stats (UnitStats):**
```json
{
  "maxHp": 500, "hp": 500, "attack": 55, "defense": 16,
  "magicPower": 35, "speed": 65, "critChance": 0.15, "critDamage": 1.8,
  "attackRange": 350, "attackSpeed": 1.3, "magicResist": 15
}
```

**Scaling Per Level:**
```json
{ "maxHp": 30, "attack": 4.5, "defense": 1, "magicPower": 2.5, "magicResist": 1 }
```

**Skills:** `["lightning_volley", "static_charge", "ult_thunderstrike_barrage"]`

**Design Intent:** Beast race (2 beasts for synergy). Ranger class (4 rangers). Lightning element. Fast attack speed harasser. `static_charge` marks enemies for team bonus lightning damage.

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

All enemies include complete `UnitStats` blocks and `scalingPerLevel`. SpriteKeys follow the `enemy_<id>` convention.

### Regular Enemies (5)

#### 火焰铸体 (Flame Construct)
- **ID:** `flame_construct` | **spriteKey:** `enemy_flame_construct`
- **Role:** `melee_dps` | **Element:** `fire`
- **Stats:**
  ```json
  {
    "maxHp": 450, "hp": 450, "attack": 55, "defense": 20,
    "magicPower": 15, "speed": 45, "critChance": 0.08, "critDamage": 1.5,
    "attackRange": 80, "attackSpeed": 1.0, "magicResist": 10
  }
  ```
- **Scaling:** `{ "maxHp": 30, "attack": 4, "defense": 1.5, "magicPower": 1, "magicResist": 0.8 }`
- **Skill:** `forge_fire_strike` — Fire melee attack, applies ignite DoT (3s). ScalingRatio: 1.2 attack. Cooldown: 5s.
- **Rewards:** goldReward: 18, expReward: 30

#### 寒冰哨兵 (Frost Sentinel)
- **ID:** `frost_sentinel` | **spriteKey:** `enemy_frost_sentinel`
- **Role:** `tank` | **Element:** `ice`
- **Stats:**
  ```json
  {
    "maxHp": 700, "hp": 700, "attack": 30, "defense": 45,
    "magicPower": 10, "speed": 25, "critChance": 0.05, "critDamage": 1.5,
    "attackRange": 80, "attackSpeed": 0.7, "magicResist": 30
  }
  ```
- **Scaling:** `{ "maxHp": 45, "attack": 2, "defense": 3, "magicPower": 0.5, "magicResist": 2 }`
- **Skill:** `frost_guard` — Self shield (10% maxHp, 4s). Attackers get frozen 1s. ScalingRatio: 0 (shield). Cooldown: 9s.
- **Rewards:** goldReward: 18, expReward: 30

#### 雷光行者 (Lightning Strider)
- **ID:** `lightning_strider` | **spriteKey:** `enemy_lightning_strider`
- **Role:** `ranged_dps` | **Element:** `lightning`
- **Stats:**
  ```json
  {
    "maxHp": 350, "hp": 350, "attack": 50, "defense": 12,
    "magicPower": 30, "speed": 70, "critChance": 0.12, "critDamage": 1.6,
    "attackRange": 300, "attackSpeed": 1.3, "magicResist": 10
  }
  ```
- **Scaling:** `{ "maxHp": 22, "attack": 4, "defense": 0.8, "magicPower": 2, "magicResist": 0.6 }`
- **Skill:** `spark_barrage` — 2-hit lightning ranged attack. ScalingRatio: 0.8 attack (per hit). Cooldown: 6s.
- **Rewards:** goldReward: 18, expReward: 30

#### 圣光铸师 (Holy Smith)
- **ID:** `holy_smith` | **spriteKey:** `enemy_holy_smith`
- **Role:** `healer` | **Element:** `holy`
- **Stats:**
  ```json
  {
    "maxHp": 400, "hp": 400, "attack": 25, "defense": 20,
    "magicPower": 50, "speed": 40, "critChance": 0.05, "critDamage": 1.5,
    "attackRange": 300, "attackSpeed": 0.8, "magicResist": 25
  }
  ```
- **Scaling:** `{ "maxHp": 25, "attack": 1.5, "defense": 1.5, "magicPower": 3.5, "magicResist": 1.5 }`
- **Skill:** `forge_mend` — Heals lowest HP ally for 15% maxHp + cleanses 1 debuff. ScalingRatio: 0.8 magicPower. Cooldown: 7s. Target: ally.
- **Rewards:** goldReward: 18, expReward: 30
- **Note:** Fills the holy enemy gap (only 2 holy enemies before). Priority kill target.

#### 虚空织工 (Void Weaver)
- **ID:** `void_weaver` | **spriteKey:** `enemy_void_weaver`
- **Role:** `support` | **Element:** `dark`
- **Stats:**
  ```json
  {
    "maxHp": 380, "hp": 380, "attack": 35, "defense": 15,
    "magicPower": 45, "speed": 50, "critChance": 0.06, "critDamage": 1.5,
    "attackRange": 280, "attackSpeed": 0.9, "magicResist": 20
  }
  ```
- **Scaling:** `{ "maxHp": 24, "attack": 2.5, "defense": 1, "magicPower": 3, "magicResist": 1.2 }`
- **Skill:** `void_debuff` — AoE magic resist reduction (-15 for 5s) on all heroes. ScalingRatio: 0 (debuff). Cooldown: 8s.
- **Rewards:** goldReward: 18, expReward: 30

---

### Mini-Boss: 元素嵌合体 (Elemental Chimera)
- **ID:** `elemental_chimera` | **spriteKey:** `enemy_elemental_chimera`
- **Role:** `melee_dps` | **Element:** `null` (cycles)
- **Stats:**
  ```json
  {
    "maxHp": 2000, "hp": 2000, "attack": 65, "defense": 35,
    "magicPower": 40, "speed": 45, "critChance": 0.10, "critDamage": 1.8,
    "attackRange": 100, "attackSpeed": 1.0, "magicResist": 25
  }
  ```
- **Scaling:** `{ "maxHp": 120, "attack": 5, "defense": 2.5, "magicPower": 3, "magicResist": 1.5 }`
- **Boss flag:** false (elite tier)
- **Skill:** `chimera_shift` — Deals damage with current cycle element (fire→ice→lightning→dark→holy, advances each cast). ScalingRatio: 1.4 attack. Cooldown: 5s.
- **Rewards:** goldReward: 65, expReward: 60

---

### Final Boss: 元素熔炉之心 (Heart of the Forge)
- **ID:** `heart_of_the_forge` | **spriteKey:** `enemy_heart_of_the_forge`
- **Role:** `tank` | **Element:** `null` (multi-element)
- **Stats:**
  ```json
  {
    "maxHp": 5000, "hp": 5000, "attack": 55, "defense": 80,
    "magicPower": 50, "speed": 30, "critChance": 0.08, "critDamage": 1.5,
    "attackRange": 120, "attackSpeed": 0.8, "magicResist": 40
  }
  ```
- **Scaling:** `{ "maxHp": 300, "attack": 4, "defense": 5, "magicPower": 3, "magicResist": 3 }`
- **Boss flag:** true
- **Skill:** `forge_slam` — High damage AoE + random element applied. ScalingRatio: 1.3 attack. Cooldown: 6s. Target: all_enemies (from boss perspective).
- **Rewards:** goldReward: 200, expReward: 120

#### Phase Configuration (`src/data/boss-phases.json`)

```json
{
  "heart_of_the_forge": {
    "phases": [
      {
        "hpPercent": 0.75,
        "spawns": ["flame_construct", "frost_sentinel"],
        "bossEffect": { "type": "shield", "value": 2000 }
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
}
```

**Phase behavior:**
- Phase 1 (75% HP): Boss gains 2s shield (immune). Spawns Flame Construct + Frost Sentinel.
- Phase 2 (50% HP): Boss enrages (+30% attack). Spawns Lightning Strider + Holy Smith. The healer is the critical priority target.
- Phase 3 (25% HP): Boss gains 20% damage reduction. Spawns Void Weaver (MR debuff) + Flame Construct. Final DPS race.

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

### EventBus Type Additions

Add to `GameEventType` union in `src/types/index.ts`:
```typescript
| 'boss:phase'
```

Add to `GameEventMap` in `src/types/index.ts`:
```typescript
'boss:phase': { bossId: string; phaseIndex: number; spawns: string[]; effect?: { type: string; value: number } };
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
- `triggerPhase(phase, index)` — emits `boss:phase` event with spawn list + effect. BattleScene handles actual instantiation.
- `deactivate()` — removes EventBus listener, clears refs

### Integration: BattleSystem.addUnit()

The new `addUnit(unit: Unit)` method on `BattleSystem` must register the spawned enemy with all relevant subsystems. The setup mirrors what `setUnits()` does per-enemy:

1. Push to `this.enemies` array
2. Register with `TargetingSystem` — add to enemy unit list so heroes can target adds
3. Register with `StatusEffectSystem` — add to tracked units for DoT/HoT/buff processing
4. Register with `SkillSystem` — register enemy skills with cooldown tracking
5. Register with `DamageAccumulator` — track damage numbers for the new unit
6. Apply `ActModifierSystem` battle start effects — ensures spawned adds receive the act's `difficultyMultiplier` scaling

**Reference model:** The gauntlet wave transition logic (`BattleScene` lines 126-135) already handles adding new enemies between waves. `addUnit()` is similar but mid-combat rather than between waves.

### Integration: BattleScene

1. In `create()`, after boss Enemy is created, check if `bossPhaseData[bossId]` exists. If so, create `BossPhaseSystem` instance.
2. Listen for `boss:phase` event. On trigger:
   - Instantiate each spawn as new `Enemy` at `ENEMY_START_X + 40`, Y-spaced from current enemy count × `UNIT_SPACING_Y`
   - Add to `this.allUnits`, add to scene
   - Register with `BattleSystem.addUnit()` (handles all subsystem registration)
   - Apply boss effect (shield → temporary invulnerability status, enrage → attack buff status, damage_reduction → defense buff status)
   - Show phase transition visual (screen flash + floating text "Phase 2!" etc.)
3. In `shutdown()`, call `bossPhaseSystem.deactivate()`

---

## New Skills (19)

### Hero Skills (12)

#### Elemental Weaver
| ID | Name | Target | Cooldown | Element | ScalingStat | ScalingRatio | Effect |
|----|------|--------|----------|---------|-------------|-------------|--------|
| `elemental_infusion` | 元素灌注 | ally | 6s | null | magicPower | 0 | Buff ally's next attack with random element |
| `resonance_pulse` | 共鸣脉冲 | all_enemies | 8s | null | magicPower | 0.6 | AoE damage + MR debuff (-10, 5s) |
| `ult_elemental_convergence` | 元素汇聚 | all_enemies | 0 (ult) | null | magicPower | 1.2 | Triggers all 4 element reactions on all enemies |

#### Forest Stalker
| ID | Name | Target | Cooldown | Element | ScalingStat | ScalingRatio | Effect |
|----|------|--------|----------|---------|-------------|-------------|--------|
| `predator_strike` | 捕食者之击 | enemy | 5s | null | attack | 1.8 | +25% crit chance bonus |
| `pack_instinct` | 群猎本能 | self | 7s | null | attack | 0 | +20% attack speed buff (4s) |
| `ult_apex_predator` | 顶级掠食者 | enemy | 0 (ult) | null | attack | 3.0 | Targets lowest HP enemy, guaranteed crit |

#### Magma Warden
| ID | Name | Target | Cooldown | Element | ScalingStat | ScalingRatio | Effect |
|----|------|--------|----------|---------|-------------|-------------|--------|
| `molten_shield` | 熔岩之盾 | self | 8s | fire | attack | 0 | Shield 15% maxHp (5s), fire thorns |
| `eruption_slam` | 喷发冲击 | all_enemies | 10s | fire | attack | 1.0 | AoE fire damage + 2s stun on primary |
| `ult_magma_fortress` | 岩浆堡垒 | self | 0 (ult) | fire | attack | 0 | Taunt all (4s) + 30% DR + 20% fire reflect |

#### Storm Falcon
| ID | Name | Target | Cooldown | Element | ScalingStat | ScalingRatio | Effect |
|----|------|--------|----------|---------|-------------|-------------|--------|
| `lightning_volley` | 闪电齐射 | all_enemies | 6s | lightning | attack | 0.7 | 3-bolt random target |
| `static_charge` | 静电标记 | enemy | 8s | lightning | attack | 0 | Mark: next 3 ally hits deal +25 lightning |
| `ult_thunderstrike_barrage` | 雷霆风暴 | all_enemies | 0 (ult) | lightning | attack | 0.6×5 | 5-hit random target |

### Enemy Skills (7)

| ID | Name | Target | Cooldown | Element | ScalingStat | ScalingRatio | Effect |
|----|------|--------|----------|---------|-------------|-------------|--------|
| `forge_fire_strike` | 锻炎击 | enemy | 5s | fire | attack | 1.2 | Applies ignite DoT (3s) |
| `frost_guard` | 冰霜守护 | self | 9s | ice | attack | 0 | Shield 10% maxHp (4s) + freeze retaliation |
| `spark_barrage` | 电火花连射 | enemy | 6s | lightning | attack | 0.8×2 | 2-hit ranged |
| `forge_mend` | 锻造修复 | ally | 7s | holy | magicPower | 0.8 | Heal lowest HP ally 15% maxHp + cleanse |
| `void_debuff` | 虚空侵蚀 | all_enemies | 8s | dark | magicPower | 0 | AoE MR reduction (-15, 5s) |
| `chimera_shift` | 嵌合变幻 | enemy | 5s | null | attack | 1.4 | Damage + cycling element per cast |
| `forge_slam` | 熔炉重击 | all_enemies | 6s | null | attack | 1.3 | AoE + random element applied |

---

## Skill Visuals (19 entries in `skill-visuals.json`)

All colors use `0x` prefix format matching existing entries.

| Skill ID | Visual Type | Color | Count |
|----------|-------------|-------|-------|
| `elemental_infusion` | aoe_ally | 0x88ffaa | — |
| `resonance_pulse` | aoe_enemy | 0xaa88ff | — |
| `ult_elemental_convergence` | aoe_enemy | 0xff88ff | — |
| `predator_strike` | melee_impact | 0xff8844 | — |
| `pack_instinct` | aoe_self | 0x88ff44 | — |
| `ult_apex_predator` | melee_impact | 0xff4422 | — |
| `molten_shield` | aoe_self | 0xff6600 | — |
| `eruption_slam` | aoe_enemy | 0xff4400 | — |
| `ult_magma_fortress` | aoe_self | 0xff8800 | — |
| `lightning_volley` | projectile | 0x88aaff | 3 |
| `static_charge` | projectile | 0xaaccff | — |
| `ult_thunderstrike_barrage` | projectile | 0x4488ff | 5 |
| `forge_fire_strike` | melee_impact | 0xff4400 | — |
| `frost_guard` | aoe_self | 0x88ddff | — |
| `spark_barrage` | projectile | 0x88aaff | 2 |
| `forge_mend` | aoe_ally | 0xffff88 | — |
| `void_debuff` | aoe_enemy | 0x8844aa | — |
| `chimera_shift` | melee_impact | 0xcc88ff | — |
| `forge_slam` | aoe_enemy | 0xffaa44 | — |

---

## Supporting Content

### New Items (4)

| ID | Name | Slot | Rarity | Cost | Stats | Description |
|----|------|------|--------|------|-------|-------------|
| `forge_hammer_weapon` | 熔炉之锤 | weapon | rare | 180 | attack: 35, magicPower: 15 | 元素熔炉锻造的战锤 |
| `elemental_plate` | 元素护甲 | armor | rare | 170 | defense: 25, magicResist: 20 | 融合五种元素的护甲 |
| `forge_core` | 熔炉核心 | accessory | epic | 280 | magicPower: 30, critChance: 0.10 | 蕴含熔炉力量的核心 |
| `elemental_fusion_blade` | 元素融合之刃 | weapon | legendary | 400 | attack: 50, magicPower: 30, critDamage: 0.15 | 传说中的元素之刃 |

**Note:** Item ID `forge_hammer_weapon` avoids collision with boss skill ID `forge_slam`.

### New Events (3)

Event risk levels are computed at runtime by `getChoiceRiskLevel()` based on choice outcomes, not stored as data fields. The risk categorizations below are design intent — the actual choice outcome structures will produce these risk levels.

#### 熔炉试炼 (Forge Trial) — `forge_trial`
- **Design risk:** high
- Choose an element to attune: gain +20% damage for that element, take +15% damage from its weakness.
- Safe option: decline (+30 gold consolation).

#### 元素碎片 (Element Shard) — `element_shard`
- **Design risk:** low
- Find a shard: absorb (random stat +8-15) or sell (80 gold).

#### 锻造大师 (Master Smith) — `master_smith`
- **Design risk:** medium
- Pay 60-100 gold to upgrade a random equipped item's stats by 20%.
- Fail option: keep gold, leave.

### Pixel Templates

4 hero chibi configs (race+role+class combinations) and 7 enemy configs. All use the existing layered template system — body by role, head by race, weapon by class. Palette colors chosen to match element theme. No new template layers needed.

### Hero Unlock Conditions

Added to `HERO_UNLOCK_CONDITIONS` in `MetaManager.ts`:

| Hero ID | Condition Type | Params |
|---------|---------------|--------|
| `elemental_weaver` | `victory` | threshold: 3 |
| `forest_stalker` | `hero_used` | heroId: beast_warden, threshold: 3 |
| `magma_warden` | `boss_kill` | bossId: thunder_titan |
| `storm_falcon` | `element_wins` | element: lightning, threshold: 5 |

---

## Files Changed

### New Files
- `src/systems/BossPhaseSystem.ts` (~80-100 lines)
- `src/data/boss-phases.json` (phase config keyed by boss ID)

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
- `src/systems/BattleSystem.ts` — add `addUnit()` method (register with TargetingSystem, StatusEffectSystem, SkillSystem, DamageAccumulator)
- `src/scenes/BattleScene.ts` — create BossPhaseSystem for boss nodes, handle `boss:phase` event, spawn adds mid-combat
- `src/types/index.ts` — add `'boss:phase'` to `GameEventType` union and `GameEventMap`
- `src/systems/MapGenerator.ts` — add Act 4 entry to `ACT_NODE_TEMPLATES` (10-node template)
- `src/scenes/MapScene.ts` — Act 4 unlock gate (check defeatedBosses includes shadow_lord)
- `src/managers/MetaManager.ts` — add 4 hero unlock conditions to `HERO_UNLOCK_CONDITIONS`
- `src/i18n.ts` — Chinese strings for new content (act name, hero names, skill names, event text, boss phase announcements)
- `src/config/balance.ts` — no constant changes needed (boss gold reward is per-enemy `goldReward` field, not a constant)

### Test Files
- `tests/data/content-integrity.test.ts` — updated counts, cross-reference validation for new content
- `tests/systems/boss-phase.test.ts` — new: BossPhaseSystem unit tests (phase triggers, spawn events, one-shot firing, deactivation)

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
9. `support` role works correctly for hero units (formation, targeting, skill system)
