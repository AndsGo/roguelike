# Phase 3: 深度提升 设计规格 (v1.14.0)

> **目标:** 增加决策密度——选人界面展示羁绊预览帮助队伍构建决策，地图增加随机变体（捷径+隐藏节点）提供路径选择。
>
> **范围:** HeroDraftScene 羁绊栏 + MapGenerator 随机变体 + MapScene 渲染/交互。不涉及新战斗系统或新内容数据。
>
> **前置:** v1.13.0 Phase 2b 内容补充已完成

---

## 1. 选人界面羁绊预览

### 现状

HeroDraftScene 仅显示英雄卡片网格，玩家凭记忆判断羁绊搭配。ShopScene 已有 `buildSynergyBar()` 方法计算种族/职业/元素计数并显示激活/进度标签，使用 `UI.shop.synergyActive()` 和 `UI.shop.synergyProgress()` 格式化。

### 方案

在 HeroDraftScene 英雄卡片下方添加实时羁绊预览栏，复用 ShopScene 的羁绊计算逻辑。

### 代码变更

#### 1.1 提取共享羁绊工具函数

新建 `src/utils/synergy-helpers.ts`，从 ShopScene 的 `buildSynergyBar()` 中提取核心逻辑：

```typescript
import heroesData from '../data/heroes.json';
import { SYNERGY_DEFINITIONS } from '../config/synergies';
import { UI } from '../i18n';

// HeroData 类型匹配 heroes.json 的实际结构
const heroes = heroesData as { id: string; race: string; class: string; element?: string | null }[];

export interface SynergyTag {
  name: string;
  count: number;
  threshold: number;
  active: boolean;
}

/**
 * 根据英雄 ID 列表计算当前激活/接近的羁绊标签。
 * 接受 string[] 而非 HeroState[]，便于 HeroDraftScene（仅有 ID）和 ShopScene（需 .map(h => h.id)）共用。
 */
export function calculateSynergyTags(heroIds: string[]): SynergyTag[] {
  const selected = heroes.filter(h => heroIds.includes(h.id));

  const raceCounts = new Map<string, number>();
  const classCounts = new Map<string, number>();
  const elementCounts = new Map<string, number>();

  for (const hero of selected) {
    raceCounts.set(hero.race, (raceCounts.get(hero.race) ?? 0) + 1);
    classCounts.set(hero.class, (classCounts.get(hero.class) ?? 0) + 1);
    if (hero.element) {
      elementCounts.set(hero.element, (elementCounts.get(hero.element) ?? 0) + 1);
    }
  }

  const tags: SynergyTag[] = [];

  for (const syn of SYNERGY_DEFINITIONS) {
    let count = 0;
    if (syn.type === 'race') count = raceCounts.get(syn.key) ?? 0;
    else if (syn.type === 'class') count = classCounts.get(syn.key) ?? 0;
    else if (syn.type === 'element') count = elementCounts.get(syn.key) ?? 0;

    if (count === 0) continue;

    const thresholds = syn.thresholds.map(t => t.count).sort((a, b) => a - b);
    const nextThreshold = thresholds.find(t => t > count) ?? thresholds[thresholds.length - 1];
    const activeThreshold = thresholds.filter(t => count >= t).pop();

    tags.push({
      name: syn.name,
      count,
      threshold: activeThreshold ?? nextThreshold,
      active: activeThreshold !== undefined,
    });
  }

  return tags;
}

/**
 * 使用现有 i18n 格式化函数输出羁绊标签文本。
 * 复用 UI.shop.synergyActive / synergyProgress 以保持与 ShopScene 显示一致。
 */
export function formatSynergyTags(tags: SynergyTag[]): string {
  if (tags.length === 0) return '';
  return tags.map(t =>
    t.active
      ? UI.shop.synergyActive(t.name, t.count, t.threshold)
      : UI.shop.synergyProgress(t.name, t.count, t.threshold)
  ).join('  ');
}
```

注意：
- `element` 字段使用 `string | null | undefined` 兼容 `heroes.json` 实际数据（有些英雄 `element: null`，TypeScript 推断为 `string | null`）
- ShopScene 调用时需 `.map(h => h.id)` 将 `HeroState[]` 转为 `string[]`

#### 1.2 HeroDraftScene 变更

在 `HeroDraftScene.ts` 中：

- 添加 `private synergyText!: Phaser.GameObjects.Text` 成员
- 在 `create()` 中，英雄网格下方、底部面板上方添加羁绊文本：
  - 位置: `(GAME_WIDTH / 2, bottomY - 28)` 相对于底部面板定位
  - 初始文本: `UI.draft.synergyPlaceholder`（灰色）
  - 样式: `fontSize: '9px', color: '#666666', fontFamily: 'monospace'`
