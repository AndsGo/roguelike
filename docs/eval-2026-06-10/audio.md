# 音频评审报告 — 2026-06-10

**游戏:** 自走棋 Roguelike (Phaser 3 / TypeScript)
**评审者:** 音频总监 (Audio Director Agent)
**评审范围:** 代码与资源静态分析，无实际试听

---

## 总览

| 维度 | 得分 (1-10) |
|---|---|
| 1. 音频系统架构 | 7 |
| 2. 资源盘点 | 6 |
| 3. 事件覆盖度 | 6 |
| 4. 听觉层次设计 | 5 |
| 5. 音频短板清单 (综合扣分) | — |
| **总分** | **28 / 50 (56%)** |

---

## 1. 音频系统架构　　7/10

### 架构概述

`AudioManager` 是经典单例，通过 `EventBus` 被动接收游戏事件并驱动 SFX，BGM 切换由 `SceneTransition` 主动调用 `onSceneStart()`，整体设计清晰。

### 亮点

- **三通道音量控制** (`masterVolume / bgmVolume / sfxVolume`)，均为 0~1 浮点值，支持拖动条（`SettingsScene` 有完整的可拖动 Slider，非仅开关），设置持久化至 localStorage。
- **BGM 交叉淡入淡出**：`playBgm()` 以 `fadeMs/2` 淡出旧 BGM，再以 `fadeMs/2` 延迟淡入新 BGM，默认 500ms，crossfade 行为完整。Boss 战专用 BGM (`bgm_boss`) 在 Boss 出场动画触发时切换，逻辑正确。
- **SFX 并发上限 `MAX_CONCURRENT_SFX = 4`**：通过计数器节流，防止密集战斗轰炸。
- **Pitch detune `±50 cents`**：每次 SFX 随机 detuning，重复音效有自然变化感。
- **OGG + MP3 双格式**：`BootScene` 加载时以 `['.ogg', '.mp3']` 数组提供浏览器兼容回退，正确。
- **SFX 监听器独立管理**：`sfxListeners` Map 保存命名引用，`unregisterSfxListeners()` 可精确清除，无泄漏风险。

### 不足

1. **`getActiveScene()` 取第一个活跃场景**，Phaser 多场景并行时（如 HUD overlay scene）可能取错场景，进而在错误 SoundManager 上播放，导致 `cache.audio.exists()` 检查失败、音效静默。
2. **`playBgm` 重入问题**：同 key 重复调用会因 `key === this.currentBgmKey` 短路退出，但淡出完成前 `currentBgm` 仍是旧实例，期间若有第三次调用则旧 BGM 被孤立（`oldBgm` 引用丢失），tween 的 `onComplete` 仍会销毁，但 `currentBgm` 已指向更新的实例，存在微小内存泄漏窗口。
3. **音量仅在 BGM 切换时更新**：`setSfxVolume` 不影响当前正在播放的 SFX（fire-and-forget 的 volume 在创建时已固化），这是 Web Audio 的常规限制，但无补偿机制。
4. **无主音量应用于 BGM 开关**：`toggleBgm()` 直接 stop，没有 fade-out；`toggleSfx()` 也是硬切，用户体验稍粗糙。
5. **SceneTransition.slideTransition** 也调用 `onSceneStart()`，但其 BGM 触发在 `onComplete` 里（slide 结束），与 `fadeTransition` 在淡黑完成时触发一致，不存在错位。

---

## 2. 资源盘点　　6/10

### 文件清单（public/audio/）

共 **70 个文件**，35 个音频资源，每个提供 OGG + MP3 双格式。

**BGM（9首）：**

| Key | 用途 |
|---|---|
| `bgm_menu` | 主菜单 / 英雄征召 |
| `bgm_map` | 地图 |
| `bgm_battle` | 普通战斗 |
| `bgm_boss` | Boss 战 |
| `bgm_shop` | 商店 |
| `bgm_ambient` | 休息场景 |
| `bgm_event` | 事件场景 |
| `bgm_victory` | 奖励 / 胜利 |
| `bgm_defeat` | 游戏结束 |

**SFX（26个）：**

| 类别 | Keys |
|---|---|
| 战斗通用 | `sfx_hit`, `sfx_kill`, `sfx_crit` |
| 技能 | `sfx_melee`, `sfx_ranged`, `sfx_magic`, `sfx_heal_cast`, `sfx_skill` |
| 治疗/受伤 | `sfx_heal` |
| 元素反应 | `sfx_react_melt`, `sfx_react_overload`, `sfx_react_superconduct`, `sfx_react_annihilate`, `sfx_reaction` |
| 大招 | `sfx_ult_ready`, `sfx_ult_cast` |
| UI | `sfx_click`, `sfx_buy`, `sfx_coin`, `sfx_equip`, `sfx_select`, `sfx_error` |
| 成就/升级 | `sfx_levelup` |
| 事件 | `sfx_event_good`, `sfx_event_bad` |

