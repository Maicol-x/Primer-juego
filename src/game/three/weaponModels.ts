import * as THREE from 'three';
import { MaterialLibrary } from './models';

/**
 * Modelos 3D de Armas Ultra-Detalladas y 100% Distintivas
 * Cada arma tiene una silueta, escala, geometría y materiales completamente únicos:
 * - Lanzacohetes RPG-7: Cañón de hombro masivo verde oliva con ojiva cónica gigante visible y tobera de escape
 * - Minigun Vulcan: Clúster de 6 cañones Gatling rotativos de acero con tambor de munición y cinta de balas
 * - Escopeta SPAS-12: Doble cañón con corredera acanalada, cartuchos de calibre 12 visibles y escudo térmico
 * - Pistola M9 / Magnum: Pistola compacta con corredera estriada y módulo láser
 * - Fusil M4A1: Fusil de asalto militar con cargador curvado, riel Picatinny y mira óptica ACOG
 * - Subfusil Kriss Vector: Cajón Super-V angular con cargador extendido y empuñadura táctica
 * - Rayo Cósmico Z-900: Cañón de plasma alienígena con aletas curvadas y núcleo de energía esmeralda
 * - Fusil Tesla Arc Storm: Puntas de electrodo bifurcadas con bobinas de inducción eléctrica azul
 * - Cañón Criogénico: Doble tanque de nitrógeno líquido con boquilla de escarcha
 */

export interface WeaponModelResult {
  group: THREE.Group;
  muzzlePos: THREE.Vector3;
  magMesh?: THREE.Mesh;
  spinningGroup?: THREE.Group;
  rocketWarhead?: THREE.Group;
  coils?: THREE.Mesh[];
}

