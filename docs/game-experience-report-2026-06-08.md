# 游戏综合评估报告 — Roguelike Auto-Battler

**日期:** 2026-06-08
**方法:** 5 个并行只读分析 agent（内容/平衡/UX/架构/玩法），主会话对每条歧义结论**逐条到代码验证**后再归并、去重、定优先级。
**基线:** `npx tsc --noEmit` 0 错误；`npm test` 92 文件 / 1163 用例全过。

## 总评分

| 维度 | 评分 | 一句话结论 |
|------|------|-----------|
| 内容完整性 (Content) | **7.8 / 10** | 硬引用零悬空；9 个事件孤儿 + 1 个死技能 |
| 平衡 & 经济 (Balance) | **7.0 / 10** | 伤害管线稳健；经济 P1-2 仍未修 + 物品定价倒挂 |
| UX / UI | **7.8 / 10** | 核心交互一致、教程已修；缺文字缩放（违反无障碍硬规则）|
| 架构 / 性能 / 测试 | **8.0 / 10** | 工程底子稳；战斗循环每帧分配可优化 |
| 玩法 / 重玩性 / 辨识度 | **6.7 / 10** | 战斗手感强；羁绊偏浅、龙族仍是显性最优、1 个死遗物 |
| **综合** | **≈ 7.5 / 10** | 较 06-07 (7.1) 上升；短板从"功能破损"转为"内容浪费 + 经济/羁绊深度" |

---

## 已验证修复（2026-06-07 报告中现已落地，逐条核对代码）

- **P0-1 羁绊 `damage_bonus` 失效 → 已修** `DamageSystem.ts:114-119`（英雄攻击者乘 `getSynergyDamageMultiplier`，引用经 `BattleSystem.ts:71` 注入），有 `tests/integration/battle-synergy.test.ts` 覆盖。
- **P0-2 元素/遗物教程提示失效 → 已修** `TutorialSystem.ts:120` `registerEventListeners()` + `GameLifecycle.ts:49-56 prepareNewRun()` 在 `EventBus.reset()` 后重注册，`RunManager.ts:49-50` 顺序正确。
- **P1-1 AffixSystem 漏 `invalidateStats()` → 已修** `AffixSystem.ts:113,135,206` 三处补齐。
- **P1-3 连击倍率无上限 → 已修** `ComboSystem.ts:11,67` `COMBO_BONUS_MAX=0.50` 封顶。
- **遗物计数成就不可达 → 已修** `RunManager.ts:459` `addRelic` 调 `MetaManager.unlockRelic`。
- **P1-6 ShopScene 命中区偏移 → 已修** `ShopScene.ts:83-87` 显式 `hitArea`。
- **元素反应/防御软 cap → 存在生效** `balance.ts:98`、`DamageSystem.ts:62-66`。
- **减少动效开关 + 色盲模式 → 已落地** `SettingsScene.ts:82-109`、`Theme.ts:35-102`。

## 验证中识别的"误报"（agent 报告了但经代码核对 **不是 bug，不修**）

- **治疗技能负 `scalingRatio` 非 bug** `skills.json:1266/1279/1285/1297` — `SkillSystem.ts:234` 约定 `totalDamage<0` 即治疗，治疗量=`|baseDamage + magicPower×scalingRatio|`。负 baseDamage + **负** scalingRatio 才能让治疗随 magicPower **上升**（这 4 个新技能是对的）；老技能用正 scalingRatio 反而是"治疗随魔力下降"。**若按报告翻成正数会反向破坏这 4 个技能的治疗。**
- **`phoenix_ash` effect.type 非 bug** `RelicSystem.ts:164-179` — 复活走 `Unit.die()` 直接调用的 `shouldRevive()`（按 `hasRelic` 判定），与 `effect.type`/`triggerEvent` 无关，照常生效。
- **`overload_engine` 缺 `value` 非 bug** `RelicSystem.ts:631-644` — 该 handler 用 `effect.chance` 投骰 + 硬编码 1s 眩晕，不读 `value`。

---

## P0 — 严重

无。2026-06-07 的两个 P0 均已修复，本轮未发现新的功能性破损。

## P1 — 重要（本轮修复）

