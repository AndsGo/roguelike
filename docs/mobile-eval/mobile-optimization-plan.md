# 移动端适配全面测试报告与优化方案

> **实施状态(2026-06-10):全部三阶段已实施并通过验证。**
> 验收记录:`npx tsc --noEmit` 零错误;`npm test` 99 文件 / 1198 用例全过(含 11 个新增移动端回归测试);
> 审核员 E2E(Playwright 真实触摸上下文,iPhone 档:844×390 / hasTouch / DPR 3)全部通过——
> 长按 tooltip/详情、触摸点选、概览按钮、textScale 1.25 默认、按需加载(启动 0 张精灵图、
> 单场战斗仅 9 张)、压缩后画质、飘字、Panel 拖拽滚动、控制台零错误、manifest/favicon 200。
> E2E 截图:`screenshots/after/`。
> 资产:81.9MB → 23.8MB(-71%,`scripts/compress-sprites.mjs`)。
> 实施中额外发现并修复的回归:#game-container flex 居中与 Phaser CENTER_BOTH 双重居中导致画布偏移;
> textScale 1.25 下 HeroDetailPopup 行距溢出、Button 长标签溢出、EventScene 概率提示与按钮重叠、
> SkillBar 槽名挤压(均已修复,文本宽度自适应收缩)。

**日期:** 2026-06-10
**测试方法:** 4 个维度的静态代码审计(触摸交互 / 视口缩放 / 布局可读性 / 性能)+ Playwright 真实分辨率 E2E 实测(844×390、667×375 横屏,390×844 竖屏)
**详细报告:** [touch-interaction.md](touch-interaction.md) · [viewport-scaling.md](viewport-scaling.md) · [layout-readability.md](layout-readability.md)
**截图:** `screenshots/` 目录

---

## 一、总体结论

游戏架构选型对移动端是友好的(固定 800×450 + Scale.FIT 等比缩放、全 Phaser UI 无 DOM、像素风对拉伸不敏感、粒子已有对象池、文本经 TextFactory 单点创建),**但运行时移动适配层几乎空白**:无 hover 替代方案、无按需加载、字号体系按桌面设计、触摸目标普遍低于 44px 标准。

| 维度 | 评分 | 核心问题 |
|------|------|---------|
| 触摸交互 | 3/10 | 5 个功能在手机上完全不可达(hover/右键/键盘独占) |
| 视口与缩放 | 5/10 | iOS 全屏链路必然失败;零 resize/safe-area 处理 |
| 布局可读性 | 4/10 | **约 70% 的文本使用 ≤10px 字号**,手机上不可读 |
| 性能与加载 | 4/10 | **81.9MB 资源在 Boot 阶段全量预加载** |

E2E 实测确认:各场景在手机分辨率下布局完整不破版、竖屏旋转提示正常、Panel 拖拽滚动基本可用——问题集中在「可读、可点、可达、可加载」四个层面,而非布局崩坏。

---

## 二、P0 问题(功能性缺失,必须修复)

### P0-1 启动时全量预加载 81.9MB 单位精灵图
- **位置:** `src/scenes/BootScene.ts:46` → `preloadUnitSpriteSheets()` 一次性加载全部 55 张精灵图(单张最大 2.3MB,`public/assets/units/` 共 ~80MB)
- **影响:** 4G 网络首屏加载需数分钟;55 张大图解码后纹理显存可达数百 MB,低端安卓机有崩溃风险
- **方案:**
  1. Boot 只加载 UI/音频/当前可遇敌人 + 已选英雄的精灵图;进入战斗/章节前用 `scene.load` 增量加载(Phaser LoaderPlugin 支持任意场景内动态加载,配 loading 转圈)
  2. 资源压缩:用 `oxipng`/`pngquant` 处理(像素图量化到 256 色基本无损,预计 -60~70%);评估帧数裁剪——2MB 的 16×20 像素风精灵图说明帧画幅/帧数远超显示需求(显示仅 2-3 倍缩放)
  3. 远期:打 texture atlas 按章节(Act)分包

### P0-2 hover 独占信息在手机上完全不可达
- **位置(已逐一验证):**
  - `src/ui/SkillBar.ts:189` — 技能 tooltip 仅 `pointerover`;点按(`pointerup`)直接放技能 → **手机玩家无法查看技能说明**
  - `src/ui/UltimateBar.ts:169` — 终极技能 tooltip 同上
  - `src/ui/BattleHUD.ts:292` — 羁绊效果 tooltip 仅 hover → 战斗中无法了解己方加成
  - `src/ui/MapRenderer.ts:279` — 地图节点 hover 高亮提示
