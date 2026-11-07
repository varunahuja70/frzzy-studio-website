'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { PALETTE_EVENT, readLivePalette } from '@/lib/palette';

/**
 * Live 3D backdrop behind the hero FRZZY wordmark: glossy FRZZY bolt Zs drifting at different
 * depths, fading into the page background. Tilts with the cursor, spins when the hero is zapped,
 * follows the active palette. Pauses off-screen; renders one still frame for reduced motion.
 */

const Z_OUTLINE: [number, number][] = [
  [1, 2], [33, 2], [33, 6.19], [20.94, 19], [25, 19], [25, 23.24],
  [12.24, 36], [33, 36], [33, 42], [2, 42], [2, 37.76], [14.76, 25],
  [11, 25], [11, 20.81], [23.06, 8], [1, 8],
];

function zGeometry(depth: number) {
  const s = new THREE.Shape();
  Z_OUTLINE.forEach(([x, y], i) => (i ? s.lineTo(x - 17, -(y - 22)) : s.moveTo(x - 17, -(y - 22))));
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 1.1, bevelSize: 0.7, bevelSegments: 4, steps: 1 });
  g.center();
  g.scale(1 / 22, 1 / 22, 1 / 22);
  return g;
}

const lin = (hex: number) => new THREE.Color(hex).convertSRGBToLinear();

// [x, y, z, scale, accent?] — arranged so bolts peek out around and behind the wordmark
// (kept in the upper part of the hero: the CSS mask fades the layer out above the headline copy)
const BOLTS: [number, number, number, number, boolean][] = [
  [-6.2, 2.0, -4.5, 1.1, false],
  [-3.6, -0.6, -2.6, 0.75, true],
  [-0.6, 2.6, -6.5, 0.95, false],
  [2.4, -0.9, -4.0, 0.85, false],
  [5.0, 1.7, -2.8, 0.8, true],
  [7.6, 0.1, -6.2, 1.1, false],
  [0.8, 0.9, -9.5, 1.4, false],
  [-8.6, 0.0, -8.5, 1.05, false],
];

