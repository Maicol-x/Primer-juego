// Entorno de pruebas: stubs mínimos para que ThreeGameEngine pueda construirse
// bajo jsdom sin WebGL real ni AudioContext.

// --- Stubs de canvas / WebGL (jsdom no implementa getContext con contexto real) ---
// Three.js (WebGLState) consulta muchos parámetros GL durante la construcción
// del renderer. Devolvimos valores plausibles según el pname para evitar
// errores como `glVersion.indexOf is not a function`.
const GL_ENUMS = {
  VERSION: 0x1f02,
  SHADING_LANGUAGE_VERSION: 0x8b8c,
  MAX_TEXTURE_SIZE: 0x0d33,
  MAX_CUBE_MAP_TEXTURE_SIZE: 0x851c,
  MAX_VERTEX_ATTRIBS: 0x8869,
  MAX_VERTEX_UNIFORM_VECTORS: 0x8dfb,
  MAX_FRAGMENT_UNIFORM_VECTORS: 0x8dfd,
  MAX_VARYING_VECTORS: 0x8dfc,
  MAX_TEXTURE_IMAGE_UNITS: 0x8872,
  MAX_VERTEX_TEXTURE_IMAGE_UNITS: 0x8b4c,
  MAX_COMBINED_TEXTURE_IMAGE_UNITS: 0x8b4d,
  MAX_RENDERBUFFER_SIZE: 0x84e8,
  SCISSOR_BOX: 0x0c10,
  VIEWPORT: 0x0ba2,
};

const glStub: Record<string, unknown> = {
  getExtension: (name: string) => {
    if (name === 'WEBGL_debug_renderer_info') {
      return { UNMASKED_RENDERER_WEBGL: 0x9246, UNMASKED_VENDOR_WEBGL: 0x9245 };
    }
    if (name === 'EXT_texture_filter_anisotropic') {
      return { MAX_TEXTURE_MAX_ANISOTROPY_EXT: 0x84ff, TEXTURE_MAX_ANISOTROPY_EXT: 0x84fe };
    }
    return null;
  },
  getParameter: (pname: number | string) => {
    if (typeof pname === 'string') {
      if (pname === 'VERSION') return 'WebGL 2.0';
      if (pname === 'SHADING_LANGUAGE_VERSION') return 'WebGL GLSL ES 3.00';
      return 0;
    }
    switch (pname) {
      case GL_ENUMS.VERSION: return 'WebGL 2.0';
      case GL_ENUMS.SHADING_LANGUAGE_VERSION: return 'WebGL GLSL ES 3.00';
      case GL_ENUMS.MAX_TEXTURE_SIZE:
      case GL_ENUMS.MAX_CUBE_MAP_TEXTURE_SIZE:
      case GL_ENUMS.MAX_RENDERBUFFER_SIZE: return 4096;
      case GL_ENUMS.MAX_VERTEX_ATTRIBS: return 16;
      case GL_ENUMS.MAX_VERTEX_UNIFORM_VECTORS:
      case GL_ENUMS.MAX_FRAGMENT_UNIFORM_VECTORS: return 1024;
      case GL_ENUMS.MAX_VARYING_VECTORS: return 15;
      case GL_ENUMS.MAX_TEXTURE_IMAGE_UNITS:
      case GL_ENUMS.MAX_VERTEX_TEXTURE_IMAGE_UNITS:
      case GL_ENUMS.MAX_COMBINED_TEXTURE_IMAGE_UNITS: return 16;
      case GL_ENUMS.SCISSOR_BOX:
      case GL_ENUMS.VIEWPORT: return new Int32Array(4);
      default: return 0;
    }
  },
  getShaderPrecisionFormat: () => ({ precision: 23, rangeMin: 127, rangeMax: 127 }),
  // resto de operaciones GL: no-op tolerante
};

