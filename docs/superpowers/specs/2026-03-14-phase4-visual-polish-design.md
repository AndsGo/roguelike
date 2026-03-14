# Phase 4: 视觉打磨 + 平衡调整 设计规格 (v1.15.0)

> **目标:** 提升视觉品质（治疗闪光、idle 去同步、武器模板、状态提示）、文字清晰度（TextFactory + 全量迁移）、平衡微调（牧师/人类/暗影打击）。
>
> **范围:** 8 个独立特性，覆盖视觉效果、UI 基础设施、数值平衡。
>
> **前置:** v1.14.0 Phase 3 深度提升已完成

---

## 1. 治疗闪光效果

### 现状

`Unit.flashColor(color, duration)` 已存在但仅用于受伤（白闪）。治疗无视觉反馈。

### 方案

在 `Unit.heal()` 方法（line ~318）内部直接调用 `this.flashColor(0x44ff88, 120)`（绿色，120ms）。这是最简单的方案——`heal()` 方法已有 `this` 引用，无需通过 EventBus 查找 Unit。

注：`unit:heal` 事件的 payload 是 `{ sourceId, targetId, amount }` 而非 Unit 引用，通过 EventBus 实现需要额外的 Unit 查找逻辑，不如直接在 `heal()` 中调用。

### 代码变更

`src/entities/Unit.ts` — 在 `heal()` 方法中，治疗生效后添加闪光：

```typescript
heal(amount: number): void {
  // ...existing heal logic...
  this.flashColor(0x44ff88, 120); // 新增：绿色治疗闪光
}
```

如果 `heal()` 不存在而是通过 `takeDamage()` 的负伤害实现治疗，则在 `takeDamage()` 中 `actualDamage < 0` 时添加：
```typescript
if (actualDamage < 0) {
  this.flashColor(0x44ff88, 120);
}
```

无需 EventBus 监听或清理。

---

## 2. Idle 动画相位偏移

### 现状

`UnitAnimationSystem.playIdle(unit)` 对所有 Unit 同时启动相同的 idle tween（y±3px, 800ms cycle）。所有单位同步浮动。

### 方案

在 idle tween 配置中添加随机延迟：`delay: Math.random() * 400`。

### 代码变更

`src/systems/UnitAnimationSystem.ts` — 在 `playIdle()` 方法的 tween config 中添加 `delay` 属性：

```typescript
const randomDelay = Math.random() * 400;
const tween = scene.tweens.add({
  targets: unit,
  y: unit.y - 3,
  duration: 800,
  yoyo: true,
  repeat: -1,
  ease: 'Sine.easeInOut',
  delay: randomDelay, // 新增：随机相位偏移
  onStart: () => {
    // 重新捕获 baseY，防止延迟期间 unit 被重新定位导致 tween 目标错误
    tween.updateTo('y', unit.y - 3, true);
  },
});
```

注：`delay` 导致 tween 延迟启动，此时 unit.y 可能已被战斗定位系统修改。`onStart` 回调在 tween 实际开始时重新计算目标 y 值，避免 baseY 过期问题。

---

## 3. 武器模板差异化

### 现状

`WEAPON_TEMPLATES` 中 mage（3×3 orb）和 cleric（3×3 cross）在 2x 缩放下难以区分。

### 方案

1. **Mage**: 扩大 orb 为 4×3，下方加 1px 法杖线。颜色改为更饱和的紫蓝色。
2. **Cleric**: 扩大 cross 为 5×3（更宽的横杆）。颜色提亮为明亮金色。

### 代码变更

`src/data/pixel-templates.ts`:

**Mage weapon** — 修改 `WEAPON_TEMPLATES.mage` 数组，扩大 orb 并加法杖。现有 orb 位于右侧 cols 11-13，保持右侧放置：
```
原: 3×3 orb (WG at ~cols 11-13, rows 4-6)
新: 4×3 orb + staff line (cols 10-13, rows 4-7)
  row 4: WG at 11,12 (top of orb)
  row 5: WG at 10,11,12,13 (wide orb body)
  row 6: WG at 11,12 (bottom of orb)
  row 7: W at 12 (staff handle)
```

注：实现时需读取 `pixel-templates.ts` 中 mage 武器的实际数组，确认精确列位置后修改。上述列号基于 codebase 探索结果（现有 orb 在 cols 11-13），实现时以文件实际数据为准。

