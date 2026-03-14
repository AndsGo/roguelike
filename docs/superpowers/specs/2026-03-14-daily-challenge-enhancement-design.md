# 每日挑战体验优化 设计规格

> **目标:** 让每日挑战与普通游戏有明显的可感知差异——规则可见、视觉区分、规则多样化、分数有对比意义。
>
> **范围:** 4 个特性：规则预览面板、扩展规则池（3→7）、游戏内视觉指示、模拟排行榜。
>
> **前置:** v1.15.0 Phase 4 完成。每日挑战基础功能已实现（DailyChallengeManager、BattleScene 规则应用、BaseEndScene 计分）。

---

## 1. 规则预览面板

### 现状

点击"每日挑战"按钮后直接跳转 HeroDraftScene，玩家不知道当天有什么规则。

### 方案

在 MainMenuScene 中，点击"每日挑战"后弹出模态面板，展示当天的挑战标题、难度、规则列表。确认后进入 HeroDraftScene。

### UI 设计

```
┌─────────────────────────────────┐
│       每日挑战 - 烈焰试炼        │
│                                  │
│  难度: 噩梦                      │
│                                  │
│  📋 今日规则:                     │
│  🔥 火属性敌人攻击 +20%          │
│  💰 金币收益 ×0.7               │
│                                  │
│     [ 开始挑战 ]  [ 返回 ]       │
└─────────────────────────────────┘
```

- 面板: 320×220, 居中, 使用现有 modal panel 模式（backdrop d799 + panel d800 + buttons d801）
- 标题: 显示 `DailyModifiers.title`（如"烈焰试炼"）
- 难度: 从 modifiers.difficulty 获取，使用 `UI.difficulty` 格式化
- 规则: 遍历 `modifiers.rules`，每条规则显示图标 + 中文描述
- "开始挑战"按钮: 调用现有 `startDailyChallenge()` 流程进入 HeroDraftScene
- "返回"按钮: 关闭面板

### 代码变更

**`src/scenes/MainMenuScene.ts`:**

修改每日挑战按钮的点击处理：
- 原: 点击直接调用 `startDailyChallenge()`
- 新: 点击调用 `showDailyChallengePreview()`
- `showDailyChallengePreview()` 方法:
  1. 获取 seed 和 modifiers: `getTodaysSeed()` + `getDailyModifiers(seed)`
  2. 创建 backdrop + panel
  3. 显示标题、难度、规则列表
  4. "开始挑战"按钮 → 调用 `startDailyChallenge()` 并关闭面板
  5. "返回"按钮 → 销毁面板和 backdrop

**规则描述格式化：** 新增 `formatDailyRule(rule)` 函数（在 DailyChallengeManager 或 i18n 中），将规则对象转为中文描述：

```typescript
function formatDailyRule(rule: DailyRule): { icon: string; text: string } {
  switch (rule.type) {
    case 'enemy_element': return { icon: '⚔', text: `${getElementName(rule.element)}属性敌人攻击 +20%` };
    case 'gold_modifier': return { icon: '💰', text: `金币收益 ×${rule.value}` };
    case 'hp_modifier': return { icon: '❤', text: `英雄最大HP ×${rule.value}` };
    case 'double_crit': return { icon: '💥', text: '所有单位暴击伤害 ×2' };
    case 'gold_rush': return { icon: '🏆', text: '金币 ×2，敌人HP +30%' };
    case 'element_chaos': return { icon: '🌀', text: '英雄元素随机化' };
    case 'speed_frenzy': return { icon: '⚡', text: '所有单位攻速 +30%' };
    case 'hero_restriction': return { icon: '🚫', text: `禁用${rule.value ?? ''}职业英雄` };
    default: return { icon: '•', text: rule.type };
  }
}
```

### i18n 变更

```typescript
daily: {
  // ...existing...
  previewTitle: '每日挑战',
  difficulty: (name: string) => `难度: ${name}`,
  rulesLabel: '今日规则:',
  startBtn: '开始挑战',
  backBtn: '返回',
},
```

---

## 2. 扩展规则池

### 现状

`getDailyModifiers()` 仅有 3 种规则类型：`enemy_element`、`gold_modifier`、`hp_modifier`。每日 1-2 条规则。

### 方案

新增 4 种有趣的规则类型，总计 7 种。丰富每日体验。

### 新规则类型

| 规则 ID | 中文名 | 效果 | 应用位置 |
|---------|--------|------|----------|
| `double_crit` | 暴击狂潮 | 所有单位（英雄+敌人）暴击伤害 ×2 | BattleScene.create() 修改 currentStats.critDamage |
| `gold_rush` | 黄金狂热 | 金币收益 ×2，但敌人最大 HP +30% | BattleScene: 金币在 handleBattleEnd, HP 在 create() |
| `element_chaos` | 元素混沌 | 每场战斗开始时英雄元素随机重新分配 | BattleScene.create() 修改 hero.element |
| `speed_frenzy` | 极速风暴 | 所有单位攻击速度 +30% | BattleScene.create() 修改 currentStats.attackSpeed |