- **方案:** 统一引入**长按(≥350ms)显示 tooltip**手势:`pointerdown` 起计时器,长按弹 tooltip 并取消本次 `pointerup` 的触发动作;`pointerup`/`pointerout` 关闭。封装成 `attachTooltip(target, contentFn)` 工具函数全局复用

### P0-3 右键查看英雄详情,手机无右键
- **位置:** `src/ui/HeroCard.ts`、`src/scenes/HeroDraftScene.ts` 的英雄详情弹窗依赖 `rightButtonDown`
- **方案:** 同 P0-2,长按 = 右键;或卡片上加一个明确的 "ⓘ" 角标按钮

### P0-4 键盘独占功能无触屏入口
- **位置:** `src/scenes/BattleScene.ts` — ESC(暂停)、Tab(概览)、1-8 / Q-R(技能热键)
- **现状:** 暂停/技能有屏幕按钮兜底,但**概览(Tab)无任何触屏入口**
- **方案:** 战斗 HUD 增加「概览」屏幕按钮;隐藏移动端无意义的热键数字标签(SkillBar.ts:164、UltimateBar.ts:149 的 1-8/QWER 小字)

### P0-5 iOS 全屏+横屏锁定链路必然静默失败
- **位置:** `index.html:42-54` — iOS Safari 不支持 `documentElement.requestFullscreen`,也无 `screen.orientation.lock`;`{once:true}` 导致失败后不再重试
- **影响:** iPhone 上无法全屏,地址栏常驻;Android 正常 → 双平台体验割裂
- **方案:** 接受 iOS 无法程序化全屏的现实,做降级:
  1. CSS 旋转提示保留(已验证可用)
  2. `body` 高度从 `100vh` 改 `100dvh`(地址栏收起时自动跟随)
  3. 失败可重试:不用 `{once:true}`,全屏成功后才移除监听
  4. 引导加到主屏幕(PWA manifest + `display: fullscreen`)是 iOS 真正的全屏方案

---

## 三、P1 问题(严重可用性)

| # | 问题 | 位置 | 方案 |
|---|------|------|------|
| P1-1 | **70% 文本 ≤10px**(tiny 9px / small 10px),手机上 <2mm 不可读。重灾区:战斗 HUD 单位名、商店物品描述/价格、英雄选择属性、地图节点标签 | TextFactory 预设 + 全量使用点(见 layout 报告 §1.3 清单) | 利用现成的 `getAccessibility().textScale`(`TextFactory.ts:28`,设置页已有 100/125/150% 三档):**检测到触摸设备时默认 1.25**。同时把 `tiny` 9→10px、`small` 10→11px。注意伴随布局核查——文字放大后的容器溢出需要按场景过一遍 |
| P1-2 | 触摸目标普遍 <44px CSS:技能槽 ~31px、地图节点热区 ~30px、`height:24` 的 Button(阵型/关闭按钮实际 20px)、商店购买按钮 ~16px 高 | Button 调用点、MapRenderer 节点、SkillBar | **视觉不变、热区放大**:`setInteractive` 的 hitArea 独立于显示尺寸,统一加 `expandHitArea(gameObject, minSize=52)` 工具(52 游戏px ≈ 44 CSS px @0.85) |
| P1-3 | 20px 拖拽容差对触摸过严,手指点按抖动常 >20px,约 20-30% 点按被误判为拖拽而丢弃 | `Button.ts`、`SkillBar.ts:185`、`HeroCard.ts` 等所有 distance check | 触摸输入(`pointer.wasTouch`)时容差放宽到 ~35px;鼠标维持 20px |
| P1-4 | Panel 滚动:E2E 验证拖拽滚动可用,但 4px 拖拽阈值与子元素点击冲突、无惯性、滚轮代码在手机为死代码 | `src/ui/Panel.ts:118-160` | 阈值提到 10px(触摸);加简单惯性(释放后按最后速度衰减);保留 wheel 供桌面 |
| P1-5 | 零 resize/orientationchange 监听,旋转/地址栏收起依赖 Phaser FIT 默认行为,iOS innerHeight 滞后会留缝 | 全 `src/` 无 `scale.on('resize')` | `visualViewport.resize` + `orientationchange` 时调 `game.scale.refresh()`(约 10 行,加在 main.ts) |
| P1-6 | 安全区(刘海/Home 条)未处理,目前靠 FIT 左右黑边「恰好」遮住刘海,窄黑边设备或全屏成功后会遮挡边缘 UI(金币、设置按钮距边 <15px) | `index.html`(viewport-fit=cover 已设但未消费 env()) | 读取 `env(safe-area-inset-*)` 注入 CSS 变量限制 canvas 容器;或游戏内边缘 UI 统一内缩 |
| P1-7 | Scale 配置缺 `parent`/`min`/`max`,canvas 直接挂 body | `src/config.ts:22-25` | 加包裹容器 div + `parent`,设 `min` 防止极小窗口不可用 |

