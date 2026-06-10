# UX 专项评审报告
**项目：** 自走棋 Roguelike（Phaser 3 + TypeScript）
**评审日期：** 2026-06-10
**评审人：** UX Designer（CCGS）
**评审范围：** 信息架构、交互流畅度、反馈系统、视觉信息设计、可访问性、引导与帮助
**前置声明：** 本次评审聚焦**当前仍存在**的问题。mobile-optimization-plan 三阶段（长按 tooltip、textScale 1.25、触摸热区、按需加载、Panel 拖拽、概览按钮等）已实施并验证通过，不重复计分。

---

## 总评分：**58 / 100**（各维度加权）

| 维度 | 评分 | 权重 |
|------|------|------|
| 信息架构 | 6 / 10 | ×20% |
| 交互流畅度 | 6 / 10 | ×20% |
| 反馈系统 | 7 / 10 | ×15% |
| 视觉信息设计 | 6 / 10 | ×20% |
| 可访问性 | 5 / 10 | ×15% |
| 引导与帮助 | 5 / 10 | ×10% |

加权总分 = 6×0.2 + 6×0.2 + 7×0.15 + 6×0.2 + 5×0.15 + 5×0.1 = **5.8 → 58分（百分制）**

---

## 一、信息架构  评分：6 / 10

### 优点
- ShopScene 已实现「先选英雄，再看对比」的流程：装备卡片在选定英雄后实时计算属性差值（`ShopScene.ts:270-338`），▲/▼ 箭头直观。
- HeroDraftScene 底部实时羁绊预览（`synergyText`，`HeroDraftScene.ts:135-137`）让玩家在选卡时即时看到羁绊进度。
- BattleHUD 两侧 portrait 列（英雄左、敌方右）遵循一致空间映射，与战场位置对应。
- HelpPanel 包含元素克制表、羁绊详情、英雄解锁条件，内容完整（`HelpPanel.ts`全文）。

### 问题

**IA-1 / 中等：HeroDraft 卡片信息过载但同时缺失关键决策信息**
- 每张 74×100px 的卡片内塞了：名字（small 11px）、职业/元素简写（tiny 10px）、攻/防（tiny 10px）、速/攻速（tiny 10px）共 4 行文本。玩家在选卡阶段最需要的是「这张牌会触发什么羁绊」，而卡片上没有种族/职业的中文全称——只有 ROLE_SHORT（坦/战/射等单字）（`HeroDraftScene.ts:34-36,249-254`）。
- 截图 `verify-02-herodraft.png` 可见：大量文字挤在 74px 宽的空间里，属性数字（HP:820, 攻:38）对选卡决策的优先级远低于羁绊标签。
- **建议：** 把卡片分为"摘要层"（名字 + 种族/职业标签 + 元素图标）和"展开层"（属性数字进 detail popup）；或至少把 `RACE_NAMES[hero.race]` 显示在卡片上替代纯数字属性。

**IA-2 / 低：商店缺乏"当前已装备"可视化**
- 选中英雄后，compareText 只在有装备差时显示"vs 旧装备名 ▲▼"，但玩家无法直接看到该英雄当前的完整装备栏（3 个槽的状态）。须心算"到底是哪个槽被替换了"。
- `ShopScene.ts:286` 的 vsEmpty = "空槽" 文案只显示于无装备时，空槽标识不显眼。
- 截图 `verify-03-battle-hud.png`（商店截图）：英雄按钮切换后比较文本变小不突出。
- **建议：** 在英雄选择栏下方展示当前英雄的 3 槽微型装备列表（名称 + 稀有度色点），占高约 12px 即可。

