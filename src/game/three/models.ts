import * as THREE from 'three';
import {
  createHDArmorTexture,
  createHDWeaponTexture,
  createHDBaseTexture,
  createHDZombieTexture,
  createVisceralBloodTexture,
} from './textures';

/**
 * Biblioteca de materiales PBR de alta definición
 */
export class MaterialLibrary {
  // Blindaje blanco titanio compuesto con micro-trama hexagonal y marcas de combate
  public static whiteArmorMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.25,
    metalness: 0.38,
    map: createHDArmorTexture(),
  });

  // Chasis mecánico oscuro interno / titanio anodizado
  public static darkChassisMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.32,
    metalness: 0.88,
  });

  public static carbonMetalMat = MaterialLibrary.darkChassisMat;

  // Pistones hidráulicos cromados pulidos
  public static chromePistonMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.08,
    metalness: 0.98,
  });

  // Visor dorado reflectante curvado estilo Spartan
  public static spartanVisorMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.12,
    metalness: 0.96,
    emissive: 0xd97706,
    emissiveIntensity: 0.75,
  });

  // Núcleo energético circular en el pecho (Arc Reactor)
  public static redReactorMat = new THREE.MeshStandardMaterial({
    color: 0xff003b,
    emissive: 0xff0033,
    emissiveIntensity: 4.8,
    roughness: 0.1,
    metalness: 0.4,
  });

  // Indicadores LED y miras
  public static redGlowMat = new THREE.MeshBasicMaterial({
    color: 0xff1744,
  });

  public static cyanEnergyMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 3.5,
    roughness: 0.1,
    metalness: 0.5,
  });

  public static plasmaGlowMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
  });

  // Rifle táctico con textura HD de armería
  public static heavyRifleMat = new THREE.MeshStandardMaterial({
    color: 0x0b0f17,
    roughness: 0.28,
    metalness: 0.82,
    map: createHDWeaponTexture(),
  });

  // Base y búnker con textura HD de acero remachado
  public static bunkerPlateMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.35,
    metalness: 0.75,
    map: createHDBaseTexture(),
  });

  public static energyCoreMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 3.8,
    roughness: 0.1,
    metalness: 0.4,
  });

  public static mysticBoxMat = new THREE.MeshStandardMaterial({
    color: 0x1e1b4b,
    roughness: 0.25,
    metalness: 0.8,
  });

  public static goldTrimMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.18,
    metalness: 0.92,
  });

  public static brassCasingMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.2,
    metalness: 0.95,
  });

  // Zombies con texturas HD necrosadas
  public static zombieFleshWalker = new THREE.MeshStandardMaterial({
    roughness: 0.78,
    metalness: 0.1,
    map: createHDZombieTexture('walker'),
  });

  public static zombieFleshRunner = new THREE.MeshStandardMaterial({
    roughness: 0.65,
    metalness: 0.15,
    map: createHDZombieTexture('runner'),
  });

  public static zombieFleshBrute = new THREE.MeshStandardMaterial({
    roughness: 0.7,
    metalness: 0.2,
    map: createHDZombieTexture('brute'),
  });

  public static zombieFleshSpitter = new THREE.MeshStandardMaterial({
    roughness: 0.6,
    metalness: 0.18,
    map: createHDZombieTexture('spitter'),
  });

  public static zombiePustuleMat = new THREE.MeshStandardMaterial({
    color: 0x84cc16,
    emissive: 0x4d7c0f,
    emissiveIntensity: 3.2,
    roughness: 0.2,
  });

  public static eyeGlowRed = new THREE.MeshBasicMaterial({ color: 0xff0033 });
  public static eyeGlowYellow = new THREE.MeshBasicMaterial({ color: 0xffdd00 });
  public static eyeGlowGreen = new THREE.MeshBasicMaterial({ color: 0x44ff44 });

  public static bloodGlossMat = new THREE.MeshStandardMaterial({
    color: 0x770000,
    map: createVisceralBloodTexture(),
    roughness: 0.12,
    metalness: 0.2,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
  });
}

/**
 * Constructor del Robot Humanoide Suavizado y Esculpido (Halo 4 Spartan Cyborg)
 * - Geometrías bicónicas y facetadas suaves en lugar de simples cubos o esferas básicas
 * - Proporciones anatómicas heroicas
 * - El arma está empuñada directamente en la mano derecha con agarre a dos manos
 */
