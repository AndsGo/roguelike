# 游戏综合评估报告 — Roguelike Auto-Battler

**日期:** 2026-06-07
**方法:** 5 个并行只读分析 agent（内容/平衡/UX/架构/玩法），按 P0→P1→P2 去重归并。
**范围:** 玩法循环、战斗系统、平衡性、UI/UX、视觉表现、内容广度、技术质量。

## 总评分

| 维度 | 评分 | 一句话结论 |
|------|------|-----------|
| 内容完整性 (Content Integrity) | **8.0 / 10** | 所有硬引用零悬空，问题是语义/孤儿内容 |
| 平衡 & 经济 (Balance & Economy) | **6.0 / 10** | 伤害公式稳健，但一个 P0 死代码 + 经济虚胖 |
| UX / UI | **7.0 / 10** | 核心交互扎实，教程 tips 失效 + 无障碍缺口 |
| 架构 / 性能 / 测试 | **8.0 / 10** | 热路径优化到位，存档健壮，测试覆盖好 |
| 玩法 / 重玩性 / 辨识度 | **6.5 / 10** | 视觉与战斗"汁水"出色，羁绊设计偏浅 |
| **综合** | **≈ 7.1 / 10** | 工程质量与战斗手感强；羁绊/经济系统是短板 |

---

## P0 — 严重（功能性破损，应优先修）

### P0-1 羁绊 `damage_bonus` 完全失效（计算了但从未应用到伤害）
- **位置:** `src/systems/SynergySystem.ts:199-215`、`src/systems/BattleSystem.ts:152-169`、`src/systems/DamageSystem.ts`
- **问题:** `calculateActiveSynergies()` 构建了 `damageBonuses`（龙族 +18% 全伤、法师 3 件 +30%、5 个元素羁绊各 +20%），并暴露 `getSynergyDamageMultiplier()`，但 `applySynergies()` 只消费了 `heroBonuses` / `heroPercentBonuses` / `unlockedSkills`。`getSynergyDamageMultiplier` **零调用方**，`DamageSystem` 从不查询 `SynergySystem`。结果：18 个羁绊里有 7 个（所有伤害型，含龙族/法师两个招牌）**什么都不做**。
- **修复:** 在 `DamageSystem` 中为英雄攻击者乘上 `synergySystem.getSynergyDamageMultiplier(attackerElement)`（像 `comboSystem` 一样注入引用），或在 `BattleSystem` 调 `applyDamage` 前应用全局/元素加成。

### P0-2 元素/遗物教程提示永久失效
- **位置:** `src/systems/TutorialSystem.ts:97-127`、`src/managers/RunManager.ts:49`、`src/systems/GameLifecycle.ts:41`
- **问题:** `TutorialSystem.init()` 在其中注册 `element:reaction` 与 `relic:acquire` 监听，但 `init()` 被 `initialized` 守卫只调用一次；而每次 `newRun()` 都会 `GameLifecycle.teardownAll()` → `EventBus.reset()` 清掉这些监听——且发生在玩家触发反应/拾取遗物之前。`first_element` / `first_relic` 两个提示永远不会显示。
- **修复:** 在每次 `EventBus.reset()` 后重新注册（如 `GameLifecycle.prepareNewRun()` 调一个 `TutorialSystem.registerEventListeners()`）。

---

## P1 — 重要

### P1-1 AffixSystem 注入 buff 后漏 `invalidateStats()`（精英/词缀战正确性 bug）
- **位置:** `src/systems/AffixSystem.ts:105, 126, 196`（`injectBuff` / `vengeful` / `berserker_rage`）
- **问题:** 直接 `statusEffects.push({type:'buff',...})` 但不调 `invalidateStats()`；若该敌人的 `getEffectiveStats` 缓存已热，词缀加成要等到无关状态变化才生效。
- **修复:** 三处 push 后各加 `enemy.invalidateStats()`。

### P1-2 经济常量被绕过 + 利息机制形同虚设
- **位置:** `src/config/balance.ts:39-48`、`src/systems/BattleSystem.ts:482-483`、`src/scenes/RestScene.ts:125`
- **问题:** 真实战斗金币 = `Σ enemy.goldReward`（普通战 ~30-36g），是文档 `NORMAL_BATTLE_GOLD 12-18` 的约两倍；那几个常量只在离线模拟器里用。利息 `min(floor(gold/10),5)` 只在休息节点结算，每幕仅 ~5-10g，存钱毫无意义。
- **修复:** 删除死常量或让金币奖励走它们；利息 cap 提到 ~15-25 并每节点结算，或直接移除。

### P1-3 连击倍率无上限
- **位置:** `src/systems/ComboSystem.ts:60-66`
- **问题:** `1.0 + floor(count/5)×0.10` 无 cap，与暴击/元素/遗物乘性叠加；打 boss（单体不断连）会失控（50 连 = +100%）。
- **修复:** `Math.min(floor(count/5)*0.10, 0.5)`（封顶 +50%）。

