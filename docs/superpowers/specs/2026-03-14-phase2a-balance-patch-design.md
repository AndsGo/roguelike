# Phase 2a: 数值平衡补丁 设计规格 (v1.12.1)

> **目标:** 修复评估报告中 7 项 P1 级平衡/内容问题，提升元素系统价值、坦克可用性、Act1 战斗体验、战士终极竞争力、元素遗物多样性。
>
> **范围:** 数据/配置修改 + 中等代码逻辑扩展。Items 1-4 是纯数据改动；Items 5-7 需要新增代码逻辑（counter_aura 状态效果、元素遗物副效果处理、SkillSystem 扩展）。
>
> **前置:** v1.12.0 Phase 1 紧急修复已完成

---

## 1. 元素克制倍率提升 (P1-1)

**问题:** 元素克制仅 1.2x/0.85x，对战斗结果影响微乎其微，元素选择不构成策略维度。

**改动:**

| 参数 | 旧值 | 新值 | 文件 |
|------|------|------|------|
| ELEMENT_ADVANTAGE_MULTIPLIER | 1.2 | 1.35 | `src/config/elements.ts` |
| ELEMENT_DISADVANTAGE_MULTIPLIER | 0.85 | 0.7 | `src/config/elements.ts` |

**影响:** 元素优势从 +20% 变为 +35%，劣势从 -15% 变为 -30%。玩家组队时需要更认真考虑元素搭配。

**注意:** `ElementSystem.getElementMultiplier()` 的 JSDoc 注释需要同步更新（当前写死了旧数值）。

---

## 2. 元素羁绊加成提升 (P1-2)

**问题:** 元素羁绊 +15% 元素伤害，弱于龙族羁绊 +25% 全伤害，且元素英雄更稀缺。

**改动:**

| 参数 | 旧值 | 新值 | 文件 |
|------|------|------|------|
| 5 个元素羁绊的 bonus 值 | 0.15 | 0.20 | `src/config/synergies.ts` |

适用于: fire, ice, lightning, dark, holy 五个元素羁绊定义。

**注意:** 羁绊描述字符串也需要从 "+15%" 更新为 "+20%"。

---

## 3. 坦克防御成长提升 (P1-8)

**问题:** 20 级时 DPS 英雄输出是坦克的 3.8x，防御成长 (3-7/级) 无法匹配攻击成长 (6-12/级)。

**改动:**

| 英雄 | 字段 | 旧值 | 新值 | 文件 |
|------|------|------|------|------|
| warrior | scalingPerLevel.defense | 6 | 7 | `src/data/heroes.json` |
| knight | scalingPerLevel.defense | 7 | 8 | `src/data/heroes.json` |

仅调整两个纯坦克英雄。beast_warden (6) 和 magma_warden (3.5) 保持不变——beast_warden 偏辅助坦克，magma_warden 通过速度 buff (见下) 获得补偿。

---

## 4. 岩浆守护者速度提升 (P1-9)

**问题:** magma_warden 速度 30，全游戏最慢（骑士 70），同 HP/防御但速度仅 43%，被骑士严格支配。

**改动:**

| 英雄 | 字段 | 旧值 | 新值 | 文件 |
|------|------|------|------|------|
| magma_warden | baseStats.speed | 30 | 50 | `src/data/heroes.json` |

速度 50 仍为坦克中最慢（warrior 80, knight 70, beast_warden 85），但差距缩小到可接受范围，不再被严格支配。

---

## 5. Act 1 敌人技能 (P1-10)

**问题:** Act 1 的 slime、goblin、fire_lizard 技能数组为空，战斗退化为自动攻击对撞。ice_wolf 和 light_sprite 已有技能。

**设计原则:** 风味 + 轻策略。数值偏低 (0.8x-1.2x scaling)，不改变 Act 1 难度曲线，但引入 debuff/控制/元素等核心概念。

### 5.1 acid_spit (酸液喷射) — slime

遵循 `SkillData` 接口格式（`scalingStat` 非 scalingType，`targetType: "enemy"` 非 enemy_single，必须包含 `baseDamage`）：

```json
{
  "id": "acid_spit",
  "name": "酸液喷射",
  "description": "喷射酸液，造成伤害并减速目标",
  "damageType": "physical",
  "scalingStat": "attack",
  "scalingRatio": 0.8,
  "targetType": "enemy",
  "cooldown": 6,
  "baseDamage": 15,
  "range": 150,
  "statusEffect": "slow",
  "effectDuration": 3
}
```

**skill-visuals:** `{ "type": "projectile", "color": "#88cc44" }` (绿色酸液)

