import React from 'react';
import { Skull, RotateCcw, Award, Target, Coins } from 'lucide-react';

interface GameOverModalProps {
  isOpen: boolean;
  onRestart: () => void;
  stats: {
    round: number;
    kills: number;
    score: number;
    coins: number;
  };
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  onRestart,
  stats,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90">
      <div className="relative w-full max-w-md bg-neutral-950 border border-rose-900/60 rounded-2xl shadow-[0_0_50px_rgba(225,29,72,0.25)] overflow-hidden flex flex-col p-6 text-center">
        {/* Icono de Calavera */}
        <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-rose-950/70 border border-rose-500/40 flex items-center justify-center text-rose-500">
          <Skull size={32} />
        </div>

        <h2 className="font-display text-4xl font-bold uppercase tracking-wider text-white mb-1">
          LA BASE HA CAÍDO
        </h2>
        <p className="text-xs text-neutral-400 mb-6 uppercase tracking-widest font-mono-numbers">
          Supervivencia Terminada
        </p>

        {/* Resumen de Estadísticas */}
        <div className="grid grid-cols-2 gap-3 mb-6 text-left">
          <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800">
            <div className="flex items-center gap-1.5 text-neutral-400 text-xs mb-1">
              <Award size={14} className="text-amber-400" />
              <span>Ronda Alcanzada</span>
            </div>
            <div className="font-display text-2xl font-bold text-white font-mono-numbers">
              {stats.round}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800">
            <div className="flex items-center gap-1.5 text-neutral-400 text-xs mb-1">
              <Target size={14} className="text-rose-400" />
              <span>Zombies Eliminados</span>
            </div>
            <div className="font-display text-2xl font-bold text-white font-mono-numbers">
              {stats.kills}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800">
            <div className="flex items-center gap-1.5 text-neutral-400 text-xs mb-1">
              <Coins size={14} className="text-yellow-400" />
              <span>Monedas Finales</span>
            </div>
            <div className="font-display text-2xl font-bold text-yellow-400 font-mono-numbers">
              {stats.coins.toLocaleString()}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800">
            <div className="flex items-center gap-1.5 text-neutral-400 text-xs mb-1">
              <Award size={14} className="text-sky-400" />
              <span>Puntuación Total</span>
            </div>
            <div className="font-display text-2xl font-bold text-sky-400 font-mono-numbers">
              {stats.score.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Botón de Reintento Inmediato */}
        <button
          onClick={onRestart}
          className="w-full py-3.5 px-6 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-98 text-white font-bold text-sm uppercase tracking-wider shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <RotateCcw size={16} />
          Intentar de Nuevo
        </button>
      </div>
    </div>
  );
};
