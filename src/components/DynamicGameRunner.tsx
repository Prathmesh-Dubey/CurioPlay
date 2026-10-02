import React, { useState, useEffect, useMemo, useRef, memo, useCallback, type ReactNode } from "react";
import * as LucideReact from "lucide-react";
import * as Motion from "motion/react";
import { CurioLoader } from "@/components/ui/CurioLoader";
import { Button } from "@/components/ui/Button";
import { CornerTicks } from "@/components/ui/Decor";

interface DynamicGameRunnerProps {
  jsCode: string;
  onScoreSubmit: (score: number) => void;
  gameId?: string;
  userId?: string;
  gameTitle?: string;
}

interface RunnerCoreProps extends DynamicGameRunnerProps {
  /** Remounts the core so transpile + evaluate genuinely run again. */
  onRetry: () => void;
}

/* ------------------------------------------------------------------ */
/* Night-stage notice (the runner only ever lives on the Stage)        */
/* ------------------------------------------------------------------ */

function SandboxNotice({
  icon,
  kicker,
  title,
  detail,
  action,
}: {
  icon: ReactNode;
  kicker: string;
  title: string;
  detail: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex h-full w-full flex-1 items-center justify-center overflow-y-auto p-5 sm:p-8">
      <div
        role="alert"
        className="relative w-full max-w-xl rounded-[28px] border border-white/10 bg-navy-2/90 p-7 text-center text-white shadow-float backdrop-blur-sm sm:p-9"
      >
        <CornerTicks className="text-white/25" />
        <span className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl border border-red-400/25 bg-red-500/10 text-red-300">
          {icon}
        </span>
        <p className="label-mono text-night-sage/70">{kicker}</p>
        <h3 className="mt-2 text-lg font-bold">{title}</h3>
        <pre className="mt-4 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-white/10 bg-white/5 p-3 text-left font-mono text-xs leading-relaxed text-white/75">
          {detail}
        </pre>
        {action && <div className="mt-6 flex justify-center">{action}</div>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Core: transpile → evaluate → auto-scale (logic unchanged)           */
/* ------------------------------------------------------------------ */

function RunnerCore({
  jsCode,
  onScoreSubmit,
  gameId,
  userId,
  gameTitle,
  onRetry,
}: RunnerCoreProps) {

  const [error, setError] = useState<string | null>(null);
  const [compiledCode, setCompiledCode] = useState<string | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [scale, setScale] = useState(1);
  const [scaledDimensions, setScaledDimensions] = useState<{ width: number; height: number } | null>(null);
  const isUpdatingScale = useRef(false);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  // Handle browser fullscreen state (re-runs the auto-scale when the Stage enters/leaves fullscreen)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Step 1: Transpile (Babel is ~3 MB, so it is only fetched when a game actually launches)
  useEffect(() => {
    if (!jsCode) {
      setCompiledCode(null);
      setError("No source code provided.");
      return;
    }

    let cancelled = false;
    setError(null);
    import("@babel/standalone")
      .then((Babel) => {
        if (cancelled) return;
        const result = Babel.transform(jsCode, {
          presets: [
            ["env", { modules: "commonjs", targets: { esmodules: false }, useBuiltIns: false }],
            ["react", { runtime: "classic" }],
            "typescript",
          ],
          filename: "game.tsx",
        });
        setCompiledCode(result.code ?? null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);
        console.error("Transpilation error:", err);
        setError(`Transpilation failed: ${message}`);
        setCompiledCode(null);
      });

    return () => {
      cancelled = true;
    };
  }, [jsCode]);

  // Step 2: Evaluate
  const ComponentToRender = useMemo(() => {
    if (!compiledCode) return null;

    try {
      if (typeof window !== "undefined") {
        (window as any).CANVAS_WIDTH = (window as any).CANVAS_WIDTH ?? 800;
        (window as any).CANVAS_HEIGHT = (window as any).CANVAS_HEIGHT ?? 600;
        (window as any).WIDTH = (window as any).WIDTH ?? 800;
        (window as any).HEIGHT = (window as any).HEIGHT ?? 600;
      }
      if (typeof globalThis !== "undefined") {
        (globalThis as any).CANVAS_WIDTH = (globalThis as any).CANVAS_WIDTH ?? 800;
        (globalThis as any).CANVAS_HEIGHT = (globalThis as any).CANVAS_HEIGHT ?? 600;
        (globalThis as any).WIDTH = (globalThis as any).WIDTH ?? 800;
        (globalThis as any).HEIGHT = (globalThis as any).HEIGHT ?? 600;
      }

      const exports: any = {};
      const module = { exports };

      const requireMock = (pkgName: string) => {
        if (pkgName === "react" || pkgName.startsWith("react/")) {
          return React;
        }
        if (pkgName === "lucide-react") {
          return LucideReact;
        }
        if (pkgName === "motion" || pkgName === "motion/react" || pkgName === "framer-motion") {
          return Motion;
        }
        throw new Error(`Package "${pkgName}" is not available in the CurioPlay Sandbox.`);
      };

      const runner = new Function("exports", "module", "require", "React", compiledCode);
      runner(exports, module, requireMock, React);

      const ExecutedComponent = module.exports.default || module.exports.Game || Object.values(module.exports)[0];

      if (!ExecutedComponent || typeof ExecutedComponent !== "function") {
        throw new Error("No valid React component exported as default or named export.");
      }

      return ExecutedComponent;
    } catch (err: any) {
      console.error("Evaluation Error in Game Sandbox:", err);
      setError(err.message || "Unknown error during evaluation");
      return null;
    }
  }, [compiledCode]);

  // Auto-scale with debounce to prevent rapid re-renders
  useEffect(() => {
    if (!ComponentToRender || !containerRef.current || !contentRef.current) return;

    const updateScale = () => {
      if (isUpdatingScale.current) return;
      isUpdatingScale.current = true;

      try {
        if (!containerRef.current || !contentRef.current) return;

        const containerWidth = containerRef.current.clientWidth;
        const containerHeight = containerRef.current.clientHeight;

        const prevTransform = contentRef.current.style.transform;
        contentRef.current.style.transform = "scale(1)";

        const contentWidth = contentRef.current.scrollWidth || contentRef.current.offsetWidth;
        const contentHeight = contentRef.current.scrollHeight || contentRef.current.offsetHeight;

        contentRef.current.style.transform = prevTransform;

        if (contentWidth === 0 || contentHeight === 0 || containerWidth === 0 || containerHeight === 0) return;

        const paddingFactor = 0.98;
        const scaleX = (containerWidth * paddingFactor) / contentWidth;
        const scaleY = (containerHeight * paddingFactor) / contentHeight;

        const fitScale = Math.min(scaleX, scaleY);
        const newScale = Math.max(0.2, fitScale);

        setScale(prev => {
          if (Math.abs(prev - newScale) < 0.005) return prev;
          return newScale;
        });
        const newWidth = Math.floor(contentWidth * newScale);
        const newHeight = Math.floor(contentHeight * newScale);

        setScaledDimensions(prev => {
          if (prev && Math.abs(prev.width - newWidth) < 2 && Math.abs(prev.height - newHeight) < 2) return prev;
          return { width: newWidth, height: newHeight };
        });
      } finally {
        isUpdatingScale.current = false;
      }
    };

    const debouncedUpdate = () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
      debounceTimeout.current = setTimeout(updateScale, 50);
    };

    const resizeObserver = new ResizeObserver(() => debouncedUpdate());
    if (containerRef.current) resizeObserver.observe(containerRef.current);
    if (contentRef.current) resizeObserver.observe(contentRef.current);

    window.addEventListener("resize", debouncedUpdate);

    const t1 = setTimeout(updateScale, 30);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", debouncedUpdate);
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
      clearTimeout(t1);
    };
  }, [ComponentToRender, isFullscreen]);

  // Render
  if (error) {
    return (
      <SandboxNotice
        icon={<LucideReact.AlertTriangle className="size-6" />}
        kicker="Sandbox error"
        title={gameTitle ? `“${gameTitle}” couldn’t start` : "This experience couldn’t start"}
        detail={error}
        action={
          <Button variant="night" onClick={onRetry} leadingIcon={<LucideReact.RotateCcw className="size-4" />}>
            Retry
          </Button>
        }
      />
    );
  }

  if (!ComponentToRender) {
    return (
      <div className="flex h-full w-full flex-1 items-center justify-center p-8">
        <CurioLoader size="lg" onDark messages={["Compiling the code", "Preparing the sandbox", "Almost ready"]} />
      </div>
    );
  }

  try {
    return (
      // Scaling container: plain, never transformed or transitioned (only the inner content is scaled).
      <div ref={containerRef} className="relative flex h-full w-full flex-1 items-center justify-center overflow-hidden">
        <div
          style={{
            width: scaledDimensions ? `${scaledDimensions.width}px` : "auto",
            height: scaledDimensions ? `${scaledDimensions.height}px` : "auto",
            maxWidth: "100%",
            maxHeight: "100%",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
          className="shrink-0"
        >
          <div
            ref={contentRef}
            style={{
              transform: `scale(${scale})`,
              transformOrigin: "center center",
              transition: "transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
            className="flex items-center justify-center shrink-0"
          >
            <ComponentToRender
              onScoreSubmit={onScoreSubmit}
              gameId={gameId}
              userId={userId}
            />
          </div>
        </div>
      </div>
    );
  } catch (renderError: any) {
    return (
      <SandboxNotice
        icon={<LucideReact.Flame className="size-6" />}
        kicker="Runtime crash"
        title="The experience crashed while rendering"
        detail={renderError.message || "An exception occurred inside the component."}
        action={
          <Button variant="night" onClick={onRetry} leadingIcon={<LucideReact.RotateCcw className="size-4" />}>
            Retry
          </Button>
        }
      />
    );
  }
}

/**
 * Public runner. Props are unchanged; the keyed core lets "Retry" actually re-transpile and re-evaluate
 * (previously "Dismiss and retry" only cleared the error and left a loader spinning forever).
 * Fullscreen is owned by the Stage (ExperienceWorkspace) — the runner no longer draws its own button or title chip.
 */
const DynamicGameRunner = memo(function DynamicGameRunner(props: DynamicGameRunnerProps) {
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return <RunnerCore key={attempt} {...props} onRetry={retry} />;
});

export default DynamicGameRunner;