### 5.2 goblin_rush (哥布林冲锋) — goblin

```json
{
  "id": "goblin_rush",
  "name": "哥布林冲锋",
  "description": "冲向目标造成伤害并击晕",
  "damageType": "physical",
  "scalingStat": "attack",
  "scalingRatio": 1.2,
  "targetType": "enemy",
  "cooldown": 8,
  "baseDamage": 25,
  "range": 300,
  "statusEffect": "stun",
  "effectDuration": 1
}
```

**注意:** SkillSystem 的 statusEffect 应用是确定性的（无概率支持），因此将 stun 改为 100% 触发、CD 8s 作为平衡手段（而非原设计的 50% 概率）。CD 8s 在 Act 1 的短战斗中意味着哥布林最多施放 1-2 次。

**skill-visuals:** `{ "type": "melee_dash", "color": "#cc8844" }` (棕色冲锋)

### 5.3 lizard_flame (蜥蜴火焰) — fire_lizard

技能 ID 使用 `lizard_flame` 而非 `flame_breath`，避免与龙 boss 的 `fire_breath` 混淆：

```json
{
  "id": "lizard_flame",
  "name": "蜥蜴火焰",
  "description": "喷射火焰，造成魔法伤害",
  "damageType": "magical",
  "scalingStat": "magicPower",
  "scalingRatio": 1.0,
  "targetType": "enemy",
  "cooldown": 7,
  "baseDamage": 30,
  "range": 120,
  "element": "fire"
}
```

**skill-visuals:** `{ "type": "projectile", "color": "#ff6b35" }` (火焰色)

### 数据变更汇总

- `src/data/skills.json`: 添加 3 个技能条目（格式严格遵循 SkillData 接口）
- `src/data/skill-visuals.json`: 添加 3 个视觉条目
- `src/data/enemies.json`: slime 的 skills 改为 `["acid_spit"]`，goblin 改为 `["goblin_rush"]`，fire_lizard 改为 `["lizard_flame"]`

---

## 6. 战士终极技能增强 (P1-11)

**问题:** ult_iron_bastion 仅嘲讽+防御，零攻击价值，被骑士终极（AoE 伤害+群体治疗）完全碾压。

**改动:** 在现有效果（嘲讽全体 + 防御 +80, 8s）基础上新增两个效果。

### 6.1 反击光环 (counter_aura)

- 嘲讽期间受到攻击时，反弹受到伤害的 **15%** 给攻击者
- 实现为新的逻辑，**不通过 statusEffect 数据**，而是在代码中基于技能 ID 硬编码处理

**代码实现方案:**

在 `Unit.takeDamage()` 中添加反击检测。方法签名不变，使用静态重入守卫防止无限循环：

```typescript
// Unit.ts - takeDamage() 中，在扣血之后、die() 之前
private static isCounterDamage = false;

takeDamage(amount: number): number {
  const actual = Math.max(0, Math.round(amount));
  if (actual === 0) return 0;
  this.currentHp = Math.max(0, this.currentHp - actual);

  // Counter aura: reflect 15% damage back to attacker (guard against re-entry)
  if (!Unit.isCounterDamage) {
    const counterEffect = this.statusEffects.find(e => e.name === 'counter_aura');
    if (counterEffect && this.lastAttacker && this.lastAttacker.isAlive) {
      Unit.isCounterDamage = true;
      this.lastAttacker.takeDamage(Math.round(actual * counterEffect.value));
      Unit.isCounterDamage = false;
    }
  }

  // ... rest of existing logic
}
```

需要在 Unit 上追踪 `lastAttacker`——在 DamageSystem.calculateDamage() 中设置 `target.lastAttacker = attacker`。

**类型变更:** `StatusEffectType` 联合类型添加 `'counter_aura'`（`src/types/index.ts`）。

### 6.2 团队护盾

- 施放时对所有己方英雄施加 **50 点护盾**，持续 8s
- **不通过 SkillData 数据驱动**（SkillData 无 all_allies 状态效果分发机制）
- 在 `SkillSystem` 中对 `ult_iron_bastion` 做特殊处理：施放时遍历所有友方英雄，调用 shield 逻辑

**代码实现方案:**

在 `SkillSystem` 的技能施放流程中，对 `ult_iron_bastion` 添加后处理：

```typescript
// SkillSystem - 技能施放后
if (skill.id === 'ult_iron_bastion') {
  // Apply 50 shield to all allied heroes
  const allies = this.heroes.filter(h => h.isAlive);
  for (const ally of allies) {
    ally.addShield(50, 8); // value, duration
  }
}
```