### 亮点

- 双格式覆盖完整，无遗漏。
- SFX_KEYS 与 public/audio/ 文件一一对应，无孤立文件、无缺失文件。

### 不足

1. **无法验证文件大小与 LUFS**（需实际 ffprobe 数据）。根据行业经验，Web 游戏 BGM OGG 单首一般 1-4MB，SFX OGG < 100KB 为宜。该项目未见任何 loudness 规格文档，属于灰色地带。
2. **BGM 无 Act 分化**：4 个 Act（森林/火山/深渊/元素熔炉）各有主题元素，但战斗 BGM 全程复用同一首 `bgm_battle`，机会成本高。
3. **`bgm_menu` 同时用于 `MainMenuScene` 和 `HeroDraftScene`**，英雄征召时情绪应有区分（略显紧张的选择感），当前共用无差异化。
4. **缺少命名规范文档**：BGM 以 `bgm_` 前缀、SFX 以 `sfx_` 前缀，符合本项目约定，但没有正式命名规范文档，扩展时易混乱。实际文件命名与本项目音频命名约定（`[category]_[context]_[name]_[variant].[ext]`）不一致——当前均无 `context` 和 `variant` 段（如 `sfx_hit` 而非 `sfx_combat_hit_01`），存在后期规模化的隐患。

---

## 3. 事件覆盖度　　6/10

### EventBus 事件 vs. 音效覆盖

以下是所有 `GameEventType`（25 个）与 AudioManager 的对应关系：

| 事件 | 触发方式 | 音效 Key | 状态 |
|---|---|---|---|
| `unit:damage` | SFX_EVENT_ENTRIES | `sfx_hit` | 已覆盖 |
| `unit:kill` | SFX_EVENT_ENTRIES | `sfx_kill` | 已覆盖 |
| `unit:heal` | SFX_EVENT_ENTRIES | `sfx_heal` | 已覆盖 |
| `item:equip` | SFX_EVENT_ENTRIES | `sfx_equip` | 已覆盖 |
| `achievement:unlock` | SFX_EVENT_ENTRIES | `sfx_levelup` | 已覆盖（复用升级音） |
| `ultimate:ready` | SFX_EVENT_ENTRIES | `sfx_ult_ready` | 已覆盖 |
| `ultimate:used` | SFX_EVENT_ENTRIES | `sfx_ult_cast` | 已覆盖 |
| `skill:use` | 自定义 listener | `sfx_melee/ranged/magic/heal_cast/skill` | 已覆盖（按 role 分类） |
| `element:reaction` | 自定义 listener | `sfx_react_melt/overload/superconduct/annihilate` | 已覆盖（按中文名分类） |
| `unit:death` | **无 AudioManager 监听** | — | **缺失** |
| `unit:attack` | **无 AudioManager 监听** | — | 缺失（普通攻击命中无独立音） |
| `battle:start` | **无** | — | **缺失** |
| `battle:end` | **无** | BattleScene 手动调用 `sfx_levelup/sfx_event_bad` | 部分覆盖（非 EventBus 驱动） |
| `boss:phase` | **无** | — | **缺失** |
| `combo:hit` | **无** | — | **缺失** |
| `combo:break` | **无** | — | **缺失** |
| `relic:acquire` | **无** | — | **缺失** |
| `relic:trigger` | **无** | — | 缺失 |
| `status:apply` | **无** | — | 缺失（Stun/Burn 施加无音效） |
| `status:expire` | **无** | — | 缺失 |
| `skill:ready` | **无** | — | 缺失（技能 CD 冷却完成提示） |
| `node:complete` | **无** | — | 缺失（通关节点无庆祝音） |
| `run:end` | **无** | — | 缺失（由 BGM 变化替代） |
| `battle:turn` | **无** | — | 合理缺失（过于频繁） |
| `item:unequip` | **无** | — | 次要缺失 |

**直接调用（非 EventBus）:**
- `Button.ts` → `sfx_click`（全局按钮点击）
- `ShopScene` → `sfx_buy`, `sfx_coin`, `sfx_error`
- `EventScene` → `sfx_coin`, `sfx_event_good`, `sfx_event_bad`
- `HeroDraftScene` → `sfx_select`（×2，英雄选择/预览）
- `SkillEvolutionPanel` → `sfx_levelup`
- `RunManager` → `sfx_levelup`（英雄升级）
- `DamageSystem` → `sfx_crit`（暴击直接调用，与 `unit:damage.isCrit` 重叠但无冲突）

