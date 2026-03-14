# Phase 2b: 内容补充 设计规格 (v1.13.0)

> **目标:** 填补评估报告中的内容缺口——增加 3 名英雄（支援职能+冰元素覆盖）、12 个新事件（Acts 1-3）、3 个 Boss 阶段机制、休息节点多选项改造。
>
> **范围:** 数据扩展 + RestScene 重写 + Boss 阶段配置。不涉及新系统架构，复用现有 BossPhaseSystem、EventSystem、RunManager。
>
> **前置:** v1.12.1 Phase 2a 数值平衡补丁已完成

---

## 1. 三名新英雄

### 1.1 霜语者 (frost_whisperer) — 冰元素防御型辅助

| 字段 | 值 |
|------|-----|
| id | frost_whisperer |
| name | 霜语者 |
| role | support |
| element | ice |
| race | elf |
| class | cleric |

**baseStats:**

| maxHp | hp | attack | defense | magicPower | magicResist | speed | attackSpeed | attackRange | critChance | critDamage |
|-------|-----|--------|---------|------------|-------------|-------|-------------|-------------|------------|------------|
| 520 | 520 | 25 | 20 | 60 | 28 | 60 | 0.85 | 280 | 0.08 | 1.5 |

**scalingPerLevel:** maxHp: 32, attack: 2, defense: 2, magicPower: 5, magicResist: 2

**设计思路:** 比 elemental_weaver（550HP, 65MP）略低 HP/MP，但更高防御（20 vs 18）和魔抗（28 vs 25），体现防御型辅助定位。冰元素使其成为冰羁绊的可靠触发者（冰英雄 2→4）。

**技能 (2 regular + 1 ultimate):**

**frost_shield** (霜盾):
```json
{
  "id": "frost_shield",
  "name": "霜盾",
  "description": "为目标施加冰霜护盾，降低受到的伤害",
  "damageType": "magical",
  "scalingStat": "magicPower",
  "scalingRatio": -0.6,
  "targetType": "ally",
  "cooldown": 8,
  "baseDamage": -40,
  "range": 300,
  "element": "ice",
  "statusEffect": "buff",
  "effectDuration": 5
}
```
注：负伤害 = 治疗。buff 状态效果表示防御增益。

**glacial_pulse** (冰川脉冲):
```json
{
  "id": "glacial_pulse",
  "name": "冰川脉冲",
  "description": "释放冰川能量，对所有敌人造成冰属性伤害并减速",
  "damageType": "magical",
  "scalingStat": "magicPower",
  "scalingRatio": 0.7,
  "targetType": "all_enemies",
  "cooldown": 10,
  "baseDamage": 25,
  "range": 300,
  "element": "ice",
  "statusEffect": "slow",
  "effectDuration": 3
}
```

**ult_frozen_sanctuary** (冰封圣域):
```json
{
  "id": "ult_frozen_sanctuary",
  "name": "冰封圣域",
  "description": "召唤冰封圣域，大幅治疗全体友军",
  "damageType": "magical",
  "scalingStat": "magicPower",
  "scalingRatio": -1.2,
  "targetType": "all_allies",
  "cooldown": 0,
  "baseDamage": -60,
  "range": 999,
  "element": "ice",
  "isUltimate": true
}
```

**skill-visuals:**
```json
"frost_shield": { "type": "aoe_ally", "color": "0x88ccff" },
"glacial_pulse": { "type": "aoe_enemy", "color": "0x66aaff" },
"ult_frozen_sanctuary": { "type": "aoe_ally", "color": "0xaaddff" }
```

**解锁条件:** `{ type: "element_wins", threshold: 3, element: "ice", description: "使用冰属性英雄获胜3次" }`

---

### 1.2 圣光使者 (holy_emissary) — 圣元素攻击型辅助

| 字段 | 值 |
|------|-----|
| id | holy_emissary |
| name | 圣光使者 |
| role | support |
| element | holy |
| race | human |
| class | paladin |

**baseStats:**

| maxHp | hp | attack | defense | magicPower | magicResist | speed | attackSpeed | attackRange | critChance | critDamage |
|-------|-----|--------|---------|------------|-------------|-------|-------------|-------------|------------|------------|
| 580 | 580 | 35 | 22 | 55 | 30 | 65 | 0.9 | 250 | 0.1 | 1.6 |

**scalingPerLevel:** maxHp: 38, attack: 3, defense: 2, magicPower: 4, magicResist: 2

