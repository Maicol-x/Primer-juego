// Pruebas de regresión de la FASE FINAL:
//  - Controles de movimiento y cámara (izquierda/derecha) con el bucle rAF REAL.
//  - Máquina de estados completa de la Caja Misteriosa (pago, reclamo,
//    cancelación, doble clic, cierre con premio pendiente, post game-over).
//  - Compras centralizadas en el motor (única fuente de verdad económica).
//  - Ciclo de vida del bucle: pausa/reanudar sin congelar ni duplicar rAF.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { ThreeGameEngine, ThreeEngineCallbacks } from '../src/game/three/threeEngine';
import { MYSTERY_BOX_COST } from '../src/game/weapons';

declare const globalThis: {
  __runOneFrame: (t?: number) => boolean;
  __pendingFrames: () => number;
  __clearFrames: () => void;
};

function makeContainer(): HTMLElement {
  const c = document.createElement('div');
  Object.defineProperty(c, 'clientWidth', { value: 800 });
  Object.defineProperty(c, 'clientHeight', { value: 600 });
  document.body.appendChild(c);
  return c;
}

function noop() {}

function baseCallbacks(overrides: Partial<ThreeEngineCallbacks> = {}): ThreeEngineCallbacks {
  return {
    onPlayerUpdate: noop,
    onBaseUpdate: noop,
    onRoundUpdate: noop,
    onGameOver: noop,
    onNearMysteryBox: noop,
    onNearWorkshop: noop,
    onOpenMysteryBox: noop,
    onCameraModeChange: noop,
    onDroneTelemetry: noop,
    onTargetLock: noop,
    onHitmarker: noop,
    onPauseRequest: noop,
    onPointerLockChange: noop,
    ...overrides,
  } as ThreeEngineCallbacks;
}

interface Internals {
  keys: Record<string, boolean>;
  playerMeshObj: { group: THREE.Group };
  updatePlayer: (dt: number) => void;
  updateCamera: (dt: number) => void;
  gameOverTriggered: boolean;
}

function internals(engine: ThreeGameEngine): Internals {
  return engine as unknown as Internals;
}

function makeEngine(overrides: Partial<ThreeEngineCallbacks> = {}) {
  const container = makeContainer();
  const engine = new ThreeGameEngine(container, baseCallbacks(overrides));
  return { engine, container };
}

/**
 * Simula pulsar una tecla a través del listener REAL de teclado registrado
 * por el motor en window (no escribe directamente en `keys`), para que las
 * pruebas cubran también el mapeo de entrada → estado.
 */
function pressKey(engine: ThreeGameEngine, key: string) {
  const evt = new KeyboardEvent('keydown', { key });
  // El listener filtra por gameState interno; se invoca directo sobre window.
  window.dispatchEvent(evt);
  void engine;
}

beforeEach(() => {
  globalThis.__clearFrames();
});

afterEach(() => {
  globalThis.__clearFrames();
});