**IA-3 / 中等：跨场景 gold 显示不一致**
- MainMenu：无金币显示（无需）。Map：右上显示金币。Battle：右上显示金币（`BattleScene` 直接在 HUD 之外的 TextFactory 显示，`BattleHUD.ts` 无 goldText）。Shop：右上显示金币。
- 地图截图 `e2e-2026-06-08-03-map.png` 右上角金币"80G"与商店截图的位置相同，一致性OK；但战斗结束奖励页（`e2e-2026-06-08-04-reward.png`）底部"总金币:106"字体偏小，字号为 body(13px)，与其他页面的 gold 标签（label 11px bold）风格混用。
- **建议：** 统一奖励页金币展示为与全局 goldText 同一字号/颜色（Theme.colors.gold + subtitle）。

**IA-4 / 中等：MapScene 节点信息仅靠颜色区分类型**
- 地图节点颜色由 `getNodeColor()` 驱动（battle=红、shop=绿、event=紫等），色盲模式有 COLORBLIND_NODE 替换调色板，这一点好。
- 但节点上的**文字标签**在地图截图中极小（tiny 10px × 0.834 缩放 ≈ 8.3px 渲染）；截图 `e2e-2026-06-08-03-map.png` 中多数节点仅见圆圈和连线，标签肉眼难辨。
- 图鉴/遭遇记录仅在 MetaManager 内部维护，地图节点 tooltip（NodeTooltip）对首次见到的敌人没有"未遭遇"提示，玩家无法提前规划阵容。
- **建议（IA-4a）：** 节点类型文字标签至少用 small(11px)，或用固定图标 + 颜色双编码。
- **建议（IA-4b）：** 精英/Boss 节点 tooltip 增加"敌人预览"（已知：名称+简要属性）。

---

## 二、交互流畅度  评分：6 / 10

### 优点
- PressInteraction 统一封装了 hover/长按/右键手势（`PressInteraction.ts`），tap 容差在触摸设备上自动放宽，技能槽、英雄卡片、羁绊按钮均已接入。
- Button 组件有 drag-to-cancel 保护（`Button.ts:147-153`），最小触摸热区 52px（`Button.ts:14`）。
- ShopScene 的"购买后立刻更新金币/可购状态"（`ShopScene.ts:391-397`）和渐隐售出反馈动效是良好实践。

### 问题

**IF-1 / 高：HeroDraft 无"取消选择"的明确视觉操作路径**
- 玩家选中英雄后，卡片边框变黄（`HeroDraftScene.ts:331-335`），但没有任何视觉提示"再次点击可取消"；新手会不确定点击是否有效，或误以为需要右键。
- 与之相比，"已选 0/3"的文本计数是唯一的间接反馈，不够直观。
- **建议：** 选中卡片右上角加小"×"标记（可复用 closeHit 模式），或在卡片中央叠加"已选"半透明 badge（1-4 字，标明选序）。

**IF-2 / 高：Shop 买装备给英雄的操作需要 3 步但只有文字提示**
- 当前流程：① 必须先点英雄（hero button）→ ② 再看比较文本 → ③ 点购买。
- 若玩家直接点"购买"而未选英雄，触发 sfx_error + `showMessage("请先选择英雄")` 飘字（`ShopScene.ts:348-350`）。这是被动报错而非主动引导。
- 截图 `e2e-2026-06-08-05-shop.png`（首次进入商店教程截图）中，tutorial tooltip "用金币购买装备来提升英雄的属性" 没有提示"先选英雄"这一前提步骤。
- **建议：** 首次进入商店时，高亮英雄选择区域（spotlight 教程已有机制，参考 `TutorialSystem.ts:193`）并更新 first_shop 提示文案为"先点击上方英雄，再选购装备"。中期方案：未选英雄时购买按钮显示为禁用态（灰色）而非可点击状态。

