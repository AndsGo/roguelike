# 手机触摸交互审计报告

**项目**: rougelike — TypeScript + Phaser 3, 800×450 固定画布  
**审计日期**: 2026-06-10  
**审计范围**: `src/ui/*.ts` + `src/scenes/*.ts`  
**缩放基准**: iPhone SE 横屏 667×375, 缩放系数 ≈ 0.833 (375/450)  
**CSS 像素换算**: 游戏像素 × 0.833 = CSS 像素

---

## 一、触摸目标尺寸问题

### [P0] Button 最小高度 24px → 实际 CSS 仅 20px

**文件**: `src/ui/Button.ts` — 构造函数参数 `height: number = 40`  
**位置**: 多处调用，具体触发点：

| 调用位置 | 游戏尺寸(px) | CSS 像素(@0.833) | 问题 |
|---|---|---|---|
| `FormationPanel.ts:102` — AutoAssign按钮 | 100×24 | 83×20 | **高度仅20px，远低于44px阈值** |
| `FormationPanel.ts:110` — 关闭按钮(✕) | 24×24 | 20×20 | **面积400 CSS px²，极难点击** |
| `BattleScene.ts:942` — 继续按钮 | 160×32 | 133×27 | 高度27px，偏小 |
| `BattleScene.ts:946` — 设置按钮 | 160×32 | 133×27 | 高度27px，偏小 |
| `BattleScene.ts:954` — 放弃战斗 | 160×32 | 133×27 | 高度27px，偏小 |
| `MapScene.ts:450` — 阵型按钮 | 50×24 | 42×20 | 宽42px、高20px，双向不足 |
| `MainMenuScene.ts` — 所有主菜单按钮 | 各类×30 | ≈×25 | 高度25px，略低但可接受 |
| `ShopScene.ts` — 刷新/离开按钮 | 140×35 | 116×29 | 高度29px，偏小 |

**证据**: `Button.ts:24` 默认高度 40px（CSS=33px），可接受，但多处覆盖为 24px 乃至更小。  
**修复建议**: 对 800×450 画布，触摸友好最小高度应为 53 游戏像素（53×0.833≈44 CSS px）。建议在 `Button.ts` 增加 `HIT_PADDING` 扩展触摸区域，或强制最小点击高度为 53px。

---

### [P1] FormationPanel 英雄点击区域过小

**文件**: `src/ui/FormationPanel.ts:159`  
```typescript
const hitZone = this.scene.add.rectangle(x, y + 5, 60, 50, 0x000000, 0)
```
**游戏像素**: 60×50 → **CSS 像素**: 50×42  
宽度 50px 在可接受范围内，高度 42px 略低于 44px 门槛。  
但更大的问题：英雄 spacing 通过 `Math.min(55, ...)` 压缩，当英雄多时间距收缩，相邻点击区域可能重叠。  
**修复建议**: 固定最小 spacing 为 55，并将 hitZone 扩大至 70×55。

---

### [P1] SkillBar 技能槽尺寸边缘合格

**文件**: `src/ui/SkillBar.ts:12`  
```typescript
const SLOT_SIZE = 44;
```
**游戏像素**: 44×44 → **CSS 像素**: 37×37  
SLOT_SIZE=44 在游戏坐标刚好等于 iOS 44pt 标准，但缩放后实际 CSS 仅 37px，**低于标准**。  
**修复建议**: 将 SLOT_SIZE 提升至 53px（CSS≈44px），或至少确保手机端不缩放时独立使用 53px。

---

### [P1] UltimateBar 终极技能按钮偏小

**文件**: `src/ui/UltimateBar.ts:4`  
```typescript
const BUTTON_SIZE = 36;
```
**游戏像素**: 36×36 → **CSS 像素**: 30×30  
**严重低于** 44px 标准。终极技能是核心操作，必须在手指触摸下可靠触发。  
实际 hitArea 为 `BUTTON_SIZE+4 = 40px` 游戏像素 → CSS 33px，仍不足。  
**修复建议**: BUTTON_SIZE 提升至 48px，hitArea 扩至 56px。

---

### [P1] NodeTooltip 节点点击热区偏小

