# 移动浏览器适配设计文档

**日期:** 2026-03-15
**方案:** 最小侵入式适配 — FIT 模式 + 横屏锁定

## 目标

让 PC 端的 roguelike 自动战斗游戏在手机浏览器（Chrome/Safari）中横屏可玩，改动量最小化。

## 约束与决策

| 决策项 | 选择 | 理由 |
|--------|------|------|
| 发布方式 | 移动浏览器直接访问 | 无需打包，零分发成本 |
| 屏幕方向 | 仅横屏 | 战斗左右对阵天然适合横屏 |
| 缩放模式 | FIT（保持不变） | ENVELOP 在 19.5:9 手机上每侧裁切 ~87px 过多；FIT 的黑色 letterbox 与游戏暗色调一致，无 UI 位置调整需求 |
| 触控处理 | 不特别处理 | 现有 Button/Panel 已兼容 pointer 事件，FIT 放大后尺寸足够 |

### 为什么不用 ENVELOP

ENVELOP 模式按较短边填满后裁切溢出部分。在 19.5:9 手机横屏下：
- 游戏宽高比 800/450 = 1.778，手机宽高比 19.5/9 = 2.167
- 水平溢出 `(2.167/1.778 - 1) × 800 / 2 ≈ 87px` 被裁切
- 金币显示（x:785）、英雄头像（x:8）等完全消失
- 安全边距需设为 ~100px，导致 16:9 屏幕 UI 过于空旷
- 还会影响 PC 端非 16:9 显示器

FIT 模式避免了所有这些问题，代价仅是少量黑色 letterbox 条。

## 改动清单

### 1. 画布缩放模式 (`src/config.ts`)

**无需改动。** 当前已是 `Phaser.Scale.FIT` + `CENTER_BOTH`，正是我们需要的。

### 2. HTML 适配 (`index.html`)

#### 2.1 viewport meta 标签更新

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
```

- `maximum-scale=1.0, user-scalable=no` — 禁止双指缩放（干扰游戏操作）
- `viewport-fit=cover` — 告知浏览器内容覆盖安全区域（配合 CSS env()）

#### 2.2 横屏锁定脚本

```javascript
// 移动设备首次触摸时请求全屏 + 横屏锁定
function requestLandscape() {
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (!isMobile) return;

  document.addEventListener('touchend', function onFirstTouch() {
    document.removeEventListener('touchend', onFirstTouch);
    const el = document.documentElement;
    const rfs = el.requestFullscreen || el.webkitRequestFullscreen;
    if (rfs) {
      rfs.call(el).then(() => {
        if (screen.orientation && screen.orientation.lock) {
          screen.orientation.lock('landscape').catch(() => {});
        }
      }).catch(() => {});
    }
  }, { once: true });
}
requestLandscape();
```

**平台说明：**
- **Android Chrome:** 全屏 + 横屏锁定正常工作
- **iOS Safari:** 不支持 `requestFullscreen` 和 `orientation.lock`，依赖旋转提示遮罩（见 2.3）
- 使用 `touchend`（而非 `touchstart`）以提高浏览器全屏请求的兼容性

#### 2.3 iOS 旋转提示遮罩

```html
<div id="rotate-hint">
  <div style="font-size:48px;">↻</div>
  <div>请旋转手机至横屏</div>
</div>
```

```css
#rotate-hint {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  font-size: 24px;
  justify-content: center;
  align-items: center;
  z-index: 99999;
  flex-direction: column;
}

/* 仅在手机竖屏时显示（排除平板） */
@media (orientation: portrait) and (max-width: 768px) {
  #rotate-hint { display: flex; }
}
```

使用 `max-width: 768px`（而非 1024px）避免在平板竖屏时误触发。

#### 2.4 禁用移动端弹性滚动和缩放

```css
body {
  margin: 0;
  overflow: hidden;
  touch-action: none;
}

canvas {
  touch-action: manipulation;
}
```

- `touch-action: none` 在 body 上禁止所有默认触摸行为
- `touch-action: manipulation` 在 canvas 上额外确保无双击缩放
- 不使用 `position: fixed`（可能干扰 Phaser 输入坐标计算，尤其在地址栏显隐时）

## 不做的事情

- **不**改变缩放模式（保持 FIT）
- **不**调整任何 UI 元素位置（FIT 模式下完整可见）
- **不**添加设备检测分支逻辑
- **不**调整按钮/技能栏尺寸
- **不**重写 UI 定位为相对布局
- **不**处理竖屏游戏体验
- **不**添加虚拟摇杆/手势操作

## 影响范围

| 文件 | 改动类型 |
|------|---------|
| `index.html` | viewport meta、横屏锁定脚本、旋转提示 HTML/CSS、body/canvas 触控样式 |

**仅修改 1 个文件。** 无需修改任何 TypeScript 源码。

## 测试计划

- [ ] PC 端 Chrome 正常显示（无变化，回归验证）
- [ ] PC 端非 16:9 显示器正常显示（无变化）
- [ ] 手机 Chrome 横屏正常游玩（FIT 缩放 + letterbox）
- [ ] 手机 Safari 横屏正常游玩
- [ ] 旋转提示在手机竖屏时正确显示
- [ ] 旋转提示在平板竖屏时不显示
- [ ] 全屏 + 横屏锁定在 Android Chrome 工作
- [ ] 触控操作：技能栏点击、终极技能点击、地图拖拽、面板滚动、按钮点击
- [ ] 无法双指缩放或双击缩放
- [ ] 现有单元测试全部通过（无 TS 改动，预期无影响）
