# Act 4: Elemental Forge — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Act 4 (Elemental Forge) with 4 new heroes, 7 new enemies, a BossPhaseSystem for multi-phase boss fights, and supporting content (skills, items, events).

**Architecture:** All content is data-driven via JSON files. The only new code system is `BossPhaseSystem` (~80-100 lines) which monitors boss HP and emits phase events. `BattleSystem.addUnit()` handles mid-combat enemy registration. `BattleScene` orchestrates spawning and visual effects on phase triggers.

**Tech Stack:** TypeScript, Phaser 3, Vitest. All UI is Phaser GameObjects. Chinese localization in `src/i18n.ts`.

**Spec:** `docs/superpowers/specs/2026-03-13-act4-elemental-forge-design.md`

---

## File Map

### New Files
| File | Responsibility |
|------|---------------|
| `src/systems/BossPhaseSystem.ts` | Monitor boss HP, emit `boss:phase` events at thresholds |
| `src/data/boss-phases.json` | Phase config keyed by boss ID |
| `tests/systems/boss-phase.test.ts` | BossPhaseSystem unit tests |

### Modified Data Files
| File | Change |
|------|--------|
| `src/data/heroes.json` | +4 hero entries |
| `src/data/enemies.json` | +7 enemy entries |
| `src/data/skills.json` | +19 skill entries |
| `src/data/items.json` | +4 item entries |
| `src/data/events.json` | +3 event entries |
| `src/data/acts.json` | +1 act4 entry |
| `src/data/skill-visuals.json` | +19 visual entries |
| `src/data/skill-advancements.json` | +24 advancement entries (12 skills × 2 levels) |

### Modified Source Files
| File | Change |
|------|--------|
| `src/types/index.ts` | Add `boss:phase` to `GameEventType` + `GameEventMap` |
| `src/systems/BattleSystem.ts` | Add `addUnit()` method |
| `src/scenes/BattleScene.ts` | BossPhaseSystem creation + `boss:phase` handler |
| `src/systems/MapGenerator.ts` | Add Act 4 node template (10 nodes) |
| `src/scenes/MapScene.ts` | Act 4 unlock gate |
| `src/managers/MetaManager.ts` | +4 hero unlock conditions |
| `src/i18n.ts` | Chinese strings for new content |
| `src/data/pixel-templates.ts` | +11 ChibiConfig entries |
| `tests/data/content-integrity.test.ts` | Updated counts + new cross-refs |

---

## Chunk 1: Content Data

### Task 1: Add 19 New Skills to `skills.json`

**Files:**
- Modify: `src/data/skills.json`
- Test: `tests/data/content-integrity.test.ts` (existing cross-ref tests will validate)

- [ ] **Step 1: Add 12 hero skills**

Append these 12 entries to `src/data/skills.json`. Each follows the existing structure (`id`, `name`, `description`, `cooldown`, `damageType`, `targetType`, `baseDamage`, `scalingStat`, `scalingRatio`, `range`, optional `statusEffect`/`effectDuration`/`element`/`isUltimate`/`aoeRadius`).

```json
{
  "id": "elemental_infusion",
  "name": "元素灌注",
  "description": "为一名友方附加随机元素强化",
  "cooldown": 6,
  "damageType": "magical",
  "targetType": "ally",
  "baseDamage": 0,
  "scalingStat": "magicPower",
  "scalingRatio": 0,
  "range": 300
},
{
  "id": "resonance_pulse",
  "name": "共鸣脉冲",
  "description": "对全体敌人造成魔法伤害并降低法抗",
  "cooldown": 8,
  "damageType": "magical",
  "targetType": "all_enemies",
  "baseDamage": 30,
  "scalingStat": "magicPower",
  "scalingRatio": 0.6,
  "range": 300,
  "statusEffect": "magic_resist_down",
  "effectDuration": 5
},
{
  "id": "ult_elemental_convergence",
  "name": "元素汇聚",
  "description": "对全体敌人同时触发四种元素反应",
  "cooldown": 0,
  "damageType": "magical",
  "targetType": "all_enemies",
  "baseDamage": 60,
  "scalingStat": "magicPower",
  "scalingRatio": 1.2,
  "range": 400,
  "isUltimate": true
},
{
  "id": "predator_strike",
  "name": "捕食者之击",
  "description": "对单体造成高额物理伤害，暴击率+25%",
  "cooldown": 5,
  "damageType": "physical",
  "targetType": "enemy",
  "baseDamage": 40,
  "scalingStat": "attack",
  "scalingRatio": 1.8,
  "range": 80
},
{
  "id": "pack_instinct",
  "name": "群猎本能",
  "description": "增加自身攻速20%持续4秒",
  "cooldown": 7,
  "damageType": "physical",
  "targetType": "self",
  "baseDamage": 0,
  "scalingStat": "attack",
  "scalingRatio": 0,
  "range": 0,
  "statusEffect": "attack_speed_up",
  "effectDuration": 4
},
{
  "id": "ult_apex_predator",
  "name": "顶级掠食者",
  "description": "对最低生命敌人造成致命一击，必定暴击",
  "cooldown": 0,
  "damageType": "physical",
  "targetType": "enemy",
  "baseDamage": 80,
  "scalingStat": "attack",
  "scalingRatio": 3.0,
  "range": 80,
  "isUltimate": true
},
{
  "id": "molten_shield",
  "name": "熔岩之盾",
  "description": "获得最大生命15%的护盾，攻击者受到火焰伤害",
  "cooldown": 8,
  "damageType": "magical",
  "targetType": "self",
  "baseDamage": 0,
  "scalingStat": "attack",
  "scalingRatio": 0,
  "range": 0,
  "element": "fire"
},
{
  "id": "eruption_slam",
  "name": "喷发冲击",
  "description": "对全体敌人造成火焰伤害并眩晕主目标",
  "cooldown": 10,
  "damageType": "magical",
  "targetType": "all_enemies",
  "baseDamage": 50,
  "scalingStat": "attack",
  "scalingRatio": 1.0,
  "range": 120,
  "element": "fire",
  "statusEffect": "stun",
  "effectDuration": 2
},
{
  "id": "ult_magma_fortress",
  "name": "岩浆堡垒",
  "description": "嘲讽全体敌人4秒，获得30%减伤并反射20%火焰伤害",
  "cooldown": 0,
  "damageType": "magical",
  "targetType": "self",
  "baseDamage": 0,
  "scalingStat": "attack",
  "scalingRatio": 0,
  "range": 0,
  "element": "fire",
  "statusEffect": "taunt",
  "effectDuration": 4,
  "isUltimate": true
},
{
  "id": "lightning_volley",
  "name": "闪电齐射",
  "description": "向随机敌人发射3道闪电",
  "cooldown": 6,
  "damageType": "magical",
  "targetType": "all_enemies",
  "baseDamage": 25,
  "scalingStat": "attack",
  "scalingRatio": 0.7,
  "range": 350,
  "element": "lightning"
},
{
  "id": "static_charge",
  "name": "静电标记",
  "description": "标记敌人，友方接下来3次攻击附加雷电伤害",
  "cooldown": 8,
  "damageType": "magical",
  "targetType": "enemy",
  "baseDamage": 0,
  "scalingStat": "attack",
  "scalingRatio": 0,
  "range": 350,
  "element": "lightning"
},
{
  "id": "ult_thunderstrike_barrage",
  "name": "雷霆风暴",
  "description": "向随机敌人发射5道高速闪电",
  "cooldown": 0,
  "damageType": "magical",
  "targetType": "all_enemies",
  "baseDamage": 30,
  "scalingStat": "attack",
  "scalingRatio": 0.6,
  "range": 400,
  "element": "lightning",
  "isUltimate": true
}
```