**Cleric weapon** — 修改 `WEAPON_TEMPLATES.cleric` 数组，扩大 cross。现有 cross 位于右侧 cols 12-14：
```
原: 3×3 cross (WG at ~cols 12-14, rows 4-6)
新: 5×3 wide cross (cols 10-14, rows 4-6)
  row 4: WG at 12 (top)
  row 5: WG at 10,11,12,13,14 (wide horizontal bar)
  row 6: WG at 12 (bottom)
```

**颜色变更** — 修改 `WEAPON_COLORS`:
```typescript
mage: { base: 0x7744ff, glow: 0xaa88ff },   // 原: 0x6688ff/0x99bbff → 更饱和紫蓝
cleric: { base: 0xffdd44, glow: 0xffff99 },  // 原: 0xffcc44/0xffee88 → 更明亮金色
```

---

## 4. 状态效果点击提示

### 现状

`Unit.updateStatusVisuals()` 显示最多 3 个状态图标（emoji）在单位上方，但无详细信息。

### 方案

点击状态图标区域弹出小面板，显示所有活跃状态效果的名称、数值、剩余时间。再次点击或点击其他地方关闭。

### UI 设计

```
┌─────────────────────┐
│ 🔥 灼烧  15/秒  2.3s │
│ ▼ 减防  -10防  4.1s  │
│ ♥ 回复  8/秒   3.0s  │
└─────────────────────┘
```

- 面板宽度: 130px, 高度自适应（每行 16px）
- 背景: `Theme.colors.panel` + 0.9 alpha
- 边框: `Theme.colors.panelBorder`
- 文字: `fontSize: '9px'`（使用 TextFactory `small` preset）
- 位置: 单位上方偏右，避免遮挡单位
- 深度: 500（高于单位，低于 modal）

### 代码变更

**`src/entities/Unit.ts`:**

1. 将 `statusIcons` 文本对象设为可交互：`statusIcons.setInteractive()`
2. 添加 `pointerup` 处理：
   - 如果已有 tooltip 打开 → 关闭（destroy）
   - 否则 → 创建 tooltip 面板

3. 新增 `private statusTooltip: Phaser.GameObjects.Container | null = null`
4. 新增 `showStatusTooltip()` 方法：
   - 创建 Container
   - 背景 Graphics (fillRoundedRect)
   - 遍历 `this.statusEffects`，每个效果一行文本
   - 效果名映射: `{ dot: '灼烧', hot: '回复', stun: '眩晕', buff: '增益', debuff: '减益', slow: '减速', taunt: '嘲讽' }`
   - 格式: `${icon} ${name}  ${value}/秒  ${remainingDuration.toFixed(1)}s`

5. 新增 `hideStatusTooltip()` 方法 — destroy container, set null
6. 在 `destroy()` 中调用 `hideStatusTooltip()`
7. 在 `updateStatusVisuals()` 中，当 `statusEffects` 为空时自动调用 `hideStatusTooltip()`（效果消失时关闭面板）
8. 关闭方式：再次点击 statusIcons 切换关闭（toggle pattern），而非 scene-wide pointerdown 监听（避免与 modal backdrop 冲突）

### i18n 变更

```typescript
battle: {
  // ...existing...
  statusDot: '灼烧',
  statusHot: '回复',
  statusStun: '眩晕',
  statusBuff: '增益',
  statusDebuff: '减益',
  statusSlow: '减速',
  statusTaunt: '嘲讽',
  statusPerSec: (v: number) => `${v}/秒`,
  statusRemaining: (s: number) => `${s.toFixed(1)}s`,
},
```

---

## 5. 牧师能量加速

### 现状

`UltimateSystem.update()` 对所有英雄以 2/秒 被动充能。牧师（cleric）和圣骑士（paladin）无差异化。

### 方案

牧师职业英雄被动充能速率 ×1.5（3/秒 vs 默认 2/秒），体现"持续治疗专家"定位。

### 代码变更

`src/systems/UltimateSystem.ts` — 被动充能使用本地常量 `PASSIVE_RATE`（非 `PASSIVE_ENERGY_PER_SECOND`）。

**方案 1（推荐 — 简单直接）：** 在 `update()` 中每帧查找 heroData：

```typescript
// 现有: const passiveGain = PASSIVE_RATE * (delta / 1000);
// 改为:
import heroesData from '../data/heroes.json';
import { CLERIC_ENERGY_MULTIPLIER } from '../constants';

const heroData = (heroesData as { id: string; class: string }[]).find(h => h.id === heroId);
const classMultiplier = heroData?.class === 'cleric' ? CLERIC_ENERGY_MULTIPLIER : 1.0;
const passiveGain = PASSIVE_RATE * classMultiplier * (delta / 1000);
```

