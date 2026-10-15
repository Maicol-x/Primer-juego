import { Weapon, MysteryBoxDrop, DefenseBase } from './types';

export const WEAPON_DEFINITIONS: Record<string, Weapon> = {
  // Arma inicial
  pistol: {
    id: 'pistol',
    name: 'Pistola M9 Táctica',
    category: 'pistol',
    rarity: 'common',
    description: 'Arma de mano estándar de alta fiabilidad. Munición de reserva ilimitada.',
    baseDamage: 22,
    damage: 22,
    fireRate: 3.5, // 3.5 disparos/seg
    magazineSize: 12,
    currentMag: 12,
    reserveAmmo: 9999,
    maxReserveAmmo: 9999,
    isInfiniteReserve: true,
    reloadTime: 1.2,
    bulletSpeed: 750,
    bulletRadius: 3.5,
    range: 650,
    spread: 0.05,
    pellets: 1,
    bulletColor: '#fbbf24', // Amber
    bulletTrailColor: '#fef08a',
    knockback: 120,
    pierceCount: 1,
    upgradeLevel: 1,
    maxUpgradeLevel: 5,
  },

  // Armas Raras
  spas12: {
    id: 'spas12',
    name: 'Escopeta SPAS-12',
    category: 'shotgun',
    rarity: 'rare',
    description: 'Devastador poder de dispersión a corto alcance. Empuja a los zombies hacia atrás.',
    baseDamage: 18,
    damage: 18, // 18 por perdigón x 6 = 108 daño potencial
    fireRate: 1.4,
    magazineSize: 8,
    currentMag: 8,
    reserveAmmo: 64,
    maxReserveAmmo: 96,
    isInfiniteReserve: false,
    reloadTime: 2.1,
    bulletSpeed: 680,
    bulletRadius: 3.2,
    range: 480,
    spread: 0.28,
    pellets: 7,
    bulletColor: '#fb923c', // Orange
    bulletTrailColor: '#fdba74',
    knockback: 320,
    pierceCount: 1,
    upgradeLevel: 1,
    maxUpgradeLevel: 5,
  },

  m4a1: {
    id: 'm4a1',
    name: 'Fusil de Asalto M4A1',
    category: 'rifle',
    rarity: 'rare',
    description: 'Fusil automático militar equilibrado con ráfagas continuas y alcance extendido.',
    baseDamage: 32,
    damage: 32,
    fireRate: 7.5,
    magazineSize: 30,
    currentMag: 30,
    reserveAmmo: 180,
    maxReserveAmmo: 240,
    isInfiniteReserve: false,
    reloadTime: 1.6,
    bulletSpeed: 820,
    bulletRadius: 3.5,
    range: 780,
    spread: 0.07,
    pellets: 1,
    bulletColor: '#38bdf8', // Light blue
    bulletTrailColor: '#bae6fd',
    knockback: 140,
    pierceCount: 2,
    upgradeLevel: 1,
    maxUpgradeLevel: 5,
  },

  vector: {
    id: 'vector',
    name: 'Subfusil Kriss Vector',
    category: 'smg',
    rarity: 'rare',
    description: 'Cadencia de fuego frenética. Ideal para triturar hordas de corredores veloces.',
    baseDamage: 24,
    damage: 24,
    fireRate: 12.0,
    magazineSize: 40,
    currentMag: 40,
    reserveAmmo: 240,
    maxReserveAmmo: 320,
    isInfiniteReserve: false,
    reloadTime: 1.3,
    bulletSpeed: 780,
    bulletRadius: 3.0,
    range: 580,
    spread: 0.12,
    pellets: 1,
    bulletColor: '#a855f7', // Purple
    bulletTrailColor: '#e9d5ff',
    knockback: 90,
    pierceCount: 1,
    upgradeLevel: 1,
    maxUpgradeLevel: 5,
  },

  // Armas Épicas
  rpg7: {
    id: 'rpg7',
    name: 'Lanzacohetes RPG-7',
    category: 'explosive',
    rarity: 'epic',
    description: 'Dispara un cohete de alto calibre que detona en área al impactar. Causa temblor masivo.',
    baseDamage: 240,
    damage: 240,
    fireRate: 0.75,
    magazineSize: 2,
    currentMag: 2,
    reserveAmmo: 14,
    maxReserveAmmo: 20,
    isInfiniteReserve: false,
    reloadTime: 2.8,
    bulletSpeed: 520,
    bulletRadius: 6.5,
    range: 850,
    spread: 0.03,
    pellets: 1,
    bulletColor: '#ef4444', // Red
    bulletTrailColor: '#fca5a5',
    knockback: 450,
    pierceCount: 1,
    explosiveRadius: 130,
    upgradeLevel: 1,
    maxUpgradeLevel: 5,
  },

  vulcan: {
    id: 'vulcan',
    name: 'Ametralladora Pesada Minigun',
    category: 'heavy',
    rarity: 'epic',
    description: 'Tambor masivo de 100 cartuchos. Dispersión continua de plomo de alto impacto.',
    baseDamage: 38,
    damage: 38,
    fireRate: 14.0,
    magazineSize: 100,
    currentMag: 100,
    reserveAmmo: 300,
    maxReserveAmmo: 400,
    isInfiniteReserve: false,
    reloadTime: 3.2,
    bulletSpeed: 800,
    bulletRadius: 4.0,
    range: 720,
    spread: 0.16,
    pellets: 1,
    bulletColor: '#f59e0b',
    bulletTrailColor: '#fde68a',
    knockback: 180,
    pierceCount: 2,
    upgradeLevel: 1,
    maxUpgradeLevel: 5,
  },

  // Armas Legendarias (Exclusivas de la Caja Misteriosa o eventos)
  raygun: {
    id: 'raygun',
    name: 'Rayo Cósmico Z-900',
    category: 'energy',
    rarity: 'legendary',
    description: 'Arma extraterrestre de energía de plasma puro. Desintegra y atraviesa hasta 5 objetivos.',
    baseDamage: 110,
    damage: 110,
    fireRate: 4.0,
    magazineSize: 20,
    currentMag: 20,
    reserveAmmo: 120,
    maxReserveAmmo: 160,
    isInfiniteReserve: false,
    reloadTime: 1.8,
    bulletSpeed: 950,
    bulletRadius: 6.0,
    range: 900,
    spread: 0.02,
    pellets: 1,
    bulletColor: '#10b981', // Emerald neon
    bulletTrailColor: '#6ee7b7',
    knockback: 250,
    pierceCount: 5,
    explosiveRadius: 45,
    upgradeLevel: 1,
    maxUpgradeLevel: 5,
  },

  tesla: {
    id: 'tesla',
    name: 'Fusil Tesla Arc Storm',
    category: 'energy',
    rarity: 'legendary',
    description: 'Descargas voltaicas que saltan en cadena hasta 4 zombies cercanos provocando parálisis.',
    baseDamage: 95,
    damage: 95,
    fireRate: 3.0,
    magazineSize: 16,
    currentMag: 16,
    reserveAmmo: 96,
    maxReserveAmmo: 140,
    isInfiniteReserve: false,
    reloadTime: 1.9,
    bulletSpeed: 1100,
    bulletRadius: 5.0,
    range: 750,
    spread: 0.02,
    pellets: 1,
    bulletColor: '#06b6d4', // Cyan electric
    bulletTrailColor: '#67e8f9',
    knockback: 200,
    pierceCount: 1,
    arcChains: 4,
    upgradeLevel: 1,
    maxUpgradeLevel: 5,
  },

  cryo: {
    id: 'cryo',
    name: 'Cañón Criogénico Glaciar',
    category: 'special',
    rarity: 'legendary',
    description: 'Proyectiles de nitrógeno líquido. Ralentiza a los zombies en 75% y causa escarcha mortal.',
    baseDamage: 85,
    damage: 85,
    fireRate: 5.0,
    magazineSize: 25,
    currentMag: 25,
    reserveAmmo: 150,
    maxReserveAmmo: 200,
    isInfiniteReserve: false,
    reloadTime: 1.7,
    bulletSpeed: 700,
    bulletRadius: 7.0,
    range: 650,
    spread: 0.1,
    pellets: 2,
    bulletColor: '#60a5fa', // Blue ice
    bulletTrailColor: '#bfdbfe',
    knockback: 160,
    pierceCount: 3,
    slowEffect: { factor: 0.25, duration: 4.5 },
    upgradeLevel: 1,
    maxUpgradeLevel: 5,
  },
};

