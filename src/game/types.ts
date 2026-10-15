/**
 * Tipos y estructuras de datos para Zona Cero: Horda Zombie
 */

export type WeaponRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface WeaponUpgrade {
  damageLevel: number;
  fireRateLevel: number;
  magLevel: number;
  reloadLevel: number;
}

export interface Weapon {
  id: string;
  name: string;
  category: 'pistol' | 'shotgun' | 'rifle' | 'smg' | 'heavy' | 'explosive' | 'energy' | 'special';
  rarity: WeaponRarity;
  description: string;
  baseDamage: number;
  damage: number;
  fireRate: number; // Disparos por segundo
  magazineSize: number;
  currentMag: number;
  reserveAmmo: number;
  maxReserveAmmo: number;
  isInfiniteReserve: boolean;
  reloadTime: number; // Segundos
  bulletSpeed: number;
  bulletRadius: number;
  range: number;
  spread: number; // Radianes de dispersión
  pellets: number; // Para escopetas (balas por disparo)
  bulletColor: string;
  bulletTrailColor?: string;
  knockback: number;
  pierceCount: number; // Cuántos zombies atraviesa
  explosiveRadius?: number; // Radio de explosión si aplica
  slowEffect?: { factor: number; duration: number }; // Para cañón criogénico
  arcChains?: number; // Para rayo tesla
  upgradeLevel: number;
  maxUpgradeLevel: number;
}

export type MysteryDropType = 'weapon' | 'heal' | 'buff';

export interface MysteryBoxDrop {
  id: string;
  name: string;
  type: MysteryDropType;
  rarity: WeaponRarity;
  description: string;
  color: string;
  iconName: string;
  weaponTemplate?: Partial<Weapon>;
  healAmount?: number; // Para curación de jugador o base
  healTarget?: 'player' | 'base' | 'both';
  buffType?: 'double_points' | 'infinite_ammo' | 'nuke' | 'speed_boost';
  buffDuration?: number; // Segundos
}

export type ZombieType = 'walker' | 'runner' | 'brute' | 'spitter' | 'boss';

export interface Zombie {
  id: number;
  type: ZombieType;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hp: number;
  maxHp: number;
  speed: number;
  baseSpeed: number;
  damage: number;
  attackCooldown: number;
  attackTimer: number;
  attackRange: number;
  scoreValue: number;
  coinValue: number;
  hitFlashTimer: number;
  color: string;
  eyeColor: string;
  isBoss: boolean;
  slowTimer: number;
  burnTimer: number;
  chargeTimer?: number; // Para brutes o boss
  spitTimer?: number; // Para spitter
  target: 'player' | 'base';
}

export interface Projectile {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  rangeRemaining: number;
  color: string;
  trailColor?: string;
  pierceCount: number;
  knockback: number;
  explosiveRadius?: number;
  slowEffect?: { factor: number; duration: number };
  arcChains?: number;
  isEnemy: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  decay: number;
  glow?: boolean;
}

export interface BloodDecal {
  x: number;
  y: number;
  radius: number;
  color: string;
  alpha: number;
  shapeVariant: number;
}

export interface FloatingText {
  id: number;
  text: string;
  x: number;
  y: number;
  color: string;
  alpha: number;
  vy: number;
  scale: number;
  isCrit?: boolean;
}

export interface DefenseBase {
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  armorLevel: number;
  turretLevel: number;
  turretRange: number;
  turretFireRate: number;
  turretCooldown: number;
  turretAngle: number;
  repairCost: number;
}

export interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hp: number;
  maxHp: number;
  speed: number;
  stamina: number;
  maxStamina: number;
  dashCooldown: number;
  dashTimer: number;
  isDashing: boolean;
  angle: number;
  activeWeaponIndex: number;
  weapons: Weapon[];
  coins: number;
  score: number;
  kills: number;
  reloading: boolean;
  reloadProgress: number; // 0 to 1
  shootCooldown: number;
  invulnerableTimer: number;
  speedBuffTimer: number;
  doublePointsTimer: number;
  infiniteAmmoTimer: number;
}

export type CameraMode = 'third_person' | 'first_person' | 'drone';

export interface GameSettings {
  soundEnabled: boolean;
  volume: number;
  screenShake: boolean;
  showDamageNumbers: boolean;
  particles: boolean;
  cameraMode: CameraMode;
}

export type GameState = 'TITLE_MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';

export interface MysteryBoxLocation {
  x: number;
  y: number;
  width: number;
  height: number;
  cost: number;
  isOpen: boolean;
  isSpinning: boolean;
}