**IF-3 / 中等：Formation Panel 拖动英雄分配前/后排操作路径不明**
- `FormationPanel.ts` 显示英雄 chibi 图像，并有"自动分配"按钮，但代码中没有 drag-to-move 逻辑——英雄分配依靠点击 chibi 再点击目标列（或通过自动分配按钮）。
- 截图 `verify-05-formation.png`：前排/后排分界线（竖线）存在，但玩家无明显操作引导（文案只有"前排英雄更容易被近战敌人攻击"）。如果玩家不知道可以点击，默认只会按自动分配按钮。
- **建议：** 在 chibi 下方加短文案"点击切换列"，或给当前高亮的 chibi 加闪烁 border 表示可选状态。

**IF-4 / 低：BattleScene 暂停后无明显"当前队伍概况"汇总**
- 暂停菜单（ESC）有"继续/返回地图/设置"，但没有当前英雄 HP/技能冷却的快览——需要关闭暂停后才能重新看 HUD。
- 这对移动端玩家尤为明显，因为"概览"（Tab）按钮虽已实现（mobile-optimization-plan P0-4 已修复），但概览面板只在游戏进行中可见，暂停状态中访问路径不明。
- **建议：** 暂停弹窗内嵌入英雄 HP 条（简化版）。

**IF-5 / 低：技能升级/进化入口被埋**
- SkillEvolutionPanel 入口在 MapScene 的英雄 detail popup 内（点击 chibi → detail → skill tab → evolution button）。这是一个重要决策但操作步骤深达 3 层。
- **建议：** 在 MapScene 底部英雄列如有可进化技能时，用角标（如"!"）标注，降低发现成本。

---

## 三、反馈系统  评分：7 / 10

### 优点
- BattleHUD HP 条颜色根据血量三段变色（绿→橙→红，`BattleHUD.ts:400-403`），低血量英雄名字闪烁（`BattleHUD.ts:141-148`），stun 状态有"!"图标（`BattleHUD.ts:432-443`）。
- 技能槽就绪状态有 pulse glow 动画（`SkillBar.ts:256-263`），queue badge 显示排队序号（`SkillBar.ts:244-248`）。
- 购买/出错/卖出有音效+飘字双通道反馈（`ShopScene.ts:349,368`）。
- 羁绊激活时底部状态栏实时更新（`ShopScene.ts:104-175`）。
- Combo 计数有缩放动画+淡出（`BattleHUD.ts:306-328`）。

### 问题

**FB-1 / 高：元素反应发生时无 HUD 层持久提示**
- 元素反应（点燃/冻结/雷击/腐蚀）通过 BattleEffects 产生飞字（"点燃！"等），但飞字消失后没有留存标记。玩家无法在战斗中持续感知"敌方当前叠了哪个元素状态"。
- `BattleHUD.ts` 的敌方 portrait 栏只显示：名字、HP 条、boss/elite 徽章、element dot。没有 debuff/status 的实时图标。
- 对比友方 portrait：stun 用"!"标注（`BattleHUD.ts:432`），但元素 DoT（点燃/冻结等）无对应图标。
- **建议：** 敌方 portrait 右侧加 1-2 个小状态图标（复用 elementSymbol: ♦◆⚡●☆，`Theme.ts:143-147`）显示当前叠加的元素状态，自动跟随 StatusEffectSystem 更新。工作量约 M（需接 EventBus）。

**FB-2 / 中等：技能释放失败（目标不可达/冷却中）没有清晰反馈**
- 玩家点击技能槽（slot.tryFire），若 `isReady=false` 直接返回 false（`SkillBar.ts:272`），无任何视觉或音效反馈。
- 玩家不知道是"技能在冷却"还是"目标无效"还是"系统卡了"。
- `sfx_error` 仅用于金币不足，没有复用到技能槽。
- **建议：** tryFire 失败时播 sfx_error 并做一次槽的快速 shake tween（2-3px 水平抖动，50ms），明确传达"操作被拒"。