/**
 * Clonar arma para no mutar definiciones base
 */
export function createWeaponInstance(weaponId: string): Weapon {
  const def = WEAPON_DEFINITIONS[weaponId] || WEAPON_DEFINITIONS.pistol;
  return JSON.parse(JSON.stringify(def));
}

/**
 * Calculador de costos de mejora de armas
 */
export function getWeaponUpgradeCost(weapon: Weapon): number {
  const baseCost = weapon.rarity === 'legendary' ? 600 : weapon.rarity === 'epic' ? 450 : weapon.rarity === 'rare' ? 350 : 200;
  return Math.round(baseCost * Math.pow(1.5, weapon.upgradeLevel - 1));
}

/**
 * Aplicar mejora de arma
 */
export function upgradeWeapon(weapon: Weapon): Weapon {
  if (weapon.upgradeLevel >= weapon.maxUpgradeLevel) return weapon;

  const nextLevel = weapon.upgradeLevel + 1;
  const multiplier = 1 + (nextLevel - 1) * 0.28; // +28% daño por nivel

  return {
    ...weapon,
    upgradeLevel: nextLevel,
    damage: Math.round(weapon.baseDamage * multiplier),
    magazineSize: Math.round(weapon.magazineSize * 1.15),
    fireRate: Number((weapon.fireRate * 1.1).toFixed(2)),
    reloadTime: Number(Math.max(0.6, weapon.reloadTime * 0.9).toFixed(2)),
  };
}

