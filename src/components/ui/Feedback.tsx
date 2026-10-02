import { useBackClose } from '@/lib/backStack';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/* Toasts + confirm dialog. Replaces window.alert / window.confirm.     */
/* Usage:                                                               */
/*   const toast = useToast();  toast.success('Saved');                  */
/*   const confirm = useConfirm();                                       */
/*   if (await confirm({ title: 'Delete?', tone: 'danger' })) { ... }    */
/* ------------------------------------------------------------------ */

type ToastTone = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
}

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
}

interface FeedbackApi {
  toast: {
    success: (title: string, description?: string) => void;
    error: (title: string, description?: string) => void;
    info: (title: string, description?: string) => void;
  };
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

const FeedbackContext = createContext<FeedbackApi | null>(null);

const toneStyles: Record<ToastTone, { icon: typeof Info; cls: string }> = {
  success: { icon: CheckCircle2, cls: 'text-brand' },
  error: { icon: XCircle, cls: 'text-red-500' },
  info: { icon: Info, cls: 'text-brand-strong' },
};

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [dialog, setDialog] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
  const nextId = useRef(1);
  // Render into the fullscreen element when one is active (e.g. the game stage), so toasts stay visible.
  const [portalTarget, setPortalTarget] = useState<Element>(() => document.fullscreenElement ?? document.body);
  useEffect(() => {
    const onChange = () => setPortalTarget(document.fullscreenElement ?? document.body);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const push = useCallback(
    (tone: ToastTone, title: string, description?: string) => {
      const id = nextId.current++;
      setToasts((t) => [...t.slice(-3), { id, tone, title, description }]);
      window.setTimeout(() => dismiss(id), tone === 'error' ? 6000 : 4000);
    },
    [dismiss],
  );

  const confirm = useCallback(
    (opts: ConfirmOptions) => new Promise<boolean>((resolve) => setDialog({ ...opts, resolve })),
    [],
  );

  const api = useMemo<FeedbackApi>(
    () => ({
      toast: {
        success: (t, d) => push('success', t, d),
        error: (t, d) => push('error', t, d),
        info: (t, d) => push('info', t, d),
      },
      confirm,
    }),
    [push, confirm],
  );

  const close = (value: boolean) => {
    dialog?.resolve(value);
    setDialog(null);
  };

  // Android back = Cancel.
  useBackClose(!!dialog, () => {
    dialog?.resolve(false);
    setDialog(null);
  });

  useEffect(() => {
    if (!dialog) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        dialog.resolve(false);
        setDialog(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialog]);

  return (
    <FeedbackContext.Provider value={api}>
      {children}
      {createPortal(
        <>
          <div
            aria-live="polite"
            className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex flex-col items-center gap-2 px-4 pt-[max(env(safe-area-inset-top),1rem)] sm:items-end sm:px-6"
          >
            <AnimatePresence>
              {toasts.map((t) => {
                const { icon: Icon, cls } = toneStyles[t.tone];
                return (
                  <motion.div
                    key={t.id}
                    layout
                    initial={{ opacity: 0, y: -16, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-line bg-surface p-4 shadow-float"
                    role={t.tone === 'error' ? 'alert' : 'status'}
                  >
                    <Icon className={cn('mt-0.5 size-5 shrink-0', cls)} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ink">{t.title}</p>
                      {t.description && <p className="mt-0.5 text-sm text-ink-muted">{t.description}</p>}
                    </div>
                    <button
                      type="button"
                      aria-label="Dismiss"
                      onClick={() => dismiss(t.id)}
                      className="rounded-md p-0.5 text-ink-faint transition-colors hover:text-ink"
                    >
                      <X className="size-4" />
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {dialog && (
              <motion.div
                className="fixed inset-0 z-[110] flex items-end justify-center bg-navy/60 p-4 backdrop-blur-sm sm:items-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => close(false)}
              >
                <motion.div
                  role="alertdialog"
                  aria-modal="true"
                  aria-labelledby="confirm-title"
                  initial={{ opacity: 0, y: 24, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 12, scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full max-w-md rounded-3xl border border-line bg-surface p-6 shadow-float"
                >
                  <div
                    className={cn(
                      'mb-4 grid size-11 place-items-center rounded-2xl',
                      dialog.tone === 'danger' ? 'bg-red-500/10 text-red-500' : 'bg-brand-soft text-brand-strong',
                    )}
                  >
                    <AlertTriangle className="size-5" />
                  </div>
                  <h2 id="confirm-title" className="text-lg font-bold text-ink">
                    {dialog.title}
                  </h2>
                  {dialog.description && <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{dialog.description}</p>}
                  <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button variant="outline" onClick={() => close(false)}>
                      {dialog.cancelLabel ?? 'Cancel'}
                    </Button>
                    <Button variant={dialog.tone === 'danger' ? 'danger' : 'primary'} onClick={() => close(true)} autoFocus>
                      {dialog.confirmLabel ?? 'Confirm'}
                    </Button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </>,
        portalTarget,
      )}
    </FeedbackContext.Provider>
  );
}

function useFeedback() {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error('useToast/useConfirm must be used within <FeedbackProvider>');
  return ctx;
}

export const useToast = () => useFeedback().toast;
export const useConfirm = () => useFeedback().confirm;