**设计思路:** 比 frost_whisperer 更高 HP（580 vs 520）和攻击（35 vs 25），但较低 magicPower（55 vs 60），体现攻击型辅助定位。圣骑士职业使圣骑士羁绊（knight + dragon_knight + holy_emissary）可触发。

**技能:**

**holy_blessing** (圣光祝福):
```json
{
  "id": "holy_blessing",
  "name": "圣光祝福",
  "description": "为目标施加圣光祝福，提升攻击力",
  "damageType": "magical",
  "scalingStat": "magicPower",
  "scalingRatio": -0.5,
  "targetType": "ally",
  "cooldown": 9,
  "baseDamage": -30,
  "range": 280,
  "element": "holy",
  "statusEffect": "buff",
  "effectDuration": 6
}
```

**radiant_burst** (光辉爆发):
```json
{
  "id": "radiant_burst",
  "name": "光辉爆发",
  "description": "释放圣光能量，对所有敌人造成圣属性伤害",
  "damageType": "magical",
  "scalingStat": "magicPower",
  "scalingRatio": 0.8,
  "targetType": "all_enemies",
  "cooldown": 10,
  "baseDamage": 30,
  "range": 300,
  "element": "holy"
}
```

**ult_divine_empowerment** (神圣赋能):
```json
{
  "id": "ult_divine_empowerment",
  "name": "神圣赋能",
  "description": "神圣之力赋予全体友军，大幅提升攻击力和攻击速度",
  "damageType": "magical",
  "scalingStat": "magicPower",
  "scalingRatio": -0.8,
  "targetType": "all_allies",
  "cooldown": 0,
  "baseDamage": -40,
  "range": 999,
  "element": "holy",
  "isUltimate": true,
  "statusEffect": "buff",
  "effectDuration": 8
}
```

**skill-visuals:**
```json
"holy_blessing": { "type": "aoe_ally", "color": "0xffd700" },
"radiant_burst": { "type": "aoe_enemy", "color": "0xffee44" },
"ult_divine_empowerment": { "type": "aoe_ally", "color": "0xffdd88" }
```

**解锁条件:** `{ type: "hero_used", heroId: "knight", description: "使用骑士获胜一次" }`

---

### 1.3 冰龙猎手 (ice_dragon_hunter) — 冰元素物理远程 DPS

| 字段 | 值 |
|------|-----|
| id | ice_dragon_hunter |
| name | 冰龙猎手 |
| role | ranged_dps |
| element | ice |
| race | dragon |
| class | ranger |

**baseStats:**

| maxHp | hp | attack | defense | magicPower | magicResist | speed | attackSpeed | attackRange | critChance | critDamage |
|-------|-----|--------|---------|------------|-------------|-------|-------------|-------------|------------|------------|
| 480 | 480 | 62 | 14 | 20 | 15 | 75 | 1.2 | 350 | 0.15 | 1.8 |

**scalingPerLevel:** maxHp: 30, attack: 8, defense: 1, magicPower: 1, magicResist: 1

**设计思路:** 物理攻击型远程（attack 62），高攻速（1.2）和射程（350），低防御/魔抗。龙族+冰元素的独特组合使其同时贡献龙族羁绊和冰元素羁绊。与 frost_ranger（精灵/游侠/attack 60）的区分：冰龙猎手更偏纯物理输出+冰属性标记，且 dragon_ice_breath 虽为 magical damageType 但使用 attack 作为 scalingStat（跨类型 scaling，适配其高物攻低魔攻属性面板）。

**技能:**

**frost_arrow** (霜冻箭):
```json
{
  "id": "frost_arrow",
  "name": "霜冻箭",
  "description": "射出冰冻箭矢，造成物理伤害并减速目标",
  "damageType": "physical",
  "scalingStat": "attack",
  "scalingRatio": 1.1,
  "targetType": "enemy",
  "cooldown": 6,
  "baseDamage": 40,
  "range": 350,
  "element": "ice",
  "statusEffect": "slow",
  "effectDuration": 2
}
```

**dragon_ice_breath** (龙息寒流):
```json
{
  "id": "dragon_ice_breath",
  "name": "龙息寒流",
  "description": "喷射冰属性龙息，对所有敌人造成伤害",
  "damageType": "magical",
  "scalingStat": "attack",
  "scalingRatio": 0.6,
  "targetType": "all_enemies",
  "cooldown": 12,
  "baseDamage": 35,
  "range": 250,
  "element": "ice"
}
```

