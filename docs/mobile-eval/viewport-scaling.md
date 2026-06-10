# 移动端 Web 视口 / 缩放 / 设备适配架构审计

**项目:** D:\work\games\rougelike — TypeScript + Phaser 3.90 + Vite 7
**画布:** 固定 800×450(16:9),`Phaser.AUTO` + `Scale.FIT` + `CENTER_BOTH`
**审计日期:** 2026-06-10
**审计范围:** 纯代码静态分析,未运行设备实测
**审计人:** Technical Director(视口/缩放架构审计)

---

## 执行摘要

这套缩放架构走的是「最省事」路线:固定 800×450 内部分辨率 + `Scale.FIT` 自动 letterbox + CSS media query 竖屏提示 + 首次 touchend 抢全屏/锁横屏。对于 16:9 横屏设备,这套方案**基本能用**且简单。

但移动端真机适配几乎是**完全空白**:

- 整个 `src/` 目录搜索 `resize` / `orientationchange` / `scale.on` / `devicePixelRatio` / `safe-area` / `visualViewport` / `requestFullscreen` / `isMobile` — **零命中**。所有移动端逻辑都堆在 `index.html` 的 58 行里。
- iOS Safari 的全屏 + 横屏锁定路径**注定静默失败**(见 P0-1),iPhone 用户实际拿到的是竖屏 + letterbox + 旋转提示遮罩的组合体验。
- 高 DPR 设备上画布只渲染 800×450 物理像素再被拉伸 — 对像素风**可接受**,但缺少显式 DPR 策略说明,属于「碰巧没事」而非「设计如此」。
- 刘海/安全区**完全未处理**;当前靠 FIT+CENTER_BOTH 的两侧黑边「恰好」规避了横屏刘海,这是**侥幸的架构红利**,而非有意设计,UI 一旦贴边或全屏成功就会暴露。

整体评分见文末。核心结论:**架构选型(FIT 固定分辨率)对像素风横屏游戏是正确的,但移动端运行时适配层几乎不存在,真机体验靠运气兜底。**

---

## P0-1 [P0] iOS Safari 全屏 + 横屏锁定路径必然静默失败,iPhone 体验降级

**文件:** `index.html:42-54`

```js
document.addEventListener('touchend', function onFirstTouch() {
  document.removeEventListener('touchend', onFirstTouch);
  var el = document.documentElement;
  var rfs = el.requestFullscreen || el.webkitRequestFullscreen;
  if (rfs) {
    rfs.call(el).then(function() {
      if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('landscape').catch(function() {});
      }
    }).catch(function() {});
  }
}, { once: true });
```

**问题:** 这段代码假设了一条「全屏成功 → 锁横屏」的链式调用,但在 **iOS Safari(iPhone)上整条链路都不存在**:

**技术分析:**

1. **`requestFullscreen` 在 iPhone Safari 上完全不存在。** iOS Safari 仅在 `<video>` 元素上支持 `webkitEnterFullscreen()`,**从不**在 `documentElement` / 任意 DOM 元素上暴露 `requestFullscreen` 或 `webkitRequestFullscreen`。因此 `rfs` 在 iPhone 上为 `undefined`,`if (rfs)` 直接为假 —— **整个 `.then()` 永远不执行**,横屏锁定代码根本到不了。(iPad Safari 13+ 才有 `webkitRequestFullscreen`,但行为也不稳定。)

2. **`screen.orientation.lock()` 在 iOS Safari 上不存在。** 即便假设全屏成功,iOS WebKit 也不实现 `ScreenOrientation.lock`。代码用 `.catch(function(){})` 吞掉了 reject,但实际上 `screen.orientation.lock` 本身就是 `undefined`,`if` 判断直接跳过。

3. **`{ once: true }` + 手动 `removeEventListener` 双重保险。** 监听器只触发一次。如果第一次 touchend 时全屏请求因为「不是用户手势上下文」被拒(某些浏览器对 touchend vs click 的手势判定不同),监听器已被移除,**不会重试** —— 用户再怎么点也不会再尝试全屏。

4. **`/iPad/` 检测在 iPadOS 13+ 失效。** iPadOS 13+ 默认 UA 伪装成桌面 macOS Safari(不含 `iPad` 字样),`isMobile` 判定为 `false`,iPad 用户连这段(本就无效的)逻辑都不会进入 —— 但这反而无害,因为逻辑本身在 iPad 上也跑不通。

