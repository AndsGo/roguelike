/**
 * Minimal Phaser stub for testing in Node.js environment.
 * Replaces the full Phaser module to avoid browser dependencies.
 */

class MockGameObject {
  x = 0;
  y = 0;
  alpha = 1;
  visible = true;
  active = true;
  scene: any = null;
  angle = 0;
  scaleX = 1;
  scaleY = 1;
  depth = 0;
  private _data: Record<string, any> = {};

  setVisible(v: boolean) { this.visible = v; return this; }
  setAlpha(a: number) { this.alpha = a; return this; }
  setOrigin() { return this; }
  setPosition(x: number, y: number) { this.x = x; this.y = y; return this; }
  setScale(sx?: number, _sy?: number) { this.scaleX = sx ?? 1; this.scaleY = _sy ?? sx ?? 1; return this; }
  setDepth(d: number) { this.depth = d; return this; }
  setStrokeStyle() { return this; }
  setSize() { return this; }
  setInteractive() { return this; }
  setActive(v: boolean) { this.active = v; return this; }
  setY(y: number) { this.y = y; return this; }
  setMask() { return this; }
  setScrollFactor() { return this; }
  createGeometryMask() { return {}; }
  on() { return this; }
  off() { return this; }
  emit() { return this; }
  destroy() {}
  setData(key: string, value: any) { this._data[key] = value; return this; }
  getData(key: string) { return this._data[key]; }
  disableInteractive() { return this; }
  setColor() { return this; }
  setText(t: string) { return this; }
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
  fillRoundedRect() { return this; }
  fillCircle() { return this; }
  fillPoints() { return this; }
  fillTriangle() { return this; }
  strokeTriangle() { return this; }
  clear() { return this; }
  lineStyle() { return this; }
  strokeRect() { return this; }
  strokeRoundedRect() { return this; }
  strokeCircle() { return this; }
  strokePoints() { return this; }
  lineBetween() { return this; }
  arc() { return this; }
  beginPath() { return this; }
  moveTo() { return this; }
  lineTo() { return this; }
  closePath() { return this; }
  strokePath() { return this; }
  fillPath() { return this; }
  generateTexture(key: string) { (this.scene as any)?.textures?._keys?.add(key); return this; }
}

class Image extends MockGameObject {
  private _textureKey = '';

  constructor(scene?: any, x?: number, y?: number, key?: string) {
    super();
    this.scene = scene;
    this.x = x ?? 0;
    this.y = y ?? 0;
    this._textureKey = key ?? '';
  }

  setTexture(key: string) { this._textureKey = key; return this; }
  setTintFill(_color: number) { return this; }
  clearTint() { return this; }
  setTint(_color: number) { return this; }
}

class Particles extends MockGameObject {
  explode() { return this; }
  stop() { return this; }
  setConfig() { return this; }
  setParticleTint() { return this; }
}

class Circle extends MockGameObject {
  radius = 0;
  fillColor = 0;
  constructor(scene?: any, x?: number, y?: number, r?: number, color?: number) {
    super();
    this.scene = scene;
    this.x = x ?? 0;
    this.y = y ?? 0;
    this.radius = r ?? 0;
    this.fillColor = color ?? 0;
  }
  setStrokeStyle() { return this; }
  setFillStyle() { return this; }
}

class Zone extends MockGameObject {
  width = 0;
  height = 0;
  constructor(scene?: any, x?: number, y?: number, w?: number, h?: number) {
    super();
    this.scene = scene;
    this.x = x ?? 0;
    this.y = y ?? 0;
    this.width = w ?? 0;
    this.height = h ?? 0;
  }
}

class Scene {
  private _children: MockGameObject[] = [];

  add = {
    rectangle: (x: number, y: number, w: number, h: number, color: number, alpha?: number) => { const o = new Rectangle(this, x, y, w, h, color); this._children.push(o); return o; },
    text: (x: number, y: number, text: string, _style?: object) => { const o = new Text(this, x, y, text); this._children.push(o); return o; },
    graphics: () => { const o = new Graphics(); o.scene = this; this._children.push(o); return o; },
    image: (x: number, y: number, key: string) => { const o = new Image(this, x, y, key); this._children.push(o); return o; },
    existing: (obj: any) => { this._children.push(obj); return obj; },
    container: (x: number, y: number) => { const o = new Container(this, x, y); this._children.push(o); return o; },
    particles: (_x: number, _y: number, _key: string, _config?: object) => { const o = new Particles(); this._children.push(o); return o; },
    zone: (x: number, y: number, w: number, h: number) => { const o = new Zone(this, x, y, w, h); this._children.push(o); return o; },
    circle: (x: number, y: number, r: number, color?: number, _alpha?: number) => { const o = new Circle(this, x, y, r, color); this._children.push(o); return o; },
  };

  textures = {
    _keys: new Set<string>(),
    exists(key: string) { return this._keys.has(key); },
  };

  tweens = {
    add: (config: any) => {
      if (typeof config.onComplete === 'function') {
        config.onComplete();
      }
      return {};
    },
    addCounter: (config: any) => {
      // Immediately call onUpdate with the 'to' value and then onComplete
      if (typeof config.onUpdate === 'function') {
        config.onUpdate({ getValue: () => config.to ?? 0 });
      }
      if (typeof config.onComplete === 'function') {
        config.onComplete();
      }
      return {};
    },
    killAll: () => {},
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

  children = {
    getAll: () => this._children,
    removeAll: () => { this._children.length = 0; },
  };

  input = {
    on: () => {},
    off: () => {},
    keyboard: {
      addKey: () => ({ on: () => {} }),
    },
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

class GeomRectangle {
  x: number;
  y: number;
  width: number;
  height: number;
  constructor(x = 0, y = 0, w = 0, h = 0) {
    this.x = x; this.y = y; this.width = w; this.height = h;
  }
  static Contains(rect: GeomRectangle, x: number, y: number): boolean {
    return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
  }
}

const Phaser = {
  Scene,
  GameObjects: {
    Container,
    Rectangle,
    Text,
    Graphics,
    Zone,
    GameObject: MockGameObject,
    Sprite: MockGameObject,
    Image,
    Particles: {
      ParticleEmitter: Particles,
    },
  },
  Geom: {
    Rectangle: GeomRectangle,
  },
  Input: {
    Keyboard: {
      KeyCodes: {
        ONE: 49, TWO: 50, THREE: 51, FOUR: 52,
        FIVE: 53, SIX: 54, SEVEN: 55, EIGHT: 56,
      } as Record<string, number>,
    },
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
export { Scene, Container, Rectangle, Text, Graphics, Image };