**ult_glacial_barrage** (冰川弹幕):
```json
{
  "id": "ult_glacial_barrage",
  "name": "冰川弹幕",
  "description": "释放连续冰箭弹幕，对单体造成大量物理伤害",
  "damageType": "physical",
  "scalingStat": "attack",
  "scalingRatio": 2.0,
  "targetType": "enemy",
  "cooldown": 0,
  "baseDamage": 80,
  "range": 350,
  "element": "ice",
  "isUltimate": true
}
```

**skill-visuals:**
```json
"frost_arrow": { "type": "projectile", "color": "0x88ccff" },
"dragon_ice_breath": { "type": "aoe_enemy", "color": "0x66bbff" },
"ult_glacial_barrage": { "type": "projectile", "color": "0xaaeeff", "count": 3 }
```

**解锁条件:** `{ type: "boss_kill", threshold: 1, bossId: "frost_queen", description: "击败冰霜女王" }`

---

### 羁绊影响汇总

| 羁绊 | 变化 | 触发变化 |
|------|------|----------|
| 冰元素 | 2→4 | 从"几乎不可能"变为"常见" |
| 圣元素 | 3→4 | 更容易触发 |
| 龙族 | 4→5 | 更容易触发 |
| 精灵 | 5→6 | 更容易触发 |
| 人类 | 7→8 | 无实质变化 |
| 圣骑士职业 | 2→3 | 新增触发可能 |
| 牧师职业 | 3→4 | 更容易触发 |
| 游侠职业 | 4→5 | 更容易触发 |

---

## 2. 十二个新事件

每幕新增 4 个事件，遵循现有 EventData 接口：`{ id, title, description, choices: [{ text, outcomes: [{ probability, description, effects }] }] }`。

### Act 1 — 森林 (4 events)

**event_fairy_circle** (精灵之环):
- 选择 1: 进入精灵之环祈祷 → 60% 全队回复 15% HP / 40% 被精灵迷惑，随机英雄损失 10% HP
- 选择 2: 绕路离开 → 获得 20 金币

**event_wounded_traveler** (受伤的旅人):
- 选择 1: 花费 30 金币治疗旅人 → 70% 旅人赠送稀有装备 / 30% 旅人感谢并离开（无额外收益）
- 选择 2: 搜刮旅人 → 获得 40 金币，随机英雄 -3 全属性（内疚 debuff，使用 `stat_boost: -3`）
- 选择 3: 无视继续前进 → 无效果

**event_ancient_tree** (远古之树):
- 选择 1: 触摸古树 → 50% 全队获得 +3 防御 / 50% 全队 -3 速度（树根纠缠）
- 选择 2: 采集树果 → 全队回复 10% HP

**event_lost_ranger** (迷路的游侠):
- 选择 1: 指引方向 → 获得 25 金币 + 少量经验
- 选择 2: 赠送补给 → 花费 20 金币，70% 游侠报恩赠送 1 件装备 / 30% 游侠感谢后离开

### Act 2 — 火山 (4 events)

**event_lava_pool** (熔岩池):
- 选择 1: 在熔岩池淬炼武器 → 60% 随机英雄 +5 攻击 / 40% 随机英雄损失 15% HP（烫伤）
- 选择 2: 安全通过 → 无效果

**event_fire_spirit** (火焰精灵):
- 选择 1: 花费 40 金币请求祝福 → 随机英雄获得火属性技能增强（+8 magicPower stat_boost）
- 选择 2: 挑战精灵 → 70% 获得遗物 / 30% 全队受到 20% HP 伤害

**event_dwarven_forge** (矮人锻炉):
- 选择 1: 花费 60 金币升级装备 → 获得 1 件稀有以上装备
- 选择 2: 学习锻造技术 → 全队 +2 防御

**event_volcanic_vent** (火山通风口):
- 选择 1: 冒险穿越 → 50% 发现宝藏获得 80 金币 / 50% 全队受到 10% HP 伤害
- 选择 2: 绕路而行 → 安全但无收益

### Act 3 — 深渊 (4 events)

**event_shadow_altar** (暗影祭坛):
- 选择 1: 献祭 HP（全队 -20% HP） → 获得 1 件史诗遗物
- 选择 2: 破坏祭坛 → 获得 50 金币
- 选择 3: 无视离开 → 无效果

