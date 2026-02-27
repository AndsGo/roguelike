/**
 * Minimal Phaser stub for testing in Node.js environment.
 * Replaces the full Phaser module to avoid browser dependencies.
 */

class MockGameObject {
  x = 0;
  y = 0;
  alpha = 1;
  visible = true;
  scene: any = null;

  setVisible(v: boolean) { this.visible = v; return this; }
  setAlpha(a: number) { this.alpha = a; return this; }
  setOrigin() { return this; }
  setPosition(x: number, y: number) { this.x = x; this.y = y; return this; }
  destroy() {}
}

class Container extends MockGameObject {
  list: any[] = [];

  constructor(scene?: any, x?: number, y?: number) {
    super();
    this.scene = scene;
    this.x = x ?? 0;
    this.y = y ?? 0;
  }

  add(child: any) { this.list.push(child); return this; }
  remove(child: any) {
    const idx = this.list.indexOf(child);
    if (idx !== -1) this.list.splice(idx, 1);
    return this;
  }
}

class Rectangle extends MockGameObject {
  fillColor = 0;
  width = 0;
  height = 0;

  constructor(scene?: any, x?: number, y?: number, w?: number, h?: number, color?: number) {
    super();
    this.scene = scene;
    this.x = x ?? 0;
    this.y = y ?? 0;
    this.width = w ?? 0;
    this.height = h ?? 0;
    this.fillColor = color ?? 0;
  }

  setFillStyle(color: number) { this.fillColor = color; return this; }
}

class Text extends MockGameObject {
  text = '';

  constructor(scene?: any, x?: number, y?: number, text?: string) {
    super();
    this.scene = scene;
    this.x = x ?? 0;
    this.y = y ?? 0;
    this.text = text ?? '';
  }

  setText(t: string) { this.text = t; return this; }
  setStyle() { return this; }
  setColor() { return this; }
  setFontSize() { return this; }
  setWordWrapWidth() { return this; }
}

class Graphics extends MockGameObject {
  fillStyle() { return this; }
  fillRect() { return this; }
  clear() { return this; }
  lineStyle() { return this; }
  strokeRect() { return this; }
  beginPath() { return this; }
  moveTo() { return this; }
  lineTo() { return this; }
  closePath() { return this; }
  strokePath() { return this; }
  fillPath() { return this; }
}

class Scene {
  add = {
    rectangle: (x: number, y: number, w: number, h: number, color: number) => new Rectangle(this, x, y, w, h, color),
    text: (x: number, y: number, text: string, _style?: object) => new Text(this, x, y, text),
    graphics: () => new Graphics(),
    existing: (obj: any) => obj,
    container: (x: number, y: number) => new Container(this, x, y),
  };

  tweens = {
    add: (config: any) => {
      if (typeof config.onComplete === 'function') {
        config.onComplete();
      }
      return {};
    },
  };

  cameras = {
    main: {
      width: 800,
      height: 450,
      scrollX: 0,
      scrollY: 0,
      shake: () => {},
      flash: () => {},
      fadeIn: () => {},
      fadeOut: () => {},
    },
  };

  time = {
    delayedCall: (_delay: number, callback: () => void) => {
      callback();
      return { remove: () => {} };
    },
    now: Date.now(),
    addEvent: () => ({ remove: () => {} }),
  };

  physics = {
    add: {
      existing: (obj: any) => obj,
    },
  };

  events = {
    on: () => {},
    off: () => {},
    emit: () => {},
    once: () => {},
  };

  scene = {
    start: () => {},
    launch: () => {},
    stop: () => {},
    get: () => null,
  };

  input = {
    on: () => {},
    off: () => {},
  };

  sys = {
    game: {
      config: {},
      events: { on: () => {}, off: () => {}, emit: () => {} },
    },
    settings: { active: true },
  };

  scale = {
    width: 800,
    height: 450,
  };
}

const Phaser = {
  Scene,
  GameObjects: {
    Container,
    Rectangle,
    Text,
    Graphics,
    GameObject: MockGameObject,
    Sprite: MockGameObject,
    Image: MockGameObject,
  },
  Math: {
    Between: (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min,
    Clamp: (val: number, min: number, max: number) => Math.max(min, Math.min(max, val)),
    Distance: {
      Between: (x1: number, y1: number, x2: number, y2: number) => {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
      },
    },
    FloatBetween: (min: number, max: number) => Math.random() * (max - min) + min,
  },
  Physics: {
    Arcade: {
      Sprite: MockGameObject,
      Body: class {},
      Group: class { children = { entries: [] }; },
    },
  },
  Display: {
    Color: {
      IntegerToColor: () => ({ r: 0, g: 0, b: 0 }),
      GetColor: () => 0,
    },
  },
  Tweens: {
    TweenManager: class {},
  },
  Scale: {
    FIT: 'FIT',
    CENTER_BOTH: 'CENTER_BOTH',
  },
  AUTO: 'AUTO',
  CANVAS: 'CANVAS',
  WEBGL: 'WEBGL',
  Game: class {
    constructor() {}
  },
};

export default Phaser;
export { Scene, Container, Rectangle, Text, Graphics };