需要确认 `Unit.addShield()` 方法是否存在，或需要新增。

### 数据变更

`src/data/skills.json` 中 ult_iron_bastion 保持现有的 `effects` 数组结构，仅更新描述：

```json
"description": "化身铁壁，嘲讽全体敌人，大幅提升防御，反弹15%伤害，并为全队施加护盾"
```

现有 effects 数组中的 defense_up 和 taunt 效果保持不变。counter_aura 和团队护盾通过代码逻辑实现，不添加到 JSON 数据中。

### 代码变更清单

- `src/types/index.ts`: StatusEffectType 添加 `'counter_aura'`
- `src/entities/Unit.ts`:
  - 添加 `lastAttacker?: Unit` 属性
  - 添加 `static isCounterDamage = false` 重入守卫
  - `takeDamage()` 中添加 counter_aura 反弹逻辑
  - 确认或添加 `addShield(value, duration)` 方法
- `src/systems/DamageSystem.ts`: calculateDamage 中设置 `target.lastAttacker = attacker`
- `src/systems/SkillSystem.ts`: ult_iron_bastion 施放后处理（团队护盾 + counter_aura 状态添加）

---

## 7. 元素遗物差异化 (P1-12)

**问题:** 5 个元素遗物效果完全相同 (+20% 元素伤害)，浪费 5 个遗物位。

**架构说明:** 现有元素遗物的 +20% 伤害加成通过 `RelicSystem.getElementDamageBonus()` + `ELEMENT_RELIC_MAP` 查询路径实现（非 `handleOnDamage`）。副效果将通过 **硬编码 relic ID** 方式实现，与现有 phoenix_ash、overflow_shield、chain_reaction 等遗物的实现模式一致。不添加 `secondaryEffect` 数据字段。

**改动:** 保留 +20% 基础效果（代码路径不变），各增加独特副效果。

### 7.1 fire_emblem — 融化灼烧（反应绑定）

- **绑定反应:** `融化` (fire+ice, damageMultiplier 1.5)
- **副效果:** 融化反应额外施加 3s 灼烧 DoT，每秒造成反应伤害的 15%
- **触发:** `ElementSystem.applyElementReaction()` 中，检测到 `fire+ice` 反应且 `RelicSystem.hasRelic('fire_emblem')` 时
- **实现:** 给目标添加 burn statusEffect: `{ type: 'dot', value: Math.round(reactionDamage * 0.15), duration: 3, tickInterval: 1 }`

### 7.2 ice_crystal_pendant — 超导延长（反应绑定）

- **绑定反应:** `超导` (ice+lightning, damageMultiplier 1.2, 施加 defense_down 5s)
- **副效果:** 超导反应的 defense_down 持续时间 +2s（5s → 7s）
- **触发:** `ElementSystem.applyElementReaction()` 中，检测到 `ice+lightning` 反应且 `RelicSystem.hasRelic('ice_crystal_pendant')` 时
- **实现:** 在施加 defense_down statusEffect 时，将 duration 从 5 增加到 7

**注意:** 原设计提到"冰冻反应"，但实际不存在该反应。ice+lightning 的反应是"超导"，效果是降低防御。副效果改为延长超导的 defense_down 持续时间。

### 7.3 lightning_rod — 超载弹射（反应绑定）

- **绑定反应:** `超载` (fire+lightning, damageMultiplier 1.8)
- **副效果:** 超载反应弹射 1 个额外目标，造成 50% 反应伤害
- **触发:** `ElementSystem.applyElementReaction()` 中，检测到 `fire+lightning` 反应且 `RelicSystem.hasRelic('lightning_rod')` 时
- **实现:** 类似 chain_reaction 的 splash 逻辑，调用 `RelicSystem.getSplashTargets(targetId, 1)` 获取 1 个临近目标，造成 `Math.round(reactionDamage * 0.5)` 伤害

**注意:** 原设计提到"感电反应"，但实际不存在该反应。fire+lightning 的反应是"超载"，已有最高倍率 1.8x，弹射副效果进一步强化其 AoE 特性。

### 7.4 dark_grimoire — 暗属性吸血（通用被动）

- **副效果:** 暗属性英雄攻击时 15% 概率吸血，回复伤害的 20%
- **触发:** `RelicSystem.handleOnDamage()` 中，新增 `dark_grimoire` case
- **条件:** 攻击者元素为 `'dark'`，`this.rng.chance(0.15)` 判定通过
- **实现:** `attacker.heal(Math.round(damage * 0.2))`
- **RNG:** 使用 RelicSystem 现有的 `this.rng` 实例，利用 `handleOnDamage` 已有的 `def.effect.chance ?? 1` 机制。在 relics.json 中设置 `"chance": 0.15`。

