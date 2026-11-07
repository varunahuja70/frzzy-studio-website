'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const Z_OUTLINE: [number, number][] = [
  [1, 2], [33, 2], [33, 6.19], [20.94, 19], [25, 19], [25, 23.24],
  [12.24, 36], [33, 36], [33, 42], [2, 42], [2, 37.76], [14.76, 25],
  [11, 25], [11, 20.81], [23.06, 8], [1, 8]
];

function lin(hex: number): THREE.Color {
  return new THREE.Color(hex).convertSRGBToLinear();
}

function makeEnv(renderer: THREE.WebGLRenderer): THREE.Texture {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = new THREE.Scene();
  env.background = lin(0x0a0a0a);
  const geo = new THREE.PlaneGeometry(1, 1);

  function panel(hex: number, k: number, pos: [number, number, number], rot: [number, number, number], sc: [number, number]) {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: lin(hex).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(pos[0], pos[1], pos[2]);
    m.rotation.set(rot[0], rot[1], rot[2]);
    m.scale.set(sc[0], sc[1], 1);
    env.add(m);
  }

  panel(0xffffff, 4, [0, 7, 0], [Math.PI / 2, 0, 0], [8, 8]);
  panel(0xffffff, 2.6, [-7, 1, 3], [0, Math.PI / 2, 0], [2.5, 9]);
  panel(0xC6FF00, 2.4, [7, -1, -1], [0, -Math.PI / 2, 0], [2, 7]);
  panel(0xF3EFE7, 1.2, [0, -1, -8], [0, 0, 0], [14, 2.5]);
  panel(0xffffff, 1.6, [3, 2, 8], [0, Math.PI, 0], [4, 1.5]);

  return pmrem.fromScene(env, 0.03).texture;
}

function boltZ(material: THREE.Material, depth: number): THREE.Group {
  const shape = new THREE.Shape();
  for (let i = 0; i < Z_OUTLINE.length; i++) {
    const x = Z_OUTLINE[i][0] - 17;
    const y = -(Z_OUTLINE[i][1] - 22);
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 1.1,
    bevelSize: 0.7,
    bevelSegments: 5,
    steps: 1,
  });
  geo.center();

  const mesh = new THREE.Mesh(geo, material);
  mesh.scale.setScalar(1 / 22);
  const outer = new THREE.Group();
  outer.add(mesh);
  return outer;
}

