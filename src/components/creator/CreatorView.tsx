/*
 * Creator Studio — "the workshop". A real tool, not a form.
 * Desktop splits into a specimen-label bench (metadata + a live library card) and a night-surface
 * code editor that stays pinned while you work; phones flip between the two with a segmented control.
 * One sticky action bar carries status, Cancel and "Compile & publish" (⌘/Ctrl+S from anywhere).
 * Validation lands inline on the exact field — and flips the phone to the pane that needs attention.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ChevronDown,
  Code2,
  FilePlus2,
  FlaskConical,
  Gamepad2,
  ImageOff,
  LayoutTemplate,
  ListChecks,
  Sigma,
  Sparkles,
} from 'lucide-react';
import type { GameRequest, SimulatorRequest } from '@/api/api';
import {
  useCreateGame,
  useCreateSimulator,
  useGame,
  useGames,
  useSimulator,
  useSimulators,
  useUpdateGame,
  useUpdateSimulator,
} from '@/hooks';
import { Alert, ErrorState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PlateTag } from '@/components/ui/Decor';
import { Input, Textarea } from '@/components/ui/Input';
import { Kbd, Menu, type MenuItem } from '@/components/ui/Overlay';
import { Tabs } from '@/components/ui/Nav';
import { Skeleton } from '@/components/ui/Skeleton';
import { useConfirm, useToast } from '@/components/ui/Feedback';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { GAME_TEMPLATE, STATISTICS_CALCULATOR_TEMPLATE } from '@/components/creator/templates';
import { CodeEditor } from '@/components/creator/CodeEditor';
import { CoverPreview } from '@/components/creator/CoverPreview';
import { cn } from '@/lib/utils';
import { ease } from '@/lib/motion';

type Kind = 'game' | 'simulator';
type Pane = 'details' | 'code';

interface CreatorViewProps {
  mode: Kind;
  editId: string | null;
  onDone: (kind: Kind) => void;
  onCancel: () => void;
}

const DEFAULT_CATEGORY: Record<Kind, string> = { game: 'Arcade', simulator: 'Simulator' };
const BASE_CATEGORIES: Record<Kind, string[]> = {
  game: ['Arcade', 'Casual', 'Strategy', 'Action', 'Puzzle'],
  simulator: ['Simulator', 'Math', 'Analytics', 'Physics', 'Utility', 'Chemistry'],
};

const TEMPLATES: { id: string; label: string; code: string }[] = [
  { id: 'blank', label: 'Blank', code: '' },
  { id: 'game', label: 'Game starter', code: GAME_TEMPLATE },
  { id: 'stats', label: 'Statistics calculator', code: STATISTICS_CALCULATOR_TEMPLATE },
];

const TEMPLATE_ICONS: Record<string, typeof Code2> = { blank: FilePlus2, game: Gamepad2, stats: Sigma };

interface Status {
  type: 'success' | 'error';
  msg: string;
}

interface FieldErrors {
  title?: string;
  category?: string;
  code?: string;
}

interface Snapshot {
  kind: Kind;
  title: string;
  description: string;
  category: string;
  thumbnail: string;
  code: string;
}

const snap = (s: Snapshot) => JSON.stringify(s);

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);

/* ------------------------------------------------------------------ */
/* Loading skeleton (edit mode)                                         */
/* ------------------------------------------------------------------ */

function CreatorSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-12 lg:gap-8" aria-busy="true" aria-label="Loading editor">
      <div className="flex flex-col gap-6 lg:col-span-5">
        <div className="rounded-[24px] border border-line bg-surface p-5 sm:p-6">
          <Skeleton className="h-3 w-24 rounded-md" />
          <div className="mt-6 space-y-6">
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3.5 w-20 rounded-md" />
                <Skeleton className={cn('w-full', i === 2 ? 'h-24' : 'h-12')} />
              </div>
            ))}
            <div className="flex flex-wrap gap-1.5">
              {[56, 72, 64, 80, 60].map((w) => (
                <Skeleton key={w} className="h-8 rounded-full" style={{ width: w }} />
              ))}
            </div>
          </div>
        </div>
        <div className="rounded-[24px] border border-line bg-surface p-5 sm:p-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="mt-5 aspect-[16/10] w-full rounded-[20px]" />
        </div>
      </div>
      <div className="hidden h-[min(48rem,calc(100dvh-13rem))] flex-col overflow-hidden rounded-[24px] border border-white/10 bg-navy lg:col-span-7 lg:flex">
        <div className="h-11 border-b border-white/10" />
        <div className="flex-1 space-y-3 p-5 pl-16">
          {[70, 45, 82, 30, 64, 52, 76, 40, 58].map((w, i) => (
            <div key={i} className="h-2.5 rounded-full bg-white/10" style={{ width: `${w}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* View                                                                 */
/* ------------------------------------------------------------------ */

export default function CreatorView({ mode, editId, onDone, onCancel }: CreatorViewProps) {
  const confirm = useConfirm();
  const toast = useToast();
  const isEditing = !!editId;

  const [kind, setKind] = useState<Kind>(mode);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(DEFAULT_CATEGORY[mode]);
  const [thumbnail, setThumbnail] = useState('');
  const [code, setCode] = useState('');
  const [compiling, setCompiling] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [thumbFailed, setThumbFailed] = useState(false);
  const [pane, setPane] = useState<Pane>('details');
  const [hydratedKey, setHydratedKey] = useState<string | null>(null);
  const loadedFor = useRef<string | null>(null);
  const baseline = useRef<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  const simQuery = useSimulator(mode === 'simulator' ? editId || '' : '');
  const gameQuery = useGame(mode !== 'simulator' ? editId || '' : '');
  const { data: simData, isError: isSimError } = simQuery;
  const { data: gameData, isError: isGameError } = gameQuery;
  const { data: games = [] } = useGames();
  const { data: simulators = [] } = useSimulators();

  const createGame = useCreateGame();
  const updateGame = useUpdateGame();
  const createSimulator = useCreateSimulator();
  const updateSimulator = useUpdateSimulator();

  const targetKey = editId ? `${mode}:${editId}` : null;

  // reset fields when the entry mode / edit target changes
  useEffect(() => {
    loadedFor.current = null;
    setKind(mode);
    setStatus(null);
    setErrors({});
    setPane('details');
    if (!editId) {
      setTitle('');
      setDescription('');
      setCategory(DEFAULT_CATEGORY[mode]);
      setThumbnail('');
      setCode('');
      baseline.current = snap({ kind: mode, title: '', description: '', category: DEFAULT_CATEGORY[mode], thumbnail: '', code: '' });
    } else {
      baseline.current = null;
    }
  }, [mode, editId]);

  // load existing item once for editing
  useEffect(() => {
    if (!editId || loadedFor.current === `${mode}:${editId}`) return;
    if (mode === 'simulator' && simData) {
      const next: Snapshot = {
        kind: 'simulator',
        title: simData.title,
        description: simData.description || '',
        category: simData.category || 'Simulator',
        thumbnail: simData.thumbnail || '',
        code: simData.simulatorCode || simData.gameCode || '',
      };
      setTitle(next.title);
      setDescription(next.description);
      setCategory(next.category);
      setThumbnail(next.thumbnail);
      setCode(next.code);
      setKind('simulator');
      setStatus(null);
      baseline.current = snap(next);
      loadedFor.current = `${mode}:${editId}`;
      setHydratedKey(loadedFor.current);
    } else if (mode !== 'simulator' && gameData) {
      const next: Snapshot = {
        kind: gameData.type === 'simulator' ? 'simulator' : 'game',
        title: gameData.title,
        description: gameData.description || '',
        category: gameData.category || (gameData.type === 'simulator' ? 'Simulator' : 'Arcade'),
        thumbnail: gameData.thumbnail || '',
        code: gameData.gameCode || '',
      };
      setTitle(next.title);
      setDescription(next.description);
      setCategory(next.category);
      setThumbnail(next.thumbnail);
      setCode(next.code);
      setKind(next.kind);
      setStatus(null);
      baseline.current = snap(next);
      loadedFor.current = `${mode}:${editId}`;
      setHydratedKey(loadedFor.current);
    }
  }, [editId, mode, simData, gameData]);

  // A failed load shows an error panel; while a retry is in flight we fall back to the skeleton.
  const targetFetching = mode === 'simulator' ? simQuery.isFetching : gameQuery.isFetching;
  const loadError = isEditing && (mode === 'simulator' ? isSimError : isGameError) && hydratedKey !== targetKey && !targetFetching;

  useEffect(() => {
    if (loadError) setStatus({ type: 'error', msg: 'Could not load data for editing.' });
  }, [loadError]);

  useEffect(() => setThumbFailed(false), [thumbnail]);
  const onThumbError = useCallback(() => setThumbFailed(true), []);

  const categorySuggestions = useMemo(() => {
    const set = new Set<string>(BASE_CATEGORIES[kind]);
    const source = kind === 'simulator' ? simulators : games;
    source.forEach((x) => {
      if (x.category?.trim()) set.add(x.category.trim());
    });
    return Array.from(set).slice(0, 14);
  }, [kind, games, simulators]);

  const fileName = `${title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'custom-module'}.tsx`;
  const kindLabel = kind === 'simulator' ? 'Simulator' : 'Game';
  const destination = kind === 'simulator' ? 'Simulators' : 'Arcade';
  const showSkeleton = isEditing && hydratedKey !== targetKey && !loadError;
  const dirty = () =>
    baseline.current !== null && baseline.current !== snap({ kind, title, description, category, thumbnail, code });

  const switchKind = (next: Kind) => {
    if (isEditing || next === kind) return;
    setKind(next);
    setCategory((c) => (c === DEFAULT_CATEGORY[kind] || !c ? DEFAULT_CATEGORY[next] : c));
  };

  const applyTemplate = async (id: string) => {
    const tpl = TEMPLATES.find((t) => t.id === id);
    if (!tpl) return;
    if (code.trim() && code !== tpl.code) {
      const ok = await confirm({
        title: 'Replace current code?',
        description: `Loading the "${tpl.label}" template will overwrite what is in the editor.`,
        confirmLabel: 'Replace',
      });
      if (!ok) return;
    }
    setCode(tpl.code);
    setStatus(null);
    setErrors((e) => ({ ...e, code: undefined }));
    requestAnimationFrame(() => {
      const ta = editorRef.current;
      if (!ta) return;
      ta.scrollTop = 0;
      ta.scrollLeft = 0;
    });
  };

  const handleCompile = async () => {
    if (compiling) return;
    const nextErrors: FieldErrors = {};
    if (!title.trim()) nextErrors.title = 'Give it a title players will recognise.';
    if (!category.trim()) nextErrors.category = 'Pick a suggestion or type a category.';
    if (!title.trim() || !category.trim()) {
      setErrors(nextErrors);
      setStatus({ type: 'error', msg: 'Title and Category are required parameters.' });
      setPane('details');
      requestAnimationFrame(() => (nextErrors.title ? titleRef.current : categoryRef.current)?.focus());
      return;
    }
    if (!code.trim()) {
      setErrors({ code: 'The editor is empty — write a component or load a template.' });
      setStatus({ type: 'error', msg: 'Source code cannot be empty. Please provide valid React component code.' });
      setPane('code');
      requestAnimationFrame(() => editorRef.current?.focus());
      return;
    }

    setErrors({});
    setCompiling(true);
    setStatus(null);
    try {
      if (kind === 'simulator') {
        const payload: SimulatorRequest = {
          title: title.trim(),
          description: description.trim() || null,
          category: category.trim(),
          thumbnail: thumbnail.trim() || null,
          active: true,
          simulatorCode: code,
          gameCode: code,
          isDynamic: true,
          type: 'simulator',
        };
        if (editId) await updateSimulator.mutateAsync({ id: editId, data: payload });
        else await createSimulator.mutateAsync(payload);
      } else {
        const payload: GameRequest = {
          title: title.trim(),
          description: description.trim() || null,
          category: category.trim(),
          thumbnail: thumbnail.trim() || null,
          active: true,
          gameCode: code,
          isDynamic: true,
          type: 'game',
        };
        if (editId) await updateGame.mutateAsync({ id: editId, data: payload });
        else await createGame.mutateAsync(payload);
      }
      const msg = `Successfully ${editId ? 'updated' : 'compiled'} "${title.trim()}"! Added to ${destination}.`;
      setStatus({ type: 'success', msg });
      toast.success(editId ? `${kindLabel} updated` : `${kindLabel} published`, msg);
      baseline.current = snap({ kind, title, description, category, thumbnail, code });
      onDone(kind);
    } catch (err) {
      setStatus({
        type: 'error',
        msg: err instanceof Error && err.message ? err.message : 'An unexpected error occurred during compilation.',
      });
    } finally {
      setCompiling(false);
    }
  };

  const handleCancel = async () => {
    if (dirty()) {
      const ok = await confirm({
        title: 'Discard your changes?',
        description: `Your edits to this ${kind} haven't been ${isEditing ? 'saved' : 'published'}.`,
        confirmLabel: 'Discard',
        cancelLabel: 'Keep editing',
        tone: 'danger',
      });
      if (!ok) return;
    }
    onCancel();
  };

  // ⌘/Ctrl+S publishes from anywhere in the studio.
  const compileRef = useRef(handleCompile);
  useEffect(() => {
    compileRef.current = handleCompile;
  });
  const canSubmit = !showSkeleton && !loadError;
  useEffect(() => {
    if (!canSubmit) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (document.querySelector('[role="alertdialog"]')) return;
        void compileRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canSubmit]);

  const templateGroups: MenuItem[][] = [
    TEMPLATES.map((t) => {
      const Icon = TEMPLATE_ICONS[t.id] ?? Code2;
      return { label: t.label, icon: <Icon className="size-4" />, onSelect: () => void applyTemplate(t.id) };
    }),
  ];

  const detailsHasError = !!(errors.title || errors.category);
  const paneLabel = (text: string, flagged: boolean) => (
    <span className="inline-flex items-center gap-1.5">
      {text}
      {flagged && (
        <>
          <span className="size-1.5 rounded-full bg-red-500" aria-hidden="true" />
          <span className="sr-only">(needs attention)</span>
        </>
      )}
    </span>
  );

  const submitLabel = compiling ? (isEditing ? 'Saving...' : 'Compiling...') : isEditing ? `Update ${kindLabel}` : 'Compile & publish';

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <PageHeader
        eyebrow="Creator Studio"
        title={isEditing ? `Edit ${kindLabel.toLowerCase()}` : `New ${kindLabel.toLowerCase()}`}
        description={
          isEditing
            ? `Editing an existing ${kind}. Update the details or code, then save your changes.`
            : `Write or paste a single-file React component that exports a default ${kind}.`
        }
        actions={
          <span className="hidden items-center gap-2 text-xs font-medium text-ink-faint lg:inline-flex">
            <Kbd>{IS_MAC ? '⌘' : 'Ctrl'}</Kbd>
            <Kbd>S</Kbd>
            <span>{isEditing ? 'to save' : 'to publish'}</span>
          </span>
        }
      />

      {showSkeleton ? (
        <CreatorSkeleton />
      ) : loadError ? (
        <div className="flex flex-col items-center gap-4">
          <ErrorState
            className="w-full"
            title={`Couldn't open this ${mode}`}
            description="We couldn't load it for editing. Check your connection and try again."
            onRetry={() => void (mode === 'simulator' ? simQuery.refetch() : gameQuery.refetch())}
          />
          <Button variant="ghost" onClick={onCancel}>
            Back to {mode === 'simulator' ? 'Simulators' : 'Arcade'}
          </Button>
        </div>
      ) : (
        <>
          {/* Phones: one pane at a time */}
          <Tabs<Pane>
            variant="segmented"
            label="Studio pane"
            value={pane}
            onChange={(p) => setPane(p)}
            className="w-full lg:hidden [&>button]:flex-1 [&>button]:justify-center"
            items={[
              { value: 'details', label: paneLabel('Details', detailsHasError), icon: <ListChecks className="size-4" /> },
              { value: 'code', label: paneLabel('Code', !!errors.code), icon: <Code2 className="size-4" /> },
            ]}
          />

          <div className="grid gap-6 lg:grid-cols-12 lg:items-start lg:gap-8">
            {/* ---------------- Metadata bench ---------------- */}
            <div className={cn('flex-col gap-6 lg:col-span-5 lg:flex', pane === 'details' ? 'flex' : 'hidden')}>
              <Card className="rounded-[24px]">
                <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5 sm:px-6">
                  <p className="label-mono text-brand-strong">Specimen label</p>
                  <PlateTag>{isEditing ? `ID ${editId?.slice(0, 8)}` : 'Draft'}</PlateTag>
                </div>
                <div className="flex flex-col gap-6 p-5 sm:p-6">
                  {!isEditing && (
                    <div className="flex flex-col gap-2">
                      <p className="text-[13px] font-semibold text-ink">What are you building?</p>
                      <Tabs<Kind>
                        variant="segmented"
                        label="What are you building?"
                        value={kind}
                        onChange={switchKind}
                        className="w-full [&>button]:flex-1 [&>button]:justify-center"
                        items={[
                          { value: 'game', label: 'Game', icon: <Gamepad2 className="size-4" /> },
                          { value: 'simulator', label: 'Simulator', icon: <FlaskConical className="size-4" /> },
                        ]}
                      />
                    </div>
                  )}

                  <Input
                    ref={titleRef}
                    label="Title"
                    value={title}
                    error={errors.title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      if (errors.title && e.target.value.trim()) setErrors((x) => ({ ...x, title: undefined }));
                    }}
                    placeholder="e.g. Statistics Calculator"
                  />

                  <div className="flex flex-col gap-2.5">
                    <Input
                      ref={categoryRef}
                      label="Category"
                      value={category}
                      error={errors.category}
                      onChange={(e) => {
                        setCategory(e.target.value);
                        if (errors.category && e.target.value.trim()) setErrors((x) => ({ ...x, category: undefined }));
                      }}
                      placeholder="e.g. Arcade"
                    />
                    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Category suggestions">
                      {categorySuggestions.map((c) => {
                        const on = category.trim().toLowerCase() === c.toLowerCase();
                        return (
                          <button
                            key={c}
                            type="button"
                            onClick={() => {
                              setCategory(c);
                              setErrors((x) => ({ ...x, category: undefined }));
                            }}
                            aria-pressed={on}
                            className={cn(
                              'font-narrow min-h-9 rounded-full border px-3.5 text-[13px] font-semibold transition-[background-color,border-color,color,transform,translate,scale,rotate] duration-200 active:scale-[0.96]',
                              on
                                ? 'border-rose bg-rose-soft text-brand-strong'
                                : 'border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink',
                            )}
                          >
                            {c}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <Textarea
                    label="Short description"
                    optional
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What does it do, and who is it for?"
                    className="min-h-24 resize-none"
                    hint={`${description.trim().length.toLocaleString()} characters · the library card shows the first few lines.`}
                  />
                </div>
              </Card>

              <Card className="rounded-[24px]">
                <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5 sm:px-6">
                  <p className="label-mono text-brand-strong">Library card</p>
                  <PlateTag>Live preview</PlateTag>
                </div>
                <div className="flex flex-col gap-5 p-5 sm:p-6">
                  <Input
                    label="Thumbnail image URL"
                    type="url"
                    inputMode="url"
                    optional
                    value={thumbnail}
                    onChange={(e) => setThumbnail(e.target.value)}
                    placeholder="https://..."
                    leading={thumbFailed ? <ImageOff className="size-4 text-red-500" /> : undefined}
                    hint={
                      thumbFailed
                        ? "That image couldn't be loaded — players will see the composed cover below instead."
                        : 'Shown as the cover on the library card. Leave empty for a composed cover.'
                    }
                  />
                  <figure className="flex flex-col gap-2.5">
                    <CoverPreview
                      kind={kind}
                      seed={editId || 'draft'}
                      title={title}
                      description={description}
                      category={category}
                      thumbnail={thumbnail}
                      failed={thumbFailed}
                      onImageError={onThumbError}
                      className="mx-auto w-full max-w-sm lg:max-w-none"
                    />
                    <figcaption className="text-center text-xs text-ink-faint">
                      How it appears in {destination} — updates as you type.
                    </figcaption>
                  </figure>
                </div>
              </Card>
            </div>

            {/* ---------------- Code editor ---------------- */}
            <div className={cn('lg:sticky lg:top-6 lg:col-span-7 lg:block', pane === 'code' ? 'block' : 'hidden')}>
              <CodeEditor
                ref={editorRef}
                value={code}
                onChange={(v) => {
                  setCode(v);
                  if (errors.code && v.trim()) setErrors((x) => ({ ...x, code: undefined }));
                }}
                fileName={fileName}
                error={errors.code}
                className="h-[62dvh] min-h-[24rem] lg:h-[min(48rem,calc(100dvh-13rem))] lg:min-h-[30rem]"
                status={
                  <Badge tone="night" className="hidden sm:inline-flex">
                    {isEditing ? 'Editing' : 'Draft'}
                  </Badge>
                }
                toolbarEnd={
                  <Menu
                    label="Load a template"
                    groups={templateGroups}
                    placement="bottom-end"
                    header={<p className="label-mono text-ink-faint">Start from a template</p>}
                    trigger={
                      <Button
                        variant="night-outline"
                        size="sm"
                        leadingIcon={<LayoutTemplate className="size-4" />}
                        trailingIcon={<ChevronDown className="size-3.5" />}
                      >
                        Templates
                      </Button>
                    }
                  />
                }
                emptyState={
                  <div className="flex max-w-xs flex-col items-center text-center">
                    <span className="grid size-12 place-items-center rounded-2xl border border-white/10 bg-white/5 text-night-sage">
                      <Code2 className="size-5" />
                    </span>
                    <p className="mt-4 text-sm font-semibold text-white">An empty bench</p>
                    <p className="mt-1 text-sm text-white/60">Paste a component, start typing, or begin from a starter.</p>
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      <Button variant="night" size="sm" onClick={() => void applyTemplate('game')} leadingIcon={<Gamepad2 className="size-4" />}>
                        Game starter
                      </Button>
                      <Button variant="night-outline" size="sm" onClick={() => void applyTemplate('stats')} leadingIcon={<Sigma className="size-4" />}>
                        Statistics
                      </Button>
                    </div>
                  </div>
                }
              />
            </div>
          </div>

          {/* ---------------- Sticky action bar ---------------- */}
          <div className="sticky bottom-4 z-20">
            <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface/95 p-3 shadow-float backdrop-blur sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <AnimatePresence mode="wait" initial={false}>
                  {status ? (
                    <motion.div
                      key={`${status.type}:${status.msg}`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.25, ease: ease.out }}
                    >
                      <Alert tone={status.type === 'success' ? 'success' : 'danger'} className="rounded-xl px-3 py-2.5">
                        <span className="break-words">{status.msg}</span>
                      </Alert>
                    </motion.div>
                  ) : (
                    <motion.p
                      key="idle"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex flex-wrap items-center gap-x-2 gap-y-1 px-2 text-sm text-ink-muted"
                    >
                      {isEditing ? `Saving updates this ${kind} in place.` : `Publishing adds it to ${destination} instantly.`}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button variant="outline" onClick={() => void handleCancel()} disabled={compiling} className="flex-1 sm:flex-none">
                  Cancel
                </Button>
                <Button
                  onClick={() => void handleCompile()}
                  loading={compiling}
                  leadingIcon={<Sparkles className="size-4" />}
                  className="flex-[2] sm:flex-none"
                  aria-keyshortcuts={IS_MAC ? 'Meta+S' : 'Control+S'}
                >
                  {submitLabel}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
