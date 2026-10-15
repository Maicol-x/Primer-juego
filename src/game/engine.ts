import {
  Player,
  DefenseBase,
  Zombie,
  Projectile,
  Particle,
  BloodDecal,
  FloatingText,
  MysteryBoxLocation,
  Weapon,
  MysteryBoxDrop,
} from './types';
import { createWeaponInstance, MYSTERY_BOX_COST, rollMysteryBox } from './weapons';
import { sound } from './audio';

export interface GameEngineCallbacks {
  onPlayerUpdate: (player: Player) => void;
  onBaseUpdate: (base: DefenseBase) => void;
  onRoundUpdate: (round: number, zombiesRemaining: number, inIntermission: boolean) => void;
  onGameOver: (stats: { round: number; kills: number; score: number; coins: number }) => void;
  onNearMysteryBox: (isNear: boolean) => void;
  onNearWorkshop: (isNear: boolean) => void;
  onOpenMysteryBoxResult: (drop: MysteryBoxDrop) => void;
  onFloatingMessage?: (text: string, color: string) => void;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private callbacks: GameEngineCallbacks;

  // Dimensiones del mapa
  public readonly mapWidth = 2400;
  public readonly mapHeight = 1800;

  // Estado del juego
  public isRunning = false;
  public isPaused = false;
  private lastTime = 0;
  private animFrameId: number | null = null;

  // Entidades
  public player: Player;
  public base: DefenseBase;
  public mysteryBox: MysteryBoxLocation;
  public workshopLocation = { x: 1040, y: 760, radius: 60 };

  public zombies: Zombie[] = [];
  public projectiles: Projectile[] = [];
  public particles: Particle[] = [];
  public decals: BloodDecal[] = [];
  public floatingTexts: FloatingText[] = [];

  // Oleadas / Rondas
  public round = 1;
  public zombiesToSpawnThisRound = 10;
  public zombiesSpawnedThisRound = 0;
  public zombiesAlive = 0;
  public spawnTimer = 0;
  public spawnInterval = 1.6; // Segundos entre spawns
  public inIntermission = false;
  public intermissionTimer = 0;
  public readonly intermissionDuration = 6.0; // 6 segundos de descanso

  // Cámara
  public camera = { x: 1200, y: 900, shakeX: 0, shakeY: 0, shakeIntensity: 0 };

  // Inputs
  private keys: Record<string, boolean> = {};
  public mouse = { x: 0, y: 0, worldX: 1200, worldY: 900, isDown: false, rightDown: false };

  // Hitstop (micro-pausa para impacto pesado)
  private hitstopTimer = 0;

  // ID Counters
  private nextEntityId = 1;