- [ ] **Step 2: Add 7 enemy skills**

Append these 7 entries to `src/data/skills.json`:

```json
{
  "id": "forge_fire_strike",
  "name": "锻炎击",
  "description": "火焰近战攻击，附加燃烧效果",
  "cooldown": 5,
  "damageType": "magical",
  "targetType": "enemy",
  "baseDamage": 40,
  "scalingStat": "attack",
  "scalingRatio": 1.2,
  "range": 80,
  "element": "fire",
  "statusEffect": "burn",
  "effectDuration": 3
},
{
  "id": "frost_guard",
  "name": "冰霜守护",
  "description": "获得护盾并冻结攻击者",
  "cooldown": 9,
  "damageType": "magical",
  "targetType": "self",
  "baseDamage": 0,
  "scalingStat": "attack",
  "scalingRatio": 0,
  "range": 0,
  "element": "ice"
},
{
  "id": "spark_barrage",
  "name": "电火花连射",
  "description": "发射2道闪电弹",
  "cooldown": 6,
  "damageType": "magical",
  "targetType": "enemy",
  "baseDamage": 30,
  "scalingStat": "attack",
  "scalingRatio": 0.8,
  "range": 300,
  "element": "lightning"
},
{
  "id": "forge_mend",
  "name": "锻造修复",
  "description": "治疗生命最低的友方并清除一个减益",
  "cooldown": 7,
  "damageType": "magical",
  "targetType": "ally",
  "baseDamage": 0,
  "scalingStat": "magicPower",
  "scalingRatio": 0.8,
  "range": 300,
  "element": "holy"
},
{
  "id": "void_debuff",
  "name": "虚空侵蚀",
  "description": "降低全体英雄法抗",
  "cooldown": 8,
  "damageType": "magical",
  "targetType": "all_enemies",
  "baseDamage": 0,
  "scalingStat": "magicPower",
  "scalingRatio": 0,
  "range": 280,
  "element": "dark",
  "statusEffect": "magic_resist_down",
  "effectDuration": 5
},
{
  "id": "chimera_shift",
  "name": "嵌合变幻",
  "description": "以当前循环元素造成伤害",
  "cooldown": 5,
  "damageType": "magical",
  "targetType": "enemy",
  "baseDamage": 45,
  "scalingStat": "attack",
  "scalingRatio": 1.4,
  "range": 100
},
{
  "id": "forge_slam",
  "name": "熔炉重击",
  "description": "对全体造成伤害并附加随机元素",
  "cooldown": 6,
  "damageType": "magical",
  "targetType": "all_enemies",
  "baseDamage": 50,
  "scalingStat": "attack",
  "scalingRatio": 1.3,
  "range": 120
}
```

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: zero errors

- [ ] **Step 4: Commit**

```bash
git add src/data/skills.json
git commit -m "feat(act4): add 19 new skills (12 hero + 7 enemy)"
```

---

### Task 2: Add 4 New Heroes to `heroes.json`

**Files:**
- Modify: `src/data/heroes.json`

- [ ] **Step 1: Add 4 hero entries**

Append to `src/data/heroes.json`. Each follows the warrior pattern: `id`, `name`, `role`, `element`, `race`, `class`, `baseStats` (full UnitStats), `scalingPerLevel`, `skills` (3-element array), `spriteKey`.