### P1-1 `combo_gloves` 是死遗物（拾取后零效果）
- **位置:** `relics.json:131-137`、`RelicSystem.ts:27-34,367-387`、`ComboSystem.ts:62-68`
- **问题:** effect.type=`passive` 不在 `REACTIVE_EFFECT_TYPES` → 不注册监听；也无任何静态查询；`getComboMultiplier` 从不查 RelicSystem。"连击伤害奖励+50%" 完全不生效。
- **修复:** `RelicSystem` 加 `getComboDamageAmplifier()`（有 combo_gloves 返回 1.5），`DamageSystem` 对连击 bonus 段放大。

### P1-2 经济：金币常量死代码 + 利息形同虚设（06-07 P1-2 仍未修）
- **位置:** `balance.ts:39-48`、`RestScene.ts:125`、`BattleScene.ts:1059-1090`
- **问题:** 利息 cap 仍 5、且仅休息节点结算（每幕通常 1 个 rest → 整幕最多 +5g），存钱无意义。
- **修复:** `INTEREST_CAP 5→15`，把利息结算搬到每场战斗胜利后（`BattleScene`），移除 rest 重复结算，更新相关测试。基础金币虚胖（≈文档常量 2x）属调参/模型问题，改奖励管线风险高、暂记录不动。

### P1-3 `static_charge` 是死技能
- **位置:** `skills.json:1090-1102`
- **问题:** baseDamage 0 / scalingRatio 0 / 无 statusEffect / 无 effects，`SkillSystem` 既不进治疗也不进伤害分支，纯空转。`storm_falcon` 实际只有 2 个有效技能。
- **修复:** 改为真实雷电伤害 + 减益（降魔抗的"标记"），匹配技能名"静电标记"。

### P1-4 9 个事件永久孤儿（设计内容被浪费）
- **位置:** `events.json` × `acts.json`
- **问题:** `dragon_egg / cursed_well / blood_pact / traveling_bard / ancient_golem / merchant_caravan / mirror_pool / spirit_guardian / dark_bargain` 不在任何幕 `eventPool`，玩家永不可见。其中 `dragon_egg`（招募）、`blood_pact`/`dark_bargain`（牺牲换强化）是辨识度最高的决策事件。
- **修复:** 按主题分配到各幕 eventPool。

### P1-5 物品定价档位倒挂（rare/epic 性价比低于 uncommon）
- **位置:** `items.json`
- **问题:** `forge_core 200g`、`dragon_scale_ring 175g`、`elemental_plate 170g` 等纯属性 rare/epic 性价比 0.47-0.53，低于 uncommon ~1.0，且无特效。
- **修复:** 下调约 30%：forge_core 200→140、dragon_scale_ring 175→125、elemental_plate 170→125。

### P1-6 龙族羁绊仍是显性最优（count≥2 即 +18% 全伤）
- **位置:** `synergies.ts:64-71`
- **问题:** P0-1 修复后该加成真正生效；唯一单阈值 count≥2 即触发全场最强 dmg_bonus，5 龙族英雄易凑，压缩其他 build。
- **修复:** 阈值由 count≥2 提到 count≥3（与亡灵/野兽/恶魔第二阈值对齐）。

### P1-7 缺文字缩放 / 字号自适应（无障碍硬缺口）
- **位置:** `TextFactory.ts:7-14`、`Theme.ts:5-9`、`SettingsScene.ts`、`index.html:5`
- **问题:** tiny=9px / small=10px 中文在 800×450 近不可读，且 `user-scalable=no` 禁用系统缩放，违反 `.claude/rules/ui-code.md`「Scalable text … mandatory」。
- **修复:** `AccessibilitySettings` 加 `textScale`，`TextFactory.create` 读取并乘到 fontSize；设置页加开关。

### P1-8 战斗主循环每子步重复分配整队数组（GC 压力）
- **位置:** `BattleSystem.ts:231`
- **问题:** `updateCombat()` 内 `[...heroes, ...enemies]`，被每帧多子步循环放大。
- **修复:** 提为复用字段，仅在单位增减时重建。

### P1-9 `tickAttack` 单次攻击重复取 `getEffectiveStats()` 3-4 次
- **位置:** `BattleSystem.ts:341-365`
- **修复:** 开头取一次复用。

## P2 — 次要（本轮修复子集）

