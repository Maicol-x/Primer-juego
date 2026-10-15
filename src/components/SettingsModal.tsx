import React from 'react';
import { CameraMode } from '../game/three/threeEngine';
import {
  Settings,
  Eye,
  Sliders,
  Compass,
  Volume2,
  VolumeX,
  X,
  Shield,
  Crosshair,
  Plane,
  MousePointer,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  cameraMode: CameraMode;
  onSelectCameraMode: (mode: CameraMode) => void;
  cameraFov: number;
  onChangeFov: (fov: number) => void;
  droneSpeed: number;
  onChangeDroneSpeed: (speed: number) => void;
  mouseSensitivity: number;
  onChangeSensitivity: (sens: number) => void;
  shoulderOffsetSide: number;
  onChangeShoulderOffset: (offset: number) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  cameraMode,
  onSelectCameraMode,
  cameraFov,
  onChangeFov,
  droneSpeed,
  onChangeDroneSpeed,
  mouseSensitivity,
  onChangeSensitivity,
  shoulderOffsetSide,
  onChangeShoulderOffset,
  soundEnabled,
  onToggleSound,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-neutral-900/95 border border-neutral-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Encabezado Táctico */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400">
              <Settings size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-wide text-neutral-100 flex items-center gap-2">
                AJUSTES DE CÁMARA & APUNTADO
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-sky-950 border border-sky-800 text-sky-400">
                  HALO-SYS v4.5
                </span>
              </h2>
              <p className="text-xs text-neutral-400">Comportamiento de vista en 3ª/1ª persona, sensibilidad y óptica</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* SECCIÓN 1: EXPLICACIÓN Y SELECCIÓN DE CÁMARAS */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                <Eye size={14} />
                Comportamiento de Cámaras (Alternar rápido con tecla [C] o [V])
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Tarjeta Tercera Persona Sobre el Hombro */}
              <button
                type="button"
                onClick={() => onSelectCameraMode('third-person')}
                className={`p-4 rounded-xl border text-left flex flex-col justify-between gap-3 transition-all cursor-pointer ${
                  cameraMode === 'third-person'
                    ? 'bg-sky-950/60 border-sky-500 text-sky-300 ring-1 ring-sky-500/50 shadow-lg shadow-sky-950/50'
                    : 'bg-neutral-950/60 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
                    <Shield size={18} />
                  </div>
                  {cameraMode === 'third-person' && (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-sky-500 text-neutral-950">
                      ACTIVA
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-neutral-100">3ª Persona (Sobre Hombro)</h3>
                  <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                    Ubicada <strong>detrás y al lado derecho</strong> del Spartan (no aérea). Control guiado con el ratón hacia donde miras.
                  </p>
                </div>
              </button>

              {/* Tarjeta Primera Persona */}
              <button
                type="button"
                onClick={() => onSelectCameraMode('first-person')}
                className={`p-4 rounded-xl border text-left flex flex-col justify-between gap-3 transition-all cursor-pointer ${
                  cameraMode === 'first-person'
                    ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/50 shadow-lg shadow-emerald-950/50'
                    : 'bg-neutral-950/60 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <Crosshair size={18} />
                  </div>
                  {cameraMode === 'first-person' && (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500 text-neutral-950">
                      ACTIVA
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-neutral-100">1ª Persona (Halo FPS)</h3>
                  <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                    Apuntado suave 1:1 directo desde los ojos. Sin giros descontrolados, con viewmodel del rifle y retroceso en pantalla.
                  </p>
                </div>
              </button>

              {/* Tarjeta Dron Libre */}
              <button
                type="button"
                onClick={() => onSelectCameraMode('drone')}
                className={`p-4 rounded-xl border text-left flex flex-col justify-between gap-3 transition-all cursor-pointer ${
                  cameraMode === 'drone'
                    ? 'bg-amber-950/60 border-amber-500 text-amber-300 ring-1 ring-amber-500/50 shadow-lg shadow-amber-950/50'
                    : 'bg-neutral-950/60 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                    <Plane size={18} />
                  </div>
                  {cameraMode === 'drone' && (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500 text-neutral-950">
                      ACTIVA
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-neutral-100">Cámara Libre (Dron)</h3>
                  <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                    Vuelo táctico con <strong>[WASD]</strong> y altitud <strong>[Q/E]</strong> para inspeccionar la base, zombies y el campo en 3D.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* SECCIÓN 2: CALIBRACIÓN DE SENSIBILIDAD & APUNTADO */}
          <div className="p-4 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
              <MousePointer size={14} className="text-sky-400" />
              Sensibilidad del Ratón & Alineación
            </span>

            {/* Sensibilidad */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span className="text-neutral-400">Sensibilidad de Apuntado (Ratón)</span>
                <span className="font-mono text-sky-400 font-bold">
                  {Math.round(mouseSensitivity * 10000) / 10}x
                </span>
              </div>
              <input
                type="range"
                min="8"
                max="45"
                step="1"
                value={Math.round(mouseSensitivity * 10000)}
                onChange={(e) => onChangeSensitivity(parseInt(e.target.value) / 10000)}
                className="w-full accent-sky-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-neutral-500 mt-1 font-mono">
                <span>0.8x (Precisión suave)</span>
                <span>2.2x (Recomendado)</span>
                <span>4.5x (Rápido)</span>
              </div>
            </div>

            {/* Ajuste de Desplazamiento de Hombro en Tercera Persona */}
            {cameraMode === 'third-person' && (
              <div className="pt-2 border-t border-neutral-800/80">
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="text-neutral-400">Posición en 3ª Persona</span>
                  <span className="font-mono text-sky-400 font-bold">
                    {shoulderOffsetSide === 0 ? 'Centrado detrás' : 'Sobre el Hombro Derecho'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onChangeShoulderOffset(0.7)}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                      shoulderOffsetSide > 0.3
                        ? 'bg-sky-950 border-sky-500 text-sky-300'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    Sobre el Hombro (Over-the-shoulder)
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeShoulderOffset(0)}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                      shoulderOffsetSide === 0
                        ? 'bg-sky-950 border-sky-500 text-sky-300'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    Centrado Clásico Detrás
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* SECCIÓN 3: PARÁMETROS ÓPTICOS Y FOV */}
          <div className="p-4 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
              <Sliders size={14} className="text-amber-400" />
              Campo de Visión (FOV) & Dron
            </span>

            {/* Slider FOV */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span className="text-neutral-400">Campo de Visión (FOV)</span>
                <span className="font-mono text-sky-400 font-bold">{cameraFov}°</span>
              </div>
              <input
                type="range"
                min="45"
                max="90"
                step="1"
                value={cameraFov}
                onChange={(e) => onChangeFov(parseInt(e.target.value))}
                className="w-full accent-sky-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-neutral-500 mt-1 font-mono">
                <span>45° (Zoom)</span>
                <span>65° (Estándar 3ª)</span>
                <span>90° (Gran Angular)</span>
              </div>
            </div>

            {/* Slider Velocidad Dron */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span className="text-neutral-400">Velocidad del Dron Libre</span>
                <span className="font-mono text-amber-400 font-bold">{droneSpeed} m/s</span>
              </div>
              <input
                type="range"
                min="10"
                max="45"
                step="1"
                value={droneSpeed}
                onChange={(e) => onChangeDroneSpeed(parseInt(e.target.value))}
                className="w-full accent-amber-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Toggle de Audio */}
            <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
              <span className="text-xs text-neutral-300 flex items-center gap-2">
                {soundEnabled ? <Volume2 size={16} className="text-emerald-400" /> : <VolumeX size={16} className="text-rose-400" />}
                Audio & Efectos de Disparo Web Audio
              </span>
              <button
                type="button"
                onClick={onToggleSound}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  soundEnabled
                    ? 'bg-emerald-950 border border-emerald-700/60 text-emerald-300'
                    : 'bg-rose-950 border border-rose-700/60 text-rose-300'
                }`}
              >
                {soundEnabled ? 'ACTIVADO' : 'MUTED'}
              </button>
            </div>
          </div>

          {/* SECCIÓN 4: GUÍA RÁPIDA DE CONTROLES */}
          <div className="p-4 rounded-xl bg-neutral-950/40 border border-neutral-800">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5 mb-2.5">
              <Compass size={14} />
              Controles Tácticos
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2 rounded bg-neutral-900 border border-neutral-800">
                <span className="font-mono font-bold text-sky-400">[C] / [V]</span>
                <p className="text-[11px] text-neutral-400 mt-0.5">Alternar Cámara</p>
              </div>
              <div className="p-2 rounded bg-neutral-900 border border-neutral-800">
                <span className="font-mono font-bold text-sky-400">[WASD]</span>
                <p className="text-[11px] text-neutral-400 mt-0.5">Mover en dirección vista</p>
              </div>
              <div className="p-2 rounded bg-neutral-900 border border-neutral-800">
                <span className="font-mono font-bold text-sky-400">[Ratón]</span>
                <p className="text-[11px] text-neutral-400 mt-0.5">Apuntar suavemente</p>
              </div>
              <div className="p-2 rounded bg-neutral-900 border border-neutral-800">
                <span className="font-mono font-bold text-sky-400">[Espacio / Der.]</span>
                <p className="text-[11px] text-neutral-400 mt-0.5">Dash Thrusters</p>
              </div>
            </div>
          </div>
        </div>

        {/* Pie del Modal */}
        <div className="px-6 py-3.5 border-t border-neutral-800 bg-neutral-950 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-neutral-950 font-bold text-xs uppercase tracking-wider transition-colors shadow-lg shadow-sky-500/20 cursor-pointer"
          >
            Aplicar y Volver al Combate
          </button>
        </div>
      </div>
    </div>
  );
};
