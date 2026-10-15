import { describe, it, expect } from 'vitest';
import { distancePointToSegment } from '../src/game/three/threeEngine';

describe('distancePointToSegment (colisión barrida)', () => {
  it('devuelve distancia perpendicular a un segmento horizontal', () => {
    // Segmento de (0,0) a (10,0); punto (5,3) -> distancia 3
    expect(distancePointToSegment(5, 3, 0, 0, 10, 0)).toBeCloseTo(3);
  });

  it('satura el parámetro t en los extremos (segmento degenerado incluido)', () => {
    // Punto más allá del extremo: distancia al endpoint, no a la recta infinita
    expect(distancePointToSegment(-4, 3, 0, 0, 10, 0)).toBeCloseTo(5);
    // Segmento degenerado (punto)
    expect(distancePointToSegment(3, 4, 0, 0, 0, 0)).toBeCloseTo(5);
  });

  it('detecta que un paso largo pasa a través de un objetivo (anti-tunneling)', () => {
    // Zombie en (5, 0.2), radio efectivo 1. El proyectil vuela de (0,0) a (10,0)
    // en UN frame: la distancia al segmento es 0.2 < 1 => impacto detectado.
    const dist = distancePointToSegment(5, 0.2, 0, 0, 10, 0);
    expect(dist).toBeLessThan(1);
    // Con detección punto-a-punto clásica solo en el destino (10,0), la
    // distancia habría sido ~5 y el zombie habría sobrevivido (tunneling).
    const pointOnlyDist = Math.hypot(10 - 5, 0 - 0.2);
    expect(pointOnlyDist).toBeGreaterThan(1);
  });
});