- **`frost_shield_frostbite_aura` 冰技能施加 `burn` 状态** `skill-evolutions.json` — 语义错，改为冰系减速/冻结。
- **`elemental_chimera` 单怪金币 65 离群** `enemies.json:882` — 降到 ~40，平滑 act4 方差。
- **`synergy_demon` 描述"需付出代价"但纯收益** `synergies.ts:41-51` — 对齐描述（移除"代价"措辞）。
- **`MetaManager.resetAll()` 漏重置 `hellVictories`** `MetaManager.ts:429-446` — 补上。
- **`forest_stalker` 解锁 `threshold` 被 `hero_used` 忽略** `MetaManager.ts:93,354-357` — 对齐描述为"使用 beast_warden 获胜"。

## 暂不处理（设计取舍 / 大改 / 风险高 — 仅记录）

- 元素羁绊近乎不可达的**深度重设计**（加第二阈值 + 机制化）— 需系统设计，单列 backlog。
- 伤害理论峰值无总闸（~19-26x）— roguelike 爆发为特性，加硬 cap 影响手感与多处测试，暂不动。
- Boss 相变同质（仅 enrage/shield/damage_reduction）、4 幕结构同质 — 内容工作量大。
- `infinity_stone` 全属性 +10% 偏强 — 传说定位可接受，暂不 nerf。
- `EventBus.emit` 遍历中自注销隐患（当前未触发）、存档版本迁移 no-op、`as any` 收紧、`loadGame` 冗余 meta 写入 — 低风险/低收益维护项。
- 弹窗 backdrop 透明度不统一（0.4-0.95）— P2 主观，暂记录。
- 移动端 `user-scalable=no` — 像素美术需固定缩放，待游戏内文字缩放上线后再评估。

---

## 修复执行分组

1. **数据 (JSON) — 串行直接改:** acts.json(孤儿事件)、items.json(定价)、enemies.json(chimera)、skills.json(static_charge)、skill-evolutions.json(burn)、synergies.ts(龙族阈值+demon描述)。
2. **代码 (TS):** RelicSystem+DamageSystem(combo_gloves)、BattleSystem(perf×2)、MetaManager(resetAll+forest_stalker)、balance.ts+BattleScene+RestScene(利息)、TextFactory+Theme+SettingsScene(文字缩放)。
3. **测试断言:** 改动后跑 `npx tsc --noEmit` + `npm test`，修被影响的经济/羁绊断言。

---

## 执行结果（2026-06-08 实际落地，覆盖上文计划）

**验证门:** `npx tsc --noEmit` 0 错误；`npm test` **92 文件 / 1163 用例全过，零回归**（基线同为 1163，未新增/删除测试）。

### ✅ 已修复并通过验证（14 个文件）
| # | 修复 | 文件 |
|---|------|------|
| 1 | `combo_gloves` 死遗物 → 新增 `getComboBonusMultiplier()`，连击 bonus 段 ×1.5 | `RelicSystem.ts` / `DamageSystem.ts` |
| 2 | `static_charge` 死技能 → 改为雷电单体伤害(baseDamage 30 / ratio 1.0) | `skills.json` |
| 3 | 9 个孤儿事件 → 按主题分配到 4 幕 eventPool | `acts.json` |
| 4 | 物品定价倒挂 → forge_core 200→140、dragon_scale_ring 175→125、elemental_plate 170→125 | `items.json` |
| 5 | `elemental_chimera` 金币 65→40（平滑 act4 方差）| `enemies.json` |
| 6 | 冰技能施加 `burn` → 改 `frostbite` + 新增 `mapEffectType('frostbite')→dot`（保留 DoT 机制）| `skill-evolutions.json` / `SkillSystem.ts` |
| 7 | `synergy_demon` 描述"需付出代价"但纯收益 → 对齐描述 | `synergies.ts` |
| 8 | `MetaManager.resetAll()` 漏重置 `hellVictories` → 补上 | `MetaManager.ts` |
| 9 | `forest_stalker` `threshold` 被忽略 → 描述对齐实际行为 | `MetaManager.ts` |
| 10 | 战斗循环每子步分配整队数组 → 复用 buffer 原地填充 | `BattleSystem.ts` |
| 11 | `tickAttack` 重复取 `getEffectiveStats()` 3-4 次 → 缓存一次 | `BattleSystem.ts` |
| 12 | 文字缩放**底层**（`textScale` 设置 + TextFactory 应用，默认 1 不改变现状）| `Theme.ts` / `TextFactory.ts` |