### 7.5 holy_scripture — 致命护盾（通用被动）

- **副效果:** 圣属性英雄首次受到致命伤害时获得 15% maxHP 护盾（每场战斗一次）
- **触发:** 使用 phoenix_ash 相同的触发点——`Unit.die()` 中调用 `RelicSystem.shouldRevive()`
- **实现方案:** 在 `RelicSystem` 中扩展死亡检测逻辑：
  1. 新增 `shouldApplyHolyShield(unit)` 方法
  2. 检查：持有 holy_scripture + unit.element === 'holy' + 本场战斗未触发（`holyScriptureUsed` 标记）
  3. 触发时：设置 `unit.currentHp = 1`，调用 `unit.addShield(Math.round(unit.currentStats.maxHp * 0.15), 8)`
  4. 在 `Unit.die()` 中，在 phoenix_ash 检查之后添加 holy_scripture 检查（phoenix_ash 优先级更高——复活30%HP > 1HP+护盾）
- **每场战斗重置:** `RelicSystem.activate()` / `deactivate()` 中重置 `holyScriptureUsed` 标记

**触发优先级:** phoenix_ash 先于 holy_scripture 检查。如果英雄同时持有两者，phoenix_ash 生效（复活到 30% HP），holy_scripture 保留备用。

### 数据变更

`src/data/relics.json` 中 5 个遗物更新描述文本，不添加新的数据字段。副效果全部通过代码硬编码实现：

- fire_emblem: `"description": "火属性伤害+20%，融化反应额外施加灼烧"`
- ice_crystal_pendant: `"description": "冰属性伤害+20%，超导反应持续时间+2秒"`
- lightning_rod: `"description": "雷属性伤害+20%，超载反应弹射1个额外目标"`
- dark_grimoire: `"description": "暗属性伤害+20%，暗属性英雄攻击时15%概率吸血"`, `"chance": 0.15`
- holy_scripture: `"description": "光属性伤害+20%，圣属性英雄免死一次(每场战斗)"`

### 代码变更清单

- `src/systems/ElementSystem.ts`:
  - `applyElementReaction()` 中添加 3 个反应绑定副效果检测（fire_emblem/ice_crystal_pendant/lightning_rod）
  - 通过 `RelicSystem.hasRelic(id)` 查询是否持有对应遗物
- `src/systems/RelicSystem.ts`:
  - 新增 `hasRelic(relicId): boolean` 查询方法
  - `handleOnDamage()` 中添加 `dark_grimoire` 吸血 case
  - 新增 `shouldApplyHolyShield(unit)` 方法 + `holyScriptureUsed` 标记
  - `activate()` / `deactivate()` 中重置标记
- `src/entities/Unit.ts`:
  - `die()` 中在 phoenix_ash 之后添加 holy_scripture 检查

---

## 测试策略

### 新增测试文件

- `tests/data/balance-p1-tweaks.test.ts` — 验证所有数值修改：
  - 元素倍率 1.35/0.7
  - 5 个元素羁绊 bonus 0.20
  - warrior defense scaling 7, knight 8
  - magma_warden speed 50
  - 3 个新敌人技能存在于 skills.json
  - slime/goblin/fire_lizard 的 skills 数组非空
- `tests/systems/counter-aura.test.ts` — 验证反击光环逻辑：
  - 受到攻击时反弹 15% 伤害
  - 反弹伤害不触发二次反弹（重入守卫）
  - 无 counter_aura 状态时不反弹
- `tests/systems/element-relic-effects.test.ts` — 验证 5 个元素遗物副效果：
  - fire_emblem: 融化后目标有 dot 状态
  - ice_crystal_pendant: 超导 defense_down 持续 7s
  - lightning_rod: 超载后弹射 1 个目标
  - dark_grimoire: 暗属性攻击吸血
  - holy_scripture: 致命伤害触发护盾（一次性）

### 现有测试更新

- `tests/data/content-integrity.test.ts` — 技能数量断言更新（+3 敌人技能）
- `tests/systems/DamageSystem.test.ts` — 元素倍率测试期望值更新（1.2→1.35）
- `tests/systems/ElementSystem.test.ts` — 元素倍率相关断言更新

---

## 不包含在此版本的改动

以下归入 Phase 2b (v1.13.0):
- 3 名新英雄
- 12-15 个新事件
- Boss 阶段机制
- 休息节点多选项改造
