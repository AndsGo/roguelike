# Boss 召唤上限 + 战斗性能优化

**日期:** 2026-03-16

## 目标

1. 为 boss 阶段召唤添加安全上限，防止异常大量敌人生成
2. 优化多单位战斗场景的每帧性能开销

## 改动清单

### 1. 召唤安全上限 (MAX_ENEMIES = 10)

**文件：** `src/config/balance.ts`, `src/scenes/BattleScene.ts`

- 在 `balance.ts` 添加 `MAX_ENEMIES = 10` 常量
- 在 `onBossPhase` 回调的召唤循环前检查当前存活敌人数量
- 超过上限则跳过剩余召唤，保留 boss effect（狂暴/护盾/减伤）

### 2a. DamageNumber 节流

**文件：** `src/systems/StatusEffectSystem.ts`

- 检查 DoT 伤害是否走 DamageAccumulator 路径
- 确保 accumulator 存在时 DoT 不创建独立 DamageNumber

### 2b. StatusEffect tick 提前跳过

**文件：** `src/systems/StatusEffectSystem.ts`

- 对 `unit.statusEffects.length === 0` 的单位提前 return，跳过整个 tick 逻辑

### 2c. 召唤物分批入场

**文件：** `src/scenes/BattleScene.ts`

- 召唤物用 300ms stagger 延迟入场
- 配合从右侧滑入动画（复用 gauntlet wave transition 的 slide 模式）
- 延迟期间敌人不参与战斗（addUnit 在动画完成后调用）

## 测试计划

- [ ] 现有 boss-phase 测试通过
- [ ] 新增测试：超过 MAX_ENEMIES 时召唤被跳过
- [ ] 现有全部测试通过
- [ ] 手动验证 heart_of_the_forge 战斗流畅度