### DailyChallengeManager 变更

**`src/managers/DailyChallengeManager.ts`:**

修改 `getDailyModifiers()` 中的规则生成逻辑：

```typescript
// 现有 3 种规则
const allRuleTypes = [
  'enemy_element', 'gold_modifier', 'hp_modifier',
  'double_crit', 'gold_rush', 'element_chaos', 'speed_frenzy',
];

// 互斥规则: gold_rush 和 gold_modifier 不能同时出现（都影响金币）
// 生成时: 如果已选中 gold_rush，从候选池中移除 gold_modifier，反之亦然
// 从打乱的 allRuleTypes 中取 ruleCount 条
// 每种规则的生成逻辑:
```

各规则生成逻辑：

- `double_crit`: `{ type: 'double_crit' }`（无额外参数）
- `gold_rush`: `{ type: 'gold_rush' }`（固定 ×2 金币 + 30% HP）
- `element_chaos`: `{ type: 'element_chaos' }`（无额外参数）
- `speed_frenzy`: `{ type: 'speed_frenzy' }`（固定 +30%）

### BattleScene 变更

**`src/scenes/BattleScene.ts`:**

在 `create()` 的现有规则应用区域（约 line 221-244），扩展处理新规则类型：

```typescript
// 现有: hp_modifier, enemy_element 处理
// 新增:
for (const rule of rules) {
  switch (rule.type) {
    case 'double_crit':
      // 所有单位暴击伤害 ×2
      for (const unit of [...heroes, ...enemies]) {
        unit.currentStats.critDamage *= 2;
      }
      break;
    case 'gold_rush':
      // 敌人 HP +30%
      for (const enemy of enemies) {
        enemy.currentStats.maxHp = Math.round(enemy.currentStats.maxHp * 1.3);
        enemy.currentHp = Math.round(enemy.currentHp * 1.3);
      }
      break;
    case 'element_chaos':
      // 英雄元素随机化（每场战斗/每波重新随机）
      // 使用战斗种子而非全局 rng，确保 gauntlet 每波不同但可复现
      const elements: ElementType[] = ['fire', 'ice', 'lightning', 'dark', 'holy'];
      for (const hero of heroes) {
        hero.element = rng.pick(elements);
      }
      break;
    case 'speed_frenzy':
      // 所有单位攻速 +30%
      for (const unit of [...heroes, ...enemies]) {
        unit.currentStats.attackSpeed *= 1.3;
      }
      break;
  }
}
```

`gold_rush` 的金币 ×2 处理放在 `handleBattleEnd()` 中，与现有 `gold_modifier` 逻辑合并：

```typescript
if (rule.type === 'gold_rush') {
  goldEarned = Math.round(goldEarned * 2);
}
```

### 类型变更

`src/managers/DailyChallengeManager.ts` — `DailyRule` 接口定义在此文件中（非 `src/types/index.ts`）。扩展 `type` 字段的 union type 以包含新规则：

```typescript
// DailyChallengeManager.ts 中 DailyRule 接口
type DailyRuleType = 'enemy_element' | 'gold_modifier' | 'hp_modifier' | 'hero_restriction'
  | 'double_crit' | 'gold_rush' | 'element_chaos' | 'speed_frenzy';
```

注：保留现有的 `hero_restriction` 类型以保持向后兼容。

---

## 3. 游戏内视觉指示

### 现状

进入每日挑战后，地图和战斗画面与普通游戏完全相同，无法区分。

### 方案

**MapScene 规则横幅** + **BattleScene 金色边框**。

### MapScene 规则横幅

在 MapScene 的 header 区域（act label 下方），当 `RunState.isDaily` 时显示金色规则横幅：

- 位置: `(GAME_WIDTH/2, 38)` 全宽金色半透明条
- 内容: `"每日挑战: ⚔火属性+20%  💰×0.7"` 紧凑规则摘要
- 背景: `fillStyle(0xccaa00, 0.15)` 金色半透明
- 文字: `fontSize: '9px', color: '#ccaa44'`
- 仅当 `rm.getState().isDaily` 为 true 时显示

**代码变更 `src/scenes/MapScene.ts`:**

在 `create()` 中 header 绘制后添加：

```typescript
const runState = rm.getState();
if (runState.isDaily && runState.dailyModifiers) {
  const rules = runState.dailyModifiers.rules;
  const ruleText = rules.map(r => formatDailyRuleShort(r)).join('  ');

  const bannerBg = this.add.graphics();
  bannerBg.fillStyle(0xccaa00, 0.15);
  bannerBg.fillRoundedRect(10, 30, GAME_WIDTH - 20, 18, 4);

  TextFactory.create(this, GAME_WIDTH / 2, 39, `每日挑战: ${ruleText}`, 'small', { color: '#ccaa44' })
    .setOrigin(0.5);
}
```

