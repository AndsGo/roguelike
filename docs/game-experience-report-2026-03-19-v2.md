# Roguelike Auto-Battler 综合体验报告 v2

**日期:** 2026-03-19 (第二轮评估)
**评估版本:** v1.18.0 (commit f701340)
**评估方式:** 5 名 AI 专项体验师并行代码分析

---

## 综合评分

| 维度 | 评分 | 变化 (vs v1) | 评估者 |
|------|------|-------------|--------|
| 内容完整性 | **85/100** | -4 (发现新问题) | 内容审计师 |
| 战斗平衡 | **3.2/5** | 持平 | 平衡分析师 |
| UX 体验 | **3.8/5** | 持平 | UX 分析师 |
| 代码架构 | **3.6/5** | 持平 | 架构审查师 |
| 视觉设计 | **3.0/5** | -0.5 | 玩法分析师 |
| 玩法深度 | **4.0/5** | 持平 | 玩法分析师 |
| 重玩价值 | **4.0/5** | 持平 | 玩法分析师 |
| 节奏把控 | **3.5/5** | 持平 | 玩法分析师 |

**综合评分: 3.6/5.0** (与 v1 持平，部分旧问题已修复但发现了新问题)

---

## 已修复确认（v1 报告的问题）

以下问题在 v1→v2 之间已成功修复：

| 问题 | 修复状态 |
|------|---------|
| 6 个 Act4 敌人缺 race 字段 | **已修复** |
| skeleton_archer 无技能 | **已修复** (shadow_arrow) |
| dragon_boss 孤儿 | **已修复** (加入 Act1 + 阶段配置) |
| shadow_assassin DPS 超标 | **已修复** (atkSpd 1.5→1.35, crit 0.28→0.22) |
| glass_cannon 收益失衡 | **已修复** (40%→25%) |
| 刺客 3 阶羁绊 +1.0 | **已修复** (+1.0→+0.5) |
| 龙族羁绊 +25% | **已修复** (+25%→+18%) |
| SkillBar pointerdown 不一致 | **已修复** (改为 pointerup) |
| 教程 EventBus 空回调 | **已修复** (element:reaction, relic:acquire) |
| getEffectiveStats 无缓存 | **已修复** (dirty-flag 缓存) |
| Date.now() ID 重复风险 | **已修复** (递增计数器) |
| 面板透明度透字 | **已修复** (alpha 0.5→0.95) |
| 主菜单按钮截断 | **已修复** (间距压缩) |
| 文字过小 tiny 8px | **已修复** (8→10px) |
| 地图连线不明显 | **已修复** (加亮+加宽) |
| 战斗名字重叠 | **已修复** (英雄名隐藏) |
| 敌人名被元素指示器遮挡 | **已修复** (HUD 重排) |
| 未解锁卡片无条件提示 | **已修复** (显示解锁条件) |

---

## 新发现的 P0 问题

| # | 问题 | 来源 | 位置 |
|---|------|------|------|
| 1 | **frost_queen hp(2400) ≠ maxHp(2800)** — 上轮只改了 maxHp 没同步 hp，Boss 出场就缺 400 HP | 内容/平衡 | enemies.json 第 569-570 行 |
| 2 | **magma_warden 和 ice_mage 解锁条件相同** (boss_kill: shadow_lord) | 内容 | MetaManager.ts 第 90、94 行 |
| 3 | **RelicSystem 15 处 `any` 绕过类型安全** | 架构 | RelicSystem.ts handler 函数 |
| 4 | **SaveManager 版本迁移是空壳** — SAVE_VERSION=1 无实际迁移逻辑 | 架构 | SaveManager.ts 第 58-59 行 |

---

## 新发现的 P1 问题

### 数据 & 平衡

| # | 问题 | 建议 |
|---|------|------|
| 1 | shadow_assassin 即使 nerf 后 Lv10 DPS 仍达 241，仍为第一 | 进一步降低 attack scaling 9→7/lv |
| 2 | Act4 difficultyMultiplier 2.2x 使 heart_of_the_forge 有效 HP 达 11000 | 降至 1.9-2.0x 或 Boss HP 5000→4000 |
| 3 | Act3 普通敌人太弱 (HP 150-240) vs Boss 太强 (有效 HP 6300)，Boss/普通比 18x | 提升 Act3 普通敌人基础 HP |
| 4 | mono_element_crown 全队同元素 +40% 伤害过强 | 降至 +25-30% |
| 5 | 后期金币严重溢出（总收入约 2500G vs 总支出约 1000G） | 增加金币消耗途径 |
| 6 | 教程仍有 3 个提示不触发 (first_synergy, first_elite, first_boss) | 在对应场景调用 showTipIfNeeded |

### UX & 交互

| # | 问题 | 建议 |
|---|------|------|
| 7 | MainMenuScene 升级按钮/BattleHUD 速度按钮仍用 pointerdown | 统一为 pointerup |
| 8 | HeroDraft 右键查看详情移动端不可用 | 添加长按交互 |
| 9 | 移动端文字 10px 在手机横屏仍偏小（映射约 7.5px） | 移动端检测时额外 +2px |

### 架构

| # | 问题 | 建议 |
|---|------|------|
| 10 | BattleScene.create() 仍约 400+ 行 | 拆分为子方法 |
| 11 | Hero/Enemy calculateStats 代码重复 | 提取到 Unit 工具函数 |
| 12 | DailyRule.value 类型为 any | 使用区分联合类型 |
| 13 | RelicSystem 硬编码 20+ 个 relic ID 字符串匹配 | 数据驱动化 |

---

## P2 改进建议（按影响力排序）

| # | 类别 | 建议 |
|---|------|------|
| 1 | 玩法 | 补充 6 种缺失的元素反应组合（dark+ice, holy+fire 等） |
| 2 | 玩法 | 差异化 5 个同质元素羁绊（当前全是 +20% 元素伤害） |
| 3 | 视觉 | Chibi 增加发型/配饰子层提升角色辨识度 |
| 4 | 视觉 | 粒子系统增加 3-4 种纹理形状（当前全用白色圆形） |
| 5 | 平衡 | 法师型 DPS 基础 magicPower +5-10 缩小与物理 DPS 差距 |
| 6 | 内容 | Act4 事件池仅 7 个，补充至 10+ |
| 7 | 平衡 | 噩梦难度 goldMultiplier 1.5→1.6 |
| 8 | 架构 | Unit 索引 Map 替代 O(n) find 调用 |
| 9 | 架构 | 魔法数字集中到 balance.ts |
| 10 | 音频 | 元素反应分类 SFX（4 种反应当前共用 1 个 sfx_reaction） |

---

## 优先修复计划

### 立即修复（P0 数据错误）
1. frost_queen hp 同步为 2800
2. magma_warden 解锁条件差异化

### 短期修复（P1 平衡 + UX）
3. shadow_assassin 进一步 nerf (scaling 9→7)
4. Act4 难度倍率 2.2→2.0
5. mono_element_crown +40%→+28%
6. 补充 3 个教程触发器
7. 统一剩余 pointerdown 按钮

### 跳过（需更大范围改动）
- SaveManager 版本迁移框架
- RelicSystem any 类型清理
- BattleScene 拆分
- 金币消耗途径（需新功能设计）
