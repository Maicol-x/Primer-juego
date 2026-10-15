import React, { useEffect } from 'react';
import { Shield, Crosshair, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { sound } from '../game/audio';

interface TitleScreenProps {
  onStartGame: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStartGame,
  soundEnabled,
  onToggleSound,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        onStartGame();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStartGame]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-between p-8 bg-neutral-950 text-neutral-100 select-none overflow-hidden">
      {/* Fondo ambiental con gradiente radial y niebla */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(30,58,138,0.22),transparent_70%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_75%,rgba(185,28,28,0.14),transparent_60%)] pointer-events-none" />

      {/* Barra superior discreta */}
      <div className="w-full max-w-5xl flex items-center justify-between z-10">
        <div className="flex items-center gap-2 text-xs tracking-wider uppercase text-neutral-400 font-mono-numbers">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Servidor de Supervivencia · V.3.2</span>
        </div>

        <button
          onClick={onToggleSound}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-neutral-800 bg-neutral-900/80 hover:bg-neutral-800 text-xs text-neutral-300 transition-colors"
          title="Alternar sonido"
        >
          {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
          <span>{soundEnabled ? 'Sonido Activado' : 'Silenciado'}</span>
        </button>
      </div>

      {/* Contenido Central y Logo del Juego */}
      <div className="flex flex-col items-center text-center max-w-2xl z-10 my-auto">
        {/* Bespoke inline SVG Title Lockup */}
        <div className="mb-4">
          <svg
            className="w-20 h-20 text-rose-600 mx-auto drop-shadow-[0_0_25px_rgba(225,29,72,0.4)]"
            viewBox="0 0 100 100"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Escudo biohazard / defensa de base */}
            <path d="M50 10 L85 24 V52 C85 75 50 90 50 90 C50 90 15 75 15 52 V24 Z" className="stroke-rose-500 fill-rose-950/40" />
            <circle cx="50" cy="46" r="14" className="stroke-amber-400" />
            <path d="M50 32 V46 L60 52" className="stroke-amber-400" />
            <path d="M35 62 L65 62" className="stroke-rose-400" />
            <circle cx="50" cy="46" r="4" className="fill-amber-400 stroke-none" />
          </svg>
        </div>

        <h1 className="font-display text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white uppercase drop-shadow-lg">
          ZONA CERO
        </h1>
        <p className="font-display text-xl sm:text-2xl text-rose-500 tracking-widest uppercase mb-4 font-semibold">
          Horda Zombie & Defensa de Base
        </p>

        <p className="text-neutral-300 text-sm sm:text-base leading-relaxed max-w-xl mb-8">
          Defiende el búnker central contra implacables oleadas de no-muertos. Mejora tu arsenal en el taller y busca la mística <span className="text-amber-400 font-semibold">Caja Misteriosa (700 🪙)</span> para obtener devastadoras armas legendarias y suministros de emergencia.
        </p>

        {/* Botón Principal de Inicio CTA */}
        <button
          onClick={onStartGame}
          className="group relative inline-flex items-center justify-center px-10 py-4 text-base font-bold tracking-wider uppercase text-white bg-rose-600 rounded-xl overflow-hidden shadow-[0_0_30px_rgba(225,29,72,0.4)] hover:bg-rose-500 active:scale-95 transition-all duration-150 cursor-pointer"
        >
          <span className="relative z-10 flex items-center gap-3">
            <Crosshair className="w-5 h-5 transition-transform group-hover:rotate-90 duration-300" />
            Iniciar Supervivencia
          </span>
          <div className="absolute inset-0 bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </button>

        <div className="mt-3 text-xs text-neutral-500 font-mono-numbers">
          Presiona <kbd className="px-1.5 py-0.5 bg-neutral-800 border border-neutral-700 rounded text-neutral-300">ESPACIO</kbd> o <kbd className="px-1.5 py-0.5 bg-neutral-800 border border-neutral-700 rounded text-neutral-300">ENTER</kbd> para comenzar
        </div>

        {/* Características Clave destacadas con estilo sobrio */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full mt-10 text-left">
          <div className="p-3.5 rounded-lg border border-neutral-800/80 bg-neutral-900/60">
            <div className="flex items-center gap-2 text-rose-400 font-semibold text-xs uppercase mb-1">
              <Shield size={14} />
              Defensa de Base
            </div>
            <p className="text-xs text-neutral-400">Protege el generador central y repara las barreras dañadas.</p>
          </div>

          <div className="p-3.5 rounded-lg border border-neutral-800/80 bg-neutral-900/60">
            <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs uppercase mb-1">
              <Sparkles size={14} />
              Caja Misteriosa (700 🪙)
            </div>
            <p className="text-xs text-neutral-400">Armas legendarias (Rayo Cósmico, Tesla, Criogénico) y botiquines.</p>
          </div>

          <div className="p-3.5 rounded-lg border border-neutral-800/80 bg-neutral-900/60">
            <div className="flex items-center gap-2 text-sky-400 font-semibold text-xs uppercase mb-1">
              <Crosshair size={14} />
              Taller de Armas
            </div>
            <p className="text-xs text-neutral-400">Incrementa daño, cadencia, munición y torretas automáticas.</p>
          </div>
        </div>
      </div>

      {/* Flat Control-Hint Line obligatorio por Skill */}
      <div className="w-full max-w-4xl text-center py-2 px-4 rounded-lg bg-neutral-900/70 border border-neutral-800/60 text-xs text-neutral-400 font-mono-numbers z-10">
        WASD Mover · Click Disparar · Espacio / Click Der. Esquivar · R Recargar · E Interactuar / Caja · 1-4 Armas · Esc Pausa
      </div>
    </div>
  );
};