**文件**: `src/scenes/MapScene.ts:346`  
```typescript
const hitArea = this.add.circle(pos.x, pos.y, radius + 6)
```
boss 节点 radius=16，hitArea 半径=22 → 直径44游戏像素 → **CSS 37px**。  
普通节点 radius=12，hitArea 半径=18 → 直径36游戏像素 → **CSS 30px**，明显偏小。  
**修复建议**: hitArea 半径统一改为 `Math.max(radius + 10, 27)`（直径54px → CSS 45px）。

---

### [P2] ShopScene 英雄选择按钮高度不足

**文件**: `src/scenes/ShopScene.ts:69`  
```typescript
bg.fillRoundedRect(0, -10, 85, 22, 4);
// 对应 hit area:
btnContainer.setInteractive({ hitArea: new Phaser.Geom.Rectangle(0, -10, 85, 22), ... });
```
**游戏像素**: 85×22 → **CSS 像素**: 71×18  
高度仅 18px，购买前必须先选择英雄，此按钮极难触达。  
**修复建议**: 高度扩至 34px（CSS≈28px），或拉伸到 40px（CSS≈33px）。

---

### [P2] HeroDetailPopup 属性展开热区极小

**文件**: `src/ui/HeroDetailPopup.ts:181`  
```typescript
const hitZone = scene.add.rectangle(x + 60, y + 5, 140, 16, 0x000000, 0)
```
**游戏像素**: 140×16 → **CSS 像素**: 117×13  
高度仅 13px CSS，手指几乎无法点中。该热区用于展开属性加成明细，是重要信息，但在手机上实际不可用。  
**修复建议**: 高度扩至 32px（CSS≈27px）。

---

## 二、拖拽容差 <20px 问题

### [P1] 20px 移动容差对触摸手势过于严格

**文件**: `src/ui/Button.ts:136`  
```typescript
if (dx * dx + dy * dy < 400) { // < 20px movement
```
同样的 400 阈值出现在：  
- `src/ui/SkillBar.ts:185`  
- `src/ui/HeroCard.ts:141`  
- `src/ui/UltimateBar.ts:167`（改为 `dist < 20` 形式）  

**问题**: 触屏手指自然抖动通常 10–30px，且手指遮挡导致落点偏移比鼠标大。在低延迟或轻微滑动时，20px 容差会导致约 20–30% 的点击被误判为拖拽而丢失。  
**具体场景**: 技能栏点击技能发动 → 稍有抖动 → 技能未触发，玩家困惑。  
**修复建议**: 触摸输入的容差阈值提升至 40px（`dx*dx + dy*dy < 1600`）。可通过 `pointer.type === 'touch'` 分支处理，或统一改为更宽松的值。

---

## 三、Panel 滚动问题

### [P0] Panel 依赖 wheel 事件，手机端无法滚动内容

**文件**: `src/ui/Panel.ts:129`  
```typescript
scene.input.on('wheel', wheelHandler);
```
**问题**: 移动端浏览器不发送 `wheel` 事件，`pointerdown/move/up` 实现了替代拖拽，但存在以下严重问题：

**子问题 A — 拖拽阈值仅 4px**  
`Panel.ts:147`：
```typescript
if (Math.abs(dy) > 4) panelRef.isDragScrolling = true;
```
4px 阈值与子元素的点击判断冲突：用户点击 Panel 内的按钮时，手指轻微晃动 5px 就触发滚动，导致按钮点击失败。  
**建议**: 提升到至少 8–12px，并在 isDragScrolling=true 时阻止子元素的 pointerup 回调触发。

**子问题 B — 拖拽与子元素点击冲突无防护**  
面板滚动时，moveHandler 正确设置 `isDragScrolling=true`，但面板内子元素（Button、hitZone 等）的 `pointerup` 不感知这个状态，仍会触发点击回调。`MainMenuScene` 升级面板、`CodexPanel`、`AchievementPanel` 均用 Panel 承载可点击元素，均受此影响。  
**建议**: Panel 在 isDragScrolling=true 后，向 contentContainer 传播一个「消费掉此次 pointerup」信号；或通过返回值阻止子元素事件冒泡。

**子问题 C — 无惯性滚动**  
手指抬起后立即停止，缺乏动量感，在移动端体验很差。  
**建议**: 记录最后几帧的 dy 速度，抬手后以指数衰减模拟惯性。

---

## 四、Hover/pointerover 依赖问题（手机不可触达）

