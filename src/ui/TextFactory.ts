import Phaser from 'phaser';

export type TextPreset = 'title' | 'subtitle' | 'body' | 'label' | 'small' | 'tiny';

const FONT_FAMILY = '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", monospace';

const PRESETS: Record<TextPreset, Phaser.Types.GameObjects.Text.TextStyle> = {
  title:    { fontSize: '22px', fontFamily: FONT_FAMILY, fontStyle: 'bold' },
  subtitle: { fontSize: '16px', fontFamily: FONT_FAMILY, fontStyle: 'bold' },
  body:     { fontSize: '13px', fontFamily: FONT_FAMILY },
  label:    { fontSize: '11px', fontFamily: FONT_FAMILY, fontStyle: 'bold' },
  small:    { fontSize: '10px', fontFamily: FONT_FAMILY },
  tiny:     { fontSize: '9px',  fontFamily: FONT_FAMILY },
};

export class TextFactory {
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
    // Override pixelArt nearest-neighbor filtering for crisp text
    if (textObj.texture?.setFilter) {
      textObj.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
    }
    return textObj;
  }
}
