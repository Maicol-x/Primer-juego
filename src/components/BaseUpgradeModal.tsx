import React, { useState } from 'react';
import { Player, DefenseBase, Weapon } from '../game/types';
import { getBaseUpgradeCost, getWeaponUpgradeCost, upgradeWeapon } from '../game/weapons';
import { sound } from '../game/audio';
import {
  Wrench,
  Shield,
  Crosshair,
  ArrowUpCircle,
  Coins,
  Check,
  Zap,
  Flame,
  Bomb,
  Snowflake,
  ShieldAlert,
} from 'lucide-react';

interface BaseUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player;
  base: DefenseBase;
  onUpgradeWeapon: (weaponIndex: number) => void;
  onRepairBase: () => void;
  onUpgradeBaseArmor: () => void;
  onUpgradeBaseTurret: () => void;
}

export const BaseUpgradeModal: React.FC<BaseUpgradeModalProps> = ({
  isOpen,
  onClose,
  player,
  base,
  onUpgradeWeapon,
  onRepairBase,
  onUpgradeBaseArmor,
  onUpgradeBaseTurret,
}) => {
  const [selectedWeaponIdx, setSelectedWeaponIdx] = useState(player.activeWeaponIndex);
  const [activeTab, setActiveTab] = useState<'base' | 'weapons'>('base');

  if (!isOpen) return null;

  const currentWeapon = player.weapons[selectedWeaponIdx] || player.weapons[0];
  const weaponUpgradeCost = getWeaponUpgradeCost(currentWeapon);
  const repairCost = getBaseUpgradeCost('repair', base);
  const armorCost = getBaseUpgradeCost('armor', base);
  const turretCost = getBaseUpgradeCost('turret', base);

  const handleWeaponUpgrade = () => {
    if (player.coins < weaponUpgradeCost || currentWeapon.upgradeLevel >= currentWeapon.maxUpgradeLevel) return;
    sound.playReload();
    onUpgradeWeapon(selectedWeaponIdx);
  };

  const handleRepair = () => {
    if (player.coins < repairCost || base.hp >= base.maxHp) return;
    sound.playCoin();
    onRepairBase();
  };

  const handleArmorUpgrade = () => {
    if (player.coins < armorCost) return;
    sound.playCoin();
    onUpgradeBaseArmor();
  };

  const handleTurretUpgrade = () => {
    if (player.coins < turretCost) return;
    sound.playCoin();
    onUpgradeBaseTurret();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="relative w-full max-w-2xl bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Encabezado */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400">
              <Wrench size={20} />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold uppercase tracking-wider text-white">
                Taller del Búnker
              </h2>
              <p className="text-xs text-neutral-400">
                Fortificaciones y Armamento · Saldo disponible:{' '}
                <span className="font-mono-numbers text-amber-400 font-bold">{player.coins} 🪙</span>
              </p>
            </div>
          </div>

          {/* Selector de Pestañas */}
          <div className="flex items-center gap-1 p-1 bg-neutral-900 border border-neutral-800 rounded-xl">
            <button
              onClick={() => setActiveTab('base')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'base' ? 'bg-sky-600 text-white shadow-sm' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Defensa de Base
            </button>
            <button
              onClick={() => setActiveTab('weapons')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'weapons' ? 'bg-sky-600 text-white shadow-sm' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Mejorar Armas
            </button>
          </div>
        </div>

        {/* Contenido Pestaña 1: Mejoras de Base */}
        {activeTab === 'base' && (
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Reparación de Base */}
            <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/40 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase mb-2">
                  <Shield size={16} />
                  Reparar Búnker
                </div>
                <div className="text-2xl font-mono-numbers font-bold text-white mb-1">
                  {Math.round(base.hp)} <span className="text-sm text-neutral-500">/ {base.maxHp} HP</span>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed mb-4">
                  Restaura la estructura metálica del núcleo central ante daños recibidos.
                </p>
              </div>

              <button
                onClick={handleRepair}
                disabled={player.coins < repairCost || base.hp >= base.maxHp}
                className="w-full py-2.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5"
              >
                {base.hp >= base.maxHp ? (
                  <span>Estructura al 100%</span>
                ) : (
                  <>
                    <Coins size={14} />
                    Reparar ({repairCost} 🪙)
                  </>
                )}
              </button>
            </div>

            {/* 2. Blindaje Reforzado */}
            <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/40 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-sky-400 font-bold text-xs uppercase mb-2">
                  <ShieldAlert size={16} />
                  Blindaje Compuesto
                </div>
                <div className="text-2xl font-mono-numbers font-bold text-white mb-1">
                  Nivel {base.armorLevel}
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed mb-4">
                  Reduce en un +20% todo el daño causado por garras de zombies y ácido.
                </p>
              </div>

              <button
                onClick={handleArmorUpgrade}
                disabled={player.coins < armorCost}
                className="w-full py-2.5 px-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold uppercase transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5"
              >
                <ArrowUpCircle size={14} />
                Mejorar ({armorCost} 🪙)
              </button>
            </div>

            {/* 3. Torreta de Techo */}
            <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/40 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase mb-2">
                  <Crosshair size={16} />
                  Torreta Automática
                </div>
                <div className="text-2xl font-mono-numbers font-bold text-white mb-1">
                  Nivel {base.turretLevel}
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed mb-4">
                  Aumenta la cadencia de fuego y daño del sistema de defensa perimetral.
                </p>
              </div>

              <button
                onClick={handleTurretUpgrade}
                disabled={player.coins < turretCost}
                className="w-full py-2.5 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold uppercase transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5"
              >
                <ArrowUpCircle size={14} />
                Mejorar ({turretCost} 🪙)
              </button>
            </div>
          </div>
        )}

        {/* Contenido Pestaña 2: Mejorar Armas */}
        {activeTab === 'weapons' && (
          <div className="p-6 flex flex-col gap-4">
            {/* Selector de arma del arsenal */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-400">Seleccionar arma:</span>
              <div className="flex items-center gap-2">
                {player.weapons.map((w, idx) => (
                  <button
                    key={w.id}
                    onClick={() => setSelectedWeaponIdx(idx)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                      selectedWeaponIdx === idx
                        ? 'bg-neutral-800 text-white border-sky-500'
                        : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-neutral-200'
                    }`}
                  >
                    {w.name} (Nvl. {w.upgradeLevel})
                  </button>
                ))}
              </div>
            </div>

            {/* Detalles y Mejoras del arma seleccionada */}
            <div className="p-5 rounded-xl border border-neutral-800 bg-neutral-900/50 flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-display text-xl font-bold text-white uppercase">{currentWeapon.name}</h3>
                  <p className="text-xs text-neutral-400 max-w-md">{currentWeapon.description}</p>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono-numbers uppercase text-neutral-400">Nivel de Mejora</div>
                  <div className="text-2xl font-bold font-mono-numbers text-sky-400">
                    {currentWeapon.upgradeLevel} / {currentWeapon.maxUpgradeLevel}
                  </div>
                </div>
              </div>

              {/* Estadísticas Actuales */}
              <div className="grid grid-cols-4 gap-3 text-center text-xs font-mono-numbers">
                <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800">
                  <div className="text-neutral-500 text-[10px] uppercase">Daño</div>
                  <div className="text-white font-bold text-sm">{currentWeapon.damage}</div>
                  <div className="text-emerald-400 text-[10px]">+28% próx</div>
                </div>
                <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800">
                  <div className="text-neutral-500 text-[10px] uppercase">Cadencia</div>
                  <div className="text-white font-bold text-sm">{currentWeapon.fireRate}/s</div>
                  <div className="text-emerald-400 text-[10px]">+10% próx</div>
                </div>
                <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800">
                  <div className="text-neutral-500 text-[10px] uppercase">Cargador</div>
                  <div className="text-white font-bold text-sm">{currentWeapon.magazineSize}</div>
                  <div className="text-emerald-400 text-[10px]">+15% próx</div>
                </div>
                <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800">
                  <div className="text-neutral-500 text-[10px] uppercase">Recarga</div>
                  <div className="text-white font-bold text-sm">{currentWeapon.reloadTime}s</div>
                  <div className="text-emerald-400 text-[10px]">-10% próx</div>
                </div>
              </div>

              {/* Botón de Mejora de Arma */}
              <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
                <div className="text-xs text-neutral-400">
                  {currentWeapon.upgradeLevel >= currentWeapon.maxUpgradeLevel ? (
                    <span className="text-emerald-400 font-bold">¡Nivel Máximo de Mejora Alcanzado!</span>
                  ) : (
                    <span>Costo de calibración y piezas balísticas:</span>
                  )}
                </div>

                <button
                  onClick={handleWeaponUpgrade}
                  disabled={
                    player.coins < weaponUpgradeCost ||
                    currentWeapon.upgradeLevel >= currentWeapon.maxUpgradeLevel
                  }
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-500 hover:to-sky-400 text-white font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
                >
                  <ArrowUpCircle size={16} />
                  {currentWeapon.upgradeLevel >= currentWeapon.maxUpgradeLevel
                    ? 'Arma al Máximo'
                    : `Mejorar (${weaponUpgradeCost} 🪙)`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-neutral-800 bg-neutral-900/60">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-xs font-bold uppercase tracking-wider text-white transition-colors cursor-pointer"
          >
            Volver a la Batalla
          </button>
        </div>
      </div>
    </div>
  );
};