**FB-3 / 中等：BattleHUD 的"统计"面板（[统计]按钮）可发现性低**
- `statsBtn` 使用 '[统计]' 文本，small 字号，灰色（`BattleHUD.ts:85-92`），放在右下角但与[威胁线]等其他控件并列，视觉分量极低。
- 截图 `verify-04-battle-hud.png` 右下角确实存在这两个标签，但在战斗高动态场景下几乎不可见。
- **建议：** 将统计/威胁线改为图标按钮（用简单的像素图），或统一收入一个可折叠的"设置托盘"。

**FB-4 / 低：等级提升/英雄解锁的场景间反馈缺失**
- 战斗结束后进入奖励页，经验 +56 会导致英雄升级，但升级的 stat 提升没有在奖励页展示（只在详情 popup 中可见）。
- `e2e-2026-06-08-04-reward.png`：奖励页仅显示"金币+26 经验+56 存活:3 战斗统计表"，没有"铁甲骑士升至 Lv.2！攻击+X 防御+Y"的高亮行。
- **建议：** 奖励页在经验导致升级时，增加升级行（绿色高亮，格式：英雄名 Lv.N→Lv.N+1 ▲攻击+X）。

---

## 四、视觉信息设计  评分：6 / 10

### 优点
- 模态层级体系清晰：backdrop depth 799 → panel 800 → close button 801 → detail popup 802+（CLAUDE.md 已记录为规范，各组件遵守）。
- 商店卡片稀有度颜色边框（`ShopScene.ts:189-197`）+ 左侧颜色圆点双重编码，稀有度可读性好。
- 战斗 HUD 分区清晰：英雄左上、敌方右上、速度顶中、技能栏底部、羁绊图标左下、Combo 右下。

### 问题

**VD-1 / 高：tiny(10px)/small(11px) 大量用于决策性内容**
- TextFactory PRESETS：tiny=10px、small=11px（`TextFactory.ts:13-14`）。
- 在默认 textScale=1（PC 800×450）下，800×450 canvas 里 10px 字体在桌面 1080p 显示器上（缩放后约 22px CSS px）还能接受；但整个 HelpPanel 的羁绊详情列、HeroDraft 属性行、BattleHUD 单位名（`BattleHUD.ts:134` 用 small）都在同一字号，导致桌面也存在信息密度过高问题。
- HelpPanel 截图 `e2e-2026-06-08-09-help.png`：羁绊效果一行约 80 个字符挤在 480px 宽度内（tiny 字号），扫读极慢。
- **建议：** HelpPanel 的羁绊/机制条目改为可展开的 accordion，默认折叠；扫读时只看名字+一行 threshold，展开看详细 description。

**VD-2 / 高：BattleHUD 的信息密度在 8 英雄（4+4）场景下严重超载**
- heroPortraits 每个 portrait 间距 22px（`BattleHUD.ts:116`），8 个英雄 = 176px；再加羁绊图标区，左侧 HUD 高度会超过可视区域高度的 40%。
- 截图 `verify-04-battle-hud.png`（仅 3 英雄）左侧已有 3 行 portrait + 1 个羁绊圆圈，纵向占满 HUD 顶部 ~80px；8 英雄时约需 200px（视口高度 450px 的 44%），严重挤压战场可见区域。
- **建议：** portrait 间距从 22px 收窄至 16px 并使 mini HP 条水平扩展替代垂直排列；或超过 5 英雄时切换为 2 列 portrait 布局（每列宽 52px）。

**VD-3 / 中等：状态栏颜色与禁用态颜色冲突**
- 功能禁用时 Button 背景变为 0x555555（`Button.ts:163`）。主菜单"继续"按钮在没有存档时是绿色，设置页"重置教程"完成后变灰——这两种灰的语义（禁用 vs 非紧急操作）视觉上无法区分。
- **建议：** 功能性禁用改为半透明（alpha:0.4）保留颜色语义，仅降低亮度而非变灰。