`formatDailyRuleShort(rule)` 返回紧凑格式（如 "⚔火+20%", "💰×0.7"），与预览面板的 `formatDailyRule` 共用但更短。

### BattleScene 金色边框

在 `BattleScene.create()` 中，当 `isDaily` 时绘制 2px 金色边框：

```typescript
if (runState.isDaily) {
  const border = this.add.graphics();
  border.lineStyle(2, 0xccaa44, 0.6);
  border.strokeRect(1, 1, GAME_WIDTH - 2, GAME_HEIGHT - 2);
  border.setDepth(100); // 高于战斗元素，低于 HUD
}
```

---

## 4. 模拟排行榜

### 现状

每日挑战结束只显示分数和个人最高分，无对比参照。

### 方案

从每日种子确定性生成 5 个"幽灵分数"，将玩家分数插入排名。所有同一天的玩家看到相同的幽灵分数。

### 幽灵分数生成

```typescript
// DailyChallengeManager 新增静态方法
static generateGhostScores(seed: number): { name: string; score: number }[] {
  const rng = new SeededRNG(seed + 99999); // 偏移避免与游戏种子碰撞

  const namePool = ['影行者', '剑圣', '魔导师', '守护者', '猎手',
                     '审判者', '风行者', '炼金师', '驭龙者', '星术士',
                     '铁壁', '暗刃', '圣盾', '雷鸣', '冰心',
                     '烈焰使', '月光', '战鬼', '灵铸', '破晓'];

  const names = rng.pickN(namePool, 5);
  const scores = names.map(name => ({
    name,
    score: rng.nextInt(200, 1200),
  }));

  return scores.sort((a, b) => b.score - a.score);
}
```

### 结算画面显示

**`src/scenes/BaseEndScene.ts`** — 在 `settleDailyChallenge()` 中，计算分数后生成排行榜：

```typescript
// 在现有分数显示后添加:
const ghosts = DailyChallengeManager.generateGhostScores(seed);
const playerEntry = { name: '你', score: totalScore, isPlayer: true };
const ghostEntries = ghosts.map(g => ({ ...g, isPlayer: false }));

// 合并并排序
const leaderboard = [...ghostEntries, playerEntry].sort((a, b) => b.score - a.score);
const playerRank = leaderboard.findIndex(e => e.isPlayer) + 1;

// 渲染排行榜面板
let rankY = startY;
for (const [i, entry] of leaderboard.entries()) {
  const color = entry.isPlayer ? '#ffdd44' : '#aaaacc';
  const prefix = entry.isPlayer ? '→ ' : '  ';
  const suffix = entry.isPlayer ? ' ←' : '';
  const text = `${prefix}${i + 1}. ${entry.name}  ${entry.score}${suffix}`;

  TextFactory.create(scene, GAME_WIDTH / 2, rankY, text, 'label', { color }).setOrigin(0.5);
  rankY += 18;
}
```

- 排行榜显示在现有 "每日挑战完成!" 横幅下方
- 玩家行用金色高亮 + 箭头标记
- 幽灵名使用灰色

### i18n 变更

```typescript
daily: {
  // ...existing...
  leaderboardTitle: '每日排行',
  yourRank: (rank: number, total: number) => `排名: 第${rank}名 / ${total}人`,
},
```

---

## 5. 数据变更汇总

| 文件 | 变更 |
|------|------|
| `src/scenes/MainMenuScene.ts` | 新增 showDailyChallengePreview() 模态面板 |
| `src/managers/DailyChallengeManager.ts` | 扩展规则池 3→7，新增 formatDailyRule()，新增 generateGhostScores() |
| `src/scenes/BattleScene.ts` | 新增 4 种规则的 create() 应用 + gold_rush handleBattleEnd 处理 + 金色边框 |
| `src/scenes/MapScene.ts` | 每日挑战规则横幅 |
| `src/scenes/BaseEndScene.ts` | 模拟排行榜显示 |
| `src/managers/DailyChallengeManager.ts` | DailyRuleType 扩展 + formatDailyRule + generateGhostScores |
| `src/i18n.ts` | 每日挑战预览/排行相关字符串 |

---

## 6. 测试策略

### 新增测试

- **`tests/managers/daily-challenge-enhanced.test.ts`**:
  - 验证 7 种规则类型都能生成（遍历种子）
  - 验证 formatDailyRule 输出正确格式
  - 验证 generateGhostScores 确定性（同种子同分数）
  - 验证 ghost 分数在合理范围 (200-1200)
  - 验证玩家分数正确插入排名

### 现有测试

- `tests/managers/DailyChallengeManager.test.ts` — 现有 15 个测试应继续通过（新规则是追加，不改变现有规则逻辑）