**iPhone 上的实际结果:** 用户横握手机 → 系统旋转 → 进入横屏 → 游戏正常 FIT 显示(Safari 地址栏占据顶部一条,见 P1-2)。**但如果用户竖握**,`@media (orientation: portrait)` 触发,整个画布被「请旋转手机至横屏」遮罩盖住,而全屏无法主动触发,只能依赖用户物理旋转设备。Android Chrome 上 `requestFullscreen` + `orientation.lock('landscape')` 可以工作,体验明显优于 iOS —— **平台体验割裂**。

**修复建议:**

1. **不要假设全屏会成功。** 把横屏锁定从 `.then()` 里解耦,独立尝试(即便没全屏也试一次,Android 上某些场景可行):
   ```js
   function tryLockLandscape() {
     if (screen.orientation && screen.orientation.lock) {
       screen.orientation.lock('landscape').catch(function(){});
     }
   }
   if (rfs) {
     rfs.call(el).then(tryLockLandscape).catch(tryLockLandscape);
   } else {
     tryLockLandscape();
   }
   ```
2. **保留重试能力。** 不要 `once:true` + 立即 remove。改为「全屏成功后才解绑」,失败则保留监听,允许用户再次触摸触发(注意防抖,避免每帧 touchend 都请求)。
3. **针对 iPhone 明确产品决策:** iPhone 无法程序化全屏/锁横屏是平台硬限制。可接受方案有二:(a) 接受「竖握→旋转提示遮罩 / 横握→带地址栏的 FIT」体验(当前路径);(b) 引导用户「添加到主屏幕」(PWA standalone 模式下 iOS 才会隐藏地址栏、给到接近全屏的视口)。建议在旋转提示遮罩里增加一行 iOS 专属引导文案。这是产品/创意决策,应升级给 creative-director 拍板;TD 侧只需保证两条路径都不崩。
4. **修正设备检测:** 用 `navigator.maxTouchPoints > 1 && /Macintosh/.test(ua)` 兜底识别 iPadOS,或干脆改用「触摸能力 + 屏幕尺寸」而非 UA 字符串。

---

## P0-2 [P0] 整个运行时无任何 resize / orientationchange / scale.on 监听 —— 视口变化后画布不主动刷新

**文件:** 全 `src/` 目录(`config.ts`、`main.ts`、所有 scenes)— **零相关代码**

**问题:** `Scale.FIT` 在初始化和窗口 resize 事件时会重算缩放,但游戏**从未注册自己的 resize / orientationchange / visualViewport 回调**,也没有任何 `this.scale.on('resize', ...)` 监听。所有场景的布局都用硬编码常量(`GAME_WIDTH=800` / `GAME_HEIGHT=450` 居中算坐标),布局是**一次性**的。

**技术分析:**

Phaser `Scale.FIT` 默认在 `window.resize` 时会重新计算 canvas 的 CSS 缩放,所以「画布等比缩放」这件事本身 Phaser 会兜住。问题在三个移动端高频场景下 FIT 的重算时机和游戏布局的静态性:

1. **竖屏 ↔ 横屏切换:** `orientationchange` 在部分移动浏览器上**先于**视口尺寸稳定就触发,Phaser 监听的是 `resize`,通常能跟上;但 iOS Safari 历史上有 `orientationchange` 后 `window.innerWidth/Height` 短暂返回旧值的 bug,FIT 可能用错误尺寸算一帧,导致旋转瞬间画布尺寸闪烁/错位。由于游戏没有自己的 `scale.refresh()` 兜底,**无法在尺寸稳定后强制重算**。

2. **浏览器地址栏收起/展开(iOS Safari、Android Chrome):** 滚动或交互导致地址栏动态收起时,`window.innerHeight` 会变化但**经典 `resize` 事件在 iOS Safari 上对地址栏变化触发不可靠**;`visualViewport` API 才是权威信号。游戏没监听 `visualViewport.on('resize')`,地址栏一收起,可用高度变大,FIT 不一定及时重算 → 底部出现一条空隙或画布短暂未填满。

3. **软键盘弹出:** 本项目所有 UI 都是 Phaser GameObject、无 DOM `<input>`,**理论上不会触发软键盘** —— 这一项风险天然较低(算是架构红利)。唯一例外是浏览器自身或第三方注入(如调试)弹键盘,但非游戏自身路径。

