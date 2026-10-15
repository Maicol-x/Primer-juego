import React from 'react';
import { Player, DefenseBase, Weapon } from '../game/types';
import { CameraMode } from '../game/three/threeEngine';
import {
  Heart,
  Zap,
  Shield,
  Coins,
  Skull,
  Crosshair,
  Volume2,
  VolumeX,
  Pause,
  RotateCw,
  Sparkles,
  Wrench,
  Flame,
  Bomb,
  Snowflake,
  ShieldAlert,
  Settings,
  Eye,
  Plane,
} from 'lucide-react';

interface HUDProps {
  player: Player;
  base: DefenseBase;
  round: number;
  zombiesRemaining: number;
  inIntermission: boolean;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onPause: () => void;
  onSwitchWeapon: (idx: number) => void;
  isNearBox: boolean;
  isNearWorkshop: boolean;
  onOpenMysteryBox: () => void;
  onOpenWorkshop: () => void;
  cameraMode: CameraMode;
  onCycleCamera: () => void;
  onOpenSettings: () => void;
  droneTelemetry?: { alt: number; x: number; z: number };
  targetLocked?: boolean;
  isHitmarker?: boolean;
  isPointerLocked?: boolean;
}

export const HUD: React.FC<HUDProps> = ({
  player,
  base,
  round,
  zombiesRemaining,
  inIntermission,
  soundEnabled,
  onToggleSound,
  onPause,
  onSwitchWeapon,
  isNearBox,
  isNearWorkshop,
  onOpenMysteryBox,
  onOpenWorkshop,
  cameraMode,
  onCycleCamera,
  onOpenSettings,
  droneTelemetry,
  targetLocked = false,
  isHitmarker = false,
  isPointerLocked = false,
}) => {
  const activeWeapon: Weapon = player.weapons[player.activeWeaponIndex] || player.weapons[0];
  const hpPercent = Math.max(0, Math.min(100, (player.hp / player.maxHp) * 100));
  const staminaPercent = Math.max(0, Math.min(100, (player.stamina / player.maxStamina) * 100));
  const baseHpPercent = Math.max(0, Math.min(100, (base.hp / base.maxHp) * 100));

  const getRarityBadgeColor = (rarity: Weapon['rarity']) => {
    switch (rarity) {
      case 'legendary':
        return 'text-emerald-400 border-emerald-500/40 bg-emerald-950/60';
      case 'epic':
        return 'text-rose-400 border-rose-500/40 bg-rose-950/60';
      case 'rare':
        return 'text-sky-400 border-sky-500/40 bg-sky-950/60';
      default:
        return 'text-neutral-400 border-neutral-700 bg-neutral-900/60';
    }
  };

  const getWeaponIcon = (cat: Weapon['category']) => {
    switch (cat) {
      case 'shotgun':
        return <Flame size={16} />;
      case 'explosive':
        return <Bomb size={16} />;
      case 'energy':
        return <Zap size={16} />;
      case 'special':
        return <Snowflake size={16} />;
      case 'heavy':
        return <ShieldAlert size={16} />;
      default:
        return <Crosshair size={16} />;
    }
  };

  const getCameraLabel = () => {
    switch (cameraMode) {
      case 'first-person':
        return '1ª Persona (Halo FPS)';
      case 'drone':
        return 'Dron Libre (Aéreo)';
      default:
        return '3ª Persona Táctica';
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none select-none flex flex-col justify-between p-4 sm:p-6 overflow-hidden">
      {/* -------------------- RETÍCULA DE COMBATE DINÁMICA (3ª Y 1ª PERSONA) -------------------- */}
      {cameraMode !== 'drone' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {/* Mira de combate táctica */}
          <div className="relative w-16 h-16 flex items-center justify-center">
            {/* Punto central de mira: Verde/Blanco normal, Rojo carmesí cuando apunta a un zombie */}
            <div
              className={`w-2 h-2 rounded-full transition-all duration-100 ${
                targetLocked
                  ? 'bg-rose-500 scale-125 shadow-[0_0_12px_#f43f5e]'
                  : 'bg-white/90 shadow-[0_0_6px_rgba(255,255,255,0.7)]'
              }`}
            />

            {/* Corchetes perimetrales dinámicos con retroceso */}
            <div
              className={`absolute top-1 w-[2px] h-3 transition-colors ${
                targetLocked ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e]' : 'bg-sky-400/80'
              }`}
            />
            <div
              className={`absolute bottom-1 w-[2px] h-3 transition-colors ${
                targetLocked ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e]' : 'bg-sky-400/80'
              }`}
            />
            <div
              className={`absolute left-1 w-3 h-[2px] transition-colors ${
                targetLocked ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e]' : 'bg-sky-400/80'
              }`}
            />
            <div
              className={`absolute right-1 w-3 h-[2px] transition-colors ${
                targetLocked ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e]' : 'bg-sky-400/80'
              }`}
            />

            {/* Anillo de bloqueo táctico cuando el cursor apunta a un objetivo */}
            {targetLocked && (
              <div className="absolute inset-0 border border-rose-500/60 rounded-full animate-ping pointer-events-none" />
            )}

            {/* Indicador de impacto Hitmarker 'X' (GTA V / CoD) */}
            {isHitmarker && (
              <div className="absolute inset-0 flex items-center justify-center animate-out fade-out duration-150">
                <div className="w-5 h-5 relative">
                  <div className="absolute top-0 left-0 w-2 h-0.5 bg-rose-500 rotate-45 origin-top-left" />
                  <div className="absolute top-0 right-0 w-2 h-0.5 bg-rose-500 -rotate-45 origin-top-right" />
                  <div className="absolute bottom-0 left-0 w-2 h-0.5 bg-rose-500 -rotate-45 origin-bottom-left" />
                  <div className="absolute bottom-0 right-0 w-2 h-0.5 bg-rose-500 rotate-45 origin-bottom-right" />
                </div>
              </div>
            )}
          </div>

          {/* Elementos de Visor Spartan HUD en Primera Persona */}
          {cameraMode === 'first-person' && (
            <>
              <div className="absolute top-4 left-4 text-[10px] font-mono text-sky-400/70 tracking-widest uppercase">
                SPARTAN-IV // HUD OPTIC 2.4X
              </div>
              <div className="absolute top-4 right-4 text-[10px] font-mono text-sky-400/70 tracking-widest uppercase">
                TARGET-SYS // ONLINE
              </div>
            </>
          )}

          {/* Aviso para fijar puntero si el ratón no está capturado */}
          {!isPointerLocked && (
            <div className="absolute bottom-28 px-4 py-1.5 rounded-full bg-neutral-950/80 border border-neutral-700/60 text-neutral-300 font-mono text-xs shadow-lg backdrop-blur-sm animate-pulse">
              Haz clic en la pantalla para bloquear la mira · [ESC] Pausa
            </div>
          )}
        </div>
      )}

      {/* -------------------- OVERLAY DE CÁMARA DRON LIBRE -------------------- */}
      {cameraMode === 'drone' && (
        <div className="absolute inset-0 flex flex-col justify-between p-6 pointer-events-none">
          {/* Marco táctico de dron */}
          <div className="w-full flex justify-between items-start">
            <div className="px-3.5 py-2 rounded-xl bg-amber-950/80 border border-amber-500/50 text-amber-300 font-mono text-xs flex items-center gap-2">
              <Plane size={15} className="animate-pulse" />
              <span>RECON DRONE ONLINE // SEÑAL: 99%</span>
            </div>

            {droneTelemetry && (
              <div className="px-3.5 py-2 rounded-xl bg-neutral-950/80 border border-neutral-800 text-neutral-300 font-mono text-xs flex gap-4">
                <span>ALTITUD: <strong className="text-amber-400">{droneTelemetry.alt}m</strong></span>
                <span>POS: <strong className="text-sky-400">X:{droneTelemetry.x} Z:{droneTelemetry.z}</strong></span>
              </div>
            )}
          </div>

          {/* Mira central del dron */}
          <div className="self-center flex flex-col items-center">
            <div className="w-16 h-16 border border-amber-500/30 rounded-lg flex items-center justify-center">
              <div className="w-2 h-2 bg-amber-400 rounded-full animate-ping" />
            </div>
            <div className="mt-3 px-4 py-1.5 rounded-full bg-neutral-950/90 border border-neutral-800 text-amber-300 font-mono text-[11px] shadow-lg">
              [WASD] Vuelo · [Q/E] Altitud · [Ratón] Ángulo · [C] Volver al Spartan
            </div>
          </div>

          <div className="w-full flex justify-between text-[11px] font-mono text-neutral-500">
            <span>GRID 160x160m SECURE</span>
            <span>PRESS [C] TO SWITCH TO FIRST/THIRD PERSON</span>
          </div>
        </div>
      )}

      {/* -------------------- ZONA SUPERIOR -------------------- */}
      <div className="flex items-start justify-between w-full">
        {/* Superior Izquierda: Integridad de la Base */}
        <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-neutral-950/85 border border-neutral-800 shadow-md min-w-[220px]">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-sky-400">
              <Shield size={14} />
              Base Central
            </span>
            <span className="font-mono-numbers text-neutral-300">
              {Math.round(base.hp)} / {base.maxHp} HP
            </span>
          </div>

          {/* Barra de progreso Base */}
          <div className="w-full h-2 rounded bg-neutral-900 overflow-hidden border border-neutral-800/80">
            <div
              className={`h-full transition-all duration-200 ${
                baseHpPercent > 50 ? 'bg-sky-500' : baseHpPercent > 25 ? 'bg-amber-500' : 'bg-rose-600 animate-pulse'
              }`}
              style={{ width: `${baseHpPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-neutral-500 font-mono-numbers">
            <span>Blindaje Nvl. {base.armorLevel}</span>
            <span>Torreta Nvl. {base.turretLevel}</span>
          </div>
        </div>

        {/* Superior Centro: Contador de Ronda y Selector de Cámara */}
        <div className="flex flex-col items-center gap-2">
          <div className="px-5 py-2 rounded-xl bg-neutral-950/90 border border-neutral-800 shadow-lg text-center min-w-[170px]">
            <div className="font-display text-2xl font-bold tracking-wider text-white uppercase">
              {inIntermission ? (
                <span className="text-amber-400 animate-pulse">PREPÁRATE</span>
              ) : (
                <span>RONDA {round}</span>
              )}
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-neutral-400 font-mono-numbers mt-0.5">
              <Skull size={13} className="text-rose-500" />
              <span>
                {inIntermission
                  ? 'Próxima oleada inminente'
                  : `${zombiesRemaining} zombie${zombiesRemaining === 1 ? '' : 's'} restantes`}
              </span>
            </div>
          </div>

          {/* Selector Rápido de Cámara en HUD */}
          <button
            type="button"
            onClick={onCycleCamera}
            className="pointer-events-auto flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-950/90 border border-neutral-700/80 hover:border-sky-500 text-xs font-mono text-neutral-300 hover:text-white transition-all shadow-md cursor-pointer"
            title="Cambiar perspectiva (Tecla C o V)"
          >
            <Eye size={13} className="text-sky-400" />
            <span>[C] {getCameraLabel()}</span>
          </button>

          {/* Notificaciones de Buffs Temporales */}
          <div className="flex items-center gap-2">
            {player.doublePointsTimer > 0 && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded bg-amber-950/80 border border-amber-600/60 text-amber-300 text-[11px] font-mono-numbers font-bold">
                <Coins size={12} />
                <span>Puntos x2 ({Math.ceil(player.doublePointsTimer)}s)</span>
              </div>
            )}
            {player.infiniteAmmoTimer > 0 && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded bg-rose-950/80 border border-rose-600/60 text-rose-300 text-[11px] font-mono-numbers font-bold animate-pulse">
                <Zap size={12} />
                <span>Munición Infinita ({Math.ceil(player.infiniteAmmoTimer)}s)</span>
              </div>
            )}
          </div>
        </div>

        {/* Superior Derecha: Monedas, Kills, Ajustes */}
        <div className="flex items-center gap-3">
          {/* Monedas y Puntuación */}
          <div className="flex flex-col items-end px-3.5 py-2 rounded-xl bg-neutral-950/85 border border-neutral-800 shadow-md">
            <div className="flex items-center gap-1.5 text-amber-400 font-mono-numbers font-bold text-base">
              <Coins size={16} />
              <span>{player.coins.toLocaleString()}</span>
            </div>
            <div className="text-[11px] text-neutral-400 font-mono-numbers">
              {player.kills} bajas · {player.score} pts
            </div>
          </div>

          {/* Botones de Control: Ajustes, Audio y Pausa */}
          <div className="flex items-center gap-1 pointer-events-auto">
            <button
              onClick={onOpenSettings}
              className="p-2.5 rounded-xl bg-neutral-950/85 border border-neutral-800 text-sky-400 hover:text-sky-300 hover:bg-neutral-900 transition-colors cursor-pointer"
              title="Ajustes de Cámara & Sistema"
            >
              <Settings size={16} />
            </button>
            <button
              onClick={onToggleSound}
              className="p-2.5 rounded-xl bg-neutral-950/85 border border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors cursor-pointer"
              title="Sonido"
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
            <button
              onClick={onPause}
              className="p-2.5 rounded-xl bg-neutral-950/85 border border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors cursor-pointer"
              title="Pausar juego (Esc)"
            >
              <Pause size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* -------------------- ZONA CENTRAL (NOTIFICACIONES DE INTERACCIÓN) -------------------- */}
      <div className="flex flex-col items-center justify-center my-auto gap-3 pointer-events-auto">
        {isNearBox && (
          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-neutral-950/95 border-2 border-amber-500 shadow-[0_0_25px_rgba(245,158,11,0.35)] animate-bounce">
            <Sparkles className="w-6 h-6 text-amber-400" />
            <div className="text-left">
              <div className="text-xs font-bold uppercase tracking-wider text-amber-400">Caja Misteriosa</div>
              <div className="text-sm font-semibold text-white">Armas Legendarias y Curación</div>
            </div>
            <button
              onClick={onOpenMysteryBox}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-bold text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer flex items-center gap-1.5"
            >
              <kbd className="px-1.5 py-0.5 bg-black/20 rounded font-mono">E</kbd>
              Abrir (700 🪙)
            </button>
          </div>
        )}

        {isNearWorkshop && (
          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-neutral-950/95 border-2 border-sky-500 shadow-[0_0_25px_rgba(14,165,233,0.35)]">
            <Wrench className="w-6 h-6 text-sky-400" />
            <div className="text-left">
              <div className="text-xs font-bold uppercase tracking-wider text-sky-400">Taller del Búnker</div>
              <div className="text-sm font-semibold text-white">Mejorar Arsenal y Reparar Base</div>
            </div>
            <button
              onClick={onOpenWorkshop}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-white font-bold text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer flex items-center gap-1.5"
            >
              <kbd className="px-1.5 py-0.5 bg-black/20 rounded font-mono">E</kbd>
              Entrar al Taller
            </button>
          </div>
        )}
      </div>

      {/* -------------------- ZONA INFERIOR -------------------- */}
      <div className="flex items-end justify-between w-full">
        {/* Inferior Izquierda: Vida y Estamina del Jugador */}
        <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-neutral-950/85 border border-neutral-800 shadow-md min-w-[240px]">
          {/* Salud */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-rose-500">
                <Heart size={14} className="fill-rose-500" />
                Salud Spartan
              </span>
              <span className="font-mono-numbers text-neutral-200">
                {Math.round(player.hp)} / {player.maxHp} HP
              </span>
            </div>
            <div className="w-full h-2.5 rounded bg-neutral-900 overflow-hidden border border-neutral-800">
              <div
                className={`h-full transition-all duration-150 ${
                  hpPercent > 40 ? 'bg-rose-500' : 'bg-rose-600 animate-pulse'
                }`}
                style={{ width: `${hpPercent}%` }}
              />
            </div>
          </div>

          {/* Estamina / Esquive Propulsores */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[11px] text-neutral-400 font-semibold">
              <span className="flex items-center gap-1 text-sky-400">
                <Zap size={12} />
                Thrusters Dash (Espacio / Der.)
              </span>
              <span className="font-mono-numbers">{Math.round(player.stamina)}%</span>
            </div>
            <div className="w-full h-1.5 rounded bg-neutral-900 overflow-hidden border border-neutral-800/80">
              <div
                className="h-full bg-sky-500 transition-all duration-100"
                style={{ width: `${staminaPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Inferior Derecha: Arma Activa, Munición, Selector de Armas */}
        <div className="flex flex-col items-end gap-2.5">
          {/* Selector de Armas Rápidas (1-4) */}
          <div className="flex items-center gap-1.5 pointer-events-auto">
            {player.weapons.map((w, idx) => {
              const isActive = idx === player.activeWeaponIndex;
              return (
                <button
                  key={w.id}
                  onClick={() => onSwitchWeapon(idx)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-mono-numbers transition-all cursor-pointer ${
                    isActive
                      ? 'bg-neutral-900 text-white border-sky-500 shadow-[0_0_12px_rgba(56,189,248,0.3)]'
                      : 'bg-neutral-950/70 text-neutral-400 border-neutral-800 hover:text-neutral-200'
                  }`}
                  title={`${w.name} (Tecla ${idx + 1})`}
                >
                  <span className="text-[10px] text-neutral-500 font-bold">{idx + 1}</span>
                  {getWeaponIcon(w.category)}
                  <span className="truncate max-w-[85px] hidden sm:inline">{w.name.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>

          {/* Panel Principal del Arma Activa */}
          <div className="flex items-center gap-4 p-3.5 rounded-xl bg-neutral-950/90 border border-neutral-800 shadow-lg min-w-[270px]">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm">{activeWeapon.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded border uppercase font-mono-numbers ${getRarityBadgeColor(
                    activeWeapon.rarity
                  )}`}
                >
                  Nvl. {activeWeapon.upgradeLevel}
                </span>
              </div>
              <div className="text-xs text-neutral-400 capitalize">{activeWeapon.category}</div>
            </div>

            {/* Munición */}
            <div className="flex flex-col items-end ml-auto">
              {player.reloading ? (
                <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold animate-pulse">
                  <RotateCw size={13} className="animate-spin" />
                  <span>Recargando...</span>
                </div>
              ) : (
                <div className="flex items-baseline gap-1 font-mono-numbers font-bold">
                  <span className={`text-2xl ${activeWeapon.currentMag === 0 ? 'text-rose-500 animate-pulse' : 'text-white'}`}>
                    {activeWeapon.currentMag}
                  </span>
                  <span className="text-neutral-500 text-sm">/</span>
                  <span className="text-neutral-400 text-sm">
                    {activeWeapon.isInfiniteReserve ? '∞' : activeWeapon.reserveAmmo}
                  </span>
                </div>
              )}

              <div className="text-[10px] text-neutral-500 font-mono-numbers">
                [R] Recargar
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
