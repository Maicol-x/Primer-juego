import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  Player,
  DefenseBase,
  Zombie,
  MysteryBoxLocation,
  MysteryBoxDrop,
  Weapon,
} from '../types';
import {
  createWeaponInstance,
  MYSTERY_BOX_COST,
  rollMysteryBox,
  getWeaponUpgradeCost,
  upgradeWeapon,
  getBaseUpgradeCost,
} from '../weapons';
import { sound } from '../audio';
import {
  createPlayerMesh,
  createFirstPersonViewModel,
  createDetailedZombieMesh,
  createBaseMesh,
  createMysteryBoxMesh,
  createWorkshopMesh,
  createPerimeterProps,
  MaterialLibrary,
} from './models';
import {
  createModernAsphaltTexture,
  createAsphaltRoughnessMap,
  createVisceralBloodTexture,
  createPlasmaScorchTexture,
} from './textures';
import { createWeapon3DMesh, WeaponModelResult } from './weaponModels';

export type CameraMode = 'third-person' | 'first-person' | 'drone';

/**
 * Conjuntos de recursos COMPARTIDOS (materiales/geometrías/texturas estáticos de
 * MaterialLibrary y helpers de modelos). Nunca deben liberarse al eliminar
 * entidades temporales, porque siguen en uso por otras mallas.
 */
const SHARED_MATERIALS: ReadonlySet<THREE.Material> = new Set(
  Object.values(MaterialLibrary).filter((v): v is THREE.Material => v instanceof THREE.Material)
);
const SHARED_GEOMETRIES: ReadonlySet<THREE.BufferGeometry> = new Set(
  Object.values(MaterialLibrary).filter((v): v is THREE.BufferGeometry => v instanceof THREE.BufferGeometry)
);

function disposeMaterialIfUnique(material: THREE.Material) {
  if (SHARED_MATERIALS.has(material)) return;
  const m = material as THREE.MeshStandardMaterial;
  // Texturas propias del material (solo si no están compartidas)
  for (const tex of [m.map, m.roughnessMap, m.metalnessMap, m.emissiveMap]) {
    if (tex && !SHARED_TEXTURES.has(tex)) tex.dispose();
  }
  material.dispose();
}

const SHARED_TEXTURES: ReadonlySet<THREE.Texture> = new Set(
  [...SHARED_MATERIALS].flatMap((mat) => {
    const m = mat as THREE.MeshStandardMaterial;
    return [m.map, m.roughnessMap, m.metalnessMap, m.emissiveMap].filter(
      (t): t is THREE.Texture => !!t
    );
  })
);

/**
 * Libera los recursos EXCLUSIVOS de una malla/línea/punto concreta.
 * Respeta los recursos compartidos registrados arriba.
 */
function disposeUniqueMeshResources(object: THREE.Object3D) {
  const mesh = object as THREE.Mesh;
  if (mesh.geometry && !SHARED_GEOMETRIES.has(mesh.geometry)) {
    mesh.geometry.dispose();
  }
  const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
  if (Array.isArray(material)) {
    material.forEach(disposeMaterialIfUnique);
  } else if (material) {
    disposeMaterialIfUnique(material);
  }
}

export interface ThreeEngineCallbacks {
  onPlayerUpdate: (player: Player) => void;
  onBaseUpdate: (base: DefenseBase) => void;
  onRoundUpdate: (round: number, zombiesRemaining: number, inIntermission: boolean) => void;
  onGameOver: (stats: { round: number; kills: number; score: number; coins: number }) => void;
  onNearMysteryBox: (isNear: boolean) => void;
  onNearWorkshop: (isNear: boolean) => void;
  /**
   * Notifica a la interfaz que se debe ABRIR el modal de la Caja Misteriosa.
   * El resultado del giro se solicita después vía requestMysterySpin() — que es
   * la ÚNICA operación que cobra y genera recompensa (una sola vez por giro).
   */
  onOpenMysteryBox: () => void;
  /** La tecla E cerca del taller solicita abrir el modal de mejoras (simétrico con la caja). */
  onOpenWorkshop?: () => void;
  onCameraModeChange?: (mode: CameraMode) => void;
  onDroneTelemetry?: (telemetry: { alt: number; x: number; z: number }) => void;
  onHitmarker?: () => void;
  onTargetLock?: (locked: boolean) => void;
  onPauseRequest?: () => void;
  onPointerLockChange?: (isLocked: boolean) => void;
}

interface Projectile3D {
  mesh: THREE.Mesh | THREE.Group;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  radius: number;
  damage: number;
  gravity: number;
  rangeRemaining: number;
  pierceCount: number;
  knockback: number;
  category?: Weapon['category'];
  explosiveRadius?: number;
  slowEffect?: { factor: number; duration: number };
  arcChains?: number;
  isRocket?: boolean;
  isEnemy: boolean;
}

interface Particle3D {
  mesh: THREE.Mesh | THREE.Line;
  vel: THREE.Vector3;
  alpha: number;
  decay: number;
  gravity?: number;
  bounces?: boolean;
  // true => la geometría/material son exclusivos de esta partícula y deben liberarse
  // al eliminarla. false => recurso compartido (MaterialLibrary, embers atmosféricos)
  // que NO debe destruirse porque sigue en uso.
  ownsResources?: boolean;
  // Material COMPARTIDO (embers atmosféricos, MaterialLibrary) usado por esta
  // partícula: se libera su geometría al expirar pero NUNCA este material.
  sharedMaterial?: THREE.Material;
}

interface ShellCasing3D {
  mesh: THREE.Mesh;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  rotVel: THREE.Vector3;
  bounces: number;
  lifetime: number;
}

interface ZombieInstance {
  data: Zombie;
  group: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  pustules?: THREE.Group;
  walkCycle: number;
  isDying?: boolean;
  deathTimer?: number;
  deathVel?: THREE.Vector3;
  rotVel?: THREE.Vector3;
}

/**
 * Distancia mínima (plano XZ) desde un punto P hasta el segmento AB.
 * Usada para detección de colisiones barrida de proyectiles: un proyectil
 * rápido que se mueve de A a B en un frame no debe atravesar un objetivo
 * si el segmento pasa a menos de su radio efectivo del centro del mismo.
 */
export function distancePointToSegment(
  px: number, pz: number,
  ax: number, az: number,
  bx: number, bz: number
): number {
  const abx = bx - ax;
  const abz = bz - az;
  const lenSq = abx * abx + abz * abz;
  if (lenSq === 0) return Math.hypot(px - ax, pz - az);
  let t = ((px - ax) * abx + (pz - az) * abz) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + abx * t), pz - (az + abz * t));
}