4. **布局静态性放大问题:** 即便 FIT 重算了 canvas CSS 尺寸,游戏内部坐标系永远是 800×450,所以内容不会「重排」(这对固定分辨率方案是对的)。真正的风险是 **canvas 的实际 CSS 尺寸 / 黑边比例变了而游戏没机会响应**(例如想根据黑边位置调整安全区 UI —— 见 P1-3),目前完全没有这个 hook。

**修复建议:**

1. **在 BootScene 注册一个全局 resize 兜底:**
   ```ts
   this.scale.on('resize', (gameSize, baseSize, displaySize) => {
     // 固定分辨率方案下内部坐标不变,这里主要用于:
     // 1) 触发 safe-area UI 重定位(见 P1-3)
     // 2) 必要时 this.scale.refresh()
   });
   ```
2. **监听 `visualViewport`(若存在)以捕获地址栏/键盘导致的可用区变化:**
   ```ts
   if (window.visualViewport) {
     window.visualViewport.addEventListener('resize', () => game.scale.refresh());
   }
   ```
3. **`orientationchange` 后延迟强制 refresh** 以绕过 iOS innerHeight 滞后:
   ```ts
   window.addEventListener('orientationchange', () => {
     setTimeout(() => game.scale.refresh(), 200);
   });
   ```
4. 这些应集中在一个 `setupViewport(game)` 工具里,在 `main.ts` 创建 game 后调用,避免散落各 scene。

---

## P1-1 [P1] Scale 配置缺少 `parent` / `fullscreenTarget` / `min`/`max` —— 全屏目标与缩放边界未定义

**文件:** `src/config.ts:22-25`

```ts
scale: {
  mode: Phaser.Scale.FIT,
  autoCenter: Phaser.Scale.CENTER_BOTH,
},
```

**问题:** Scale 配置只有 `mode` 和 `autoCenter`,缺少几个移动端关键字段:

**技术分析:**

1. **无 `parent`:** Phaser 把 canvas 直接挂在 `<body>`(body 用了 flex 居中)。FIT 模式下 Phaser 测量的是 parent 容器尺寸;挂 body 时测的是 body 的 flex 盒。body 设了 `height:100vh` —— 在移动端 `100vh` 包含地址栏高度(iOS Safari 上 `100vh` 是「地址栏收起时」的高度,常导致内容比可视区高),这会让 FIT 的可用高度计算偏大,与 P0-2 的地址栏问题叠加。建议显式提供一个尺寸受控的 `parent` div,或用 `100dvh`(动态视口高度)替代 `100vh`。

2. **无 `fullscreenTarget`:** Phaser 自带的 `scale.startFullscreen()` 未被使用(index.html 用的是裸 DOM `requestFullscreen`)。如果将来想用 Phaser 的全屏管理,需要指定 target。当前两套全屏机制(DOM 层 vs Phaser 层)割裂,建议统一到 Phaser 的 `ScaleManager`(它内部已处理 webkit 前缀和部分兼容)。

3. **无 `min`/`max`:** FIT 会无限放大,在 4K 横屏或超宽屏上 800×450 被放大到极大,像素块巨大。对像素风可能是想要的效果,但缺少上限会让超大屏体验失控。可选加 `max: { width: 1600, height: 900 }` 之类限制。

4. **无 `expandParent`:** 默认 `true`,通常 OK,但配合 body flex 居中时偶有冲突,值得显式声明意图。

**修复建议:**
```ts
scale: {
  mode: Phaser.Scale.FIT,
  autoCenter: Phaser.Scale.CENTER_BOTH,
  parent: 'game-root',          // 在 index.html 加 <div id="game-root">
  fullscreenTarget: 'game-root',
  expandParent: true,
  // 可选:max: { width: 1600, height: 900 },
},
```
并在 index.html 把 `height:100vh` 改为 `height:100dvh`(es2020 目标下需注意 dvh 兼容,见 P2-1)。

---

## P1-2 [P1] 高 DPR 设备:canvas 仅 800×450 物理像素被拉伸,无 `resolution`/`zoom` 策略(像素风可接受但应显式声明)

**文件:** `src/config.ts:16-25`(无 `resolution` / `zoom`)、`index.html:10`(`image-rendering: pixelated`)

**问题:** 配置中 `width:800, height:450`,无 `resolution`(Phaser 3 已弃用该字段但仍影响 backing store)、无 `zoom`。在 DPR=3 的 iPhone 上,canvas 的 drawing buffer 仍是 800×450 物理像素,再被 CSS 拉伸到全屏(逻辑像素 × DPR)。

