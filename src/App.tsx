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
import { getBaseUpgradeCost, getWeaponUpgradeCost, upgradeWeapon, rollMysteryBox } from './game/weapons';

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
      onOpenMysteryBoxResult: () => {
        setIsBoxModalOpen(true);
      },
      onCameraModeChange: (mode) => setCameraMode(mode),
      onDroneTelemetry: (tel) => setDroneTelemetry(tel),
      onTargetLock: (locked) => setTargetLocked(locked),
      onHitmarker: () => {
        setIsHitmarker(true);
        setTimeout(() => setIsHitmarker(false), 140);
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
          setIsBoxModalOpen(false);
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
  }, [gameState, isSettingsOpen, isBoxModalOpen, isWorkshopModalOpen, handlePause, handleResume]);

  // Abrir modal de Caja Misteriosa
  const handleOpenMysteryBox = () => {
    if (!engineRef.current) return;
    const opened = engineRef.current.openMysteryBox();
    if (opened) {
      setIsBoxModalOpen(true);
    }
  };

  // Giro de la caja misteriosa
  const handleSpinMysteryBox = (): MysteryBoxDrop | null => {
    if (!engineRef.current) return null;
    return rollMysteryBox();
  };

  // Reclamar premio de la caja misteriosa
  const handleClaimDrop = (drop: MysteryBoxDrop) => {
    if (!engineRef.current) return;
    engineRef.current.applyMysteryDrop(drop);
    setPlayerState({ ...engineRef.current.player });
    setBaseState({ ...engineRef.current.base });
    setIsBoxModalOpen(false);
  };

  // Cambiar arma activa
  const handleSwitchWeapon = (index: number) => {
    if (!engineRef.current) return;
    engineRef.current.switchWeapon(index);
    setPlayerState({ ...engineRef.current.player });
  };

  // Mejorar arma en taller
  const handleUpgradeWeapon = (weaponIndex: number) => {
    if (!engineRef.current) return;
    const p = engineRef.current.player;
    const w = p.weapons[weaponIndex];
    if (!w) return;

    const cost = getWeaponUpgradeCost(w);
    if (p.coins >= cost && w.upgradeLevel < w.maxUpgradeLevel) {
      p.coins -= cost;
      p.weapons[weaponIndex] = upgradeWeapon(w);
      setPlayerState({ ...p });
    }
  };

  // Reparar base
  const handleRepairBase = () => {
    if (!engineRef.current) return;
    const p = engineRef.current.player;
    const b = engineRef.current.base;
    const cost = getBaseUpgradeCost('repair', b);

    if (p.coins >= cost && b.hp < b.maxHp) {
      p.coins -= cost;
      b.hp = b.maxHp;
      setPlayerState({ ...p });
      setBaseState({ ...b });
    }
  };

  // Mejorar blindaje base
  const handleUpgradeBaseArmor = () => {
    if (!engineRef.current) return;
    const p = engineRef.current.player;
    const b = engineRef.current.base;
    const cost = getBaseUpgradeCost('armor', b);

    if (p.coins >= cost) {
      p.coins -= cost;
      b.armorLevel++;
      b.maxHp += 200;
      b.hp = Math.min(b.maxHp, b.hp + 200);
      setPlayerState({ ...p });
      setBaseState({ ...b });
    }
  };

  // Mejorar torreta base
  const handleUpgradeBaseTurret = () => {
    if (!engineRef.current) return;
    const p = engineRef.current.player;
    const b = engineRef.current.base;
    const cost = getBaseUpgradeCost('turret', b);

    if (p.coins >= cost) {
      p.coins -= cost;
      b.turretLevel++;
      b.turretFireRate = Number((b.turretFireRate * 1.25).toFixed(2));
      b.turretRange += 4;
      setPlayerState({ ...p });
      setBaseState({ ...b });
    }
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
          onClose={() => setIsBoxModalOpen(false)}
          coins={playerState.coins}
          onSpin={handleSpinMysteryBox}
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
