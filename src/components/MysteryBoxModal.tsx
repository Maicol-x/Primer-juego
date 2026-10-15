import React, { useState, useEffect, useRef } from 'react';
import { MysteryBoxDrop } from '../game/types';
import { MYSTERY_BOX_DROPS, MYSTERY_BOX_COST } from '../game/weapons';
import { sound } from '../game/audio';
import {
  Sparkles,
  Zap,
  Flame,
  HeartPulse,
  Wrench,
  PackageCheck,
  Bomb,
  Snowflake,
  ShieldAlert,
  Coins,
  Radiation,
  Infinity,
  HelpCircle,
  Crosshair,
  Check,
} from 'lucide-react';

interface MysteryBoxModalProps {
  isOpen: boolean;
  onClose: () => void;
  coins: number;
  /**
   * Única operación de giro: el motor comprueba saldo, cobra una vez y
   * devuelve la recompensa REAL generada (o null si no puede girar).
   */
  onSpin: () => MysteryBoxDrop | null;
  /** Notifica al motor que el giro terminó (o fue cancelado al cerrar). */
  onSpinResolved?: () => void;
  onClaimDrop: (drop: MysteryBoxDrop) => void;
}

export const MysteryBoxModal: React.FC<MysteryBoxModalProps> = ({
  isOpen,
  onClose,
  coins,
  onSpin,
  onSpinResolved,
  onClaimDrop,
}) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [displayedDrop, setDisplayedDrop] = useState<MysteryBoxDrop | null>(null);
  const [wonDrop, setWonDrop] = useState<MysteryBoxDrop | null>(null);
  const [showProbabilities, setShowProbabilities] = useState(false);

  // Referencias estables para limpiar SIEMPRE el temporizador del giro,
  // incluso si el modal se desmonta o se cierra a mitad de animación.
  const spinIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);
  // Última props sin re-ejecutar el efecto auto-spin por cambios de callbacks.
  const onSpinRef = useRef(onSpin);
  onSpinRef.current = onSpin;

  const clearSpinInterval = () => {
    if (spinIntervalRef.current !== null) {
      clearInterval(spinIntervalRef.current);
      spinIntervalRef.current = null;
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearSpinInterval();
    };
  }, []);

  // Al abrir/cerrar el modal reiniciamos el estado visual. El cierre también
  // libera la pendencia de giro en el motor para no bloquear futuros giros.
  useEffect(() => {
    if (!isOpen) {
      clearSpinInterval();
      setIsSpinning(false);
      setDisplayedDrop(null);
      setWonDrop(null);
      onSpinResolved?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && !wonDrop && !isSpinning && coins >= MYSTERY_BOX_COST) {
      // Iniciar giro automáticamente al abrir la caja si tiene monedas
      handleSpin();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSpin = () => {
    if (coins < MYSTERY_BOX_COST || isSpinning) return;
    // No iniciar un segundo giro concurrente si aún hay uno en curso.
    if (spinIntervalRef.current !== null) return;

    setIsSpinning(true);
    setWonDrop(null);

    // El motor cobra y genera AHORA la recompensa definitiva. La animación
    // solo representa visualmente el giro; nunca altera la lógica económica.
    const result = onSpinRef.current();
    if (!result) {
      setIsSpinning(false);
      return;
    }

    // Animación de ruleta / cycling estilo Call of Duty Zombies
    let iterations = 0;
    const maxIterations = 28;
    const intervalTime = 70;

    spinIntervalRef.current = setInterval(() => {
      iterations++;
      sound.playBoxTick();

      // Mostrar elemento aleatorio durante el giro (puro cosmético)
      const randomItem = MYSTERY_BOX_DROPS[Math.floor(Math.random() * MYSTERY_BOX_DROPS.length)];
      if (mountedRef.current) setDisplayedDrop(randomItem);

      if (iterations >= maxIterations) {
        clearSpinInterval();
        if (!mountedRef.current) return;
        // El resultado mostrado es EXACTAMENTE la recompensa generada por el motor.
        setDisplayedDrop(result);
        setWonDrop(result);
        setIsSpinning(false);
        onSpinResolved?.();

        if (result.rarity === 'legendary') {
          sound.playLegendaryDrop();
        } else {
          sound.playCoin();
        }
      }
    }, intervalTime);
  };

  const handleClose = () => {
    clearSpinInterval();
    onClose();
  };

  const handleClaim = () => {
    clearSpinInterval();
    if (wonDrop) {
      onClaimDrop(wonDrop);
    } else {
      // Cierre sin reclamar: liberar la pendencia de giro en el motor.
      onSpinResolved?.();
    }
    onClose();
  };

  const getDropIcon = (iconName: string) => {
    switch (iconName) {
      case 'Sparkles':
        return <Sparkles className="w-10 h-10 text-emerald-400" />;
      case 'Zap':
        return <Zap className="w-10 h-10 text-cyan-400" />;
      case 'Snowflake':
        return <Snowflake className="w-10 h-10 text-sky-400" />;
      case 'Flame':
        return <Flame className="w-10 h-10 text-amber-500" />;
      case 'HeartPulse':
        return <HeartPulse className="w-10 h-10 text-emerald-400" />;
      case 'Wrench':
        return <Wrench className="w-10 h-10 text-teal-400" />;
      case 'PackageCheck':
        return <PackageCheck className="w-10 h-10 text-amber-400" />;
      case 'Bomb':
        return <Bomb className="w-10 h-10 text-rose-500" />;
      case 'Radiation':
        return <Radiation className="w-10 h-10 text-orange-500" />;
      case 'Coins':
        return <Coins className="w-10 h-10 text-yellow-400" />;
      case 'Infinity':
        return <Infinity className="w-10 h-10 text-pink-400" />;
      case 'ShieldAlert':
        return <ShieldAlert className="w-10 h-10 text-amber-500" />;
      default:
        return <Crosshair className="w-10 h-10 text-sky-400" />;
    }
  };

  const activeDrop = wonDrop || displayedDrop;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="relative w-full max-w-lg bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Encabezado con estética mística */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold uppercase tracking-wider text-white">
                Caja Misteriosa
              </h2>
              <p className="text-xs text-neutral-400">
                Coste: <span className="font-mono-numbers text-amber-400 font-bold">{MYSTERY_BOX_COST} Monedas</span> · Saldo: <span className="font-mono-numbers text-neutral-200">{coins} 🪙</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowProbabilities(!showProbabilities)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-neutral-800 hover:border-neutral-700 bg-neutral-900 text-xs text-neutral-300 transition-colors cursor-pointer"
          >
            <HelpCircle size={14} />
            <span>{showProbabilities ? 'Ocultar %' : 'Probabilidades'}</span>
          </button>
        </div>

        {/* Tablero de Probabilidades Desplegable */}
        {showProbabilities && (
          <div className="px-6 py-3 bg-neutral-900/90 border-b border-neutral-800 text-xs flex flex-col gap-2">
            <div className="font-bold text-neutral-200 uppercase tracking-wider text-[11px]">
              Distribución de Probabilidades Oficial:
            </div>
            <div className="grid grid-cols-2 gap-2 text-neutral-300">
              <div className="flex items-center justify-between p-2 rounded bg-neutral-950/70 border border-neutral-800">
                <span className="text-sky-400 font-medium">Armas de Alto Poder</span>
                <span className="font-mono-numbers font-bold text-white">45%</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-neutral-950/70 border border-neutral-800">
                <span className="text-emerald-400 font-medium">Kits Médicos & Salud</span>
                <span className="font-mono-numbers font-bold text-white">25%</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-neutral-950/70 border border-emerald-500/30">
                <span className="text-emerald-300 font-bold">Armas Legendarias</span>
                <span className="font-mono-numbers font-bold text-emerald-400">20%</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-neutral-950/70 border border-neutral-800">
                <span className="text-amber-400 font-medium">Buffs Tácticos (Nuke)</span>
                <span className="font-mono-numbers font-bold text-white">10%</span>
              </div>
            </div>
          </div>
        )}

        {/* Área del Giro y Premio */}
        <div className="p-8 flex flex-col items-center justify-center text-center">
          {activeDrop ? (
            <div
              className={`relative w-full max-w-sm p-6 rounded-2xl border transition-all duration-300 flex flex-col items-center ${
                wonDrop && wonDrop.rarity === 'legendary'
                  ? 'bg-emerald-950/30 border-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.35)]'
                  : wonDrop && wonDrop.rarity === 'epic'
                  ? 'bg-rose-950/30 border-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.3)]'
                  : 'bg-neutral-900/60 border-neutral-800 shadow-lg'
              }`}
            >
              {/* Contenedor del Icono con Halo */}
              <div
                className={`w-24 h-24 rounded-2xl flex items-center justify-center mb-4 transition-transform duration-150 ${
                  isSpinning ? 'scale-90 rotate-6' : 'scale-100 rotate-0'
                }`}
                style={{
                  backgroundColor: `${activeDrop.color}15`,
                  border: `2px solid ${activeDrop.color}60`,
                  boxShadow: `0 0 25px ${activeDrop.color}40`,
                }}
              >
                {getDropIcon(activeDrop.iconName)}
              </div>

              {/* Rarity Tag */}
              <div
                className="text-[11px] font-mono-numbers uppercase tracking-widest font-bold px-2.5 py-0.5 rounded-full mb-2"
                style={{
                  color: activeDrop.color,
                  backgroundColor: `${activeDrop.color}20`,
                  border: `1px solid ${activeDrop.color}40`,
                }}
              >
                {activeDrop.rarity === 'legendary'
                  ? '¡LEGENDARIA!'
                  : activeDrop.type === 'heal'
                  ? 'ÍTEM DE CURACIÓN'
                  : activeDrop.type === 'buff'
                  ? 'BUFF TÁCTICO'
                  : 'ARMA DE ASALTO'}
              </div>

              {/* Nombre del Objeto */}
              <h3 className="font-display text-2xl font-bold text-white mb-2 uppercase">
                {activeDrop.name}
              </h3>

              {/* Descripción */}
              <p className="text-xs text-neutral-300 leading-relaxed max-w-xs mb-4">
                {activeDrop.description}
              </p>

              {/* Estadísticas si es un arma */}
              {activeDrop.weaponTemplate && (
                <div className="grid grid-cols-3 gap-2 w-full pt-3 border-t border-neutral-800 text-[11px] font-mono-numbers">
                  <div className="bg-neutral-950/60 p-2 rounded text-neutral-400">
                    <div>Daño</div>
                    <div className="text-white font-bold">{activeDrop.weaponTemplate.damage}</div>
                  </div>
                  <div className="bg-neutral-950/60 p-2 rounded text-neutral-400">
                    <div>Cadencia</div>
                    <div className="text-white font-bold">{activeDrop.weaponTemplate.fireRate}/s</div>
                  </div>
                  <div className="bg-neutral-950/60 p-2 rounded text-neutral-400">
                    <div>Cargador</div>
                    <div className="text-white font-bold">{activeDrop.weaponTemplate.magazineSize}</div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-neutral-500 font-display text-xl uppercase">
              Cargando artefacto misterioso...
            </div>
          )}
        </div>

        {/* Acciones del Modal */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-neutral-800 bg-neutral-900/60">
          <button
            onClick={onClose}
            disabled={isSpinning}
            className="px-4 py-2.5 rounded-xl border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-xs font-semibold text-neutral-300 transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cerrar
          </button>

          <div className="flex items-center gap-2">
            {/* Botón para volver a girar si tiene fondos */}
            <button
              onClick={handleSpin}
              disabled={isSpinning || coins < MYSTERY_BOX_COST}
              className="px-4 py-2.5 rounded-xl border border-amber-600/50 bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 font-bold text-xs uppercase transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles size={14} />
              Girar ({MYSTERY_BOX_COST} 🪙)
            </button>

            {/* Botón para reclamar y equipar */}
            <button
              onClick={handleClaim}
              disabled={isSpinning || !wonDrop}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
            >
              <Check size={16} />
              Equipar y Salir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