// Las constantes de enumeración WebGL2 (VERSION, MAX_TEXTURE_SIZE...) se
// exponen como números para que `gl.getParameter(gl.VERSION)` reciba el enum
// correcto. Cualquier otro miembro desconocido se trata como método no-op.
const GL_ALL_ENUMS: Record<string, number> = {
  ...GL_ENUMS,
  DEPTH_BUFFER_BIT: 0x0100, STENCIL_BUFFER_BIT: 0x0400, COLOR_BUFFER_BIT: 0x4000,
  POINTS: 0x0000, LINES: 0x0001, LINE_LOOP: 0x0002, LINE_STRIP: 0x0003, TRIANGLES: 0x0004,
  ZERO: 0, ONE: 1, SRC_ALPHA: 0x0302, DST_ALPHA: 0x0304, ONE_MINUS_SRC_ALPHA: 0x0303,
  ONE_MINUS_DST_ALPHA: 0x0305, FUNC_ADD: 0x8006, BLEND: 0x0be2, CULL_FACE: 0x0b44,
  DEPTH_TEST: 0x0b71, SCISSOR_TEST: 0x0c11, POLYGON_OFFSET_FILL: 0x8037, LINEAR: 0x2601,
  NEAREST: 0x2600, TEXTURE_2D: 0x0de1, TEXTURE0: 0x84c0, ARRAY_BUFFER: 0x8892,
  ELEMENT_ARRAY_BUFFER: 0x8893, STATIC_DRAW: 0x88e4, DYNAMIC_DRAW: 0x88e8,
  FLOAT: 0x1406, UNSIGNED_INT: 0x1405, UNSIGNED_SHORT: 0x1403, UNSIGNED_BYTE: 0x1401,
  RGBA: 0x1908, RGB: 0x1907, DEPTH_COMPONENT16: 0x81a5, FRAMEBUFFER: 0x8d40,
  RENDERBUFFER: 0x8d41, COLOR_ATTACHMENT0: 0x8ce0, DEPTH_ATTACHMENT: 0x8d00,
  FRAMEBUFFER_COMPLETE: 0x8cd5, TEXTURE_MIN_FILTER: 0x2801, TEXTURE_MAG_FILTER: 0x2800,
  TEXTURE_WRAP_S: 0x2802, TEXTURE_WRAP_T: 0x2803, CLAMP_TO_EDGE: 0x812f,
  MIRRORED_REPEAT: 0x8370, REPEAT: 0x2901, FRONT: 0x0404, BACK: 0x0405,
  FRONT_AND_BACK: 0x0408, CCW: 0x0901, CW: 0x0900, LEQUAL: 0x0203, LESS: 0x0201,
  ALWAYS: 0x0207, KEEP: 0x1e00, REPLACE: 0x1e01, INVERT: 0x150a,
  VERTEX_SHADER: 0x8b31, FRAGMENT_SHADER: 0x8b30, COMPILE_STATUS: 0x8b81,
  LINK_STATUS: 0x8b82, MAX_SAMPLES: 0x8d57, SAMPLE_COVERAGE: 0x80a9,
};

const glNoopHandler: ProxyHandler<typeof glStub> = {
  get(target, prop: string) {
    if (prop in target) return (target as Record<string, unknown>)[prop];
    if (typeof prop !== 'string') return undefined;
    if (prop in GL_ALL_ENUMS) return GL_ALL_ENUMS[prop];
    const numeric = Number(prop);
    if (!Number.isNaN(numeric)) return numeric; // cadenas numéricas -> número
    return () => null; // cualquier otro método GL es no-op
  },
  set() { return true; },
};
const glProxy = new Proxy(glStub, glNoopHandler) as unknown;

// Stub del contexto 2D: jsdom devuelve null para '2d' sin el paquete `canvas`.
// Las texturas procedurales del juego dibujan sobre él; en pruebas basta con
// que todas las operaciones sean no-op y devuelvan valores plausibles.
function makeCtx2D(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const gradient = { addColorStop() {} };
  const noopFn = () => {};
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_t, prop: string) {
      if (prop === 'canvas') return canvas;
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient') return () => gradient;
      if (prop === 'createPattern') return () => null;
      if (prop === 'getImageData') return () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 });
      if (prop === 'measureText') return () => ({ width: 0 });
      // propiedades de estilo (fillStyle, strokeStyle, etc.) y métodos: tolerantes
      return prop in Reflect && false ? undefined : (prop.startsWith('global') ? 1 : (typeof prop === 'string' ? noopFn : undefined));
    },
    set() { return true; }, // aceptar cualquier asignación (fillStyle='#fff', etc.)
  };
  return new Proxy({}, handler) as unknown as CanvasRenderingContext2D;
}

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: function (type: string): unknown {
    if (type === 'webgl2' || type === 'webgl') return glProxy;
    if (type === '2d') return makeCtx2D(this);
    return null;
  },
  configurable: true,
  writable: true,
});

// requestAnimationFrame: control manual en las pruebas
(globalThis as unknown as { requestAnimationFrame: (cb: FrameRequestCallback) => number }).requestAnimationFrame = () => 0;
(globalThis as unknown as { cancelAnimationFrame: (id: number) => void }).cancelAnimationFrame = () => {};

// --- Stub de AudioContext (audio.ts lo usa perezosamente, por seguridad) ---
class FakeAudioContext {
  currentTime = 0;
  destination = {};
  state = 'running';
  sampleRate = 44100;
  resume() { return Promise.resolve(); }
  suspend() { return Promise.resolve(); }
  close() { return Promise.resolve(); }
  createGain() {
    return {
      gain: { value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} },
      connect() {}, disconnect() {},
    };
  }
  createOscillator() {
    return {
      frequency: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} },
      type: 'sine',
      connect() {}, disconnect() {}, start() {}, stop() {},
    };
  }
  createBuffer(duration: number, length: number, rate: number) {
    return { getChannelData: () => new Float32Array(length), length };
  }
  createBufferSource() {
    return { buffer: null, connect() {}, disconnect() {}, start() {}, stop() {} };
  }
  createBiquadFilter() {
    return {
      frequency: { value: 0, setValueAtTime() {} }, Q: { value: 0 }, type: 'lowpass',
      connect() {}, disconnect() {},
    };
  }
}
Object.defineProperty(window, 'AudioContext', { value: FakeAudioContext, configurable: true });

// pointerLock stubs
(document as unknown as { exitPointerLock?: () => void }).exitPointerLock = () => {};
