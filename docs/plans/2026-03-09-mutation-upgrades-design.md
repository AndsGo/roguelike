# Mutation Upgrades Design

> 日期: 2026-03-09
> 状态: 已批准
> 目标: 添加8个变异升级——改变游戏规则的永久解锁，作为现有数值升级的第二层级

## 概述

在永久升级面板中新增"变异升级"区域。每个变异为一次性解锁（无等级），改变游戏规则而非单纯数值加成。需购买10级现有升级后解锁。

## 数据模型

MetaProgressionData 扩展：
```typescript
export interface MetaProgressionData {
  // ... existing fields
  mutations: string[];  // 已解锁变异ID列表
}
```

向后兼容：`mutations ?? []`，旧存档不受影响。

## 8个变异

### 开局类（4个）

| ID | 名称 | 费用 | 效果 |
|----|------|------|------|
| `extra_draft_pick` | 额外征召 | 100 | 英雄征召多提供1个选择 |
| `shop_extra_item` | 商人好感 | 120 | 商店多展示1件商品 |
| `start_with_relic` | 遗物直觉 | 150 | 每局开始时获得1个随机普通遗物 |
| `first_event_safe` | 先知之眼 | 80 | 第一个事件节点必定有安全选项 |

### 战斗类（4个）

| ID | 名称 | 费用 | 效果 |
|----|------|------|------|
| `overkill_splash` | 溢杀扩散 | 150 | 击杀时溢出伤害的30%溅射到随机存活敌人 |
| `crit_cooldown` | 暴击加速 | 120 | 暴击时攻击者下一个技能冷却减少1秒 |
| `heal_shield` | 过量护盾 | 100 | 超出最大HP的治疗转化为临时护盾（50%效率） |
| `reaction_chain` | 连锁反应 | 130 | 元素反应有25%概率将触发元素传递给相邻敌人 |

## 解锁机制

- `getTotalUpgradeLevels()` 统计所有现有升级等级之和
- 总等级 >= 10 时，变异区域在升级面板中出现
- 未达标时显示锁定提示："再升级N级解锁变异"

## UI布局

在现有5个数值升级下方，新增分隔区域：

### 未解锁状态：
```
── 变异升级 ──
🔒 再升级N级解锁变异
```

### 已解锁状态：
```
── 变异升级 ──
[溢杀扩散]  150灵魂  [购买]
[暴击加速]  120灵魂  [购买]
...
[✓ 过量护盾] 已解锁
```

已解锁变异显示勾号，无购买按钮。

## 集成点

| 变异 | 集成文件 | 集成方式 |
|------|----------|----------|
| extra_draft_pick | HeroDraftScene | 增加可选英雄数量 |
| shop_extra_item | ShopGenerator | 商品列表多生成1个 |
| start_with_relic | RunManager.startNewRun() | 初始遗物列表加入随机遗物 |
| first_event_safe | EventScene | 首个事件过滤/保证安全选项 |
| overkill_splash | DamageSystem | 击杀后溢出伤害30%溅射 |
| crit_cooldown | SkillSystem | 暴击回调中减少冷却 |
| heal_shield | DamageSystem/healing管线 | 溢出治疗转护盾 |
| reaction_chain | ElementSystem | 反应后25%概率传递元素 |

## MetaManager 新增方法

```typescript
// 变异定义
static MUTATION_DEFS: { id: string; cost: number }[]

// 解锁门槛
static MUTATION_GATE = 10;

// 查询
static getTotalUpgradeLevels(): number
static isMutationUnlocked(id: string): boolean
static hasMutation(id: string): boolean
static getMutations(): string[]

// 购买
static purchaseMutation(id: string): boolean
```

## 设计原则

1. **规则改变** — 每个变异改变玩法机制，不是纯数值
2. **门槛适中** — 10级升级约需8-12局，确保玩家熟悉基础系统
3. **向后兼容** — 可选字段，旧存档安全
4. **YAGNI** — 不添加变异等级、不添加变异组合效果、不添加变异重置
