// Entorno de pruebas: stubs mínimos para que ThreeGameEngine pueda construirse
// bajo jsdom sin WebGL real ni AudioContext.

// --- Stubs de canvas / WebGL (jsdom no implementa getContext con contexto real) ---
const glStub = {
  getExtension: () => null,
  getParameter: () => 0,
  getShaderPrecisionFormat: () => ({ precision: 1, rangeMin: 1, rangeMax: 1 }),
};

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

HTMLCanvasElement.prototype.getContext = function (type: string) {
  if (type === 'webgl2' || type === 'webgl') return glStub as unknown as CanvasRenderingContext2D;
  if (type === '2d') return makeCtx2D(this);
  return null;
};

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