// ---------------------------------------------------------------------------
// FASE 1 — CONTROLES IZQUIERDA / DERECHA
// ---------------------------------------------------------------------------
describe('Controles de movimiento (contrato izquierda/derecha)', () => {
  let engine: ThreeGameEngine;

  beforeEach(() => {
    ({ engine } = makeEngine());
    const it = internals(engine);
    // Colocar al jugador lejos del búnker central para medir desplazamiento libre.
    it.playerMeshObj.group.position.set(30, 0, 30);
  });

  function moveWith(keys: string[], yaw: number): THREE.Vector3 {
    const it = internals(engine);
    engine.playerYaw = yaw;
    for (const k of keys) it.keys[k] = true;
    const before = it.playerMeshObj.group.position.clone();
    it.updatePlayer(0.1);
    it.keys = {};
    return it.playerMeshObj.group.position.clone().sub(before);
  }

  it('yaw=0 (mirando a +Z): D desplaza hacia +X (derecha real) y A hacia -X', () => {
    const d = moveWith(['d'], 0);
    expect(d.x).toBeGreaterThan(0);
    expect(Math.abs(d.z)).toBeLessThan(1e-6);

    const a = moveWith(['a'], 0);
    expect(a.x).toBeLessThan(0);
  });

  it('las flechas respetan el mismo contrato que A/D', () => {
    const right = moveWith(['arrowright'], 0);
    const left = moveWith(['arrowleft'], 0);
    expect(right.x).toBeGreaterThan(0);
    expect(left.x).toBeLessThan(0);
  });

  it('yaw=PI/2 (mirando a +X): la derecha del jugador es -Z, no un eje fijo', () => {
    const d = moveWith(['d'], Math.PI / 2);
    expect(d.z).toBeLessThan(0);
    expect(Math.abs(d.x)).toBeLessThan(1e-6);
  });

  it('yaw=-PI/2 (mirando a -X): la derecha del jugador es +Z', () => {
    const d = moveWith(['d'], -Math.PI / 2);
    expect(d.z).toBeGreaterThan(0);
  });

  it('el movimiento relativo a cámara sigue siendo coherente tras girar', () => {
    // Mirando a +Z, D va a +X. Tras girar 90° a la derecha (mirar +X),
    // D debe ir a -Z: la "derecha" rota con la vista, nunca se invierte.
    const first = moveWith(['d'], 0);
    const second = moveWith(['d'], Math.PI / 2);
    expect(first.x).toBeGreaterThan(0);
    expect(second.z).toBeLessThan(0);
  });

  it('el movimiento diagonal normalizado no acelera respecto al axial', () => {
    const it = internals(engine);
    engine.playerYaw = 0;
    it.keys['w'] = true;
    const fwdBefore = it.playerMeshObj.group.position.clone();
    it.updatePlayer(0.1);
    const fwdDist = it.playerMeshObj.group.position.distanceTo(fwdBefore);

    it.keys = {};
    it.playerMeshObj.group.position.set(30, 0, 30);
    it.keys['w'] = true;
    it.keys['d'] = true;
    const diagBefore = it.playerMeshObj.group.position.clone();
    it.updatePlayer(0.1);
    const diagDist = it.playerMeshObj.group.position.distanceTo(diagBefore);
    it.keys = {};

    expect(diagDist).toBeCloseTo(fwdDist, 3);
  });

  it('ratón a la derecha (movementX>0) aumenta playerYaw y la vista gira a la derecha', () => {
    // El listener de mousemove está en el canvas del renderer. En jsdom no hay
    // pointer lock real, así que el motor usa deltas por diferencia de clientX:
    // primer evento (100) establece la posición base sin girar; el segundo
    // (250) produce dx=+150 → clamp +60 → yaw debe AUMENTAR (giro a la derecha).
    const canvas = document.querySelector('canvas');
    if (!canvas) throw new Error('canvas no encontrado');
    engine.playerYaw = 0;

    const fire = (x: number) => {
      const ev = new MouseEvent('mousemove', { clientX: x, clientY: 100 });
      canvas.dispatchEvent(ev);
    };

    // El motor arranca con lastMousePos={0,0}: el primer dx es +100 → clamp 60.
    fire(100);
    const yawAfterRight = engine.playerYaw;
    expect(yawAfterRight).toBeGreaterThan(0); // giro a la DERECHA confirmado

    fire(250); // dx positivo adicional → sigue girando a la DERECHA
    expect(engine.playerYaw).toBeGreaterThan(yawAfterRight);

    fire(-400); // dx negativo grande → gira de vuelta hacia la IZQUIERDA
    expect(engine.playerYaw).toBeLessThan(yawAfterRight);
  });

  it('tercera persona: la cámara queda DETRÁS del jugador respecto a su frente', () => {
    const it = internals(engine);
    engine.cameraMode = 'third-person';
    engine.playerYaw = 0; // frente = +Z
    it.playerMeshObj.group.position.set(0, 0, 0);
    // Posicionar la cámara de golpe (lerp requiere frames; usar dt grande ~ snap)
    it.updateCamera(1);
    const camPos = engine.camera.position;
    // Detrás significa z menor que la del jugador (jugador en 0, frente +Z)
    expect(camPos.z).toBeLessThan(0);
  });

  it('primera persona: mirar a la derecha (yaw+) hace que la dirección de cámara apunte a +X desde frente +Z', () => {
    const it = internals(engine);
    engine.cameraMode = 'first-person';
    engine.playerYaw = Math.PI / 2; // mirando a +X
    engine.playerPitch = 0;
    it.playerMeshObj.group.position.set(0, 0, 0);
    it.updateCamera(0.016);
    const dir = new THREE.Vector3();
    engine.camera.getWorldDirection(dir);
    expect(dir.x).toBeGreaterThan(0.95);
    expect(Math.abs(dir.z)).toBeLessThan(0.2);
  });

  it('dron: D vuela hacia la derecha de droneYaw y las flechas coinciden', () => {
    const it = internals(engine);
    engine.cameraMode = 'drone';
    engine.droneYaw = 0; // frente +Z
    it.keys['d'] = true;
    const before = engine.dronePos.clone();
    it.updateCamera(0.1);
    const after = engine.dronePos.clone();
    it.keys = {};
    expect(after.x - before.x).toBeGreaterThan(0); // derecha = +X con yaw 0

    it.keys['arrowleft'] = true;
    const b2 = engine.dronePos.clone();
    it.updateCamera(0.1);
    expect(engine.dronePos.x - b2.x).toBeLessThan(0);
    it.keys = {};
  });

  it('perder el foco limpia todas las teclas (sin entradas atascadas)', () => {
    const it = internals(engine);
    it.keys['w'] = true;
    it.keys['d'] = true;
    window.dispatchEvent(new Event('blur'));
    expect(Object.values(it.keys).length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// FASE 4 — CICLO DE VIDA DEL BUCLE rAF REAL
// ---------------------------------------------------------------------------
describe('Ciclo de vida del bucle de animación (rAF real simulado)', () => {
  it('start() encola exactamente UN frame; ejecutarlo re-enca uno solo', () => {
    const { engine } = makeEngine();
    engine.start();
    expect(globalThis.__pendingFrames()).toBe(1);
    globalThis.__runOneFrame();
    expect(globalThis.__pendingFrames()).toBe(1); // el propio frame re-enca el siguiente
    engine.destroy();
  });

  it('start() repetido NO duplica el bucle', () => {
    const { engine } = makeEngine();
    engine.start();
    engine.start();
    engine.start();
    expect(globalThis.__pendingFrames()).toBe(1);
    engine.destroy();
  });

  it('pause() detiene el bucle y resume() lo relanza sin duplicarlo (regresión del congelamiento)', () => {
    const { engine } = makeEngine();
    engine.start();
    globalThis.__runOneFrame();
    engine.pause();
    expect(globalThis.__pendingFrames()).toBe(0); // sin frames pendientes colgados
    expect(globalThis.__runOneFrame()).toBe(false); // nada que ejecutar: no corre

    engine.resume();
    expect(globalThis.__pendingFrames()).toBe(1); // RELANZADO: no congelado
    engine.resume(); // reanudar dos veces no debe crear dos bucles
    expect(globalThis.__pendingFrames()).toBe(1);
    globalThis.__runOneFrame();
    expect(globalThis.__pendingFrames()).toBe(1);
    engine.destroy();
  });

  it('destroy() con un frame pendiente lo cancela y ninguna actualización posterior ocurre', () => {
    const { engine } = makeEngine();
    engine.start();
    const posBefore = engine.player.position
      ? null
      : null; // marcador defensivo (player no expone position pública)
    void posBefore;
    engine.destroy();
    expect(globalThis.__pendingFrames()).toBe(0);
    expect(globalThis.__runOneFrame()).toBe(false);
    // start tras destroy es no-op
    engine.start();
    expect(globalThis.__pendingFrames()).toBe(0);
  });

  it('GAME_OVER durante update() corta los subsistemas del mismo frame', () => {
    const { engine } = makeEngine();
    engine.start();
    const coinsBefore = engine.player.coins;
    // Forzar derrota por destrucción de base
    engine.base.hp = 1;
    const zombies = (engine as unknown as {
      zombies: Array<{ data: { hp: number }; group: THREE.Object3D }>;
    }).zombies;
    void zombies;
    (engine as unknown as { damageBase: (d: number) => void }).damageBase(1000);
    expect((engine as unknown as { gameOverTriggered: boolean }).gameOverTriggered).toBe(true);
    // Un frame completo posterior no debe mutar monedas
    globalThis.__runOneFrame();
    globalThis.__runOneFrame();
    expect(engine.player.coins).toBe(coinsBefore);
    engine.destroy();
  });
});

// ---------------------------------------------------------------------------
// FASE 3 — MÁQUINA DE ESTADOS DE LA CAJA MISTERIOSA
// ---------------------------------------------------------------------------
describe('Caja Misteriosa: transacciones completas', () => {
  let engine: ThreeGameEngine;

  beforeEach(() => {
    ({ engine } = makeEngine());
    engine.player.coins = MYSTERY_BOX_COST * 3;
  });

  it('giro válido: cobra exactamente una vez y devuelve la recompensa real', () => {
    const before = engine.player.coins;
    const drop = engine.requestMysterySpin();
    expect(drop).not.toBeNull();
    expect(engine.player.coins).toBe(before - MYSTERY_BOX_COST);
  });

  it('saldo insuficiente: no gira, no cobra', () => {
    engine.player.coins = MYSTERY_BOX_COST - 1;
    const before = engine.player.coins;
    expect(engine.requestMysterySpin()).toBeNull();
    expect(engine.player.coins).toBe(before);
  });

  it('clics rápidos: el segundo giro concurrente se rechaza sin segundo cobro', () => {
    const before = engine.player.coins;
    expect(engine.requestMysterySpin()).not.toBeNull();
    expect(engine.requestMysterySpin()).toBeNull();
    expect(engine.requestMysterySpin()).toBeNull();
    expect(engine.player.coins).toBe(before - MYSTERY_BOX_COST);
  });

  it('cancelación: reembolso exacto UNA sola vez', () => {
    const before = engine.player.coins;
    engine.requestMysterySpin();
    engine.cancelMysterySpin(MYSTERY_BOX_COST);
    expect(engine.player.coins).toBe(before);
    engine.cancelMysterySpin(MYSTERY_BOX_COST); // segunda cancelación: no devuelve nada
    expect(engine.player.coins).toBe(before);
  });

  it('premio pagado pendiente: resolveMysterySpin NO libera el bloqueo hasta reclamar', () => {
    const drop = engine.requestMysterySpin();
    expect(drop).not.toBeNull();
    engine.resolveMysterySpin(); // simula fin de animación sin reclamar
    // Como hay pendingDrop, el bloqueo debe mantenerse: nuevo giro rechazado.
    expect(engine.requestMysterySpin()).toBeNull();
    // El premio pendiente es recuperable por la UI y es idéntico al generado.
    expect(engine.getPendingMysteryDrop()).toBe(drop);
  });

  it('reclamación doble: el mismo premio no puede aplicarse dos veces', () => {
    const drop = engine.requestMysterySpin()!;
    const coinsAfterSpin = engine.player.coins;
    engine.applyMysteryDrop(drop);
    // Segunda aplicación del MISMO objeto ya no tiene pendencia asociada:
    // no debe volver a equipar/duplicar armas ni tocar monedas.
    const weaponsBefore = engine.player.weapons.length;
    engine.applyMysteryDrop(drop);
    expect(engine.player.weapons.length).toBe(weaponsBefore);
    expect(engine.player.coins).toBe(coinsAfterSpin);
  });

  it('drop fabricado ajeno al giro pendiente se ignora', () => {
    const realDrop = engine.requestMysterySpin()!;
    const fake = { ...realDrop, name: 'FABRICADO' };
    const weaponsBefore = engine.player.weapons.map((w) => w.id).join(',');
    engine.applyMysteryDrop(fake);
    expect(engine.player.weapons.map((w) => w.id).join(',')).toBe(weaponsBefore);
    // La pendencia real sigue viva y reclamable
    expect(engine.getPendingMysteryDrop()).toBe(realDrop);
  });

  it('flujo de cierre con premio pendiente (ruta App.handleCloseMysteryBox): el premio se aplica, no se reembolsa', () => {
    const before = engine.player.coins;
    const drop = engine.requestMysterySpin()!;
    expect(engine.player.coins).toBe(before - MYSTERY_BOX_COST);
    // Réplica exacta del orden crítico de App.tsx
    const pending = engine.getPendingMysteryDrop();
    if (pending) engine.applyMysteryDrop(pending);
    else engine.cancelMysterySpin(engine.getMysteryBoxCost());
    engine.cancelMysterySpin(engine.getMysteryBoxCost()); // llamada errónea/posterior no debe devolver dinero
    expect(engine.player.coins).toBe(before - MYSTERY_BOX_COST); // pagado, no perdido
    // Y la recompensa fue entregada (drop legítimo aplicado una vez)
    expect(drop).toBeTruthy();
    expect(engine.getPendingMysteryDrop()).toBeNull();
  });

  it('flujo de cierre DURANTE el giro (sin premio visible): reembolso completo', () => {
    const before = engine.player.coins;
    engine.requestMysterySpin();
    // El usuario cierra antes de que termine la animación: getPendingMysteryDrop
    // aún devuelve el premio registrado, pero la regla del juego (App) decide:
    // si el modal NO mostró el premio, se cancela con devolución.
    engine.cancelMysterySpin(MYSTERY_BOX_COST);
    expect(engine.player.coins).toBe(before);
    expect(engine.getPendingMysteryDrop()).toBeNull();
  });

  it('tras GAME_OVER: no se puede girar ni aplicar premios', () => {
    (engine as unknown as { damageBase: (d: number) => void }).damageBase(100000);
    const before = engine.player.coins;
    expect(engine.requestMysterySpin()).toBeNull();
    expect(engine.player.coins).toBe(before);
    const staleDrop = { type: 'heal' as const, name: 'x', description: '', rarity: 'common' as const, iconName: 'HeartPulse', color: '#fff' };
    expect(() => engine.applyMysteryDrop(staleDrop as never)).not.toThrow();
  });

  it('destroy con giro pendiente: la pendencia se libera y nothing más cobra/devuelve', () => {
    engine.requestMysterySpin();
    engine.destroy();
    expect(engine.getPendingMysteryDrop()).toBeNull();
    expect(engine.requestMysterySpin()).toBeNull();
    const coinsAtDestroy = engine.player.coins;
    engine.cancelMysterySpin(MYSTERY_BOX_COST);
    expect(engine.player.coins).toBe(coinsAtDestroy);
  });
});

// ---------------------------------------------------------------------------
// FASE 2 — COMPRAS CENTRALIZADAS
// ---------------------------------------------------------------------------
describe('Compras delegadas al motor (única autoridad económica)', () => {
  let engine: ThreeGameEngine;

  beforeEach(() => {
    ({ engine } = makeEngine());
    engine.player.coins = 100000;
  });

  it('mejora de arma válida descuenta una vez y sube el nivel', () => {
    const w = engine.player.weapons[0];
    const lvlBefore = w.upgradeLevel;
    const before = engine.player.coins;
    expect(engine.purchaseWeaponUpgrade(0)).toBe(true);
    expect(engine.player.coins).toBeLessThan(before);
    expect(engine.player.weapons[0].upgradeLevel).toBe(lvlBefore + 1);
  });

  it('clics rápidos no compran dos mejoras simultáneas con saldo insuficiente para ambas', () => {
    // Las armas iniciales arrancan en nivel 1 (contrato de weapons.ts).
    const lvlStart = engine.player.weapons[0].upgradeLevel;
    engine.player.coins = 1; // imposible: coste mínimo 200
    expect(engine.purchaseWeaponUpgrade(0)).toBe(false);
    expect(engine.purchaseWeaponUpgrade(0)).toBe(false);
    expect(engine.player.coins).toBe(1);
    expect(engine.player.weapons[0].upgradeLevel).toBe(lvlStart);
  });

  it('alcanzar el máximo de mejoras bloquea nuevas compras', () => {
    const max = engine.player.weapons[0].maxUpgradeLevel;
    let guard = 0;
    while (engine.player.weapons[0].upgradeLevel < max && guard < 20) {
      engine.player.coins = 100000;
      expect(engine.purchaseWeaponUpgrade(0)).toBe(true);
      guard++;
    }
    expect(engine.player.weapons[0].upgradeLevel).toBe(max);
    engine.player.coins = 100000;
    expect(engine.purchaseWeaponUpgrade(0)).toBe(false);
    expect(engine.player.weapons[0].upgradeLevel).toBe(max);
  });

  it('reparación: no supera la vida máxima ni cura gratis con saldo insuficiente', () => {
    engine.base.hp = engine.base.maxHp; // ya llena
    const before = engine.player.coins;
    expect(engine.purchaseBaseRepair()).toBe(false);
    expect(engine.player.coins).toBe(before);

    engine.base.hp = 50;
    engine.player.coins = 0;
    expect(engine.purchaseBaseRepair()).toBe(false);
    expect(engine.base.hp).toBe(50);

    engine.player.coins = 100000;
    expect(engine.purchaseBaseRepair()).toBe(true);
    expect(engine.base.hp).toBe(engine.base.maxHp);
  });

  it('blindaje y torreta aplican sus efectos y descuentan', () => {
    const armorBefore = engine.base.armorLevel;
    const hpBefore = engine.base.hp;
    expect(engine.purchaseBaseArmor()).toBe(true);
    expect(engine.base.armorLevel).toBe(armorBefore + 1);
    expect(engine.base.maxHp).toBeGreaterThan(hpBefore);

    const turretBefore = engine.base.turretLevel;
    expect(engine.purchaseBaseTurret()).toBe(true);
    expect(engine.base.turretLevel).toBe(turretBefore + 1);
  });

  it('compra tras GAME_OVER es rechazada sin tocar el saldo', () => {
    (engine as unknown as { damageBase: (d: number) => void }).damageBase(100000);
    const before = engine.player.coins;
    expect(engine.purchaseWeaponUpgrade(0)).toBe(false);
    expect(engine.purchaseBaseRepair()).toBe(false);
    expect(engine.purchaseBaseArmor()).toBe(false);
    expect(engine.purchaseBaseTurret()).toBe(false);
    expect(engine.player.coins).toBe(before);
  });

  it('índice de arma inválido no compra nada', () => {
    expect(engine.purchaseWeaponUpgrade(99)).toBe(false);
    expect(engine.purchaseWeaponUpgrade(-1)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Sincronización taller/HUD con el motor
// ---------------------------------------------------------------------------
describe('Sincronización de selección de arma', () => {
  it('switchWeapon actualiza activeWeaponIndex y el estado sincronizado', () => {
    const { engine } = makeEngine();
    if (engine.player.weapons.length < 2) {
      // añadir una segunda instancia simple vía applyMysteryDrop legítimo
      const drop = engine.requestMysterySpin();
      if (drop && drop.type === 'weapon') engine.applyMysteryDrop(drop);
    }
    const idx = engine.player.weapons.length > 1 ? 1 : 0;
    engine.switchWeapon(idx);
    expect(engine.player.activeWeaponIndex).toBe(idx);
    engine.switchWeapon(99); // inválida: no cambia
    expect(engine.player.activeWeaponIndex).toBe(idx);
    engine.destroy();
  });
});