**event_lost_soul** (迷失的灵魂):
- 选择 1: 净化灵魂 → 全队回复 25% HP + 获得 40 金币
- 选择 2: 吸收灵魂之力 → 随机英雄 +10 magicPower（`stat_boost: 10`），但全队 -15% HP
- 选择 3: 放过灵魂 → 获得 20 金币

**event_abyssal_merchant** (深渊商人):
- 选择 1: 花费 80 金币购买深渊宝物 → 获得 1 件传说装备
- 选择 2: 交易灵魂碎片 → 随机英雄 -10% maxHP，获得 1 件史诗遗物
- 选择 3: 谢绝离开 → 无效果

**event_dark_ritual** (黑暗仪式):
- 选择 1: 打断仪式 → 70% 获得 60 金币 / 30% 触发暗属性陷阱，全队受到 15% HP 伤害
- 选择 2: 观察仪式 → 随机英雄 +5 magicPower
- 选择 3: 参与仪式 → 50% 随机英雄 +15 magicPower / 50% 随机英雄 -10 attack

### 事件设计原则

- 每个事件 2-3 个选择，至少一个安全选项
- 概率性结果的概率之和 = 1.0
- Effect types 使用现有类型: `gold`, `heal`, `damage`, `stat_boost`, `item`, `relic`
- 高幕高风险：Act 1 损失上限 10-15% HP，Act 3 可达 20% HP + 属性损失
- 不使用 `recruit` effect（避免打破队伍平衡设计）

---

## 3. Boss 阶段机制

### 数据格式

遵循现有 `src/data/boss-phases.json` 格式：

```json
{
  "bossId": {
    "phases": [
      {
        "hpPercent": 0.75,
        "spawns": ["enemy_id_1", "enemy_id_2"],
        "bossEffect": { "type": "enrage|shield|damage_reduction", "value": number }
      }
    ]
  }
}
```

`BossPhaseSystem` 监听 `unit:damage` 事件，在 Boss HP 跨越阈值时触发阶段效果。spawns 中的敌人 ID 必须存在于 `enemies.json` 中。

### 3.1 frost_queen (冰霜女王) — Act 1, 2 阶段

简单 2 阶段，无小怪召唤，教会新玩家"Boss 会在低血量时变强"。

```json
"frost_queen": {
  "phases": [
    {
      "hpPercent": 0.50,
      "spawns": [],
      "bossEffect": { "type": "enrage", "value": 30 }
    },
    {
      "hpPercent": 0.25,
      "spawns": [],
      "bossEffect": { "type": "shield", "value": 500 }
    }
  ]
}
```

- **50% HP:** 暴怒 — 攻击力 +30%
- **25% HP:** 冰甲护盾 — 获得 500 点护盾

### 3.2 thunder_titan (雷霆泰坦) — Act 2, 3 阶段

完整 3 阶段，中期难度。

```json
"thunder_titan": {
  "phases": [
    {
      "hpPercent": 0.75,
      "spawns": [],
      "bossEffect": { "type": "enrage", "value": 20 }
    },
    {
      "hpPercent": 0.50,
      "spawns": ["storm_hawk", "storm_hawk"],
      "bossEffect": { "type": "damage_reduction", "value": 15 }
    },
    {
      "hpPercent": 0.25,
      "spawns": [],
      "bossEffect": { "type": "enrage", "value": 40 }
    }
  ]
}
```

- **75% HP:** 蓄力 — 攻击力 +20%
- **50% HP:** 召唤 2 只 storm_hawk + 减伤 15%
- **25% HP:** 雷霆之怒 — 攻击力再 +40%（总计 +60%）

### 3.3 shadow_lord (暗影领主) — Act 3, 3 阶段

最高难度阶段。

```json
"shadow_lord": {
  "phases": [
    {
      "hpPercent": 0.75,
      "spawns": [],
      "bossEffect": { "type": "damage_reduction", "value": 20 }
    },
    {
      "hpPercent": 0.50,
      "spawns": ["skeleton_archer", "skeleton_archer"],
      "bossEffect": { "type": "enrage", "value": 25 }
    },
    {
      "hpPercent": 0.25,
      "spawns": ["dark_mage"],
      "bossEffect": { "type": "enrage", "value": 35 }
    }
  ]
}
```