```json
{
  "id": "elemental_weaver",
  "name": "元素织者",
  "role": "support",
  "element": null,
  "race": "dragon",
  "class": "mage",
  "baseStats": {
    "maxHp": 550, "hp": 550, "attack": 30, "defense": 18,
    "magicPower": 65, "speed": 55, "critChance": 0.08, "critDamage": 1.5,
    "attackRange": 300, "attackSpeed": 0.9, "magicResist": 25
  },
  "scalingPerLevel": { "maxHp": 35, "attack": 2, "defense": 1.5, "magicPower": 5, "magicResist": 1.5 },
  "skills": ["elemental_infusion", "resonance_pulse", "ult_elemental_convergence"],
  "spriteKey": "hero_elemental_weaver"
},
{
  "id": "forest_stalker",
  "name": "深林猎手",
  "role": "melee_dps",
  "element": null,
  "race": "beast",
  "class": "assassin",
  "baseStats": {
    "maxHp": 480, "hp": 480, "attack": 72, "defense": 15,
    "magicPower": 10, "speed": 60, "critChance": 0.25, "critDamage": 2.2,
    "attackRange": 80, "attackSpeed": 1.2, "magicResist": 12
  },
  "scalingPerLevel": { "maxHp": 28, "attack": 6, "defense": 1, "magicPower": 0.5, "magicResist": 0.8 },
  "skills": ["predator_strike", "pack_instinct", "ult_apex_predator"],
  "spriteKey": "hero_forest_stalker"
},
{
  "id": "magma_warden",
  "name": "熔岩守卫",
  "role": "tank",
  "element": "fire",
  "race": "dragon",
  "class": "warrior",
  "baseStats": {
    "maxHp": 900, "hp": 900, "attack": 40, "defense": 45,
    "magicPower": 20, "speed": 30, "critChance": 0.05, "critDamage": 1.5,
    "attackRange": 80, "attackSpeed": 0.7, "magicResist": 30
  },
  "scalingPerLevel": { "maxHp": 55, "attack": 3, "defense": 3.5, "magicPower": 1, "magicResist": 2 },
  "skills": ["molten_shield", "eruption_slam", "ult_magma_fortress"],
  "spriteKey": "hero_magma_warden"
},
{
  "id": "storm_falcon",
  "name": "风暴隼",
  "role": "ranged_dps",
  "element": "lightning",
  "race": "beast",
  "class": "ranger",
  "baseStats": {
    "maxHp": 500, "hp": 500, "attack": 55, "defense": 16,
    "magicPower": 35, "speed": 65, "critChance": 0.15, "critDamage": 1.8,
    "attackRange": 350, "attackSpeed": 1.3, "magicResist": 15
  },
  "scalingPerLevel": { "maxHp": 30, "attack": 4.5, "defense": 1, "magicPower": 2.5, "magicResist": 1 },
  "skills": ["lightning_volley", "static_charge", "ult_thunderstrike_barrage"],
  "spriteKey": "hero_storm_falcon"
}
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: zero errors

- [ ] **Step 3: Commit**

```bash
git add src/data/heroes.json
git commit -m "feat(act4): add 4 new heroes (weaver, stalker, magma warden, storm falcon)"
```

---

### Task 3: Add 7 New Enemies to `enemies.json`

**Files:**
- Modify: `src/data/enemies.json`

- [ ] **Step 1: Add 5 regular enemies + 1 mini-boss + 1 final boss**

Append to `src/data/enemies.json`. Enemy entries have: `id`, `name`, `role`, `element`, `race` (optional for non-boss), `baseStats`, `scalingPerLevel`, `skills`, `spriteKey`, `goldReward`, `expReward`, optional `isBoss`.

```json
{
  "id": "flame_construct",
  "name": "火焰铸体",
  "role": "melee_dps",
  "element": "fire",
  "baseStats": {
    "maxHp": 450, "hp": 450, "attack": 55, "defense": 20,
    "magicPower": 15, "speed": 45, "critChance": 0.08, "critDamage": 1.5,
    "attackRange": 80, "attackSpeed": 1.0, "magicResist": 10
  },
  "scalingPerLevel": { "maxHp": 30, "attack": 4, "defense": 1.5, "magicPower": 1, "magicResist": 0.8 },
  "skills": ["forge_fire_strike"],
  "spriteKey": "enemy_flame_construct",
  "goldReward": 18,
  "expReward": 30
},
{
  "id": "frost_sentinel",
  "name": "寒冰哨兵",
  "role": "tank",
  "element": "ice",
  "baseStats": {
    "maxHp": 700, "hp": 700, "attack": 30, "defense": 45,
    "magicPower": 10, "speed": 25, "critChance": 0.05, "critDamage": 1.5,
    "attackRange": 80, "attackSpeed": 0.7, "magicResist": 30
  },
  "scalingPerLevel": { "maxHp": 45, "attack": 2, "defense": 3, "magicPower": 0.5, "magicResist": 2 },
  "skills": ["frost_guard"],
  "spriteKey": "enemy_frost_sentinel",
  "goldReward": 18,
  "expReward": 30
},
{
  "id": "lightning_strider",
  "name": "雷光行者",
  "role": "ranged_dps",
  "element": "lightning",
  "baseStats": {
    "maxHp": 350, "hp": 350, "attack": 50, "defense": 12,
    "magicPower": 30, "speed": 70, "critChance": 0.12, "critDamage": 1.6,
    "attackRange": 300, "attackSpeed": 1.3, "magicResist": 10
  },
  "scalingPerLevel": { "maxHp": 22, "attack": 4, "defense": 0.8, "magicPower": 2, "magicResist": 0.6 },
  "skills": ["spark_barrage"],
  "spriteKey": "enemy_lightning_strider",
  "goldReward": 18,
  "expReward": 30
},
{
  "id": "holy_smith",
  "name": "圣光铸师",
  "role": "healer",
  "element": "holy",
  "baseStats": {
    "maxHp": 400, "hp": 400, "attack": 25, "defense": 20,
    "magicPower": 50, "speed": 40, "critChance": 0.05, "critDamage": 1.5,
    "attackRange": 300, "attackSpeed": 0.8, "magicResist": 25
  },
  "scalingPerLevel": { "maxHp": 25, "attack": 1.5, "defense": 1.5, "magicPower": 3.5, "magicResist": 1.5 },
  "skills": ["forge_mend"],
  "spriteKey": "enemy_holy_smith",
  "goldReward": 18,
  "expReward": 30
},
{
  "id": "void_weaver",
  "name": "虚空织工",
  "role": "support",
  "element": "dark",
  "baseStats": {
    "maxHp": 380, "hp": 380, "attack": 35, "defense": 15,
    "magicPower": 45, "speed": 50, "critChance": 0.06, "critDamage": 1.5,
    "attackRange": 280, "attackSpeed": 0.9, "magicResist": 20
  },
  "scalingPerLevel": { "maxHp": 24, "attack": 2.5, "defense": 1, "magicPower": 3, "magicResist": 1.2 },
  "skills": ["void_debuff"],
  "spriteKey": "enemy_void_weaver",
  "goldReward": 18,
  "expReward": 30
},
{
  "id": "elemental_chimera",
  "name": "元素嵌合体",
  "role": "melee_dps",
  "element": null,
  "baseStats": {
    "maxHp": 2000, "hp": 2000, "attack": 65, "defense": 35,
    "magicPower": 40, "speed": 45, "critChance": 0.10, "critDamage": 1.8,
    "attackRange": 100, "attackSpeed": 1.0, "magicResist": 25
  },
  "scalingPerLevel": { "maxHp": 120, "attack": 5, "defense": 2.5, "magicPower": 3, "magicResist": 1.5 },
  "skills": ["chimera_shift"],
  "spriteKey": "enemy_elemental_chimera",
  "goldReward": 65,
  "expReward": 60
},
{
  "id": "heart_of_the_forge",
  "name": "元素熔炉之心",
  "role": "tank",
  "element": null,
  "race": "dragon",
  "baseStats": {
    "maxHp": 5000, "hp": 5000, "attack": 55, "defense": 80,
    "magicPower": 50, "speed": 30, "critChance": 0.08, "critDamage": 1.5,
    "attackRange": 120, "attackSpeed": 0.8, "magicResist": 40
  },
  "scalingPerLevel": { "maxHp": 300, "attack": 4, "defense": 5, "magicPower": 3, "magicResist": 3 },
  "skills": ["forge_slam"],
  "spriteKey": "enemy_heart_of_the_forge",
  "goldReward": 200,
  "expReward": 120,
  "isBoss": true
}
```

- [ ] **Step 2: Commit**

```bash
git add src/data/enemies.json
git commit -m "feat(act4): add 7 new enemies (5 regulars + chimera mini-boss + forge heart boss)"
```

---

### Task 4: Add Act 4, Items, Events, Skill Visuals, Skill Advancements

**Files:**
- Modify: `src/data/acts.json`, `src/data/items.json`, `src/data/events.json`, `src/data/skill-visuals.json`, `src/data/skill-advancements.json`

- [ ] **Step 1: Add Act 4 to `acts.json`**

Append to the array in `src/data/acts.json`:

```json
{
  "id": "act4_forge",
  "name": "元素熔炉",
  "description": "传说中的元素熔炉，五种元素在此交汇融合。",
  "nodeCount": 10,
  "enemyPool": ["flame_construct", "frost_sentinel", "lightning_strider", "holy_smith", "void_weaver", "elemental_chimera"],
  "bossPool": ["heart_of_the_forge"],
  "eventPool": ["forge_trial", "element_shard", "master_smith", "ancient_altar", "blacksmith", "elemental_rift", "elemental_shrine"],
  "elementAffinity": null,
  "difficultyMultiplier": 2.2
}
```

- [ ] **Step 2: Add 4 items to `items.json`**

Append to `src/data/items.json`:

```json
{
  "id": "forge_hammer_weapon",
  "name": "熔炉之锤",
  "description": "元素熔炉锻造的战锤",
  "slot": "weapon",
  "rarity": "rare",
  "cost": 180,
  "stats": { "attack": 35, "magicPower": 15 }
},
{
  "id": "elemental_plate",
  "name": "元素护甲",
  "description": "融合五种元素的护甲",
  "slot": "armor",
  "rarity": "rare",
  "cost": 170,
  "stats": { "defense": 25, "magicResist": 20 }
},
{
  "id": "forge_core",
  "name": "熔炉核心",
  "description": "蕴含熔炉力量的核心",
  "slot": "accessory",
  "rarity": "epic",
  "cost": 280,
  "stats": { "magicPower": 30, "critChance": 0.10 }
},
{
  "id": "elemental_fusion_blade",
  "name": "元素融合之刃",
  "description": "传说中的元素之刃",
  "slot": "weapon",
  "rarity": "legendary",
  "cost": 400,
  "stats": { "attack": 50, "magicPower": 30, "critDamage": 0.15 }
}
```

- [ ] **Step 3: Add 3 events to `events.json`**

Append to `src/data/events.json`. Follow the existing event structure: `id`, `title`, `description`, `choices[]` with `text` and `outcomes[]` (each having `probability`, `description`, `effects[]`).

```json
{
  "id": "forge_trial",
  "title": "熔炉试炼",
  "description": "一座古老的元素熔炉正在运转，你可以选择接受元素灌注...",
  "choices": [
    {
      "text": "接受火元素灌注",
      "outcomes": [
        { "probability": 1.0, "description": "火焰之力充盈你的队伍！攻击力提升但冰抗下降。", "effects": [{ "type": "stat_boost", "stat": "attack", "value": 15 }, { "type": "stat_boost", "stat": "magicResist", "value": -5 }] }
      ]
    },
    {
      "text": "接受雷元素灌注",
      "outcomes": [
        { "probability": 1.0, "description": "雷电之力充盈你的队伍！速度提升但防御下降。", "effects": [{ "type": "stat_boost", "stat": "speed", "value": 20 }, { "type": "stat_boost", "stat": "defense", "value": -5 }] }
      ]
    },
    {
      "text": "拒绝试炼",
      "outcomes": [
        { "probability": 1.0, "description": "你谨慎地离开，获得一些金币作为补偿。", "effects": [{ "type": "gold", "value": 30 }] }
      ]
    }
  ]
},
{
  "id": "element_shard",
  "title": "元素碎片",
  "description": "地上散落着一块闪烁着多彩光芒的元素碎片...",
  "choices": [
    {
      "text": "吸收碎片能量",
      "outcomes": [
        { "probability": 0.5, "description": "碎片的力量增强了你的队伍！", "effects": [{ "type": "stat_boost", "stat": "attack", "value": 12 }] },
        { "probability": 0.5, "description": "碎片的力量增强了你的防御！", "effects": [{ "type": "stat_boost", "stat": "defense", "value": 10 }] }
      ]
    },
    {
      "text": "出售碎片",
      "outcomes": [
        { "probability": 1.0, "description": "一位收藏家高价买下了碎片。", "effects": [{ "type": "gold", "value": 80 }] }
      ]
    }
  ]
},
{
  "id": "master_smith",
  "title": "锻造大师",
  "description": "一位传奇锻造大师正在此地工作，他愿意为你强化装备...",
  "choices": [
    {
      "text": "支付80金币强化装备",
      "outcomes": [
        { "probability": 0.7, "description": "大师精湛的技艺提升了你的装备！", "effects": [{ "type": "gold", "value": -80 }, { "type": "stat_boost", "stat": "attack", "value": 10 }, { "type": "stat_boost", "stat": "defense", "value": 8 }] },
        { "probability": 0.3, "description": "强化失败了，但大师退还了一半费用。", "effects": [{ "type": "gold", "value": -40 }] }
      ]
    },
    {
      "text": "离开",
      "outcomes": [
        { "probability": 1.0, "description": "你继续前行。", "effects": [] }
      ]
    }
  ]
}
```

- [ ] **Step 4: Add 19 skill visual entries to `skill-visuals.json`**

Add to the object in `src/data/skill-visuals.json`:

```json
"elemental_infusion": { "type": "aoe_ally", "color": "0x88ffaa" },
"resonance_pulse": { "type": "aoe_enemy", "color": "0xaa88ff" },
"ult_elemental_convergence": { "type": "aoe_enemy", "color": "0xff88ff" },
"predator_strike": { "type": "melee_impact", "color": "0xff8844" },
"pack_instinct": { "type": "aoe_self", "color": "0x88ff44" },
"ult_apex_predator": { "type": "melee_impact", "color": "0xff4422" },
"molten_shield": { "type": "aoe_self", "color": "0xff6600" },
"eruption_slam": { "type": "aoe_enemy", "color": "0xff4400" },
"ult_magma_fortress": { "type": "aoe_self", "color": "0xff8800" },
"lightning_volley": { "type": "projectile", "color": "0x88aaff", "count": 3 },
"static_charge": { "type": "projectile", "color": "0xaaccff" },
"ult_thunderstrike_barrage": { "type": "projectile", "color": "0x4488ff", "count": 5 },
"forge_fire_strike": { "type": "melee_impact", "color": "0xff4400" },
"frost_guard": { "type": "aoe_self", "color": "0x88ddff" },
"spark_barrage": { "type": "projectile", "color": "0x88aaff", "count": 2 },
"forge_mend": { "type": "aoe_ally", "color": "0xffff88" },
"void_debuff": { "type": "aoe_enemy", "color": "0x8844aa" },
"chimera_shift": { "type": "melee_impact", "color": "0xcc88ff" },
"forge_slam": { "type": "aoe_enemy", "color": "0xffaa44" }
```

- [ ] **Step 5: Add skill advancement entries to `skill-advancements.json`**

Append 24 entries (12 hero skills × 2 levels) to `src/data/skill-advancements.json`. Each follows the pattern: `skillId`, `level` (1 or 2), `requiredHeroLevel` (5 or 10), `name`, `description`, `bonuses`.

```json
{ "skillId": "elemental_infusion", "level": 1, "requiredHeroLevel": 5, "name": "强化灌注", "description": "冷却-1s", "bonuses": { "cooldown": -1 } },
{ "skillId": "elemental_infusion", "level": 2, "requiredHeroLevel": 10, "name": "双元素灌注", "description": "冷却-1s", "bonuses": { "cooldown": -1 } },
{ "skillId": "resonance_pulse", "level": 1, "requiredHeroLevel": 5, "name": "增幅脉冲", "description": "伤害+20", "bonuses": { "baseDamage": 20 } },
{ "skillId": "resonance_pulse", "level": 2, "requiredHeroLevel": 10, "name": "扩散脉冲", "description": "伤害+25", "bonuses": { "baseDamage": 25 } },
{ "skillId": "predator_strike", "level": 1, "requiredHeroLevel": 5, "name": "利爪强化", "description": "伤害+25", "bonuses": { "baseDamage": 25 } },
{ "skillId": "predator_strike", "level": 2, "requiredHeroLevel": 10, "name": "致命猎杀", "description": "伤害+30，冷却-1s", "bonuses": { "baseDamage": 30, "cooldown": -1 } },
{ "skillId": "pack_instinct", "level": 1, "requiredHeroLevel": 5, "name": "群猎强化", "description": "冷却-1s", "bonuses": { "cooldown": -1 } },
{ "skillId": "pack_instinct", "level": 2, "requiredHeroLevel": 10, "name": "猎群协同", "description": "冷却-2s", "bonuses": { "cooldown": -2 } },
{ "skillId": "molten_shield", "level": 1, "requiredHeroLevel": 5, "name": "熔岩强化", "description": "冷却-1s", "bonuses": { "cooldown": -1 } },
{ "skillId": "molten_shield", "level": 2, "requiredHeroLevel": 10, "name": "烈焰护盾", "description": "冷却-2s", "bonuses": { "cooldown": -2 } },
{ "skillId": "eruption_slam", "level": 1, "requiredHeroLevel": 5, "name": "烈焰冲击", "description": "伤害+30", "bonuses": { "baseDamage": 30 } },
{ "skillId": "eruption_slam", "level": 2, "requiredHeroLevel": 10, "name": "火山爆发", "description": "伤害+40，冷却-1s", "bonuses": { "baseDamage": 40, "cooldown": -1 } },
{ "skillId": "lightning_volley", "level": 1, "requiredHeroLevel": 5, "name": "雷电强化", "description": "伤害+15", "bonuses": { "baseDamage": 15 } },
{ "skillId": "lightning_volley", "level": 2, "requiredHeroLevel": 10, "name": "雷霆齐射", "description": "伤害+20，冷却-1s", "bonuses": { "baseDamage": 20, "cooldown": -1 } },
{ "skillId": "static_charge", "level": 1, "requiredHeroLevel": 5, "name": "增幅标记", "description": "冷却-1s", "bonuses": { "cooldown": -1 } },
{ "skillId": "static_charge", "level": 2, "requiredHeroLevel": 10, "name": "超导标记", "description": "冷却-2s", "bonuses": { "cooldown": -2 } }
```

- [ ] **Step 6: Run type check**

Run: `npx tsc --noEmit`
Expected: zero errors

- [ ] **Step 7: Commit**

```bash
git add src/data/acts.json src/data/items.json src/data/events.json src/data/skill-visuals.json src/data/skill-advancements.json
git commit -m "feat(act4): add act4 config, items, events, skill visuals, and advancements"
```

---

## Chunk 2: BossPhaseSystem + Code Changes

### Task 5: Add `boss:phase` Event Type

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add `boss:phase` to `GameEventType` union**

In `src/types/index.ts`, find the `GameEventType` union and add `| 'boss:phase'` after the last entry (before the semicolon).

- [ ] **Step 2: Add `boss:phase` to `GameEventMap` interface**

In the same file, add to `GameEventMap`:

```typescript
'boss:phase': { bossId: string; phaseIndex: number; spawns: string[]; effect?: { type: string; value: number } };
```

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: zero errors

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts
git commit -m "feat(act4): add boss:phase event type to GameEventMap"
```