- 在 `updateSelectionUI()` 方法末尾调用 `this.updateSynergyPreview()`（保持单一更新入口）
- 新增 `updateSynergyPreview()` 方法：
  ```typescript
  private updateSynergyPreview(): void {
    if (this.selectedIds.length === 0) {
      this.synergyText.setText(UI.draft.synergyPlaceholder);
      this.synergyText.setColor('#666666');
      return;
    }
    const tags = calculateSynergyTags(this.selectedIds);
    const text = formatSynergyTags(tags);
    this.synergyText.setText(text || UI.draft.noSynergy);
    this.synergyText.setColor('#ccaa44');
  }
  ```

#### 1.3 ShopScene 重构

修改 `ShopScene.ts` 的 `buildSynergyBar()` 方法：
- 导入 `calculateSynergyTags` 和 `formatSynergyTags`
- 将内联的种族/职业/元素计数逻辑替换为 `calculateSynergyTags(heroes.map(h => h.id))`
- 使用 `formatSynergyTags(tags)` 生成文本
- 行为和显示不变，仅代码重构

### i18n 变更

在 `src/i18n.ts` 中添加到 `draft:` 部分（如不存在 `draft:` 则新建于 `heroDraft:` 或相关位置）：

```typescript
  synergyPlaceholder: '选择英雄查看羁绊',
  noSynergy: '无羁绊',
```

---

## 2. 地图随机变体

### 现状

MapGenerator 使用固定层模板 `ACT_NODE_TEMPLATES` 生成地图。每层 1-3 个节点，层间连接 1-2 个下层节点。地图结构确定（同种子同结果），无捷径或隐藏节点。

### 方案

在正常地图生成后，以概率添加两种变体：

1. **捷径 (Shortcut)** — 15%/幕概率，额外连接跳过 1 层，免费通过
2. **隐藏节点 (Hidden Node)** — 10%/幕概率，花费 30 金币揭示的额外事件/商店节点

### 新常量

`src/config/balance.ts` 新增：

```typescript
export const MAP_SHORTCUT_CHANCE = 0.15;
export const MAP_HIDDEN_NODE_CHANCE = 0.10;
export const MAP_HIDDEN_NODE_COST = 30;
```

`src/constants.ts` 中导出这 3 个常量。

### 类型变更

`src/types/index.ts` 中 `MapNode` 接口新增可选字段：

```typescript
interface MapNode {
  // ...existing fields...
  hidden?: boolean;              // true = 未揭示，需花费金币
  revealCost?: number;           // 揭示费用（默认 MAP_HIDDEN_NODE_COST）
  shortcutConnections?: number[]; // 捷径目标节点索引（跳过1层的连接）
}
```

`shortcutConnections` 与 `connections` 分开存储。`connections` 保持仅存正常连接。这解决了 BFS 层分配问题——`MapRenderer.buildLayers()` 仅遍历 `connections`，不受捷径影响。MapScene 渲染时合并两者绘制，但用不同样式。

### 层计算工具函数

新建 `src/utils/map-utils.ts`，从 `MapRenderer.buildLayers()` 提取纯数据层计算：

```typescript
import { MapNode } from '../types';

/**
 * 通过 BFS 计算每个节点所在层的索引。
 * 纯函数，不依赖 UI，可在 MapGenerator 和 MapRenderer 中使用。
 */
export function computeNodeLayers(nodes: MapNode[]): Map<number, number> {
  const layerMap = new Map<number, number>(); // nodeIndex → layerIndex
  if (nodes.length === 0) return layerMap;

  layerMap.set(0, 0);
  const queue = [0];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentLayer = layerMap.get(current)!;

    for (const nextIdx of nodes[current].connections) {
      if (!layerMap.has(nextIdx)) {
        layerMap.set(nextIdx, currentLayer + 1);
        queue.push(nextIdx);
      }
    }
  }

  return layerMap;
}

/**
 * 根据 layerMap 构建层→节点索引映射（反向查找）。
 */
export function buildLayerGroups(layerMap: Map<number, number>): Map<number, number[]> {
  const groups = new Map<number, number[]>();
  for (const [nodeIdx, layerIdx] of layerMap) {
    if (!groups.has(layerIdx)) groups.set(layerIdx, []);
    groups.get(layerIdx)!.push(nodeIdx);
  }
  return groups;
}
```