export function Hero3DBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const hero = canvas?.closest('.hero') as HTMLElement | null;
    if (!canvas || !hero) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch {
      return; // no WebGL: the hero simply has no 3D layer
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(0, 0, 11);

    // studio reflections
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color(0x060606);
    const plane = new THREE.PlaneGeometry(1, 1);
    const box = (k: number, pos: [number, number, number], rot: [number, number, number], sc: [number, number]) => {
      const m = new THREE.Mesh(plane, new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1).multiplyScalar(k), side: THREE.DoubleSide }));
      m.position.set(...pos);
      m.rotation.set(...rot);
      m.scale.set(sc[0], sc[1], 1);
      envScene.add(m);
    };
    box(5, [0, 8, 0], [Math.PI / 2, 0, 0], [10, 16]);
    box(2.5, [-8, 1, 2], [0, Math.PI / 2, 0], [4, 10]);
    box(1.6, [8, 2, 3], [0, -Math.PI / 2, 0], [3, 8]);
    box(2.2, [0, 2, 10], [0, Math.PI, 0], [14, 3]);
    const env = pmrem.fromScene(envScene, 0.02).texture;
    scene.environment = env;
    pmrem.dispose();

    const neutral = new THREE.MeshPhysicalMaterial({ metalness: 0.85, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.1 });
    const accent = new THREE.MeshPhysicalMaterial({ metalness: 0.2, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.06, emissiveIntensity: 0.18 });
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(-4, 6, 6);
    scene.add(key);
    const rim = new THREE.PointLight(0xffffff, 30, 30);
    rim.position.set(6, -2, 2);
    scene.add(rim);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x000000, 0.35));
    scene.fog = new THREE.Fog(0x000000, 9, 22);

    const recolor = () => {
      const p = readLivePalette();
      // body colour: text colour, so bolts read on both dark and light palettes
      neutral.color.copy(lin(p.ivoryHex)).multiplyScalar(0.55);
      accent.color.copy(lin(p.accentHex));
      accent.emissive.copy(lin(p.accentHex));
      rim.color.copy(lin(p.accentHex));
      (scene.fog as THREE.Fog).color.copy(lin(p.blackHex)); // distant bolts melt into the page
    };
    recolor();

    const geo = zGeometry(9);
    const group = new THREE.Group();
    scene.add(group);
    const bolts = BOLTS.map(([x, y, z, s, isAccent], i) => {
      const m = new THREE.Mesh(geo, isAccent ? accent : neutral);
      m.position.set(x, y, z);
      m.scale.setScalar(s);
      m.rotation.set((i % 3) * 0.4 - 0.4, i * 0.7, (i % 2 ? 1 : -1) * 0.25);
      group.add(m);
      return { m, base: m.position.clone(), rot: m.rotation.clone(), speed: 0.12 + (i % 4) * 0.05, phase: i * 1.7 };
    });

    let W = 0;
    let H = 0;
    const layout = () => {
      const r = canvas.getBoundingClientRect();
      if (!r.width || !r.height) return;
      W = r.width;
      H = r.height;
      renderer.setSize(W, H, false);
      camera.aspect = W / H;
      // keep the composition on narrow screens; fog follows the camera so far bolts don't go black
      camera.position.z = W < 760 ? 15 : 11;
      const fog = scene.fog as THREE.Fog;
      fog.near = camera.position.z - 2;
      fog.far = camera.position.z + 11;
      camera.updateProjectionMatrix();
    };
    layout();
    const ro = new ResizeObserver(layout);
    ro.observe(canvas);

    if (reduce) {
      renderer.render(scene, camera);
      const onPal = () => { recolor(); renderer.render(scene, camera); };
      window.addEventListener(PALETTE_EVENT, onPal);
      return () => {
        window.removeEventListener(PALETTE_EVENT, onPal);
        ro.disconnect();
        geo.dispose(); neutral.dispose(); accent.dispose(); env.dispose(); renderer.dispose();
      };
    }

    let tx = 0, ty = 0, px = 0, py = 0, spin = 0;
    const onMove = (e: PointerEvent) => {
      const r = hero.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width - 0.5;
      ty = (e.clientY - r.top) / r.height - 0.5;
    };
    const onLeave = () => { tx = 0; ty = 0; };
    const onZap = () => { spin = 2.6; }; // hero click "zaps": bolts spin up, then settle
    hero.addEventListener('pointermove', onMove, { passive: true });
    hero.addEventListener('pointerleave', onLeave);
    hero.addEventListener('pointerdown', onZap, { passive: true });
    window.addEventListener(PALETTE_EVENT, recolor);

    let inView = true;
    const io = new IntersectionObserver(([en]) => { inView = en.isIntersecting; }, { rootMargin: '80px' });
    io.observe(hero);

    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      // paused off-screen, in a hidden tab, or while fully covered by the stack scroll
      if (!inView || document.hidden || hero.dataset.covered) { last = now; return; }
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = now / 1000;
      px += (tx - px) * 0.04;
      py += (ty - py) * 0.04;
      spin *= 0.94;
      group.rotation.y = px * 0.35;
      group.rotation.x = py * 0.22;
      for (const b of bolts) {
        b.m.position.y = b.base.y + Math.sin(t * b.speed * 2 + b.phase) * 0.18;
        b.m.rotation.y += (b.speed * 0.35 + spin) * dt;
        b.m.rotation.x = b.rot.x + Math.sin(t * b.speed + b.phase) * 0.12;
      }
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      hero.removeEventListener('pointermove', onMove);
      hero.removeEventListener('pointerleave', onLeave);
      hero.removeEventListener('pointerdown', onZap);
      window.removeEventListener(PALETTE_EVENT, recolor);
      geo.dispose(); neutral.dispose(); accent.dispose(); env.dispose(); renderer.dispose();
    };
  }, []);

  return <canvas className="hero-3d" ref={canvasRef} aria-hidden="true" />;
}
