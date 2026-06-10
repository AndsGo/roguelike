# 性能预算 (Performance Budget)

适用范围:TypeScript + Phaser 3 + Vite,800×450 设计分辨率(Scale.RESIZE 动态适配),目标平台为桌面浏览器与中端移动设备。

## 帧率目标

| 场景 | 桌面 | 移动(中端) |
|------|------|--------------|
| 战斗(10 单位 + 特效) | 60 FPS 稳定 | ≥ 50 FPS,无 >100ms 卡顿 |
| 地图 / 菜单 / 商店 | 60 FPS | 60 FPS |
| 场景切换(fade) | 无丢帧 | 单次 <150ms 阻塞 |

## 单帧预算(战斗场景,16.6ms)

| 子系统 | 预算 | 现状机制 |
|--------|------|----------|
| BattleSystem.update(模拟) | ≤ 4ms | MAX_SIMULATION_STEP=50ms 分步;MAX_SIMULATION_FRAME=250ms 防追帧雪崩 |
| TargetingSystem | ≤ 1ms | O(n) 评分 + typed array + 500ms 缓存 |
| 渲染(Phaser) | ≤ 8ms | 单位为预生成纹理 Image,非逐帧 Graphics |
| UI/HUD 更新 | ≤ 2ms | 数值变化时才 setText |
| 预留(GC/特效峰值) | ~1.6ms | DamageAccumulator 合批,allUnitsBuf 复用 |

## 内存与资源

- **纹理**:像素单位纹理按 ChibiConfig 哈希缓存,只生成一次;精灵图按需加载(queueUnitSpriteSheets,in-flight 去重 + 60s 失效窗口)。
- **监听器**:每个 Scene 必须在 `shutdown()` 中 `.off()` 全部 EventBus 监听(防泄漏,见 CLAUDE.md Gotchas)。
- **对象分配**:战斗热路径禁止每帧 new 数组/对象(参考 `allUnitsBuf` 模式)。
- **localStorage**:存档 3 槽 + meta,总量保持 < 1MB。

## 加载预算

| 指标 | 预算 |
|------|------|
| 首屏可交互(桌面宽带) | < 2s |
| 进入战斗(已预取) | < 1s,显示进度条 |
| 生产构建 JS(gzip) | < 1.5MB |

战斗资源由 MapScene 后台预取;BattleScene preload 显示进度条兜底。

## 回归红线

以下任一情况视为性能回归,需在合并前修复:

1. 战斗场景出现可感知卡顿(>100ms 单帧)
2. 连续 3 场战斗后内存持续增长(监听器/纹理泄漏)
3. 构建产物 gzip 体积增长 >10% 且无对应功能解释