### 有音效的事件清单（16/25 场景）

unit:damage, unit:kill, unit:heal, unit:death（缺 EventBus 侦听，但死亡 SFX 通过 sfx_kill 声音联想），item:equip, achievement:unlock, ultimate:ready, ultimate:used, skill:use, element:reaction, battle:end（部分），sfx_crit（独立），UI 全覆盖（click/buy/coin/equip/select/error/event_good/event_bad），英雄升级，技能进化。

### 缺音效的关键事件清单

1. **`unit:death` (英雄死亡)**：英雄倒地无独立死亡音效（仅有 sfx_kill 是从杀手视角）。
2. **`battle:start`**：战斗开幕无开场 stinger 或准备音。
3. **`boss:phase`**：Boss 变相（召唤增援、能力强化）无任何音频标识。
4. **`combo:hit` / `combo:break`**：连击计数/断链无音效反馈，而 combo 系统有完整实现。
5. **`relic:acquire`**：拾取遗物无音效，属于稀有仪式感时刻。
6. **`status:apply`（stun/burn 等）**：施加负面状态无声音，影响战斗可读性。
7. **`skill:ready`**：技能 CD 冷却完毕无提示音（UltimateSystem 有 `sfx_ult_ready`，但普通技能无）。
8. **`node:complete`（含 elite 节点）**：通关节点无小型胜利 stinger。

---

## 4. 听觉层次设计　　5/10

### 战斗 SFX 密度节流

`MAX_CONCURRENT_SFX = 4` 防止轰炸，有一定保护。但：

- 节流策略是**全局排队丢弃**（先到先得，超 4 个直接 return），而非优先级队列。意味着同一帧里 `unit:damage` 连续触发 5 次，第 5 个 sfx_hit 无声，但这个第 5 个可能恰好是 Boss 暴击——关键时刻可能被静默。
- 无**同 key 去重/冷却**（cooldown per key）机制：`sfx_hit` 在 4 个槽内可被同时播 4 个实例，容易形成"hit 墙"。正确做法是对高频 SFX 设置每 key 最小间隔（如 `sfx_hit` 80ms 内只允许 1 次）。
- `sfx_crit` 在 `DamageSystem` 中单独调用，与 `unit:damage` 的 `sfx_hit` 会同帧叠加，两者共用并发槽，会让普通攻击 sfx 更容易被顶掉。

### 关键时刻独立听觉标识

| 时刻 | 独立标识？ | 说明 |
|---|---|---|
| Boss 出场 | 是 | BGM 切换为 `bgm_boss`（crossfade），强烈视觉+音乐双重变化 |
| Boss 变相 | **否** | `boss:phase` 无音频 |
| 大招就绪 | 是 | `sfx_ult_ready` |
| 大招释放 | 是 | `sfx_ult_cast` |
| 战斗胜利 | 部分 | BGM 切换 `bgm_victory` + `sfx_levelup` (stinger 借用升级音，不够专用) |
| 战斗失败 | 部分 | BGM 切换 `bgm_defeat` + `sfx_event_bad` (不够专用) |
| 英雄死亡 | **否** | 无 |
| 元素反应 | 是 | 4 种独立 SFX |
| 成就解锁 | 部分 | `sfx_levelup` 复用，无专属 jingle |
| 连击 | **否** | 无 |

**总体：** 核心战斗循环有基本覆盖；稀有/仪式感时刻（死亡、变相、连击、成就）听觉标识不足。

### BGM 分幕主题

**4 个 Act 全程共用同一首 `bgm_battle`**，这是最大的听觉单调点。森林 Act 1、火山 Act 2、深渊 Act 3、元素熔炉 Act 4 各有强烈的视觉主题，但战斗 BGM 无差异。`bgm_boss` 是唯一的差异化节点。

地图场景（`bgm_map`）、休息场景（`bgm_ambient`）、事件场景（`bgm_event`）、商店（`bgm_shop`）各有独立 BGM，非战斗环节覆盖尚可。

---

## 5. 音频短板清单（最影响沉浸感的 5 个问题）

| 优先级 | 问题 | 影响分析 |
|---|---|---|
| P0 | 4 个 Act 战斗 BGM 完全相同 | 玩家 2 小时内感受不到 Act 差异，是最大的沉浸感破坏者 |
| P0 | SFX 无优先级节流 | 高强度战斗中关键音效（暴击、Boss 变相）被低优先级 hit 音静默 |
| P1 | 英雄死亡无专属音效 | 情感低谷时刻无听觉锚点，战斗可读性下降 |
| P1 | Boss 变相(`boss:phase`)无音效/stinger | Boss 二阶段是战斗高潮，没有听觉提示让玩家错失感知 |
| P2 | 连击系统(`combo:hit`)无音效反馈 | Combo 是核心机制，完全无声音强化，战斗节奏感损失 |