**技术分析:**

- **这对像素风是「可接受甚至理想」的:** 800×450 渲染缓冲 + `image-rendering: pixelated`(index.html:10 已设)→ 每个游戏像素被整齐放大成方块,保留锐利的 pixel-art 观感。如果反而按 DPR 渲染(2400×1350 backing store),像素风会被高分辨率「平滑」掉,失去风格。所以**当前行为对本项目是对的**。
- **风险点 1 —— 缩放比例非整数倍:** FIT 把 800×450 缩放到任意屏幕尺寸,缩放系数极少是整数(如 iPhone 横屏 844×390 可视区,缩放系数 ≈ 0.866)。非整数缩放 + `pixelated` 会产生**像素块大小不均**(有的 1px 占 2 物理像素,有的占 3),即「像素抖动 / 不规则」。`roundPixels:true`(config.ts:21)缓解了游戏内对象的子像素定位,但**不能**改变 canvas 整体被 FIT 非整数拉伸的事实。这是固定分辨率 + FIT 方案的固有取舍。
- **风险点 2 —— 文字清晰度:** Phaser `Text` 在 800×450 缓冲里以小字号渲染再被放大,中文在小尺寸下可能糊。若发现文字糊,可考虑对关键文字用更高 `resolution` 的 Text(Phaser Text 支持单独 `setResolution`),而非全局提分辨率。
- **缺显式声明:** 当前「低分辨率拉伸」是 Phaser 默认行为碰巧符合需求,代码里**没有注释或配置表明这是有意为之**,后人可能误以为是 bug 而「修复」成 DPR 渲染,破坏像素风。

**修复建议:**
1. **保持现状**(低分辨率 backing store)对像素风是正确的 —— 但**加注释固化意图**:
   ```ts
   // 像素风刻意保持 800×450 backing store + image-rendering:pixelated,
   // 让像素被整齐放大;不要按 DPR 提分辨率,否则会平滑掉像素风。
   ```
2. 若要追求整数倍缩放(消除像素抖动),需引入 `Scale.ENVELOP` 或自定义 `Scale.NONE` + 手动计算整数 zoom,但会牺牲 letterbox 的「完整可见」保证。**不建议**,FIT 的「全部内容可见」对 UI 密集的自走棋更重要。
3. 文字若实测糊,局部 `text.setResolution(window.devicePixelRatio)` 处理。

---

## P1-3 [P1] 刘海 / 安全区完全未处理 —— 当前靠 FIT 两侧黑边「侥幸」规避,全屏成功即暴露

**文件:** `index.html:5`(`viewport-fit=cover` 已设)、全 `src/`(无 `safe-area-inset` 处理)

**问题:** `viewport-fit=cover` 已在 meta 中设置(允许内容延伸到刘海区),但游戏内**没有任何地方读取 `env(safe-area-inset-*)`**,CSS 和 Phaser 布局都无安全区感知。

**技术分析:**

逐条回答任务中的关键疑问:

1. **FIT + CENTER_BOTH 在全面屏上的黑边在哪一侧?** 游戏 16:9(800:450),全面屏如 19.5:9(iPhone 横屏可视区 ≈ 844×390,比例 ≈ 2.16:9 实际是 21.6:9 等效)比游戏更宽。FIT 以「高度撑满」拉到屏幕高度,**宽度不够 → 黑边出现在左右两侧**(竖向 letterbox 条)。
2. **横屏刘海在哪一侧?** iPhone 横握时,刘海(及屏幕一侧的圆角/Home 指示条)位于屏幕**左侧或右侧**(取决于左横/右横),也就是和 FIT 黑边**同一侧**。
3. **所以当前「侥幸」在于:** 由于横屏刘海在左右,而 FIT 黑边也在左右,**刘海大概率正好落在黑边区域里**,不会遮挡游戏内容 —— 这就是任务里说的「恰好规避」。**但这是巧合,不是设计**,且有三个破绽:
   - **黑边宽度 < 刘海宽度时仍会被吃。** 如果某设备宽高比只比 16:9 略宽(如某些 18:9 设备,黑边很窄),刘海可能比黑边宽,贴边的 UI(返回按钮、金币数等常放屏幕角落)会被刘海/圆角切掉。
   - **一旦 Android 全屏锁横屏成功(P0-1),沉浸式全屏下系统手势区 / 挖孔仍占物理空间**,FIT 是按可视区算的,但挖孔在可视区内部,角落 UI 仍可能被压。
   - **底部 Home 指示条(iPhone)** 横屏时在屏幕底部一条,FIT 黑边在左右、**不在底部**,所以底部贴边 UI(若有)会与 Home 条重叠 —— 这条**不被左右黑边规避**。
