# 音频资源命名与接入规范 (Audio Naming Convention)

适用于未来引入真实音频资产时的命名、目录与接入约定。当前版本音频为 AudioManager 程序化方案(WebAudio 合成 + detune 变体),本规范保证资产到位后可平滑替换。

## 目录结构

```
public/assets/audio/
  bgm/        # 背景音乐(循环)
  sfx/        # 音效(单次)
  stinger/    # 短乐句(胜利/失败/Boss 登场)
```

## 命名规则

格式:`<类别>_<场景或对象>_<描述>[_v<变体>].<扩展名>`,全小写,下划线分隔。

### BGM(循环,ogg 优先 + m4a 回退)

| 文件名 | 用途 |
|--------|------|
| `bgm_menu_main.ogg` | 主菜单 |
| `bgm_map_act1.ogg` … `bgm_map_act4.ogg` | 地图(按幕) |
| `bgm_battle_act1.ogg` … `bgm_battle_act4.ogg` | 普通战斗(按幕,对应 AudioManager.setBattleAct) |
| `bgm_battle_boss.ogg` | Boss 战 |
| `bgm_shop.ogg` | 商店 |

### SFX(单次,≤2s)

| 前缀 | 示例 | 说明 |
|------|------|------|
| `sfx_ui_` | `sfx_ui_click.ogg`, `sfx_ui_buy.ogg` | UI 交互 |
| `sfx_hit_` | `sfx_hit_physical.ogg`, `sfx_hit_crit.ogg` | 命中(物理/暴击) |
| `sfx_skill_` | `sfx_skill_fire.ogg`, `sfx_skill_heal.ogg` | 技能(按元素/类型,不按具体技能) |
| `sfx_react_` | `sfx_react_ignite.ogg`, `sfx_react_freeze.ogg` | 元素反应(4 种) |
| `sfx_unit_` | `sfx_unit_death.ogg`, `sfx_unit_levelup.ogg` | 单位事件 |

变体:`sfx_hit_physical_v2.ogg` 等,AudioManager.playSfxVariant 随机选取以避免重复疲劳(当前用 detune 模拟)。

### Stinger

| 文件名 | 用途 |
|--------|------|
| `stinger_victory.ogg` | 战斗胜利 |
| `stinger_defeat.ogg` | 战斗失败 |
| `stinger_boss_intro.ogg` | Boss 登场 |

## 技术约定

- **格式**:OGG Vorbis 主格式(Safari 走 m4a 回退);BGM ≤ 192kbps,SFX ≤ 128kbps。
- **响度**:BGM 目标 -16 LUFS,SFX 峰值 ≤ -3dBFS;混音平衡由 AudioManager 的 bgm/sfx 双总线控制,资产本身不做响度补偿。
- **循环**:BGM 必须无缝循环(导出时去首尾静音);切换用 AudioManager 的 fadingBgm 交叉淡入淡出。
- **接入**:所有播放经 AudioManager 事件接口(UI 规则:界面不直接播音频);新增资产 key 与文件名一致(去扩展名)。
- **优先级**:SFX 走 AudioManager 优先级节流(同帧只播最高优先级,防爆音),新增 SFX 必须登记优先级。