export function createPlayerMesh(): {
  group: THREE.Group;
  torsoGroup: THREE.Group;
  headGroup: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftKnee: THREE.Group;
  rightKnee: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  rightForearm: THREE.Group;
  weaponMount: THREE.Group;
  magMesh: THREE.Mesh;
  muzzleFlashMesh: THREE.Mesh;
  thrusterFlames: THREE.Group;
  laserDot: THREE.Mesh;
} {
  const group = new THREE.Group();

  // ---------------------------------------------------------
  // 1. PELVIS Y CHASSIS INFERIOR ESCULPIDO
  // ---------------------------------------------------------
  const pelvisGroup = new THREE.Group();
  pelvisGroup.position.y = 0.95;

  // Centro de cadera cónico y estilizado
  const hipHubGeo = new THREE.CylinderGeometry(0.22, 0.18, 0.24, 16);
  const hipHub = new THREE.Mesh(hipHubGeo, MaterialLibrary.darkChassisMat);
  pelvisGroup.add(hipHub);

  // Guarda pélvica de blindaje angular suave
  const hipArmorGeo = new THREE.CylinderGeometry(0.32, 0.24, 0.22, 8);
  hipArmorGeo.rotateY(Math.PI / 8);
  const hipArmor = new THREE.Mesh(hipArmorGeo, MaterialLibrary.whiteArmorMat);
  hipArmor.position.set(0, 0.04, 0);
  hipArmor.castShadow = true;
  pelvisGroup.add(hipArmor);

  group.add(pelvisGroup);

  // ---------------------------------------------------------
  // 2. TORSO ATLETICO ESCULPIDO (PECHERA MJOLNIR / PROMÉTEA)
  // ---------------------------------------------------------
  const torsoGroup = new THREE.Group();
  torsoGroup.position.set(0, 1.05, 0);

  // Columna vertebral y actuadores cilíndricos pulidos
  const spineGeo = new THREE.CylinderGeometry(0.12, 0.15, 0.34, 12);
  const spine = new THREE.Mesh(spineGeo, MaterialLibrary.darkChassisMat);
  spine.position.set(0, 0.14, -0.04);
  torsoGroup.add(spine);

  // Pechera angular facetada (no cúbica) con biseles aerodinámicos
  const chestArmorGeo = new THREE.CylinderGeometry(0.38, 0.28, 0.54, 8);
  chestArmorGeo.rotateY(Math.PI / 8);
  const chestArmor = new THREE.Mesh(chestArmorGeo, MaterialLibrary.whiteArmorMat);
  chestArmor.position.set(0, 0.44, 0.04);
  chestArmor.castShadow = true;
  chestArmor.receiveShadow = true;
  torsoGroup.add(chestArmor);

  // Placas pectorales angulares esculpidas
  const pecGeo = new THREE.CylinderGeometry(0.18, 0.14, 0.22, 6);
  pecGeo.rotateX(Math.PI / 2);

  const pecL = new THREE.Mesh(pecGeo, MaterialLibrary.whiteArmorMat);
  pecL.position.set(-0.16, 0.5, 0.2);
  pecL.rotation.set(0.1, -0.2, 0);
  pecL.castShadow = true;
  torsoGroup.add(pecL);

  const pecR = new THREE.Mesh(pecGeo, MaterialLibrary.whiteArmorMat);
  pecR.position.set(0.16, 0.5, 0.2);
  pecR.rotation.set(0.1, 0.2, 0);
  pecR.castShadow = true;
  torsoGroup.add(pecR);

  // Núcleo energético circular en el pecho (Arc Reactor / Forerunner Core)
  const reactorHousing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.13, 0.08, 16),
    MaterialLibrary.darkChassisMat
  );
  reactorHousing.rotateX(Math.PI / 2);
  reactorHousing.position.set(0, 0.46, 0.26);
  torsoGroup.add(reactorHousing);

  const reactorCore = new THREE.Mesh(
    new THREE.CircleGeometry(0.09, 16),
    MaterialLibrary.redReactorMat
  );
  reactorCore.position.set(0, 0.46, 0.305);
  torsoGroup.add(reactorCore);

  // ---------------------------------------------------------
  // 3. CASCO SPARTAN AERODINÁMICO CON VISOR CURVADO DORADO
  // ---------------------------------------------------------
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.88, 0.04);

  // Cuello mecánico
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.14, 12), MaterialLibrary.darkChassisMat);
  neck.position.y = -0.06;
  headGroup.add(neck);

  // Cúpula del casco estilizada con bordes suaves
  const helmetDomeGeo = new THREE.CylinderGeometry(0.16, 0.18, 0.32, 12);
  const helmetDome = new THREE.Mesh(helmetDomeGeo, MaterialLibrary.whiteArmorMat);
  helmetDome.position.set(0, 0.12, 0);
  helmetDome.castShadow = true;
  headGroup.add(helmetDome);

  // Mandíbula y mentón cónico táctico
  const chinGeo = new THREE.ConeGeometry(0.16, 0.22, 6);
  chinGeo.rotateX(-Math.PI / 1.5);
  const chin = new THREE.Mesh(chinGeo, MaterialLibrary.whiteArmorMat);
  chin.position.set(0, 0.02, 0.12);
  headGroup.add(chin);

  // Visor dorado icónico curvado reflectante (no un simple cubo)
  const visorGeo = new THREE.CylinderGeometry(0.17, 0.17, 0.14, 16, 1, false, -Math.PI * 0.4, Math.PI * 0.8);
  const visor = new THREE.Mesh(visorGeo, MaterialLibrary.spartanVisorMat);
  visor.position.set(0, 0.14, 0.04);
  headGroup.add(visor);

  // Sensor auricular con LED rojo táctico
  const earPod = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 0.08, 12),
    MaterialLibrary.darkChassisMat
  );
  earPod.rotateZ(Math.PI / 2);
  earPod.position.set(-0.19, 0.13, -0.02);
  headGroup.add(earPod);

  const earLight = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), MaterialLibrary.redGlowMat);
  earLight.position.set(-0.24, 0.13, -0.02);
  headGroup.add(earLight);

  torsoGroup.add(headGroup);

  // ---------------------------------------------------------
  // 4. THRUSTER PACK DORSAL AERODINÁMICO
  // ---------------------------------------------------------
  const thrusters = new THREE.Group();
  thrusters.position.set(0, 0.52, -0.22);

  const packBaseGeo = new THREE.CylinderGeometry(0.24, 0.2, 0.32, 8);
  packBaseGeo.rotateY(Math.PI / 8);
  const packBase = new THREE.Mesh(packBaseGeo, MaterialLibrary.darkChassisMat);
  packBase.castShadow = true;
  thrusters.add(packBase);

  // Toberas de escape cromadas
  const nozzleGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.18, 12);
  nozzleGeo.rotateX(Math.PI / 2);

  const nozL = new THREE.Mesh(nozzleGeo, MaterialLibrary.chromePistonMat);
  nozL.position.set(-0.13, 0.05, -0.08);
  thrusters.add(nozL);

  const nozR = new THREE.Mesh(nozzleGeo, MaterialLibrary.chromePistonMat);
  nozR.position.set(0.13, 0.05, -0.08);
  thrusters.add(nozR);

  // Llamas de propulsión azul cyan
  const thrusterFlames = new THREE.Group();
  thrusterFlames.position.set(0, 0.05, -0.18);

  const flameGeo = new THREE.ConeGeometry(0.07, 0.45, 8);
  flameGeo.rotateX(-Math.PI / 2);
  const flameMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

  const flameL = new THREE.Mesh(flameGeo, flameMat);
  flameL.position.set(-0.13, 0, 0);
  thrusterFlames.add(flameL);

  const flameR = new THREE.Mesh(flameGeo, flameMat);
  flameR.position.set(0.13, 0, 0);
  thrusterFlames.add(flameR);

  thrusterFlames.scale.set(0.2, 0.2, 0.2);
  thrusters.add(thrusterFlames);
  torsoGroup.add(thrusters);

  // ---------------------------------------------------------
  // 5. BRAZOS ESCULPIDOS Y RIFLE SOSTENIDO FIRMEMENTE
  // ---------------------------------------------------------
  // Brazo Derecho
  const rightArm = new THREE.Group();
  rightArm.position.set(0.42, 0.62, 0);

  // Hombrera aerodinámica curvada
  const rightShoulderGeo = new THREE.CylinderGeometry(0.16, 0.12, 0.26, 8);
  rightShoulderGeo.rotateZ(-0.25);
  const rightShoulder = new THREE.Mesh(rightShoulderGeo, MaterialLibrary.whiteArmorMat);
  rightShoulder.position.set(0.06, 0.02, 0);
  rightShoulder.castShadow = true;
  rightArm.add(rightShoulder);

  // Bíceps moldeado
  const rightBicepGeo = new THREE.CylinderGeometry(0.09, 0.075, 0.32, 12);
  const rightBicep = new THREE.Mesh(rightBicepGeo, MaterialLibrary.whiteArmorMat);
  rightBicep.position.set(0, -0.18, 0);
  rightBicep.castShadow = true;
  rightArm.add(rightBicep);

  // Antebrazo derecho
  const rightForearm = new THREE.Group();
  rightForearm.position.set(0, -0.34, 0);

  const forearmMeshRGeo = new THREE.CylinderGeometry(0.09, 0.07, 0.36, 10);
  forearmMeshRGeo.rotateX(0.55);
  const forearmMeshR = new THREE.Mesh(forearmMeshRGeo, MaterialLibrary.whiteArmorMat);
  forearmMeshR.position.set(-0.06, -0.1, 0.15);
  forearmMeshR.castShadow = true;
  rightForearm.add(forearmMeshR);

  // Mano biomecánica derecha
  const rightHand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.05, 0.12, 10),
    MaterialLibrary.darkChassisMat
  );
  rightHand.position.set(-0.12, -0.18, 0.3);
  rightHand.rotation.set(0.4, -0.2, 0);
  rightForearm.add(rightHand);

  // ---------------------------------------------------------
  // EL ARMA ESTÁ DIRECTAMENTE MONTADA EN LA MANO DERECHA
  // ---------------------------------------------------------
  const weaponMount = new THREE.Group();
  weaponMount.position.set(0, 0.05, 0.15);

  const magGeo = new THREE.BoxGeometry(0.08, 0.32, 0.18);
  const magMesh = new THREE.Mesh(magGeo, MaterialLibrary.darkChassisMat);
  magMesh.position.set(0, -0.19, -0.08);

  const flashGeo = new THREE.OctahedronGeometry(0.18, 0);
  const flashMat = new THREE.MeshBasicMaterial({ color: 0xffedd5, transparent: true, opacity: 0 });
  const muzzleFlashMesh = new THREE.Mesh(flashGeo, flashMat);

  rightHand.add(weaponMount);
  rightArm.add(rightForearm);
  torsoGroup.add(rightArm);

  // Brazo Izquierdo (Mano de soporte en el guardamanos)
  const leftArm = new THREE.Group();
  leftArm.position.set(-0.42, 0.62, 0);

  const leftShoulderGeo = new THREE.CylinderGeometry(0.16, 0.12, 0.26, 8);
  leftShoulderGeo.rotateZ(0.25);
  const leftShoulder = new THREE.Mesh(leftShoulderGeo, MaterialLibrary.whiteArmorMat);
  leftShoulder.position.set(-0.06, 0.02, 0);
  leftShoulder.castShadow = true;
  leftArm.add(leftShoulder);

  const leftBicep = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.075, 0.32, 12),
    MaterialLibrary.whiteArmorMat
  );
  leftBicep.position.set(0, -0.18, 0);
  leftBicep.castShadow = true;
  leftArm.add(leftBicep);

  const leftForearm = new THREE.Group();
  leftForearm.position.set(0, -0.34, 0);

  const forearmMeshLGeo = new THREE.CylinderGeometry(0.09, 0.07, 0.42, 10);
  const forearmMeshL = new THREE.Mesh(forearmMeshLGeo, MaterialLibrary.whiteArmorMat);
  forearmMeshL.position.set(0.16, -0.08, 0.2);
  forearmMeshL.rotation.set(0.65, 0.38, -0.2);
  forearmMeshL.castShadow = true;
  leftForearm.add(forearmMeshL);

  const leftHand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.05, 0.12, 10),
    MaterialLibrary.darkChassisMat
  );
  leftHand.position.set(0.26, -0.15, 0.42);
  leftForearm.add(leftHand);

  leftArm.add(leftForearm);
  torsoGroup.add(leftArm);

  group.add(torsoGroup);

  // ---------------------------------------------------------
  // 6. PIERNAS ATLETICAS ARTICULADAS (CON RODILLAS SUAVES Y PISTONES)
  // ---------------------------------------------------------
  const createArticulatedLeg = (isLeft: boolean) => {
    const legRoot = new THREE.Group();
    const sign = isLeft ? -1 : 1;
    legRoot.position.set(sign * 0.22, 0.92, 0);

    // Muslo superior anatómico
    const thighArmorGeo = new THREE.CylinderGeometry(0.15, 0.11, 0.48, 12);
    const thighArmor = new THREE.Mesh(thighArmorGeo, MaterialLibrary.whiteArmorMat);
    thighArmor.position.set(0, -0.24, 0.02);
    thighArmor.castShadow = true;
    legRoot.add(thighArmor);

    // Pistón cromado
    const thighPiston = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.4, 8),
      MaterialLibrary.chromePistonMat
    );
    thighPiston.position.set(sign * 0.06, -0.24, -0.04);
    legRoot.add(thighPiston);

    // Articulación de Rodilla cilíndrica suave
    const kneeJoint = new THREE.Group();
    kneeJoint.position.set(0, -0.48, 0.02);

    const kneeDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.2, 12),
      MaterialLibrary.darkChassisMat
    );
    kneeDisc.rotateZ(Math.PI / 2);
    kneeJoint.add(kneeDisc);

    // Rodillera protectora biselada
    const kneeGuardGeo = new THREE.CylinderGeometry(0.1, 0.08, 0.14, 8);
    const kneeGuard = new THREE.Mesh(kneeGuardGeo, MaterialLibrary.whiteArmorMat);
    kneeGuard.position.set(0, 0, 0.08);
    kneeJoint.add(kneeGuard);

    // Espinilla y pantorrilla ahusada
    const shinArmorGeo = new THREE.CylinderGeometry(0.12, 0.09, 0.48, 10);
    const shinArmor = new THREE.Mesh(shinArmorGeo, MaterialLibrary.whiteArmorMat);
    shinArmor.position.set(0, -0.26, 0.04);
    shinArmor.castShadow = true;
    kneeJoint.add(shinArmor);

    const shinPiston = new THREE.Mesh(
      new THREE.CylinderGeometry(0.028, 0.028, 0.42, 8),
      MaterialLibrary.chromePistonMat
    );
    shinPiston.position.set(sign * -0.06, -0.26, -0.04);
    kneeJoint.add(shinPiston);

    // Bota táctica perfilada
    const footGeo = new THREE.BoxGeometry(0.13, 0.1, 0.32);
    const foot = new THREE.Mesh(footGeo, MaterialLibrary.darkChassisMat);
    foot.position.set(0, -0.52, 0.08);
    kneeJoint.add(foot);

    legRoot.add(kneeJoint);
    return { legRoot, kneeJoint };
  };

  const leftLegData = createArticulatedLeg(true);
  const rightLegData = createArticulatedLeg(false);

  group.add(leftLegData.legRoot);
  group.add(rightLegData.legRoot);

  // Punto láser rojo táctico
  const laserGeo = new THREE.SphereGeometry(0.08, 8, 8);
  const laserDot = new THREE.Mesh(laserGeo, MaterialLibrary.redGlowMat);
  laserDot.visible = true;

  return {
    group,
    torsoGroup,
    headGroup,
    leftLeg: leftLegData.legRoot,
    rightLeg: rightLegData.legRoot,
    leftKnee: leftLegData.kneeJoint,
    rightKnee: rightLegData.kneeJoint,
    leftArm,
    rightArm,
    rightForearm,
    weaponMount,
    magMesh,
    muzzleFlashMesh,
    thrusterFlames,
    laserDot,
  };
}

