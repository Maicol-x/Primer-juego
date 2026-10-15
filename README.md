# Zona Cero: Horda Zombie

Juego FPS de supervivencia contra hordas zombis, construido con **React 19 + TypeScript + Three.js** sobre **Vite**.

## Requisitos

- Node.js 20 o superior
- npm

## Comandos

```bash
npm install        # Instalar dependencias
npm run dev        # Servidor de desarrollo (puerto 3000)
npm run build      # Compilación de producción (genera dist/)
npm run preview    # Servir la compilación de producción
npm run lint       # Comprobación de tipos (tsc --noEmit)
npm test           # Ejecutar pruebas una vez (vitest run)
npm run test:watch # Pruebas en modo observación
```

## Arquitectura

```
src/
├── App.tsx                 # Orquestador React: estado de partida, economía, modales
├── components/             # Pantallas e interfaz (HUD, pausa, ajustes, caja misteriosa, derrota…)
└── game/
    ├── three/              # Motor activo: ThreeGameEngine (bucle, físicas, entidades, ciclo de vida)
    ├── engine.ts           # Motor Canvas 2D LEGADO — no importado por la app; conservado como referencia
    ├── audio.ts            # Sistema de audio (WebAudio)
    ├── weapons.ts          # Definición de armas y estadísticas
    └── types.ts            # Tipos compartidos
tests/                      # Pruebas Vitest + jsdom (economía, ciclo de vida, colisiones, geometry)
```

### Notas de diseño

- **Economía centralizada**: todos los cobros/recompensas (incluida la Caja Misteriosa) se resuelven en el motor. La UI muestra siempre el resultado real del motor (`requestMysterySpin` → `applyMysteryDrop`); no existe segunda tirada en el modal.
- **Ciclo de vida seguro**: el motor registra listeners con referencias estables y los retira en `destroy()`, que es idempotente. Los timeouts pendientes (Tesla, animaciones) se cancelan al destruir.
- **Game Over idempotente**: la transición terminal se emite una sola vez aunque varios zombies ataquen en el mismo frame; tras ella no se aplican daños ni recompensas.
- **Proyectiles sin tunneling**: detección de colisiones barrida (segmento recorrido vs. radio del objetivo), un único impacto por proyectil/enemigo.

## Variables de entorno

No son necesarias para jugar. `vite.config.ts` solo lee `DISABLE_HMR=true` para desactivar el hot-reload en entornos especiales. La dependencia `@google/genai` está declarada pero no se usa en el código actual; puede eliminarse en una limpieza futura. No subas archivos `.env` al repositorio (ya excluidos por `.gitignore`).