**VD-4 / 中等：MapScene 底部英雄栏的 HP 条过细且无数值**
- MapScene 底部英雄列 HP 条（截图 `verify-05-formation.png` 可见，高度约 3px）极细，满血/低血差异在小屏下不易察觉。没有数字（如"820/820"），也没有颜色三段制。
- **建议：** HP 条高度至少 5px，颜色跟随 BattleHUD 的三段制（绿/橙/红）；低于 30% 时加小数字"XX%"标注。

**VD-5 / 低：奖励页信息层级不清晰**
- `e2e-2026-06-08-04-reward.png`："胜利！"→"金币+26"→"经验+56"→"存活:3"→英雄列表→战斗统计表→"总金币:106"→"继续"，7 层信息用同一视觉风格堆叠，没有分组/分割线。
- **建议：** 加两个分隔区块："本场奖励"（金币+经验）和"队伍状态"（英雄HP）+ 可折叠的"战斗详情"。

**VD-6 / 低：Settings 页键位绑定区可读性差**
- 设置截图 `e2e-2026-06-08-08-settings.png`：键位区 4 列 small 字号（"技能1 [1] 技能2 [2]..."），列间距 110px，使用左对齐混合布局，扫读时字母顺序不直觉。
- **建议：** 键位区改为 2 列（标签左对齐，当前键值右对齐，固定宽度），行高从 16px 提至 20px。

---

## 五、可访问性  评分：5 / 10

### 优点
- 已实现色盲模式（COLORBLIND_ELEMENT/RARITY/ROLE/NODE 四张调色表，`Theme.ts:49-84`）。
- 元素具有符号双编码（Theme.colors.elementSymbol，`Theme.ts:143-147`），color+symbol 组合，色盲友好。
- 减少动效开关（reduceMotion）已有设置项（`SettingsScene.ts:106-117`）。
- textScale 三档（100%/125%/150%），触摸设备默认 1.25，已实施（`Theme.ts:30-32`）。
- Button 最小热区 52px 自适应（`Button.ts:14`）。

### 问题

**AC-1 / 高：reduceMotion 只定义了标志，实际消费点稀少**
- `reduceMotion` 在 Theme 中存储，Settings 中可切换，但实际检查 `getAccessibility().reduceMotion` 的代码极少：
  - BattleHUD 有 HP 低血量闪烁 tween（`BattleHUD.ts:141-148`），未检查 reduceMotion。
  - Boss 场景入场 vignette 有 strokeRect 闪烁（`BattleScene.ts:214-219`），未检查。
  - Button hover 的 scale tween（`Button.ts:98-105`）未检查。
  - SkillBar pulse glow tween（`SkillBar.ts:256-263`）未检查。
- **建议：** 在 tweens.add 之前统一检查 `getAccessibility().reduceMotion`，为 true 时 duration=0 或直接 setAlpha。可封装 `motionSafe(scene, tweenConfig)` 工具函数。预估工作量：S（grep+统一改法）。

**AC-2 / 高：色盲模式不覆盖 HP 条颜色**
- HP 条颜色硬编码 0x44ff44（绿）/ 0xffaa00（橙）/ 0xff4444（红）（`BattleHUD.ts:400-403`）。这是经典红绿色盲盲区（deuteranopia/protanopia）。
- `Theme.colors.health` 已定义了 health 颜色集（`Theme.ts:175-182`），但 BattleHUD 直接用字面量而非 `Theme.colors.health.high` 等引用，导致色盲模式切换后 HP 条颜色不变。
- Unit HP 条（battle field 上方的 HP 条）同样硬编码（需检查 `Unit.ts`）。
- **建议：** BattleHUD 的 HP 颜色改为读取 Theme.colors.health；并在 COLORBLIND 情境下，将 health.high 改为蓝色（0x4488ff），health.low 改为橙色（0xff9933），以彻底区分红绿。工作量：S。

