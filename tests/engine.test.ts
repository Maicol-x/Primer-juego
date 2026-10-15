import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { ThreeGameEngine, ThreeEngineCallbacks } from '../src/game/three/threeEngine';
import { MYSTERY_BOX_COST } from '../src/game/weapons';

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

function makeEngine(overrides: Partial<ThreeEngineCallbacks> = {}) {
  const container = makeContainer();
  const engine = new ThreeGameEngine(container, baseCallbacks(overrides));
  return { engine, container };
}

/** Invoca updateProjectiles de forma controlada (miembro privado). */
function stepProjectiles(engine: ThreeGameEngine, dt: number) {
  (engine as unknown as { updateProjectiles: (dt: number) => void }).updateProjectiles(dt);
}

/** Coloca al jugador en una posición XZ dada (miembros privados). */
function setPlayerPos(engine: ThreeGameEngine, x: number, z: number) {
  const m = (engine as unknown as { playerMeshObj: { group: THREE.Group } }).playerMeshObj;
  m.group.position.set(x, 0, z);
}

interface ZombieInternals {
  zombies: Array<{ data: { hp: number; radius: number }; group: THREE.Group; isDying?: boolean }>;
}

interface ProjInternals {
  projectiles: Array<{
    mesh: THREE.Object3D; pos: THREE.Vector3; vel: THREE.Vector3; radius: number;
    damage: number; gravity: number; rangeRemaining: number; pierceCount: number;
    knockback: number; isEnemy: boolean;
  }>;
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('Economía de la Caja Misteriosa (requestMysterySpin)', () => {
  it('cobra exactamente una vez y devuelve la recompensa real generada', () => {
    const { engine } = makeEngine();
    const p = engine.player;
    p.coins = MYSTERY_BOX_COST * 3;

    const drop = engine.requestMysterySpin();

    expect(drop).not.toBeNull();
    expect(p.coins).toBe(MYSTERY_BOX_COST * 2); // descuento único
  });

  it('no permite giros concurrentes (clics rápidos) sin resolver el anterior', () => {
    const { engine } = makeEngine();
    const p = engine.player;
    p.coins = MYSTERY_BOX_COST * 5;

    const first = engine.requestMysterySpin();
    const secondRapidClick = engine.requestMysterySpin(); // doble clic inmediato

    expect(first).not.toBeNull();
    expect(secondRapidClick).toBeNull();
    expect(p.coins).toBe(MYSTERY_BOX_COST * 4); // un solo cobro pese a dos clics

    engine.resolveMysterySpin();
    const third = engine.requestMysterySpin();
    expect(third).not.toBeNull();
    expect(p.coins).toBe(MYSTERY_BOX_COST * 3);
  });

  it('con saldo insuficiente no gira ni consume dinero', () => {
    const { engine } = makeEngine();
    const p = engine.player;
    p.coins = MYSTERY_BOX_COST - 1;

    const drop = engine.requestMysterySpin();

    expect(drop).toBeNull();
    expect(p.coins).toBe(MYSTERY_BOX_COST - 1); // intacto, sin cobro parcial
  });

  it('applyMysteryDrop libera la pendencia aunque se cierre sin reclamar antes', () => {
    const { engine } = makeEngine();
    engine.player.coins = MYSTERY_BOX_COST * 2;

    engine.requestMysterySpin();
    engine.resolveMysterySpin(); // simulación de cierre del modal

    expect(engine.requestMysterySpin()).not.toBeNull(); // puede volver a girar
  });

  it('tras game over no se admiten giros', () => {
    const { engine } = makeEngine();
    engine.player.coins = MYSTERY_BOX_COST * 2;

    // Forzar derrota por daño a la base
    const dmg = engine as unknown as { damageBase: (a: number) => void };
    dmg.damageBase(engine.base.hp + 1000);
    dmg.damageBase(engine.base.hp + 1000); // segunda llamada simultánea

    expect(engine.requestMysterySpin()).toBeNull();
  });
});

describe('Finalización de partida idempotente', () => {
  it('onGameOver se emite UNA sola vez aunque varios golpes destruyan la base', () => {
    let calls = 0;
    const { engine } = makeEngine({ onGameOver: () => { calls++; } });

    const dmg = engine as unknown as { damageBase: (a: number) => void };
    // Múltiples zombies "atacando" en el mismo frame
    dmg.damageBase(600);
    dmg.damageBase(600);
    dmg.damageBase(600);

    expect(engine.base.hp).toBe(0);
    expect(calls).toBe(1);
  });

  it('no se aplica daño después de la transición terminal', () => {
    let calls = 0;
    const { engine } = makeEngine({ onGameOver: () => { calls++; } });
    const dmg = engine as unknown as { damageBase: (a: number) => void };

    dmg.damageBase(99999);
    const hpAfter = engine.base.hp;
    dmg.damageBase(99999); // ya terminada: ignorada

    expect(engine.base.hp).toBe(hpAfter);
    expect(calls).toBe(1);
  });

  it('la muerte del jugador también dispara la derrota una única vez', () => {
    let calls = 0;
    const { engine } = makeEngine({ onGameOver: () => { calls++; } });
    const dp = engine as unknown as { damagePlayer: (a: number) => void };

    engine.player.invulnerableTimer = 0;
    dp.damagePlayer(99999);
    dp.damagePlayer(99999); // mismo frame, segundo zombie

    expect(engine.player.hp).toBe(0);
    expect(calls).toBe(1);
  });
});

describe('Colisiones barridas de proyectiles (anti-tunneling)', () => {
  it('un proyectil ultrarrápido que cruza un zombie en un frame lo alcanza', () => {
    const { engine } = makeEngine();
    const internals = engine as unknown as ZombieInternals & ProjInternals;

    // Crear un zombie real vía spawn interno y colocarlo delante del jugador
    const spawn = engine as unknown as { spawnZombie3D: () => void };
    spawn.spawnZombie3D();
    expect(internals.zombies.length).toBeGreaterThan(0);
    const z = internals.zombies[0];
    z.data.hp = 100000; // evitar que muera para medir el golpe
    z.group.position.set(0, 0, -30);
    z.isDying = false;

    setPlayerPos(engine, 0, 0);

    // Proyectil a velocidad extrema: recorre 100 unidades en UN paso de 1/60s
    internals.projectiles.push({
      mesh: new THREE.Mesh(new THREE.SphereGeometry(0.1), new THREE.MeshBasicMaterial()),
      pos: new THREE.Vector3(0, 1, 0),
      vel: new THREE.Vector3(0, 0, -6000), // tunneling garantico con punto-a-punto
      radius: 0.1,
      damage: 25,
      gravity: 0,
      rangeRemaining: 200,
      pierceCount: 0,
      knockback: 0,
      isEnemy: false,
    });

    stepProjectiles(engine, 1 / 60);

    // Sin swept collision el zombie habría quedado intacto (el destino salta a z=-100)
    expect(z.data.hp).toBeLessThan(100000);
    // El proyectil se consume al impactar (pierceCount 0)
    expect(internals.projectiles.length).toBe(0);
  });

  it('un proyectil no aplica el mismo impacto dos veces al perforar poco', () => {
    const { engine } = makeEngine();
    const internals = engine as unknown as ZombieInternals & ProjInternals;

    const spawn = engine as unknown as { spawnZombie3D: () => void };
    spawn.spawnZombie3D();
    const z = internals.zombies[0];
    z.data.hp = 100000;
    z.group.position.set(0, 0, -5);
    z.isDying = false;

    setPlayerPos(engine, 0, 0);

    internals.projectiles.push({
      mesh: new THREE.Mesh(new THREE.SphereGeometry(0.1), new THREE.MeshBasicMaterial()),
      pos: new THREE.Vector3(0, 1, -4.9),
      vel: new THREE.Vector3(0, 0, -12),
      radius: 0.1,
      damage: 25,
      gravity: 0,
      rangeRemaining: 100,
      pierceCount: 0, // sin perforación: debe destruirse tras el primer impacto
      knockback: 0,
      isEnemy: false,
    });

    const before = z.data.hp;
    stepProjectiles(engine, 1 / 60);
    expect(z.data.hp).toBe(before - 25); // exactamente un impacto
    expect(internals.projectiles.length).toBe(0);
  });
});

describe('Ciclo de vida del motor', () => {
  it('destroy() es idempotente y no lanza errores', () => {
    const { engine } = makeEngine();
    engine.start();
    engine.destroy();
    expect(() => engine.destroy()).not.toThrow();
  });

  it('tras destroy() los giros de caja están bloqueados', () => {
    const { engine } = makeEngine();
    engine.player.coins = MYSTERY_BOX_COST * 2;
    engine.destroy();
    expect(engine.requestMysterySpin()).toBeNull();
  });

  it('reinicios consecutivos (start/pause/resume) no duplican listeners ni fallan', () => {
    const { engine } = makeEngine();
    for (let i = 0; i < 3; i++) {
      engine.start();
      engine.pause();
      engine.resume();
    }
    engine.destroy();
    expect(() => engine.pause()).not.toThrow();
    expect(() => engine.resume()).not.toThrow();
  });
});