/**
 * Constructor de Modelo de Arma en Primera Persona (Halo 4 Viewmodel)
 */
export function createFirstPersonViewModel(): {
  group: THREE.Group;
  gunMesh: THREE.Group;
  muzzleFlash: THREE.Mesh;
  ammoScreen: THREE.Mesh;
} {
  const group = new THREE.Group();
  group.position.set(0.32, -0.28, -0.58);

  const gunMesh = new THREE.Group();

  // Pantalla digital de munición holográfica
  const screenGeo = new THREE.BoxGeometry(0.09, 0.08, 0.16);
  const screenMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    emissive: 0x38bdf8,
    emissiveIntensity: 2.8,
  });
  const ammoScreen = new THREE.Mesh(screenGeo, screenMat);
  ammoScreen.position.set(0, 0.14, -0.12);
  ammoScreen.rotation.x = -0.35;
  ammoScreen.visible = false;
  group.add(ammoScreen);

  // Guanteletes blindados Spartan en primera persona
  const gauntletR = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.065, 0.28, 10),
    MaterialLibrary.whiteArmorMat
  );
  gauntletR.position.set(0.12, -0.16, -0.22);
  gauntletR.rotation.set(0.3, -0.1, 0);
  group.add(gauntletR);

  const gauntletL = new THREE.Mesh(
    new THREE.CylinderGeometry(0.075, 0.06, 0.24, 10),
    MaterialLibrary.whiteArmorMat
  );
  gauntletL.position.set(-0.16, -0.14, 0.15);
  gauntletL.rotation.set(0.4, 0.3, -0.2);
  group.add(gauntletL);

  const flashGeo = new THREE.OctahedronGeometry(0.2, 0);
  const flashMat = new THREE.MeshBasicMaterial({ color: 0xffedd5, transparent: true, opacity: 0 });
  const muzzleFlash = new THREE.Mesh(flashGeo, flashMat);
  group.add(muzzleFlash);

  group.add(gunMesh);
  return { group, gunMesh, muzzleFlash, ammoScreen };
}

