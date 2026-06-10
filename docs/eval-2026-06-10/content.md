# 内容完整性评审报告 — 2026-06-10

**项目**: D:\work\games\rougelike (TypeScript + Phaser 3 roguelike)
**评审人**: QA (Claude)
**范围**: 纯静态内容分析,不改代码

## 大纲

1. 交叉引用校验
2. 字段异常检查
3. 文案抽查
4. 解锁链分析
5. TODO/FIXME 清点
6. 评分与问题清单

---

## 1. 交叉引用校验

校验方式:临时脚本 `scripts/tmp-xref.mjs`(已删除)全量遍历 `src/data/*.json`。

### 通过项(零断链)

| 检查 | 结果 |
|---|---|
| heroes.skills → skills.id(26 英雄) | 全部有效 |
| enemies.skills → skills.id(28 敌人) | 全部有效 |
| acts.enemyPool/bossPool → enemies.id(4 幕) | 全部有效 |
| acts.eventPool → events.id(49 事件) | 全部有效,且 49 个事件全部被至少一幕引用 |
| boss-phases 键 → enemies.id(5 boss) | 全部有效 |
| boss-phases.spawns → enemies.id | 全部有效(flame_construct/frost_sentinel/lightning_strider/holy_smith/void_weaver 均存在) |
| 幕 boss 是否都有 boss-phases 配置 | 4 幕全部 boss 均有阶段配置 |
| skill-visuals 覆盖率 | **93/93 = 100%**,且无孤儿视觉键 |
| skill-evolutions(20 条)→ skills.id / heroes.id | 全部有效,覆盖 10 个源技能 |
| skill-advancements(65 条)→ skills.id | 全部有效,覆盖 44 个技能 |
| 全部数据文件 id 唯一性 | 无重复 id |
| achievements 条件中的实体引用 | 无断链(17 种 conditionType,4 个 custom 类型走代码路径) |

### 发现的问题

**[P1] 3 个敌人为死内容,任何途径都无法遇到** — `src/data/enemies.json`
- `frost_giant`、`enemy_ice_mage`、`holy_guardian` 在 enemies.json 中完整定义,且 `src/systems/UnitSpriteAssets.ts` 还为其加载了 spritesheet 资源(third-batch / fourth-batch),但它们:
  - 不在任何 act 的 enemyPool/bossPool 中(`src/data/acts.json`)
  - 不在任何 boss-phases 的 spawns 中(`src/data/boss-phases.json`)
  - 全仓代码 grep 仅命中数据定义与资源注册,无任何生成路径
- 影响:浪费已生产的美术资源;若图鉴(codex)以"遭遇全部敌人"为完成度统计,将永远无法 100%(详见第 4 节)。

**[P2] 技能进阶(skill-advancements)覆盖不均**
- 6 个非大招的英雄技能完全没有进阶:`shadow_drain`(shadow_assassin)、`frost_shield`/`glacial_pulse`(frost_whisperer)、`holy_blessing`/`radiant_burst`(holy_emissary)、`frost_arrow`/`dragon_ice_breath`(ice_dragon_hunter)。这 4 个英雄(疑似后期新增)的基础技能无任何 5/10 级进阶,与其余 22 个英雄体验不一致。
- 23 个技能只有 1 级进阶,而早期技能(shield_bash 等)有 2 级 — 深度不一致。
- 26 个大招(ult_*)均无进阶,看似刻意设计,但与上述 4 英雄的缺失混在一起,建议显式约定。

**[P2] skill-evolutions 仅覆盖 10/26 英雄的技能**(shield_bash、holy_smite、backstab、berserk_rage、fireball、multi_shot、heal、nature_heal、elemental_infusion、frost_shield)。进化系统对多数英雄不可用,属内容缺口而非断链。

## 2. 字段异常检查

### 通过项
- 26 英雄 + 28 敌人:`hp === maxHp` 全部一致;baseStats 11 个字段无缺失、无负值、关键字段无 0 值。
- scalingPerLevel 全部存在且非负。
- 敌人 goldReward/expReward 全部存在且 > 0。
- 49 个事件每个 choice 的 outcomes 概率之和均为 1.0,无空 choices。
- 数值离群(组内 |z|>2.5)仅 `heart_of_the_forge`(maxHp=3800, defense=65)— 它是第 2 幕 boss,离群属合理设计。