**AC-3 / 中等：色盲模式开关后需要重启场景才生效**
- `setAccessibility` 更新了内存缓存并写入 localStorage，但已渲染的 Graphics/Text 对象不会自动重绘。
- `getNodeColor()`/`getRarityColor()` 等会在下次 create() 时生效，但当前场景内的 chibi 纹理（`getOrCreateTexture`）是 session 级缓存，切换色盲模式后缓存的纹理不会重新生成。
- **建议：** 色盲模式切换后强制 `this.scene.restart()`（类似 textScale 切换的处理方式）；或在 setAccessibility 中清除 texture 缓存。工作量：S。

**AC-4 / 中等：节点类型依赖单一颜色区分，无形状/图案备用编码**
- 地图节点目前是同形（圆）+ 不同颜色（`MapRenderer.ts`）。色盲模式虽有 COLORBLIND_NODE 调色板，但若调色板颜色之间对比度仍不足，玩家依然无法区分节点类型。
- W3C WCAG 要求信息不能仅依赖颜色。
- **建议：** 节点内部加微型像素图标（剑=battle、金币=shop、星=event、心=rest），可复用 PixelIcons 模式，工作量 M。

**AC-5 / 低：HelpPanel 关闭按钮（`[关闭]`）热区仅 80×24px**
- `HelpPanel.ts:189`：closeHit = rectangle 80×24。80px 满足桌面，但在触摸设备上低于 52px 最小高度标准。
- **建议：** 改为 `new Button(...)` 组件，自动获得 52px 最小热区。工作量：XS。

**AC-6 / 低：Settings 页键位区的 pointerup 绑定目标是裸 Text 对象**
- `SettingsScene.ts:175`：`keyText.on('pointerup', ...)` 直接在 Text 对象上监听。Text 的 interactive 区域等于文字渲染区（约 20-30px），低于 touch target 要求。
- **建议：** 改为在 Text 外围加 zone 或改 Button 组件。工作量：XS。

---

## 六、引导与帮助  评分：5 / 10

### 优点
- TutorialSystem 10 条 tip 覆盖核心场景（首次战斗/商店/事件/休息/地图/元素反应/羁绊/遗物/精英/Boss）。
- 支持 spotlight 高亮（4 面暗色遮罩 + 蓝色边框），比全屏遮罩更具上下文（`TutorialSystem.ts:193-255`）。
- 8 秒自动关闭（`TutorialSystem.ts:258`），不强制打断。
- Settings 页有"重置教程"按钮（`SettingsScene.ts:71-85`）。

### 问题

**GH-1 / 高：HelpPanel 只在主菜单可访问，游戏中无入口**
- 代码中 HelpPanel 只在 `MainMenuScene.ts:137,441` 创建。地图/商店/战斗场景中没有"帮助"入口。
- 对新手而言，遇到元素克制问题时需要：退出当前冒险 → 主菜单 → 点帮助 → 查参考 → 再开局。这条路径代价极高（丢失进度风险）。
- **建议：** 在 MapScene 的顶部工具栏或 BattleScene 的暂停菜单增加"帮助"快捷入口（触发同一 HelpPanel），工作量 S。

**GH-2 / 高：first_shop 教程提示文案与实际操作流程脱节**
- 截图 `e2e-2026-06-08-05-shop.png`：教程弹窗文案"用金币购买装备来提升英雄的属性"，highlight 区域是整个商店物品区（`TutorialSystem.ts:45-46`），但正确操作顺序是"先选英雄"，而"选择英雄"区域不在 highlight 内。
- 玩家按照教程点"购买"→ 错误提示 sfx_error + "请先选择英雄"→ 困惑。
- **建议：** first_shop tip 的 highlight 改为 hero 选择区（约 `{x:20, y:50, width:400, height:30}`），文案改为"先选择上方英雄，再购买装备"；或拆分为 first_shop_1（选英雄）+ first_shop_2（购买）两步引导。