4. **游戏内 UI 是否贴边?** 自走棋类 UI 普遍把资源栏、按钮放在屏幕四角/边缘。需逐场景核查角落 UI 与 800×450 边界的距离;当前无安全区 padding,贴边元素在刘海设备上有被切风险。

**修复建议:**
1. **不要依赖 FIT 黑边兜底安全区** —— 那是脆弱的隐式契约。显式处理:
2. **CSS 层给 parent 容器加安全区 padding**(配合 P1-1 的 `#game-root`):
   ```css
   #game-root {
     padding: env(safe-area-inset-top) env(safe-area-inset-right)
              env(safe-area-inset-bottom) env(safe-area-inset-left);
   }
   ```
   （注意:FIT 会重算缩放,这样做会缩小可用区、增大黑边,但保证内容不被刘海吃。）
3. **或在游戏内引入安全区感知布局:** 读取 `env(safe-area-inset-*)`(通过临时 DOM 元素的 computed style 取值,Phaser 无法直接读 CSS env),换算到 800×450 坐标系,给角落 UI 留出动态 inset。配合 P0-2 的 resize hook 在旋转/全屏变化时重定位。这是较重的方案,建议仅对真正贴边的关键 UI 做。
4. **最小可行方案:** 给所有角落 UI 预留一个固定的「安全 padding」(如距边 16~24 游戏像素),牺牲一点屏占换取跨设备不被切。对像素风 UI 通常可接受。

---

## P2-1 [P2] vite build target `es2020` 与旧手机浏览器兼容性

**文件:** `vite.config.ts:16`(`target: 'es2020'`)

**问题:** 构建目标 `es2020`。

**技术分析:**
- `es2020` 要求支持可选链 `?.`、空值合并 `??`、`BigInt`、动态 import、`Promise.allSettled` 等。覆盖范围:iOS Safari 13.4+、Android Chrome 80+(2020 年初)。**对 2020 年后的设备没问题。**
- **真正的兼容下限不在 es2020,而在 Phaser 3.90 + WebGL**(见 P2-2)。极老的 Android 4.x WebView(Chrome 30-ish)既不支持 es2020 也不支持现代 WebGL,但这类设备 2026 年已基本退役,不值得为其降级 target。
- **风险点 —— `100dvh` / `env(safe-area-inset)`:** 若按 P1-1/P1-3 建议引入 `dvh` 单位和 `env()`,注意 `dvh` 需 iOS Safari 15.4+ / Chrome 108+;`env(safe-area-inset)` 需 iOS 11.2+。比 es2020 的下限略高,但同样覆盖绝大多数在用设备。可用 `@supports` 兜底或 fallback 到 `100vh`。
- Vite 7 默认 target 行为 + 此处显式 es2020,**不会**进一步 polyfill;若需支持更老设备要加 `@vitejs/plugin-legacy`,但**不建议**(为已退役设备增重)。

**修复建议:** `es2020` 对 2026 年的目标设备合理,**保持**。仅在引入 dvh/env 时加 `@supports` fallback。无需 legacy plugin。

---

## P2-2 [P2] Phaser.AUTO 在低端安卓 WebView 的 WebGL fallback 行为(简述)

**文件:** `src/config.ts:17`(`type: Phaser.AUTO`)

**技术分析(简述):**
- `Phaser.AUTO` 启动时先尝试 **WebGL**,失败则自动回退到 **Canvas 2D** renderer。这是正确选择,给了低端设备一条退路。
- **低端安卓 Webde 上的实际表现:**
  - WebGL 可用但慢:大量 `setTintFill` 闪白、粒子(ParticleManager)、纹理生成在弱 GPU 上仍可能卡顿,但能跑。
  - WebGL 不可用(极老 WebView / 被厂商禁用 / 黑名单 GPU):回退 Canvas 2D。**此时 `setTintFill()` / `clearTint()`(项目用于受击闪白,见 CLAUDE.md)在 Canvas renderer 下行为与 WebGL 不同** —— Phaser 的 tint 在 Canvas 2D 下支持有限(尤其 `tintFill`),受击闪白等效果可能失效或变色。粒子性能也会显著下降。
  - 运行时 `generateTexture()`(像素单位合成)在 Canvas renderer 下可用,但每帧合成压力更大。