`MapRenderer.buildLayers()` 重构为使用 `computeNodeLayers()` + `buildLayerGroups()`（行为不变，仅提取）。

### MapGenerator 变更

在 `generate()` 方法返回前，插入变体生成步骤。变体修改的是已生成的节点数组，结果保存到 map 数据中（随 RunManager 序列化持久化）：

```typescript
// 正常生成后
const nodes = this.generateBaseMap(rng, floor);

// 变体生成（修改 nodes[]）
this.addShortcuts(nodes, rng);
this.addHiddenNodes(nodes, rng);

return nodes;
```

#### 2.1 捷径生成 `addShortcuts()`

```
对每个幕的节点范围：
  if rng.next() >= MAP_SHORTCUT_CHANCE: continue

  使用 computeNodeLayers() 获取层结构
  使用 buildLayerGroups() 获取层→节点映射
  找出该幕的最大层号 maxLayer

  选择一个有效源层 sourceLayer:
    - 不是首层 (layer 0)
    - 不是 maxLayer-1 或 maxLayer (保证 +2 不超出幕范围或跳过 Boss)
    - sourceLayer + 2 <= maxLayer - 1 (不能跳到 Boss 层)
  如果无有效源层: continue

  从 sourceLayer 随机选一个节点 sourceNode
  从 sourceLayer + 2 随机选一个节点 targetNode

  初始化 sourceNode.shortcutConnections ??= []
  将 targetNode.index 添加到 sourceNode.shortcutConnections[]
```

约束：
- 每幕最多 1 条捷径
- 不能从首层出发
- 不能跳到或跳过 Boss 层
- 存储在 `shortcutConnections`（不影响 BFS 层分配）
- 该方法是确定性的（依赖 SeededRNG）

#### 2.2 隐藏节点生成 `addHiddenNodes()`

```
对每个幕的节点范围：
  if rng.next() >= MAP_HIDDEN_NODE_CHANCE: continue

  使用 computeNodeLayers() 获取层结构
  使用 buildLayerGroups() 获取层→节点映射
  找出该幕的最大层号 maxLayer

  选择一个有效父层 parentLayer:
    - 不是首层 (layer 0)
    - 不是 maxLayer (Boss 层)
    - 不是 maxLayer - 1 (Boss 前一层，因为隐藏节点需要有前向连接)
  如果无有效父层: continue

  从 parentLayer 随机选一个节点 parentNode
  创建新 MapNode:
    index = nodes.length (追加)
    type = rng.next() < 0.5 ? 'event' : 'shop'
    hidden = true
    revealCost = MAP_HIDDEN_NODE_COST
    connections = [...parentNode.connections] (拷贝而非引用，继承前向连接)
    completed = false
    data = type === 'event' ? generateEventData(rng, act) : undefined

  将新节点追加到 nodes[]
  将新节点 index 添加到 parentNode.connections[]
```

约束：
- 每幕最多 1 个隐藏节点
- 隐藏节点类型限定为 `event` 或 `shop`
- 隐藏节点是旁路分支（peer detour），不是强制路径点——玩家可以走原路不经过它
- 拷贝父节点的前向连接（不会形成死路）
- 排除首层、Boss 层、Boss 前一层作为父节点
- 需要生成 eventData（如果是 event 类型）

### MapScene 渲染变更

#### 2.3 捷径连线渲染

在 `create()` 的连线绘制代码块中（约 line 100-125），现有循环遍历 `node.connections` 绘制连线。新增第二轮遍历 `node.shortcutConnections`：

```typescript
// 现有连线绘制循环后，追加：
for (const node of map) {
  if (!node.shortcutConnections?.length) continue;
  for (const targetIdx of node.shortcutConnections) {
    // 使用虚线样式绘制（青色, 半透明）
    drawDashedLine(graphics, sourcePos, targetPos, 0x44dddd, 0.6);
  }
}
```

- 捷径线使用虚线样式（`lineStyle(1.5, 0x44dddd, 0.6)` 青色）
- 虚线通过分段绘制实现（每 6px 画 4px 空 2px）
- 普通 `connections` 线保持现有样式不变
- 捷径目标节点的可达性通过检查 source 节点已完成 + `shortcutConnections.includes(targetIdx)` 判断

#### 2.4 节点可达性扩展

修改 `isNodeAccessible()` 或其等效逻辑，将 `shortcutConnections` 纳入可达性判断：

