import { Suspense, useEffect, useRef, useState, type RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { Frame, GamepadRig } from './choreography';
import { CAM_FOV, CAM_Z, ContactShadow, Gamepad3D, Motes } from './Gamepad3D';

/*
 * The WebGL layer: a transparent, viewport-sized canvas that never takes pointer or touch input
 * (page scrolling always works), with a capped pixel ratio and a render loop that stops entirely
 * once the controller has scrolled away.
 */

/** Samples the choreography once per frame for everyone else, and moves the camera a touch. */
function Director({ rig, frame }: { rig: GamepadRig; frame: RefObject<Frame | null> }) {
  const setFrameloop = useThree((s) => s.setFrameloop);
  const invalidate = useThree((s) => s.invalidate);
  const camera = useThree((s) => s.camera);
  const canvas = useThree((s) => s.gl.domElement);

  useEffect(() => {
    // render on demand: scroll, scrub, pointer and layout changes wake the loop; it sleeps when settled
    rig.invalidate = () => invalidate();
    let raf = 0;
    const apply = (visible: boolean) => {
      cancelAnimationFrame(raf);
      if (visible) {
        // draw the current pose first, then reveal — never flash the frame from before it slept
        setFrameloop('demand');
        invalidate();
        raf = requestAnimationFrame(() => (canvas.style.visibility = 'visible'));
      } else {
        // stopping the loop leaves the last frame on the canvas, so hide it as well
        canvas.style.visibility = 'hidden';
        setFrameloop('never');
      }
    };
    rig.onVisibility = apply;
    apply(rig.visible);
    return () => {
      cancelAnimationFrame(raf);
      rig.invalidate = () => {};
      rig.onVisibility = null;
    };
  }, [rig, setFrameloop, invalidate, canvas]);

  useFrame((state, dt) => {
    const f = rig.sample(state.clock.elapsedTime, Math.min(dt, 0.1));
    frame.current = f;
    // camera: a slow push-in and a hint of rise during each flight
    camera.position.set(0, 0.08 * f.cam, CAM_Z - 0.4 * f.cam);
    camera.rotation.set(0.006 * f.cam, 0, 0);
    if (f.animating) invalidate();
  }, -1);
  return null;
}

/** Studio rig matching the product render: warm softbox key, blue rim lights, faint fill from below. */
function StudioLights({ frame }: { frame: RefObject<Frame | null> }) {
  const key = useRef<THREE.DirectionalLight>(null);
  const rim = useRef<THREE.DirectionalLight>(null);
  useFrame(() => {
    const c = frame.current?.cam ?? 0;
    // as it falls the key softens and the blue rim takes over — a little depth change mid-flight
    if (key.current) key.current.intensity = 2.5 - 0.5 * c;
    if (rim.current) rim.current.intensity = 1.6 + 1.1 * Math.sin(Math.PI * Math.min(1, c * 1.2));
  });
  return (
    <>
      <hemisphereLight args={['#dfe9ff', '#081a30', 0.35]} />
      <directionalLight ref={key} position={[-4.5, 5, 7]} intensity={2.5} color="#fff4e8" />
      <directionalLight ref={rim} position={[5.5, 3.5, -5]} intensity={1.6} color="#8bcbff" />
      <directionalLight position={[-6, -1, -4]} intensity={1.1} color="#2563eb" />
      <directionalLight position={[2, -5, 4]} intensity={0.3} color="#bcd4ff" />
    </>
  );
}

/** Image-based reflections from a procedural studio room — no HDR download. */
function StudioEnvironment() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const env = pmrem.fromScene(room, 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.55;
    return () => {
      scene.environment = null;
      env.dispose();
      room.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return null;
}

export function GamepadCanvas({ rig }: { rig: GamepadRig }) {
  const frame = useRef<Frame | null>(null);
  // sharp on retina, but never render more than ~1.75× (phones 1.5×) — the canvas covers the viewport
  const [dpr] = useState(() => Math.min(window.devicePixelRatio || 1, rig.mobile ? 1.5 : 1.75));

  return (
    <Canvas
      frameloop="demand"
      dpr={dpr}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance', stencil: false }}
      camera={{ fov: CAM_FOV, near: 0.1, far: 60, position: [0, 0, CAM_Z] }}
      style={{ pointerEvents: 'none', touchAction: 'auto' }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
      }}
    >
      <Director rig={rig} frame={frame} />
      <StudioLights frame={frame} />
      <StudioEnvironment />
      <Motes frame={frame} count={rig.mobile ? 24 : 46} />
      <Suspense fallback={null}>
        <ContactShadow frame={frame} />
        <Gamepad3D frame={frame} />
      </Suspense>
    </Canvas>
  );
}