以下信息**在手机端完全不可见**，因为手机没有 hover 事件：

### [P0] SkillBar 技能详情 Tooltip 仅靠 hover 触发

**文件**: `src/ui/SkillBar.ts:189`  
```typescript
hitArea.on('pointerover', () => this.showTooltip());
hitArea.on('pointerout', () => this.hideTooltip());
```
**内容**: 技能冷却时间、目标类型、伤害倍率。这些是战斗决策的核心信息，手机玩家**完全无法查看**。  
**修复建议**: 增加长按（500ms）触发 tooltip，松手后保持 2s 再消失；或在技能槽内直接显示精简信息（CD 秒数）。

---

### [P0] UltimateBar 终极技能 Tooltip 仅靠 hover 触发

**文件**: `src/ui/UltimateBar.ts:169`  
```typescript
hitArea.on('pointerover', () => this.showTooltip());
hitArea.on('pointerout', () => this.hideTooltip());
```
**内容**: 技能名称、目标类型、伤害倍率。  
**修复建议**: 同上，长按触发。

---

### [P0] BattleHUD 羁绊图标 Tooltip 仅靠 hover 触发

**文件**: `src/ui/BattleHUD.ts:293`  
```typescript
hitZone.on('pointerover', () => tooltip.setAlpha(1));
hitZone.on('pointerout', () => tooltip.setAlpha(0));
```
**内容**: 羁绊名称和当前激活效果描述。玩家在战斗中无法了解自己拥有哪些羁绊加成。  
**修复建议**: 点击切换 tooltip 可见，再次点击或点击其他地方隐藏。

---

### [P1] MapScene 节点 Tooltip 仅靠 hover 触发

**文件**: `src/scenes/MapScene.ts:360-372`  
```typescript
hitArea.on('pointerover', () => {
  this.hideNodeTooltip();
  this.activeTooltip = new NodeTooltip(this, pos.x, pos.y, node);
  ...
});
hitArea.on('pointerout', () => {
  this.hideNodeTooltip();
  this.clearPathOverlay();
});
```
**内容**: 节点敌人组成、商店价格区间、事件风险等级，是规划路线的关键信息。  
**修复建议**: 改为首次 tap 显示 tooltip + 路径预览，第二次 tap（已可达节点）才进入节点。

---

### [P1] Button hover 状态视觉反馈依赖 pointerover

**文件**: `src/ui/Button.ts:49, 84`  
```typescript
this.on('pointerover', this.onHover, this);
this.on('pointerout', this.onOut, this);
```
`onHover` 触发亮色变化和 1.05x 缩放。手机端按钮无 hover 反馈，`pointerdown` 只有 darken+0.95x 效果，按下与未按的视觉差异较小。  
**修复建议**: 在 `pointerdown` 时叠加 hover 效果（使用 lighten 而非 darken 的混合），手机端按下反馈更明显。

---

### [P2] HeroDraftScene 卡片 hover 高亮仅靠 pointerover

**文件**: `src/scenes/HeroDraftScene.ts:250-263`  
```typescript
hitZone.on('pointerover', () => { bg.clear(); bg.fillStyle(0x334455, 0.95); ... });
hitZone.on('pointerout', () => { bg.clear(); bg.fillStyle(Theme.colors.panel, 0.9); ... });
```
手机端点击卡片时不会有高亮效果，选中状态仅靠金色边框表示，问题不严重但体验略差。  
**修复建议**: 在 pointerdown 时临时改变 bg 颜色，pointerup 后恢复（如已选中则保持选中色）。

---

## 五、右键/键盘快捷键依赖问题

### [P1] HeroCard 详情弹窗依赖右键

**文件**: `src/ui/HeroCard.ts:143-148`  
```typescript
if (pointer.rightButtonReleased()) {
  this.openDetailPopup();
} else {
  this.toggleDetails();
}
```
全属性详情弹窗（`HeroDetailPopup`）在手机端**完全不可达**，因为手机没有右键。左键/tap 只展开精简信息。  
**修复建议**: 增加长按（500ms）触发 `openDetailPopup()`，与 tap=展开精简/tap=收起 并存。

---

### [P1] HeroDraftScene 英雄详情依赖右键

