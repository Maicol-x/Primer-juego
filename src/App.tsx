/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ThreeGameEngine, CameraMode } from './game/three/threeEngine';
import { Player, DefenseBase, MysteryBoxDrop, GameState } from './game/types';
import { sound } from './game/audio';
import { TitleScreen } from './components/TitleScreen';
import { HUD } from './components/HUD';
import { MysteryBoxModal } from './components/MysteryBoxModal';
import { BaseUpgradeModal } from './components/BaseUpgradeModal';
import { GameOverModal } from './components/GameOverModal';
import { PauseModal } from './components/PauseModal';
import { SettingsModal } from './components/SettingsModal';

export default function App() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<ThreeGameEngine | null>(null);

  const [gameState, setGameState] = useState<GameState>('TITLE_MENU');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Modos de cámara y ajustes
  const [cameraMode, setCameraMode] = useState<CameraMode>('third-person');
  const [cameraFov, setCameraFov] = useState(65);
  const [droneSpeed, setDroneSpeed] = useState(24);
  const [mouseSensitivity, setMouseSensitivity] = useState(0.0022);
  const [shoulderOffsetSide, setShoulderOffsetSide] = useState(0.7);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [droneTelemetry, setDroneTelemetry] = useState<{ alt: number; x: number; z: number } | undefined>();
  const [targetLocked, setTargetLocked] = useState(false);
  const [isHitmarker, setIsHitmarker] = useState(false);
  // Referencia al timeout del hitmarker para cancelarlo al desmontar/reiniciar.
  const hitmarkerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isPointerLocked, setIsPointerLocked] = useState(false);

  // Estados reactivos sincronizados desde el motor 3D
  const [playerState, setPlayerState] = useState<Player | null>(null);
  const [baseState, setBaseState] = useState<DefenseBase | null>(null);
  const [round, setRound] = useState(1);
  const [zombiesRemaining, setZombiesRemaining] = useState(10);
  const [inIntermission, setInIntermission] = useState(false);

  // Proximidad e Interacción
  const [isNearBox, setIsNearBox] = useState(false);
  const [isNearWorkshop, setIsNearWorkshop] = useState(false);
  const [isBoxModalOpen, setIsBoxModalOpen] = useState(false);
  const [isWorkshopModalOpen, setIsWorkshopModalOpen] = useState(false);

  // Resumen de Game Over
  const [gameOverStats, setGameOverStats] = useState({
    round: 1,
    kills: 0,
    score: 0,
    coins: 0,
  });

  // Alternar sonido global
  const handleToggleSound = useCallback(() => {
    const newState = sound.toggleSound();
    setSoundEnabled(newState);
  }, []);

  // Iniciar partida 3D
  const handleStartGame = useCallback(() => {
    if (!containerRef.current) return;

    if (engineRef.current) {
      engineRef.current.destroy();
      containerRef.current.innerHTML = '';
    }

    const engine = new ThreeGameEngine(containerRef.current, {
      onPlayerUpdate: (p) => setPlayerState(p),
      onBaseUpdate: (b) => setBaseState(b),
      onRoundUpdate: (r, zLeft, intermission) => {
        setRound(r);
        setZombiesRemaining(zLeft);
        setInIntermission(intermission);
      },
      onGameOver: (stats) => {
        setGameOverStats(stats);
        setGameState('GAME_OVER');
      },
      onNearMysteryBox: (near) => setIsNearBox(near),
      onNearWorkshop: (near) => setIsNearWorkshop(near),
      onOpenMysteryBox: () => {
        // El motor NO cobra aquí: solo notifica la interacción.
        // El cobro y la generación de recompensa ocurren una única vez
        // en requestMysterySpin() cuando el modal solicita el giro.
        setIsBoxModalOpen(true);
      },
      onCameraModeChange: (mode) => setCameraMode(mode),
      onDroneTelemetry: (tel) => setDroneTelemetry(tel),
      onTargetLock: (locked) => setTargetLocked(locked),
      onHitmarker: () => {
        setIsHitmarker(true);
        // Timer controlado: se cancela al desmontar para no actualizar estado
        // después del unmount (y evita acumular timeouts en ráfagas de impactos).
        if (hitmarkerTimerRef.current !== null) clearTimeout(hitmarkerTimerRef.current);
        hitmarkerTimerRef.current = setTimeout(() => {
          hitmarkerTimerRef.current = null;
          setIsHitmarker(false);
        }, 140);
      },
      onPauseRequest: () => {
        if (engineRef.current && !engineRef.current.isPaused) {
          engineRef.current.pause();
          setGameState('PAUSED');
        }
      },
      onPointerLockChange: (locked) => setIsPointerLocked(locked),
    });

    engineRef.current = engine;
    setPlayerState({ ...engine.player });
    setBaseState({ ...engine.base });
    setRound(1);
    setZombiesRemaining(engine.zombiesToSpawnThisRound);
    setInIntermission(false);
    setCameraMode(engine.cameraMode);

    setGameState('PLAYING');
    engine.start();
  }, []);

  // Reiniciar partida
  const handleRestart = useCallback(() => {
    setIsBoxModalOpen(false);
    setIsWorkshopModalOpen(false);
    setIsSettingsOpen(false);
    handleStartGame();
  }, [handleStartGame]);

  // Pausar
  const handlePause = useCallback(() => {
    if (gameState === 'PLAYING') {
      engineRef.current?.pause();
      setGameState('PAUSED');
    }
  }, [gameState]);

  // Reanudar
  const handleResume = useCallback(() => {
    if (gameState === 'PAUSED') {
      engineRef.current?.resume();
      setGameState('PLAYING');
    }
  }, [gameState]);

  // Manejo de cámara
  const handleCycleCamera = useCallback(() => {
    engineRef.current?.cycleCameraMode();
  }, []);

  const handleSelectCameraMode = useCallback((mode: CameraMode) => {
    engineRef.current?.setCameraMode(mode);
    setCameraMode(mode);
  }, []);

  const handleChangeFov = useCallback((fov: number) => {
    engineRef.current?.setCameraFov(fov);
    setCameraFov(fov);
  }, []);

  const handleChangeDroneSpeed = useCallback((speed: number) => {
    engineRef.current?.setDroneSpeed(speed);
    setDroneSpeed(speed);
  }, []);

  const handleChangeSensitivity = useCallback((sens: number) => {
    engineRef.current?.setMouseSensitivity(sens);
    setMouseSensitivity(sens);
  }, []);

  const handleChangeShoulderOffset = useCallback((offset: number) => {
    engineRef.current?.setShoulderOffsetSide(offset);
    setShoulderOffsetSide(offset);
  }, []);

  // Manejo de tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isSettingsOpen) {
          setIsSettingsOpen(false);
        } else if (isBoxModalOpen) {
          // Cierre con Escape: misma ruta que el botón X → cancelación con
          // reembolso centralizado si el giro aún no entregó su premio.
          handleCloseMysteryBox();
        } else if (isWorkshopModalOpen) {
          setIsWorkshopModalOpen(false);
        } else if (gameState === 'PLAYING') {
          handlePause();
        } else if (gameState === 'PAUSED') {
          handleResume();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, isSettingsOpen, isBoxModalOpen, isWorkshopModalOpen, handlePause, handleResume, handleCloseMysteryBox]);

  // Limpieza al desmontar App: cancelar timers de UI pendientes para no
  // actualizar estado después del unmount.
  useEffect(() => {
    return () => {
      if (hitmarkerTimerRef.current !== null) clearTimeout(hitmarkerTimerRef.current);
    };
  }, []);

  // Abrir modal de Caja Misteriosa (la interacción física la notifica el motor
  // vía onOpenMysteryBox; esta función queda para aperturas desde HUD/botón).
  const handleOpenMysteryBox = () => {
    if (!engineRef.current) return;
    setIsBoxModalOpen(true);
  };

  // Giro de la caja misteriosa: ÚNICA operación económica. El motor comprueba
  // saldo, descuenta el coste una sola vez y genera UNA recompensa, que es la
  // que se muestra en la interfaz (no una segunda tirada aleatoria).
  const handleSpinMysteryBox = (): MysteryBoxDrop | null => {
    if (!engineRef.current) return null;
    const drop = engineRef.current.requestMysterySpin();
    if (drop) {
      // Reflejar inmediatamente el saldo descontado en el HUD/modal.
      setPlayerState({ ...engineRef.current.player });
    }
    return drop;
  };

  // Reclamar premio de la caja misteriosa
  const handleClaimDrop = (drop: MysteryBoxDrop) => {
    if (!engineRef.current) return;
    engineRef.current.applyMysteryDrop(drop);
    setPlayerState({ ...engineRef.current.player });
    setBaseState({ ...engineRef.current.base });
    setIsBoxModalOpen(false);
  };

  // Animación terminada (premio visible): intenta pasar a "pendiente de reclamar".
  // El motor solo libera el bloqueo si NO existe un premio pendiente, por lo que
  // esta llamada es segura incluso si el modal ya obtuvo su drop.
  const handleMysterySpinResolved = () => {
    engineRef.current?.resolveMysterySpin();
  };

  // Cierre explícito del modal (botón X / Escape) con giro en curso y premio
  // aún NO reclamado: transacción cancelada → reembolso centralizado en el
  // motor (sin doble devolución). Si ya hay premio pendiente de reclamar,
  // se aplica automáticamente antes de cerrar: un premio pagado nunca se
  // pierde por cerrar la ventana. El orden es crítico: applyMysteryDrop
  // consume pendingDrop y libera spinPending, de modo que el posterior
  // cancelMysterySpin no encuentra giro pendiente y no devuelve dinero.
  const handleCloseMysteryBox = () => {
    const engine = engineRef.current;
    if (engine) {
      const pending = engine.getPendingMysteryDrop();
      if (pending) {
        engine.applyMysteryDrop(pending);
      } else {
        engine.cancelMysterySpin(engine.getMysteryBoxCost());
      }
      setPlayerState({ ...engine.player });
      setBaseState({ ...engine.base });
    }
    setIsBoxModalOpen(false);
  };

  // Cambiar arma activa
  const handleSwitchWeapon = (index: number) => {
    if (!engineRef.current) return;
    engineRef.current.switchWeapon(index);
    setPlayerState({ ...engineRef.current.player });
  };

  // Mejorar arma en taller → DELEGADO AL MOTOR (única autoridad económica:
  // valida saldo, límite de mejoras y estado terminal; descuenta una sola vez).
  const handleUpgradeWeapon = (weaponIndex: number) => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.purchaseWeaponUpgrade(weaponIndex);
    setPlayerState({ ...engine.player });
  };

  // Reparar base → delegado al motor
  const handleRepairBase = () => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.purchaseBaseRepair();
    setPlayerState({ ...engine.player });
    setBaseState({ ...engine.base });
  };

  // Mejorar blindaje base → delegado al motor
  const handleUpgradeBaseArmor = () => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.purchaseBaseArmor();
    setPlayerState({ ...engine.player });
    setBaseState({ ...engine.base });
  };

  // Mejorar torreta base → delegado al motor
  const handleUpgradeBaseTurret = () => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.purchaseBaseTurret();
    setPlayerState({ ...engine.player });
    setBaseState({ ...engine.base });
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-neutral-950 font-sans">
      {/* Contenedor del Canvas Three.js 3D aislado */}
      <div
        ref={containerRef}
        className={`w-full h-full block select-none ${gameState === 'PLAYING' ? (cameraMode === 'drone' ? 'cursor-grab' : 'cursor-none') : 'cursor-default'}`}
      />

      {/* Pantalla de Título */}
      {gameState === 'TITLE_MENU' && (
        <div className="absolute inset-0 z-30">
          <TitleScreen
            onStartGame={handleStartGame}
            soundEnabled={soundEnabled}
            onToggleSound={handleToggleSound}
          />
        </div>
      )}

      {/* HUD de Juego */}
      {(gameState === 'PLAYING' || gameState === 'PAUSED') && playerState && baseState && (
        <HUD
          player={playerState}
          base={baseState}
          round={round}
          zombiesRemaining={zombiesRemaining}
          inIntermission={inIntermission}
          soundEnabled={soundEnabled}
          onToggleSound={handleToggleSound}
          onPause={handlePause}
          onSwitchWeapon={handleSwitchWeapon}
          isNearBox={isNearBox}
          isNearWorkshop={isNearWorkshop}
          onOpenMysteryBox={handleOpenMysteryBox}
          onOpenWorkshop={() => setIsWorkshopModalOpen(true)}
          cameraMode={cameraMode}
          onCycleCamera={handleCycleCamera}
          onOpenSettings={() => setIsSettingsOpen(true)}
          droneTelemetry={droneTelemetry}
          targetLocked={targetLocked}
          isHitmarker={isHitmarker}
          isPointerLocked={isPointerLocked}
        />
      )}

      {/* Modal de Ajustes (Cámaras 1ª/3ª/Dron, FOV, Dron Speed, Sensibilidad) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        cameraMode={cameraMode}
        onSelectCameraMode={handleSelectCameraMode}
        cameraFov={cameraFov}
        onChangeFov={handleChangeFov}
        droneSpeed={droneSpeed}
        onChangeDroneSpeed={handleChangeDroneSpeed}
        mouseSensitivity={mouseSensitivity}
        onChangeSensitivity={handleChangeSensitivity}
        shoulderOffsetSide={shoulderOffsetSide}
        onChangeShoulderOffset={handleChangeShoulderOffset}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
      />

      {/* Modal de la Caja Misteriosa */}
      {playerState && (
        <MysteryBoxModal
          isOpen={isBoxModalOpen}
          onClose={handleCloseMysteryBox}
          coins={playerState.coins}
          spinCost={engineRef.current?.getMysteryBoxCost()}
          onSpin={handleSpinMysteryBox}
          onSpinResolved={handleMysterySpinResolved}
          onClaimDrop={handleClaimDrop}
        />
      )}

      {/* Modal del Taller de la Base */}
      {playerState && baseState && (
        <BaseUpgradeModal
          isOpen={isWorkshopModalOpen}
          onClose={() => setIsWorkshopModalOpen(false)}
          player={playerState}
          base={baseState}
          onUpgradeWeapon={handleUpgradeWeapon}
          onRepairBase={handleRepairBase}
          onUpgradeBaseArmor={handleUpgradeBaseArmor}
          onUpgradeBaseTurret={handleUpgradeBaseTurret}
        />
      )}

      {/* Modal de Pausa */}
      <PauseModal
        isOpen={gameState === 'PAUSED'}
        onResume={handleResume}
        onRestart={handleRestart}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Modal de Fin de Partida */}
      <GameOverModal
        isOpen={gameState === 'GAME_OVER'}
        onRestart={handleRestart}
        stats={gameOverStats}
      />
    </div>
  );
}