```typescript
// 一个节点可达 = 某个已完成节点的 connections 或 shortcutConnections 包含它
const isAccessible = completedNodes.some(n =>
  n.connections.includes(nodeIdx) ||
  (n.shortcutConnections ?? []).includes(nodeIdx)
);
```

#### 2.5 隐藏节点渲染

- `hidden === true` 且未揭示时：
  - 节点颜色使用半透明灰色 `(0x888888, 0.4)`
  - 标签显示 `"?"` 而非类型图标
  - 从父节点到隐藏节点的连接线使用虚线灰色
  - 节点下方显示金币费用文本 `UI.map.hiddenCost(revealCost)` (小字, 金色)
  - 不显示 NodeTooltip（内容未知）

- 点击隐藏节点时：
  - 检查 `rm.getGold() >= node.revealCost`
  - 金币不足：显示浮动提示 `UI.map.hiddenNoGold`
  - 金币充足：`rm.spendGold(revealCost)` → `node.hidden = false` → `SaveManager.autoSave()` → `this.scene.restart()` 重建场景
  - `scene.restart()` 会重新运行 `create()`，此时 `hidden` 已为 `false`，节点正常渲染
  - MapScene 的滚动位置通过 `RunManager` 的当前节点信息间接恢复（场景打开时滚动到当前进度附近）

#### 2.6 隐藏节点可达性

隐藏节点（`hidden === true`）不可进入（点击仅触发揭示流程）。揭示后（`hidden === false`）按正常可达性逻辑判断——如果父节点已完成且 `connections` 包含它，则可进入。

### RunManager / SaveManager 兼容

- `MapNode` 新字段均为可选（`hidden?`, `revealCost?`, `shortcutConnections?`），旧存档无这些字段不会报错
- 揭示隐藏节点时设置 `node.hidden = false`，序列化时保存
- 加载旧存档时 `hidden` 为 `undefined`，等效于 `false`（节点正常显示）
- `shortcutConnections` 为 `undefined` 时等效于空数组（无捷径）
- 变体在 `MapGenerator.generate()` 中生成，结果写入 `nodes[]`，随 map 数据一起序列化。加载时直接读取，不重新生成

### i18n 变更

```typescript
map: {
  // ...existing...
  hiddenNode: '???',
  hiddenCost: (cost: number) => `${cost}G 揭示`,
  hiddenNoGold: '金币不足',
  hiddenRevealed: '发现了隐藏路径！',
},
```

---

## 3. 数据变更汇总

| 文件 | 变更 |
|------|------|
| `src/utils/synergy-helpers.ts` | 新建：提取羁绊计算逻辑 |
| `src/utils/map-utils.ts` | 新建：提取层计算工具函数 |
| `src/scenes/HeroDraftScene.ts` | 添加羁绊预览栏 |
| `src/scenes/ShopScene.ts` | 重构 buildSynergyBar 使用共享工具 |
| `src/systems/MapGenerator.ts` | 添加 addShortcuts() + addHiddenNodes() |
| `src/scenes/MapScene.ts` | 捷径线渲染 + 隐藏节点渲染/交互 + 可达性扩展 |
| `src/ui/MapRenderer.ts` | 重构 buildLayers 使用 computeNodeLayers |
| `src/types/index.ts` | MapNode 新增 hidden?, revealCost?, shortcutConnections? |
| `src/config/balance.ts` | +3 常量 |
| `src/constants.ts` | 导出新常量 |
| `src/i18n.ts` | 新增字符串 |

---

## 4. 测试策略

### 新增测试

- **`tests/utils/synergy-helpers.test.ts`** — 验证 calculateSynergyTags 正确计算种族/职业/元素计数，验证空选择返回空数组，验证 formatSynergyTags 使用 i18n 格式化
- **`tests/utils/map-utils.test.ts`** — 验证 computeNodeLayers BFS 层分配，验证 buildLayerGroups 反向映射
- **`tests/systems/map-variants.test.ts`** — 验证 addShortcuts 生成 shortcutConnections 条目、addHiddenNodes 生成 hidden=true 节点、概率控制（种子确定性）、约束条件（不跳/跳过 Boss 层、不从首层出发、隐藏节点排除 Boss 前一层）
- **`tests/scenes/hero-draft-synergy.test.ts`** — 验证选择英雄后羁绊栏更新、无选择时显示占位文本

### 现有测试兼容

- MapGenerator 现有测试应继续通过（变体是追加步骤，不改变基础生成逻辑）
- ShopScene 测试应继续通过（buildSynergyBar 行为不变，仅重构）
- MapRenderer 测试（如有）应继续通过（buildLayers 行为不变，仅提取）