### 已核实为"设计如此"的疑似异常(非问题)
- **治疗技能负 baseDamage**(heal=-80、group_heal=-60、nature_heal、dark_mend、holy_barrier、ult_tree_of_life 等 12 处):`src/systems/SkillSystem.ts:463` 显式处理 `skill.baseDamage < 0` 走治疗分支。与已知结论(治疗负 scalingRatio 为正确设计)一致。
- **26 个大招 cooldown=0**:全部带 `isUltimate: true`,`SkillSystem.ts:148` 在常规冷却循环中 `if (skill.isUltimate) continue` 跳过,大招走充能触发路径,cooldown 字段不使用。
- **9 个 range=0 技能**(war_cry、divine_shield、berserk_rage、ice_armor、dragon_guard、pack_instinct、molten_shield、ult_magma_fortress、frost_guard):targetType 全部为 `self`,自身施放无需射程。

### 实际问题
- 无 P0/P1 级字段异常。本维度干净。

## 3. 文案抽查(技能 ×5+ / 事件成就 ×10)

### 技能描述 vs 数据/代码核对

| 技能 | 描述承诺 | 核对结果 |
|---|---|---|
| chain_lightning 雷电链 | "弹射3个目标，每次弹射伤害衰减" | **一致** — effects 链 3 段:55/1.0 → 38/0.7 → 25/0.5 |
| ult_iron_bastion 钢铁壁垒 | "反弹15%伤害，并为全队施加护盾" | **一致** — SkillSystem.ts:328-345 特判:counter_aura value=0.15 + 全队 addShield(50,8)。但"大幅提升防御"部分见下方 P0 |
| pack_instinct 群猎本能 | "增加自身攻速20%持续4秒" | **不一致** — statusEffect=`attack_speed_up` 在代码中无任何处理(见 P0),且 20% 无数据来源(baseDamage=0 → value=0) |
| ult_lethal_phantom 致命幻影 | "目标生命值低于30%时伤害翻倍" | **机制不存在** — DamageSystem/SkillSystem 全文无处决/30%/翻倍逻辑,实际只是普通单体 300+2.0×攻击 |
| predator_strike 捕食者之击 | "暴击率+25%" | **机制不存在** — 数据无 crit 字段,代码中强制暴击特判仅 backstab(SkillSystem.ts:239) |
| ult_arrow_rain 箭雨 | "造成5次物理伤害" | **不一致** — 无任何多段攻击字段/代码,实际单次 200+1.5×攻击。同类:ult_shadow_chain"斩击6次每击必暴"、ult_storm_barrage"3次雷电伤害"均为单段 |

### [P0] 系统性发现:13 种 statusEffect 名称未映射,约 24 个技能的状态效果实际无效

核对路径:`SkillSystem.mapEffectType()`(src/systems/SkillSystem.ts:483-492)只识别 5 个名称(stun/taunt/burn/frostbite/attack_buff),**其余一律返回 'debuff'**;而 `applyStatusEffect`(:424-437)仅在类型为 'buff' 时设置 `stat: 'attack'`;`Unit.getEffectiveStats`(src/entities/Unit.ts:337)要求 `effect.stat` 存在才生效。结果:

- **映射缺失而完全无效的 13 个名称(24 个技能)**:
  - `slow`(ice_bolt、blizzard、acid_spit、glacial_pulse、frost_arrow)— 不减速
  - `freeze`(frost_nova)— 不冻结(非元素反应路径)
  - `dark_dot`(shadow_bolt、shadow_weave)— 无 DoT 跳伤
  - `attack_debuff`(primal_roar、static_field)、`magic_resist_down`(resonance_pulse、void_debuff)— 不减属性
  - 友方增益变成"挂在队友身上的 debuff 图标且无属性效果":`divine_shield`、`regen`(nature_heal/rejuvenation/holy_barrier)、`berserk`、`ice_armor`、`defense_buff`(dragon_guard)、`speed_buff`(wind_wall)、`attack_speed_up`(pack_instinct)、`buff`(frost_shield/holy_blessing/ult_divine_empowerment)
- **effects[] 路径同样失效**(SkillSystem.ts:397-409 不设 `stat`/`tickInterval`):ult_berserk_inferno、ult_beast_roar、ult_dragon_soul、ult_thunder_god 的 attack_buff,ult_iron_bastion 的 defense_up,ult_tree_of_life 的 regen(10 秒持续治疗不跳),ult_shadow_domain 的 defense_down 等 7+ 个大招的核心 buff 全部无效。
- 测试中(tests/systems/StatusEffectSystem.test.ts:189)手工构造的效果带 `stat: 'speed'` 所以能通过 — 测试绕过了真实数据路径,掩盖了该缺口。
- 注意:治疗直接量(负 baseDamage)与伤害部分正常,元素反应(ignite/freeze/shock/decay)走 ElementSystem 独立路径不受影响。

### 事件/成就文案抽查(10 条)