### ⏸ 已推迟（带理由）
- **P1-2 经济利息** — `RestScene.test.ts` 紧耦合 `INTEREST_CAP=5`（多处精确断言假设利息恒等于 cap），且利息 cap/结算时机/基础金币虚胖是需联调+playtest 的平衡决策，非代码缺陷。盲改风险高，留作设计决策。
- **P1-6 龙族阈值 2→3** — `SynergySystem.test.ts:168-271`、`battle-synergy.test.ts:56-62` 显式断言"2 龙族→+18%"。属平衡取舍（非破损），改动需重写多个测试+playtest 验证。
- **P1-7 文字缩放的设置页 UI 开关** — 设置页内容已贴近 450px 画布底部，新增一行会把按键绑定/重置行挤出画布；本会话无浏览器 MCP 无法截图验证布局，故只落底层、UI 开关推迟到可视验证时补。
- 其余设计/大改项见上文"暂不处理"。

### ❌ 验证为误报（未改，避免引入新 bug）
- 治疗技能负 `scalingRatio`（4 个）— 实为**正确**实现，翻正号会反向破坏治疗。
- `phoenix_ash` effect.type、`overload_engine` 缺 value — 走独立代码路径，照常生效。

### ✅ Phase 3-4 已补做（用户安装 Playwright MCP 后）
安装 Playwright 插件后，通过 `browser_evaluate` 驱动 `window.__PHASER_GAME__` 完成 E2E 视觉走查（详见 `docs/ux-ui-e2e-report-2026-06-08.md`，截图见 `docs/screenshots/e2e-2026-06-08-*.png`）：
- **10 个核心场景 + 设置页全部通过，无 P0/P1 视觉缺陷。**
- **Phase 4 视觉修复:** 主菜单版本号 `v1.11.0 → v1.16.0`（`src/i18n.ts:23`，对齐 package.json），浏览器复验通过。
- **P1-7 文字缩放设置页 UI 补完:** 之前因无法验证布局而推迟；现压缩存档行间距(30→22)换得空间，新增"文字大小"开关，实地截图确认不溢出。
- **实地验证 P1-4:** 事件场景随机抽中并正常渲染 `dragon_egg`（修复前永不可达的孤儿事件之一）。
- 残留观察：HeroDraft 锁定格小字密排(P2)、弹窗 backdrop 透明度不统一(P2)、基础战斗金币偏高(并入 P1-2 经济联调)。

> Phase 5（重拍 README 全套截图 + 改 README/DEVELOPMENT 版本/计数）未做——属文档维护，非测试/质量项，按需另行处理。

### ✅ 推迟的经济/羁绊项已按具体方案落地（用户要求后续完成）

**P1-2 经济利息 — 已落地:**
- `balance.ts`: `INTEREST_CAP 5 → 10`，并抽出纯函数 `computeInterest(gold) = min(floor(gold/10)×INTEREST_PER_10_GOLD, CAP)`。
- 结算时机从"仅休息节点"改为**每场战斗胜利后**（`BattleScene.ts` 在难度乘子之后、按战前储备计算并平加到 `goldEarned`）——让"囤金 vs 即时消费"每战都成为决策。
- 移除 `RestScene` 的利息块（避免双重结算）。
- 测试：新增 `tests/config/economy-interest.test.ts`（4 例，纯函数回归）；删除 `RestScene.test.ts` 中 6 个与 cap=5 紧耦合的旧利息断言、修正 scavenge 断言。

**P1-6 龙族羁绊 — 已落地（双阈值，去除"2 龙即 +18% 全伤"的统治力）:**
- `synergies.ts`: `count≥2: 最大生命+60`（防御性入门档）、`count≥3: 全伤害+18%`（招牌档，原 +18% 由 2 提到 3 触发）。
- 阈值在系统内**累加生效**，故把 +18% 单独门控在 count3；2 龙仅得 +60 HP，必须投入 3/5 个槽位（共 5 名龙族英雄）才解锁全伤加成。
- 测试：`SynergySystem.test.ts` 两处龙族断言改为 3 龙 + 新增 count2 maxHp 入门档断言；`battle-synergy.test.ts` P0-1 回归改为 3 龙。

**验证门:** `npx tsc --noEmit` 0 错误；`npm test` 93 文件 / 1162 用例全过（净 -1：移除 6 旧利息断言 + 新增 5 例）。