---

## 优化建议

### P0 — 必须修复（核心沉浸感）

**P0-1: 按 Act 差异化战斗 BGM**
- 将 `bgm_battle` 扩展为 4 首（`bgm_battle_act1` ~ `bgm_battle_act4`），在 `BattleScene` 根据 `RunManager.getCurrentAct()` 选择对应 BGM。
- `SCENE_BGM_MAP` 改为不处理 `BattleScene`，由 BattleScene 自行决定 BGM。
- 预估工作量：**音频资产 2-3 天（委托作曲）+ 代码 0.5 天**（修改 AudioManager 和 BattleScene）。

**P0-2: SFX 优先级节流系统**
- 为 SFX 定义优先级等级（CRITICAL=3, HIGH=2, NORMAL=1, LOW=0）。
- `playSfx(key, priority)` 当并发槽满时，尝试抢占最低优先级槽位（而非直接丢弃）。
- 为高频 SFX（`sfx_hit`, `sfx_melee`, `sfx_ranged`）添加每 key cooldown（~80ms），防止同 key 堆叠。
- 预估工作量：**代码 1 天**（仅修改 `AudioManager.ts`，不影响调用方）。

### P1 — 重要优化（战斗反馈）

**P1-1: 英雄死亡专属音效**
- 添加 `sfx_hero_death` 资产。
- 在 `SFX_EVENT_ENTRIES` 添加 `['unit:death', 'sfx_hero_death']`，并在 listener 内过滤 `isHero === true`。
- 预估工作量：**音效资产 0.5 天 + 代码 2 小时**。

**P1-2: Boss 变相 stinger**
- 添加 `sfx_boss_phase` 音效（短促紧张的 2 秒 stinger）。
- 在 `SFX_EVENT_ENTRIES` 添加 `['boss:phase', 'sfx_boss_phase']`，或在 `BattleScene` 的 `onBossPhase` 回调中直接触发。
- 预估工作量：**音效资产 0.5 天 + 代码 1 小时**。

**P1-3: 战斗 stinger 专属化**
- 胜利 stinger 从 `sfx_levelup` 改为独立的 `sfx_battle_win`，失败从 `sfx_event_bad` 改为 `sfx_battle_lose`。
- 预估工作量：**音效资产 1 天 + 代码 0.5 天**（同时修改 BattleScene line 1218）。

**P1-4: 遗物拾取音效**
- 添加 `sfx_relic_acquire`，在 `SFX_EVENT_ENTRIES` 绑定 `relic:acquire`。遗物是 Roguelike 核心仪式感时刻。
- 预估工作量：**音效资产 0.5 天 + 代码 1 小时**。

### P2 — 锦上添花（体验深度）

**P2-1: 连击音效渐进强化**
- 监听 `combo:hit`，按 `comboCount` 分段（3/6/10 连）播放不同音调的 sfx_combo 变体。
- 预估工作量：**音效资产 1 天（3 个变体）+ 代码 0.5 天**。

**P2-2: 技能冷却完毕提示音**
- 添加 `sfx_skill_ready`（轻柔提示音），监听 `skill:ready`，优先级 LOW，防止打扰战斗主 SFX。
- 预估工作量：**音效资产 0.5 天 + 代码 1 小时**。

**P2-3: 成就专属 jingle**
- 当前 `achievement:unlock` 复用 `sfx_levelup`，建议制作独立短 jingle（3-4 秒）。
- 预估工作量：**音效资产 1 天 + 代码 1 小时**。

**P2-4: getActiveScene() 安全化**
- 修复多场景情况下 `getActiveScene()` 的歧义：优先返回包含 audio cache 的主场景，而非仅取第一个 active scene。
- 预估工作量：**代码 2 小时**（纯技术修复，防潜在静默 bug）。

**P2-5: 制定音频资产命名规范文档**
- 按 `[category]_[context]_[name]_[variant].[ext]` 规范整理现有文件命名，新文件强制遵循。
- 预估工作量：**0.5 天文档 + 现有资产重命名（需同步更新 BGM_KEYS/SFX_KEYS 定义）**。

---

## 附：工作量汇总

| 优先级 | 条数 | 代码工作量 | 资产工作量 |
|---|---|---|---|
| P0 | 2 | 1.5 天 | 2-3 天（音乐委托） |
| P1 | 4 | 1 天 | 2.5 天 |
| P2 | 5 | 0.5 天 | 2.5 天 |
| **合计** | **11** | **~3 天** | **~7 天** |

---

*报告生成时间: 2026-06-10 | 评审模型: claude-sonnet-4-6*