export function createWeapon3DMesh(weaponId: string, isFirstPerson: boolean = false): WeaponModelResult {
  const group = new THREE.Group();
  let magMesh: THREE.Mesh | undefined;
  let spinningGroup: THREE.Group | undefined;
  let rocketWarhead: THREE.Group | undefined;
  const coils: THREE.Mesh[] = [];

  // En primera persona la escala se adapta al ángulo de visión de la cámara
  const s = isFirstPerson ? 1.05 : 1.25;

  switch (weaponId) {
    case 'rpg7': {
      // =========================================================================
      // LANZACOHETES RPG-7 PESADO (LANZADOR DE HOMBRO MASIVO CON COHETE GIGANTE)
      // =========================================================================
      // 1. Tubo de lanzamiento principal (Verde militar táctico mate)
      const launcherMat = new THREE.MeshStandardMaterial({
        color: 0x2b3824, // Verde oliva militar profundo
        roughness: 0.38,
        metalness: 0.8,
      });

      const tubeGeo = new THREE.CylinderGeometry(0.14 * s, 0.12 * s, 1.8 * s, 16);
      tubeGeo.rotateX(Math.PI / 2);
      const tube = new THREE.Mesh(tubeGeo, launcherMat);
      tube.castShadow = true;
      group.add(tube);

      // 2. Escudo térmico de madera tratada / baquelita central
      const heatShieldMat = new THREE.MeshStandardMaterial({
        color: 0x5a341b, // Madera oscura de baquelita soviética
        roughness: 0.7,
        metalness: 0.05,
      });
      const shieldGeo = new THREE.CylinderGeometry(0.17 * s, 0.17 * s, 0.65 * s, 16);
      shieldGeo.rotateX(Math.PI / 2);
      const shield = new THREE.Mesh(shieldGeo, heatShieldMat);
      shield.position.set(0, 0, -0.15 * s);
      group.add(shield);

      // Almohadilla de apoyo en el hombro
      const padGeo = new THREE.BoxGeometry(0.18 * s, 0.08 * s, 0.35 * s);
      const shoulderPad = new THREE.Mesh(padGeo, MaterialLibrary.darkChassisMat);
      shoulderPad.position.set(0, -0.14 * s, -0.15 * s);
      group.add(shoulderPad);

      // 3. Tobera de escape cónica trasera masiva (deflector de rebufo)
      const exhaustGeo = new THREE.ConeGeometry(0.26 * s, 0.45 * s, 16, 1, true);
      exhaustGeo.rotateX(-Math.PI / 2);
      const exhaust = new THREE.Mesh(exhaustGeo, MaterialLibrary.darkChassisMat);
      exhaust.position.set(0, 0, -1.05 * s);
      group.add(exhaust);

      // Anillo de refuerzo de la tobera
      const coneRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.24 * s, 0.03 * s, 8, 16),
        MaterialLibrary.chromePistonMat
      );
      coneRing.position.set(0, 0, -1.25 * s);
      group.add(coneRing);

      // 4. Empuñaduras dobles: Delantera de soporte y trasera con gatillo
      const gripGeo = new THREE.BoxGeometry(0.08 * s, 0.32 * s, 0.12 * s);

      const triggerGrip = new THREE.Mesh(gripGeo, MaterialLibrary.darkChassisMat);
      triggerGrip.position.set(0, -0.24 * s, 0.18 * s);
      triggerGrip.rotation.x = -0.18;
      group.add(triggerGrip);

      const foreGrip = new THREE.Mesh(gripGeo, MaterialLibrary.darkChassisMat);
      foreGrip.position.set(0, -0.24 * s, 0.55 * s);
      group.add(foreGrip);

      // 5. Mira óptica lateral PGO-7 prominente con lente ámbar
      const scopeBracket = new THREE.Mesh(
        new THREE.BoxGeometry(0.15 * s, 0.12 * s, 0.08 * s),
        MaterialLibrary.darkChassisMat
      );
      scopeBracket.position.set(0.16 * s, 0.12 * s, 0.22 * s);
      group.add(scopeBracket);

      const scopeBody = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055 * s, 0.055 * s, 0.38 * s, 12),
        MaterialLibrary.heavyRifleMat
      );
      scopeBody.rotateX(Math.PI / 2);
      scopeBody.position.set(0.19 * s, 0.18 * s, 0.22 * s);
      group.add(scopeBody);

      const scopeLens = new THREE.Mesh(
        new THREE.CircleGeometry(0.048 * s, 12),
        MaterialLibrary.cyanEnergyMat
      );
      scopeLens.position.set(0.19 * s, 0.18 * s, 0.41 * s);
      group.add(scopeLens);

      // 6. OJIVA DEL COHETE PROMINENTE (Sobresale ampliamente de la boca del lanzador)
      const rocket = new THREE.Group();
      rocket.position.set(0, 0, 0.9 * s);

      // Vástago de inserción en el cañón
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08 * s, 0.08 * s, 0.45 * s, 12),
        MaterialLibrary.darkChassisMat
      );
      stem.rotateX(Math.PI / 2);
      stem.position.set(0, 0, 0.1 * s);
      rocket.add(stem);

      // Aletas estabilizadoras del cohete
      for (let f = 0; f < 4; f++) {
        const fin = new THREE.Mesh(
          new THREE.BoxGeometry(0.015 * s, 0.18 * s, 0.14 * s),
          MaterialLibrary.chromePistonMat
        );
        fin.rotation.z = (f * Math.PI) / 2;
        fin.position.set(0, 0, 0.12 * s);
        rocket.add(fin);
      }

      // Cono principal de la ojiva PG-7 (Cuerpo ancho con ojiva ahusada)
      const warheadBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24 * s, 0.12 * s, 0.35 * s, 16),
        new THREE.MeshStandardMaterial({
          color: 0xdc2626, // Rojo militar de alta visibilidad
          roughness: 0.3,
          metalness: 0.6,
        })
      );
      warheadBase.rotateX(Math.PI / 2);
      warheadBase.position.set(0, 0, 0.48 * s);
      warheadBase.castShadow = true;
      rocket.add(warheadBase);

      // Banda de advertencia amarilla en la ojiva
      const yellowBand = new THREE.Mesh(
        new THREE.CylinderGeometry(0.245 * s, 0.245 * s, 0.08 * s, 16),
        new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 })
      );
      yellowBand.rotateX(Math.PI / 2);
      yellowBand.position.set(0, 0, 0.48 * s);
      rocket.add(yellowBand);

      // Punta cónica de espoleta
      const warheadTip = new THREE.Mesh(
        new THREE.ConeGeometry(0.24 * s, 0.48 * s, 16),
        new THREE.MeshStandardMaterial({
          color: 0x991b1b, // Carmesí oscuro
          roughness: 0.25,
          metalness: 0.7,
        })
      );
      warheadTip.rotateX(Math.PI / 2);
      warheadTip.position.set(0, 0, 0.88 * s);
      warheadTip.castShadow = true;
      rocket.add(warheadTip);

      // Espoleta piezoeléctrica frontal cromada
      const fuse = new THREE.Mesh(
        new THREE.CylinderGeometry(0.028 * s, 0.028 * s, 0.18 * s, 8),
        MaterialLibrary.chromePistonMat
      );
      fuse.rotateX(Math.PI / 2);
      fuse.position.set(0, 0, 1.18 * s);
      rocket.add(fuse);

      group.add(rocket);
      rocketWarhead = rocket;

      return {
        group,
        muzzlePos: new THREE.Vector3(0, 0, 2.1 * s),
        rocketWarhead,
      };
    }

    case 'vulcan': {
      // =========================================================================
      // MINIGUN GATLING PESADA VULCAN (6 CAÑONES ROTATIVOS Y TAMBOR MASIVO)
      // =========================================================================
      spinningGroup = new THREE.Group();

      // Disco soporte frontal, medio y trasero de los cañones rotativos
      const discGeo = new THREE.CylinderGeometry(0.2 * s, 0.2 * s, 0.06 * s, 16);
      discGeo.rotateX(Math.PI / 2);

      const discFront = new THREE.Mesh(discGeo, MaterialLibrary.chromePistonMat);
      discFront.position.set(0, 0, 0.9 * s);
      spinningGroup.add(discFront);

      const discMid = new THREE.Mesh(discGeo, MaterialLibrary.chromePistonMat);
      discMid.position.set(0, 0, 0.45 * s);
      spinningGroup.add(discMid);

      const discRear = new THREE.Mesh(discGeo, MaterialLibrary.chromePistonMat);
      discRear.position.set(0, 0, 0.05 * s);
      spinningGroup.add(discRear);

      // 6 cañones Gatling de acero colocados en círculo perfecto
      const barrelGeo = new THREE.CylinderGeometry(0.038 * s, 0.038 * s, 1.25 * s, 10);
      barrelGeo.rotateX(Math.PI / 2);

      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        const bx = Math.cos(angle) * 0.14 * s;
        const by = Math.sin(angle) * 0.14 * s;
        const b = new THREE.Mesh(barrelGeo, MaterialLibrary.heavyRifleMat);
        b.position.set(bx, by, 0.55 * s);
        b.castShadow = true;
        spinningGroup.add(b);

        // Boca de fuego estriada en cada cañón
        const tip = new THREE.Mesh(
          new THREE.CylinderGeometry(0.046 * s, 0.046 * s, 0.1 * s, 8),
          MaterialLibrary.chromePistonMat
        );
        tip.rotateX(Math.PI / 2);
        tip.position.set(bx, by, 1.2 * s);
        spinningGroup.add(tip);
      }

      // Eje central de rotación
      const centralAxle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06 * s, 0.06 * s, 1.25 * s, 12),
        MaterialLibrary.darkChassisMat
      );
      centralAxle.rotateX(Math.PI / 2);
      centralAxle.position.set(0, 0, 0.55 * s);
      spinningGroup.add(centralAxle);

      group.add(spinningGroup);

      // Carcasa del motor eléctrico de alta potencia
      const motorGeo = new THREE.CylinderGeometry(0.24 * s, 0.26 * s, 0.55 * s, 16);
      motorGeo.rotateX(Math.PI / 2);
      const motor = new THREE.Mesh(motorGeo, MaterialLibrary.heavyRifleMat);
      motor.position.set(0, 0, -0.22 * s);
      motor.castShadow = true;
      group.add(motor);

      // Rejillas de refrigeración del motor
      const ventGeo = new THREE.BoxGeometry(0.48 * s, 0.12 * s, 0.35 * s);
      const vents = new THREE.Mesh(ventGeo, MaterialLibrary.darkChassisMat);
      vents.position.set(0, 0.12 * s, -0.22 * s);
      group.add(vents);

      // Asa superior de transporte pesado con gatillo doble
      const handleGeo = new THREE.BoxGeometry(0.1 * s, 0.16 * s, 0.6 * s);
      const handle = new THREE.Mesh(handleGeo, MaterialLibrary.heavyRifleMat);
      handle.position.set(0, 0.28 * s, -0.15 * s);
      group.add(handle);

      // Tambor masivo de munición cilíndrico bajo el arma
      const drumGeo = new THREE.CylinderGeometry(0.32 * s, 0.32 * s, 0.42 * s, 16);
      const drum = new THREE.Mesh(drumGeo, MaterialLibrary.darkChassisMat);
      drum.position.set(0, -0.38 * s, -0.18 * s);
      drum.castShadow = true;
      group.add(drum);

      // Canaleta de alimentación de balas metálicas
      const chuteGeo = new THREE.BoxGeometry(0.14 * s, 0.22 * s, 0.18 * s);
      const chute = new THREE.Mesh(chuteGeo, MaterialLibrary.goldTrimMat);
      chute.position.set(0.18 * s, -0.18 * s, -0.18 * s);
      group.add(chute);

      return {
        group,
        muzzlePos: new THREE.Vector3(0, 0, 1.35 * s),
        spinningGroup,
      };
    }

    case 'spas12': {
      // =========================================================================
      // ESCOPETA TÁCTICA SPAS-12 (DOBLE CAÑÓN, BOMBEO ACANALADO Y CARTUCHOS)
      // =========================================================================
      // Cañón superior de disparo calibre 12
      const barrelTop = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06 * s, 0.06 * s, 1.25 * s, 14),
        MaterialLibrary.heavyRifleMat
      );
      barrelTop.rotateX(Math.PI / 2);
      barrelTop.position.set(0, 0.05 * s, 0.65 * s);
      barrelTop.castShadow = true;
      group.add(barrelTop);

      // Freno de boca de asalto (con cortes de dispersión)
      const choke = new THREE.Mesh(
        new THREE.CylinderGeometry(0.075 * s, 0.075 * s, 0.14 * s, 8),
        MaterialLibrary.darkChassisMat
      );
      choke.rotateX(Math.PI / 2);
      choke.position.set(0, 0.05 * s, 1.32 * s);
      group.add(choke);

      // Tubo de depósito de cartuchos inferior
      const magTube = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05 * s, 0.05 * s, 1.15 * s, 12),
        MaterialLibrary.darkChassisMat
      );
      magTube.rotateX(Math.PI / 2);
      magTube.position.set(0, -0.05 * s, 0.58 * s);
      group.add(magTube);

      // Corredera / Guardamanos de bombeo acanalado ergonómico
      const pumpGeo = new THREE.CylinderGeometry(0.095 * s, 0.095 * s, 0.45 * s, 14);
      pumpGeo.rotateX(Math.PI / 2);
      const pumpMat = new THREE.MeshStandardMaterial({
        color: 0x1f242d,
        roughness: 0.85,
        metalness: 0.1,
      });
      const pump = new THREE.Mesh(pumpGeo, pumpMat);
      pump.position.set(0, -0.01 * s, 0.52 * s);
      group.add(pump);

      // Cajón de mecanismos robusto
      const receiver = new THREE.Mesh(
        new THREE.BoxGeometry(0.14 * s, 0.24 * s, 0.65 * s),
        MaterialLibrary.heavyRifleMat
      );
      receiver.position.set(0, 0, -0.05 * s);
      receiver.castShadow = true;
      group.add(receiver);

      // Cartuchos de escopeta rojos visibles en el lateral del receptor (Side-saddle)
      for (let sh = 0; sh < 4; sh++) {
        const shell = new THREE.Mesh(
          new THREE.CylinderGeometry(0.022 * s, 0.022 * s, 0.12 * s, 8),
          new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.3 })
        );
        shell.position.set(-0.085 * s, (sh - 1.5) * 0.045 * s, -0.02 * s);
        group.add(shell);
      }

      // Culata metálica plegada en el lomo
      const stock = new THREE.Mesh(
        new THREE.BoxGeometry(0.09 * s, 0.04 * s, 0.55 * s),
        MaterialLibrary.darkChassisMat
      );
      stock.position.set(0, 0.15 * s, 0.05 * s);
      group.add(stock);

      return {
        group,
        muzzlePos: new THREE.Vector3(0, 0.05 * s, 1.4 * s),
      };
    }

    case 'pistol': {
      // =========================================================================
      // PISTOLA DE COMBATE M9 / MAGNUM (CORREDERA ESTRIADA Y MÓDULO TÁCTICO)
      // =========================================================================
      // Corredera metálica superior pesada
      const slideGeo = new THREE.BoxGeometry(0.1 * s, 0.12 * s, 0.55 * s);
      const slide = new THREE.Mesh(slideGeo, MaterialLibrary.heavyRifleMat);
      slide.position.set(0, 0.06 * s, 0.14 * s);
      slide.castShadow = true;
      group.add(slide);

      // Cañón interno de acero
      const barrel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03 * s, 0.03 * s, 0.15 * s, 10),
        MaterialLibrary.chromePistonMat
      );
      barrel.rotateX(Math.PI / 2);
      barrel.position.set(0, 0.06 * s, 0.42 * s);
      group.add(barrel);

      // Empuñadura ergonómica inclinada
      const gripGeo = new THREE.BoxGeometry(0.09 * s, 0.28 * s, 0.14 * s);
      const grip = new THREE.Mesh(gripGeo, MaterialLibrary.darkChassisMat);
      grip.position.set(0, -0.12 * s, -0.03 * s);
      grip.rotation.x = -0.3;
      grip.castShadow = true;
      group.add(grip);

      // Módulo táctico bajo el cañón (Linterna + Punto Láser)
      const tacModule = new THREE.Mesh(
        new THREE.BoxGeometry(0.08 * s, 0.07 * s, 0.24 * s),
        MaterialLibrary.darkChassisMat
      );
      tacModule.position.set(0, -0.03 * s, 0.26 * s);
      group.add(tacModule);

      const redEmitter = new THREE.Mesh(
        new THREE.SphereGeometry(0.02 * s, 8, 8),
        MaterialLibrary.redGlowMat
      );
      redEmitter.position.set(0, -0.03 * s, 0.38 * s);
      group.add(redEmitter);

      return {
        group,
        muzzlePos: new THREE.Vector3(0, 0.06 * s, 0.45 * s),
      };
    }

    case 'raygun': {
      // =========================================================================
      // RAYO CÓSMICO Z-900 (ARMA ALIENÍGENA DE PLASMA ESMERALDA CON ALETAS Y NÚCLEO)
      // =========================================================================
      // Chasis retro-futurista curvado
      const bodyGeo = new THREE.ConeGeometry(0.18 * s, 0.9 * s, 16);
      bodyGeo.rotateX(Math.PI / 2);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x7c3aed, // Púrpura alienígena profundo
        roughness: 0.18,
        metalness: 0.92,
      });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.castShadow = true;
      group.add(body);

      // Aletas dorsales retro doradas
      const finGeo = new THREE.BoxGeometry(0.03 * s, 0.28 * s, 0.45 * s);
      const fin = new THREE.Mesh(finGeo, MaterialLibrary.goldTrimMat);
      fin.position.set(0, 0.22 * s, -0.12 * s);
      group.add(fin);

      // Esferas de plasma esmeralda brillantes
      const plasmaMat = new THREE.MeshStandardMaterial({
        color: 0x10b981,
        emissive: 0x10b981,
        emissiveIntensity: 4.8,
        roughness: 0.1,
      });

      const coreSphere = new THREE.Mesh(new THREE.SphereGeometry(0.12 * s, 14, 14), plasmaMat);
      coreSphere.position.set(0, 0.08 * s, 0.2 * s);
      group.add(coreSphere);

      // Anillos concéntricos flotantes alrededor del emisor
      for (let r = 0; r < 3; r++) {
        const ringGeo = new THREE.TorusGeometry((0.15 - r * 0.03) * s, 0.025 * s, 8, 24);
        const ring = new THREE.Mesh(ringGeo, MaterialLibrary.goldTrimMat);
        ring.position.set(0, 0, (0.42 + r * 0.18) * s);
        group.add(ring);
      }

      // Bulbo emisor frontal de plasma
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09 * s, 14, 14), plasmaMat);
      bulb.position.set(0, 0, 1.05 * s);
      group.add(bulb);

      return {
        group,
        muzzlePos: new THREE.Vector3(0, 0, 1.15 * s),
      };
    }

    case 'tesla': {
      // =========================================================================
      // FUSIL TESLA ARC STORM (BOBINAS DE INDUCCIÓN Y ELECTRODOS BIFURCADOS)
      // =========================================================================
      const chassis = new THREE.Mesh(
        new THREE.BoxGeometry(0.16 * s, 0.26 * s, 1.05 * s),
        MaterialLibrary.heavyRifleMat
      );
      chassis.castShadow = true;
      group.add(chassis);

      // 4 Bobinas de inducción eléctrica azul cian brillante
      for (let c = 0; c < 4; c++) {
        const coilGeo = new THREE.TorusGeometry(0.14 * s, 0.03 * s, 10, 24);
        const coilMesh = new THREE.Mesh(coilGeo, MaterialLibrary.cyanEnergyMat);
        coilMesh.position.set(0, 0.05 * s, (0.1 + c * 0.18) * s);
        group.add(coilMesh);
        coils.push(coilMesh);
      }

      // Horquillas de electrodo bifurcadas frontales
      const forkGeo = new THREE.CylinderGeometry(0.024 * s, 0.024 * s, 0.55 * s, 8);
      forkGeo.rotateX(Math.PI / 2);

      const forkL = new THREE.Mesh(forkGeo, MaterialLibrary.chromePistonMat);
      forkL.position.set(-0.12 * s, 0.05 * s, 1.05 * s);
      group.add(forkL);

      const forkR = new THREE.Mesh(forkGeo, MaterialLibrary.chromePistonMat);
      forkR.position.set(0.12 * s, 0.05 * s, 1.05 * s);
      group.add(forkR);

      // Chispa estática brillante entre los electrodos
      const spark = new THREE.Mesh(
        new THREE.SphereGeometry(0.07 * s, 8, 8),
        MaterialLibrary.plasmaGlowMat
      );
      spark.position.set(0, 0.05 * s, 1.18 * s);
      group.add(spark);

      return {
        group,
        muzzlePos: new THREE.Vector3(0, 0.05 * s, 1.35 * s),
        coils,
      };
    }

    case 'glacier': {
      // =========================================================================
      // CAÑÓN CRIOGÉNICO GLACIAR (DOBLE DEPÓSITO CRIOGÉNICO Y BOQUILLA DE ESCARCHA)
      // =========================================================================
      const chassis = new THREE.Mesh(
        new THREE.BoxGeometry(0.2 * s, 0.26 * s, 1.05 * s),
        new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.3, metalness: 0.8 })
      );
      chassis.castShadow = true;
      group.add(chassis);

      // Canisters cilíndricos de nitrógeno líquido
      const canisterMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 3.0,
        roughness: 0.15,
        metalness: 0.75,
      });

      const canL = new THREE.Mesh(new THREE.CylinderGeometry(0.085 * s, 0.085 * s, 0.65 * s, 12), canisterMat);
      canL.position.set(-0.18 * s, 0.1 * s, 0.15 * s);
      canL.rotateX(Math.PI / 2);
      group.add(canL);

      const canR = new THREE.Mesh(new THREE.CylinderGeometry(0.085 * s, 0.085 * s, 0.65 * s, 12), canisterMat);
      canR.position.set(0.18 * s, 0.1 * s, 0.15 * s);
      canR.rotateX(Math.PI / 2);
      group.add(canR);

      // Boquilla difusora criogénica amplia
      const nozzleGeo = new THREE.ConeGeometry(0.18 * s, 0.35 * s, 14, 1, true);
      nozzleGeo.rotateX(Math.PI / 2);
      const nozzle = new THREE.Mesh(nozzleGeo, MaterialLibrary.chromePistonMat);
      nozzle.position.set(0, 0, 0.8 * s);
      group.add(nozzle);

      return {
        group,
        muzzlePos: new THREE.Vector3(0, 0, 1.0 * s),
      };
    }

    default: {
      // =========================================================================
      // FUSIL DE ASALTO MILITAR M4A1 / BR55 (POR DEFECTO)
      // =========================================================================
      const rifleBody = new THREE.Mesh(
        new THREE.BoxGeometry(0.13 * s, 0.24 * s, 1.35 * s),
        MaterialLibrary.heavyRifleMat
      );
      rifleBody.castShadow = true;
      group.add(rifleBody);

      // Mira telescópica táctica ACOG con retícula brillante
      const topScope = new THREE.Mesh(
        new THREE.BoxGeometry(0.09 * s, 0.1 * s, 0.65 * s),
        MaterialLibrary.heavyRifleMat
      );
      topScope.position.set(0, 0.17 * s, -0.05 * s);
      group.add(topScope);

      const scopeLens = new THREE.Mesh(
        new THREE.BoxGeometry(0.07 * s, 0.06 * s, 0.02 * s),
        MaterialLibrary.cyanEnergyMat
      );
      scopeLens.position.set(0, 0.17 * s, 0.28 * s);
      group.add(scopeLens);

      // Cañón estriado largo
      const barrel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.042 * s, 0.042 * s, 0.75 * s, 12),
        MaterialLibrary.heavyRifleMat
      );
      barrel.rotateX(Math.PI / 2);
      barrel.position.set(0, 0, 0.95 * s);
      barrel.castShadow = true;
      group.add(barrel);

      // Freno de boca compensador
      const muzzleBrake = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055 * s, 0.055 * s, 0.14 * s, 8),
        MaterialLibrary.darkChassisMat
      );
      muzzleBrake.rotateX(Math.PI / 2);
      muzzleBrake.position.set(0, 0, 1.38 * s);
      group.add(muzzleBrake);

      // Cargador curvo militar desmontable
      const magGeo = new THREE.BoxGeometry(0.09 * s, 0.36 * s, 0.2 * s);
      magMesh = new THREE.Mesh(magGeo, MaterialLibrary.darkChassisMat);
      magMesh.position.set(0, -0.22 * s, -0.08 * s);
      magMesh.rotation.x = -0.25;
      group.add(magMesh);

      return {
        group,
        muzzlePos: new THREE.Vector3(0, 0, 1.45 * s),
        magMesh,
      };
    }
  }
}
