import Phaser from 'phaser';

export type TextPreset = 'title' | 'subtitle' | 'body' | 'label' | 'small' | 'tiny';

const PRESETS: Record<TextPreset, Phaser.Types.GameObjects.Text.TextStyle> = {
  title:    { fontSize: '20px', fontFamily: 'monospace', fontStyle: 'bold' },
  subtitle: { fontSize: '14px', fontFamily: 'monospace', fontStyle: 'bold' },
  body:     { fontSize: '11px', fontFamily: 'monospace' },
  label:    { fontSize: '10px', fontFamily: 'monospace', fontStyle: 'bold' },
  small:    { fontSize: '9px', fontFamily: 'monospace' },
  tiny:     { fontSize: '8px', fontFamily: 'monospace' },
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