export class ThreeGameEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private clock: THREE.Clock;
  private callbacks: ThreeEngineCallbacks;

  // Estado del motor
  public isRunning = false;
  public isPaused = false;
  private animFrameId: number | null = null;
  private envTexture: THREE.Texture | null = null;
  private destroyed = false;
  private gameOverTriggered = false;
  // Registro de listeners para poder retirarlos exactamente en destroy()
  private boundListeners: Array<{
    target: EventTarget;
    type: string;
    listener: EventListenerOrEventListenerObject;
    options?: AddEventListenerOptions;
  }> = [];

  // Modos de Cámara & Control Suave
  public cameraMode: CameraMode = 'third-person';
  public cameraFov: number = 65;
  public droneSpeed: number = 24;
  public mouseSensitivity: number = 0.0022; // Sensibilidad suave y estable
  public shoulderOffsetSide: number = 0.7;  // Desplazamiento lateral sobre el hombro derecho (Tercera persona)

  // Ángulos de orientación del jugador y cámara
  public playerYaw: number = 0;
  public playerPitch: number = 0;
  private lastMousePos = { x: 0, y: 0 };

  // Parámetros de Cámara Dron Libre
  private dronePos = new THREE.Vector3(0, 16, 20);
  private droneTarget = new THREE.Vector3(0, 0, 0);
  private droneYaw = 0;
  private dronePitch = -0.55;

  // Entidades lógicas
  public player: Player;
  public base: DefenseBase;
  public mysteryBox: MysteryBoxLocation;
  public workshopLocation = { x: -12, z: -5, radius: 4.5 };

  // Mallas 3D del jugador y articulaciones
  private playerMeshObj: ReturnType<typeof createPlayerMesh>;
  private fpViewModel: ReturnType<typeof createFirstPersonViewModel>;
  private currentWeapon3D: WeaponModelResult | null = null;
  private currentFpWeapon3D: WeaponModelResult | null = null;

  private baseObj: ReturnType<typeof createBaseMesh>;
  private mysteryBoxObj: ReturnType<typeof createMysteryBoxMesh>;
  private workshopGroup: THREE.Group;
  private playerFlashlight: THREE.SpotLight;
  private muzzleFlashLight: THREE.PointLight;
  private laserBeam: THREE.Line;
  private laserDot: THREE.Mesh;

  // Colecciones de entidades 3D
  private zombies: ZombieInstance[] = [];
  private projectiles: Projectile3D[] = [];
  private particles: Particle3D[] = [];
  private casings: ShellCasing3D[] = [];
  private bloodDecals: THREE.Mesh[] = [];

  // Ronda y oleadas
  public round = 1;
  public zombiesToSpawnThisRound = 10;
  public zombiesSpawnedThisRound = 0;
  public spawnTimer = 0;
  public spawnInterval = 1.6;
  public inIntermission = false;
  public intermissionTimer = 0;
  public readonly intermissionDuration = 6.0;

  // Animaciones y física estilo GTA V / Halo 4
  private cameraShake = 0;
  private hitstopTimer = 0;
  private recoilZ = 0;
  private fpRecoilZ = 0;
  private walkAnimTime = 0;
  private bodyLeanAngle = 0; // Inclinación lateral dinámica al correr/esquivar

  private baseWeaponMountPos = new THREE.Vector3(0, 0.05, 0.15);
  private baseWeaponMountRot = new THREE.Euler(0, 0, 0);
  // Postura base del viewmodel en primera persona, específica de cada arma.
  // updatePlayerAnimations() aplica el sway como offset sobre esta posición,
  // en lugar de sobrescribirla con valores genéricos (defecto corregido).
  private baseFpViewPos = new THREE.Vector3(0.3, -0.28, -0.56);
  public isPointerLocked = false;

  private keys: Record<string, boolean> = {};
  private isMouseDown = false;

  // Pendencia de giro de la Caja Misteriosa: true mientras la animación del
  // modal está en curso. Impide cobros dobles por clics rápidos/concurrentes.
  private spinPending = false;
  /** Recompensa generada por requestMysterySpin() aún no reclamada por la UI. */
  private pendingDrop: MysteryBoxDrop | null = null;

  // Timeouts pendientes del arco Tesla (limpieza visual diferida). Se cancelan
  // en destroy() para evitar callbacks que toquen la escena tras destruirla.
  private pendingTeslaTimeouts: Set<ReturnType<typeof setTimeout>> = new Set();

  private nextId = 1;

  constructor(container: HTMLElement, callbacks: ThreeEngineCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.clock = new THREE.Clock();

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Inicializar entidades lógicas
    this.player = {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      radius: 1.0,
      hp: 100,
      maxHp: 100,
      speed: 13.5,
      stamina: 100,
      maxStamina: 100,
      dashCooldown: 1.6,
      dashTimer: 0,
      isDashing: false,
      angle: 0,
      activeWeaponIndex: 0,
      weapons: [createWeaponInstance('pistol')],
      coins: 350,
      score: 0,
      kills: 0,
      reloading: false,
      reloadProgress: 0,
      shootCooldown: 0,
      invulnerableTimer: 0,
      speedBuffTimer: 0,
      doublePointsTimer: 0,
      infiniteAmmoTimer: 0,
    };

    this.base = {
      x: 0,
      y: 0,
      width: 11,
      height: 11,
      hp: 1000,
      maxHp: 1000,
      armorLevel: 1,
      turretLevel: 1,
      turretRange: 26,
      turretFireRate: 2.2,
      turretCooldown: 0,
      turretAngle: 0,
      repairCost: 100,
    };

    this.mysteryBox = {
      x: 12,
      y: -5,
      width: 2.6,
      height: 1.8,
      cost: MYSTERY_BOX_COST,
      isOpen: false,
      isSpinning: false,
    };

    // 2. Renderer Moderno (Three.js PBR Pipeline)
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    // 3. Escena, Niebla Atmosférica y Entorno
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x060913);
    this.scene.fog = new THREE.FogExp2(0x060913, 0.014);

    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    // Guardamos la textura de entorno para poder liberarla en destroy():
    // sin esto, cada motor creado/acumulado deja un render target GPU vivo.
    this.envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = this.envTexture;
    pmremGenerator.dispose();

    // 4. Cámara Perspectiva
    this.camera = new THREE.PerspectiveCamera(this.cameraFov, width / height, 0.1, 180);
    this.camera.position.set(0, 1.85, 3.2);
    this.camera.lookAt(0, 1.5, 20);

    // 5. Modelo en Primera Persona (Halo 4 Viewmodel)
    this.fpViewModel = createFirstPersonViewModel();
    this.camera.add(this.fpViewModel.group);
    this.scene.add(this.camera);
    this.fpViewModel.group.visible = false;

    // 6. Luces Cinemáticas
    this.setupLighting();

    // 7. Suelo con Asfalto Húmedo y Señalizaciones
    this.createModernGround();

    // 8. Superviviente 3D Spartan Cyborg con Geometría Suavizada y Texturas HD
    this.playerMeshObj = createPlayerMesh();
    this.playerMeshObj.group.position.set(0, 0, 8);
    this.scene.add(this.playerMeshObj.group);

    // Linterna táctica militar con sombra en tiempo real
    this.playerFlashlight = new THREE.SpotLight(0xfff1db, 10.0, 42, Math.PI / 4.2, 0.35, 1.3);
    this.playerFlashlight.position.set(0, 1.5, 0);
    this.playerFlashlight.target.position.set(0, 0.5, 14);
    this.playerFlashlight.castShadow = true;
    this.playerFlashlight.shadow.mapSize.width = 1024;
    this.playerFlashlight.shadow.mapSize.height = 1024;
    this.playerFlashlight.shadow.bias = -0.001;
    this.playerMeshObj.group.add(this.playerFlashlight);
    this.playerMeshObj.group.add(this.playerFlashlight.target);

    // Muzzle Flash PointLight dinámico en el arma del robot
    this.muzzleFlashLight = new THREE.PointLight(0xfbbf24, 0, 12);
    this.muzzleFlashLight.position.set(0, 0, 1.2);

    // Mira láser táctica roja en 3D
    const laserMat = new THREE.LineBasicMaterial({
      color: 0xff0044,
      transparent: true,
      opacity: 0.65,
      linewidth: 1,
    });
    const laserGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 1.0),
      new THREE.Vector3(0, 0, 24),
    ]);
    this.laserBeam = new THREE.Line(laserGeo, laserMat);

    const laserDotGeo = new THREE.SphereGeometry(0.09, 8, 8);
    const laserDotMat = new THREE.MeshBasicMaterial({ color: 0xff0044 });
    this.laserDot = new THREE.Mesh(laserDotGeo, laserDotMat);
    this.scene.add(this.laserDot);

    // Equipar el modelo inicial del arma
    this.updateEquippedWeaponModels();

    // 9. Base y Búnker Central
    this.baseObj = createBaseMesh();
    this.baseObj.group.position.set(0, 0, 0);
    this.scene.add(this.baseObj.group);

    // 10. Caja Misteriosa
    this.mysteryBoxObj = createMysteryBoxMesh();
    this.mysteryBoxObj.group.position.set(this.mysteryBox.x, 0, this.mysteryBox.y);
    this.scene.add(this.mysteryBoxObj.group);

    // 11. Taller de Búnker
    this.workshopGroup = createWorkshopMesh();
    this.workshopGroup.position.set(this.workshopLocation.x, 0, this.workshopLocation.z);
    this.scene.add(this.workshopGroup);

    // 12. Perímetro con Postes de Luz Volumétricos
    const perim = createPerimeterProps();
    this.scene.add(perim);

    // 13. Niebla y partículas atmosféricas de cenizas
    this.createAtmosphericEmbers();

    this.bindEvents();
  }

  // --------------------------------------------------------------------------------
  // SISTEMA DINÁMICO DE MODELOS 3D DE ARMAS (RPG-7, MINIGUN, ESCOPETA, PISTOLA, ETC.)
  // --------------------------------------------------------------------------------

  public updateEquippedWeaponModels() {
    const p = this.player;
    const w = p.weapons[p.activeWeaponIndex];
    if (!w) return;

    // 1. Limpiar mallas anteriores en la mano del robot
    while (this.playerMeshObj.weaponMount.children.length > 0) {
      this.playerMeshObj.weaponMount.remove(this.playerMeshObj.weaponMount.children[0]);
    }

    // Re-añadir efectos de luz y láser
    this.playerMeshObj.weaponMount.add(this.muzzleFlashLight);
    this.playerMeshObj.weaponMount.add(this.laserBeam);

    // Crear modelo 3D específico para esta arma en 3ª persona
    const weapon3D = createWeapon3DMesh(w.id, false);
    this.currentWeapon3D = weapon3D;
    this.playerMeshObj.weaponMount.add(weapon3D.group);

    // Destello de boca ajustado a la punta del cañón
    const flashGeo = new THREE.OctahedronGeometry(0.18, 0);
    const flashMat = new THREE.MeshBasicMaterial({ color: 0xffedd5, transparent: true, opacity: 0 });
    const flashMesh = new THREE.Mesh(flashGeo, flashMat);
    flashMesh.position.copy(weapon3D.muzzlePos);
    this.playerMeshObj.muzzleFlashMesh = flashMesh;
    this.playerMeshObj.weaponMount.add(flashMesh);
    this.muzzleFlashLight.position.copy(weapon3D.muzzlePos);

    // 2. Limpiar y actualizar en Primera Persona (FPS viewmodel)
    while (this.fpViewModel.gunMesh.children.length > 0) {
      this.fpViewModel.gunMesh.remove(this.fpViewModel.gunMesh.children[0]);
    }

    const fpWeapon3D = createWeapon3DMesh(w.id, true);
    this.currentFpWeapon3D = fpWeapon3D;
    this.fpViewModel.gunMesh.add(fpWeapon3D.group);

    const fpFlash = new THREE.Mesh(flashGeo, flashMat);
    fpFlash.position.copy(fpWeapon3D.muzzlePos);
    this.fpViewModel.muzzleFlash = fpFlash;
    this.fpViewModel.gunMesh.add(fpFlash);

    // Ajuste de postura de brazos y posición de arma estilo GTA V / Halo 4 según el arma equipada:
    if (w.id === 'rpg7') {
      // Lanzacohetes descansando masivamente sobre el hombro derecho con brazos elevados
      this.baseWeaponMountPos.set(0.12, 0.44, 0.14);
      this.baseWeaponMountRot.set(-0.14, 0, 0);
      this.playerMeshObj.weaponMount.position.copy(this.baseWeaponMountPos);
      this.playerMeshObj.weaponMount.rotation.set(-0.14, 0, 0);
      this.playerMeshObj.rightArm.rotation.set(-0.85, 0.22, 0.08);
      this.playerMeshObj.leftArm.rotation.set(-0.75, -0.38, 0.32);

      // En primera persona: el lanzacohetes ocupa la parte superior derecha de la pantalla
      this.baseFpViewPos.set(0.34, -0.16, -0.44);
      this.fpViewModel.group.position.copy(this.baseFpViewPos);
      this.fpViewModel.group.rotation.set(-0.05, 0, 0);
    } else if (w.id === 'vulcan') {
      // Minigun sostenida a la altura de la cadera (Terminator / GTA V heavy carry)
      this.baseWeaponMountPos.set(0.06, -0.22, 0.28);
      this.baseWeaponMountRot.set(0, 0, 0);
      this.playerMeshObj.weaponMount.position.copy(this.baseWeaponMountPos);
      this.playerMeshObj.weaponMount.rotation.set(0, 0, 0);
      this.playerMeshObj.rightArm.rotation.set(0.35, 0.05, -0.05);
      this.playerMeshObj.leftArm.rotation.set(0.42, 0.25, -0.2);

      this.baseFpViewPos.set(0.24, -0.38, -0.6);
      this.fpViewModel.group.position.copy(this.baseFpViewPos);
      this.fpViewModel.group.rotation.set(0, 0, 0);
    } else if (w.id === 'pistol') {
      // Pistola táctica empuñada con agarre de combate
      this.baseWeaponMountPos.set(0, 0.08, 0.12);
      this.baseWeaponMountRot.set(0, 0, 0);
      this.playerMeshObj.weaponMount.position.copy(this.baseWeaponMountPos);
      this.playerMeshObj.weaponMount.rotation.set(0, 0, 0);
      this.playerMeshObj.rightArm.rotation.set(0.16, 0, 0);
      this.playerMeshObj.leftArm.rotation.set(0.2, 0.26, 0);

      this.baseFpViewPos.set(0.2, -0.24, -0.42);
      this.fpViewModel.group.position.copy(this.baseFpViewPos);
      this.fpViewModel.group.rotation.set(0, 0, 0);
    } else if (w.category === 'shotgun') {
      // Escopeta táctica SPAS-12 con guardamanos
      this.baseWeaponMountPos.set(0, 0.06, 0.18);
      this.baseWeaponMountRot.set(0, 0, 0);
      this.playerMeshObj.weaponMount.position.copy(this.baseWeaponMountPos);
      this.playerMeshObj.weaponMount.rotation.set(0, 0, 0);
      this.playerMeshObj.rightArm.rotation.set(0.06, 0, 0);
      this.playerMeshObj.leftArm.rotation.set(0.22, 0.28, -0.04);

      this.baseFpViewPos.set(0.28, -0.26, -0.52);
      this.fpViewModel.group.position.copy(this.baseFpViewPos);
      this.fpViewModel.group.rotation.set(0, 0, 0);
    } else {
      // Fusil de asalto M4A1, Subfusil Vector y Armas de Energía
      this.baseWeaponMountPos.set(0, 0.05, 0.16);
      this.baseWeaponMountRot.set(0, 0, 0);
      this.playerMeshObj.weaponMount.position.copy(this.baseWeaponMountPos);
      this.playerMeshObj.weaponMount.rotation.set(0, 0, 0);
      this.playerMeshObj.rightArm.rotation.set(0, 0, 0);
      this.playerMeshObj.leftArm.rotation.set(0, 0, 0);

      this.baseFpViewPos.set(0.3, -0.28, -0.56);
      this.fpViewModel.group.position.copy(this.baseFpViewPos);
      this.fpViewModel.group.rotation.set(0, 0, 0);
    }
  }

  // --------------------------------------------------------------------------------
  // GESTIÓN DE CÁMARA (TERCERA PERSONA SOBRE EL HOMBRO, FPS, DRON LIBRE)
  // --------------------------------------------------------------------------------

  public setCameraMode(mode: CameraMode) {
    this.cameraMode = mode;
    if (mode === 'first-person') {
      this.playerMeshObj.group.visible = false;
      this.fpViewModel.group.visible = true;
      this.camera.fov = 75;
      this.camera.near = 0.05;
    } else if (mode === 'third-person') {
      this.playerMeshObj.group.visible = true;
      this.fpViewModel.group.visible = false;
      this.camera.fov = this.cameraFov;
      this.camera.near = 0.1;
    } else if (mode === 'drone') {
      this.playerMeshObj.group.visible = true;
      this.fpViewModel.group.visible = false;
      this.camera.fov = 60;
      this.camera.near = 0.2;
      const p = this.playerMeshObj.group.position;
      this.dronePos.set(p.x, 15, p.z + 12);
      this.droneYaw = this.playerYaw;
      this.dronePitch = -0.55;
    }
    this.camera.updateProjectionMatrix();
    this.callbacks.onCameraModeChange?.(mode);
  }

  public cycleCameraMode() {
    if (this.cameraMode === 'third-person') {
      this.setCameraMode('first-person');
    } else if (this.cameraMode === 'first-person') {
      this.setCameraMode('drone');
    } else {
      this.setCameraMode('third-person');
    }
  }

  public setCameraFov(fov: number) {
    this.cameraFov = THREE.MathUtils.clamp(fov, 45, 95);
    if (this.cameraMode === 'third-person') {
      this.camera.fov = this.cameraFov;
      this.camera.updateProjectionMatrix();
    }
  }

  public setDroneSpeed(speed: number) {
    this.droneSpeed = THREE.MathUtils.clamp(speed, 8, 50);
  }

  public setMouseSensitivity(sens: number) {
    this.mouseSensitivity = THREE.MathUtils.clamp(sens, 0.0008, 0.006);
  }

  public setShoulderOffsetSide(offset: number) {
    this.shoulderOffsetSide = THREE.MathUtils.clamp(offset, 0, 1.2);
  }

  private setupLighting() {
    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x090d16, 0.45);
    hemiLight.position.set(0, 60, 0);
    this.scene.add(hemiLight);

    const moonLight = new THREE.DirectionalLight(0x93c5fd, 1.4);
    moonLight.position.set(28, 50, 24);
    moonLight.castShadow = true;
    moonLight.shadow.mapSize.width = 2048;
    moonLight.shadow.mapSize.height = 2048;
    moonLight.shadow.camera.near = 2;
    moonLight.shadow.camera.far = 130;
    const d = 42;
    moonLight.shadow.camera.left = -d;
    moonLight.shadow.camera.right = d;
    moonLight.shadow.camera.top = d;
    moonLight.shadow.camera.bottom = -d;
    moonLight.shadow.bias = -0.0004;
    moonLight.shadow.normalBias = 0.02;
    this.scene.add(moonLight);

    const baseReactorLight = new THREE.PointLight(0x0284c7, 4.0, 24);
    baseReactorLight.position.set(0, 5.8, 0);
    this.scene.add(baseReactorLight);

    const boxBeacon = new THREE.PointLight(0x38bdf8, 3.0, 14);
    boxBeacon.position.set(this.mysteryBox.x, 3.0, this.mysteryBox.y);
    this.scene.add(boxBeacon);
  }

  private createModernGround() {
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    const groundTex = createModernAsphaltTexture(maxAniso);
    const roughnessMap = createAsphaltRoughnessMap(maxAniso);

    const groundGeo = new THREE.PlaneGeometry(160, 160);
    groundGeo.rotateX(-Math.PI / 2);

    const groundMat = new THREE.MeshStandardMaterial({
      map: groundTex,
      roughnessMap: roughnessMap,
      roughness: 0.42,
      metalness: 0.25,
    });

    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.receiveShadow = true;
    this.scene.add(groundMesh);

    const ringGeo = new THREE.RingGeometry(40, 40.8, 64);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.45,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.y = 0.04;
    this.scene.add(ringMesh);
  }

  private createAtmosphericEmbers() {
    const count = 120;
    const emberGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
    const emberMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.6,
    });

    for (let i = 0; i < count; i++) {
      const ember = new THREE.Mesh(emberGeo, emberMat);
      ember.position.set(
        (Math.random() - 0.5) * 80,
        1 + Math.random() * 10,
        (Math.random() - 0.5) * 80
      );
      this.scene.add(ember);

      this.particles.push({
        mesh: ember,
        vel: new THREE.Vector3((Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.5),
        alpha: 0.5,
        decay: 0.02,
        sharedMaterial: emberMat,
      });
    }
  }

  // --------------------------------------------------------------------------------
  // GESTIÓN DE EVENTOS DE RATÓN Y TECLADO (DIRECCIONES CORREGIDAS 100% ESTÁNDAR)
  // --------------------------------------------------------------------------------

  private bindEvents() {
    // Helper: registra y memoriza cada listener para poder retirarlo en destroy()
    const listen = (
      target: EventTarget,
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: AddEventListenerOptions
    ) => {
      target.addEventListener(type, listener, options);
      this.boundListeners.push({ target, type, listener, options });
    };

    listen(window, 'resize', this.onWindowResize);

    listen(window, 'keydown', (e) => {
      const ke = e as KeyboardEvent;

      // Escape siempre disponible: pausar/reanudar desde el menú de pausa.
      if (ke.key === 'Escape' || ke.key === 'Esc') {
        this.callbacks.onPauseRequest?.();
        return;
      }

      // MÁQUINA DE ESTADOS DE ENTRADA: mientras la partida no esté activa
      // (pausada o en derrota) NO se procesan acciones de juego: cambiar
      // armas, recargar, dash ni interacciones. Solo queda Escape arriba.
      // Esto evita que teclas pulsadas bajo un modal alteren el motor.
      if (!this.isRunning || this.isPaused || this.gameOverTriggered) return;

      this.keys[ke.key.toLowerCase()] = true;
      this.keys[ke.code] = true;

      // Alternar cámaras con C o V
      if (ke.key.toLowerCase() === 'c' || ke.key.toLowerCase() === 'v') {
        this.cycleCameraMode();
      }

      if (ke.key.toLowerCase() === 'r') {
        this.startReload();
      }
      if (ke.key === ' ' || ke.code === 'Space') {
        if (this.cameraMode !== 'drone') {
          this.performDash();
        }
      }
      if (ke.key.toLowerCase() === 'e') {
        this.interact();
      }
      if (ke.key >= '1' && ke.key <= '5') {
        const idx = parseInt(ke.key) - 1;
        if (idx < this.player.weapons.length) {
          this.switchWeapon(idx);
        }
      }
    });

    listen(window, 'keyup', (e) => {
      const ke = e as KeyboardEvent;
      this.keys[ke.key.toLowerCase()] = false;
      this.keys[ke.code] = false;
    });

    listen(window, 'blur', () => {
      this.keys = {};
      this.isMouseDown = false;
    });

    // Fijación de puntero (Pointer Lock): Al hacer clic en el juego se captura el ratón
    listen(this.renderer.domElement, 'click', () => {
      if (!document.pointerLockElement) {
        this.renderer.domElement.requestPointerLock?.();
      }
    });

    listen(document, 'pointerlockchange', () => {
      if (this.destroyed) return;
      this.isPointerLocked = document.pointerLockElement === this.renderer.domElement;
      this.callbacks.onPointerLockChange?.(this.isPointerLocked);
    });

    // Control de Ratón Natural y Preciso:
    // Mover ratón a la derecha (dx > 0) -> Gira la vista y el personaje a la DERECHA
    // Mover ratón a la izquierda (dx < 0) -> Gira la vista y el personaje a la IZQUIERDA
    // Mover ratón hacia arriba (dy < 0) -> Mira hacia ARRIBA
    // Mover ratón hacia abajo (dy > 0) -> Mira hacia ABAJO
    listen(this.renderer.domElement, 'mousemove', (e) => {
      const me = e as MouseEvent;
      const isLocked = document.pointerLockElement === this.renderer.domElement;
      let dx = me.movementX;
      let dy = me.movementY;

      if (!isLocked || dx === undefined || dy === undefined) {
        dx = me.clientX - this.lastMousePos.x;
        dy = me.clientY - this.lastMousePos.y;
      }

      this.lastMousePos = { x: me.clientX, y: me.clientY };

      // Filtrar saltos bruscos
      dx = THREE.MathUtils.clamp(dx, -60, 60);
      dy = THREE.MathUtils.clamp(dy, -60, 60);

      if (this.cameraMode === 'first-person' || this.cameraMode === 'third-person') {
        // Al mover hacia la derecha (dx > 0), playerYaw AUMENTA y la vista gira a la DERECHA
        this.playerYaw += dx * this.mouseSensitivity;
        this.playerPitch = THREE.MathUtils.clamp(
          this.playerPitch - dy * this.mouseSensitivity,
          -0.68,
          0.72
        );
      } else if (this.cameraMode === 'drone') {
        this.droneYaw += dx * (this.mouseSensitivity * 1.5);
        this.dronePitch = THREE.MathUtils.clamp(
          this.dronePitch - dy * (this.mouseSensitivity * 1.5),
          -1.4,
          1.4
        );
      }
    });

    listen(this.renderer.domElement, 'mousedown', (e) => {
      const me = e as MouseEvent;
      this.lastMousePos = { x: me.clientX, y: me.clientY };

      if (me.button === 0) {
        this.isMouseDown = true;
      } else if (me.button === 2) {
        if (this.cameraMode !== 'drone') {
          this.performDash();
        }
      }
    });

    // mouseup también en window: si el usuario suelta el botón fuera del canvas,
    // el estado de disparo no debe quedar "pegado"
    listen(window, 'mouseup', (e) => {
      const me = e as MouseEvent;
      if (me.button === 0) {
        this.isMouseDown = false;
      }
    });

    listen(this.renderer.domElement, 'contextmenu', (e) => e.preventDefault());

    listen(this.renderer.domElement, 'wheel', (e) => {
      const we = e as WheelEvent;
      if (we.deltaY > 0) {
        this.switchWeapon((this.player.activeWeaponIndex + 1) % this.player.weapons.length);
      } else if (we.deltaY < 0) {
        this.switchWeapon(
          (this.player.activeWeaponIndex - 1 + this.player.weapons.length) % this.player.weapons.length
        );
      }
    });
  }

  private onWindowResize = () => {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  public start() {
    if (this.destroyed || this.gameOverTriggered) return;
    // Evita encolar múltiples bucles rAF si start() se llama repetidamente
    if (this.isRunning) return;
    this.isRunning = true;
    this.isPaused = false;
    this.clock.start();
    sound.playRoundStart();
    this.animate();
  }

  public pause() {
    this.isPaused = true;
    // Durante la pausa el bucle NO debe quedar congelado con isRunning=true:
    // se cancela el fotograma pendiente y se marca isRunning=false para que
    // resume() pueda relanzar un único bucle. Esto elimina el congelamiento
    // al reanudar (animate() salía sin re-encolar cuando estaba pausado).
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.isRunning = false;
    // Suelta el puntero capturado para poder interactuar con los menús
    if (document.pointerLockElement === this.renderer.domElement) {
      document.exitPointerLock?.();
    }
  }

  public resume() {
    if (this.destroyed || this.gameOverTriggered) return;
    if (this.isPaused) {
      this.isPaused = false;
      this.clock.start();
      // Relanza SIEMPRE un único bucle: start() es idempotente mientras
      // isRunning sea true, por lo que no pueden coexistir dos bucles rAF.
      this.start();
    }
  }

  public destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.isRunning = false;
    this.isPaused = true;

    // Si había un giro pagado sin reclamar, el premio se pierde al destruir
    // el motor: liberamos la pendencia para que ningún callback posterior de
    // la UI intente aplicar/reclamar algo sobre un motor muerto.
    this.spinPending = false;
    this.pendingDrop = null;

    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    // Retirar TODOS los listeners registrados (ventana, documento y canvas)
    for (const { target, type, listener, options } of this.boundListeners) {
      target.removeEventListener(type, listener, options);
    }
    this.boundListeners = [];

    // Pendientes de Tesla: referencias a this.scene ya no válidas tras destroy
    this.pendingTeslaTimeouts.forEach(clearTimeout);
    this.pendingTeslaTimeouts.clear();

    if (document.pointerLockElement === this.renderer.domElement) {
      document.exitPointerLock?.();
    }

    // Liberar recursos GPU de todas las entidades y efectos vivos
    this.disposeObject3D(this.scene, /* recursive */ true);

    // Libera los clones exclusivos de los viewmodels de arma (los originales
    // permanecen en currentWeapon3D/currentFpWeapon3D y se liberan abajo).
    this.playerMeshObj.weaponMount.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
    });

    // Modelos de armas actuales (geometrías/materiales propios + clonados)
    this.currentWeapon3D?.group.traverse(disposeUniqueMeshResources);
    this.currentFpWeapon3D?.group.traverse(disposeUniqueMeshResources);

    // Texturas exclusivas del suelo y quemaduras/plasma
    this.scene.traverse(() => {}); // no-op defensivo

    this.renderer.dispose();
    this.renderer.forceContextLoss?.();

    // Textura HDR de entorno generada por PMREM: es exclusiva de este motor;
    // liberarla evita dejar un render target GPU vivo tras cada destroy.
    if (this.envTexture) {
      this.scene.environment = null;
      this.envTexture.dispose();
      this.envTexture = null;
    }

    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }

    // Desvincular referencias grandes
    this.zombies = [];
    this.projectiles = [];
    this.particles = [];
    this.casings = [];
    this.bloodDecals = [];
  }

  /** Elimina un Object3D del árbol y libera geometría/material/texturas exclusivos. */
  private removeAndDispose(object: THREE.Object3D) {
    object.removeFromParent();
    disposeUniqueMeshResources(object);
    object.traverse(disposeUniqueMeshResources);
  }

  /**
   * Política común de eliminación de efectos temporales (proyectiles, casquillos,
   * partículas): retira el objeto de la escena y libera SU geometría exclusiva.
   * El material se pasa por parámetro porque puede ser compartido
   * (MaterialLibrary / embers atmosféricos) y no debe destruirse nunca aquí;
   * disposeMaterialIfUnique lo ignora si está en el conjunto compartido.
   */
  private removeEffectMesh(mesh: THREE.Mesh | THREE.Line, material?: THREE.Material | THREE.Material[]) {
    mesh.removeFromParent();
    const m = mesh as THREE.Mesh;
    if (m.geometry && !SHARED_GEOMETRIES.has(m.geometry)) {
      m.geometry.dispose();
    }
    const mat = material ?? (m.material as THREE.Material | THREE.Material[] | undefined);
    if (Array.isArray(mat)) {
      mat.forEach(disposeMaterialIfUnique);
    } else if (mat) {
      disposeMaterialIfUnique(mat);
    }
  }

  /** Recorre un árbol y libera recursos de todos sus nodos (sin tocar compartidos). */
  private disposeObject3D(root: THREE.Object3D, _recursive: boolean) {
    root.traverse(disposeUniqueMeshResources);
  }

  private animate = () => {
    if (!this.isRunning || this.isPaused) return;

    const rawDelta = this.clock.getDelta();
    const dt = Math.min(rawDelta, 0.05);

    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      this.renderer.render(this.scene, this.camera);
      this.animFrameId = requestAnimationFrame(this.animate);
      return;
    }

    this.update(dt);
    this.renderer.render(this.scene, this.camera);

    this.animFrameId = requestAnimationFrame(this.animate);
  };

  // --------------------------------------------------------------------------------
  // BUCLE DE ACTUALIZACIÓN DEL JUEGO
  // --------------------------------------------------------------------------------

  /** Envía una copia del estado del jugador a la interfaz (fuera del bucle de juego). */
  public syncPlayerState() {
    if (this.destroyed) return;
    this.callbacks.onPlayerUpdate({ ...this.player });
  }

  /** Única operación de compra: comprueba saldo, descuenta y aplica. Idempotente por validación centralizada. */
  public purchaseWeaponUpgrade(weaponIndex: number): boolean {
    const p = this.player;
    const w = p.weapons[weaponIndex];
    if (!w || this.destroyed || this.gameOverTriggered) return false;
    const cost = getWeaponUpgradeCost(w);
    if (p.coins < cost || w.upgradeLevel >= w.maxUpgradeLevel) return false;
    p.coins -= cost;
    p.weapons[weaponIndex] = upgradeWeapon(w);
    this.syncPlayerState();
    return true;
  }

  public purchaseBaseRepair(): boolean {
    const p = this.player;
    const b = this.base;
    if (this.destroyed || this.gameOverTriggered) return false;
    const cost = getBaseUpgradeCost('repair', b);
    if (p.coins < cost || b.hp >= b.maxHp) return false;
    p.coins -= cost;
    b.hp = b.maxHp;
    this.syncPlayerState();
    this.callbacks.onBaseUpdate({ ...b });
    return true;
  }

  public purchaseBaseArmor(): boolean {
    const p = this.player;
    const b = this.base;
    if (this.destroyed || this.gameOverTriggered) return false;
    const cost = getBaseUpgradeCost('armor', b);
    if (p.coins < cost) return false;
    p.coins -= cost;
    b.armorLevel++;
    b.maxHp += 200;
    b.hp = Math.min(b.maxHp, b.hp + 200);
    this.syncPlayerState();
    this.callbacks.onBaseUpdate({ ...b });
    return true;
  }

  public purchaseBaseTurret(): boolean {
    const p = this.player;
    const b = this.base;
    if (this.destroyed || this.gameOverTriggered) return false;
    const cost = getBaseUpgradeCost('turret', b);
    if (p.coins < cost) return false;
    p.coins -= cost;
    b.turretLevel++;
    b.turretFireRate = Number((b.turretFireRate * 1.25).toFixed(2));
    b.turretRange += 4;
    this.syncPlayerState();
    this.callbacks.onBaseUpdate({ ...b });
    return true;
  }

  private update(dt: number) {
    // Si la derrota se dispara en mitad del frame (p. ej. dentro de
    // updateZombies al atacar varios zombis), se CORTA la actualización
    // inmediatamente: ningún subsistema posterior puede seguir modificando
    // monedas, puntuación, bajas o entidades después del estado terminal.
    const step = (fn: (dt: number) => void) => {
      if (this.gameOverTriggered || this.destroyed) return;
      fn.call(this, dt);
    };

    step(this.updatePlayer);
    step(this.updateBase);
    step(this.updateZombies);
    step(this.updateProjectiles);
    step(this.updateCasings);
    step(this.updateParticles);
    step(this.updateRounds);
    step(this.updateProximity);
    step(this.updateMysteryBoxAnimation);
    step(this.updateCamera);
  }

  private updatePlayer(dt: number) {
    const p = this.player;

    if (p.invulnerableTimer > 0) p.invulnerableTimer -= dt;
    if (p.speedBuffTimer > 0) p.speedBuffTimer -= dt;
    if (p.doublePointsTimer > 0) p.doublePointsTimer -= dt;
    if (p.infiniteAmmoTimer > 0) p.infiniteAmmoTimer -= dt;

    if (p.dashTimer > 0) {
      p.dashTimer -= dt;
      if (p.dashTimer <= p.dashCooldown - 0.28) {
        p.isDashing = false;
      }
    }
    if (p.stamina < p.maxStamina) {
      p.stamina = Math.min(p.maxStamina, p.stamina + 35 * dt);
    }

    // Vectores de orientación de la cámara (W: adelante, S: atrás, D: derecha, A: izquierda)
    // Coordenadas estándar: El frente es (sin(yaw), 0, cos(yaw)), la derecha es (cos(yaw), 0, -sin(yaw))
    const forwardVec = new THREE.Vector3(Math.sin(this.playerYaw), 0, Math.cos(this.playerYaw)).normalize();
    const rightVec = new THREE.Vector3(Math.cos(this.playerYaw), 0, -Math.sin(this.playerYaw)).normalize();

    const moveDir = new THREE.Vector3();

    if (this.cameraMode !== 'drone') {
      if (this.keys['w'] || this.keys['arrowup']) moveDir.add(forwardVec);
      if (this.keys['s'] || this.keys['arrowdown']) moveDir.sub(forwardVec);
      if (this.keys['d'] || this.keys['arrowright']) moveDir.add(rightVec); // DERECHA
      if (this.keys['a'] || this.keys['arrowleft']) moveDir.sub(rightVec); // IZQUIERDA
    }

    const isMoving = moveDir.lengthSq() > 0;
    if (isMoving) {
      moveDir.normalize();
    }

    const currentSpeed = p.isDashing ? p.speed * 2.5 : p.speedBuffTimer > 0 ? p.speed * 1.35 : p.speed;

    p.vx = moveDir.x * currentSpeed;
    p.vy = moveDir.z * currentSpeed;

    const pPos = this.playerMeshObj.group.position;
    pPos.x += p.vx * dt;
    pPos.z += p.vy * dt;

    // Límites de la arena de combate
    pPos.x = THREE.MathUtils.clamp(pPos.x, -58, 58);
    pPos.z = THREE.MathUtils.clamp(pPos.z, -58, 58);

    // Colisión sólida con el búnker central
    const bDistX = pPos.x;
    const bDistZ = pPos.z;
    const bHalf = 6.2;
    if (Math.abs(bDistX) < bHalf && Math.abs(bDistZ) < bHalf) {
      const overlapX = bHalf - Math.abs(bDistX);
      const overlapZ = bHalf - Math.abs(bDistZ);
      if (overlapX < overlapZ) {
        pPos.x += Math.sign(bDistX) * overlapX;
      } else {
        pPos.z += Math.sign(bDistZ) * overlapZ;
      }
    }

    // Rotación del robot sincronizada con el ángulo Yaw
    this.playerMeshObj.group.rotation.y = this.playerYaw;
    this.playerMeshObj.torsoGroup.rotation.x = -this.playerPitch * 0.45;
    p.angle = this.playerYaw;

    // Punto láser rojo guiado
    const dotPos = pPos.clone().add(forwardVec.clone().multiplyScalar(22));
    this.laserDot.position.set(dotPos.x, 0.08, dotPos.z);

    // Animaciones estilo GTA V / Halo 4
    this.updatePlayerAnimations(dt, isMoving, currentSpeed, moveDir, rightVec);

    // Disparo continuo y rotación de cañón Gatling de la Minigun
    const activeWeapon = p.weapons[p.activeWeaponIndex];
    if (p.shootCooldown > 0) p.shootCooldown -= dt;

    if (this.isMouseDown && activeWeapon.id === 'vulcan') {
      if (this.currentWeapon3D?.spinningGroup) {
        this.currentWeapon3D.spinningGroup.rotation.z += 28 * dt;
      }
      if (this.currentFpWeapon3D?.spinningGroup) {
        this.currentFpWeapon3D.spinningGroup.rotation.z += 28 * dt;
      }
    }

    if (p.reloading) {
      p.reloadProgress += dt / activeWeapon.reloadTime;
      if (p.reloadProgress >= 1) {
        this.finishReload();
      }
    } else {
      if (this.isMouseDown && p.shootCooldown <= 0 && this.cameraMode !== 'drone') {
        this.fireActiveWeapon();
      }
    }

    p.x = pPos.x;
    p.y = pPos.z;
    this.callbacks.onPlayerUpdate({ ...p });
  }

  // --------------------------------------------------------------------------------
  // SISTEMA DE ANIMACIONES REALISTAS ESTILO GTA V / HALO 4
  // --------------------------------------------------------------------------------

  private updatePlayerAnimations(
    dt: number,
    isMoving: boolean,
    currentSpeed: number,
    moveDir: THREE.Vector3,
    rightVec: THREE.Vector3
  ) {
    const p = this.player;
    const m = this.playerMeshObj;

    // 1. Locomoción estilo GTA V: Inclinación lateral en giros (banking)
    if (isMoving) {
      this.walkAnimTime += dt * (currentSpeed * 0.85);

      // Calcular si nos estamos desplazando hacia la derecha o izquierda para inclinar el chasis
      const strafeFactor = moveDir.dot(rightVec);
      this.bodyLeanAngle = THREE.MathUtils.damp(this.bodyLeanAngle, -strafeFactor * 0.12, 10, dt);
      m.torsoGroup.rotation.z = this.bodyLeanAngle;

      const thighAngle = Math.sin(this.walkAnimTime) * 0.65;
      m.leftLeg.rotation.x = thighAngle;
      m.rightLeg.rotation.x = -thighAngle;

      m.leftKnee.rotation.x = Math.max(0, -Math.sin(this.walkAnimTime) * 0.9);
      m.rightKnee.rotation.x = Math.max(0, Math.sin(this.walkAnimTime) * 0.9);

      // Rebote vertical rítmico de carrera
      m.torsoGroup.position.y = 1.05 + Math.abs(Math.sin(this.walkAnimTime * 2)) * 0.07;
      m.leftArm.rotation.x = -Math.sin(this.walkAnimTime) * 0.14;
    } else {
      this.bodyLeanAngle = THREE.MathUtils.damp(this.bodyLeanAngle, 0, 10, dt);
      m.torsoGroup.rotation.z = this.bodyLeanAngle;

      m.leftLeg.rotation.x = THREE.MathUtils.damp(m.leftLeg.rotation.x, 0, 9, dt);
      m.rightLeg.rotation.x = THREE.MathUtils.damp(m.rightLeg.rotation.x, 0, 9, dt);
      m.leftKnee.rotation.x = THREE.MathUtils.damp(m.leftKnee.rotation.x, 0, 9, dt);
      m.rightKnee.rotation.x = THREE.MathUtils.damp(m.rightKnee.rotation.x, 0, 9, dt);
      m.torsoGroup.position.y = THREE.MathUtils.damp(m.torsoGroup.position.y, 1.05, 9, dt);
      m.leftArm.rotation.x = THREE.MathUtils.damp(m.leftArm.rotation.x, 0, 9, dt);
    }

    // 2. Dash con Propulsores Dorsales
    if (p.isDashing) {
      m.torsoGroup.rotation.x = 0.38;
      m.thrusterFlames.scale.set(1.5, 1.5, 2.4);

      if (Math.random() < 0.6) {
        const plasmaGeo = new THREE.SphereGeometry(0.12, 6, 6);
        const plasmaMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
        const plasmaP = new THREE.Mesh(plasmaGeo, plasmaMat);
        const pPos = m.group.position;
        plasmaP.position.set(pPos.x + (Math.random() - 0.5) * 0.3, 1.6, pPos.z - 0.3);
        this.scene.add(plasmaP);

        this.particles.push({
          mesh: plasmaP,
          vel: new THREE.Vector3((Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.4, -2.5),
          alpha: 0.85,
          decay: 2.5,
        });
      }
    } else {
      m.thrusterFlames.scale.set(0.2, 0.2, 0.2);
    }

    // 3. Retroceso Físico del Arma en la Mano respetando la postura base
    if (this.recoilZ > 0) {
      this.recoilZ = THREE.MathUtils.damp(this.recoilZ, 0, 18, dt);
      m.weaponMount.position.set(
        this.baseWeaponMountPos.x,
        this.baseWeaponMountPos.y,
        this.baseWeaponMountPos.z - this.recoilZ
      );
      m.weaponMount.rotation.x = this.baseWeaponMountRot.x - this.recoilZ * 0.45;
      m.rightArm.position.z = -this.recoilZ * 0.25;
    } else {
      m.weaponMount.position.copy(this.baseWeaponMountPos);
      m.weaponMount.rotation.copy(this.baseWeaponMountRot);
      m.rightArm.position.z = 0;
    }

    // Retroceso en Primera Persona
    if (this.fpRecoilZ > 0) {
      this.fpRecoilZ = THREE.MathUtils.damp(this.fpRecoilZ, 0, 16, dt);
      this.fpViewModel.gunMesh.position.z = -this.fpRecoilZ;
      this.fpViewModel.gunMesh.rotation.x = this.fpRecoilZ * 0.7;
    } else {
      this.fpViewModel.gunMesh.position.z = 0;
      this.fpViewModel.gunMesh.rotation.x = 0;
    }

    if (this.cameraMode === 'first-person') {
      // Sway de locomoción: se aplica como OFFSET sobre la postura base del
      // viewmodel específica de cada arma (baseFpViewPos), no sobrescribiendo
      // una posición genérica fija. Así cada arma conserva su colocación
      // intencionada (RPG al hombro, minigun a la cadera, etc.).
      const swayX = isMoving ? Math.sin(this.walkAnimTime) * 0.015 : 0;
      const swayY = isMoving ? Math.cos(this.walkAnimTime * 2) * 0.012 : 0;
      this.fpViewModel.group.position.set(
        this.baseFpViewPos.x + swayX,
        this.baseFpViewPos.y + swayY,
        this.baseFpViewPos.z
      );
    }

    if (this.muzzleFlashLight.intensity > 0) {
      this.muzzleFlashLight.intensity = Math.max(0, this.muzzleFlashLight.intensity - 38 * dt);
      const flashOpacity = this.muzzleFlashLight.intensity / 8.0;
      (m.muzzleFlashMesh.material as THREE.MeshBasicMaterial).opacity = flashOpacity;
      (this.fpViewModel.muzzleFlash.material as THREE.MeshBasicMaterial).opacity = flashOpacity;
    }
  }

  // --------------------------------------------------------------------------------
  // GESTIÓN DE DISPARO BALÍSTICO HACIA EL CENTRO DE LA PANTALLA
  // --------------------------------------------------------------------------------

  public fireActiveWeapon() {
    const p = this.player;
    const w = p.weapons[p.activeWeaponIndex];

    if (w.currentMag <= 0) {
      this.startReload();
      return;
    }

    if (p.infiniteAmmoTimer <= 0) {
      w.currentMag--;
    }

    p.shootCooldown = 1 / w.fireRate;
    this.muzzleFlashLight.intensity = 8.0;
    this.recoilZ = 0.24;
    this.fpRecoilZ = 0.09;

    this.playerMeshObj.muzzleFlashMesh.rotation.z = Math.random() * Math.PI * 2;
    this.fpViewModel.muzzleFlash.rotation.z = Math.random() * Math.PI * 2;

    if (w.category !== 'energy' && w.category !== 'special') {
      this.ejectShellCasing();
    }

    switch (w.category) {
      case 'pistol':
        sound.playPistol();
        break;
      case 'shotgun':
        sound.playShotgun();
        this.addCameraShake(7);
        break;
      case 'explosive':
        sound.playShotgun();
        this.addCameraShake(12);
        break;
      case 'energy':
        if (w.id === 'tesla') sound.playTesla();
        else sound.playRayGun();
        break;
      case 'special':
        sound.playFreeze();
        break;
      default:
        sound.playRifle();
        this.addCameraShake(2.5);
        break;
    }

    const pPos = this.playerMeshObj.group.position;
    const forwardVec = new THREE.Vector3(Math.sin(this.playerYaw), 0, Math.cos(this.playerYaw)).normalize();
    const rightVec = new THREE.Vector3(Math.cos(this.playerYaw), 0, -Math.sin(this.playerYaw)).normalize();

    const camDir = new THREE.Vector3();
    this.camera.getWorldDirection(camDir);

    const aimTargetPoint = this.camera.position.clone().add(camDir.clone().multiplyScalar(45));

    const spawnPos = this.cameraMode === 'first-person'
      ? this.camera.position.clone().add(camDir.clone().multiplyScalar(0.7)).add(rightVec.clone().multiplyScalar(0.2)).sub(new THREE.Vector3(0, 0.12, 0))
      : new THREE.Vector3(pPos.x, 1.45, pPos.z).add(rightVec.clone().multiplyScalar(0.35)).add(forwardVec.clone().multiplyScalar(0.9));

    const baseFireDir = aimTargetPoint.clone().sub(spawnPos).normalize();
    const pellets = w.pellets || 1;

    for (let i = 0; i < pellets; i++) {
      const spreadX = (Math.random() - 0.5) * w.spread;
      const spreadY = (Math.random() - 0.5) * w.spread;
      const fireDir = baseFireDir.clone().add(rightVec.clone().multiplyScalar(spreadX)).add(new THREE.Vector3(0, spreadY, 0)).normalize();

      let bulletMesh: THREE.Mesh | THREE.Group;
      let gravity = 0;
      let isRocket = false;
      let initVy = 0;

      if (w.category === 'explosive') {
        isRocket = true;
        gravity = 9.8; // Balística con caída física realista
        initVy = 2.2;

        // Modelo 3D realista del proyectil cohete RPG
        const rocketGroup = new THREE.Group();
        const bodyGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.1, 12);
        bodyGeo.rotateX(Math.PI / 2);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2b3824, roughness: 0.35, metalness: 0.75 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        rocketGroup.add(body);

        const tipGeo = new THREE.ConeGeometry(0.22, 0.45, 14);
        tipGeo.rotateX(Math.PI / 2);
        const tipMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.25 });
        const tip = new THREE.Mesh(tipGeo, tipMat);
        tip.position.z = 0.68;
        rocketGroup.add(tip);

        // 4 aletas traseras
        for (let f = 0; f < 4; f++) {
          const fin = new THREE.Mesh(
            new THREE.BoxGeometry(0.015, 0.22, 0.18),
            MaterialLibrary.chromePistonMat
          );
          fin.rotation.z = (f * Math.PI) / 2;
          fin.position.set(0, 0, -0.45);
          rocketGroup.add(fin);
        }

        bulletMesh = rocketGroup;
      } else if (w.rarity === 'legendary') {
        const energyGeo = new THREE.SphereGeometry(0.28, 10, 10);
        const energyMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(w.bulletColor) });
        bulletMesh = new THREE.Mesh(energyGeo, energyMat);
      } else if (w.category === 'shotgun') {
        gravity = 4.2;
        const pelletGeo = new THREE.SphereGeometry(0.1, 6, 6);
        const pelletMat = new THREE.MeshBasicMaterial({ color: 0xfb923c });
        bulletMesh = new THREE.Mesh(pelletGeo, pelletMat);
      } else {
        const stdGeo = new THREE.SphereGeometry(0.12, 6, 6);
        const stdMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(w.bulletColor) });
        bulletMesh = new THREE.Mesh(stdGeo, stdMat);
      }

      bulletMesh.position.copy(spawnPos);
      this.scene.add(bulletMesh);

      const speedVal = w.bulletSpeed * 0.052;
      const initialVel = fireDir.clone().multiplyScalar(speedVal);
      if (isRocket) initialVel.y += initVy;

      this.projectiles.push({
        mesh: bulletMesh,
        pos: spawnPos,
        vel: initialVel,
        radius: w.bulletRadius * 0.05,
        damage: w.damage,
        gravity,
        isRocket,
        category: w.category,
        rangeRemaining: w.range * 0.07,
        pierceCount: w.pierceCount,
        knockback: w.knockback * 0.06,
        explosiveRadius: w.explosiveRadius,
        slowEffect: w.slowEffect,
        arcChains: w.arcChains,
        isEnemy: false,
      });
    }

    if (w.currentMag <= 0) {
      this.startReload();
    }
  }

  private ejectShellCasing() {
    const pPos = this.playerMeshObj.group.position;
    const rightDir = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.playerYaw);

    const casingGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.14, 6);
    casingGeo.rotateX(Math.PI / 2);
    const casing = new THREE.Mesh(casingGeo, MaterialLibrary.brassCasingMat);

    const spawnPos = new THREE.Vector3(pPos.x, 1.45, pPos.z).add(rightDir.clone().multiplyScalar(0.4));
    casing.position.copy(spawnPos);
    this.scene.add(casing);

    const ejectSpeed = 2.8 + Math.random() * 1.5;
    this.casings.push({
      mesh: casing,
      pos: spawnPos,
      vel: new THREE.Vector3(
        rightDir.x * ejectSpeed + (Math.random() - 0.5) * 0.6,
        2.2 + Math.random() * 1.2,
        rightDir.z * ejectSpeed + (Math.random() - 0.5) * 0.6
      ),
      rotVel: new THREE.Vector3(Math.random() * 20, Math.random() * 20, Math.random() * 20),
      bounces: 0,
      lifetime: 3.5,
    });
  }

  private updateCasings(dt: number) {
    for (let i = this.casings.length - 1; i >= 0; i--) {
      const c = this.casings[i];
      c.lifetime -= dt;

      c.vel.y -= 14 * dt;
      c.pos.add(c.vel.clone().multiplyScalar(dt));

      c.mesh.rotation.x += c.rotVel.x * dt;
      c.mesh.rotation.y += c.rotVel.y * dt;
      c.mesh.rotation.z += c.rotVel.z * dt;

      if (c.pos.y <= 0.05) {
        c.pos.y = 0.05;
        c.vel.y = -c.vel.y * 0.45;
        c.vel.x *= 0.7;
        c.vel.z *= 0.7;
        c.rotVel.multiplyScalar(0.6);
        c.bounces++;
      }

      c.mesh.position.copy(c.pos);

      if (c.lifetime <= 0) {
        // Geometría del casquillo es exclusiva; el latón es material
        // compartido de MaterialLibrary y no debe destruirse.
        this.removeEffectMesh(c.mesh, MaterialLibrary.brassCasingMat);
        this.casings.splice(i, 1);
      }
    }
  }

  // --------------------------------------------------------------------------------
  // FÍSICA BALÍSTICA Y ANIMACIONES DE IMPACTO HD
  // --------------------------------------------------------------------------------

  private updateProjectiles(dt: number) {
    const pPos = this.playerMeshObj.group.position;

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];

      if (proj.gravity > 0) {
        proj.vel.y -= proj.gravity * dt;
      }

      const step = proj.vel.clone().multiplyScalar(dt);
      const prevPos = proj.pos.clone(); // origen del segmento barrido este frame
      proj.pos.add(step);
      proj.mesh.position.copy(proj.pos);
      proj.rangeRemaining -= step.length();

      if (proj.isRocket) {
        const flightLook = proj.pos.clone().add(proj.vel);
        proj.mesh.lookAt(flightLook);

        if (Math.random() < 0.8) {
          const smokeGeo = new THREE.SphereGeometry(0.25 + Math.random() * 0.2, 6, 6);
          const smokeMat = new THREE.MeshBasicMaterial({
            color: 0xd1d5db,
            transparent: true,
            opacity: 0.7,
          });
          const smoke = new THREE.Mesh(smokeGeo, smokeMat);
          smoke.position.copy(proj.pos);
          this.scene.add(smoke);

          this.particles.push({
            mesh: smoke,
            vel: new THREE.Vector3((Math.random() - 0.5) * 0.5, 0.5, (Math.random() - 0.5) * 0.5),
            alpha: 0.7,
            decay: 1.6,
          });
        }
      }

      if (proj.pos.y <= 0.15) {
        this.createGroundImpactEffect(proj.pos, proj.category, proj.isRocket);

        if (proj.explosiveRadius) {
          this.triggerExplosion3D(proj.pos, proj.explosiveRadius * 0.08, proj.damage);
        }
        this.destroyProjectile(i);
        continue;
      }

      if (proj.isEnemy) {
        const dstP = Math.hypot(proj.pos.x - pPos.x, proj.pos.z - pPos.z);
        if (dstP < 1.4) {
          this.damagePlayer(proj.damage);
          this.destroyProjectile(i);
          continue;
        }

        const dstB = Math.hypot(proj.pos.x, proj.pos.z);
        if (dstB < 5.8) {
          this.damageBase(proj.damage);
          this.destroyProjectile(i);
          continue;
        }

        if (proj.rangeRemaining <= 0) {
          this.destroyProjectile(i);
        }
        continue;
      }

      let hit = false;
      // Colisión barrida (segmento prevPos→pos vs. esfera del zombie): evita
      // que proyectiles rápidos atraviesen enemigos entre fotogramas (tunneling).
      for (let j = this.zombies.length - 1; j >= 0; j--) {
        const z = this.zombies[j];
        if (z.isDying) continue;

        const effRadius = proj.radius + z.data.radius * 0.075;
        const dist = distancePointToSegment(
          z.group.position.x, z.group.position.z,
          prevPos.x, prevPos.z,
          proj.pos.x, proj.pos.z
        );
        if (dist < effRadius) {
          hit = true;
          this.damageZombie(z, proj.damage, proj.vel);
          this.callbacks.onHitmarker?.();

          if (proj.slowEffect) {
            z.data.slowTimer = proj.slowEffect.duration;
            z.data.speed = z.data.baseSpeed * proj.slowEffect.factor;
            this.createCryoImpactEffect(z.group.position);
          }

          if (proj.explosiveRadius) {
            this.triggerExplosion3D(proj.pos, proj.explosiveRadius * 0.08, proj.damage);
            this.destroyProjectile(i);
            break;
          }

          if (proj.arcChains && proj.arcChains > 0) {
            this.triggerTeslaArc3D(z, proj.arcChains, proj.damage * 0.7);
          }

          proj.pierceCount--;
          if (proj.pierceCount <= 0) {
            this.destroyProjectile(i);
            break;
          }
        }
      }

      if (!hit && proj.rangeRemaining <= 0) {
        this.destroyProjectile(i);
      }
    }
  }

  private destroyProjectile(index: number) {
    if (index >= 0 && index < this.projectiles.length) {
      const proj = this.projectiles[index];
      // Los proyectiles crean geometrías/materiales exclusivos por disparo:
      // liberarlos aquí evita acumulación de recursos GPU en sesiones largas.
      if (proj.mesh instanceof THREE.Mesh) {
        this.removeEffectMesh(proj.mesh);
      } else {
        this.removeAndDispose(proj.mesh);
      }
      this.projectiles.splice(index, 1);
    }
  }

  private createGroundImpactEffect(pos: THREE.Vector3, cat?: Weapon['category'], isRocket?: boolean) {
    const sparkCount = isRocket ? 25 : 8;
    for (let s = 0; s < sparkCount; s++) {
      const sparkGeo = new THREE.BoxGeometry(0.06, 0.06, 0.06);
      const sparkMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
      const spark = new THREE.Mesh(sparkGeo, sparkMat);
      spark.position.copy(pos);
      this.scene.add(spark);

      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 8;
      this.particles.push({
        mesh: spark,
        vel: new THREE.Vector3(Math.cos(angle) * speed, 3 + Math.random() * 5, Math.sin(angle) * speed),
        alpha: 1.0,
        decay: 3.5,
        gravity: 14,
      });
    }

    for (let d = 0; d < 5; d++) {
      const dustGeo = new THREE.SphereGeometry(0.18 + Math.random() * 0.15, 6, 6);
      const dustMat = new THREE.MeshBasicMaterial({
        color: 0x94a3b8,
        transparent: true,
        opacity: 0.6,
      });
      const dust = new THREE.Mesh(dustGeo, dustMat);
      dust.position.set(pos.x, 0.1, pos.z);
      this.scene.add(dust);

      this.particles.push({
        mesh: dust,
        vel: new THREE.Vector3((Math.random() - 0.5) * 1.5, 0.8 + Math.random() * 1.2, (Math.random() - 0.5) * 1.5),
        alpha: 0.6,
        decay: 1.8,
      });
    }

    if (isRocket || cat === 'energy') {
      const scorchGeo = new THREE.CircleGeometry(isRocket ? 2.4 : 1.1, 12);
      scorchGeo.rotateX(-Math.PI / 2);
      const scorchMat = new THREE.MeshStandardMaterial({
        map: createPlasmaScorchTexture(),
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      });
      const scorchMesh = new THREE.Mesh(scorchGeo, scorchMat);
      scorchMesh.position.set(pos.x, 0.03, pos.z);
      this.scene.add(scorchMesh);
      this.bloodDecals.push(scorchMesh);
    }
  }

  private createCryoImpactEffect(pos: THREE.Vector3) {
    for (let c = 0; c < 12; c++) {
      const iceGeo = new THREE.OctahedronGeometry(0.15 + Math.random() * 0.1, 0);
      const iceMat = new THREE.MeshBasicMaterial({ color: 0xbae6fd });
      const ice = new THREE.Mesh(iceGeo, iceMat);
      ice.position.set(pos.x, 1.2, pos.z);
      this.scene.add(ice);

      const angle = Math.random() * Math.PI * 2;
      this.particles.push({
        mesh: ice,
        vel: new THREE.Vector3(Math.cos(angle) * 5, 2.5 + Math.random() * 3, Math.sin(angle) * 5),
        alpha: 1.0,
        decay: 2.2,
        gravity: 10,
      });
    }
  }

  private triggerExplosion3D(pos: THREE.Vector3, radius: number, maxDamage: number) {
    sound.playExplosion();
    this.addCameraShake(18);
    this.hitstop(0.04);

    const fireGeo = new THREE.SphereGeometry(radius * 0.85, 12, 12);
    const fireMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
    const fireMesh = new THREE.Mesh(fireGeo, fireMat);
    fireMesh.position.copy(pos);
    this.scene.add(fireMesh);

    this.particles.push({
      mesh: fireMesh,
      vel: new THREE.Vector3(0, 2.5, 0),
      alpha: 1.0,
      decay: 3.2,
    });

    for (let i = 0; i < 30; i++) {
      const debrisGeo = new THREE.BoxGeometry(0.25, 0.25, 0.25);
      const debrisMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
      const debris = new THREE.Mesh(debrisGeo, debrisMat);
      debris.position.copy(pos);
      this.scene.add(debris);

      const angle = Math.random() * Math.PI * 2;
      const speed = 7 + Math.random() * 15;
      this.particles.push({
        mesh: debris,
        vel: new THREE.Vector3(Math.cos(angle) * speed, 5 + Math.random() * 8, Math.sin(angle) * speed),
        alpha: 1.0,
        decay: 1.8,
        gravity: 16,
      });
    }

    for (const z of this.zombies) {
      if (z.isDying) continue;
      const dist = Math.hypot(z.group.position.x - pos.x, z.group.position.z - pos.z);
      if (dist < radius) {
        const falloff = 1 - dist / radius;
        const dmg = Math.round(maxDamage * Math.max(0.35, falloff));
        const pushDir = new THREE.Vector3(z.group.position.x - pos.x, 0, z.group.position.z - pos.z).normalize();
        this.damageZombie(z, dmg, pushDir.multiplyScalar(40));
      }
    }
  }

  private triggerTeslaArc3D(sourceZombie: ZombieInstance, chains: number, damage: number) {
    sound.playTesla();
    let current = sourceZombie;
    const hitZombies = new Set<number>([sourceZombie.data.id]);

    for (let c = 0; c < chains; c++) {
      let next: ZombieInstance | null = null;
      let minDst = 14;

      for (const other of this.zombies) {
        if (hitZombies.has(other.data.id) || other.isDying) continue;
        const d = Math.hypot(
          other.group.position.x - current.group.position.x,
          other.group.position.z - current.group.position.z
        );
        if (d < minDst) {
          minDst = d;
          next = other;
        }
      }

      if (next) {
        hitZombies.add(next.data.id);
        this.damageZombie(next, damage, new THREE.Vector3(0, 0, 0));

        const lineGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(current.group.position.x, 1.3, current.group.position.z),
          new THREE.Vector3(next.group.position.x, 1.3, next.group.position.z),
        ]);
        const lineMat = new THREE.LineBasicMaterial({ color: 0x67e8f9, linewidth: 2 });
        const line = new THREE.Line(lineGeo, lineMat);
        this.scene.add(line);

        const timeoutId = setTimeout(() => {
          this.pendingTeslaTimeouts.delete(timeoutId);
          if (this.destroyed) return;
          this.scene.remove(line);
          lineGeo.dispose();
          lineMat.dispose();
        }, 110);
        this.pendingTeslaTimeouts.add(timeoutId);

        current = next;
      } else {
        break;
      }
    }
  }

  private damageZombie(z: ZombieInstance, amount: number, vel: THREE.Vector3) {
    // Un zombi ya en animación de muerte no vuelve a recibir daño ni emite
    // efectos (evita doble recompensa/efectos si dos proyectiles o una
    // explosión lo alcanzan en el mismo frame tras morir).
    if (z.isDying || this.gameOverTriggered || this.destroyed) return;
    sound.playZombieHit();
    z.data.hp -= amount;

    const dir = vel.clone().normalize();
    z.group.position.x += dir.x * 0.45;
    z.group.position.z += dir.z * 0.45;

    this.createBloodBurst3D(z.group.position, 6);

    if (z.data.hp <= 0 && !z.isDying) {
      this.killZombie(z, vel);
    }
  }

  private killZombie(z: ZombieInstance, impactVel: THREE.Vector3) {
    sound.playZombieDeath();

    const mult = this.player.doublePointsTimer > 0 ? 2 : 1;
    this.player.coins += z.data.coinValue * mult;
    this.player.score += z.data.scoreValue * mult;
    this.player.kills++;

    if (this.bloodDecals.length > 70) {
      const old = this.bloodDecals.shift();
      // Cada mancha tiene geometría propia (radio aleatorio) y las quemaduras
      // llevan material/textura exclusivos: liberar al desalojar.
      if (old) this.removeEffectMesh(old);
    }

    const bloodGeo = new THREE.CircleGeometry(0.85 + Math.random() * 0.6, 12);
    bloodGeo.rotateX(-Math.PI / 2);
    const bloodMesh = new THREE.Mesh(bloodGeo, MaterialLibrary.bloodGlossMat);
    bloodMesh.position.set(z.group.position.x, 0.04, z.group.position.z);
    this.scene.add(bloodMesh);
    this.bloodDecals.push(bloodMesh);

    // Muerte con impulso físico estilo GTA V / Left 4 Dead
    z.isDying = true;
    z.deathTimer = 0.85;
    const impDir = impactVel.clone().normalize();
    z.deathVel = new THREE.Vector3(impDir.x * 10, 5.5, impDir.z * 10);
    z.rotVel = new THREE.Vector3((Math.random() - 0.5) * 9, 0, (Math.random() - 0.5) * 9);

    this.createBloodBurst3D(z.group.position, 14);
  }

  private createBloodBurst3D(pos: THREE.Vector3, count: number) {
    for (let i = 0; i < count; i++) {
      const dropGeo = new THREE.SphereGeometry(0.12, 6, 6);
      const drop = new THREE.Mesh(dropGeo, MaterialLibrary.bloodGlossMat);
      drop.position.set(pos.x, 1.1, pos.z);
      this.scene.add(drop);

      const angle = Math.random() * Math.PI * 2;
      const speed = 2.5 + Math.random() * 7;
      this.particles.push({
        mesh: drop,
        vel: new THREE.Vector3(Math.cos(angle) * speed, 2.5 + Math.random() * 4, Math.sin(angle) * speed),
        alpha: 1.0,
        decay: 3.0,
        gravity: 14,
      });
    }
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      if (p.gravity) {
        p.vel.y -= p.gravity * dt;
      }
      p.mesh.position.add(p.vel.clone().multiplyScalar(dt));

      if (p.mesh.position.y < 0.05) {
        p.mesh.position.y = 0.05;
        p.vel.set(0, 0, 0);
      }

      p.alpha -= p.decay * dt;
      if (p.alpha <= 0) {
        // Liberar la geometría exclusiva de la partícula al expirar. El
        // material solo se destruye si era exclusivo (no compartido).
        this.removeEffectMesh(p.mesh, p.sharedMaterial);
        this.particles.splice(i, 1);
      }
    }
  }

  private damagePlayer(amount: number) {
    // Tras la derrota no se aplica más daño (transición terminal única).
    if (this.gameOverTriggered || this.destroyed) return;
    const p = this.player;
    if (p.invulnerableTimer > 0 || p.isDashing) return;

    sound.playPlayerHurt();
    this.addCameraShake(14);
    this.hitstop(0.05);

    p.hp -= amount;
    p.invulnerableTimer = 0.45;

    if (p.hp <= 0) {
      p.hp = 0;
      this.triggerGameOver();
    }
  }

  private damageBase(amount: number) {
    if (this.gameOverTriggered || this.destroyed) return;
    const b = this.base;
    sound.playBaseHurt();
    this.addCameraShake(8);

    const effectiveArmor = 1 + (b.armorLevel - 1) * 0.2;
    const actualDamage = Math.max(1, Math.round(amount / effectiveArmor));
    b.hp -= actualDamage;

    if (b.hp <= 0) {
      b.hp = 0;
      this.triggerGameOver();
    }
  }

  /**
   * Transición terminal IDEMPOTENTE: aunque varios zombies ataquen en el mismo
   * frame o varias fuentes de daño concurrentes llamen a esta función, la
   * notificación de derrota se emite exactamente una vez y el bucle se detiene.
   */
  private triggerGameOver() {
    if (this.gameOverTriggered || this.destroyed) return;
    this.gameOverTriggered = true;
    this.isRunning = false;
    this.spinPending = false;

    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    // Soltar el puntero capturado para poder interactuar con la pantalla de derrota
    if (document.pointerLockElement === this.renderer.domElement) {
      document.exitPointerLock?.();
    }

    this.callbacks.onGameOver({
      round: this.round,
      kills: this.player.kills,
      score: this.player.score,
      coins: this.player.coins,
    });
  }

  private updateBase(dt: number) {
    const b = this.base;

    const ring1 = this.baseObj.group.getObjectByName('ring1');
    const ring2 = this.baseObj.group.getObjectByName('ring2');
    if (ring1) ring1.rotation.y += 1.8 * dt;
    if (ring2) ring2.rotation.x += 1.4 * dt;

    b.turretCooldown -= dt;
    if (b.turretCooldown <= 0 && this.zombies.length > 0) {
      let closest: ZombieInstance | null = null;
      let minDst = b.turretRange;

      for (const z of this.zombies) {
        if (z.isDying) continue;
        const dst = Math.hypot(z.group.position.x, z.group.position.z);
        if (dst < minDst) {
          minDst = dst;
          closest = z;
        }
      }

      if (closest) {
        const aimAngle = Math.atan2(closest.group.position.x, closest.group.position.z);
        this.baseObj.turretGroup.rotation.y = aimAngle;
        b.turretCooldown = 1 / b.turretFireRate;

        const fireDir = new THREE.Vector3(Math.sin(aimAngle), 0, Math.cos(aimAngle)).normalize();
        const spawnPos = new THREE.Vector3(0, 7.3, 0).add(fireDir.clone().multiplyScalar(2.2));

        const bulletGeo = new THREE.SphereGeometry(0.22, 8, 8);
        const bulletMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
        const bulletMesh = new THREE.Mesh(bulletGeo, bulletMat);
        bulletMesh.position.copy(spawnPos);
        this.scene.add(bulletMesh);

        this.projectiles.push({
          mesh: bulletMesh,
          pos: spawnPos,
          vel: fireDir.multiplyScalar(50),
          radius: 0.35,
          damage: 28 * (1 + (b.turretLevel - 1) * 0.35),
          gravity: 0,
          rangeRemaining: b.turretRange + 5,
          pierceCount: 1,
          knockback: 7,
          isEnemy: false,
        });

        sound.playRifle();
      }
    }

    this.callbacks.onBaseUpdate({ ...b });
  }

  private updateZombies(dt: number) {
    const pPos = this.playerMeshObj.group.position;
    const bPos = new THREE.Vector3(0, 0, 0);

    for (let i = this.zombies.length - 1; i >= 0; i--) {
      const z = this.zombies[i];
      const zPos = z.group.position;

      if (z.isDying && z.deathTimer !== undefined && z.deathVel && z.rotVel) {
        z.deathTimer -= dt;
        zPos.add(z.deathVel.clone().multiplyScalar(dt));
        z.deathVel.y -= 15 * dt;
        if (zPos.y < 0.2) {
          zPos.y = 0.2;
          z.deathVel.set(0, 0, 0);
        }
        z.group.rotation.x += z.rotVel.x * dt;
        z.group.rotation.z += z.rotVel.z * dt;

        if (z.deathTimer <= 0) {
          // El modelo del zombi usa geometrías/materiales compartidos de
          // MaterialLibrary + recursos propios potenciales: recorrer y liberar
          // solo los exclusivos evita fuga sin romper mallas aún en uso.
          this.removeAndDispose(z.group);
          this.zombies.splice(i, 1);
        }
        continue;
      }

      if (z.data.slowTimer > 0) {
        z.data.slowTimer -= dt;
        if (z.data.slowTimer <= 0) {
          z.data.speed = z.data.baseSpeed;
        }
      }

      z.walkCycle += dt * (z.data.speed * 0.05);
      const limbAngle = Math.sin(z.walkCycle) * 0.6;
      z.leftLeg.rotation.x = limbAngle;
      z.rightLeg.rotation.x = -limbAngle;
      z.leftArm.rotation.x = -limbAngle * 0.5 + 0.3;
      z.rightArm.rotation.x = limbAngle * 0.5 + 0.3;

      if (z.pustules) {
        const pulse = 1.0 + Math.sin(this.clock.getElapsedTime() * 6) * 0.2;
        z.pustules.scale.set(pulse, pulse, pulse);
      }

      const dstToPlayer = Math.hypot(pPos.x - zPos.x, pPos.z - zPos.z);
      const dstToBase = Math.hypot(zPos.x, zPos.z);

      const targetPos = dstToPlayer < 24 || z.data.type === 'runner' ? pPos : bPos;
      const targetDist = dstToPlayer < 24 || z.data.type === 'runner' ? dstToPlayer : dstToBase;

      const angleToTarget = Math.atan2(targetPos.x - zPos.x, targetPos.z - zPos.z);
      z.group.rotation.y = angleToTarget;

      if (z.data.type === 'spitter' && targetDist < 28 && targetDist > 8) {
        if (!z.data.spitTimer) z.data.spitTimer = 2.0;
        z.data.spitTimer -= dt;
        if (z.data.spitTimer <= 0) {
          z.data.spitTimer = 2.5;
          sound.playZombieHit();

          const spitDir = new THREE.Vector3(Math.sin(angleToTarget), 0, Math.cos(angleToTarget)).normalize();
          const spitGeo = new THREE.SphereGeometry(0.38, 10, 10);
          const spitMat = new THREE.MeshBasicMaterial({ color: 0xa3e635 });
          const spitMesh = new THREE.Mesh(spitGeo, spitMat);
          spitMesh.position.set(zPos.x, 1.9, zPos.z);
          this.scene.add(spitMesh);

          this.projectiles.push({
            mesh: spitMesh,
            pos: spitMesh.position.clone(),
            vel: new THREE.Vector3(spitDir.x * 20, 4.5, spitDir.z * 20),
            radius: 0.5,
            damage: z.data.damage * 1.2,
            gravity: 12,
            rangeRemaining: 35,
            pierceCount: 1,
            knockback: 5,
            isEnemy: true,
          });
        }
      } else {
        const moveDist = z.data.speed * 0.07 * dt;
        zPos.x += Math.sin(angleToTarget) * moveDist;
        zPos.z += Math.cos(angleToTarget) * moveDist;
      }

      // Separación entre zombis: se recorre SOLO una vez por par (j > i) y el
      // impulso se aplica simétricamente a ambos. Antes cada zombi comparaba
      // contra TODOS (O(n^2) completo, ~n*(n-1) hipótesis de distancia); ahora
      // son ~la mitad de comprobaciones con idéntico resultado físico.
      for (let j = i + 1; j < this.zombies.length; j++) {
        const other = this.zombies[j];
        if (other.isDying || z.isDying) continue;
        const otherPos = other.group.position;
        const dx = zPos.x - otherPos.x;
        const dz = zPos.z - otherPos.z;
        const dist = Math.hypot(dx, dz);
        const minDist = (z.data.radius + other.data.radius) * 0.075;
        if (dist < minDist && dist > 0) {
          const push = (minDist - dist) * 0.5;
          const ux = dx / dist;
          const uz = dz / dist;
          zPos.x += ux * push;
          zPos.z += uz * push;
          otherPos.x -= ux * push;
          otherPos.z -= uz * push;
        }
      }

      if (this.gameOverTriggered) return;

      if (dstToPlayer < 1.9 && z.data.attackTimer <= 0) {
        z.data.attackTimer = z.data.attackCooldown;
        this.damagePlayer(z.data.damage);
      }

      if (dstToBase < 6.4 && z.data.attackTimer <= 0) {
        z.data.attackTimer = z.data.attackCooldown;
        this.damageBase(z.data.damage);
      }

      if (z.data.attackTimer > 0) {
        z.data.attackTimer -= dt;
      }
    }
  }

  private updateRounds(dt: number) {
    if (this.inIntermission) {
      this.intermissionTimer -= dt;
      if (this.intermissionTimer <= 0) {
        this.startNextRound();
      }
      this.callbacks.onRoundUpdate(this.round, this.zombies.length, true);
      return;
    }

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.zombiesSpawnedThisRound < this.zombiesToSpawnThisRound) {
      this.spawnZombie3D();
      this.spawnTimer = Math.max(0.4, this.spawnInterval * Math.pow(0.92, this.round - 1));
    }

    const aliveZombies = this.zombies.filter((z) => !z.isDying);
    if (this.zombiesSpawnedThisRound >= this.zombiesToSpawnThisRound && aliveZombies.length === 0) {
      this.completeRound();
    }

    this.callbacks.onRoundUpdate(
      this.round,
      this.zombiesToSpawnThisRound - this.zombiesSpawnedThisRound + aliveZombies.length,
      false
    );
  }

  private spawnZombie3D() {
    this.zombiesSpawnedThisRound++;

    const angle = Math.random() * Math.PI * 2;
    const distance = 50 + Math.random() * 8;
    const spawnX = Math.cos(angle) * distance;
    const spawnZ = Math.sin(angle) * distance;

    let type: Zombie['type'] = 'walker';
    const rand = Math.random();

    if (this.round >= 5 && this.zombiesSpawnedThisRound === 1) {
      type = 'boss';
    } else if (this.round >= 4 && rand < 0.15) {
      type = 'brute';
    } else if (this.round >= 3 && rand < 0.3) {
      type = 'spitter';
    } else if (this.round >= 2 && rand < 0.5) {
      type = 'runner';
    }

    const hpMult = 1 + (this.round - 1) * 0.22;
    const speedMult = Math.min(1.4, 1 + (this.round - 1) * 0.04);

    let zombieData: Zombie;

    switch (type) {
      case 'runner':
        zombieData = {
          id: this.nextId++,
          type: 'runner',
          name: 'Corredor Infectado',
          x: spawnX,
          y: spawnZ,
          vx: 0,
          vy: 0,
          radius: 14,
          hp: Math.round(35 * hpMult),
          maxHp: Math.round(35 * hpMult),
          speed: 185 * speedMult,
          baseSpeed: 185 * speedMult,
          damage: 12,
          attackCooldown: 0.8,
          attackTimer: 0,
          attackRange: 20,
          scoreValue: 45,
          coinValue: 20,
          hitFlashTimer: 0,
          color: '#ef4444',
          eyeColor: '#facc15',
          isBoss: false,
          slowTimer: 0,
          burnTimer: 0,
          target: 'player',
        };
        break;

      case 'brute':
        zombieData = {
          id: this.nextId++,
          type: 'brute',
          name: 'Titán Bruto',
          x: spawnX,
          y: spawnZ,
          vx: 0,
          vy: 0,
          radius: 28,
          hp: Math.round(320 * hpMult),
          maxHp: Math.round(320 * hpMult),
          speed: 80 * speedMult,
          baseSpeed: 80 * speedMult,
          damage: 35,
          attackCooldown: 1.6,
          attackTimer: 0,
          attackRange: 38,
          scoreValue: 120,
          coinValue: 65,
          hitFlashTimer: 0,
          color: '#581c87',
          eyeColor: '#ef4444',
          isBoss: false,
          slowTimer: 0,
          burnTimer: 0,
          target: 'base',
        };
        break;

      case 'spitter':
        zombieData = {
          id: this.nextId++,
          type: 'spitter',
          name: 'Escupidor Tóxico',
          x: spawnX,
          y: spawnZ,
          vx: 0,
          vy: 0,
          radius: 17,
          hp: Math.round(65 * hpMult),
          maxHp: Math.round(65 * hpMult),
          speed: 110 * speedMult,
          baseSpeed: 110 * speedMult,
          damage: 18,
          attackCooldown: 2.0,
          attackTimer: 0,
          attackRange: 28,
          scoreValue: 70,
          coinValue: 35,
          hitFlashTimer: 0,
          color: '#15803d',
          eyeColor: '#a3e635',
          isBoss: false,
          slowTimer: 0,
          burnTimer: 0,
          target: 'base',
        };
        break;

      case 'boss':
        zombieData = {
          id: this.nextId++,
          type: 'boss',
          name: 'Gólem Abominación',
          x: spawnX,
          y: spawnZ,
          vx: 0,
          vy: 0,
          radius: 42,
          hp: Math.round(950 * hpMult),
          maxHp: Math.round(950 * hpMult),
          speed: 92 * speedMult,
          baseSpeed: 92 * speedMult,
          damage: 55,
          attackCooldown: 1.4,
          attackTimer: 0,
          attackRange: 45,
          scoreValue: 600,
          coinValue: 300,
          hitFlashTimer: 0,
          color: '#881337',
          eyeColor: '#fbbf24',
          isBoss: true,
          slowTimer: 0,
          burnTimer: 0,
          target: 'base',
        };
        break;

      default:
        zombieData = {
          id: this.nextId++,
          type: 'walker',
          name: 'Caminante Sediento',
          x: spawnX,
          y: spawnZ,
          vx: 0,
          vy: 0,
          radius: 16,
          hp: Math.round(60 * hpMult),
          maxHp: Math.round(60 * hpMult),
          speed: 105 * speedMult,
          baseSpeed: 105 * speedMult,
          damage: 14,
          attackCooldown: 1.1,
          attackTimer: 0,
          attackRange: 22,
          scoreValue: 30,
          coinValue: 15,
          hitFlashTimer: 0,
          color: '#334155',
          eyeColor: '#ef4444',
          isBoss: false,
          slowTimer: 0,
          burnTimer: 0,
          target: 'base',
        };
        break;
    }

    const { group, leftLeg, rightLeg, leftArm, rightArm, pustules } = createDetailedZombieMesh(type);
    group.position.set(spawnX, 0, spawnZ);
    this.scene.add(group);

    this.zombies.push({
      data: zombieData,
      group,
      leftLeg,
      rightLeg,
      leftArm,
      rightArm,
      pustules,
      walkCycle: Math.random() * Math.PI,
    });
  }

  private completeRound() {
    this.inIntermission = true;
    this.intermissionTimer = this.intermissionDuration;
    sound.playRoundStart();

    const bonus = 120 + this.round * 35;
    this.player.coins += bonus;
  }

  private startNextRound() {
    this.round++;
    this.inIntermission = false;
    this.zombiesSpawnedThisRound = 0;
    this.zombiesToSpawnThisRound = Math.round(10 + this.round * 4.5);
    sound.playRoundStart();
  }

  public startReload() {
    const p = this.player;
    const w = p.weapons[p.activeWeaponIndex];
    if (p.reloading || w.currentMag >= w.magazineSize) return;
    if (!w.isInfiniteReserve && w.reserveAmmo <= 0) return;

    p.reloading = true;
    p.reloadProgress = 0;
    sound.playReload();
  }

  private finishReload() {
    const p = this.player;
    const w = p.weapons[p.activeWeaponIndex];
    const needed = w.magazineSize - w.currentMag;
    if (w.isInfiniteReserve) {
      w.currentMag = w.magazineSize;
    } else {
      const added = Math.min(needed, w.reserveAmmo);
      w.currentMag += added;
      w.reserveAmmo -= added;
    }
    p.reloading = false;
    p.reloadProgress = 0;
  }

  public switchWeapon(index: number) {
    const p = this.player;
    if (index < 0 || index >= p.weapons.length || index === p.activeWeaponIndex) return;
    p.activeWeaponIndex = index;
    p.reloading = false;
    p.reloadProgress = 0;
    p.shootCooldown = 0.2;
    sound.playReload();
    this.updateEquippedWeaponModels();
  }

  public performDash() {
    const p = this.player;
    if (p.dashTimer > 0 || p.stamina < 30) return;

    p.isDashing = true;
    p.dashTimer = p.dashCooldown;
    p.stamina -= 30;
    p.invulnerableTimer = 0.28;
    sound.playDash();
  }

  private updateProximity() {
    const pPos = this.playerMeshObj.group.position;
    const dstBox = Math.hypot(pPos.x - this.mysteryBox.x, pPos.z - this.mysteryBox.y);
    this.callbacks.onNearMysteryBox(dstBox < 4.8);

    const dstWorkshop = Math.hypot(pPos.x - this.workshopLocation.x, pPos.z - this.workshopLocation.z);
    this.callbacks.onNearWorkshop(dstWorkshop < 4.8);
  }

  private updateMysteryBoxAnimation(dt: number) {
    this.mysteryBoxObj.holoGroup.rotation.y += 2.0 * dt;
    this.mysteryBoxObj.holoGroup.position.y = 2.6 + Math.sin(this.clock.getElapsedTime() * 3.5) * 0.25;
  }

  public interact() {
    if (this.destroyed || this.gameOverTriggered) return;
    const pPos = this.playerMeshObj.group.position;
    const dstBox = Math.hypot(pPos.x - this.mysteryBox.x, pPos.z - this.mysteryBox.y);
    const dstWorkshop = Math.hypot(pPos.x - this.workshopLocation.x, pPos.z - this.workshopLocation.z);

    // Resuelve ambas interacciones por proximidad: si el jugador está a rango
    // de los dos, gana el más cercano (antes E solo abría la caja).
    if (dstBox < 4.8 && dstBox <= dstWorkshop) {
      // No cobrar aquí: el modal solicitará el giro vía requestMysterySpin(),
      // que es la única operación que cobra y genera la recompensa (una vez).
      // Así se evita el doble cobro (interact + apertura de modal).
      this.callbacks.onOpenMysteryBox();
      return;
    }
    if (dstWorkshop < 4.8) {
      this.callbacks.onOpenWorkshop?.();
    }
  }

  /**
   * ÚNICA operación de giro de la Caja Misteriosa.
   * Comprueba saldo, descuenta el precio exactamente una vez, genera UNA
   * recompensa y la devuelve a la interfaz. Si no hay monedas suficientes,
   * no gira ni consume dinero. Bloquea giros concurrentes mientras la
   * animación del giro está en curso (spinPending) para impedir clics
   * dobles/rapidísimos que produzcan cobros múltiples sin recompensa.
   */
  public requestMysterySpin(): MysteryBoxDrop | null {
    if (this.destroyed || this.gameOverTriggered) return null;
    if (this.spinPending) return null; // un giro visual a la vez
    if (this.player.coins < this.mysteryBox.cost) return null;

    this.player.coins -= this.mysteryBox.cost;
    this.spinPending = true;
    sound.playCoin();
    this.syncPlayerState();

    // El drop se REGISTRA como pendiente: solo ese objeto exacto podrá
    // reclamarse después (anti doble-reclamación y anti drops fabricados).
    const drop = rollMysteryBox();
    this.pendingDrop = drop;
    return drop;
  }

  /**
   * La UI llama esto cuando la animación del giro FINALIZA y el premio ha sido
   * reclamado (applyMysteryDrop) o cuando se cancela con devolución
   * (cancelMysterySpin). No debe liberar el bloqueo mientras exista un premio
   * pendiente de reclamar.
   */
  public resolveMysterySpin() {
    if (this.pendingDrop) return; // hay un premio sin reclamar: no liberar aún
    this.spinPending = false;
  }

  /**
   * Cancela un giro cuyo premio NO llegó a reclamarse (el usuario cerró el
   * modal durante la animación o el motor fue destruido). Devuelve exactamente
   * el coste cobrado una única vez e impide reclamar ese premio después, de
   * modo que ningún pago se pierde ni se sustituye silenciosamente.
   */
  public cancelMysterySpin(cost: number) {
    if (!this.spinPending) return; // ya resuelto/cancelado: sin doble devolución
    this.spinPending = false;
    this.pendingDrop = null;
    if (!this.destroyed && cost > 0) {
      this.player.coins += cost;
      this.syncPlayerState();
    }
  }

  public getMysteryBoxCost(): number {
    return this.mysteryBox.cost;
  }

  /**
   * Premio pagado y generado por el motor que aún no ha sido reclamado.
   * La UI lo usa al cerrar el modal para aplicarlo en lugar de perderlo.
   * Solo devuelve el objeto registrado internamente: la interfaz no puede
   * fabricar drops alternativos.
   */
  public getPendingMysteryDrop(): MysteryBoxDrop | null {
    if (this.destroyed || this.gameOverTriggered) return null;
    return this.pendingDrop;
  }

  public applyMysteryDrop(drop: MysteryBoxDrop) {
    // Protección terminal equivalente a requestMysterySpin(): tras GAME_OVER o
    // destroy no se aplica ninguna recompensa (y se libera el bloqueo para no
    // dejar giros colgados).
    if (this.destroyed || this.gameOverTriggered) {
      this.spinPending = false;
      this.pendingDrop = null;
      return;
    }
    // Anti doble-reclamación: si llega un drop distinto al registrado por el
    // motor (stale/duplicado/fabricado por la UI), se ignora sin efectos.
    if (this.pendingDrop && this.pendingDrop !== drop) return;
    this.spinPending = false;
    this.pendingDrop = null;
    if (drop.type === 'weapon' && drop.weaponTemplate && drop.weaponTemplate.id) {
      const weaponInstance = createWeaponInstance(drop.weaponTemplate.id);
      const existingIdx = this.player.weapons.findIndex((w) => w.id === weaponInstance.id);

      if (existingIdx !== -1) {
        const existing = this.player.weapons[existingIdx];
        existing.reserveAmmo = existing.maxReserveAmmo;
        existing.currentMag = existing.magazineSize;
      } else {
        if (this.player.weapons.length < 4) {
          this.player.weapons.push(weaponInstance);
          this.player.activeWeaponIndex = this.player.weapons.length - 1;
        } else {
          this.player.weapons[this.player.activeWeaponIndex] = weaponInstance;
        }

        if (drop.rarity === 'legendary') {
          sound.playLegendaryDrop();
        }
      }
      this.updateEquippedWeaponModels();
    } else if (drop.type === 'heal') {
      if (drop.id === 'drop_medikit_full') {
        this.player.hp = this.player.maxHp;
      } else if (drop.id === 'drop_base_repair') {
        this.base.hp = Math.min(this.base.maxHp, this.base.hp + 400);
      } else if (drop.id === 'drop_max_ammo') {
        for (const w of this.player.weapons) {
          w.reserveAmmo = w.maxReserveAmmo;
          w.currentMag = w.magazineSize;
        }
      }
    } else if (drop.buffType === 'nuke') {
      sound.playNuke();
      this.addCameraShake(26);
      this.hitstop(0.08);

      for (const z of [...this.zombies]) {
        if (!z.isDying) {
          this.killZombie(z, new THREE.Vector3(0, 10, 0));
        }
      }
      this.player.coins += 400;
    } else if (drop.buffType === 'double_points') {
      this.player.doublePointsTimer = drop.buffDuration || 30;
    } else if (drop.buffType === 'infinite_ammo') {
      this.player.infiniteAmmoTimer = drop.buffDuration || 20;
    }
  }

  public addCameraShake(intensity: number) {
    this.cameraShake = Math.min(30, this.cameraShake + intensity);
  }

  public hitstop(durationSec: number) {
    this.hitstopTimer = durationSec;
  }

  // --------------------------------------------------------------------------------
  // ACTUALIZACIÓN DE CÁMARA (TERCERA PERSONA SOBRE EL HOMBRO, FPS 1:1, DRON)
  // --------------------------------------------------------------------------------

  private updateCamera(dt: number) {
    const pPos = this.playerMeshObj.group.position;
    const forwardVec = new THREE.Vector3(Math.sin(this.playerYaw), 0, Math.cos(this.playerYaw)).normalize();
    const rightVec = new THREE.Vector3(Math.cos(this.playerYaw), 0, -Math.sin(this.playerYaw)).normalize();

    if (this.cameraMode === 'first-person') {
      // 1. PRIMERA PERSONA (FPS HALO 4 ESTABLE Y SUAVE)
      const eyePos = new THREE.Vector3(pPos.x, 1.76, pPos.z);
      this.camera.position.copy(eyePos);

      const lookTarget = eyePos.clone().add(forwardVec.clone().multiplyScalar(20));
      lookTarget.y += Math.tan(this.playerPitch) * 20;
      this.camera.lookAt(lookTarget);

      if (this.cameraShake > 0) {
        this.camera.position.x += (Math.random() - 0.5) * this.cameraShake * 0.025;
        this.camera.position.y += (Math.random() - 0.5) * this.cameraShake * 0.025;
        this.cameraShake = Math.max(0, this.cameraShake - 35 * dt);
      }
    } else if (this.cameraMode === 'third-person') {
      // 2. TERCERA PERSONA REAL (SOBRE EL HOMBRO DERECHO Y DETRÁS DEL SPARTAN)
      const camDist = 3.3;      // 3.3 metros detrás
      const camHeight = 1.85;   // Altura de hombro táctico
      const sideOffset = this.shoulderOffsetSide; // Offset a la derecha

      const desiredCamPos = new THREE.Vector3(pPos.x, 0, pPos.z)
        .add(rightVec.clone().multiplyScalar(sideOffset))
        .sub(forwardVec.clone().multiplyScalar(camDist));
      desiredCamPos.y = pPos.y + camHeight;
      desiredCamPos.y = Math.max(0.6, desiredCamPos.y);

      const lookDist = 32.0;
      const targetLook = new THREE.Vector3(pPos.x, pPos.y + 1.6, pPos.z)
        .add(rightVec.clone().multiplyScalar(sideOffset * 0.25))
        .add(forwardVec.clone().multiplyScalar(lookDist));
      targetLook.y += Math.tan(this.playerPitch) * lookDist;

      if (this.cameraShake > 0) {
        desiredCamPos.x += (Math.random() - 0.5) * this.cameraShake * 0.04;
        desiredCamPos.y += (Math.random() - 0.5) * this.cameraShake * 0.04;
        desiredCamPos.z += (Math.random() - 0.5) * this.cameraShake * 0.04;
        this.cameraShake = Math.max(0, this.cameraShake - 38 * dt);
      }

      this.camera.position.lerp(desiredCamPos, 16 * dt);
      this.camera.lookAt(targetLook);
    } else if (this.cameraMode === 'drone') {
      // 3. CÁMARA LIBRE TIPO DRON
      let flyForward = 0;
      let flyRight = 0;
      let flyUp = 0;

      if (this.keys['w'] || this.keys['arrowup']) flyForward += 1;
      if (this.keys['s'] || this.keys['arrowdown']) flyForward -= 1;
      if (this.keys['d'] || this.keys['arrowright']) flyRight += 1; // Vuelo DERECHA
      if (this.keys['a'] || this.keys['arrowleft']) flyRight -= 1; // Vuelo IZQUIERDA
      if (this.keys['q'] || this.keys['shift']) flyUp -= 1;
      if (this.keys['e'] || this.keys[' ']) flyUp += 1;

      const forward = new THREE.Vector3(Math.sin(this.droneYaw), 0, Math.cos(this.droneYaw))
        .add(new THREE.Vector3(0, Math.sin(this.dronePitch), 0))
        .normalize();

      const right = new THREE.Vector3(Math.cos(this.droneYaw), 0, -Math.sin(this.droneYaw)).normalize();

      const moveVec = new THREE.Vector3();
      moveVec.addScaledVector(forward, flyForward);
      moveVec.addScaledVector(right, flyRight);
      moveVec.y += flyUp;

      if (moveVec.lengthSq() > 0) {
        moveVec.normalize().multiplyScalar(this.droneSpeed * dt);
        this.dronePos.add(moveVec);
      }

      this.dronePos.y = THREE.MathUtils.clamp(this.dronePos.y, 2.0, 48.0);
      this.dronePos.x = THREE.MathUtils.clamp(this.dronePos.x, -65, 65);
      this.dronePos.z = THREE.MathUtils.clamp(this.dronePos.z, -65, 65);

      this.camera.position.copy(this.dronePos);

      const droneForward = new THREE.Vector3(Math.sin(this.droneYaw), 0, Math.cos(this.droneYaw))
        .add(new THREE.Vector3(0, Math.sin(this.dronePitch), 0));
      this.droneTarget.copy(this.dronePos).add(droneForward);
      this.camera.lookAt(this.droneTarget);

      this.callbacks.onDroneTelemetry?.({
        alt: Math.round(this.dronePos.y * 10) / 10,
        x: Math.round(this.dronePos.x * 10) / 10,
        z: Math.round(this.dronePos.z * 10) / 10,
      });
    }

    // Detección de fijación de objetivo (Target Lock para la retícula HUD en tiempo real)
    let targetLocked = false;
    const camDir = new THREE.Vector3();
    this.camera.getWorldDirection(camDir);

    for (const z of this.zombies) {
      if (z.isDying) continue;
      const toZ = z.group.position.clone().sub(this.camera.position);
      const dist = toZ.length();
      if (dist < 38) {
        const dot = toZ.normalize().dot(camDir);
        if (dot > 0.982) {
          targetLocked = true;
          break;
        }
      }
    }
    this.callbacks.onTargetLock?.(targetLocked);
  }
}
