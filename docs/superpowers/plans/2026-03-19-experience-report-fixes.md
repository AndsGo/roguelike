# 体验报告问题修复计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复体验报告中可立即处理的 P0 和 P1 问题，提升综合评分。

**Architecture:** 分为 4 个独立 Phase：数据修复、平衡调整、UX 修复、代码质量。每个 Phase 内的任务可并行执行。

**Tech Stack:** TypeScript + Phaser 3, JSON 数据文件, Vitest 测试

**Spec:** `docs/game-experience-report-2026-03-19.md`

---

## 跳过的问题（需要更大范围改动或外部依赖）

| # | 问题 | 原因 |
|---|------|------|
| P0-7 | 存档校验 | 纯客户端无法根本解决 |
| P0-8 | 每日挑战服务端 | 需要后端服务 |
| P1-9 | 暂停→设置丢失进度 | Phaser scene 模式大改 |
| P1-12 | 移动端字号 | 需移动端测试环境 |
| P1-13 | NodeTooltip 长按 | 需移动端测试环境 |
| P1-14 | BattleScene 拆分 | 高风险重构 |
| P1-16 | RelicSystem any | 大范围重构 |

---

## Phase 1: 数据完整性修复

### Task 1: Act4 敌人补充 race 字段 + skeleton_archer 技能 + dragon_boss 处理

**Files:**
- Modify: `src/data/enemies.json`
- Modify: `src/data/skills.json` (新增 skeleton_arrow 技能)
- Modify: `src/data/skill-visuals.json` (新增视觉)
- Modify: `src/data/boss-phases.json` (dragon_boss 阶段)
- Modify: `src/data/acts.json` (act4 elementAffinity)

**Changes:**

- [ ] **Step 1:** 为 6 个 Act4 敌人添加 race 字段：
  - flame_construct → `"race": "demon"`
  - frost_sentinel → `"race": "demon"`
  - lightning_strider → `"race": "beast"`
  - holy_smith → `"race": "human"`
  - void_weaver → `"race": "undead"`
  - elemental_chimera → `"race": "dragon"`

- [ ] **Step 2:** 为 skeleton_archer 添加技能 `shadow_arrow`：
  - skills.json 新增: `{ "id": "shadow_arrow", "name": "暗影箭", "description": "发射暗影之箭", "cooldown": 6, "damageType": "physical", "targetType": "enemy", "baseDamage": 30, "scalingRatio": 0.8, "range": 250, "element": "dark" }`
  - skill-visuals.json 新增: `"shadow_arrow": { "type": "projectile", "color": "0x8844aa" }`
  - enemies.json skeleton_archer 的 skills 改为 `["shadow_arrow"]`

- [ ] **Step 3:** 为 dragon_boss 添加阶段配置到 boss-phases.json：
  - `"dragon_boss": { "phases": [{ "hpPercent": 0.5, "spawns": [], "bossEffect": { "type": "enrage", "value": 25 } }] }`
  - 将 dragon_boss 添加到 act1 的 bossPool（作为替代 Boss）

- [ ] **Step 4:** 为 act4_forge 添加 `"elementAffinity": null`

- [ ] **Step 5:** 运行 `npx tsc --noEmit && npm test`

- [ ] **Step 6:** Commit "fix: patch enemy data (race fields, skeleton_archer skill, dragon_boss phases)"

### Task 2: 解锁条件差异化 + all_heroes 成就修复

**Files:**
- Modify: `src/managers/MetaManager.ts`
- Modify: `src/data/achievements.json`

**Changes:**

- [ ] **Step 1:** 差异化重复解锁条件：
  - storm_caller: 保持 `element_wins + lightning + 2`
  - elementalist: 改为 `element_wins + lightning + 5`（需要更多雷属性胜利）
  - magma_warden: 保持 `boss_kill + thunder_titan`
  - necromancer: 改为 `boss_kill + shadow_lord`
  - holy_emissary: 改为 `victory` + threshold 3（获胜 3 次）

- [ ] **Step 2:** all_heroes 成就 threshold 改为 20

- [ ] **Step 3:** 运行测试

- [ ] **Step 4:** Commit "fix: diversify hero unlock conditions and fix all_heroes threshold"

---

## Phase 2: 战斗平衡调整

### Task 3: shadow_assassin nerf + 刺客羁绊调整

**Files:**
- Modify: `src/data/heroes.json` (shadow_assassin stats)
- Modify: `src/config/synergies.ts` (assassin tier 3)
- Modify: `src/data/skills.json` (ult_lethal_phantom)

**Changes:**

- [ ] **Step 1:** shadow_assassin 调整：
  - attackSpeed: 1.5 → 1.35
  - critChance: 0.28 → 0.22

- [ ] **Step 2:** 刺客 3 阶羁绊暴击伤害 +1.0 → +0.5

- [ ] **Step 3:** ult_lethal_phantom scalingRatio 2.5 → 2.0

- [ ] **Step 4:** 运行测试

- [ ] **Step 5:** Commit "balance: nerf shadow_assassin and assassin synergy tier 3"

### Task 4: 遗物 + 羁绊 + Boss 平衡

**Files:**
- Modify: `src/data/relics.json` (glass_cannon)
- Modify: `src/config/synergies.ts` (dragon synergy)
- Modify: `src/data/enemies.json` (frost_queen HP, heart_of_the_forge def)
- Modify: `src/data/boss-phases.json` (frost_queen phases)
- Modify: `src/data/items.json` (legendary prices)

**Changes:**