  constructor(canvas: HTMLCanvasElement, callbacks: GameEngineCallbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.callbacks = callbacks;

    // Inicializar Jugador
    this.player = {
      x: 1200,
      y: 950,
      vx: 0,
      vy: 0,
      radius: 18,
      hp: 100,
      maxHp: 100,
      speed: 260,
      stamina: 100,
      maxStamina: 100,
      dashCooldown: 1.8,
      dashTimer: 0,
      isDashing: false,
      angle: 0,
      activeWeaponIndex: 0,
      weapons: [createWeaponInstance('pistol')],
      coins: 300, // Monedas iniciales para arrancar
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

    // Inicializar Base Fortificada
    this.base = {
      x: 1200,
      y: 900,
      width: 140,
      height: 140,
      hp: 1000,
      maxHp: 1000,
      armorLevel: 1,
      turretLevel: 1,
      turretRange: 380,
      turretFireRate: 2.2, // 2.2 disparos/seg
      turretCooldown: 0,
      turretAngle: 0,
      repairCost: 100,
    };

    // Inicializar Caja Misteriosa (a la derecha de la base)
    this.mysteryBox = {
      x: 1360,
      y: 780,
      width: 52,
      height: 36,
      cost: MYSTERY_BOX_COST,
      isOpen: false,
      isSpinning: false,
    };

    this.bindEvents();
    this.resizeCanvas();
  }

  public resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  private bindEvents() {
    window.addEventListener('resize', () => this.resizeCanvas());

    window.addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true;
      this.keys[e.code] = true;

      // Acciones edge-triggered
      if (e.key.toLowerCase() === 'r') {
        this.startReload();
      }
      if (e.key === ' ' || e.code === 'Space') {
        this.performDash();
      }
      if (e.key.toLowerCase() === 'e') {
        this.interact();
      }
      if (e.key >= '1' && e.key <= '5') {
        const idx = parseInt(e.key) - 1;
        if (idx < this.player.weapons.length) {
          this.switchWeapon(idx);
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
      this.keys[e.code] = false;
    });

    window.addEventListener('blur', () => {
      this.keys = {};
      this.mouse.isDown = false;
      this.mouse.rightDown = false;
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - rect.left;
      this.mouse.y = e.clientY - rect.top;
      this.mouse.worldX = this.mouse.x + this.camera.x - this.canvas.width / 2;
      this.mouse.worldY = this.mouse.y + this.camera.y - this.canvas.height / 2;
    });

    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.mouse.isDown = true;
      } else if (e.button === 2) {
        this.performDash();
      }
    });

    this.canvas.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.mouse.isDown = false;
      }
    });

    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    this.canvas.addEventListener('wheel', (e) => {
      if (e.deltaY > 0) {
        this.switchWeapon((this.player.activeWeaponIndex + 1) % this.player.weapons.length);
      } else if (e.deltaY < 0) {
        this.switchWeapon(
          (this.player.activeWeaponIndex - 1 + this.player.weapons.length) % this.player.weapons.length
        );
      }
    });
  }

  public start() {
    this.isRunning = true;
    this.isPaused = false;
    this.lastTime = performance.now();
    sound.playRoundStart();
    this.loop();
  }

  public pause() {
    this.isPaused = true;
  }

  public resume() {
    if (this.isPaused) {
      this.isPaused = false;
      this.lastTime = performance.now();
      this.loop();
    }
  }

  public destroy() {
    this.isRunning = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
  }

  private loop = () => {
    if (!this.isRunning || this.isPaused) return;

    const now = performance.now();
    const rawDt = (now - this.lastTime) / 1000;
    this.lastTime = now;

    // Clamping de frame delta time
    const dt = Math.min(rawDt, 0.05);

    // Hitstop
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      this.render();
      this.animFrameId = requestAnimationFrame(this.loop);
      return;
    }

    this.update(dt);
    this.render();

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  // --------------------------------------------------------------------------------
  // ACTUALIZACIÓN DE ESTADO
  // --------------------------------------------------------------------------------

  private update(dt: number) {
    this.updatePlayer(dt);
    this.updateBase(dt);
    this.updateZombies(dt);
    this.updateProjectiles(dt);
    this.updateParticles(dt);
    this.updateFloatingTexts(dt);
    this.updateRounds(dt);
    this.updateProximityChecks();
    this.updateCamera(dt);
  }

  private updatePlayer(dt: number) {
    const p = this.player;

    // Temporizadores de buffs
    if (p.invulnerableTimer > 0) p.invulnerableTimer -= dt;
    if (p.speedBuffTimer > 0) p.speedBuffTimer -= dt;
    if (p.doublePointsTimer > 0) p.doublePointsTimer -= dt;
    if (p.infiniteAmmoTimer > 0) p.infiniteAmmoTimer -= dt;

    // Regeneración de stamina y dash cooldown
    if (p.dashTimer > 0) {
      p.dashTimer -= dt;
      if (p.dashTimer <= p.dashCooldown - 0.25) {
        p.isDashing = false;
      }
    }
    if (p.stamina < p.maxStamina) {
      p.stamina = Math.min(p.maxStamina, p.stamina + 35 * dt);
    }

    // Movimiento continuo con WASD
    let moveX = 0;
    let moveY = 0;
    if (this.keys['w'] || this.keys['arrowup']) moveY -= 1;
    if (this.keys['s'] || this.keys['arrowdown']) moveY += 1;
    if (this.keys['a'] || this.keys['arrowleft']) moveX -= 1;
    if (this.keys['d'] || this.keys['arrowright']) moveX += 1;

    // Normalizar vector de movimiento
    const len = Math.hypot(moveX, moveY);
    if (len > 0) {
      moveX /= len;
      moveY /= len;
    }

    const currentSpeed = p.isDashing ? p.speed * 2.5 : p.speedBuffTimer > 0 ? p.speed * 1.35 : p.speed;

    p.vx = moveX * currentSpeed;
    p.vy = moveY * currentSpeed;

    p.x += p.vx * dt;
    p.y += p.vy * dt;

    // Colisión con límites del mapa
    p.x = Math.max(p.radius + 20, Math.min(this.mapWidth - p.radius - 20, p.x));
    p.y = Math.max(p.radius + 20, Math.min(this.mapHeight - p.radius - 20, p.y));

    // Colisión sólida con el Núcleo del Búnker central (para no traspasarlo)
    const b = this.base;
    const halfW = b.width / 2 + p.radius;
    const halfH = b.height / 2 + p.radius;
    const dx = p.x - b.x;
    const dy = p.y - b.y;

    if (Math.abs(dx) < halfW && Math.abs(dy) < halfH) {
      const overlapX = halfW - Math.abs(dx);
      const overlapY = halfH - Math.abs(dy);
      if (overlapX < overlapY) {
        p.x += Math.sign(dx) * overlapX;
      } else {
        p.y += Math.sign(dy) * overlapY;
      }
    }

    // Orientación hacia el ratón
    this.mouse.worldX = this.mouse.x + this.camera.x - this.canvas.width / 2;
    this.mouse.worldY = this.mouse.y + this.camera.y - this.canvas.height / 2;
    p.angle = Math.atan2(this.mouse.worldY - p.y, this.mouse.worldX - p.x);

    // Sistema de armas y disparo
    const activeWeapon = p.weapons[p.activeWeaponIndex];
    if (p.shootCooldown > 0) {
      p.shootCooldown -= dt;
    }

    // Recarga en progreso
    if (p.reloading) {
      p.reloadProgress += dt / activeWeapon.reloadTime;
      if (p.reloadProgress >= 1) {
        this.finishReload();
      }
    } else {
      // Disparo automático si el ratón está presionado
      if (this.mouse.isDown && p.shootCooldown <= 0) {
        this.fireActiveWeapon();
      }
    }

    // Notificar UI cada ciertos ticks
    this.callbacks.onPlayerUpdate({ ...p });
  }

  private updateBase(dt: number) {
    const b = this.base;

    // Torreta de defensa de la base (dispara al zombie más cercano)
    b.turretCooldown -= dt;
    if (b.turretCooldown <= 0 && this.zombies.length > 0) {
      let closestZombie: Zombie | null = null;
      let minDst = b.turretRange;

      for (const z of this.zombies) {
        const dst = Math.hypot(z.x - b.x, z.y - b.y);
        if (dst < minDst) {
          minDst = dst;
          closestZombie = z;
        }
      }

      if (closestZombie) {
        b.turretAngle = Math.atan2(closestZombie.y - b.y, closestZombie.x - b.x);
        b.turretCooldown = 1 / b.turretFireRate;

        // Disparo de la torreta
        const spread = (Math.random() - 0.5) * 0.1;
        const angle = b.turretAngle + spread;
        const speed = 800;

        this.projectiles.push({
          id: this.nextEntityId++,
          x: b.x + Math.cos(angle) * 35,
          y: b.y + Math.sin(angle) * 35,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: 3.5,
          damage: 28 * (1 + (b.turretLevel - 1) * 0.35),
          rangeRemaining: b.turretRange + 50,
          color: '#38bdf8',
          pierceCount: 1,
          knockback: 100,
          isEnemy: false,
        });

        sound.playRifle();
      }
    }

    this.callbacks.onBaseUpdate({ ...b });
  }

  private updateZombies(dt: number) {
    const p = this.player;
    const b = this.base;

    for (let i = this.zombies.length - 1; i >= 0; i--) {
      const z = this.zombies[i];

      // Efectos de estado (lentitud por frío, quemadura)
      if (z.slowTimer > 0) {
        z.slowTimer -= dt;
        if (z.slowTimer <= 0) {
          z.speed = z.baseSpeed;
        }
      }
      if (z.hitFlashTimer > 0) {
        z.hitFlashTimer -= dt;
      }
      if (z.attackTimer > 0) {
        z.attackTimer -= dt;
      }

      // Inteligencia Artificial: Determinar objetivo (Jugador o Base)
      const dstToPlayer = Math.hypot(p.x - z.x, p.y - z.y);
      const dstToBase = Math.hypot(b.x - z.x, b.y - z.y);

      // Si el jugador está relativamente cerca (< 380px), perseguir al jugador; si no, ir hacia el búnker
      if (dstToPlayer < 380 || z.type === 'runner') {
        z.target = 'player';
      } else {
        z.target = 'base';
      }

      const targetX = z.target === 'player' ? p.x : b.x;
      const targetY = z.target === 'player' ? p.y : b.y;
      const targetDst = z.target === 'player' ? dstToPlayer : dstToBase;

      // Movimiento hacia objetivo
      const angle = Math.atan2(targetY - z.y, targetX - z.x);

      // Si es Spitter y está a distancia de disparo, lanzar ácido
      if (z.type === 'spitter' && targetDst < 420 && targetDst > 140) {
        if (!z.spitTimer) z.spitTimer = 2.0;
        z.spitTimer -= dt;
        if (z.spitTimer <= 0) {
          z.spitTimer = 2.5;
          // Disparar proyectil tóxico
          const spitSpeed = 340;
          this.projectiles.push({
            id: this.nextEntityId++,
            x: z.x + Math.cos(angle) * (z.radius + 8),
            y: z.y + Math.sin(angle) * (z.radius + 8),
            vx: Math.cos(angle) * spitSpeed,
            vy: Math.sin(angle) * spitSpeed,
            radius: 7,
            damage: z.damage * 1.2,
            rangeRemaining: 480,
            color: '#a3e635', // Acid green
            trailColor: '#4d7c0f',
            pierceCount: 1,
            knockback: 60,
            isEnemy: true,
          });
          sound.playZombieHit();
        }
      } else {
        // Acercarse
        z.vx = Math.cos(angle) * z.speed;
        z.vy = Math.sin(angle) * z.speed;
        z.x += z.vx * dt;
        z.y += z.vy * dt;
      }

      // Separación simple entre zombies para evitar apilamiento total
      for (let j = 0; j < this.zombies.length; j++) {
        if (i === j) continue;
        const other = this.zombies[j];
        const sepDx = z.x - other.x;
        const sepDy = z.y - other.y;
        const sepDst = Math.hypot(sepDx, sepDy);
        const minDist = z.radius + other.radius;
        if (sepDst < minDist && sepDst > 0) {
          const push = (minDist - sepDst) * 0.5;
          z.x += (sepDx / sepDst) * push;
          z.y += (sepDy / sepDst) * push;
        }
      }

      // Ataque al Jugador
      if (dstToPlayer < z.radius + p.radius && z.attackTimer <= 0) {
        z.attackTimer = z.attackCooldown;
        this.damagePlayer(z.damage);
      }

      // Ataque a la Base
      const baseDist = Math.hypot(z.x - b.x, z.y - b.y);
      if (baseDist < z.radius + b.width / 2 && z.attackTimer <= 0) {
        z.attackTimer = z.attackCooldown;
        this.damageBase(z.damage);
      }
    }
  }

  private updateProjectiles(dt: number) {
    const p = this.player;
    const b = this.base;

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];

      proj.x += proj.vx * dt;
      proj.y += proj.vy * dt;
      proj.rangeRemaining -= Math.hypot(proj.vx * dt, proj.vy * dt);

      // Estela de partículas
      if (Math.random() < 0.45) {
        this.particles.push({
          x: proj.x,
          y: proj.y,
          vx: (Math.random() - 0.5) * 30,
          vy: (Math.random() - 0.5) * 30,
          radius: proj.radius * 0.65,
          color: proj.trailColor || proj.color,
          alpha: 0.6,
          decay: 2.5,
        });
      }

      // Impacto de proyectil enemigo contra jugador o base
      if (proj.isEnemy) {
        const dstToP = Math.hypot(proj.x - p.x, proj.y - p.y);
        if (dstToP < proj.radius + p.radius) {
          this.damagePlayer(proj.damage);
          this.createImpactSparks(proj.x, proj.y, '#a3e635');
          this.projectiles.splice(i, 1);
          continue;
        }

        const dstToB = Math.hypot(proj.x - b.x, proj.y - b.y);
        if (dstToB < proj.radius + b.width / 2) {
          this.damageBase(proj.damage);
          this.createImpactSparks(proj.x, proj.y, '#a3e635');
          this.projectiles.splice(i, 1);
          continue;
        }

        if (proj.rangeRemaining <= 0) {
          this.projectiles.splice(i, 1);
          continue;
        }
        continue;
      }

      // Impacto de proyectil aliado contra zombies
      let hitAny = false;
      for (let j = this.zombies.length - 1; j >= 0; j--) {
        const z = this.zombies[j];
        const dst = Math.hypot(proj.x - z.x, proj.y - z.y);

        if (dst < proj.radius + z.radius) {
          hitAny = true;

          // Daño al zombie
          this.damageZombie(z, proj.damage, proj.knockback, proj.vx, proj.vy);

          // Efecto de congelación
          if (proj.slowEffect) {
            z.slowTimer = proj.slowEffect.duration;
            z.speed = z.baseSpeed * proj.slowEffect.factor;
          }

          // Daño explosivo de área
          if (proj.explosiveRadius) {
            this.triggerExplosion(proj.x, proj.y, proj.explosiveRadius, proj.damage);
            this.projectiles.splice(i, 1);
            break;
          }

          // Descarga eléctrica en cadena (Tesla)
          if (proj.arcChains && proj.arcChains > 0) {
            this.triggerTeslaArc(z, proj.arcChains, proj.damage * 0.7);
          }

          proj.pierceCount--;
          if (proj.pierceCount <= 0) {
            this.createImpactSparks(proj.x, proj.y, proj.color);
            this.projectiles.splice(i, 1);
            break;
          }
        }
      }

      if (hitAny) continue;

      // Fin de rango
      if (proj.rangeRemaining <= 0) {
        if (proj.explosiveRadius) {
          this.triggerExplosion(proj.x, proj.y, proj.explosiveRadius, proj.damage);
        }
        this.projectiles.splice(i, 1);
      }
    }
  }

  private triggerTeslaArc(sourceZombie: Zombie, chains: number, damage: number) {
    sound.playTesla();
    let current = sourceZombie;
    const hitZombies = new Set<number>([sourceZombie.id]);

    for (let c = 0; c < chains; c++) {
      let nearestNext: Zombie | null = null;
      let minDst = 190;

      for (const other of this.zombies) {
        if (hitZombies.has(other.id)) continue;
        const d = Math.hypot(other.x - current.x, other.y - current.y);
        if (d < minDst) {
          minDst = d;
          nearestNext = other;
        }
      }

      if (nearestNext) {
        hitZombies.add(nearestNext.id);
        this.damageZombie(nearestNext, damage, 40, 0, 0);

        // Crear partículas del arco eléctrico
        for (let p = 0; p < 8; p++) {
          const t = p / 8;
          const arcX = current.x + (nearestNext.x - current.x) * t + (Math.random() - 0.5) * 16;
          const arcY = current.y + (nearestNext.y - current.y) * t + (Math.random() - 0.5) * 16;
          this.particles.push({
            x: arcX,
            y: arcY,
            vx: 0,
            vy: 0,
            radius: 2.5,
            color: '#67e8f9',
            alpha: 0.9,
            decay: 5,
            glow: true,
          });
        }

        current = nearestNext;
      } else {
        break;
      }
    }
  }

  private triggerExplosion(x: number, y: number, radius: number, maxDamage: number) {
    sound.playExplosion();
    this.addCameraShake(18);
    this.hitstop(0.04);

    // Partículas de fuego y humo
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 260;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 3 + Math.random() * 6,
        color: Math.random() < 0.6 ? '#f97316' : '#ef4444',
        alpha: 1,
        decay: 1.8 + Math.random() * 1.5,
      });
    }

    // Daño en área a zombies
    for (const z of this.zombies) {
      const dst = Math.hypot(z.x - x, z.y - y);
      if (dst < radius) {
        const falloff = 1 - dst / radius;
        const dmg = Math.round(maxDamage * Math.max(0.3, falloff));
        const pushAngle = Math.atan2(z.y - y, z.x - x);
        this.damageZombie(z, dmg, 380, Math.cos(pushAngle), Math.sin(pushAngle));
      }
    }
  }

  public damageZombie(z: Zombie, amount: number, knockback: number, dirX: number, dirY: number) {
    sound.playZombieHit();
    z.hp -= amount;
    z.hitFlashTimer = 0.08;

    // Empuje
    const dirLen = Math.hypot(dirX, dirY);
    if (dirLen > 0) {
      z.x += (dirX / dirLen) * knockback * 0.1;
      z.y += (dirY / dirLen) * knockback * 0.1;
    }

    // Texto flotante de daño
    const isCrit = amount > 70;
    this.floatingTexts.push({
      id: this.nextEntityId++,
      text: `${amount}`,
      x: z.x + (Math.random() - 0.5) * 20,
      y: z.y - 15,
      color: isCrit ? '#facc15' : '#ffffff',
      alpha: 1,
      vy: -40,
      scale: isCrit ? 1.4 : 1.0,
      isCrit,
    });

    // Salpicadura de sangre
    this.createBloodParticles(z.x, z.y, 4);

    if (z.hp <= 0) {
      this.killZombie(z);
    }
  }

  private killZombie(z: Zombie) {
    sound.playZombieDeath();

    // Recompensas
    const coinMultiplier = this.player.doublePointsTimer > 0 ? 2 : 1;
    const gainedCoins = z.coinValue * coinMultiplier;
    const gainedScore = z.scoreValue * coinMultiplier;

    this.player.coins += gainedCoins;
    this.player.score += gainedScore;
    this.player.kills++;

    // Texto de recompensa de monedas
    this.floatingTexts.push({
      id: this.nextEntityId++,
      text: `+${gainedCoins} 🪙`,
      x: z.x,
      y: z.y - 25,
      color: '#eab308',
      alpha: 1,
      vy: -55,
      scale: 1.1,
    });

    // Mancha de sangre permanente en el suelo
    if (this.decals.length > 120) {
      this.decals.shift();
    }
    this.decals.push({
      x: z.x,
      y: z.y,
      radius: 14 + Math.random() * 12,
      color: '#7f1d1d',
      alpha: 0.65,
      shapeVariant: Math.floor(Math.random() * 4),
    });

    // Partículas de eliminación
    this.createBloodParticles(z.x, z.y, 14);

    // Eliminar de la lista de zombies
    const idx = this.zombies.indexOf(z);
    if (idx !== -1) {
      this.zombies.splice(idx, 1);
    }
  }

  private damagePlayer(amount: number) {
    const p = this.player;
    if (p.invulnerableTimer > 0 || p.isDashing) return;

    sound.playPlayerHurt();
    this.addCameraShake(12);
    this.hitstop(0.05);

    p.hp -= amount;
    p.invulnerableTimer = 0.45; // Breve inmunidad tras impacto

    this.floatingTexts.push({
      id: this.nextEntityId++,
      text: `-${amount} HP`,
      x: p.x,
      y: p.y - 25,
      color: '#ef4444',
      alpha: 1,
      vy: -50,
      scale: 1.3,
    });

    if (p.hp <= 0) {
      p.hp = 0;
      this.triggerGameOver();
    }
  }

  private damageBase(amount: number) {
    const b = this.base;
    sound.playBaseHurt();
    this.addCameraShake(8);

    // Reducción por armadura
    const effectiveArmor = 1 + (b.armorLevel - 1) * 0.2;
    const actualDamage = Math.max(1, Math.round(amount / effectiveArmor));

    b.hp -= actualDamage;

    this.floatingTexts.push({
      id: this.nextEntityId++,
      text: `Base -${actualDamage}`,
      x: b.x + (Math.random() - 0.5) * 60,
      y: b.y - b.height / 2 - 10,
      color: '#f97316',
      alpha: 1,
      vy: -40,
      scale: 1.1,
    });

    if (b.hp <= 0) {
      b.hp = 0;
      this.triggerGameOver();
    }
  }

  private triggerGameOver() {
    this.isRunning = false;
    this.callbacks.onGameOver({
      round: this.round,
      kills: this.player.kills,
      score: this.player.score,
      coins: this.player.coins,
    });
  }

  // --------------------------------------------------------------------------------
  // GESTIÓN DE RONDAS Y OLEADAS
  // --------------------------------------------------------------------------------

  private updateRounds(dt: number) {
    if (this.inIntermission) {
      this.intermissionTimer -= dt;
      if (this.intermissionTimer <= 0) {
        this.startNextRound();
      }
      this.callbacks.onRoundUpdate(this.round, this.zombies.length, true);
      return;
    }

    // Spawn de zombies durante la ronda
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.zombiesSpawnedThisRound < this.zombiesToSpawnThisRound) {
      this.spawnZombie();
      this.spawnTimer = Math.max(0.4, this.spawnInterval * Math.pow(0.92, this.round - 1));
    }

    // Comprobar si la ronda se completó
    if (this.zombiesSpawnedThisRound >= this.zombiesToSpawnThisRound && this.zombies.length === 0) {
      this.completeRound();
    }

    this.callbacks.onRoundUpdate(
      this.round,
      (this.zombiesToSpawnThisRound - this.zombiesSpawnedThisRound) + this.zombies.length,
      false
    );
  }

  private spawnZombie() {
    this.zombiesSpawnedThisRound++;

    // Generar en el perímetro del mapa
    const perimeterSide = Math.floor(Math.random() * 4);
    let x = 0;
    let y = 0;
    const margin = 50;

    if (perimeterSide === 0) {
      // Arriba
      x = margin + Math.random() * (this.mapWidth - margin * 2);
      y = margin;
    } else if (perimeterSide === 1) {
      // Abajo
      x = margin + Math.random() * (this.mapWidth - margin * 2);
      y = this.mapHeight - margin;
    } else if (perimeterSide === 2) {
      // Izquierda
      x = margin;
      y = margin + Math.random() * (this.mapHeight - margin * 2);
    } else {
      // Derecha
      x = this.mapWidth - margin;
      y = margin + Math.random() * (this.mapHeight - margin * 2);
    }

    // Determinar tipo según la ronda
    let type: Zombie['type'] = 'walker';
    const rand = Math.random();

    if (this.round >= 5 && this.zombiesSpawnedThisRound === 1) {
      type = 'boss'; // Boss en cada ronda múltiplo de 5
    } else if (this.round >= 4 && rand < 0.15) {
      type = 'brute';
    } else if (this.round >= 3 && rand < 0.3) {
      type = 'spitter';
    } else if (this.round >= 2 && rand < 0.5) {
      type = 'runner';
    }

    const hpMult = 1 + (this.round - 1) * 0.22;
    const speedMult = Math.min(1.4, 1 + (this.round - 1) * 0.04);

    let zombie: Zombie;

    switch (type) {
      case 'runner':
        zombie = {
          id: this.nextEntityId++,
          type: 'runner',
          name: 'Corredor Infectado',
          x,
          y,
          vx: 0,
          vy: 0,
          radius: 14,
          hp: Math.round(35 * hpMult),
          maxHp: Math.round(35 * hpMult),
          speed: 210 * speedMult,
          baseSpeed: 210 * speedMult,
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
        zombie = {
          id: this.nextEntityId++,
          type: 'brute',
          name: 'Titán Bruto',
          x,
          y,
          vx: 0,
          vy: 0,
          radius: 28,
          hp: Math.round(320 * hpMult),
          maxHp: Math.round(320 * hpMult),
          speed: 85 * speedMult,
          baseSpeed: 85 * speedMult,
          damage: 35,
          attackCooldown: 1.6,
          attackTimer: 0,
          attackRange: 38,
          scoreValue: 120,
          coinValue: 65,
          hitFlashTimer: 0,
          color: '#581c87', // Dark purple
          eyeColor: '#ef4444',
          isBoss: false,
          slowTimer: 0,
          burnTimer: 0,
          target: 'base',
        };
        break;

      case 'spitter':
        zombie = {
          id: this.nextEntityId++,
          type: 'spitter',
          name: 'Escupidor Tóxico',
          x,
          y,
          vx: 0,
          vy: 0,
          radius: 17,
          hp: Math.round(65 * hpMult),
          maxHp: Math.round(65 * hpMult),
          speed: 125 * speedMult,
          baseSpeed: 125 * speedMult,
          damage: 18,
          attackCooldown: 2.0,
          attackTimer: 0,
          attackRange: 320,
          scoreValue: 70,
          coinValue: 35,
          hitFlashTimer: 0,
          color: '#15803d', // Toxic green
          eyeColor: '#a3e635',
          isBoss: false,
          slowTimer: 0,
          burnTimer: 0,
          target: 'base',
        };
        break;

      case 'boss':
        zombie = {
          id: this.nextEntityId++,
          type: 'boss',
          name: 'Gólem Abominación',
          x,
          y,
          vx: 0,
          vy: 0,
          radius: 42,
          hp: Math.round(950 * hpMult),
          maxHp: Math.round(950 * hpMult),
          speed: 95 * speedMult,
          baseSpeed: 95 * speedMult,
          damage: 55,
          attackCooldown: 1.4,
          attackTimer: 0,
          attackRange: 50,
          scoreValue: 600,
          coinValue: 300,
          hitFlashTimer: 0,
          color: '#881337', // Deep crimson
          eyeColor: '#fbbf24',
          isBoss: true,
          slowTimer: 0,
          burnTimer: 0,
          target: 'base',
        };
        break;

      case 'walker':
      default:
        zombie = {
          id: this.nextEntityId++,
          type: 'walker',
          name: 'Caminante Sediento',
          x,
          y,
          vx: 0,
          vy: 0,
          radius: 16,
          hp: Math.round(60 * hpMult),
          maxHp: Math.round(60 * hpMult),
          speed: 120 * speedMult,
          baseSpeed: 120 * speedMult,
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

    this.zombies.push(zombie);
  }

  private completeRound() {
    this.inIntermission = true;
    this.intermissionTimer = this.intermissionDuration;
    sound.playRoundStart();

    // Bonificación de fin de ronda
    const roundBonus = 120 + this.round * 35;
    this.player.coins += roundBonus;

    this.floatingTexts.push({
      id: this.nextEntityId++,
      text: `¡RONDA ${this.round} SUPERADA! +${roundBonus} 🪙`,
      x: this.player.x,
      y: this.player.y - 45,
      color: '#22c55e',
      alpha: 1,
      vy: -35,
      scale: 1.4,
      isCrit: true,
    });
  }

  private startNextRound() {
    this.round++;
    this.inIntermission = false;
    this.zombiesSpawnedThisRound = 0;
    this.zombiesToSpawnThisRound = Math.round(10 + this.round * 4.5);
    sound.playRoundStart();
  }

  // --------------------------------------------------------------------------------
  // ACCIONES DEL JUGADOR
  // --------------------------------------------------------------------------------

  public fireActiveWeapon() {
    const p = this.player;
    const w = p.weapons[p.activeWeaponIndex];

    // Verificar munición
    if (w.currentMag <= 0) {
      this.startReload();
      return;
    }

    // Consumir munición salvo que el buff de munición infinita esté activo
    if (p.infiniteAmmoTimer <= 0) {
      w.currentMag--;
    }

    p.shootCooldown = 1 / w.fireRate;

    // Reproducir sonido específico de arma
    switch (w.category) {
      case 'pistol':
        sound.playPistol();
        break;
      case 'shotgun':
        sound.playShotgun();
        this.addCameraShake(5);
        break;
      case 'explosive':
        sound.playShotgun();
        this.addCameraShake(9);
        break;
      case 'energy':
        if (w.id === 'tesla') sound.playTesla();
        else sound.playRayGun();
        break;
      case 'special':
        sound.playFreeze();
        break;
      case 'rifle':
      case 'smg':
      case 'heavy':
      default:
        sound.playRifle();
        this.addCameraShake(1.5);
        break;
    }

    // Disparar proyectil(es)
    const pellets = w.pellets || 1;
    for (let i = 0; i < pellets; i++) {
      const spreadAngle = (Math.random() - 0.5) * w.spread;
      const angle = p.angle + spreadAngle;

      const muzzleDistance = 24;
      const spawnX = p.x + Math.cos(p.angle) * muzzleDistance;
      const spawnY = p.y + Math.sin(p.angle) * muzzleDistance;

      this.projectiles.push({
        id: this.nextEntityId++,
        x: spawnX,
        y: spawnY,
        vx: Math.cos(angle) * w.bulletSpeed,
        vy: Math.sin(angle) * w.bulletSpeed,
        radius: w.bulletRadius,
        damage: w.damage,
        rangeRemaining: w.range,
        color: w.bulletColor,
        trailColor: w.bulletTrailColor,
        pierceCount: w.pierceCount,
        knockback: w.knockback,
        explosiveRadius: w.explosiveRadius,
        slowEffect: w.slowEffect,
        arcChains: w.arcChains,
        isEnemy: false,
      });

      // Muzzle flash particle
      this.particles.push({
        x: spawnX,
        y: spawnY,
        vx: Math.cos(angle) * 80,
        vy: Math.sin(angle) * 80,
        radius: 4,
        color: w.bulletColor,
        alpha: 0.9,
        decay: 14,
        glow: true,
      });
    }

    // Auto-recarga cuando se vacía el cargador
    if (w.currentMag <= 0) {
      this.startReload();
    }
  }

  public startReload() {
    const p = this.player;
    const w = p.weapons[p.activeWeaponIndex];

    if (p.reloading) return;
    if (w.currentMag >= w.magazineSize) return;
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
    p.shootCooldown = 0.2; // Breve retraso al desenfundar
    sound.playReload();
  }

  public performDash() {
    const p = this.player;
    if (p.dashTimer > 0 || p.stamina < 30) return;

    p.isDashing = true;
    p.dashTimer = p.dashCooldown;
    p.stamina -= 30;
    p.invulnerableTimer = 0.28; // I-frames durante el dash
    sound.playDash();

    // Efecto visual de estela
    for (let i = 0; i < 8; i++) {
      this.particles.push({
        x: p.x + (Math.random() - 0.5) * 15,
        y: p.y + (Math.random() - 0.5) * 15,
        vx: (Math.random() - 0.5) * 20,
        vy: (Math.random() - 0.5) * 20,
        radius: p.radius * 0.7,
        color: '#60a5fa',
        alpha: 0.5,
        decay: 3.5,
      });
    }
  }

  // --------------------------------------------------------------------------------
  // INTERACCIÓN: CAJA MISTERIOSA & TALLER DE MEJORAS
  // --------------------------------------------------------------------------------

  private updateProximityChecks() {
    const p = this.player;
    const box = this.mysteryBox;

    const dstToBox = Math.hypot(p.x - box.x, p.y - box.y);
    const isNearBox = dstToBox < 90;
    this.callbacks.onNearMysteryBox(isNearBox);

    const workshop = this.workshopLocation;
    const dstToWorkshop = Math.hypot(p.x - workshop.x, p.y - workshop.y);
    const isNearWorkshop = dstToWorkshop < 90;
    this.callbacks.onNearWorkshop(isNearWorkshop);
  }

  public interact() {
    const p = this.player;

    // Proximidad a Caja Misteriosa
    const dstToBox = Math.hypot(p.x - this.mysteryBox.x, p.y - this.mysteryBox.y);
    if (dstToBox < 90) {
      this.openMysteryBox();
      return;
    }

    // Proximidad al Taller de la Base
    const dstToWorkshop = Math.hypot(p.x - this.workshopLocation.x, p.y - this.workshopLocation.y);
    if (dstToWorkshop < 90) {
      // Abre el panel de mejoras
      return;
    }
  }

  public openMysteryBox(): boolean {
    if (this.player.coins < this.mysteryBox.cost) {
      this.floatingTexts.push({
        id: this.nextEntityId++,
        text: `¡Necesitas ${this.mysteryBox.cost} monedas!`,
        x: this.mysteryBox.x,
        y: this.mysteryBox.y - 30,
        color: '#ef4444',
        alpha: 1,
        vy: -35,
        scale: 1.1,
      });
      return false;
    }

    // Descontar monedas
    this.player.coins -= this.mysteryBox.cost;
    sound.playCoin();

    // Obtener premio de la caja con probabilidades
    const drop = rollMysteryBox();
    this.callbacks.onOpenMysteryBoxResult(drop);

    return true;
  }

  public applyMysteryDrop(drop: MysteryBoxDrop) {
    if (drop.type === 'weapon' && drop.weaponTemplate && drop.weaponTemplate.id) {
      const weaponInstance = createWeaponInstance(drop.weaponTemplate.id);

      // Si el jugador ya tiene el arma, rellenar su munición y mejorarla gratis
      const existingIdx = this.player.weapons.findIndex((w) => w.id === weaponInstance.id);
      if (existingIdx !== -1) {
        const existing = this.player.weapons[existingIdx];
        existing.reserveAmmo = existing.maxReserveAmmo;
        existing.currentMag = existing.magazineSize;
        this.floatingTexts.push({
          id: this.nextEntityId++,
          text: `¡${existing.name} Munición Rellenada!`,
          x: this.player.x,
          y: this.player.y - 40,
          color: '#38bdf8',
          alpha: 1,
          vy: -40,
          scale: 1.2,
        });
      } else {
        // Añadir a inventario (máximo 4 armas; si tiene 4, reemplaza el arma activa)
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
    } else if (drop.type === 'heal') {
      if (drop.id === 'drop_medikit_full') {
        this.player.hp = this.player.maxHp;
        this.floatingTexts.push({
          id: this.nextEntityId++,
          text: `+100 HP Salud Restaurada`,
          x: this.player.x,
          y: this.player.y - 40,
          color: '#22c55e',
          alpha: 1,
          vy: -40,
          scale: 1.3,
          isCrit: true,
        });
      } else if (drop.id === 'drop_base_repair') {
        this.base.hp = Math.min(this.base.maxHp, this.base.hp + 400);
        this.floatingTexts.push({
          id: this.nextEntityId++,
          text: `+400 HP Reparación de Base`,
          x: this.base.x,
          y: this.base.y - 40,
          color: '#10b981',
          alpha: 1,
          vy: -40,
          scale: 1.3,
          isCrit: true,
        });
      } else if (drop.id === 'drop_max_ammo') {
        for (const w of this.player.weapons) {
          w.reserveAmmo = w.maxReserveAmmo;
          w.currentMag = w.magazineSize;
        }
        this.floatingTexts.push({
          id: this.nextEntityId++,
          text: `¡MUNICIÓN MÁXIMA PARA TODO!`,
          x: this.player.x,
          y: this.player.y - 40,
          color: '#eab308',
          alpha: 1,
          vy: -40,
          scale: 1.4,
          isCrit: true,
        });
      }
    } else if (drop.type === 'buff') {
      if (drop.buffType === 'nuke') {
        sound.playNuke();
        this.addCameraShake(22);
        this.hitstop(0.08);

        // Aniquilar zombies visibles en pantalla
        for (const z of [...this.zombies]) {
          this.killZombie(z);
        }
        this.player.coins += 400;

        this.floatingTexts.push({
          id: this.nextEntityId++,
          text: `¡BOMBA NUCLEAR ACTIVADA! +400 🪙`,
          x: this.player.x,
          y: this.player.y - 50,
          color: '#f97316',
          alpha: 1,
          vy: -45,
          scale: 1.5,
          isCrit: true,
        });
      } else if (drop.buffType === 'double_points') {
        this.player.doublePointsTimer = drop.buffDuration || 30;
      } else if (drop.buffType === 'infinite_ammo') {
        this.player.infiniteAmmoTimer = drop.buffDuration || 20;
      }
    }
  }

  // --------------------------------------------------------------------------------
  // EFECTOS VISUALES Y CÁMARA
  // --------------------------------------------------------------------------------

  public addCameraShake(intensity: number) {
    this.camera.shakeIntensity = Math.min(30, this.camera.shakeIntensity + intensity);
  }

  public hitstop(durationSec: number) {
    this.hitstopTimer = durationSec;
  }

  private updateCamera(dt: number) {
    // Seguir suavemente al jugador
    const targetX = this.player.x;
    const targetY = this.player.y;

    this.camera.x += (targetX - this.camera.x) * 8 * dt;
    this.camera.y += (targetY - this.camera.y) * 8 * dt;

    // Clamping de cámara a bordes del mapa
    const halfW = this.canvas.width / 2;
    const halfH = this.canvas.height / 2;
    this.camera.x = Math.max(halfW, Math.min(this.mapWidth - halfW, this.camera.x));
    this.camera.y = Math.max(halfH, Math.min(this.mapHeight - halfH, this.camera.y));

    // Decaimiento del temblor
    if (this.camera.shakeIntensity > 0) {
      this.camera.shakeX = (Math.random() - 0.5) * this.camera.shakeIntensity;
      this.camera.shakeY = (Math.random() - 0.5) * this.camera.shakeIntensity;
      this.camera.shakeIntensity = Math.max(0, this.camera.shakeIntensity - 40 * dt);
    } else {
      this.camera.shakeX = 0;
      this.camera.shakeY = 0;
    }
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha -= p.decay * dt;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private updateFloatingTexts(dt: number) {
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy * dt;
      ft.alpha -= 0.9 * dt;
      if (ft.alpha <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  private createImpactSparks(x: number, y: number, color: string) {
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 140;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 2,
        color,
        alpha: 1,
        decay: 6,
        glow: true,
      });
    }
  }

  private createBloodParticles(x: number, y: number, count: number) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 160;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 2.5 + Math.random() * 2.5,
        color: Math.random() < 0.7 ? '#991b1b' : '#7f1d1d',
        alpha: 0.9,
        decay: 3.2,
      });
    }
  }

  // --------------------------------------------------------------------------------
  // RENDERIZADO COMPLETO DEL MUNDO Y EFECTOS
  // --------------------------------------------------------------------------------

  private render() {
    const ctx = this.ctx;
    const cw = this.canvas.width;
    const ch = this.canvas.height;

    ctx.save();
    ctx.clearRect(0, 0, cw, ch);

    // Fondo oscuro apocalíptico
    ctx.fillStyle = '#090a0f';
    ctx.fillRect(0, 0, cw, ch);

    // Transformación de Cámara
    ctx.translate(
      cw / 2 - this.camera.x + this.camera.shakeX,
      ch / 2 - this.camera.y + this.camera.shakeY
    );

    // 1. Suelo del mapa con cuadrícula militar desgastada
    this.renderGround();

    // 2. Calcomanías de sangre permanente
    this.renderDecals();

    // 3. Estructuras de la Base, Búnker y Barricadas
    this.renderBase();

    // 4. Caja Misteriosa
    this.renderMysteryBox();

    // 5. Taller de Mejoras de la Base
    this.renderWorkshop();

    // 6. Zombies de la horda
    this.renderZombies();

    // 7. Jugador
    this.renderPlayer();

    // 8. Proyectiles y balas
    this.renderProjectiles();

    // 9. Partículas de impacto, sangre y humo
    this.renderParticles();

    // 10. Iluminación dinámica (Linterna del jugador y luces de la base)
    this.renderLighting();

    // 11. Textos flotantes de daño y monedas
    this.renderFloatingTexts();

    ctx.restore();
  }

  private renderGround() {
    const ctx = this.ctx;

    // Área exterior de tierra oscura
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, this.mapWidth, this.mapHeight);

    // Cuadrícula táctica de baldosas de hormigón reforzado
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.25)';
    ctx.lineWidth = 1;
    const gridSize = 80;

    for (let x = 0; x < this.mapWidth; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.mapHeight);
      ctx.stroke();
    }
    for (let y = 0; y < this.mapHeight; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.mapWidth, y);
      ctx.stroke();
    }

    // Líneas de peligro perimetrales (marcas amarillas/negras)
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 4;
    ctx.strokeRect(40, 40, this.mapWidth - 80, this.mapHeight - 80);
  }

  private renderDecals() {
    const ctx = this.ctx;
    for (const d of this.decals) {
      ctx.save();
      ctx.fillStyle = d.color;
      ctx.globalAlpha = d.alpha;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.radius, 0, Math.PI * 2);
      ctx.fill();

      // Salpicadura irregular
      ctx.beginPath();
      ctx.arc(d.x + d.radius * 0.4, d.y - d.radius * 0.3, d.radius * 0.45, 0, Math.PI * 2);
      ctx.arc(d.x - d.radius * 0.5, d.y + d.radius * 0.2, d.radius * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private renderBase() {
    const ctx = this.ctx;
    const b = this.base;

    // Zona de defensa perimetral
    ctx.save();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.strokeRect(b.x - 220, b.y - 220, 440, 440);
    ctx.setLineDash([]);

    // Búnker central fortificado (Hormigón y acero)
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(b.x - b.width / 2, b.y - b.height / 2, b.width, b.height, 12);
    ctx.fill();
    ctx.stroke();

    // Núcleo energético central
    const pulse = 0.7 + Math.sin(performance.now() * 0.005) * 0.3;
    ctx.fillStyle = `rgba(14, 165, 233, ${pulse * 0.8})`;
    ctx.beginPath();
    ctx.arc(b.x, b.y, 24, 0, Math.PI * 2);
    ctx.fill();

    // Torreta automática sobre el techo
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.turretAngle);

    // Base giratoria de la torreta
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Cañones duales
    ctx.fillStyle = '#64748b';
    ctx.fillRect(8, -6, 22, 4);
    ctx.fillRect(8, 2, 22, 4);
    ctx.restore();

    // Barra de Vida de la Base
    const hpRatio = Math.max(0, b.hp / b.maxHp);
    const barW = 120;
    const barH = 10;
    const barX = b.x - barW / 2;
    const barY = b.y - b.height / 2 - 20;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);

    ctx.fillStyle = hpRatio > 0.5 ? '#10b981' : hpRatio > 0.25 ? '#f59e0b' : '#ef4444';
    ctx.fillRect(barX, barY, barW * hpRatio, barH);

    ctx.restore();
  }

  private renderMysteryBox() {
    const ctx = this.ctx;
    const box = this.mysteryBox;

    ctx.save();
    // Brillo místico vertical
    const time = performance.now() * 0.003;
    const glow = 0.5 + Math.sin(time * 3) * 0.3;

    ctx.fillStyle = `rgba(56, 189, 248, ${glow * 0.35})`;
    ctx.beginPath();
    ctx.ellipse(box.x, box.y, 35, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    // Haz de luz místico hacia arriba
    const grad = ctx.createLinearGradient(box.x, box.y, box.x, box.y - 120);
    grad.addColorStop(0, `rgba(56, 189, 248, ${glow * 0.4})`);
    grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(box.x - 18, box.y);
    ctx.lineTo(box.x + 18, box.y);
    ctx.lineTo(box.x + 6, box.y - 120);
    ctx.lineTo(box.x - 6, box.y - 120);
    ctx.closePath();
    ctx.fill();

    // Cuerpo de la caja (metal reforzado con detalles dorados)
    ctx.fillStyle = '#1e1b4b'; // Deep mystic indigo
    ctx.strokeStyle = '#fbbf24'; // Gold trims
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(box.x - box.width / 2, box.y - box.height / 2, box.width, box.height, 6);
    ctx.fill();
    ctx.stroke();

    // Símbolo de interrogación místico flotando
    const bob = Math.sin(time * 2) * 5;
    ctx.font = 'bold 22px "Oswald", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fbbf24';
    ctx.fillText('?', box.x, box.y - 28 + bob);

    // Indicador de proximidad si el jugador está cerca
    const dst = Math.hypot(this.player.x - box.x, this.player.y - box.y);
    if (dst < 90) {
      ctx.font = 'bold 12px "JetBrains Mono", monospace';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`[E] Abrir (${box.cost} 🪙)`, box.x, box.y + 32);
    }

    ctx.restore();
  }

  private renderWorkshop() {
    const ctx = this.ctx;
    const ws = this.workshopLocation;

    ctx.save();
    // Tarima de mantenimiento
    ctx.fillStyle = '#334155';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(ws.x - 24, ws.y - 20, 48, 40, 6);
    ctx.fill();
    ctx.stroke();

    // Icono de herramientas
    ctx.font = '18px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🛠️', ws.x, ws.y);

    const dst = Math.hypot(this.player.x - ws.x, this.player.y - ws.y);
    if (dst < 90) {
      ctx.font = 'bold 12px "JetBrains Mono", monospace';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('[E] Taller & Mejoras', ws.x, ws.y + 32);
    }
    ctx.restore();
  }

  private renderZombies() {
    const ctx = this.ctx;

    for (const z of this.zombies) {
      ctx.save();

      // Sombra
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.ellipse(z.x, z.y + z.radius * 0.7, z.radius * 0.9, z.radius * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();

      // Efecto congelado
      const isSlowed = z.slowTimer > 0;

      // Color del cuerpo (o blanco en hit flash)
      if (z.hitFlashTimer > 0) {
        ctx.fillStyle = '#ffffff';
      } else if (isSlowed) {
        ctx.fillStyle = '#38bdf8';
      } else {
        ctx.fillStyle = z.color;
      }

      ctx.beginPath();
      ctx.arc(z.x, z.y, z.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = isSlowed ? '#bae6fd' : '#1e293b';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Ojos brillantes amenazantes
      const lookAngle = Math.atan2(
        (z.target === 'player' ? this.player.y : this.base.y) - z.y,
        (z.target === 'player' ? this.player.x : this.base.x) - z.x
      );

      const eyeOffset = z.radius * 0.45;
      const eyeSpread = 0.5;

      const eye1X = z.x + Math.cos(lookAngle - eyeSpread) * eyeOffset;
      const eye1Y = z.y + Math.sin(lookAngle - eyeSpread) * eyeOffset;
      const eye2X = z.x + Math.cos(lookAngle + eyeSpread) * eyeOffset;
      const eye2Y = z.y + Math.sin(lookAngle + eyeSpread) * eyeOffset;

      ctx.fillStyle = z.eyeColor;
      ctx.beginPath();
      ctx.arc(eye1X, eye1Y, z.radius * 0.16, 0, Math.PI * 2);
      ctx.arc(eye2X, eye2Y, z.radius * 0.16, 0, Math.PI * 2);
      ctx.fill();

      // Barra de Vida miniatura sobre el zombie
      if (z.hp < z.maxHp || z.isBoss) {
        const barW = z.radius * 2.2;
        const barH = z.isBoss ? 6 : 4;
        const hpRatio = Math.max(0, z.hp / z.maxHp);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(z.x - barW / 2, z.y - z.radius - 10, barW, barH);
        ctx.fillStyle = z.isBoss ? '#f43f5e' : '#22c55e';
        ctx.fillRect(z.x - barW / 2, z.y - z.radius - 10, barW * hpRatio, barH);
      }

      ctx.restore();
    }
  }

  private renderPlayer() {
    const ctx = this.ctx;
    const p = this.player;

    ctx.save();
    ctx.translate(p.x, p.y);

    // Sombra del jugador
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.ellipse(0, p.radius * 0.7, p.radius * 0.85, p.radius * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Rotación del jugador hacia el cursor
    ctx.rotate(p.angle);

    // Cuerpo del superviviente (traje táctico)
    const activeWeapon = p.weapons[p.activeWeaponIndex];

    // Arma sostenida en las manos
    ctx.fillStyle = activeWeapon.rarity === 'legendary' ? '#10b981' : activeWeapon.rarity === 'epic' ? '#ef4444' : '#64748b';
    ctx.fillRect(8, 4, 18, 5);

    // Torso del jugador
    ctx.fillStyle = p.invulnerableTimer > 0 ? '#60a5fa' : '#2563eb'; // Azul táctico
    ctx.beginPath();
    ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Casco / Gafas de visión nocturna
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(4, 0, p.radius * 0.45, 0, Math.PI * 2);
    ctx.fill();

    // Visor táctico ámbar
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(7, -3, 4, 6);

    ctx.restore();
  }

  private renderProjectiles() {
    const ctx = this.ctx;

    for (const proj of this.projectiles) {
      ctx.save();
      ctx.fillStyle = proj.color;
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
      ctx.fill();

      // Brillo exterior
      ctx.shadowColor = proj.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, proj.radius * 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private renderParticles() {
    const ctx = this.ctx;
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      if (p.glow) {
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private renderLighting() {
    const ctx = this.ctx;
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    const p = this.player;

    ctx.save();

    // Capa de oscuridad ambiental nocturna (semi-transparente para atmósfera survival)
    // El cono de la linterna y las fuentes de luz perforan la oscuridad
    const lightCanvas = document.createElement('canvas');
    lightCanvas.width = cw;
    lightCanvas.height = ch;
    const lCtx = lightCanvas.getContext('2d')!;

    // Oscuridad nocturna global
    lCtx.fillStyle = 'rgba(4, 7, 18, 0.76)';
    lCtx.fillRect(0, 0, cw, ch);

    // Modo de fusión de corte
    lCtx.globalCompositeOperation = 'destination-out';

    // Cono de la linterna del jugador
    const screenPx = p.x - (this.camera.x - cw / 2);
    const screenPy = p.y - (this.camera.y - ch / 2);

    const flashGrad = lCtx.createRadialGradient(screenPx, screenPy, 10, screenPx, screenPy, 360);
    flashGrad.addColorStop(0, 'rgba(0,0,0,1)');
    flashGrad.addColorStop(0.7, 'rgba(0,0,0,0.8)');
    flashGrad.addColorStop(1, 'rgba(0,0,0,0)');

    lCtx.fillStyle = flashGrad;
    lCtx.beginPath();
    lCtx.moveTo(screenPx, screenPy);
    lCtx.arc(screenPx, screenPy, 380, p.angle - 0.55, p.angle + 0.55);
    lCtx.closePath();
    lCtx.fill();

    // Luz ambiental circular alrededor del jugador
    const playerGrad = lCtx.createRadialGradient(screenPx, screenPy, 10, screenPx, screenPy, 95);
    playerGrad.addColorStop(0, 'rgba(0,0,0,0.9)');
    playerGrad.addColorStop(1, 'rgba(0,0,0,0)');
    lCtx.fillStyle = playerGrad;
    lCtx.beginPath();
    lCtx.arc(screenPx, screenPy, 95, 0, Math.PI * 2);
    lCtx.fill();

    // Luz de la Base
    const screenBx = this.base.x - (this.camera.x - cw / 2);
    const screenBy = this.base.y - (this.camera.y - ch / 2);
    const baseGrad = lCtx.createRadialGradient(screenBx, screenBy, 30, screenBx, screenBy, 240);
    baseGrad.addColorStop(0, 'rgba(0,0,0,0.85)');
    baseGrad.addColorStop(1, 'rgba(0,0,0,0)');
    lCtx.fillStyle = baseGrad;
    lCtx.beginPath();
    lCtx.arc(screenBx, screenBy, 240, 0, Math.PI * 2);
    lCtx.fill();

    // Luz de la Caja Misteriosa
    const screenMx = this.mysteryBox.x - (this.camera.x - cw / 2);
    const screenMy = this.mysteryBox.y - (this.camera.y - ch / 2);
    const boxGrad = lCtx.createRadialGradient(screenMx, screenMy, 15, screenMx, screenMy, 130);
    boxGrad.addColorStop(0, 'rgba(0,0,0,0.9)');
    boxGrad.addColorStop(1, 'rgba(0,0,0,0)');
    lCtx.fillStyle = boxGrad;
    lCtx.beginPath();
    lCtx.arc(screenMx, screenMy, 130, 0, Math.PI * 2);
    lCtx.fill();

    // Dibujar la capa de iluminación sobre la pantalla
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform a coordenadas de pantalla
    ctx.drawImage(lightCanvas, 0, 0);

    ctx.restore();
  }

  private renderFloatingTexts() {
    const ctx = this.ctx;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const ft of this.floatingTexts) {
      ctx.globalAlpha = Math.max(0, ft.alpha);
      ctx.font = `bold ${Math.round(14 * ft.scale)}px "JetBrains Mono", monospace`;

      // Sombra de texto
      ctx.fillStyle = '#000000';
      ctx.fillText(ft.text, ft.x + 1, ft.y + 1);

      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
    }
    ctx.restore();
  }
}
