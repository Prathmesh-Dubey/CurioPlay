import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { Frame } from './choreography';
import { setGamepadStatus } from './gamepadStore';

/*
 * The real CurioPlay controller (public/models/gamepad.glb — Draco geometry + WebP normal maps,
 * PBR materials with clearcoat/sheen, origin at its centre, face +Z, top +Y) placed in screen space:
 * every frame the choreography says "centre at (sx, sy) px, this wide, this pose", and we convert
 * pixels to world units on the z = 0 plane of the fixed camera.
 */

const BASE = import.meta.env.BASE_URL;
export const GAMEPAD_MODEL_URL = `${BASE}models/gamepad.glb`;
const DRACO_DECODER_PATH = `${BASE}draco/gltf/`;

export const CAM_Z = 10;
export const CAM_FOV = 26;

/** World units per CSS pixel on a plane `depth` units in front of z = 0. */
export function unitsPerPx(viewportHeight: number, depth = 0) {
  return (2 * (CAM_Z - depth) * Math.tan(THREE.MathUtils.degToRad(CAM_FOV / 2))) / viewportHeight;
}

let draco: DRACOLoader | null = null;
function dracoLoader() {
  if (!draco) {
    draco = new DRACOLoader();
    draco.setDecoderPath(DRACO_DECODER_PATH); // WASM decoder, self-hosted (works offline / in the Android app)
  }
  return draco;
}

export function Gamepad3D({ frame }: { frame: RefObject<Frame | null> }) {
  const gltf = useLoader(GLTFLoader, GAMEPAD_MODEL_URL, (loader) => {
    loader.setDRACOLoader(dracoLoader());
  });
  const { model, width } = useMemo(() => {
    const root = gltf.scene;
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mat = mesh.material as THREE.MeshPhysicalMaterial;
      // normal maps are tiling micro-textures: anisotropic filtering keeps them crisp at grazing angles
      if (mat.normalMap) mat.normalMap.anisotropy = 4;
    });
    const size = new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());
    return { model: root, width: size.x || 0.157 };
  }, [gltf]);

  const group = useRef<THREE.Group>(null);
  const size = useThree((s) => s.size);
  const announced = useRef(false);

  useFrame(() => {
    const f = frame.current;
    const g = group.current;
    if (!f || !g) return;
    const upp = unitsPerPx(size.height);
    g.position.set((f.sx - size.width / 2) * upp, -(f.sy - size.height / 2) * upp, 0);
    g.scale.setScalar((f.size * upp) / width);
    g.rotation.set(f.rx, f.ry, f.rz, 'YXZ');
    if (!announced.current) {
      announced.current = true;
      // first pose applied: let the hero cross-fade from the flat mark to the model
      requestAnimationFrame(() => setGamepadStatus('ready'));
    }
  });

  return (
    <group ref={group}>
      <primitive object={model} />
    </group>
  );
}

function radialTexture(stops: [number, string][]) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  stops.forEach(([o, col]) => g.addColorStop(o, col));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** A soft contact shadow under the controller (behind it in depth, so the model always occludes it). */
export function ContactShadow({ frame }: { frame: RefObject<Frame | null> }) {
  const tex = useMemo(
    () =>
      radialTexture([
        [0, 'rgba(0,0,0,1)'],
        [0.45, 'rgba(0,0,0,0.55)'],
        [1, 'rgba(0,0,0,0)'],
      ]),
    [],
  );
  useEffect(() => () => tex.dispose(), [tex]);
  const mesh = useRef<THREE.Mesh>(null);
  const size = useThree((s) => s.size);
  const DEPTH = -1.5;

  useFrame(() => {
    const f = frame.current;
    const m = mesh.current;
    if (!f || !m) return;
    const upp = unitsPerPx(size.height, DEPTH);
    m.position.set((f.sx - size.width / 2) * upp, -(f.shadowY - size.height / 2) * upp, DEPTH);
    const w = f.size * (1.1 - 0.25 * f.shadow) * upp;
    m.scale.set(w, w * 0.2, 1);
    (m.material as THREE.MeshBasicMaterial).opacity = f.shadow;
    m.visible = f.shadow > 0.01;
  });

  return (
    <mesh ref={mesh} renderOrder={-1}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={tex} color="#000510" transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

/** A few slow dust motes in the hero light. They stay with the hero as the controller leaves. */
export function Motes({ frame, count = 46 }: { frame: RefObject<Frame | null>; count?: number }) {
  const { geometry, texture } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // shell around the controller, flattened like the orbit plane
      const a = Math.random() * Math.PI * 2;
      const r = 0.55 + Math.random() * 0.6;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = Math.sin(a) * r * 0.62 + (Math.random() - 0.5) * 0.25;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 0.8;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const texture = radialTexture([
      [0, 'rgba(255,255,255,1)'],
      [0.35, 'rgba(255,255,255,0.6)'],
      [1, 'rgba(255,255,255,0)'],
    ]);
    return { geometry, texture };
  }, [count]);
  useEffect(
    () => () => {
      geometry.dispose();
      texture.dispose();
    },
    [geometry, texture],
  );

  const points = useRef<THREE.Points>(null);
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);

  useFrame((state, dt) => {
    const f = frame.current;
    const p = points.current;
    if (!f || !p) return;
    const upp = unitsPerPx(size.height, -0.5);
    p.position.set((f.heroX - size.width / 2) * upp, -(f.heroY - size.height / 2) * upp, -0.5);
    p.scale.setScalar(f.heroSize * upp * 0.62);
    p.rotation.y += dt * 0.05;
    p.rotation.z = Math.sin(state.clock.elapsedTime * 0.1) * 0.08;
    const mat = p.material as THREE.PointsMaterial;
    mat.opacity = 0.55 * f.heroFade;
    mat.size = 5 * dpr;
    p.visible = f.heroFade > 0.01;
  });

  return (
    <points ref={points} geometry={geometry}>
      <pointsMaterial
        map={texture}
        color="#8bcbff"
        sizeAttenuation={false}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}