---

## 四、P2 问题(体验优化)

1. **战斗飘字无对象池** — `BattleEffects.ts` 每次技能名/克制/打断都 `TextFactory.create` 新 Text(中文 Canvas 文本生成较贵)。战斗高频时 GC 抖动。→ 做 20 个 Text 的环形池复用(`DamageNumber` 同理)
2. **教学提示遮挡** — E2E 截图:商店/事件的教程弹窗与内容按钮重叠,且贴近底边(手机 Home 条区)→ 上移并加背景不透明度
3. **letterbox 黑边** — 19.5:9 屏两侧各 ~7.5% 黑边,属 FIT 正常代价;若想消除可评估 `Scale.EXPAND` + 背景延伸(工作量大,P2)
4. **Canvas 渲染器降级** — `Phaser.AUTO` 在极旧 WebView 退到 Canvas 时 `setTintFill` 受击闪白可能失效,可不处理,记录已知问题
5. **favicon 404**(E2E 控制台唯一报错)→ 补一个
6. 高 DPR 下画布为 800×450 拉伸——像素风+`image-rendering:pixelated` 下可接受,且文本已 `setResolution(2)` 缓解;在 config.ts 加注释固化这一意图,防止误"修复"

---

## 五、实施路线图

### 阶段 A:速效修复(1-2 天,纯增量,风险低)
1. 长按 tooltip 工具函数 → 接入 SkillBar / UltimateBar / BattleHUD / HeroCard(解决 P0-2/P0-3)
2. 移动端 textScale 默认 1.25 + tiny/small 预设 +1px(P1-1 的 80% 收益)
3. 热区放大工具 + 触摸拖拽容差 35px(P1-2/P1-3)
4. `100dvh` + `scale.refresh()` 监听 + 全屏重试(P0-5 降级方案、P1-5)
5. 战斗概览屏幕按钮、隐藏热键标签(P0-4)
6. Panel 阈值/惯性(P1-4)

### 阶段 B:加载与性能(2-3 天)
1. 精灵图按需加载改造:Boot 仅加载必需,战斗前增量加载(P0-1 核心)
2. PNG 量化压缩管线(一次性脚本,预计 80MB → ~25MB)
3. 飘字对象池(P2-1)

### 阶段 C:深度适配(3-5 天,需设计介入)
1. 移动布局核查:textScale 1.25 下全场景过一遍容器溢出
2. 安全区处理 + 边缘 UI 内缩(P1-6)
3. PWA manifest(iOS 全屏的正解)
4. 商店/英雄选择信息密度重排(卡片改两行、详情进弹窗)

### 验收标准
- iPhone SE(667×375)实机:所有信息可读(≥12 CSS px)、所有功能可达、点按成功率 >95%
- 中端安卓 4G:首屏可玩 <10s
- 旋转/地址栏收起无残影留缝

---

## 六、E2E 实测记录

| 场景 | 分辨率 | 结果 |
|------|--------|------|
| 主菜单 | 844×390 | 布局完整;右上音频/设置、右下跳过教程文字过小 |
| 英雄选择 | 844×390 | 26 卡片网格完整;属性/解锁条件 9px 不可读 |
| 冒险地图 | 844×390 | 连线/节点正常;节点热区 ~30px、标签 9px |
| 战斗 HUD | 844×390 | 单位/技能栏正常;单位名 10px、技能槽 31px |
| 商店 | 844×390 | 购买按钮 ~16px 高;描述 10px;教程提示遮挡 |
| 事件 / 休息 | 844×390 | 基本可用;教程弹窗压住选项按钮 |
| 阵型面板 | 667×375 | 打开正常,可拖拽;关闭按钮 ~22px |
| 成就面板 | 667×375 | 拖拽滚动可用,无惯性 |
| 竖屏 | 390×844 | 旋转提示正常显示(display:flex) |
| 缩放数据 | — | canvas 固定 800×450;844×390 缩放 0.867,667×375 缩放 0.834;DPR 不参与渲染分辨率 |