### P1-4 元素羁绊数学上近乎不可达 + 全是平铺数值
- **位置:** `src/config/synergies.ts:140-191`
- **问题:** 5 个元素羁绊只有单一阈值 count≥2，每元素仅 4 个英雄，且 6 个英雄 `element:null` 永不贡献。5 人队凑齐 2 同元素多属偶然，回报（+20% 单元素伤害，还没生效见 P0-1）远弱于种族/职业羁绊。
- **修复:** 加第二阈值、给 null 元素英雄可指派元素、或加元素转换遗物。

### P1-5 存在显性强势 build（龙族 / 人类 / 暴击叠加）
- **位置:** `src/config/synergies.ts:8-18, 64-72, 119-128`
- **问题:** 龙族 2 件即 +18% 全伤（最强且易达）；精灵+刺客+游侠+meta+突变把暴击多重叠加成退化最优解；多个羁绊是无机制的平铺数值（人类"全属性"、战士"+200HP"）。
- **修复:** 龙族移到阈值 3 或改条件；把平铺数值羁绊改成机制（战士=嘲讽/护盾、圣骑=团队分摊伤害）。

### P1-6 ShopScene 英雄选择按钮命中区偏移 ~42px
- **位置:** `src/scenes/ShopScene.ts:65-85`
- **问题:** 背景以左上原点绘制，但 `setSize+setInteractive` 把原点设成 0.5（即文档里的 "Container origin gotcha"），命中区落在 `[-42.5,+42.5]` 而像素在 `[0,85]`。
- **修复:** 显式传 `Rectangle(0,-10,85,22)` 命中区（同 Button/Panel）。

### P1-7 缺少"减少动效 / 跳过动画"选项
- **位置:** `src/scenes/SettingsScene.ts:82-104`、违反 `.claude/rules/ui-code.md`
- **问题:** 暴击慢动作、屏幕震动、全屏闪光始终开启，无开关，对光敏/晕动玩家不友好，且与项目自身 UI 规则冲突。
- **修复:** 无障碍设置加"减少动效"开关，门控 shake/flash/slow-mo。

### P1-8 成就条件语义错位
- **位置:** `src/data/achievements.json:84-91, 155-163`、`AchievementManager.ts`
- **问题:** `overkill`（描述"单次 500+ 伤害"）实际查累计 `totalDamage`，首战即触发；`relic_5`（描述"单次冒险收集 5 遗物"）实际查跨周目 `unlockedRelics.length`，与 `relic_collector` 同指标。
- **修复:** 加 `maxSingleHit` / 每周目遗物计数，或改文案。

---

## P2 — 打磨

- **9 个事件成为孤儿**：`dragon_egg`/`blood_pact`/`dark_bargain` 等未进任何幕的 `eventPool`，含唯一的招募/献祭事件（`acts.json` vs `events.json`）。
- **弹窗背景透明度不一致**（0.3–0.95），削弱模态一致性。
- **9px/10px 中文字体在 800×450 下接近不可读**，且无文字缩放选项（152 处）。
- **战斗循环每帧分配数组** `[...heroes,...enemies]`（`BattleSystem.ts:230`）+ `tickAttack` 重复调 `getEffectiveStats`。
- **存档版本迁移只是 no-op 日志**（`SaveManager.ts:57-60`），schema 一变就会静默损坏存档。
- **遗物失衡**：`infinity_stone`(+10% 全属性) 一骑绝尘，`glass_cannon` 是陷阱选项。
- **羁绊效果系统浅**：仅 4 种效果类型，`skill_unlock` 几乎没用；demon"契约"描述有代价但实现纯收益。
- **顶端内容薄**：2/3/4 幕各只有 1 个 boss，各幕结构雷同（仅敌池+难度系数不同）。
- **DamageSystem 静态单例耦合**（RelicSystem/AffixSystem/MetaManager/...），难以隔离测试。
- `achievements.json` 无对应 `src/types` 接口；部分遗物描述超出 `effect` 实际编码。

---

## 亮点（值得保留）

- **视觉辨识度** 是全场最强：16×20 分层像素模板（角色按 role 轮廓 / race 头部 / class 武器 / element 配色四维区分）+ 53 张作者绘制 5 态 spritesheet。
- **战斗"汁水"丰富**：元素克制、4 种元素反应（融化/超载/超导/湮灭）、连击、暴击、26 个终极技 + 技能进化分支、反应链遗物。
- **工程质量高**：TargetingSystem 用 typed-array + 500ms 缓存做 O(n) 评分；Unit 脏标记 stats 缓存；存档 checksum + RNG 状态可复现；EventBus 监听清理纪律好；零 skipped 测试。
- **元进度钩子多样**：21/26 英雄按多类条件解锁，5 永久升级 + 8 条改规则的突变 + 图鉴 + 4 档难度。

---

## 测试与构建现状

- `npm test` — **1160 passing**（92 文件）
- `npx tsc --noEmit` — clean

## 建议修复顺序

1. **P0-1 羁绊伤害加成接线**（影响最大，~1/3 羁绊复活）
2. **P0-2 教程监听重注册**
3. **P1-1 AffixSystem invalidateStats**（正确性）
4. **P1-3 连击封顶** + **P1-2 经济常量/利息**（平衡）
5. **P1-6 ShopScene 命中区** + **P1-8 成就语义**（低风险数据/小改）
6. **P1-4/P1-5 羁绊重设计**（设计向，需更多决策）
