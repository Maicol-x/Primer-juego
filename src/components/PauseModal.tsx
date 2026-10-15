import React from 'react';
import { Play, RotateCcw, Volume2, VolumeX, Settings } from 'lucide-react';

interface PauseModalProps {
  isOpen: boolean;
  onResume: () => void;
  onRestart: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenSettings?: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  isOpen,
  onResume,
  onRestart,
  soundEnabled,
  onToggleSound,
  onOpenSettings,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col p-6">
        <div className="text-center mb-6">
          <h2 className="font-display text-3xl font-bold uppercase tracking-wider text-white mb-1">
            JUEGO EN PAUSA
          </h2>
          <p className="text-xs text-neutral-400 font-mono-numbers uppercase tracking-wider">
            Defensa en Espera
          </p>
        </div>

        {/* Guía Rápida de Teclas */}
        <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 text-xs text-neutral-300 flex flex-col gap-2 mb-6">
          <div className="flex justify-between items-center py-1 border-b border-neutral-800/80">
            <span className="text-neutral-400">Alternar Cámaras (1ª / 3ª / Dron):</span>
            <kbd className="px-2 py-0.5 bg-neutral-950 border border-neutral-700 rounded font-mono text-sky-400 font-bold">C / V</kbd>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-neutral-800/80">
            <span className="text-neutral-400">Movimiento / Vuelo Dron:</span>
            <kbd className="px-2 py-0.5 bg-neutral-950 border border-neutral-700 rounded font-mono">W A S D</kbd>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-neutral-800/80">
            <span className="text-neutral-400">Disparo & Apuntado:</span>
            <kbd className="px-2 py-0.5 bg-neutral-950 border border-neutral-700 rounded font-mono">Click Izquierdo</kbd>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-neutral-800/80">
            <span className="text-neutral-400">Esquivar / Dash:</span>
            <kbd className="px-2 py-0.5 bg-neutral-950 border border-neutral-700 rounded font-mono">Espacio / Click Der.</kbd>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-neutral-800/80">
            <span className="text-neutral-400">Recargar:</span>
            <kbd className="px-2 py-0.5 bg-neutral-950 border border-neutral-700 rounded font-mono">R</kbd>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-neutral-400">Caja Misteriosa / Taller:</span>
            <kbd className="px-2 py-0.5 bg-neutral-950 border border-neutral-700 rounded font-mono">E</kbd>
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={onResume}
            className="w-full py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <Play size={15} />
            Reanudar Combate
          </button>

          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="w-full py-2.5 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-sky-400 text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <Settings size={15} />
              <span>Ajustes de Cámara & Óptica</span>
            </button>
          )}

          <button
            onClick={onToggleSound}
            className="w-full py-2.5 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
            <span>{soundEnabled ? 'Silenciar Efectos de Sonido' : 'Activar Efectos de Sonido'}</span>
          </button>

          <button
            onClick={onRestart}
            className="w-full py-2.5 px-4 rounded-xl bg-neutral-900 hover:bg-rose-950/60 border border-neutral-800 hover:border-rose-800/60 text-neutral-400 hover:text-rose-400 text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <RotateCcw size={15} />
            Reiniciar Partida
          </button>
        </div>
      </div>
    </div>
  );
};