**GH-3 / 中等：TutorialSystem 没有"再次查看"机制**
- Tips 一旦 markSeen 就永久隐藏，Settings 的"重置教程"是全量重置（`TutorialSystem.resetTips()`），没有单条重放选项。
- 玩家遇到新的羁绊组合想回顾时，只能打开 HelpPanel 手动查找，而 HelpPanel 的羁绊描述是静态表格，缺乏"你的当前阵容羁绊分析"这种上下文化呈现。
- **建议（中期）：** MapScene 的阵容区增加"当前羁绊详情"悬浮面板（点击活跃羁绊圆圈 → 展示该羁绊的 threshold + 当前已激活 tier + 下一 tier 还需几人）。这比静态帮助文档更有引导价值，工作量 M。

**GH-4 / 中等：HeroDraft 无羁绊规划引导**
- 选卡阶段的 synergyText（`HeroDraftScene.ts:135-137`）已显示当前已选羁绊，但没有前瞻性提示（如"再选 1 名精灵族可激活精灵优雅 2 人"）。
- 新手在 26 张卡的海量选项面前缺乏决策支撑，很可能随机选卡。
- **建议：** synergyText 区扩展为"当前羁绊进度"，格式：[激活项] 绿色 | [距离激活差 1 人的羁绊] 金色 + "差 1 人"角标。工作量 M。

**GH-5 / 低：tutorial tip 面板固定尺寸可能被游戏内容遮挡**
- TutorialSystem.renderTip 的 panelWidth=320, panelHeight=120 固定（`TutorialSystem.ts:187-188`）。
- 在 ShopScene 进入时，spotlight 高亮区 `{x:100, y:100, width:600, height:250}` 高度较大，panel 位置计算（`panelAbove = hl.y > panelHeight + 20`，此处 hl.y=100 < 140，panel 应在下方）会把 panel 放在 y=100+250+120/2+10 = 420，已超出 450 视口底边，导致教程面板超出屏幕。
- 截图 `e2e-2026-06-08-05-shop.png` 确认了该 tip 框出现在底部被截断的位置。
- **建议：** panelCy 做 clamp：`Math.min(panelCy, vb.y + vb.h - panelHeight / 2 - 10)`。工作量：XS。

---

## 七、优化建议汇总

### P0 — 必须修复（影响核心可用性或正确性）

| ID | 问题 | 位置 | 估算工作量 |
|----|------|------|-----------|
| P0-1 | reduceMotion 标志几乎未被消费——HP 闪烁、Boss 入场、Button 动画均未检查（AC-1） | BattleHUD.ts, Button.ts, SkillBar.ts | S（0.5天） |
| P0-2 | HP 条颜色硬编码绕过色盲模式，绿/红色盲无法区分满血与低血（AC-2） | BattleHUD.ts:400-403, 需核查 Unit.ts | S（0.5天） |
| P0-3 | first_shop 教程 highlight 和文案引导玩家直接购买却未先选英雄，导致必然报错（GH-2） | TutorialSystem.ts:45-46, ShopScene.ts | XS（2小时） |
| P0-4 | Tutorial 面板 panelCy 无 clamp，ShopScene 进入时 tip 框超出视口底边（GH-5） | TutorialSystem.ts:226 | XS（1小时） |

### P1 — 应修复（显著影响决策效率或新手体验）

