import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { useReducedMotion } from 'motion/react';
import { setGamepadStatus } from './gamepadStore';

/*
 * Entry point for the landing page's 3D controller. Deliberately tiny: it checks WebGL, waits for
 * the browser to be idle after first paint, then lazy-loads the real experience. Until the model is
 * on screen the hero keeps its flat CurioPlay mark (the loading state); on any failure it simply
 * stays that way ('fallback').
 */

const ScrollGamepadAnimation = lazy(() => import('./ScrollGamepadAnimation'));

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return Boolean(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

class GamepadBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    setGamepadStatus('fallback');
    if (import.meta.env.DEV) console.warn('[gamepad] 3D hero disabled:', error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function GamepadStage() {
  const reduce = useReducedMotion();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!hasWebGL()) {
      setGamepadStatus('fallback');
      return;
    }
    setGamepadStatus('loading');
    const go = () => setReady(true);
    const idle = window.requestIdleCallback?.(go, { timeout: 1200 });
    const timer = idle === undefined ? window.setTimeout(go, 250) : undefined;
    return () => {
      if (idle !== undefined) window.cancelIdleCallback?.(idle);
      if (timer !== undefined) window.clearTimeout(timer);
      setGamepadStatus('idle');
    };
  }, []);

  if (!ready) return null;
  return (
    <GamepadBoundary>
      <Suspense fallback={null}>
        <ScrollGamepadAnimation reducedMotion={Boolean(reduce)} />
      </Suspense>
    </GamepadBoundary>
  );
}