/**
 * Costos de mejora de la Base
 */
export function getBaseUpgradeCost(type: 'armor' | 'turret' | 'repair', base: DefenseBase): number {
  if (type === 'repair') {
    const missingHp = base.maxHp - base.hp;
    if (missingHp <= 0) return 0;
    return Math.max(100, Math.round(missingHp * 0.4));
  }
  if (type === 'armor') {
    return Math.round(300 * Math.pow(1.6, base.armorLevel - 1));
  }
  if (type === 'turret') {
    return Math.round(400 * Math.pow(1.7, base.turretLevel - 1));
  }
  return 250;
}

// --------------------------------------------------------------------------------
// TABLA DE PROBABILIDADES DE LA CAJA MISTERIOSA (Costo: 700 monedas)
// Requerimientos del usuario:
// - Caja que valga 700 monedas
// - Armas aleatorias de alta potencia para sobrevivir
// - Probabilidad específica de obtener armas legendarias o ítems de curación
// --------------------------------------------------------------------------------

export const MYSTERY_BOX_COST = 700;

export const MYSTERY_BOX_DROPS: MysteryBoxDrop[] = [
  // --- ARMAS DE ALTA POTENCIA (45% acumulado) ---
  {
    id: 'drop_spas12',
    name: 'Escopeta SPAS-12',
    type: 'weapon',
    rarity: 'rare',
    description: 'Escopeta táctica de 7 perdigones y gran empuje.',
    color: '#fb923c',
    iconName: 'Flame',
    weaponTemplate: WEAPON_DEFINITIONS.spas12,
  },
  {
    id: 'drop_m4a1',
    name: 'Fusil Militar M4A1',
    type: 'weapon',
    rarity: 'rare',
    description: 'Fusil de asalto con perforación de blindaje doble.',
    color: '#38bdf8',
    iconName: 'Crosshair',
    weaponTemplate: WEAPON_DEFINITIONS.m4a1,
  },
  {
    id: 'drop_vector',
    name: 'Subfusil Kriss Vector',
    type: 'weapon',
    rarity: 'rare',
    description: 'Cadencia devastadora de 12 balas por segundo.',
    color: '#a855f7',
    iconName: 'Zap',
    weaponTemplate: WEAPON_DEFINITIONS.vector,
  },
  {
    id: 'drop_rpg7',
    name: 'Lanzacohetes RPG-7',
    type: 'weapon',
    rarity: 'epic',
    description: 'Explosión masiva de área capaz de limpiar grupos enteros.',
    color: '#ef4444',
    iconName: 'Bomb',
    weaponTemplate: WEAPON_DEFINITIONS.rpg7,
  },
  {
    id: 'drop_vulcan',
    name: 'Minigun Vulcan Pesada',
    type: 'weapon',
    rarity: 'epic',
    description: 'Cargador de 100 rondas para sostener la línea.',
    color: '#f59e0b',
    iconName: 'ShieldAlert',
    weaponTemplate: WEAPON_DEFINITIONS.vulcan,
  },

  // --- ÍTEMS DE CURACIÓN Y SUMINISTROS (25% acumulado) ---
  {
    id: 'drop_medikit_full',
    name: 'Botiquín Trauma Avanzado',
    type: 'heal',
    rarity: 'rare',
    description: 'Restaura el 100% de la vida del superviviente al instante.',
    color: '#22c55e',
    iconName: 'HeartPulse',
    healAmount: 100,
    healTarget: 'player',
  },
  {
    id: 'drop_base_repair',
    name: 'Nanobots de Reparación de Base',
    type: 'heal',
    rarity: 'rare',
    description: 'Repara +400 HP de las defensas y muros de la base.',
    color: '#10b981',
    iconName: 'Wrench',
    healAmount: 400,
    healTarget: 'base',
  },
  {
    id: 'drop_max_ammo',
    name: 'Caja de Munición Máxima',
    type: 'heal',
    rarity: 'rare',
    description: 'Rellena al 100% todas las reservas y cargadores de todas tus armas.',
    color: '#eab308',
    iconName: 'PackageCheck',
    healAmount: 9999,
    healTarget: 'player',
  },

  // --- ARMAS LEGENDARIAS (20% acumulado) ---
  {
    id: 'drop_raygun',
    name: 'Rayo Cósmico Z-900',
    type: 'weapon',
    rarity: 'legendary',
    description: '¡LEGENDARIA! Rayo desintegrador cuántico que perfora 5 zombies.',
    color: '#10b981',
    iconName: 'Sparkles',
    weaponTemplate: WEAPON_DEFINITIONS.raygun,
  },
  {
    id: 'drop_tesla',
    name: 'Fusil Tesla Arc Storm',
    type: 'weapon',
    rarity: 'legendary',
    description: '¡LEGENDARIA! Descargas eléctricas que saltan en cadena en 4 objetivos.',
    color: '#06b6d4',
    iconName: 'Zap',
    weaponTemplate: WEAPON_DEFINITIONS.tesla,
  },
  {
    id: 'drop_cryo',
    name: 'Cañón Criogénico Glaciar',
    type: 'weapon',
    rarity: 'legendary',
    description: '¡LEGENDARIA! Congela y ralentiza hordas masivas en un 75%.',
    color: '#3b82f6',
    iconName: 'Snowflake',
    weaponTemplate: WEAPON_DEFINITIONS.cryo,
  },

  // --- MEJORAS ESPECIALES Y TÁCTICAS (10% acumulado) ---
  {
    id: 'drop_nuke',
    name: 'Bomba Nuclear Táctica',
    type: 'buff',
    rarity: 'epic',
    description: 'Detonación instantánea que aniquila a todos los zombies visibles y otorga 400 monedas.',
    color: '#f97316',
    iconName: 'Radiation',
    buffType: 'nuke',
  },
  {
    id: 'drop_double_points',
    name: 'Fiebre de Monedas (x2)',
    type: 'buff',
    rarity: 'rare',
    description: 'Duplica todas las monedas y puntos obtenidos durante 30 segundos.',
    color: '#eab308',
    iconName: 'Coins',
    buffType: 'double_points',
    buffDuration: 30,
  },
  {
    id: 'drop_infinite_ammo',
    name: 'Frenesí de Munición Infinita',
    type: 'buff',
    rarity: 'epic',
    description: 'Disparos sin consumir cargador ni munición durante 20 segundos.',
    color: '#ec4899',
    iconName: 'Infinity',
    buffType: 'infinite_ammo',
    buffDuration: 20,
  },
];

