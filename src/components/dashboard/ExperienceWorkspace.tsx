/*
 * THE STAGE — the shared runner for games and simulators. Night surface, minimal chrome: the experience is the hero.
 * Launch: a night plate expands from the launching card's rect to full screen (clip-path on a *sibling* overlay —
 * never on anything that contains the runner), and only then does the runner mount in a plain flex-1 container.
 * While you play the chrome dims after a few idle seconds and returns on pointer movement or keyboard focus.
 * Exit reverses quickly, back toward the exhibit it came from.
 */
import { useBackClose } from '@/lib/backStack';
import {
  Component,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ErrorInfo,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'motion/react';
import {
  AlertTriangle,
  ArrowLeft,
  Flag,
  Info,
  Maximize2,
  Medal,
  Minimize2,
  RotateCcw,
  ShieldAlert,
  Timer,
  Trophy,
  X,
} from 'lucide-react';
import DynamicGameRunner from '@/components/DynamicGameRunner';
import { Badge } from '@/components/ui/Badge';
import { Button, IconButton } from '@/components/ui/Button';
import { CurioLoader } from '@/components/ui/CurioLoader';
import { CornerTicks } from '@/components/ui/Decor';
import { Breadcrumbs, type Crumb } from '@/components/ui/Nav';
import { Sheet, useFocusTrap } from '@/components/ui/Overlay';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { dur, ease } from '@/lib/motion';
import { cn } from '@/lib/utils';

export interface ExperienceOriginRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface ExperienceWorkspaceProps {
  kind: 'game' | 'simulator';
  title: string;
  category?: string | null;
  /** Source code to run. `null` once loading has finished means "no code found". */
  code: string | null;
  loading: boolean;
  gameId: string;
  userId: string;
  onScoreSubmit: (score: number) => void;
  onExit: () => void;
  /** Shown in the "About this experience" sheet. */
  description?: string | null;
  /** Blurred backdrop while loading (and a faint stage light while playing). */
  thumbnail?: string | null;
  /** Viewport rect of the launching card — the Stage expands from here and returns to it on exit. */
  originRect?: ExperienceOriginRect | null;
  /** Breadcrumb trail. Ancestor crumbs always leave the Stage (animated) and then run their own onClick. */
  crumbs?: { label: string; onClick?: () => void }[];
}

type Phase = 'opening' | 'open' | 'closing';

const FULL_CLIP = 'inset(0px 0px 0px 0px round 0px)';
/** How long the chrome waits, untouched, before dimming. */
const IDLE_MS = 3200;

/* ------------------------------------------------------------------ */
/* Night status panel (errors, empty source)                           */
/* ------------------------------------------------------------------ */

function StagePanel({
  icon,
  kicker,
  title,
  body,
  detail,
  actions,
}: {
  icon: ReactNode;
  kicker: string;
  title: string;
  body?: string;
  detail?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="grid flex-1 place-items-center overflow-y-auto p-5 sm:p-8">
      <div
        role="alert"
        className="relative w-full max-w-md rounded-[28px] border border-white/10 bg-navy-2/90 p-7 text-center shadow-float backdrop-blur-sm sm:p-9"
      >
        <CornerTicks className="text-white/25" />
        <span className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl border border-red-400/25 bg-red-500/10 text-red-300">
          {icon}
        </span>
        <p className="label-mono text-night-sage/70">{kicker}</p>
        <h2 className="mt-2 text-xl font-bold text-white">{title}</h2>
        {body && <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-white/70">{body}</p>}
        {detail && (
          <pre className="mt-4 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-white/10 bg-white/5 p-3 text-left font-mono text-xs leading-relaxed text-white/75">
            {detail}
          </pre>
        )}
        {actions && <div className="mt-6 flex flex-col-reverse justify-center gap-2 sm:flex-row">{actions}</div>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Error boundary around the sandboxed runner                          */
/* ------------------------------------------------------------------ */

interface BoundaryProps {
  children: ReactNode;
  kind: 'game' | 'simulator';
  exitLabel: string;
  onRetry: () => void;
  onExit: () => void;
}

interface BoundaryState {
  error: Error | null;
}

class RunnerBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Experience crashed:', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <StagePanel
        icon={<AlertTriangle className="size-6" />}
        kicker="Runtime error"
        title={`This ${this.props.kind} stopped unexpectedly`}
        body="Something inside the experience threw an error. You can restart it, or head back."
        detail={error.message || 'An exception occurred inside the component.'}
        actions={
          <>
            <Button variant="night-outline" onClick={this.props.onRetry} leadingIcon={<RotateCcw className="size-4" />}>
              Try again
            </Button>
            <Button variant="night" onClick={this.props.onExit}>
              {this.props.exitLabel}
            </Button>
          </>
        }
      />
    );
  }
}

/* ------------------------------------------------------------------ */
/* "About this experience" sheet body                                  */
/* ------------------------------------------------------------------ */

function ExperienceInfo({
  kind,
  title,
  category,
  description,
  thumbnail,
}: {
  kind: 'game' | 'simulator';
  title: string;
  category?: string | null;
  description?: string | null;
  thumbnail?: string | null;
}) {
  const howId = useId();
  const [thumbFailed, setThumbFailed] = useState(false);
  const isSim = kind === 'simulator';
  const noun = isSim ? 'simulator' : 'game';

  const steps: { icon: ReactNode; title: string; body: string }[] = [
    {
      icon: <Flag className="size-4" />,
      title: isSim ? 'Results report themselves' : 'Finish a run',
      body: isSim
        ? 'When an experiment produces a result, the simulator submits it for you.'
        : 'When a round ends, the game reports your score automatically.',
    },
    {
      icon: <Trophy className="size-4" />,
      title: 'Ranked on the leaderboard',
      body: `Scores are saved to your profile and ranked on this ${noun}’s board and the global leaderboard.`,
    },
    ...(isSim
      ? []
      : [
          {
            icon: <Medal className="size-4" />,
            title: 'Medals unlock instantly',
            body: 'Every score is checked against the achievement thresholds; new medals appear the moment you earn them.',
          },
        ]),
    {
      icon: <Timer className="size-4" />,
      title: 'Play time is logged',
      body: 'Your session runs from launch until you exit and counts toward your stats.',
    },
  ];

  return (
    <div className="space-y-7 p-5 sm:p-6">
      {thumbnail && !thumbFailed && (
        <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-line bg-surface-2">
          <img
            src={thumbnail}
            alt={`Cover art for ${title}`}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setThumbFailed(true)}
            className="size-full object-cover"
          />
        </div>
      )}

      <div>
        <p className="label-mono text-ink-faint">
          {isSim ? 'Experiment' : 'Game'}
          {category ? ` · ${category}` : ''}
        </p>
        <h3 className="mt-1.5 font-semiwide text-2xl font-extrabold leading-tight text-ink">{title}</h3>
        <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-ink-muted">
          {description?.trim() || `No description has been added for this ${noun} yet.`}
        </p>
      </div>

      <section aria-labelledby={howId}>
        <h4 id={howId} className="label-mono flex items-center gap-3 text-brand-strong">
          How scores work
          <span className="h-px flex-1 bg-line" aria-hidden="true" />
        </h4>
        <ol className="mt-4 space-y-4">
          {steps.map((s, i) => (
            <li key={s.title} className="flex gap-3.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-rose-soft text-brand-strong">{s.icon}</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">
                  <span className="label-mono mr-2 text-ink-faint">{String(i + 1).padStart(2, '0')}</span>
                  {s.title}
                </p>
                <p className="mt-0.5 text-sm leading-relaxed text-ink-muted">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <p className="rounded-2xl border border-line bg-surface-2/60 p-4 text-sm leading-relaxed text-ink-muted">
        The stage controls fade while you play and come back as soon as you move the pointer or tab to them. Full
        screen hides the rest of the dashboard.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Workspace                                                           */
/* ------------------------------------------------------------------ */

export default function ExperienceWorkspace({
  kind,
  title,
  category,
  code,
  loading,
  gameId,
  userId,
  onScoreSubmit,
  onExit,
  description,
  thumbnail,
  originRect,
  crumbs,
}: ExperienceWorkspaceProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const reduce = !!useReducedMotion();
  const sheetFromSide = useMediaQuery('(min-width: 640px)', true);

  const [phase, setPhase] = useState<Phase>(() => (reduce ? 'open' : 'opening'));
  const [attempt, setAttempt] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [dim, setDim] = useState(false);
  const [thumbFailed, setThumbFailed] = useState(false);

  const isSim = kind === 'simulator';
  const noun = isSim ? 'simulator' : 'game';
  const section = isSim ? 'Simulators' : 'Games';
  const exitLabel = `Back to ${section.toLowerCase()}`;

  /* ---------- launch geometry (frozen at mount) ---------- */

  const [clip] = useState(() => {
    if (typeof window === 'undefined' || !originRect) return { from: 'inset(8% 8% 8% 8% round 32px)', fromOrigin: false };
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const clamp = (n: number, max: number) => Math.max(0, Math.min(max, n));
    const top = clamp(originRect.top, vh);
    const left = clamp(originRect.left, vw);
    const right = clamp(vw - originRect.left - originRect.width, vw);
    const bottom = clamp(vh - originRect.top - originRect.height, vh);
    return { from: `inset(${top}px ${right}px ${bottom}px ${left}px round 20px)`, fromOrigin: true };
  });

  /* ---------- exit (animated, then onExit exactly once) ---------- */

  const onExitRef = useRef(onExit);
  useEffect(() => {
    onExitRef.current = onExit;
  }, [onExit]);
  const closingRef = useRef(false);
  const exitedRef = useRef(false);
  const afterExitRef = useRef<(() => void) | null>(null);

  const finishExit = useCallback(() => {
    if (exitedRef.current) return;
    exitedRef.current = true;
    const after = afterExitRef.current;
    onExitRef.current();
    if (after && after !== onExitRef.current) after();
  }, []);

  const requestExit = useCallback(
    (after?: () => void) => {
      if (closingRef.current) return;
      closingRef.current = true;
      afterExitRef.current = after ?? null;
      setInfoOpen(false);
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => undefined);
      if (reduce) {
        finishExit();
        return;
      }
      setPhase('closing');
    },
    [reduce, finishExit],
  );

  // Safety net in case an animation never reports completion (e.g. a backgrounded tab).
  useEffect(() => {
    if (phase === 'opening') {
      const t = window.setTimeout(() => setPhase((p) => (p === 'opening' ? 'open' : p)), (dur.slow + dur.fast) * 1000);
      return () => window.clearTimeout(t);
    }
    if (phase === 'closing') {
      const t = window.setTimeout(finishExit, (dur.base + dur.fast) * 1000);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [phase, finishExit]);

  /* ---------- fullscreen (workspace root) ---------- */

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => undefined);
      }
    };
  }, []);

  const canFullscreen = typeof document !== 'undefined' && !!document.fullscreenEnabled;

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      rootRef.current?.requestFullscreen?.().catch(() => undefined);
    } else {
      document.exitFullscreen?.().catch(() => undefined);
    }
  }, []);

  /** Pointer clicks hand focus back to the stage so Space/Enter keep reaching the game, not the button. */
  const focusStage = useCallback(() => {
    requestAnimationFrame(() => stageRef.current?.focus({ preventScroll: true }));
  }, []);

  const onFullscreenClick = (e: MouseEvent<HTMLButtonElement>) => {
    toggleFullscreen();
    if (e.detail > 0) focusStage();
  };

  /* ---------- focus ---------- */

  // Modal: Tab stays inside the Stage; initial focus lands on the stage body (not a button) so game keys are safe.
  useFocusTrap(rootRef, true);

  // Android back / edge-swipe: first leave fullscreen (the game stays running), then close the Stage and return
  // to the library or category it was launched from. The info sheet registers later, so it closes before this.
  useBackClose(true, () => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => undefined);
      return 'stay';
    }
    requestExit();
  });

  /* ---------- info sheet ---------- */

  const infoViaPointer = useRef(false);
  const openInfo = (e: MouseEvent<HTMLButtonElement>) => {
    infoViaPointer.current = e.detail > 0;
    // The sheet portals to <body>, which is not painted while the Stage is fullscreen.
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => undefined);
    setInfoOpen(true);
  };
  const closeInfo = useCallback(() => {
    setInfoOpen(false);
    if (infoViaPointer.current) focusStage();
  }, [focusStage]);

  /* ---------- idle dimming ---------- */

  const playing = phase === 'open' && !loading && !!code;

  useEffect(() => {
    const root = rootRef.current;
    if (!playing || infoOpen || !root) {
      setDim(false);
      return undefined;
    }
    let timer = window.setTimeout(() => setDim(true), IDLE_MS);
    const wake = () => {
      setDim(false);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setDim(true), IDLE_MS);
    };
    root.addEventListener('pointermove', wake, { passive: true });
    root.addEventListener('pointerdown', wake, { passive: true });
    return () => {
      window.clearTimeout(timer);
      root.removeEventListener('pointermove', wake);
      root.removeEventListener('pointerdown', wake);
    };
  }, [playing, infoOpen]);

  /* ---------- breadcrumbs ---------- */

  const trail = useMemo<Crumb[]>(() => {
    const source = crumbs && crumbs.length > 0 ? crumbs : [{ label: 'Dashboard' }, { label: section }, { label: title }];
    return source.map((c, i) =>
      i === source.length - 1 ? { label: c.label } : { label: c.label, onClick: () => requestExit(c.onClick) },
    );
  }, [crumbs, section, title, requestExit]);

  /* ---------- render ---------- */

  const showLoader = phase !== 'closing' && (loading || phase === 'opening');
  const showThumb = !!thumbnail && !thumbFailed;

  const stage = (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-stage={kind}
      className="fixed inset-0 z-[70] isolate flex flex-col text-white"
    >
      {/* Night plate: the only animated surface. It is a sibling of the runner, never its ancestor. */}
      <motion.div
        aria-hidden="true"
        className="absolute inset-0 -z-10 overflow-hidden bg-navy"
        initial={reduce ? false : { clipPath: clip.from, opacity: clip.fromOrigin ? 1 : 0 }}
        animate={phase === 'closing' ? { clipPath: clip.from, opacity: 0 } : { clipPath: FULL_CLIP, opacity: 1 }}
        transition={
          phase === 'closing'
            ? { clipPath: { duration: dur.base, ease: ease.inOut }, opacity: { duration: dur.fast, delay: dur.micro, ease: ease.in } }
            : { clipPath: { duration: dur.slow, ease: ease.out }, opacity: { duration: dur.fast, ease: ease.out } }
        }
        onAnimationComplete={() => {
          if (phase === 'opening') setPhase('open');
          else if (phase === 'closing') finishExit();
        }}
      >
        {showThumb && (
          <motion.img
            src={thumbnail ?? undefined}
            alt=""
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setThumbFailed(true)}
            className="absolute inset-0 size-full scale-110 object-cover blur-2xl"
            initial={false}
            animate={{ opacity: showLoader ? 0.5 : 0.16 }}
            transition={{ duration: dur.slow, ease: ease.out }}
          />
        )}
        <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_0%,transparent_0%,var(--cp-navy)_78%)]" />
      </motion.div>

      {/* Chrome */}
      <motion.header
        className="pt-safe relative shrink-0"
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: phase === 'closing' ? 0 : 1 }}
        transition={
          phase === 'closing'
            ? { duration: dur.micro }
            : { duration: dur.base, ease: ease.out, delay: phase === 'opening' ? dur.fast : 0 }
        }
      >
        <div
          className={cn(
            'flex h-14 items-center gap-1.5 border-b border-white/10 px-2 transition-opacity duration-700 ease-out-expo sm:h-16 sm:gap-2 sm:px-4',
            dim ? 'opacity-20 focus-within:opacity-100 hover:opacity-100' : 'opacity-100',
          )}
        >
          <IconButton
            label={exitLabel}
            icon={<ArrowLeft className="size-5" />}
            variant="night-outline"
            className="size-11 shrink-0 border-transparent"
            onClick={() => requestExit()}
          />

          <div className="min-w-0 flex-1 px-1">
            <Breadcrumbs night items={trail} className="hidden md:block" />
            <p className="label-mono truncate text-night-sage/70 md:hidden">{isSim ? 'Live experiment' : 'Now playing'}</p>
            <h2 id={titleId} className="truncate text-[15px] font-bold leading-tight text-white md:sr-only">
              {title}
            </h2>
          </div>

          {playing && (
            <Badge tone="night" dot className="hidden shrink-0 lg:inline-flex">
              Live session
            </Badge>
          )}
          {category && (
            <Badge tone="night" variant="outline" className="hidden max-w-44 shrink-0 sm:inline-flex">
              <span className="truncate">{category}</span>
            </Badge>
          )}

          <IconButton
            label="About this experience"
            icon={<Info className="size-[18px]" />}
            variant="night-outline"
            className="size-11 shrink-0"
            aria-haspopup="dialog"
            aria-expanded={infoOpen}
            onClick={openInfo}
          />
          {canFullscreen && (
            <IconButton
              label={isFullscreen ? 'Exit full screen' : 'Enter full screen'}
              icon={isFullscreen ? <Minimize2 className="size-[18px]" /> : <Maximize2 className="size-[18px]" />}
              variant="night-outline"
              className="size-11 shrink-0"
              onClick={onFullscreenClick}
            />
          )}
          <Button
            variant="night"
            onClick={() => requestExit()}
            className="hidden shrink-0 sm:inline-flex"
            leadingIcon={<X className="size-4" />}
          >
            Exit
          </Button>
        </div>
      </motion.header>

      {/* Stage body: a plain flex-1 container — no transforms or animations around the runner. */}
      <div
        ref={stageRef}
        data-autofocus=""
        tabIndex={-1}
        className="pb-safe relative flex min-h-0 flex-1 flex-col overflow-hidden outline-none focus-visible:shadow-none"
      >
        {phase === 'closing' ? null : showLoader ? (
          <motion.div
            className="grid flex-1 place-items-center p-6"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: dur.base, ease: ease.out, delay: phase === 'opening' ? dur.fast : 0 }}
          >
            <div className="flex flex-col items-center gap-7 text-center">
              <CurioLoader
                size="lg"
                onDark
                messages={
                  isSim
                    ? ['Setting up the lab', 'Calibrating instruments', 'Starting the experiment']
                    : ['Loading your game', 'Warming up the engine', 'Get ready to play']
                }
              />
              <div className="max-w-[min(32rem,85vw)]">
                <p className="label-mono text-night-sage/60">
                  {isSim ? 'Preparing experiment' : 'Preparing cabinet'}
                  {category ? ` · ${category}` : ''}
                </p>
                <p className="mt-2 break-words font-wide text-2xl font-extrabold leading-tight text-white sm:text-3xl">{title}</p>
              </div>
            </div>
          </motion.div>
        ) : code ? (
          <RunnerBoundary
            key={attempt}
            kind={kind}
            exitLabel={exitLabel}
            onRetry={() => setAttempt((n) => n + 1)}
            onExit={() => requestExit()}
          >
            <DynamicGameRunner jsCode={code} onScoreSubmit={onScoreSubmit} gameId={gameId} userId={userId} gameTitle={title} />
          </RunnerBoundary>
        ) : (
          <StagePanel
            icon={<ShieldAlert className="size-6" />}
            kicker="Nothing to run"
            title={`No code found for this ${noun}`}
            body="The source for this experience is missing or empty, so there is nothing to run."
            actions={
              <Button variant="night" onClick={() => requestExit()}>
                {exitLabel}
              </Button>
            }
          />
        )}
      </div>

      <Sheet open={infoOpen} onClose={closeInfo} side={sheetFromSide ? 'right' : 'bottom'} title="About this experience">
        <ExperienceInfo kind={kind} title={title} category={category} description={description} thumbnail={thumbnail} />
      </Sheet>
    </div>
  );

  // Portal: fixed positioning must never be captured by a transformed/filtered ancestor (e.g. the shell's page transition).
  return createPortal(stage, document.body);
}