/**
 * Constructor de Zombies 3D de Alta Definición
 */
export function createDetailedZombieMesh(type: string): {
  group: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  pustules?: THREE.Group;
} {
  const group = new THREE.Group();

  let skinMat = MaterialLibrary.zombieFleshWalker;
  let eyeMat = MaterialLibrary.eyeGlowRed;
  let scale = 1.0;

  if (type === 'runner') {
    skinMat = MaterialLibrary.zombieFleshRunner;
    eyeMat = MaterialLibrary.eyeGlowYellow;
    scale = 0.95;
  } else if (type === 'brute') {
    skinMat = MaterialLibrary.zombieFleshBrute;
    eyeMat = MaterialLibrary.eyeGlowRed;
    scale = 1.65;
  } else if (type === 'spitter') {
    skinMat = MaterialLibrary.zombieFleshSpitter;
    eyeMat = MaterialLibrary.eyeGlowGreen;
    scale = 1.1;
  } else if (type === 'boss') {
    skinMat = MaterialLibrary.zombieFleshBrute;
    eyeMat = MaterialLibrary.eyeGlowYellow;
    scale = 2.4;
  }

  const pelvisGeo = new THREE.CylinderGeometry(0.28 * scale, 0.24 * scale, 0.3 * scale, 12);
  const pelvis = new THREE.Mesh(pelvisGeo, MaterialLibrary.darkChassisMat);
  pelvis.position.y = 0.95 * scale;
  pelvis.castShadow = true;
  group.add(pelvis);

  const torsoGeo = new THREE.CylinderGeometry(0.36 * scale, 0.28 * scale, 0.8 * scale, 12);
  const torso = new THREE.Mesh(torsoGeo, skinMat);
  torso.position.set(0, 1.45 * scale, 0.08 * scale);
  torso.rotation.x = 0.22;
  torso.castShadow = true;
  torso.receiveShadow = true;
  group.add(torso);

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.95 * scale, 0.2 * scale);
  headGroup.rotation.x = 0.15;

  const skullGeo = new THREE.SphereGeometry(0.24 * scale, 12, 12);
  const skull = new THREE.Mesh(skullGeo, skinMat);
  skull.castShadow = true;
  headGroup.add(skull);

  const jawGeo = new THREE.ConeGeometry(0.18 * scale, 0.22 * scale, 6);
  jawGeo.rotateX(-Math.PI / 1.6);
  const jaw = new THREE.Mesh(jawGeo, skinMat);
  jaw.position.set(0, -0.1 * scale, 0.15 * scale);
  headGroup.add(jaw);

  const eyeGeo = new THREE.SphereGeometry(0.055 * scale, 8, 8);
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.09 * scale, 0.04 * scale, 0.22 * scale);
  headGroup.add(leftEye);

  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(0.09 * scale, 0.04 * scale, 0.22 * scale);
  headGroup.add(rightEye);

  group.add(headGroup);

  let pustules: THREE.Group | undefined;
  if (type === 'spitter' || type === 'boss') {
    pustules = new THREE.Group();
    const pustGeo = new THREE.SphereGeometry(0.18 * scale, 10, 10);
    const p1 = new THREE.Mesh(pustGeo, MaterialLibrary.zombiePustuleMat);
    p1.position.set(-0.25 * scale, 1.6 * scale, -0.15 * scale);
    pustules.add(p1);

    const p2 = new THREE.Mesh(pustGeo, MaterialLibrary.zombiePustuleMat);
    p2.position.set(0.28 * scale, 1.4 * scale, 0.2 * scale);
    pustules.add(p2);

    group.add(pustules);
  }

  const legGeo = new THREE.CylinderGeometry(0.13 * scale, 0.1 * scale, 0.95 * scale, 10);
  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.22 * scale, 0.95 * scale, 0);
  const leftLegMesh = new THREE.Mesh(legGeo, skinMat);
  leftLegMesh.position.y = -0.47 * scale;
  leftLegMesh.castShadow = true;
  leftLeg.add(leftLegMesh);
  group.add(leftLeg);

  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.22 * scale, 0.95 * scale, 0);
  const rightLegMesh = new THREE.Mesh(legGeo, skinMat);
  rightLegMesh.position.y = -0.47 * scale;
  rightLegMesh.castShadow = true;
  rightLeg.add(rightLegMesh);
  group.add(rightLeg);

  const armGeo = new THREE.CylinderGeometry(0.1 * scale, 0.075 * scale, 0.9 * scale, 10);
  const leftArm = new THREE.Group();
  leftArm.position.set(-0.45 * scale, 1.7 * scale, 0.1 * scale);
  const leftArmMesh = new THREE.Mesh(armGeo, skinMat);
  leftArmMesh.position.set(0, -0.45 * scale, 0.3 * scale);
  leftArmMesh.rotation.x = 0.75;
  leftArmMesh.castShadow = true;
  leftArm.add(leftArmMesh);
  group.add(leftArm);

  const rightArm = new THREE.Group();
  rightArm.position.set(0.45 * scale, 1.7 * scale, 0.1 * scale);
  const rightArmMesh = new THREE.Mesh(armGeo, skinMat);
  rightArmMesh.position.set(0, -0.45 * scale, 0.3 * scale);
  rightArmMesh.rotation.x = 0.75;
  rightArmMesh.castShadow = true;
  rightArm.add(rightArmMesh);
  group.add(rightArm);

  return {
    group,
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
    pustules,
  };
}