- [ ] **Step 1:** glass_cannon: attack bonus 40 → 25

- [ ] **Step 2:** 龙族羁绊: 收益 25% → 18%

- [ ] **Step 3:** frost_queen: HP 2400 → 2800，添加阶段到 boss-phases.json：
  ```json
  "frost_queen": { "phases": [
    { "hpPercent": 0.5, "spawns": ["frost_sentinel"], "bossEffect": { "type": "enrage", "value": 30 } },
    { "hpPercent": 0.25, "spawns": [], "bossEffect": { "type": "shield", "value": 500 } }
  ] }
  ```

- [ ] **Step 4:** heart_of_the_forge: defense 80 → 65

- [ ] **Step 5:** 传说装备降价：所有 legendary 物品价格 × 0.7（约 340→238, 400→280）

- [ ] **Step 6:** 运行测试

- [ ] **Step 7:** Commit "balance: adjust relics, synergies, bosses and legendary prices"

### Task 5: 治疗技能 scalingRatio 修正

**Files:**
- Modify: `src/data/skills.json`

**Changes:**

- [ ] **Step 1:** 检查并修正 4 个治疗技能的 scalingRatio 符号：
  - frost_shield: scalingRatio -0.6 → 0.6, baseDamage 保持负值
  - ult_frozen_sanctuary: scalingRatio -1.2 → 1.2
  - holy_blessing: scalingRatio -0.5 → 0.5
  - ult_divine_empowerment: scalingRatio -0.8 → 0.8
  （治疗公式使用 `baseDamage + stat * ratio`，baseDamage 为负表示治疗，ratio 应为正使治疗量随 MP 提升）

- [ ] **Step 2:** 运行测试

- [ ] **Step 3:** Commit "fix: correct healing skill scalingRatio signs"

---

## Phase 3: UX 修复

### Task 6: SkillBar 交互改为 pointerup + HeroDraftScene 按钮修复

**Files:**
- Modify: `src/ui/SkillBar.ts`
- Modify: `src/scenes/HeroDraftScene.ts`

**Changes:**

- [ ] **Step 1:** SkillBar hit area 从 `pointerdown` 改为 `pointerup`，添加距离检查：
  ```typescript
  let pressX = 0, pressY = 0;
  hitArea.on('pointerdown', (p: Phaser.Input.Pointer) => { pressX = p.x; pressY = p.y; });
  hitArea.on('pointerup', (p: Phaser.Input.Pointer) => {
    const dx = p.x - pressX, dy = p.y - pressY;
    if (dx * dx + dy * dy < 400) { /* fire skill */ }
  });
  ```

- [ ] **Step 2:** HeroDraftScene startBtn 使用 setEnabled：
  - 初始化时 `this.startBtn.setEnabled(false)` 替代 `setAlpha(0.4)`
  - updateSelectionUI 中 `this.startBtn.setEnabled(canStart)` 替代 `setAlpha`

- [ ] **Step 3:** 运行测试

- [ ] **Step 4:** Commit "fix: SkillBar pointerup consistency and HeroDraftScene button state"

### Task 7: 教程系统空回调修复

**Files:**
- Modify: `src/systems/TutorialSystem.ts`

**Changes:**

- [ ] **Step 1:** 实现 EventBus 监听器的回调逻辑，替换空函数：
  - `element:reaction` → `TutorialSystem.showTipIfNeeded('first_element', scene)`
  - `relic:acquire` 或等效事件 → `TutorialSystem.showTipIfNeeded('first_relic', scene)`

- [ ] **Step 2:** 运行测试

- [ ] **Step 3:** Commit "fix: implement tutorial EventBus callback handlers"

---

## Phase 4: 代码质量

### Task 8: getEffectiveStats 脏标记缓存

**Files:**
- Modify: `src/entities/Unit.ts`

**Changes:**

- [ ] **Step 1:** 添加缓存机制：
  ```typescript
  private _effectiveStatsCache: UnitStats | null = null;
  private _statsDirty: boolean = true;

  invalidateStats(): void { this._statsDirty = true; this._effectiveStatsCache = null; }
  ```

- [ ] **Step 2:** 在 statusEffects 变更点调用 invalidateStats()：
  - statusEffects.push() 后
  - statusEffects.splice() 后
  - synergyBonuses 赋值后

- [ ] **Step 3:** getEffectiveStats() 返回缓存（如果 !dirty）

- [ ] **Step 4:** 运行测试

- [ ] **Step 5:** Commit "perf: add dirty-flag cache to getEffectiveStats"

### Task 9: Date.now() ID 替换为递增计数器

**Files:**
- Create: `src/utils/id-generator.ts`
- Modify: `src/systems/ElementSystem.ts`
- Modify: `src/systems/RelicSystem.ts`
- Modify: `src/systems/SkillSystem.ts`

**Changes:**

- [ ] **Step 1:** 创建 `src/utils/id-generator.ts`：
  ```typescript
  let _nextId = 0;
  export function nextEffectId(prefix: string): string {
    return `${prefix}_${_nextId++}`;
  }
  ```

- [ ] **Step 2:** 替换所有 `Date.now()` ID 生成为 `nextEffectId()`

- [ ] **Step 3:** 运行测试

- [ ] **Step 4:** Commit "refactor: replace Date.now() IDs with incremental counter"

---

## 最终验证

- [ ] `npx tsc --noEmit` — 零错误
- [ ] `npm test` — 全部通过
- [ ] `npm run build` — 构建成功
- [ ] Commit all + push