| ID | 问题 | 位置 | 估算工作量 |
|----|------|------|-----------|
| P1-1 | HelpPanel 仅在主菜单可访问，游戏中途查阅参考需退出冒险（GH-1） | MainMenuScene.ts, MapScene.ts, BattleScene.ts | S（1天） |
| P1-2 | HeroDraft 卡片缺乏种族/职业文字标签，属性数字比羁绊信息更显著（IA-1） | HeroDraftScene.ts:168-207 | M（1-2天，含布局调整） |
| P1-3 | 技能槽点击失败（冷却中）无视觉/音效反馈（FB-2） | SkillBar.ts:272 | XS（2小时） |
| P1-4 | Shop 未选英雄时购买按钮应为禁用态而非可点击+事后报错（IF-2） | ShopScene.ts:248-265 | S（0.5天） |
| P1-5 | 色盲模式切换后当前场景 chibi 纹理缓存不刷新（AC-3） | Theme.ts:setAccessibility, UnitRenderer | S（0.5天） |
| P1-6 | 元素状态 DoT（点燃/冻结等）在敌方 portrait 上无实时图标（FB-1） | BattleHUD.ts:171-217 | M（需接 EventBus + StatusEffectSystem，1-2天） |
| P1-7 | MapScene 底部英雄 HP 条过细且无颜色分段，低血英雄不醒目（VD-4） | MapScene.ts（hero panel 构建段） | S（0.5天） |
| P1-8 | HeroDraft 选中卡片缺乏"可取消"的视觉操作提示（IF-1） | HeroDraftScene.ts:329-337 | XS（2小时） |

### P2 — 建议优化（体验提升，可延后）

| ID | 问题 | 位置 | 估算工作量 |
|----|------|------|-----------|
| P2-1 | HelpPanel 羁绊/机制条目应做 accordion 折叠，减少信息过载（VD-1） | HelpPanel.ts | M（1天） |
| P2-2 | 奖励页缺乏升级高亮行（FB-4）和信息分组（VD-5） | BattleScene（reward 构建段） | S（0.5天） |
| P2-3 | 地图节点添加像素图标双编码（AC-4） | MapRenderer.ts, PixelIcons.ts | M（1-2天） |
| P2-4 | BattleHUD 8 英雄时 portrait 纵向超载，建议 2 列布局（VD-2） | BattleHUD.ts:114-168 | M（1天） |
| P2-5 | 当前羁绊前瞻性提示（选卡 + 地图阵容），降低策略门槛（GH-3,GH-4） | HeroDraftScene.ts, MapScene.ts | M（1-2天） |
| P2-6 | FormationPanel 操作提示不足，玩家不知道可以点击切换排（IF-3） | FormationPanel.ts | XS（2小时） |
| P2-7 | 技能进化入口深埋 3 层，可进化时应有角标提示（IF-5） | MapScene.ts（hero panel 段） | S（0.5天） |
| P2-8 | 节点类型标签字号升至 small(11px) 以替代现有 tiny(10px)（IA-4a） | MapRenderer.ts | XS（1小时） |
| P2-9 | Settings 页键位区行高/列宽优化，提升扫读效率（VD-6） | SettingsScene.ts:149-178 | XS（1小时） |
| P2-10 | HelpPanel 关闭按钮和 Settings 键位文字的触摸热区不达标（AC-5,AC-6） | HelpPanel.ts:189, SettingsScene.ts:175 | XS（1小时） |

---

## 八、评审说明

**已验证不重复计分的已修复项：**
长按 tooltip（P0-2/P0-3 of mobile plan → PressInteraction.ts 已实现）、触摸热区放大（Button.ts:14 MIN_TOUCH_HIT=52px）、textScale 1.25 移动默认（Theme.ts:30-32）、按需加载精灵图（BattleScene.ts:102-146）、Panel 拖拽滚动（HeroDraftScene/ShopScene 内 inline scroll）、Battle 概览屏幕按钮、字号基线上调（tiny 10px / small 11px）。

**快捷键系统：** Settings 已有完整的 KeybindingConfig 重映射（`SettingsScene.ts:136-178`），桌面可访问性良好；本次评审聚焦触摸/视觉层面问题，键盘可访问性暂不扣分。

**截图参考：**
- 英雄选择：`docs/screenshots/verify-02-herodraft.png`
- 商店（桌面）：`docs/screenshots/verify-03-battle-hud.png`（标题为商店截图）
- 战斗 HUD：`docs/screenshots/verify-04-battle-hud.png`
- 阵型面板：`docs/screenshots/verify-05-formation.png`
- E2E 系列：`docs/screenshots/e2e-2026-06-08-*.png`