- **建议(无需现在改):**
  1. 保持 `Phaser.AUTO`(正确)。
  2. 在受击闪白等依赖 `tintFill` 的视觉上,**意识到 Canvas fallback 下可能降级**;若要保证低端一致性,可改用叠加白色半透明 sprite 而非 tintFill(但这是优化项,非 P0)。
  3. 可选:启动时检测 `game.renderer.type`(`Phaser.WEBGL` vs `Phaser.CANVAS`),若为 Canvas 给出「设备图形性能有限」提示或自动关闭粒子。属于 performance-analyst 范畴,非视口架构核心。

---

## 跨问题观察:架构层面的结构性意见

1. **移动端逻辑应从 index.html 抽到一个受测的 TS 模块。** 当前全屏/锁屏/旋转判断散在 58 行 HTML 的内联 script 里,无法单测、无法复用、无法被 BootScene 协同。建议建立 `src/utils/viewport.ts`,集中:设备检测、全屏/锁屏(带 iOS 兜底)、resize/orientation/visualViewport 监听、safe-area 读取。`main.ts` 创建 game 后调用 `setupViewport(game)`。
2. **「固定分辨率 + FIT」是对的选型,不要推翻。** 对像素风 + UI 密集的自走棋,「全部内容可见 + 等比缩放 + 内部坐标恒定」远比响应式重排省心。本报告所有 P0/P1 都是**在这个正确选型之上补运行时适配层**,不是要换方案。
3. **隐式契约风险:** P1-2(低分辨率拉伸)和 P1-3(黑边规避刘海)都是「Phaser/FIT 默认行为碰巧满足需求」的隐式契约,代码无注释、无测试保护。这类「靠运气」的正确性在重构时极易被破坏。建议至少加注释固化意图,有条件加一个视口冒烟测试(在不同模拟尺寸下断言关键 UI 不超出安全边界)。

---

## 整体评分:5 / 10

**评分理由:**

| 维度 | 评价 |
|------|------|
| 架构选型(FIT + 固定分辨率) | 优秀 —— 对像素风横屏自走棋是教科书式正确选择 |
| 桌面浏览器适配 | 良好 —— FIT 在桌面上开箱即用 |
| Android 移动端适配 | 中等 —— 全屏/锁横屏可工作,但无 resize/safe-area 兜底 |
| iOS 移动端适配 | 差 —— 全屏/锁屏路径必然静默失败,体验降级且无 fallback 引导 |
| 运行时韧性(旋转/地址栏/键盘) | 差 —— 零监听,全靠 Phaser FIT 默认行为兜底 |
| 安全区/刘海 | 差 —— 完全未处理,靠黑边「侥幸」规避,脆弱 |
| 高 DPR 策略 | 中等 —— 行为对像素风正确,但是隐式的、无注释 |
| 构建兼容性 | 良好 —— es2020 + AUTO renderer 对 2026 设备合理 |

**一句话:** 选型满分,移动端运行时适配层接近空白。当前真机体验「能跑」靠的是 Phaser FIT 的默认健壮性和左右黑边恰好遮住横屏刘海的运气,而非有意设计。修掉 P0-1(iOS 路径)和 P0-2(resize 兜底)即可把分数提到 7;再补 P1-3(安全区)可达 8。

---

## 修复优先级建议

| 优先级 | 问题 | 工作量 | 影响 |
|--------|------|--------|------|
| P0-1 | iOS 全屏/锁屏路径解耦 + iOS 引导 | 小(改 index.html) | 高 —— 影响全部 iPhone 用户 |
| P0-2 | resize/orientation/visualViewport 兜底监听 | 中(新建 viewport.ts) | 高 —— 旋转/地址栏稳定性 |
| P1-3 | 安全区 padding(至少角落 UI 留 inset) | 中 | 中 —— 刘海设备 UI 被切 |
| P1-1 | 显式 parent + dvh + scale 边界 | 小 | 中 |
| P1-2 | 加注释固化低分辨率拉伸意图 | 极小 | 低(防回归) |
| P2-1 | es2020 保持,引入 dvh/env 时加 @supports | 极小 | 低 |
| P2-2 | 意识到 Canvas fallback 下 tintFill 降级 | 0(认知) | 低 |
