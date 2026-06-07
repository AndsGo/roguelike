# 游戏综合分析报告

**日期：** 2026-06-04
**方法：** 5 个专业 agent 并行盲审（内容审计 / 数值平衡 / UX 体验 / 架构 / 玩法设计），随后交叉去重与优先级归并。
**范围：** 纯只读代码分析，未改动任何代码。

---

## 总评分

| 维度 | 评分 | 一句话结论 |
|------|------|-----------|
| 🏗️ 架构 | **8.5/10** | 成熟度很高，EventBus 清理、定步长战斗、typed-array 寻敌都是行家手笔 |
| 🎮 UX 体验 | **7.0/10** | 交互框架扎实，扣分在新手引导、字号、弹窗一致性 |
| 🎲 玩法设计 | **6.5/10** | 系统齐全但策略空间被"队伍规模 vs 协同阈值"错配压扁 |
| 🔍 内容完整性 | **6.0/10** | 数据规范零悬空，但 65% 遗物 + 12 个孤儿内容不可获得 |
| ⚖️ 数值平衡 | **5.0/10** | 难度系统是死代码；连击无上限、协同 stat_boost 平加 bug |
| **综合** | **~6.6/10** | 工程底子优秀，但大量内容/系统"实现了却没生效" |

---

## 核心洞察：「幽灵系统」是头号主题

本次分析最强的信号——**3 个 agent 从完全不同的入口，独立指向同一类根因：代码写好了，但没接线 / 没生效。** 这意味着团队的实际产出远超玩家能体验到的内容，修复"接线"的投入产出比极高。

| 幽灵系统 | 发现者 | 现状 |
|----------|--------|------|
| 难度系统（普通/困难/噩梦/地狱） | 平衡 | `DifficultySystem` 全部方法在 src/ 中从未被调用，四档难度对敌人数值/奖励零影响 |
| 协同 `stat_boost` | 平衡 | 描述"全属性+15%"，实际是平加 +15（对 Boss 几乎无感） |
| 31/48 遗物（含全部 13 个传奇） | 内容 | 无获取途径，纯死内容 |
| `unlockedRelics` 数组 | 内容 | 永不被填充 → `relic_5`/`relic_collector` 两成就**不可能完成** |
| 12 个孤儿内容（3 敌人 + 9 事件） | 内容 | 未进任何 act 池，含唯一招募龙骑士的"龙蛋"事件 |
| `combo_gloves` 等遗物 | 平衡 | 效果未传入 ComboSystem，零效果（never-pick） |
| TutorialSystem | 架构 | reset 后 `initialized` 仍 true，返回主菜单再开局教程永久失效 |

**第二个交叉印证：协同系统遭受复合伤害。** 玩法 agent 发现"开局 3 人 vs 协同阈值 3-4 → 凑不齐"，平衡 agent 独立发现"凑齐了 stat_boost 也只是平加、加成≈0"。两者叠加 = 协同既难触发、触发了也几乎无收益，把理论 3 维构筑空间坍缩成 ~1.5 维。

---

## 优先级修复清单

### P0 — 必修（崩溃风险 / 系统性失效）

| # | 问题 | 文件:行 | 建议修复 | 成本 |
|---|------|---------|----------|------|
| P0-1 | `loadMeta()` 不合并默认值，旧/损坏存档缺字段 → 主菜单崩溃 | `SaveManager.ts:134` | `return { ...defaultMeta(), ...parsed }` | 极低（1 行） |
| P0-2 | 难度系统完全无效（死代码） | `DifficultySystem.ts:57-105`、`MapGenerator.ts:24`、`BattleScene.ts:1071` | 敌人生成后应用 `scaleEnemyStats`；`goldEarned *= goldMultiplier`、exp 同理；按 `enemyCountBonus` 多刷怪 | 中 |
| P0-3 | 65% 遗物不可获得 + `unlockedRelics` 永不填充 | `RunManager.ts:75-82`、`MetaManager.ts:170`、`achievements.json:156` | `addRelic` 同步调 `MetaManager.unlockRelic`；新增遗物奖励节点/战后三选一，按稀有度抽全表 | 中 |
| P0-4 | 队伍规模 vs 协同阈值错配（策略坍缩根因） | `balance.ts:74`、`HeroDraftScene.ts:19`、`synergies.ts` | 开局给 4 人 + 把"事件招募至 5 人"做成核心成长曲线；或让二级协同可叠加、3 档变溢出奖励 | 中 |
| P0-5 | 协同 `stat_boost` 平加而非百分比，与描述不符 | `SynergySystem.ts:114-123`、`Unit.ts:284-288` | 改走百分比管线，或改描述为平加并上调（human 4 人 attack 15→40） | 中 |

### P1 — 强烈建议（数值崩坏 / 内容缺口 / 体验断层）