/**
 * Probabilidades por categoría:
 * - Armas Raras/Épicas de Alto Poder: 45%
 * - Curación / Soporte (Vida, Reparación base, Munición máx): 25%
 * - Armas Legendarias (Rayo Cósmico, Tesla, Criogénico): 20%
 * - Buffs Tácticos (Nuke, Puntos x2, Munición infinita): 10%
 */
export function rollMysteryBox(): MysteryBoxDrop {
  const rand = Math.random() * 100;

  if (rand < 20) {
    // 20% Armas Legendarias
    const legendaries = MYSTERY_BOX_DROPS.filter(d => d.rarity === 'legendary');
    return legendaries[Math.floor(Math.random() * legendaries.length)];
  } else if (rand < 45) {
    // 25% Curación y Soporte (20% to 45% = 25%)
    const heals = MYSTERY_BOX_DROPS.filter(d => d.type === 'heal');
    return heals[Math.floor(Math.random() * heals.length)];
  } else if (rand < 55) {
    // 10% Buffs Tácticos (45% to 55% = 10%)
    const buffs = MYSTERY_BOX_DROPS.filter(d => d.type === 'buff');
    return buffs[Math.floor(Math.random() * buffs.length)];
  } else {
    // 45% Armas de Alto Poder (55% to 100% = 45%)
    const powerWeapons = MYSTERY_BOX_DROPS.filter(d => d.type === 'weapon' && d.rarity !== 'legendary');
    return powerWeapons[Math.floor(Math.random() * powerWeapons.length)];
  }
}
