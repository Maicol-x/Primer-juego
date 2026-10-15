import { describe, it, expect } from 'vitest';
import {
  rollMysteryBox,
  MYSTERY_BOX_COST,
  MYSTERY_BOX_DROPS,
} from '../src/game/weapons';

describe('rollMysteryBox (tabla de recompensas)', () => {
  it('siempre devuelve una entrada válida de la tabla oficial', () => {
    for (let i = 0; i < 200; i++) {
      const drop = rollMysteryBox();
      expect(MYSTERY_BOX_DROPS).toContain(drop);
      expect(typeof drop.name).toBe('string');
      expect(['weapon', 'heal', 'buff']).toContain(drop.type);
    }
  });

  it('el coste de la caja es un entero positivo (definición económica única)', () => {
    expect(Number.isInteger(MYSTERY_BOX_COST)).toBe(true);
    expect(MYSTERY_BOX_COST).toBeGreaterThan(0);
  });
});