heroesData 是静态 JSON 导入（内存中），`find()` 在 26 个英雄的数组上开销可忽略。

**方案 2（缓存）：** 在 `heroStates` Map 的 value 类型中添加 `classType: string`，在 `activate()` 时从 heroesData 查找并缓存。这需要修改 `activate()` 的输入参数（当前接受 `Hero[]`，需确认 Hero 是否有 class 字段）或在 `activate()` 内部自行查找。

推荐方案 1，避免修改 `activate()` 接口。

### 新常量

`src/config/balance.ts`:
```typescript
export const CLERIC_ENERGY_MULTIPLIER = 1.5;
```

---

## 6. 人类羁绊增强

### 现状

人类羁绊 2 人门槛仅 `+5%` 攻防，是最弱种族羁绊。

### 方案

2 人门槛提升至 `+10%` 攻防。

### 代码变更

`src/config/synergies.ts` — 修改 `synergy_human` 的 2 人门槛：

```typescript
// 原:
{ count: 2, description: '全属性+5%', effects: [{ type: 'stat_boost', stat: 'attack', value: 5 }, { type: 'stat_boost', stat: 'defense', value: 5 }] },
// 改为:
{ count: 2, description: '全属性+10%', effects: [{ type: 'stat_boost', stat: 'attack', value: 10 }, { type: 'stat_boost', stat: 'defense', value: 10 }] },
```

---

## 7. 暗影打击增强

### 现状

`shadow_strike`: baseDamage 30, scalingRatio 0.7, cooldown 10。远弱于同 CD 的 `backstab`（45+1.4x）。

### 方案

提升至 baseDamage 45, scalingRatio 1.0。仍低于 backstab（45+1.4x），但差距缩小至合理范围。暗影打击有 dark 元素加成作为差异化。

### 代码变更

`src/data/skills.json` — 修改 `shadow_strike`:

```json
{
  "id": "shadow_strike",
  "baseDamage": 45,
  "scalingRatio": 1.0,
  "description": "从暗影中发起致命一击，造成大量暗属性伤害"
}
```

仅修改 `baseDamage`（30→45）、`scalingRatio`（0.7→1.0）、`description`。其他字段不变。

---

## 8. 文字系统重构

### 现状

- `pixelArt: true` 导致文字模糊（nearest-neighbor 采样）
- 280 个 `scene.add.text()` 调用分布在 35 个文件中，全部使用内联样式
- `Theme.fonts` 定义了 4 个预设（title/body/small/damage）但从未使用
- 中文字符在 8px 字号下难以辨认

### 方案

1. 创建 `TextFactory` 工具类（基于现有 `Theme.fonts` 扩展）
2. 所有文字创建统一使用 `TextFactory.create()`，自动应用 `resolution: 2`
3. 将所有 280 个 `scene.add.text()` 迁移到 `TextFactory.create()`
4. 最小中文字号提升到 9px

### 8.1 TextFactory

新建 `src/ui/TextFactory.ts`:

```typescript
import Phaser from 'phaser';

export type TextPreset = 'title' | 'subtitle' | 'body' | 'label' | 'small' | 'tiny';

const PRESETS: Record<TextPreset, Phaser.Types.GameObjects.Text.TextStyle> = {
  title:    { fontSize: '20px', fontFamily: 'monospace', fontStyle: 'bold' },
  subtitle: { fontSize: '14px', fontFamily: 'monospace', fontStyle: 'bold' },
  body:     { fontSize: '11px', fontFamily: 'monospace' },
  label:    { fontSize: '10px', fontFamily: 'monospace' },
  small:    { fontSize: '9px',  fontFamily: 'monospace' },
  tiny:     { fontSize: '8px',  fontFamily: 'monospace' },
};

export class TextFactory {
  /**
   * 创建文本对象，自动应用 resolution:2 解决 pixelArt 模糊问题。
   * @param preset 预设样式名
   * @param overrides 可选覆盖（color, align, wordWrap 等）
   */
  static create(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    preset: TextPreset = 'body',
    overrides?: Partial<Phaser.Types.GameObjects.Text.TextStyle>,
  ): Phaser.GameObjects.Text {
    const style = { ...PRESETS[preset], ...overrides };
    const textObj = scene.add.text(x, y, text, style);
    textObj.setResolution(2);
    // pixelArt:true 全局设置 nearest-neighbor 滤镜，会导致文字模糊。
    // setResolution(2) 仅提高内部画布分辨率，还需将纹理滤镜覆盖为 LINEAR 才能真正消除锯齿。
    textObj.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
    return textObj;
  }
}
```

