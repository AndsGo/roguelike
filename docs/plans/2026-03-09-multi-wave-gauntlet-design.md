# Multi-Wave Gauntlet Node Design

> 日期: 2026-03-09
> 状态: 已批准
> 目标: 添加连战节点类型，2-3波敌人无缝连续战斗，提升治疗/坦克价值

## 概述

新增 "gauntlet" 地图节点类型。2-3波敌人在同一场战斗中无缝衔接——无场景切换、无波间治疗。英雄保留HP、冷却、状态效果和站位。奖励按波数缩放（约2.5倍）。

## 数据模型

NodeType 新增 `'gauntlet'`：
```typescript
export type NodeType = 'battle' | 'elite' | 'boss' | 'shop' | 'event' | 'rest' | 'gauntlet';
```

BattleNodeData 扩展：
```typescript
export interface BattleNodeData {
  enemies: { id: string; level: number }[];
  waves?: { id: string; level: number }[][];  // 第2波+，第1波 = enemies
}
```

向后兼容：`waves` 不存在时为单波战斗。

## 地图生成

- 每幕1-2个连战节点，放置在中间层（非首尾）
- 2-3波（种子随机）
- 第1波：2-3个普通敌人
- 第2波+：每波+1敌人，等级略高
- 地图颜色：紫色/品红，标签"连战"

## 战斗流程

```
BattleScene.create() → 检测连战 → 存储波次数据
  → 第1波（正常战斗）
    → 敌人全灭 → checkBattleEnd()
      → 还有波次: spawnNextWave()
        → "Wave N/Total" 文字覆盖（2秒）
        → 新敌人从右侧滑入
        → 重置一次性遗物标志（phoenix_ash）
        → 保留英雄HP/冷却/站位/状态/大招能量
        → 战斗继续
      → 最终波: 正常胜利流程
```

## 系统重置规则

| 系统 | 重置？ | 原因 |
|------|--------|------|
| 英雄HP | 保留 | 耐力挑战 |
| 技能冷却 | 保留 | 连续性 |
| 状态效果 | 保留 | 自然消退 |
| 大招能量 | 保留 | 跨波积累 |
| 连击计数 | 重置 | 新敌人，新连击 |
| 仇恨表 | 重置 | 新敌人无仇恨历史 |
| 目标缓存 | 重置 | 旧目标已死亡 |
| 凤凰灰烬 | 重置 | 每波一次复活合理 |
| 遗物监听器 | 保留 | 已订阅英雄事件 |

## 奖励

- 金币：`normalGold × waveCount × 0.8`
- 经验：`normalExp × waveCount × 0.8`
- 最终波胜利后一次性结算

## 节点提示

NodeTooltip: "连战 · 3波"

## 存档兼容

- NodeType 新增 'gauntlet'，旧存档不受影响
- BattleNodeData.waves 可选，现有节点不变

## 设计原则

1. **无缝衔接** — 波间无场景切换，保持战斗节奏
2. **耐力考验** — 不治疗、不回满，坦克/治疗价值凸显
3. **向后兼容** — 可选字段，旧存档安全
4. **YAGNI** — 不添加波间商店、不添加波间选择、不添加特殊波次奖励