- **75% HP:** 暗影斗篷 — 减伤 20%
- **50% HP:** 召唤 2 skeleton_archer + 攻击力 +25%
- **25% HP:** 召唤 dark_mage + 攻击力再 +35%（总计 +60%）

---

## 4. 休息节点多选项改造

### 现状

RestScene 仅提供"休息"按钮，恢复 30% maxHP（`REST_HEAL_PERCENT = 0.3`）。

### 改造方案

提供 3 个互斥选项，玩家选择其一：

**A) 休息 (Rest)** — 全队回复 30% maxHP
- 使用现有 `rm.healAllHeroes(REST_HEAL_PERCENT)`
- 最安全的选择

**B) 训练 (Train)** — 全队每人获得固定经验值
- 经验值 = `REST_TRAIN_EXP`（新常量，建议 120）
- 使用现有 `rm.addExp(hero, amount)` 逐个调用
- 适合 HP 健康时选择

**C) 搜索 (Scavenge)** — 获得随机金币
- 金币范围 = `REST_SCAVENGE_GOLD_MIN` ~ `REST_SCAVENGE_GOLD_MAX`（建议 40-60）
- 使用 `rm.getRng().nextInt(min, max)` 生成金额
- 使用现有 `rm.addGold(amount)`
- 适合商店前选择

### UI 变更

将单按钮替换为 3 张选项卡：

```
┌─────────────────────────────────────────────────┐
│              🔥 篝火营地 🔥                      │
│          在篝火旁稍作休息...                      │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ 休息      │  │ 训练      │  │ 搜索      │       │
│  │ 回复30%HP │  │ 全队+EXP  │  │ 获得金币   │       │
│  └──────────┘  └──────────┘  └──────────┘       │
│                                                  │
│        [队伍状态: 英雄HP列表]                      │
└─────────────────────────────────────────────────┘
```

- 3 个 Button 实例横向排列（间距约 160px）
- 每个按钮下方有简短描述文本
- 点击后执行效果 → 显示结果页（与现有 showHealedStatus 模式类似）
- 结果页展示效果详情 + 继续按钮

### 代码变更

- **`src/config/balance.ts`:** 新增 `REST_TRAIN_EXP = 120`, `REST_SCAVENGE_GOLD_MIN = 40`, `REST_SCAVENGE_GOLD_MAX = 60`
- **`src/constants.ts`:** 导出新常量
- **`src/scenes/RestScene.ts`:** 重写 `create()` 方法，替换单按钮为 3 选项卡；新增 `showTrainResult()` 和 `showScavengeResult()` 方法
- **`src/i18n.ts`:** 新增 `UI.rest.trainBtn`, `UI.rest.scavengeBtn`, `UI.rest.trainResult`, `UI.rest.scavengeResult` 等字符串

### RunManager 变更

需要确认 `addExp()` 是公开方法 — 已确认是 public。不需要新增方法。

---

## 5. 数据变更汇总

| 文件 | 变更 |
|------|------|
| `src/data/heroes.json` | +3 英雄条目 |
| `src/data/skills.json` | +9 技能 (6 regular + 3 ultimates) |
| `src/data/skill-visuals.json` | +9 条目 |
| `src/data/events.json` | +12 事件 |
| `src/data/acts.json` | Acts 1-3 eventPool 添加新事件 ID |
| `src/data/boss-phases.json` | +3 boss 阶段配置 |
| `src/config/balance.ts` | +3 常量 |
| `src/constants.ts` | 导出新常量 |
| `src/scenes/RestScene.ts` | 重写为多选项 |
| `src/i18n.ts` | 新增 UI 字符串 |
| `src/managers/MetaManager.ts` | 3 个新英雄解锁条件 |

---

## 6. 测试策略

### 新增测试

- **`tests/data/phase2b-heroes.test.ts`** — 验证 3 个新英雄存在、属性正确、技能引用有效、解锁条件有效
- **`tests/data/phase2b-events.test.ts`** — 验证 12 个新事件格式正确、概率之和 = 1.0、effect types 有效、acts.json 引用正确
- **`tests/data/phase2b-boss-phases.test.ts`** — 验证 3 个 boss 阶段配置、spawns 引用有效敌人、hpPercent 递减
- **`tests/scenes/RestScene.test.ts`** — 验证 3 个选项按钮存在、各选项效果正确（heal/exp/gold）

### 现有测试更新

- `tests/data/content-integrity.test.ts` — 英雄数量 23→26、技能数量断言、事件数量断言