| 条目 | 评价 |
|---|---|
| ancient_altar 远古祭坛 | 选项"研究符文（获得经验）"实际效果是 `stat_boost`(+5 属性)而非经验 — **文案与效果不符**(P2) |
| mushroom_grove 蘑菇丛林 | "采集后出售（获得25金币）"与 effects 25 金币一致;风险选项概率/后果清晰 ✓ |
| ancient_library 远古图书馆 | 清晰;"诅咒"分支伤害+更高加成的风险设计合理 ✓ |
| ancient_golem 远古魔像 | "挑战魔像（全队损失10%HP）"主路径一致;失败分支实为 25% 伤害(且不叠加宣称的 10%),风险提示略弱,可接受 ✓ |
| dark_market 暗黑集市 | 花费 70 与三分支 -70 一致 ✓ |
| event_lost_ranger 迷路的游侠 | 清晰,数值一致 ✓ |
| event_dark_ritual 黑暗仪式 | 清晰;失败分支 stat_boost -10(负向属性)文案"削弱了队伍"对应 ✓ |
| 成就 overkill"单次攻击造成500+伤害" | 清晰,threshold 500 一致 ✓ |
| 成就 all_heroes"解锁所有英雄" | threshold 26 = 英雄总数 ✓,但实际不可达(见第 4 节 P0) |
| 成就 speedrun"在15个节点内赢得一次冒险" | 文案清晰,但判定逻辑错误(见第 4 节) |

结论:事件文案整体质量高、概率全部归一;技能文案存在系统性"承诺机制未实现"问题。

## 4. 解锁链分析

英雄解锁条件硬编码于 `src/managers/MetaManager.ts:64-99`(26 英雄:5 默认 + 21 条件),判定在 `endRun()`(:311-361)。英雄解锁的唯一入口是 `MetaManager.unlockHero`,调用方仅 endRun 判定与成就奖励(AchievementManager.ts:199,但 26 个成就奖励全部是 meta_currency,无英雄奖励)→ **不存在替代解锁途径**。

### [P0] 雷电系 4 英雄全部死锁,不可解锁

雷电元素英雄共 4 名:elementalist、storm_caller、thunder_monk、storm_falcon — 默认 5 英雄(warrior/archer/mage/priest/rogue)无一是雷电系。四者解锁条件全部要求"获胜队伍中有雷电英雄":

| 英雄 | 条件(MetaManager.ts) | 死锁原因 |
|---|---|---|
| storm_caller (:88) | 队伍含 ≥2 雷电英雄获胜 | 需要已有 2 个雷电英雄 |
| elementalist (:80) | 队伍含 ≥3 雷电英雄获胜 | 需要已有 3 个 |
| thunder_monk (:91) | 纯雷电队伍获胜(`every === 'lightning'`) | 需要至少 1 个雷电英雄 |
| storm_falcon (:95) | 队伍含 ≥5 雷电英雄获胜 | **数学上永不可能**:全游戏仅 4 名雷电英雄(MAX_TEAM_SIZE=5,src/config/balance.ts:110),即使其余 3 名全部解锁,5 人队最多凑 3 雷电(storm_falcon 自身未解锁) |

循环依赖无任何外部突破口 → **4 名英雄(15% 英雄池)永久不可用**;级联导致成就 `all_heroes 收藏家`(heroes_count ≥26)永久不可达。对比:冰系链是健康范例 — ice_mage/ice_dragon_hunter 通过 boss 击杀(无元素前置)入场,再解锁 frost_ranger(2冰)→ frost_whisperer(3冰)。

### [P1] 自定义成就判定逻辑错误(AchievementManager.ts:112-137)

- `speedrun`(:117):`m.totalVictories >= 1 && s.nodesCompleted <= 15` — 混用**历史**胜场与**当前 run** 节点数。成就在 battle:end/node:complete 时也会检查,任何曾经赢过一次的玩家在下一局走到第 1~15 节点时即弹出"速通达人",无需本局获胜。
- `no_death`(:118-126):同样模式 — 老玩家新开一局完成 1 个节点(本局无人阵亡)即解锁"完美无瑕"。
- `solo_victory`(:127-131):只检查 `heroIds.length === 1 && nodesCompleted >= 15`,**完全不校验胜利** — 单人队伍撑到 15 节点战败也能拿"独狼"。
- `hell_victory`(:132-133):正确(hellVictories 在 MetaManager.ts:299 正确累加)✓

### 其余链路核查(健康)