/**
 * Constructor de la Base y Búnker de Defensa
 */
export function createBaseMesh(): {
  group: THREE.Group;
  turretGroup: THREE.Group;
  coreMesh: THREE.Mesh;
} {
  const group = new THREE.Group();

  const baseGeo = new THREE.CylinderGeometry(5.8, 6.4, 1.8, 16);
  const baseMesh = new THREE.Mesh(baseGeo, MaterialLibrary.bunkerPlateMat);
  baseMesh.position.y = 0.9;
  baseMesh.receiveShadow = true;
  baseMesh.castShadow = true;
  group.add(baseMesh);

  const wallGeo = new THREE.RingGeometry(4.8, 5.8, 16);
  wallGeo.rotateX(-Math.PI / 2);
  const wallMesh = new THREE.Mesh(wallGeo, MaterialLibrary.darkChassisMat);
  wallMesh.position.y = 1.82;
  group.add(wallMesh);

  const ringGeo = new THREE.TorusGeometry(2.4, 0.16, 12, 32);
  const ringMat = MaterialLibrary.chromePistonMat;
  const ring1 = new THREE.Mesh(ringGeo, ringMat);
  ring1.position.y = 3.2;
  ring1.rotation.x = Math.PI / 3;
  ring1.name = 'ring1';
  group.add(ring1);

  const ring2 = new THREE.Mesh(ringGeo, ringMat);
  ring2.position.y = 3.2;
  ring2.rotation.y = Math.PI / 4;
  ring2.name = 'ring2';
  group.add(ring2);

  const coreGeo = new THREE.IcosahedronGeometry(1.4, 2);
  const coreMesh = new THREE.Mesh(coreGeo, MaterialLibrary.energyCoreMat);
  coreMesh.position.y = 3.2;
  coreMesh.name = 'energyCore';
  group.add(coreMesh);

  const domeGeo = new THREE.SphereGeometry(2.8, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  const domeMesh = new THREE.Mesh(domeGeo, MaterialLibrary.bunkerPlateMat);
  domeMesh.position.y = 4.4;
  domeMesh.castShadow = true;
  group.add(domeMesh);

  const turretGroup = new THREE.Group();
  turretGroup.position.set(0, 7.2, 0);

  const turretBaseGeo = new THREE.CylinderGeometry(0.8, 1.1, 0.7, 16);
  const turretBase = new THREE.Mesh(turretBaseGeo, MaterialLibrary.darkChassisMat);
  turretGroup.add(turretBase);

  const turretHeadGeo = new THREE.BoxGeometry(1.1, 0.75, 1.4);
  const turretHead = new THREE.Mesh(turretHeadGeo, MaterialLibrary.bunkerPlateMat);
  turretHead.position.set(0, 0.45, 0);
  turretHead.castShadow = true;
  turretGroup.add(turretHead);

  const barrelGeo = new THREE.CylinderGeometry(0.11, 0.11, 1.8, 12);
  barrelGeo.rotateX(Math.PI / 2);

  const barrelL = new THREE.Mesh(barrelGeo, MaterialLibrary.chromePistonMat);
  barrelL.position.set(-0.28, 0.45, 1.2);
  turretGroup.add(barrelL);

  const barrelR = new THREE.Mesh(barrelGeo, MaterialLibrary.chromePistonMat);
  barrelR.position.set(0.28, 0.45, 1.2);
  turretGroup.add(barrelR);

  group.add(turretGroup);

  return { group, turretGroup, coreMesh };
}

/**
 * Constructor de la Caja Misteriosa 3D
 */
export function createMysteryBoxMesh(): {
  group: THREE.Group;
  holoGroup: THREE.Group;
  lightBeam: THREE.Mesh;
} {
  const group = new THREE.Group();

  const bodyGeo = new THREE.BoxGeometry(2.6, 1.3, 1.6);
  const body = new THREE.Mesh(bodyGeo, MaterialLibrary.mysticBoxMat);
  body.position.y = 0.65;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const trimGeo = new THREE.BoxGeometry(2.7, 0.12, 1.7);
  const trim1 = new THREE.Mesh(trimGeo, MaterialLibrary.goldTrimMat);
  trim1.position.y = 0.65;
  group.add(trim1);

  const lockGeo = new THREE.BoxGeometry(0.35, 0.45, 0.18);
  const lock = new THREE.Mesh(lockGeo, MaterialLibrary.goldTrimMat);
  lock.position.set(0, 0.65, 0.85);
  group.add(lock);

  const beamGeo = new THREE.CylinderGeometry(1.0, 2.2, 18, 16, 1, true);
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.22,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const lightBeam = new THREE.Mesh(beamGeo, beamMat);
  lightBeam.position.y = 9;
  group.add(lightBeam);

  const holoGroup = new THREE.Group();
  holoGroup.position.set(0, 2.6, 0);

  const torusGeo = new THREE.TorusGeometry(0.45, 0.09, 10, 24, Math.PI * 1.5);
  const questionUpper = new THREE.Mesh(torusGeo, MaterialLibrary.goldTrimMat);
  questionUpper.rotation.z = Math.PI / 4;
  holoGroup.add(questionUpper);

  const dotGeo = new THREE.SphereGeometry(0.11, 10, 10);
  const dot = new THREE.Mesh(dotGeo, MaterialLibrary.goldTrimMat);
  dot.position.y = -0.6;
  holoGroup.add(dot);

  group.add(holoGroup);

  return { group, holoGroup, lightBeam };
}

/**
 * Constructor del Taller en 3D
 */
export function createWorkshopMesh(): THREE.Group {
  const group = new THREE.Group();

  const benchGeo = new THREE.BoxGeometry(3.0, 1.1, 1.6);
  const bench = new THREE.Mesh(benchGeo, MaterialLibrary.darkChassisMat);
  bench.position.y = 0.55;
  bench.castShadow = true;
  bench.receiveShadow = true;
  group.add(bench);

  const monitorGeo = new THREE.BoxGeometry(1.6, 0.9, 0.1);
  const monitorMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    emissive: 0x0284c7,
    emissiveIntensity: 2.2,
    roughness: 0.2,
  });
  const monitor = new THREE.Mesh(monitorGeo, monitorMat);
  monitor.position.set(0, 1.65, -0.4);
  monitor.rotation.x = -0.22;
  group.add(monitor);

  return group;
}

