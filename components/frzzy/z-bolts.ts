import * as THREE from 'three';

/**
 * The FRZZY bolt Z as a 3D shape, and where the bolts float in the home hero. Shared by the
 * classic hero (hero-3d-backdrop.tsx, glossy bolts) and the liquid hero (components/liquid/
 * liquid-hero.tsx, glass bolts over the flowing gradient).
 */

export const Z_OUTLINE: [number, number][] = [
  [1, 2], [33, 2], [33, 6.19], [20.94, 19], [25, 19], [25, 23.24],
  [12.24, 36], [33, 36], [33, 42], [2, 42], [2, 37.76], [14.76, 25],
  [11, 25], [11, 20.81], [23.06, 8], [1, 8],
];

export function zGeometry(depth: number) {
  const s = new THREE.Shape();
  Z_OUTLINE.forEach(([x, y], i) => (i ? s.lineTo(x - 17, -(y - 22)) : s.moveTo(x - 17, -(y - 22))));
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 1.1, bevelSize: 0.7, bevelSegments: 4, steps: 1 });
  g.center();
  g.scale(1 / 22, 1 / 22, 1 / 22);
  return g;
}

// [x, y, z, scale, accent?] — arranged so bolts peek out around and behind the wordmark
// (kept in the upper part of the hero, above the headline copy)
export const BOLTS: [number, number, number, number, boolean][] = [
  [-6.2, 2.0, -4.5, 1.1, false],
  [-3.6, -0.6, -2.6, 0.75, true],
  [-0.6, 2.6, -6.5, 0.95, false],
  [2.4, -0.9, -4.0, 0.85, false],
  [5.0, 1.7, -2.8, 0.8, true],
  [7.6, 0.1, -6.2, 1.1, false],
  [0.8, 0.9, -9.5, 1.4, false],
  [-8.6, 0.0, -8.5, 1.05, false],
];