### 8.2 迁移规则

将现有 `scene.add.text()` 映射到 TextFactory 预设：

| 现有 fontSize | 对应 preset | 备注 |
|--------------|-------------|------|
| 18-24px | `title` | 场景标题 |
| 14-16px | `subtitle` | 分节标题 |
| 11-12px | `body` | 正文、描述 |
| 10px | `label` | 属性值、标签 |
| 9px | `small` | 提示文字 |
| 8px | `tiny` | 仅用于数字/符号 |

迁移模式：
```typescript
// 迁移前:
this.add.text(x, y, text, { fontSize: '11px', color: '#aaa', fontFamily: 'monospace' })

// 迁移后:
TextFactory.create(this, x, y, text, 'body', { color: '#aaa' })
```

保留 `.setOrigin()` 等链式调用（TextFactory.create 返回 Text 对象）。

### 8.3 Theme.fonts 处理

`Theme.fonts` 的 4 个预设与 TextFactory 重叠。迁移完成后，移除 `Theme.fonts`（如无其他引用）或保留为 TextFactory 的别名。

### 8.4 迁移分批

按文件分批迁移，每批 3-5 个文件，每批提交一次。优先迁移高频文件。

**批次建议：**
1. UI 组件: Button, Panel, HeroCard, HealthBar, DamageNumber (5 files, ~14 calls)
2. 战斗 UI: BattleHUD, SkillBar, UltimateBar, BattleEffects, Unit (5 files, ~26 calls)
3. 地图/商店: MapScene, MapRenderer, ShopScene, NodeTooltip (4 files, ~34 calls)
4. 主菜单/选人: MainMenuScene, HeroDraftScene, SettingsScene, BootScene (4 files, ~52 calls)
5. 事件/休息/奖励: EventScene, RestScene, RewardScene, BaseEndScene (4 files, ~36 calls)
6. 弹窗/面板: HeroDetailPopup, CodexPanel, CodexDetailPopup, AchievementPanel (4 files, ~44 calls)
7. 综合面板: HelpPanel, BuildReviewPanel, RunOverviewPanel, RunEndPanel, FormationPanel (5 files, ~46 calls)
8. 系统: TutorialSystem, GameOverScene, VictoryScene (3 files, ~28 calls)

注：每批 call 数为估算值。实际实现时以 `grep -c "\.add\.text("` 逐文件计数为准。总计约 280 calls。

---

## 9. 数据变更汇总

| 文件 | 变更 |
|------|------|
| `src/ui/TextFactory.ts` | 新建：文本预设工厂 |
| `src/scenes/BattleScene.ts` | 治疗闪光监听 + 文字迁移 |
| `src/systems/UnitAnimationSystem.ts` | idle delay 随机偏移 |
| `src/data/pixel-templates.ts` | mage/cleric 武器模板 + 颜色 |
| `src/entities/Unit.ts` | 状态提示面板 + 文字迁移 |
| `src/systems/UltimateSystem.ts` | 牧师能量加速 |
| `src/config/synergies.ts` | 人类羁绊 5→10 |
| `src/data/skills.json` | shadow_strike 增强 |
| `src/config/balance.ts` | +1 常量 (CLERIC_ENERGY_MULTIPLIER) |
| `src/i18n.ts` | 状态效果名称字符串 |
| 35 个文件 | scene.add.text → TextFactory.create 迁移 |

---

## 10. 测试策略

### 新增测试

- **`tests/ui/TextFactory.test.ts`** — 验证 create 返回 Text 对象、resolution=2、各 preset 字号正确、overrides 生效
- **`tests/systems/idle-phase-offset.test.ts`** — 验证 idle tween 有 delay 属性
- **`tests/data/phase4-balance.test.ts`** — 验证 shadow_strike baseDamage=45/scalingRatio=1.0、人类羁绊 2 人门槛 value=10、CLERIC_ENERGY_MULTIPLIER=1.5

### 现有测试

- 文字迁移不改变行为，现有场景测试应继续通过
- ShopScene 测试（synergy bar）应继续通过