/**
 * Postes de luz y proyectores volumétricos
 */
export function createPerimeterProps(): THREE.Group {
  const group = new THREE.Group();

  const lampPositions = [
    [-28, -28],
    [28, -28],
    [-28, 28],
    [28, 28],
    [0, -42],
    [0, 42],
    [-42, 0],
    [42, 0],
  ];

  const poleGeo = new THREE.CylinderGeometry(0.2, 0.25, 11, 10);
  const headGeo = new THREE.BoxGeometry(1.0, 0.5, 1.2);
  const bulbMat = new THREE.MeshStandardMaterial({
    color: 0xffedd5,
    emissive: 0xfdba74,
    emissiveIntensity: 3.5,
  });

  lampPositions.forEach(([x, z]) => {
    const lampPost = new THREE.Group();
    lampPost.position.set(x, 0, z);

    const pole = new THREE.Mesh(poleGeo, MaterialLibrary.darkChassisMat);
    pole.position.y = 5.5;
    pole.castShadow = true;
    lampPost.add(pole);

    const head = new THREE.Mesh(headGeo, MaterialLibrary.bunkerPlateMat);
    head.position.set(0, 11, 0.4);
    lampPost.add(head);

    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 10), bulbMat);
    bulb.position.set(0, 10.7, 0.5);
    lampPost.add(bulb);

    const coneGeo = new THREE.ConeGeometry(8, 12, 16, 1, true);
    coneGeo.rotateX(Math.PI);
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0xffedd5,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const cone = new THREE.Mesh(coneGeo, coneMat);
    cone.position.set(0, 5, 0.5);
    lampPost.add(cone);

    group.add(lampPost);
  });

  return group;
}