- knight(5 runs)→ beast_warden(用 knight 获胜)→ forest_stalker(用 beast_warden 获胜):线性可达 ✓
- shadow_assassin(2 胜)→ shadow_weaver ✓;dragon_knight 纯火队:默认 mage 即火系,单人纯火可行 ✓
- necromancer/ice_mage/ice_dragon_hunter(boss 击杀,无前置)✓;holy_sentinel(困难+无治疗获胜)✓
- 成就 floor_10/15:highestFloor = nodesCompleted,4 幕 × 8 节点上限 32,可达 ✓
- 图鉴(codex):`encounteredEnemies` 跟踪 28 敌人,但 frost_giant/enemy_ice_mage/holy_guardian 无生成途径(第 1 节 P1),图鉴怪物收集永久封顶 25/28。

## 5. TODO/FIXME 清点

`rg "TODO|FIXME|HACK|XXX"` 扫描 `src/`、`tests/`、`scripts/`、配置文件:**0 处命中**。代码无遗留标记债务。(docs/ 与 .claude/ 为流程文档,不计。)

## 6. 评分与问题清单

### 各维度评分

| 维度 | 得分 | 依据 |
|---|---|---|
| 1. 交叉引用 | 8/10 | 零断链、视觉 100% 覆盖、id 全唯一;扣分:3 个死内容敌人、进阶/进化覆盖不均 |
| 2. 字段异常 | 9/10 | 全部干净;疑似异常逐一核实为设计如此 |
| 3. 文案一致性 | 4/10 | 系统性 statusEffect 失效(P0)+ 多个技能描述承诺不存在的机制;事件文案本身质量高 |
| 4. 解锁链 | 3/10 | 雷电系整链死锁(P0)+ storm_falcon 数学不可能 + 3 个自定义成就判定错误 |
| 5. TODO/FIXME | 10/10 | 零遗留 |
| **总分** | **6.8/10** | |

### 问题清单

**P0(2 项)**
1. **雷电系 4 英雄循环死锁、storm_falcon 永不可解锁**,级联导致"收藏家"成就不可达 — `src/managers/MetaManager.ts:80,88,91,95`(storm_falcon 需 5 雷电同队 vs 全游戏仅 4 雷电英雄 + MAX_TEAM_SIZE=5,`src/config/balance.ts:110`)
2. **13 种 statusEffect 名称未在 mapEffectType 映射,约 24 个技能 + 7 个大招的状态效果(减速/冻结/暗影DoT/属性增减益/持续治疗)实际无效**,且友方增益错误显示为 debuff — `src/systems/SkillSystem.ts:483-492`(default→'debuff')、`:424-437`(仅 buff 设 stat)、`:397-409`(effects 路径不设 stat/tickInterval)、`src/entities/Unit.ts:337`;涉及 `src/data/skills.json` 中 slow/freeze/dark_dot/divine_shield/regen/berserk/ice_armor/attack_debuff/defense_buff/speed_buff/magic_resist_down/attack_speed_up/buff

**P1(3 项)**
1. 3 个敌人为死内容(已含 spritesheet 资源),图鉴永久封顶 25/28 — `src/data/enemies.json`(frost_giant、enemy_ice_mage、holy_guardian),`src/data/acts.json`、`src/data/boss-phases.json` 均未引用
2. 自定义成就判定逻辑错误:speedrun/no_death 误用历史胜场+当前局计数(老玩家新局秒解锁);solo_victory 不校验胜利 — `src/managers/AchievementManager.ts:116-131`
3. 技能描述承诺不存在的机制:ult_lethal_phantom(30% 处决翻倍)、predator_strike(暴击率+25%)、ult_shadow_chain(每击必暴)— `src/data/skills.json` vs `src/systems/DamageSystem.ts`/`SkillSystem.ts`(无对应实现)

**P2(4 项)**
1. 多段攻击文案与实现不符:ult_arrow_rain"5次"、ult_shadow_chain"6次"、ult_storm_barrage"3次"实际均为单段伤害 — `src/data/skills.json`
2. skill-advancements 覆盖不均:frost_whisperer/holy_emissary/ice_dragon_hunter/shadow_assassin 的 6 个基础技能零进阶;23 个技能仅 1 级(早期技能 2 级);26 个大招无进阶未显式约定 — `src/data/skill-advancements.json`
3. skill-evolutions 仅覆盖 10/26 英雄的源技能,多数英雄无进化内容 — `src/data/skill-evolutions.json`
4. 事件 ancient_altar"研究符文（获得经验）"实际给 stat_boost 而非经验 — `src/data/events.json`

### 与既往误报的对照(本次未重复)
- 治疗技能负 baseDamage/scalingRatio:确认为设计(SkillSystem.ts:463 治疗分支)✓
- 大招 cooldown=0:isUltimate 走充能路径(SkillSystem.ts:148)✓
- 自身技能 range=0:targetType=self,无需射程 ✓