**文件**: `src/scenes/HeroDraftScene.ts:241-247`  
```typescript
hitZone.on('pointerup', (pointer: Phaser.Input.Pointer) => {
  if (pointer.button === 2) {
    this.showHeroDetail(hero);
  }
});
```
在选将阶段，玩家无法在手机上查看英雄详情。选将是核心决策流程，缺少详情查看是**严重可用性问题**。  
**修复建议**: 增加独立的「详情」按钮（「i」图标，放在卡片右上角），或长按触发详情弹窗。

---

### [P0] BattleScene 技能快捷键 (1-8 / Q-R)、ESC、Tab 均无手机等效操作

**文件**: `src/scenes/BattleScene.ts:398-801`  
```typescript
// 技能快捷键
skillKeyNames.forEach((keyName, idx) => {
  const key = this.input.keyboard?.addKey(keyCode);
  key?.on('down', () => { this.hud.fireSkillByHotkey(idx + 1); });
});
// 终极技能快捷键 Q/W/E/R
ultKeyNames.forEach((keyName, idx) => { ... });
// ESC = 取消目标选择或暂停
const escKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
// Tab = 运行概览
const tabKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.TAB);
```
**问题**: 这些快捷键有对应的可点击 UI（技能栏可点击、暂停按钮可点击），因此功能本身可达，但：  
- ESC 取消目标模式没有手机可用替代（点击 dim 背景可取消，勉强可用）  
- Tab 概览无任何手机可达方式（`[概览]` 按钮在 MapScene 有，但战斗中没有）  
**修复建议**: 在战斗 HUD 顶部或侧边加「概览」入口按钮；目标选择模式下的取消提示文字从「ESC取消」改为「点击空白处取消」。

---

### [P2] SettingsScene 键位重绑定依赖实体键盘

**文件**: `src/scenes/SettingsScene.ts:166-170`  
```typescript
keyText.on('pointerup', () => {
  this.startRebind(action, keyText);
});
```
重绑定流程等待 `keydown` 事件，手机软键盘无法可靠触发 Phaser 的 `KeyboardEvent`，整个键位设置模块在手机上无意义。  
**修复建议**: 检测平台；手机端隐藏键位设置区域，或显示「此功能需外接键盘」提示。

---

## 六、拖拽交互问题

### [P1] MapScene 地图拖拽与浏览器原生手势冲突

**文件**: `src/scenes/MapScene.ts:504-540`  
```typescript
this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => { ... });
this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
  const dx = pointer.x - this.dragStartX;
  if (Math.abs(dx) > 5) { this.isDragging = true; }
  ...
});
```
**问题 A**: 拖拽触发阈值仅 5px，在手机上极易将节点 tap 误判为拖拽。  
**问题 B**: 仅处理横向滚动，无法防止浏览器捕获纵向滑动（在部分浏览器上，纵向滑动会导致页面滚动或下拉刷新，即使 Phaser 的 `preventDefaultOnPointer` 已设置）。  
**问题 C**: `isDragging` 重置依赖 `time.delayedCall(0, ...)` 异步重置，若节点 pointerup 与地图 pointerup 在同一帧内处理顺序错误，节点点击可能丢失（边缘条件）。  
**修复建议**:  
1. 将拖拽阈值提升至 12px  
2. 确认 `index.html` 中 `<meta name="viewport">` 配置了 `user-scalable=no`，并在 Phaser 配置中启用 `input.activePointers: 2`（防止双指缩放触发 pan 误判）

---

### [P1] FormationPanel 无拖拽重排，仅支持 tap-to-toggle

**文件**: `src/ui/FormationPanel.ts:159-165`  
当前为 tap 切换前排/后排，没有拖拽排序功能。在手机上操作直觉是拖拽英雄到目标列，当前 tap-toggle 方式虽然功能可达，但不符合移动端预期（心智模型不匹配）。  
**优先级**: P2（功能可达，体验问题）  
**修复建议**: 维持 tap-toggle 作为手机友好方案，在提示文字中明确说明「点击英雄切换前/后排」。

---

## 七、其他问题

### [P1] BattleScene 暂停按钮点击区过小

