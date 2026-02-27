/**
 * Vitest setup file: provides minimal browser globals that Phaser expects.
 * This runs before any test file.
 */

// Helper to safely set properties that may have only getters
function safeDefine(obj: any, prop: string, value: any) {
  try {
    Object.defineProperty(obj, prop, { value, writable: true, configurable: true });
  } catch {
    // Ignore if not configurable
  }
}

// 'window' must point to globalThis itself
safeDefine(globalThis, 'window', globalThis);

// Minimal document stub
safeDefine(globalThis, 'document', {
  createElement: (tag: string) => {
    if (tag === 'canvas') {
      return {
        getContext: () => ({
          fillRect: () => {},
          clearRect: () => {},
          drawImage: () => {},
          getImageData: () => ({ data: [] }),
          putImageData: () => {},
          createImageData: () => [],
          setTransform: () => {},
          resetTransform: () => {},
          measureText: () => ({ width: 0 }),
          canvas: { width: 0, height: 0 },
        }),
        style: {},
        width: 0,
        height: 0,
        addEventListener: () => {},
        removeEventListener: () => {},
        setAttribute: () => {},
        toDataURL: () => '',
      };
    }
    return {
      getContext: () => null,
      style: {},
      addEventListener: () => {},
      removeEventListener: () => {},
      setAttribute: () => {},
      appendChild: () => {},
      cloneNode: () => ({}),
    };
  },
  createElementNS: () => ({
    style: {},
    setAttribute: () => {},
    setAttributeNS: () => {},
  }),
  body: {
    appendChild: () => {},
    removeChild: () => {},
  },
  documentElement: {
    style: {},
  },
  addEventListener: () => {},
  removeEventListener: () => {},
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
  head: {
    appendChild: () => {},
  },
  readyState: 'complete',
});

// Navigator stub
safeDefine(globalThis, 'navigator', {
  userAgent: 'Mozilla/5.0 (Windows) node-test',
  language: 'en',
  languages: ['en'],
  platform: 'Win32',
  maxTouchPoints: 0,
  getGamepads: () => [],
  vibrate: () => false,
});

// Various browser APIs Phaser checks for
safeDefine(globalThis, 'HTMLCanvasElement', class {});
safeDefine(globalThis, 'HTMLVideoElement', class {});
safeDefine(globalThis, 'HTMLImageElement', class {});
safeDefine(globalThis, 'HTMLElement', class {});
safeDefine(globalThis, 'Node', class {});
safeDefine(globalThis, 'Image', class {
  src = '';
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  width = 0;
  height = 0;
  addEventListener() {}
});

safeDefine(globalThis, 'WebGLRenderingContext', class {});
safeDefine(globalThis, 'WebGL2RenderingContext', class {});
safeDefine(globalThis, 'CanvasRenderingContext2D', class {});

safeDefine(globalThis, 'AudioContext', class {
  createGain() { return { connect: () => {}, gain: { value: 0 } }; }
  createBufferSource() { return { connect: () => {}, start: () => {}, stop: () => {}, buffer: null }; }
  createOscillator() { return { connect: () => {}, start: () => {}, stop: () => {}, type: '' }; }
  decodeAudioData() { return Promise.resolve(); }
  close() { return Promise.resolve(); }
  get currentTime() { return 0; }
  get destination() { return {}; }
  get state() { return 'running'; }
  resume() { return Promise.resolve(); }
});
safeDefine(globalThis, 'webkitAudioContext', (globalThis as any).AudioContext);

safeDefine(globalThis, 'XMLHttpRequest', class {
  open() {}
  send() {}
  setRequestHeader() {}
  addEventListener() {}
  get readyState() { return 4; }
  get status() { return 200; }
  get response() { return ''; }
});

safeDefine(globalThis, 'fetch', () => Promise.resolve({
  ok: true,
  json: () => Promise.resolve({}),
  text: () => Promise.resolve(''),
  arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
}));

safeDefine(globalThis, 'requestAnimationFrame', (cb: Function) => setTimeout(cb, 16));
safeDefine(globalThis, 'cancelAnimationFrame', (id: number) => clearTimeout(id));
safeDefine(globalThis, 'matchMedia', () => ({
  matches: false,
  addEventListener: () => {},
  removeEventListener: () => {},
}));

safeDefine(globalThis, 'screen', {
  width: 1920,
  height: 1080,
  orientation: { type: 'landscape-primary' },
});

safeDefine(globalThis, 'innerWidth', 800);
safeDefine(globalThis, 'innerHeight', 600);
safeDefine(globalThis, 'outerWidth', 800);
safeDefine(globalThis, 'outerHeight', 600);
safeDefine(globalThis, 'devicePixelRatio', 1);
safeDefine(globalThis, 'pageXOffset', 0);
safeDefine(globalThis, 'pageYOffset', 0);
safeDefine(globalThis, 'scrollX', 0);
safeDefine(globalThis, 'scrollY', 0);

// Event listeners on window
safeDefine(globalThis, 'addEventListener', () => {});
safeDefine(globalThis, 'removeEventListener', () => {});
safeDefine(globalThis, 'dispatchEvent', () => true);
safeDefine(globalThis, 'getComputedStyle', () => ({
  getPropertyValue: () => '',
}));
safeDefine(globalThis, 'focus', () => {});