export function Viewport3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotY, setRotY] = useState('000°');
  const [hudState, setHudState] = useState(false);

  useEffect(() => {
    const box = containerRef.current;
    const canvas = canvasRef.current;
    if (!box || !canvas) return;

    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fine = window.matchMedia && window.matchMedia('(pointer: fine)').matches;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, fine ? 2 : 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    scene.environment = makeEnv(renderer);

    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    camera.position.set(0, 1.1, 10.5);
    camera.lookAt(0, -0.25, 0);

    scene.add(new THREE.HemisphereLight(lin(0xffffff), lin(0x1a1a1a), 0.45));

    const key = new THREE.DirectionalLight(lin(0xfff4e6), 1.7);
    key.position.set(3, 6, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    const sc2 = key.shadow.camera;
    sc2.left = -4;
    sc2.right = 4;
    sc2.top = 4;
    sc2.bottom = -4;
    sc2.near = 1;
    sc2.far = 20;
    key.shadow.bias = -0.0006;
    scene.add(key);

    const fill = new THREE.DirectionalLight(lin(0xffffff), 0.4);
    fill.position.set(-5, 2, 3);
    scene.add(fill);

    const rim = new THREE.PointLight(lin(0xC6FF00), 1.4, 20);
    rim.position.set(-4, 1, -3);
    scene.add(rim);

    const zapLight = new THREE.PointLight(lin(0xC6FF00), 0, 7);
    zapLight.position.set(0, 0, 1.2);
    scene.add(zapLight);

    const ivoryMat = new THREE.MeshPhysicalMaterial({
      color: lin(0xF3EFE7),
      roughness: 0.24,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
    });
    const voltMat = new THREE.MeshPhysicalMaterial({
      color: lin(0xC6FF00),
      roughness: 0.2,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
      emissive: lin(0xC6FF00),
      emissiveIntensity: 0.14,
    });

    const g = new THREE.Group();
    scene.add(g);

    const a = boltZ(ivoryMat, 10);
    a.position.x = -1.0;
    const b = boltZ(voltMat, 10);
    b.position.x = 1.0;

    [a, b].forEach((z) => {
      z.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) o.castShadow = true;
      });
      g.add(z);
    });
    g.scale.setScalar(1.12);

    const floorY = -1.5;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.5 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = floorY;
    floor.receiveShadow = true;
    scene.add(floor);

    const ringMat = new THREE.MeshBasicMaterial({
      color: lin(0xC6FF00),
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(2.25, 2.29, 128), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = floorY + 0.01;
    scene.add(ring);

    const ring2 = new THREE.Mesh(
      new THREE.RingGeometry(2.7, 2.71, 128),
      new THREE.MeshBasicMaterial({ color: lin(0xF3EFE7), transparent: true, opacity: 0.18, side: THREE.DoubleSide })
    );
    ring2.rotation.x = -Math.PI / 2;
    ring2.position.y = floorY + 0.01;
    scene.add(ring2);

    // Lightning arcs
    const ARC_N = 16;
    interface ArcObject {
      line: THREE.Line;
      from: [number, number, number];
      to: [number, number, number];
      on: boolean;
    }
    const arcs: ArcObject[] = [];
    for (let i = 0; i < 3; i++) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(ARC_N * 3), 3));
      const line = new THREE.Line(
        geo,
        new THREE.LineBasicMaterial({ color: lin(0xC6FF00), transparent: true, opacity: 0, depthTest: false })
      );
      line.renderOrder = 5;
      g.add(line);
      arcs.push({ line, from: [0, 0, 0], to: [0, 0, 0], on: false });
    }

    // Sparks
    const SP = 90;
    const spPos = new Float32Array(SP * 3);
    const spVel = new Float32Array(SP * 3);
    const spLife = new Float32Array(SP);
    let spNext = 0;
    for (let i = 0; i < SP; i++) spPos[i * 3 + 1] = -99;
    const spGeo = new THREE.BufferGeometry();
    spGeo.setAttribute('position', new THREE.BufferAttribute(spPos, 3));
    const sparks = new THREE.Points(
      spGeo,
      new THREE.PointsMaterial({ color: lin(0xC6FF00), size: 0.07, transparent: true, opacity: 0.95, depthWrite: false })
    );
    g.add(sparks);

    const ROWS: [number, number, number][] = [
      [0.77, -0.28, 0.28],
      [0.0, -0.64, 0.72],
      [-0.77, -0.28, 0.3],
    ];

    function rand(lo: number, hi: number): number {
      return lo + Math.random() * (hi - lo);
    }

    function emit(x: number, y: number, z: number, n: number) {
      for (let k = 0; k < n; k++) {
        const j = spNext;
        spNext = (spNext + 1) % SP;
        spPos[j * 3] = x;
        spPos[j * 3 + 1] = y;
        spPos[j * 3 + 2] = z;
        spVel[j * 3] = rand(-1.6, 1.6);
        spVel[j * 3 + 1] = rand(0.2, 2.6);
        spVel[j * 3 + 2] = rand(-1.2, 1.6);
        spLife[j] = rand(0.35, 0.8);
      }
    }

    function shapeArc(arc: ArcObject, amp: number) {
      const pos = (arc.line.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
      const f = arc.from;
      const t2 = arc.to;
      for (let k = 0; k < ARC_N; k++) {
        const u = k / (ARC_N - 1);
        const env = Math.sin(Math.PI * u);
        pos[k * 3] = f[0] + (t2[0] - f[0]) * u;
        pos[k * 3 + 1] = f[1] + (t2[1] - f[1]) * u + (Math.random() - 0.5) * amp * env;
        pos[k * 3 + 2] = f[2] + (t2[2] - f[2]) * u + (Math.random() - 0.5) * amp * env;
      }
      arc.line.geometry.attributes.position.needsUpdate = true;
    }

    let arcUntil = 0;
    let arcPower = 0;
    let nextArc = 1.2;
    let spin = 0;
    let spinTarget = 0;

    function strike(t: number, power: number, count: number) {
      arcUntil = t + (power > 1 ? 0.9 : 0.34);
      arcPower = power;
      const rows = ROWS.slice().sort(() => Math.random() - 0.5);
      for (let k = 0; k < arcs.length; k++) {
        const arc = arcs[k];
        if (k < count) {
          const r = rows[k];
          const yj = rand(-0.08, 0.08);
          const zj = rand(-0.15, 0.32);
          arc.from = [r[1], r[0] + yj, zj];
          arc.to = [r[2], r[0] + rand(-0.08, 0.08), zj + rand(-0.1, 0.1)];
          arc.on = true;
          emit(arc.from[0], arc.from[1], arc.from[2], power > 1 ? 10 : 4);
          emit(arc.to[0], arc.to[1], arc.to[2], power > 1 ? 10 : 4);
        } else {
          arc.on = false;
        }
      }
    }

    let px = 0;
    let py = 0;

    const onPointerMove = (e: PointerEvent) => {
      const rc = box.getBoundingClientRect();
      px = ((e.clientX - rc.left) / rc.width) * 2 - 1;
      py = ((e.clientY - rc.top) / rc.height) * 2 - 1;
    };

    const onPointerLeave = () => {
      px = 0;
      py = 0;
    };

    const onPointerDown = () => {
      const t = performance.now() / 1000;
      strike(t, 2, 3);
      spinTarget += Math.PI * 2;
    };

    function layout() {
      if (!box || !canvas || !renderer) return;
      const w = box.clientWidth;
      const h = box.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }

    layout();
    if (reduce) {
      g.rotation.set(-0.06, 0.42, 0);
      renderer.render(scene, camera);
      return;
    }

    box.addEventListener('pointermove', onPointerMove, { passive: true });
    box.addEventListener('pointerleave', onPointerLeave);
    box.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('resize', layout);

    let inView = false;
    let last = performance.now();
    let animId: number;

    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
    }, { rootMargin: '100px' });
    observer.observe(box);

    function frame(now: number) {
      animId = requestAnimationFrame(frame);
      if (!inView || document.hidden) {
        last = now;
        return;
      }
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const t = now / 1000;

      if (t > nextArc && t > arcUntil) {
        strike(t, 1, Math.random() < 0.4 ? 2 : 1);
        nextArc = t + rand(1.4, 3);
      }
      const live = t < arcUntil;
      setHudState(live);

      for (let k = 0; k < arcs.length; k++) {
        const arc = arcs[k];
        if (live && arc.on) {
          shapeArc(arc, 0.22 * arcPower);
          (arc.line.material as THREE.LineBasicMaterial).opacity = rand(0.45, 1);
        } else {
          (arc.line.material as THREE.LineBasicMaterial).opacity = 0;
        }
      }

      zapLight.intensity += ((live ? rand(2, 4.5) * arcPower : 0) - zapLight.intensity) * 0.5;
      ringMat.opacity = 0.35 + Math.min(1, zapLight.intensity / 4) * 0.5;
      voltMat.emissiveIntensity = 0.14 + Math.min(1, zapLight.intensity / 4) * 0.5;

      for (let j = 0; j < SP; j++) {
        if (spLife[j] > 0) {
          spLife[j] -= dt;
          spVel[j * 3 + 1] -= 6 * dt;
          spPos[j * 3] += spVel[j * 3] * dt;
          spPos[j * 3 + 1] += spVel[j * 3 + 1] * dt;
          spPos[j * 3 + 2] += spVel[j * 3 + 2] * dt;
          if (spLife[j] <= 0) spPos[j * 3 + 1] = -99;
        }
      }
      spGeo.attributes.position.needsUpdate = true;

      spin += (spinTarget - spin) * 0.06;
      const shake = live && arcPower > 1 ? rand(-0.02, 0.02) : 0;
      g.rotation.y += ((Math.sin(t * 0.55) * 0.5 + px * 0.55 + spin) - g.rotation.y) * 0.08;
      g.rotation.x += ((py * 0.22 - 0.04) - g.rotation.x) * 0.08;
      g.position.y = Math.sin(t * 1.2) * 0.06 + shake;
      a.position.y = Math.sin(t * 1.4) * 0.05;
      b.position.y = Math.sin(t * 1.4 + Math.PI) * 0.05;

      const deg = Math.round((((g.rotation.y * 180) / Math.PI) % 360 + 360) % 360);
      setRotY(`Rot Y ${('00' + deg).slice(-3)}°`);

      renderer.render(scene, camera);
    }

    animId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(animId);
      observer.disconnect();
      box.removeEventListener('pointermove', onPointerMove);
      box.removeEventListener('pointerleave', onPointerLeave);
      box.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('resize', layout);
      renderer.dispose();
    };
  }, []);

  return (
    <div className="viewport" ref={containerRef} id="viewport">
      <canvas id="z-gl" ref={canvasRef} aria-hidden="true" />
      <div className="hud top">
        <span>Viewport 01 · Perspective</span>
        <span id="hud-state">
          <b>●</b> {hudState ? 'Arc' : 'Idle'}
        </span>
      </div>
      <div className="hud bot">
        <span id="hud-rot">{rotY}</span>
        <span>Move to tilt · click to zap</span>
      </div>
    </div>
  );
}