**文件**: `src/scenes/BattleScene.ts:772-775`  
```typescript
const pauseBtn = TextFactory.create(this, GAME_WIDTH - 15, 26, UI.battle.pauseBtn, 'small', {...})
  .setOrigin(1, 0).setInteractive({ useHandCursor: true });
pauseBtn.on('pointerup', () => this.togglePause());
```
暂停按钮是纯文本 GameObject，没有额外 hitArea padding，实际点击区域约为文字宽度×行高（估计 30×12 游戏像素 → CSS 25×10px）。**极难触达**。  
**修复建议**: 改用 Button 组件或增加透明矩形 hitArea（至少 60×36 游戏像素）。

---

### [P1] MainMenuScene 音频/设置按钮纯文本无足够热区

**文件**: `src/scenes/MainMenuScene.ts:145-169`  
BGM 按钮、SFX 按钮、设置按钮均为 `TextFactory.create(...).setInteractive()`，无额外 hitArea。文字尺寸约 12px 行高，CSS 约 10px，**完全不可靠**。  
**修复建议**: 每个按钮增加透明 Rectangle hitArea（60×36 游戏像素），或改用 Button 组件。

---

### [P2] BattleScene 威胁线按钮热区偏小

**文件**: `src/scenes/BattleScene.ts:730-742`  
```typescript
const threatHit = this.add.rectangle(GAME_WIDTH - 35, GAME_HEIGHT - 83, 64, 22, 0x000000, 0)
  .setInteractive({ useHandCursor: true });
```
**游戏像素**: 64×22 → **CSS 像素**: 53×18。高度 18px 不足。  
**修复建议**: 高度扩至 36px（CSS≈30px）。

---

### [P2] HeroDraftScene 未检测缩放后的显示问题

**文件**: `src/scenes/HeroDraftScene.ts:78-93`  
英雄卡片 CARD_W=74, CARD_H=100，10列布局。在 iPhone SE（375px CSS 宽度）下，10×(74×0.833+4×0.833)=10×65.4≈654px，**超出屏幕宽度**，最右侧卡片会被裁剪或触发横向滚动。  
**修复建议**: 根据实际设备宽度动态计算 COLS，或增加水平滚动容器。

---

### [P2] 长按/双击手势无任何处理，存在误触风险

全局扫描未发现任何 `longtap`、`doubletap` 事件监听。Phaser 3 默认将长按视为普通 pointerdown 持续。潜在问题：  
- 手机浏览器长按文本/图片会弹出系统上下文菜单，遮挡游戏 UI  
- Phaser canvas 通常已阻止默认行为，风险较低，但需确认配置  
**修复建议**: 在 Phaser 配置中设置 `input.touch.capture: true`，并在 `index.html` 中为 canvas 添加 `touch-action: none`。

---

## 问题汇总

| 优先级 | 数量 | 问题类别 |
|---|---|---|
| P0 | 5 | Panel wheel滚动手机失效、技能Tooltip不可达、终极技能Tooltip不可达、羁绊Tooltip不可达、键盘快捷键无替代方案 |
| P1 | 12 | Button最小尺寸过小（多处24px高）、SkillBar尺寸偏小、UltimateBar偏小、地图节点热区偏小、Shop英雄按钮不足、HeroDetailPopup属性展开热区极小、20px容差触摸丢失、右键依赖（HeroCard/HeroDraft）、地图拖拽冲突、暂停按钮无热区、音频按钮无热区、节点Tooltip仅hover |
| P2 | 7 | BattleHUD威胁线按钮偏小、HeroDraft滚动布局溢出、FormationPanel心智模型、长按/双击风险、hover卡片高亮、键位重绑定平台问题、BattleScene概览无手机入口 |
| **合计** | **24** | |

---

## 整体评分

**3 / 10**

**主要原因**:  
- 5个 P0 问题导致手机端部分核心功能（技能信息、滚动面板）**完全不可用**  
- 触摸目标尺寸问题广泛存在，20px 容差阈值不适合触摸场景  
- 大量信息依赖 hover 交互，在手机上形成「信息黑洞」  
- 代码基础架构较好（已有 pointerdown/move/up 滚动），改造难度不高，3–5 个主要修复可将评分提升至 6+

**最高优先修复路径**:  
1. Panel 滚动冲突 + 拖拽阈值 (P0)  
2. Tooltip 改为 tap/长按触发 (P0)  
3. Button 最小 hitArea 提升至 53px 高 (P1 批量修复)  
4. 右键→长按替代方案 (P1)  
5. 地图节点热区扩大 (P1)
