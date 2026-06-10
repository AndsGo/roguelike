# 移动端 UI 布局与可读性审计报告

**项目:** D:\work\games\rougelike — Phaser 3, 800×450, Scale.FIT  
**审计日期:** 2026-06-10  
**审计范围:** src/scenes/*.ts, src/ui/*.ts, src/entities/Unit.ts, src/components/DamageNumber.ts

---

## 背景：手机上的实际字号换算

| 游戏内字号 | 667×375 横屏 (缩放≈0.83) | 844×390 高分屏 (缩放≈0.97) | 实际物理高度(~6") |
|-----------|--------------------------|---------------------------|-----------------|
| 9px       | ≈7.5 CSS px              | ≈8.7 CSS px               | ≈1.6 mm         |
| 10px      | ≈8.3 CSS px              | ≈9.7 CSS px               | ≈1.8 mm         |
| 11px      | ≈9.1 CSS px              | ≈10.7 CSS px              | ≈2.0 mm         |
| 13px      | ≈10.8 CSS px             | ≈12.6 CSS px              | ≈2.4 mm         |
| 16px      | ≈13.3 CSS px             | ≈15.5 CSS px              | ≈2.9 mm         |
| 22px      | ≈18.3 CSS px             | ≈21.3 CSS px              | ≈4.0 mm         |

移动端最低可读字号约 12 CSS px（≈2.2mm）。游戏内 <12px 的文字在手机上基本不可读。

---

## 第一部分：字号分布统计

### 1.1 TextFactory 预设（src/ui/TextFactory.ts:9-14）

| 预设名   | 游戏内字号 | 手机实际(667px设备) | 可读性评级 |
|---------|-----------|-------------------|-----------|
| title   | 22px      | ≈18 CSS px        | 可读       |
| subtitle| 16px      | ≈13 CSS px        | 勉强可读   |
| body    | 13px      | ≈10.8 CSS px      | **不可读** |
| label   | 11px      | ≈9.1 CSS px       | **不可读** |
| small   | 10px      | ≈8.3 CSS px       | **不可读** |
| tiny    | 9px       | ≈7.5 CSS px       | **不可读** |

**结论：6个预设中有4个（body/label/small/tiny）在手机上低于可读阈值。**

### 1.2 直接硬编码字号（绕过 TextFactory 预设）

| 文件 | 行号 | 字号 | 场景 |
|------|------|------|------|
| src/entities/Unit.ts | 286 | 9px | Boss名称标签（直接 setStyle） |
| src/components/DamageNumber.ts | 51 | 16px (普通) / 24px (暴击) | 伤害飘字 |

### 1.3 各预设在关键场景的使用分布

**≤10px（tiny/small）出现的关键信息位置（最严重）：**

| 位置 | 预设 | 内容 | 文件:行号 |
|------|------|------|----------|
| BattleHUD — 英雄名 | small(10px) | 英雄名称（截取6字） | BattleHUD.ts:130 |
| BattleHUD — 敌人名 | small(10px) | 敌人名称（截取5字） | BattleHUD.ts:191 |
| BattleHUD — 状态图标 | tiny(9px) | 眩晕"!"指示器 | BattleHUD.ts:429 |
| BattleHUD — 羁绊数量 | small(10px) | 羁绊计数气泡 | BattleHUD.ts:271 |
| BattleHUD — 羁绊提示 | small(10px) | hover提示文字 | BattleHUD.ts:283 |
| BattleHUD — 统计面板 | small(10px) | 伤害统计数值 | BattleHUD.ts:349 |
| SkillBar — 技能名 | label(11px) | 技能名（截取3字） | SkillBar.ts:152 |
| SkillBar — 英雄名 | tiny(9px) | 槽位英雄名（截取2字） | SkillBar.ts:158 |
| SkillBar — 热键标签 | tiny(9px) | 数字1-8 | SkillBar.ts:164 |
| SkillBar — 技能提示 | small(10px) | 冷却/目标/倍率 | SkillBar.ts:305 |
| UltimateBar — 英雄名 | tiny(9px) | 角色名（截取2字） | UltimateBar.ts:142 |
| UltimateBar — 热键 | tiny(9px) | Q/W/E/R | UltimateBar.ts:149 |
| UltimateBar — 能量% | tiny(9px) | 能量百分比 | UltimateBar.ts:155 |
| UltimateBar — 提示 | small(10px) | 技能名/目标/倍率 | UltimateBar.ts:274 |
| ShopScene — 槽位标签 | small(10px) | [武器]/[护甲] | ShopScene.ts:169 |
| ShopScene — 描述 | small(10px) | 物品描述 | ShopScene.ts:175 |
| ShopScene — 属性 | small(10px) | 属性数值 | ShopScene.ts:185 |
| ShopScene — 对比 | small(10px) | ▲攻击+10等 | ShopScene.ts:191 |
| ShopScene — 价格 | label(11px) | N G 价格 | ShopScene.ts:198 |
| HeroDraftScene — 标签 | tiny(9px) | 坦/战 + 火/冰 | HeroDraftScene.ts:213 |
| HeroDraftScene — 属性 | tiny(9px) | 攻:X 防:X | HeroDraftScene.ts:220 |
| HeroDraftScene — 速度 | tiny(9px) | 速:X 攻速:X.X | HeroDraftScene.ts:225 |
| HeroDraftScene — 解锁条件 | tiny(9px) | 锁定卡片的解锁文字 | HeroDraftScene.ts:158 |
| HeroDraftScene — 羁绊预览 | small(10px) | 底部羁绊文字 | HeroDraftScene.ts:123 |
| BattleScene — Act说明 | small(10px) | 关卡修正描述 | BattleScene.ts:761 |
| BattleScene — 威胁按钮 | small(10px) | [威胁线]按钮 | BattleScene.ts:727 |
| BattleScene — 暂停按钮 | small(10px) | [暂停]按钮 | BattleScene.ts:772 |
| BattleScene — 金币 | label(11px) | XG 战斗金币 | BattleScene.ts:767 |
| BattleScene — affix图标 | tiny(9px) | 敌人头上词缀图标 | BattleScene.ts:1195 |
| MapScene — 关卡类型标签 | tiny(9px) | 地图节点标签文字 | MapScene.ts:241-243 |
| MapScene — 隐藏节点花费 | tiny(9px) | ?节点费用 | MapScene.ts:241 |
| MapScene — 运行统计 | small(10px) | 英雄数/遗物数/进度 | MapScene.ts:430 |
| MapScene — 每日规则 | small(10px) | 每日挑战规则条 | MapScene.ts:410 |
| EventScene — 概率提示 | tiny(9px) | 选项概率百分比 | EventScene.ts:185 |
| RewardScene — 战斗统计表头 | tiny(9px) | 伤害/治疗/击杀 | RewardScene.ts:94-96 |
| RewardScene — 战斗统计数值 | tiny(9px) | 具体数字 | RewardScene.ts:105-107 |
| HeroDetailPopup — EXP | tiny(9px) | X/Y 经验值 | HeroDetailPopup.ts:85 |
| HeroDetailPopup — 技能进阶 | tiny(9px) | ★ LvX: 进阶名 | HeroDetailPopup.ts:305 |
| HeroDetailPopup — 羁绊 | tiny(9px) | 羁绊效果描述 | HeroDetailPopup.ts:332 |
| MainMenuScene — 底部统计 | small(10px) | 总局数/胜利数 | MainMenuScene.ts:190 |
| MainMenuScene — 版本号 | small(10px) | 版本字符串 | MainMenuScene.ts:195 |
| MainMenuScene — 音频按钮 | small(10px) | [BGM开]/[SFX开] | MainMenuScene.ts:145-157 |
| MainMenuScene — 设置按钮 | small(10px) | [设置] | MainMenuScene.ts:165 |
| Unit.ts — Boss名 | 9px(硬编码) | Boss名称 | Unit.ts:286 |

**字号分布汇总：**
- ≥14px：约 15% 使用位置（title/subtitle/暴击伤害数字）
- 11–13px：约 15% 使用位置（body/label）
- ≤10px：约 **70%** 使用位置（small/tiny/硬编码9px）

---

## 第二部分：信息密度分析

### 2.1 BattleScene HUD 元素清单（800×450 画布）

战斗 HUD 在同一屏中叠加了以下 UI 层：

| 区域 | 元素 | 尺寸/位置 |
|------|------|----------|
| 顶部中央 | 战斗类型标签(body) | y=12, 约30px高 |
| 顶部中央 | 速度控制按钮(body) | x≈455, y=12, 50×18px |
| 顶部中央 | Act修正描述(small) | y=26 |
| 顶部右侧 | 金币(label) | x=800-15, y=10 |
| 顶部右侧 | 暂停按钮(small) | x=800-15, y=26 |
| 左侧 | 英雄肖像×N (每行22px) | x=8, y=32起 |
| 左侧 | 羁绊气泡(small) | 英雄列表下方 |
| 右侧 | 敌人肖像×N (每行22px) | x=692, y=32起 |
| 底部中央 | SkillBar (8槽×44px) | y=400, 每槽44×44px |
| 底部中央 | UltimateBar (4按钮×36px) | y=350, 每按钮36×36px |
| 底部右侧 | [统计]按钮(small) | x=790, y=385 |
| 底部右侧 | [威胁线]按钮(small) | x=790, y=372 |
| 底部右侧 | Combo计数(title) | x=600, y=420 |

**SkillBar 密度：** 8槽，每槽 44×44px，总宽 376px。按比例缩放到 667px 宽手机后每槽约 29×29px（=1cm²），低于 iOS 44pt / Android 48dp 推荐触摸目标。

**UltimateBar 密度：** 4按钮，每按钮 36×36px，缩放后约 24×24px，极难精准点击。

**同屏可交互元素总计（战斗场景激活时）：** 约 20 个可点击区域（含单位点击），平均密度极高。

### 2.2 ShopScene 卡片

- 卡片宽 210px，高 95px，3列布局，x间距 230px
- 首行 y=155，每行间距 120px
- 卡片内塞入：物品名(body)、槽位标签(small)、描述(small)、属性(small)、对比(small)、价格(label)、购买按钮
- **买入按钮实际触摸区：** 64×34px = 缩放后约 42×22px，y方向低于推荐

### 2.3 HeroDraftScene 网格

- 常量：CARD_W=74, CARD_H=100, CARD_GAP=4, COLS=10
- 26 个英雄卡，10列×3行
- 总网格宽：10×(74+4)-4 = 776px（几乎撑满 800px 画布）
- 每卡 74×100px，缩放至手机后约 61×83px
- 卡片内容：role图标、element图标、chibi精灵(36×40)、英雄名(small)、职业/元素(tiny)、攻防(tiny)、速度(tiny)
- **密度问题：** 10列卡在 800px 内，相邻卡间仅 4px 间隙，在手机上约 3px，极易误触相邻卡。

---

## 第三部分：边缘贴边 UI

以下 UI 元素坐标距画布边缘 <10px：

| 问题 | 文件:行号 | 坐标 | 证据 |
|------|----------|------|------|
| MainMenu 音频按钮 | MainMenuScene.ts:145 | x=GAME_WIDTH-15(=785), y=12 | setOrigin(1,0) → 右边距仅15px |
| MainMenu SFX按钮 | MainMenuScene.ts:155 | x=785, y=26 | 同上 |
| MainMenu 设置按钮 | MainMenuScene.ts:165 | x=785, y=44 | 同上 |
| BattleScene 金币 | BattleScene.ts:767 | x=785, y=10 | setOrigin(1,0) |
| BattleScene 暂停 | BattleScene.ts:772 | x=785, y=26 | setOrigin(1,0) |
| BattleScene 威胁线 | BattleScene.ts:727 | x=790, y=372 | setOrigin(1,1) |
| BattleScene 统计 | BattleHUD.ts:81 | x=790, y=385 | setOrigin(1,1) |
| MapScene 金币 | MapScene.ts:396 | x=785, y=8 | setOrigin(1,0) |
| MapScene 概览 | MapScene.ts:416 | x=785, y=26 | setOrigin(1,0) |
| MapScene 运行统计 | MapScene.ts:430 | x=15, y=8 | setOrigin(0,0) → 左边距15px |
| EventScene 金币 | EventScene.ts:113 | x=785, y=12 | setOrigin(1,0) |
| ShopScene 金币 | ShopScene.ts:53 | x=785, y=12 | setOrigin(1,0) |

**全面屏安全区问题：** iPhone 系列底部手势条高约 34pt（设备像素约 34-44px）。当 Scale.FIT 缩放后，游戏底部 y=420-450 的 SkillBar（y=400）、UltimateBar（y=350）、[统计]/[威胁线]按钮（y=372/385）可能被手势条遮挡。左侧（x<44px）和右侧（x>756px）受圆角屏遮挡风险较高。

---

## 第四部分：文字换行风险点

### 有 wordWrap 的位置（已处理）

- ShopScene 物品描述（width:190）
- EventScene 事件描述/结果（width:600）
- HeroDraftScene 锁定英雄解锁条件（useAdvancedWrap:true）
- HeroDetailPopup 多处（width:POPUP_WIDTH-40/60）
- AchievementPanel、HelpPanel、CodexDetailPopup

### **缺少 wordWrap 的高风险位置**

| 问题 | 文件:行号 | 内容描述 | 风险说明 |
|------|----------|----------|---------|
| ShopScene 属性数值 | ShopScene.ts:185 | statStr 多个属性拼接 | 长装备属性可能溢出卡片(210px宽) |
| ShopScene 对比文字 | ShopScene.ts:191 | vs旧装备+差值文字 | 多属性差值拼接无换行，可能溢出 |
| SkillBar 技能提示 | SkillBar.ts:305 | 技能详情多行 | 无wordWrap，长技能描述溢出 |
| UltimateBar 技能提示 | UltimateBar.ts:274 | 大招详情 | 无wordWrap |
| BattleHUD 羁绊提示 | BattleHUD.ts:283 | 羁绊效果描述 | 无wordWrap，描述可能较长 |
| MainMenuScene 升级面板描述 | 无单独描述文字 | — | N/A |
| HeroDraftScene 卡片属性行 | HeroDraftScene.ts:220-227 | "攻:X 防:X / 速:X 攻速:X.X" | 无wordWrap，超长数值可能溢出74px卡片 |
| RestScene 英雄状态 | RestScene.ts:55 | "名字: X/X HP" | 长英雄名+大HP数值可能超出宽度 |
| RewardScene 英雄行 | RewardScene.ts:79 | "名字 Lv.X HP:X/X" | 同上 |
| MapScene 每日规则条 | MapScene.ts:410 | 多条规则拼接 | 无wordWrap，宽度=GAME_WIDTH-20=780px，但规则数多时可能溢出 |
| BattleScene affix名称 | BattleScene.ts:1175 | affix symbol+name join | 无wordWrap |

---

## 第五部分：弹窗/Panel 尺寸

### 5.1 各弹窗在画布中的占比

| 弹窗 | 尺寸 | 画布占比(800×450) | 关闭方式 |
|------|------|------------------|---------|
| HeroDetailPopup | 420×430 | 52.5%×95.6% = **50.2%** | 点击backdrop |
| RunOverviewPanel (Panel) | 540×400 | 67.5%×88.9% = **60%** | 点击外部 + 关闭文字 |
| MainMenu UpgradePanel | 500×340 | 62.5%×75.6% = **47.3%** | 点击外部 + [关闭]文字 |
| 难度选择面板 | 400×280 | 50%×62.2% = **31.1%** | 点击外部 |
| 每日挑战预览 | 320×220 | 40%×48.9% = **19.6%** | 点击外部 |
| 暂停菜单(BattleScene) | 240×180 | 30%×40% = **12%** | 继续按钮 |
| 确认覆盖存档 | 320×110 | 40%×24.4% | 点击外部 |

**HeroDetailPopup 问题：** 高度 430px 在 450px 画布上占 **95.6%**，几乎无边距（各侧仅约 10px）。在小屏设备上面板内容很可能因画布缩放后四边几乎贴屏。

### 5.2 关闭按钮分析

| 弹窗 | 关闭按钮类型 | 触摸区大小 | 问题 |
|------|------------|----------|------|
| HeroDetailPopup | 文字提示"[ 点击关闭 ]" + 整个backdrop | backdrop=800×450 | 无明确X按钮，触摸区实际是背景（排除面板区域外） |
| RunOverviewPanel | "[ 关闭 ]" 文字 (label=11px) + 80×24 hit区 | 80×24px | **hit区太小**，缩放后约 53×16px |
| MainMenu UpgradePanel | "[关闭]" label(11px) + 80×24 hit区 | 80×24px | 同上，且文字 label=11px 不可读 |
| Panel (关闭) | close()方法，无统一关闭按钮 | — | 各调用方自行实现，尺寸不一致 |
| 暂停菜单 | Button 160×32px | 160×32px (缩放后≈106×21px) | 高度偏低 |
| 难度选择 | "取消"按钮 60×26px | 60×26px | **触摸区过小** |

---

## 问题清单（按优先级）

---

### [P0] 战斗关键 UI 字号严重不可读

**文件:** src/ui/TextFactory.ts:13-14, src/ui/SkillBar.ts:152-164, src/ui/UltimateBar.ts:142-155, src/ui/BattleHUD.ts:130-191

**问题:** 战斗中最频繁使用的 UI 元素——技能槽名称(label=11px)、技能热键(tiny=9px)、英雄/敌人名称(small=10px)、能量百分比(tiny=9px)——在 667px 宽手机上渲染为 7.5–9.1 CSS px，实际物理高度仅约 1.4–1.7mm，完全不可读。

**数值证据:**
- SkillBar 技能名: label=11px → 手机约 9.1 CSS px
- SkillBar 热键/英雄名: tiny=9px → 手机约 7.5 CSS px
- UltimateBar 能量%/热键/英雄名: tiny=9px × 3处
- BattleHUD 英雄名/敌人名: small=10px × N处

**修复建议:**
1. 将 TextFactory 的 `small` 从 10px 提升至 13px，`tiny` 从 9px 提升至 11px，`label` 从 11px 提升至 13px。
2. 或在 TextFactory 中增加 `mobile` 检测分支（当 canvas 缩放系数 <0.9 时自动提升 1.3x）。
3. SkillBar SLOT_SIZE 从 44px 扩大至 52px，以容纳更大字体。

---

### [P0] UltimateBar 和 SkillBar 触摸目标过小

**文件:** src/ui/UltimateBar.ts:161, src/ui/SkillBar.ts:176

**问题:** UltimateBar 按钮 36×36px，手机缩放后约 24×24px（<1cm²）。SkillBar 每槽 44×44px，缩放后约 29×29px。均低于 iOS HIG (44pt) 和 Material Design (48dp) 最低触摸目标要求。4个大招按钮和8个技能槽紧密排列，在战斗高压情境下极易误触。

**数值证据:**
- UltimateBar BUTTON_SIZE=36, hit area=40×40 → 缩放后约 26×26px
- SkillBar SLOT_SIZE=44, hit area=48×48 → 缩放后约 32×32px

**修复建议:**
1. UltimateBar BUTTON_SIZE 从 36px 提升至 48px。
2. SkillBar SLOT_SIZE 从 44px 提升至 52px。
3. 相应调整间距和起始位置使总宽不超过画布。

---

### [P0] HeroDraftScene 网格 10 列密度极高

**文件:** src/scenes/HeroDraftScene.ts:27-28

**问题:** COLS=10, CARD_W=74, CARD_GAP=4，10列×78px=780px 几乎撑满 800px 画布。手机缩放后卡片约 61×83px，间隙仅 3px。26 张卡片同屏显示，相邻卡片误触率极高。卡片内 tiny=9px 出现 3 次（职业标签、攻防、速度），完全不可读。

**数值证据:**
- 总网格宽：10×(74+4)−4 = 776px / 800px = 97%
- 缩放到 667px 手机后：实际卡片间隙≈3.3px

**修复建议:**
1. COLS 减至 8（一行8张），CARD_W 扩大至 88px，CARD_GAP 增至 6px（总宽=752px）。
2. 将卡片内 tiny 属性行合并为一行或删除（保留主要职业/元素标识即可）。
3. 考虑增加分页或搜索/过滤功能替代单屏全展示。

---

### [P1] ShopScene 物品卡片核心信息字号不可读

**文件:** src/scenes/ShopScene.ts:169-199

**问题:** 物品卡片中描述(small=10px)、属性(small=10px)、对比文字(small=10px)、价格(label=11px)均使用小字号。在手机上购买决策所需的全部信息（物品效果/价格/对比）都不可读。卡片宽 210px，缩放后约 175px，内容密度高。

**修复建议:**
1. 价格改用 body(13px)。
2. 描述和属性改用 label(11px)（提升后为13px）。
3. 对比文字可保持 small 但应在卡片 hover/tap 时显示，默认折叠。

---

### [P1] Boss名称使用硬编码 9px（绕过 TextFactory）

**文件:** src/entities/Unit.ts:286

**问题:** `setBoss()` 中直接 `this.nameLabel.setStyle({ fontSize: '9px' })`，绕过了 TextFactory 的 accessibility textScale 系统。即使用户在设置中调大字体，Boss 名称不会响应。

**修复建议:**
将硬编码替换为 TextFactory.create 调用，或改为 `setStyle({ fontSize: TextFactory 的 tiny 预设字号 })` 并绑定 textScale。

---

### [P1] 右侧 UI 元素边缘安全区不足

**文件:** BattleScene.ts:767/772/727, BattleHUD.ts:81, MapScene.ts:396/416, MainMenuScene.ts:145-167, ShopScene.ts:53, EventScene.ts:113

**问题:** 多个场景的右上角和右下角 UI 元素 x 坐标在 785–790px（距右边缘 10–15 游戏像素）。在圆角手机（如 iPhone X+）上，右侧安全区约 44pt，经缩放换算后约 37–44 游戏像素。这些元素会落入圆角遮罩区域内。底部 y>420px 的元素同样面临手势条遮挡风险。

**数值证据:**
- 右侧安全区推荐：游戏内至少 40px（手机约 33 CSS px）
- 当前最小右边距：10–15px（约 8–12 CSS px）
- 底部 SkillBar y=400，+高度50px = y=450（贴底）

**修复建议:**
1. 定义全局安全区常量：SAFE_INSET_X=44, SAFE_INSET_Y_BOTTOM=50。
2. 右上角按钮群改为距右边缘 44px（即 x=GAME_WIDTH-44）。
3. SkillBar BAR_Y 从 GAME_HEIGHT-50 调整为 GAME_HEIGHT-70；UltimateBar BAR_Y 从 GAME_HEIGHT-100 调整为 GAME_HEIGHT-120。

---

### [P1] 弹窗关闭按钮触摸区不足

**文件:** src/ui/RunOverviewPanel.ts, src/scenes/MainMenuScene.ts:679-686

**问题:** RunOverviewPanel 和 MainMenu UpgradePanel 的关闭按钮 hit 区仅 80×24px，缩放后约 53×16px。label=11px 文字本身约 9 CSS px。用户难以准确点击关闭。难度选择的"取消"按钮 60×26px，缩放后约 40×17px 也偏小。

**修复建议:**
1. 所有关闭/取消按钮改用 Button 组件（内置 HIT_PADDING=8），最小尺寸 80×36px。
2. 弹窗统一在右上角放置 ×/关闭 Button，而非纯文字 label。

---

### [P2] HeroDetailPopup 高度几乎填满整个画布

**文件:** src/ui/HeroDetailPopup.ts:13-14

**问题:** POPUP_HEIGHT=430，画布 GAME_HEIGHT=450，弹窗高度占比 95.6%。上下各仅约 10px 边距。在小屏手机上几乎无安全边距。弹窗内统计行间距 16px，技能/进阶行间距 14px/12px，字号 label/small/tiny，在手机上全程不可读。

**修复建议:**
1. POPUP_HEIGHT 调整为 420px 并改用 Panel 组件（可滚动），减少竖向信息密度。
2. 或将内容分为标签页（基础/装备/技能），降低单页信息量。

---

### [P2] RewardScene 战斗统计表使用 tiny 字号

**文件:** src/scenes/RewardScene.ts:94-107

**问题:** 战斗后结算界面的伤害/治疗/击杀列表全部使用 tiny=9px，在手机上不可读。玩家完全无法看清战斗数据。

**修复建议:**
将 RewardScene 统计表的 tiny 改为 small（提升后为 11–13px），或将表格设计为可滚动的详情面板而非塞入主屏。

---

### [P2] EventScene 概率提示和风险标签字号过小

**文件:** src/scenes/EventScene.ts:185, 201

**问题:** 事件选择界面，多结果概率提示(tiny=9px)和风险标签(small=10px)在手机上不可读。风险评估是重要的决策信息。

**修复建议:** 概率提示改用 label(11px)，风险标签改用 body(13px)。

---

### [P2] ShopScene/BattleScene 缺少 wordWrap 导致溢出风险

**文件:** src/scenes/ShopScene.ts:185-191, src/ui/SkillBar.ts:305, src/ui/UltimateBar.ts:274

**问题:** ShopScene 属性拼接字符串和对比文字、SkillBar/UltimateBar tooltip 均无 wordWrap。中文武器/技能名称较长时（如"攻击力提升+15 暴击率+8% 生命上限+200"），会溢出卡片或提示框边界。

**修复建议:**
1. ShopScene 属性字符串每个属性独立一行，或设置 `wordWrap: { width: 190 }`。
2. SkillBar/UltimateBar tooltip text 增加 `wordWrap: { width: 150 }`。

---

## 整体评分

| 维度 | 评分 | 说明 |
|------|------|------|
| 字号可读性 | 2/10 | 4/6个预设在手机上不可读，70%使用位置字号不足 |
| 触摸目标尺寸 | 3/10 | 核心战斗操控（技能槽/大招）均低于最低触摸标准 |
| 信息密度 | 3/10 | HeroDraft 10列、ShopScene卡片、HUD同屏元素均过密 |
| 边缘安全区 | 4/10 | 多场景右侧/底部元素不足安全距离，全面屏会遮挡 |
| wordWrap覆盖 | 5/10 | 关键弹窗有处理，但战斗内tooltip和卡片属性行缺失 |
| 弹窗关闭体验 | 4/10 | 关闭按钮普遍过小，HeroDetailPopup高度占95%画布 |
| 整体移动端适配 | **2/10** | 游戏明显为桌面端像素艺术风格设计，未做移动端适配 |

**综合评分：2.5 / 10**

项目的核心问题在于 TextFactory 的基准字号设定。`small`(10px) 和 `tiny`(9px) 是为 800px 桌面画布设计的像素艺术风格字号，在缩放到手机后丧失可读性。战斗场景中最关键的操作 UI（技能槽、大招按钮）和最常用的信息 UI（英雄名、技能名）都是这两个字号，导致手机端战斗体验极差。建议以调整 TextFactory 预设字号为第一优先级修复项。