---

### Task 6: Create BossPhaseSystem

**Files:**
- Create: `src/systems/BossPhaseSystem.ts`
- Create: `src/data/boss-phases.json`
- Create: `tests/systems/boss-phase.test.ts`

- [ ] **Step 1: Write boss phase tests**

Create `tests/systems/boss-phase.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BossPhaseSystem } from '../../src/systems/BossPhaseSystem';
import { EventBus } from '../../src/systems/EventBus';

// Minimal Enemy mock
function makeBossUnit(maxHp: number) {
  return {
    unitId: 'boss_1',
    currentHp: maxHp,
    baseStats: { maxHp },
  } as any;
}

const PHASE_CONFIG = {
  bossId: 'heart_of_the_forge',
  phases: [
    { hpPercent: 0.75, spawns: ['flame_construct', 'frost_sentinel'], bossEffect: { type: 'shield' as const, value: 2000 } },
    { hpPercent: 0.50, spawns: ['lightning_strider', 'holy_smith'], bossEffect: { type: 'enrage' as const, value: 30 } },
    { hpPercent: 0.25, spawns: ['void_weaver', 'flame_construct'], bossEffect: { type: 'damage_reduction' as const, value: 20 } },
  ],
};

describe('BossPhaseSystem', () => {
  let bus: EventBus;
  let boss: ReturnType<typeof makeBossUnit>;

  beforeEach(() => {
    bus = EventBus.getInstance();
    bus.reset();
    boss = makeBossUnit(5000);
  });

  it('emits boss:phase when HP crosses threshold', () => {
    const system = new BossPhaseSystem(boss, PHASE_CONFIG);
    const handler = vi.fn();
    bus.on('boss:phase', handler);

    // Simulate damage: boss at 70% HP
    boss.currentHp = 3500;
    bus.emit('unit:damage', { sourceId: 'hero_1', targetId: 'boss_1', amount: 1500, damageType: 'physical', isCrit: false });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({
      bossId: 'heart_of_the_forge',
      phaseIndex: 0,
      spawns: ['flame_construct', 'frost_sentinel'],
    }));

    system.deactivate();
  });

  it('fires each phase only once', () => {
    const system = new BossPhaseSystem(boss, PHASE_CONFIG);
    const handler = vi.fn();
    bus.on('boss:phase', handler);

    // First damage: 75% threshold
    boss.currentHp = 3500;
    bus.emit('unit:damage', { sourceId: 'hero_1', targetId: 'boss_1', amount: 1500, damageType: 'physical', isCrit: false });
    expect(handler).toHaveBeenCalledTimes(1);

    // Second damage still above 50%: no new phase
    boss.currentHp = 3000;
    bus.emit('unit:damage', { sourceId: 'hero_1', targetId: 'boss_1', amount: 500, damageType: 'physical', isCrit: false });
    expect(handler).toHaveBeenCalledTimes(1);

    system.deactivate();
  });

  it('fires multiple phases if HP drops past several thresholds at once', () => {
    const system = new BossPhaseSystem(boss, PHASE_CONFIG);
    const handler = vi.fn();
    bus.on('boss:phase', handler);

    // Massive damage: boss at 20% (crosses all 3 thresholds)
    boss.currentHp = 1000;
    bus.emit('unit:damage', { sourceId: 'hero_1', targetId: 'boss_1', amount: 4000, damageType: 'physical', isCrit: false });

    expect(handler).toHaveBeenCalledTimes(3);
    system.deactivate();
  });

  it('ignores damage to non-boss units', () => {
    const system = new BossPhaseSystem(boss, PHASE_CONFIG);
    const handler = vi.fn();
    bus.on('boss:phase', handler);

    bus.emit('unit:damage', { sourceId: 'hero_1', targetId: 'other_unit', amount: 9999, damageType: 'physical', isCrit: false });
    expect(handler).not.toHaveBeenCalled();

    system.deactivate();
  });

  it('deactivate removes listener', () => {
    const system = new BossPhaseSystem(boss, PHASE_CONFIG);
    system.deactivate();

    const handler = vi.fn();
    bus.on('boss:phase', handler);

    boss.currentHp = 1000;
    bus.emit('unit:damage', { sourceId: 'hero_1', targetId: 'boss_1', amount: 4000, damageType: 'physical', isCrit: false });
    expect(handler).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/systems/boss-phase.test.ts`
