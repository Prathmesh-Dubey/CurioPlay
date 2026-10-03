import { useEffect, useState } from 'react';
import { GamepadRig } from './choreography';
import { GamepadCanvas } from './GamepadCanvas';
import { useGamepadStatus } from './gamepadStore';

/*
 * Lazy chunk (three.js + R3F + GSAP live here, not in the landing bundle).
 * Attaches the scroll choreography, then mounts the fixed WebGL layer above the page content and
 * below the navigation. It fades in only once the model has rendered, in step with the Orrery's
 * flat mark fading out, so there is never an empty hero.
 */
export default function ScrollGamepadAnimation({ reducedMotion }: { reducedMotion: boolean }) {
  const [rig] = useState(() => new GamepadRig());
  const [attached, setAttached] = useState(false);
  const status = useGamepadStatus();

  useEffect(() => {
    const detach = rig.attach(reducedMotion);
    setAttached(true);
    return detach;
  }, [rig, reducedMotion]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[55] transition-opacity duration-700 ease-out"
      style={{ opacity: status === 'ready' ? 1 : 0 }}
    >
      {attached && <GamepadCanvas rig={rig} />}
    </div>
  );
}