| # | 问题 | 文件:行 | 建议修复 |
|---|------|---------|----------|
| P1-1 | 连击倍率无上限，与克制/暴击叠乘滚雪球 | `ComboSystem.ts:65` | `Math.min(bonusTiers, 5) * 0.10`（封顶 +50%） |
| P1-2 | Act 难度悬崖：`level × diffMult` 二次复合 | `MapGenerator.ts:190-213`、`acts.json` | level 去掉 `×diffMult`，难度缩放走独立线性系数；Act4 的 2.2→1.6 |
| P1-3 | 12 个孤儿内容（3 敌人 + 9 事件） | `acts.json` 各池 | 补进对应 act 的 enemyPool/eventPool（每个一行引用） |
| P1-4 | ranger/assassin DPS 离群（+50%），ranger 近 must-pick | `heroes.json`、`synergies.ts` | archer/rogue/frost_ranger 普攻 DPS≈195 下调向均值 131 靠拢；削弱 ranger 协同暴伤 +0.5 |
| P1-5 | 元素协同雷同（全是单档 +20%），纯元素碾压 | `synergies.ts:141-190` | 加 count=3/4 差异化档位（冰=减速层 / 雷=连锁数），收敛元素系 relic 叠乘 |
| P1-6 | boss 池太薄（Act2/3/4 各仅 1 个） | `acts.json` | 每幕 ≥2 boss，或把已有 AffixSystem 接入 boss |
| P1-7 | 战斗内无法打开帮助/术语 | `MainMenuScene.ts:131` | Battle/Map 加常驻 [?] 复用 HelpPanel |
| P1-8 | 新手引导仅一次性 8 秒提示，未覆盖核心操作 | `TutorialSystem.ts:31-95` | 关键操作首次高亮分步引导（已有 spotlight 能力未用）；tip 加"重看/关闭" |
| P1-9 | TutorialSystem reset 后永久失效 | `TutorialSystem.ts:113` | 增加 `reset()` 在 `teardownAll` 调用 |
| P1-10 | Boss `shield` 实现错误（+9999 防御而非护盾 HP） | `BattleScene.ts:670-677` | 改为真实护盾 `boss.shieldHp += value` |

### P2 — 打磨项

- 800×450 下 tiny/small 字号 9/10px 偏小 → 提到 11/12px（`TextFactory.ts:7-14`）
- 弹窗三套实现不统一 → 统一走 Panel 模式（backdrop 799 + 点外部关闭 + 一致 alpha）
- 裸 hit zone（暂停/统计/速度）缺拖拽容差 → 统一 pointerup + <20px 判定
- 战斗结算 1.5s 死等、GameOver 信息过载 → 允许点击跳过
- 永久升级纯线性无取舍 → 改为互斥/点数预算的 build path；突变门槛 `MUTATION_GATE=10` 提前
- 战中决策密度低 → 手动大招/道具可主动触发元素反应连锁
- 同 race+role 英雄外观仅靠 fillColor 区分 → 增加 per-unit 配色/配饰
- 事件 outcome 趋同（gold/stat/damage 占主导）→ 增加 recruit/transform/sacrifice 稀有事件
- 补单测：`TargetingSystem`、`DamageAccumulator`、`EventBus`（纯逻辑、零 Phaser 依赖、回归价值高）
- 成就语义：`overkill`(单次) 与 `damage_*`(累计) 区分 stat key；`relic_collector` 文案对齐

---

## 三条战略级建议

1. **先接线，再做新内容。** 本作最高 ROI 的工作不是加东西，而是"激活已有的东西"：难度系统、65% 遗物、12 个孤儿内容、协同百分比——这些都已写好，接线成本远低于新开发，却能成倍放大玩家可体验的内容量。

2. **修复协同的双重失效，重建策略骨架。** 队伍规模错配（P0-4）+ stat_boost 平加（P0-5）+ 元素碾压（P1-5）共同决定了"构筑"是否成立。这三项是把游戏从"自动播放"拉回"策略 roguelike"的关键。

3. **让数值曲线可控。** 激活难度系统（P0-2）后，必须同时拆掉 Act 难度悬崖（P1-2）、给连击封顶（P1-1）、收敛 DPS 离群（P1-4），否则四档难度只会把现有的滚雪球与悬崖一起放大。

---

## 附：内容统计核对

| 内容 | 声称 | 实际可达 | 状态 |
|------|------|----------|------|
| 英雄 | 26 | 26 | ✅ |
| 敌人 | 28 | **25**（3 孤儿） | ⚠️ 图鉴无法 100% |
| 技能 | 93 | 93 | ✅ |
| 道具 | 52 | 52 | ✅ |
| 遗物 | 48 | **17**（31 死内容） | ❌ |
| 事件 | 49 | **40**（9 孤儿） | ⚠️ |
| 成就 | 26 | **24 可达**（2 死成就） | ❌ |
| 幕 | 4 | 4 | ✅ |