Expected: FAIL (BossPhaseSystem not found)

- [ ] **Step 3: Create `src/data/boss-phases.json`**

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

- [ ] **Step 4: Implement `src/systems/BossPhaseSystem.ts`**

```typescript
import { EventBus } from './EventBus';
import { Unit } from '../entities/Unit';

export interface BossPhase {
  hpPercent: number;
  spawns: string[];
  bossEffect?: {
    type: 'shield' | 'enrage' | 'damage_reduction';
    value: number;
  };
}

export interface BossPhaseConfig {
  bossId: string;
  phases: BossPhase[];
}

/**
 * Monitors boss HP and emits 'boss:phase' events when HP crosses thresholds.
 * Not a singleton — one instance per boss battle.
 */
export class BossPhaseSystem {
  private bossUnit: Unit;
  private config: BossPhaseConfig;
  private firedPhases: Set<number> = new Set();
  private onDamageRef: (data: { targetId: string }) => void;

  constructor(bossUnit: Unit, config: BossPhaseConfig) {
    this.bossUnit = bossUnit;
    this.config = config;

    this.onDamageRef = (data) => {
      if (data.targetId !== this.bossUnit.unitId) return;
      this.checkPhases();
    };

    EventBus.getInstance().on('unit:damage', this.onDamageRef);
  }

  private checkPhases(): void {
    const maxHp = this.bossUnit.baseStats.maxHp;
    const currentHp = this.bossUnit.currentHp;
    const hpRatio = currentHp / maxHp;

    for (let i = 0; i < this.config.phases.length; i++) {
      if (this.firedPhases.has(i)) continue;
      const phase = this.config.phases[i];
      if (hpRatio <= phase.hpPercent) {
        this.firedPhases.add(i);
        this.triggerPhase(phase, i);
      }
    }
  }

  private triggerPhase(phase: BossPhase, index: number): void {
    EventBus.getInstance().emit('boss:phase', {
      bossId: this.config.bossId,
      phaseIndex: index,
      spawns: phase.spawns,
      effect: phase.bossEffect,
    });
  }

  deactivate(): void {
    EventBus.getInstance().off('unit:damage', this.onDamageRef);
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/systems/boss-phase.test.ts`
Expected: all 5 tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/systems/BossPhaseSystem.ts src/data/boss-phases.json tests/systems/boss-phase.test.ts
git commit -m "feat(act4): add BossPhaseSystem with phase trigger tests"
```

---

### Task 7: Add `BattleSystem.addUnit()` Method

**Files:**
- Modify: `src/systems/BattleSystem.ts`

- [ ] **Step 1: Add `addUnit()` method**

Add this method to the `BattleSystem` class, after `replaceEnemies()`. It registers a single new enemy mid-combat with all subsystems:

```typescript
/** Add a single enemy unit mid-combat (for boss phase spawns) */
addUnit(enemy: Enemy): void {
  this.enemies.push(enemy);
  this.skillSystem.initializeSkills(enemy, enemy.enemyData.skills);
  if (this.actModifier) {
    this.actModifier.applyBattleStart(this.heroes, [enemy]);
  }
}
```

**Note:** `TargetingSystem` uses `getAliveEnemies()` which filters from `this.enemies` dynamically, so pushing to the array is sufficient. `StatusEffectSystem` iterates all units each tick. `DamageAccumulator` creates entries on demand. No additional registration calls needed beyond skill init + act modifier.

- [ ] **Step 2: Verify the `Enemy` import exists**

Check that `BattleSystem.ts` already imports `Enemy`. If not, add `import { Enemy } from '../entities/Enemy';`.

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: zero errors

- [ ] **Step 4: Commit**

```bash
git add src/systems/BattleSystem.ts
git commit -m "feat(act4): add BattleSystem.addUnit() for mid-combat enemy spawns"
```

---

## Chunk 3: Scene Integration + Supporting Code

### Task 8: Add Hero Unlock Conditions + i18n + MapGenerator Template

**Files:**
- Modify: `src/managers/MetaManager.ts`
- Modify: `src/i18n.ts`
- Modify: `src/systems/MapGenerator.ts`

- [ ] **Step 1: Add 4 hero unlock conditions to `MetaManager.ts`**

Add to the `HERO_UNLOCK_CONDITIONS` object in `MetaManager.ts`:

```typescript
elemental_weaver: { type: 'victory', threshold: 3, description: 'Win 3 runs' },
forest_stalker: { type: 'hero_used', heroId: 'beast_warden', threshold: 3, description: 'Use beast_warden in 3 runs' },
magma_warden: { type: 'boss_kill', bossId: 'thunder_titan', description: 'Defeat Thunder Titan' },
storm_falcon: { type: 'element_wins', element: 'lightning', threshold: 5, description: 'Win 5 runs with lightning heroes' },
```

- [ ] **Step 2: Add Act 4 node template to `MapGenerator.ts`**

Find `ACT_NODE_TEMPLATES` in `src/systems/MapGenerator.ts` (currently 3 arrays of 8 nodes). Add a 4th array with 10 nodes for Act 4:

```typescript
['battle', 'battle', 'shop', 'gauntlet', 'event', 'elite', 'battle', 'event', 'rest', 'boss'],
```

- [ ] **Step 3: Add i18n strings for Act 4 content**

In `src/i18n.ts`, add Chinese strings for:
- Boss phase announcements (add to `battle` section):
  ```typescript
  bossPhase: (n: number) => `阶段 ${n}！`,
  bossShield: '护盾激活！',
  bossEnrage: '狂暴化！',
  bossDamageReduction: '防御强化！',
  ```
- Hero display names (add to `heroNames` if such a section exists, or verify `getHeroDisplayName()` falls back to data name)
- Act 4 name is in `acts.json` data, no i18n needed for act names

- [ ] **Step 4: Run type check**

Run: `npx tsc --noEmit`
Expected: zero errors

- [ ] **Step 5: Commit**

```bash
git add src/managers/MetaManager.ts src/systems/MapGenerator.ts src/i18n.ts
git commit -m "feat(act4): add hero unlocks, Act 4 map template, and i18n strings"
```

---

### Task 9: Add Pixel Templates for New Units

**Files:**
- Modify: `src/data/pixel-templates.ts`

- [ ] **Step 1: Add ChibiConfig entries**

The `getOrCreateTexture()` function in `UnitRenderer.ts` builds a `ChibiConfig` from the unit's `role`, `race`, `classType`, `fillColor`, `borderColor`, `isHero`, `isBoss`. The pixel templates already have body/head/weapon templates for all existing role/race/class combinations. Since the new heroes and enemies use existing roles (support, melee_dps, tank, ranged_dps), races (dragon, beast), and classes (mage, assassin, warrior, ranger), **no new template grids are needed**.

However, each unit needs appropriate fill/border colors. Add color constants for the new units. Find the section where hero/enemy colors are defined (likely in `UnitRenderer.ts` or `Unit.ts` where `buildChibiConfig()` constructs the config from the unit's element/team). Verify that the existing color selection logic handles:
- Heroes: fill color by element (fire=red, lightning=blue, null=gray/white)
- Enemies: darker fill colors
- Boss: crown template applied when `isBoss: true`

If colors are derived automatically from element/team, no changes needed. If there's a manual color map, add entries for the new unit IDs.

- [ ] **Step 2: Run type check + test**

Run: `npx tsc --noEmit && npx vitest run`
Expected: zero errors, all tests pass

- [ ] **Step 3: Commit (if any changes were made)**

```bash
git add src/data/pixel-templates.ts
git commit -m "feat(act4): add pixel template colors for new units"
```

---

### Task 10: Integrate BossPhaseSystem into BattleScene

**Files:**
- Modify: `src/scenes/BattleScene.ts`

This is the most complex integration task. BattleScene needs to:
1. Import and create BossPhaseSystem for boss battles
2. Handle `boss:phase` events to spawn adds and apply boss effects
3. Clean up in `shutdown()`

- [ ] **Step 1: Add imports**

At the top of `src/scenes/BattleScene.ts`, add:

```typescript
import { BossPhaseSystem } from '../systems/BossPhaseSystem';
import bossPhaseData from '../data/boss-phases.json';
```

- [ ] **Step 2: Add BossPhaseSystem instance field**

Add to the class fields:

```typescript
private bossPhaseSystem: BossPhaseSystem | null = null;
```

- [ ] **Step 3: Create BossPhaseSystem in `create()`**

After the boss Enemy is created in `create()`, add:

```typescript
// Boss phase system (for multi-phase boss fights)
const bossEnemy = this.allUnits.find(u => u instanceof Enemy && (u as Enemy).isBoss) as Enemy | undefined;
if (bossEnemy) {
  const phaseConfig = (bossPhaseData as Record<string, { phases: Array<{ hpPercent: number; spawns: string[]; bossEffect?: { type: string; value: number } }> }>)[bossEnemy.enemyData.id];
  if (phaseConfig) {
    this.bossPhaseSystem = new BossPhaseSystem(bossEnemy, {
      bossId: bossEnemy.enemyData.id,
      phases: phaseConfig.phases as any,
    });
  }
}
```

- [ ] **Step 4: Add `boss:phase` event handler**

In the EventBus listener setup section of `create()`, add:

```typescript
this.onBossPhase = (data) => {
  const enemyData = (enemiesData as EnemyData[]);
  const aliveEnemies = this.allUnits.filter(u => u instanceof Enemy && u.isAlive);

  for (let i = 0; i < data.spawns.length; i++) {
    const spawnData = enemyData.find(e => e.id === data.spawns[i]);
    if (!spawnData) continue;

    const yIndex = aliveEnemies.length + i;
    const x = ENEMY_START_X + 40;
    const y = BATTLE_GROUND_Y + yIndex * UNIT_SPACING_Y;

    const enemy = new Enemy(this, x, y, spawnData);
    this.allUnits.push(enemy);
    this.battleSystem.addUnit(enemy);
  }

  // Apply boss effect
  if (data.effect) {
    const boss = this.allUnits.find(u => u instanceof Enemy && (u as Enemy).isBoss);
    if (boss) {
      // Visual announcement
      this.effects.showSkillName(boss.x, boss.y - 20, UI.battle.bossPhase(data.phaseIndex + 1), 0xffcc00);
    }
  }
};
EventBus.getInstance().on('boss:phase', this.onBossPhase);
```

Also add the field declaration and typed handler:

```typescript
private onBossPhase!: (data: { bossId: string; phaseIndex: number; spawns: string[]; effect?: { type: string; value: number } }) => void;
```

- [ ] **Step 5: Clean up in `shutdown()`**

In the `shutdown()` method, add:

```typescript
if (this.bossPhaseSystem) {
  this.bossPhaseSystem.deactivate();
  this.bossPhaseSystem = null;
}
EventBus.getInstance().off('boss:phase', this.onBossPhase);
```

- [ ] **Step 6: Run type check**

Run: `npx tsc --noEmit`
Expected: zero errors

- [ ] **Step 7: Commit**

```bash
git add src/scenes/BattleScene.ts
git commit -m "feat(act4): integrate BossPhaseSystem into BattleScene"
```

---

### Task 11: Add Act 4 Unlock Gate in MapScene

**Files:**
- Modify: `src/scenes/MapScene.ts`

- [ ] **Step 1: Add Act 4 unlock check**

Find where MapScene determines available acts (likely where it reads `acts.json` and generates the map). Add a gate for act4:

```typescript
// Filter acts — act4 requires shadow_lord defeated
const availableActs = allActs.filter(act => {
  if (act.id === 'act4_forge') {
    return MetaManager.getDefeatedBosses().includes('shadow_lord');
  }
  return true;
});
```

This requires importing `MetaManager` if not already imported. Check the existing MapScene to find the exact integration point.

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: zero errors

- [ ] **Step 3: Commit**

```bash
git add src/scenes/MapScene.ts
git commit -m "feat(act4): add Act 4 unlock gate (requires shadow_lord defeat)"
```

---

## Chunk 4: Tests + Verification

### Task 12: Update Content Integrity Tests

**Files:**
- Modify: `tests/data/content-integrity.test.ts`

- [ ] **Step 1: Update expected content counts**

The existing content integrity tests likely check array lengths or cross-references. Update counts:
- Heroes: 19 → 23
- Enemies: 21 → 28
- Skills: 63 → 82
- Items: 48 → 52
- Events: 34 → 37
- Acts: 3 → 4

If there are explicit count assertions, update them. If tests are dynamic (checking cross-references only), no count changes needed.

- [ ] **Step 2: Verify cross-reference tests pass**

Run: `npx vitest run tests/data/content-integrity.test.ts`
Expected: all tests PASS (new heroes reference new skills which exist, new acts reference new enemies which exist, new skill visuals reference new skills which exist)

- [ ] **Step 3: Commit**

```bash
git add tests/data/content-integrity.test.ts
git commit -m "test(act4): update content integrity test counts"
```

---

### Task 13: Run Full Test Suite + Type Check

**Files:** None (verification only)

- [ ] **Step 1: Full type check**

Run: `npx tsc --noEmit`
Expected: zero errors

- [ ] **Step 2: Full test suite**

Run: `npx vitest run`
Expected: all tests pass (existing 836 + new boss-phase tests)

- [ ] **Step 3: Fix any failures**

If any tests fail, fix the issues and re-run. Common issues:
- Content integrity tests failing on new cross-references
- Missing imports
- Type mismatches in event payloads

- [ ] **Step 4: Final commit + version bump**

Update version in `src/i18n.ts` and `package.json` to `1.11.0`:

```bash
git add -A
git commit -m "feat: bump version to v1.11.0 (Act 4: Elemental Forge)"
git tag v1.11.0
```

---

## Task Dependency Graph

```
Task 1 (skills) ──┐
Task 2 (heroes) ──┤
Task 3 (enemies) ─┤── Task 12 (content tests)
Task 4 (acts+) ───┘         │
                             │
Task 5 (event type) ─── Task 6 (BossPhaseSystem) ─── Task 7 (addUnit) ─── Task 10 (BattleScene)
                                                                                    │
Task 8 (unlocks+i18n+map) ─────────────────────────────────────────────────────────┤
Task 9 (pixel templates) ──────────────────────────────────────────────────────────┤
Task 11 (MapScene gate) ───────────────────────────────────────────────────────────┘
                                                                                    │
                                                                              Task 13 (verify)
```

**Parallelizable tasks:**
- Tasks 1-4 can all run in parallel (independent data files)
- Task 5 must precede Task 6
- Tasks 8, 9, 11 can run in parallel after Task 7
- Task 10 depends on Tasks 5-7
- Task 12 depends on Tasks 1-4
- Task 13 runs last
