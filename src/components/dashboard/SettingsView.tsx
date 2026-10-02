/*
 * Settings — "quiet precision".
 * A catalogue index (№ 01–06) rides in a sticky rail and follows the reader with a shared-layout
 * marker driven by IntersectionObserver; on phones it folds into a sticky scroll strip.
 * Each section is a hairline-ruled plate. Every control is honest: it does exactly what it says —
 * on this device or on your profile — and the copy names the consequence before you act.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { BellOff, Bug, KeyRound, LifeBuoy, LogOut, ShieldAlert } from 'lucide-react';
import { type User } from '@/api/api';
import { useProfileData } from '@/hooks/useProfileData';
import { useTheme, type Theme } from '@/hooks/useTheme';
import { useNotifications } from '@/context/NotificationContext';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button, ButtonLink, Spinner } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { OrbitLines } from '@/components/ui/Decor';
import { useToast } from '@/components/ui/Feedback';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { PaletteEditor } from '@/components/settings/PaletteEditor';
import { ProfileEditor } from '@/components/settings/ProfileEditor';
import { ChangePassword } from '@/components/settings/ChangePassword';
import { useDeleteAccount } from '@/components/profile/useDeleteAccount';
import { ThemeCards, type ThemeMode } from '@/components/settings/ThemeCards';
import { useScrollSpy } from '@/components/settings/useScrollSpy';
import { CONTACT, contactPath } from '@/lib/contact';
import { cn } from '@/lib/utils';
import { spring } from '@/lib/motion';

const APP_VERSION = '2.0.0';

interface SettingsViewProps {
  user: User;
  onUserChanged: (u: User) => void;
  onLogout: () => void;
}

function readMode(): ThemeMode {
  try {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
  } catch {
    /* ignore */
  }
  return 'dark';
}

const systemTheme = (): Theme => (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

const SECTIONS = [
  { id: 'settings-profile', label: 'Profile' },
  { id: 'settings-appearance', label: 'Appearance' },
  { id: 'settings-personalisation', label: 'Personalisation' },
  { id: 'settings-notifications', label: 'Notifications' },
  { id: 'settings-account', label: 'Account' },
  { id: 'settings-help', label: 'Help' },
  { id: 'settings-about', label: 'About' },
] as const;
const SECTION_IDS = SECTIONS.map((s) => s.id);

const pad2 = (n: number) => String(n).padStart(2, '0');

function formatSince(iso: string | undefined) {
  const t = iso ? Date.parse(iso) : NaN;
  return Number.isNaN(t) ? null : new Date(t).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

/* ------------------------------------------------------------------ */
/* Building blocks                                                      */
/* ------------------------------------------------------------------ */

function Plate({
  id,
  index,
  title,
  description,
  children,
  className,
}: {
  id: string;
  index: number;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={cn('min-w-0 scroll-mt-20 lg:scroll-mt-8', className)}>
      <header className="flex items-start gap-4 border-b border-line pb-4">
        <span className="label-mono mt-1.5 shrink-0 text-ink-faint">№ {pad2(index)}</span>
        <div className="min-w-0">
          <h2 id={`${id}-title`} className="text-xl font-bold text-ink">
            {title}
          </h2>
          {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
        </div>
      </header>
      <div className="pt-6">{children}</div>
    </section>
  );
}

/** One setting: what it is and what it does on the left, the control on the right. */
function Row({ title, description, control, children }: { title: string; description?: ReactNode; control?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 py-5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
      <div className="min-w-0 max-w-xl">
        <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
        {description && <div className="mt-1 text-sm leading-relaxed text-ink-muted">{description}</div>}
        {children}
      </div>
      {control && <div className="shrink-0">{control}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Section index (rail on desktop, strip on phones)                     */
/* ------------------------------------------------------------------ */

function SectionIndex({ active, onJump }: { active: string; onJump: (id: string) => void }) {
  const stripRef = useRef<HTMLOListElement>(null);
  const reduce = useReducedMotion();

  // Keep the active chip in view when the strip scrolls horizontally (phones).
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip || strip.scrollWidth <= strip.clientWidth) return;
    const chip = strip.querySelector<HTMLElement>(`[data-id="${active}"]`);
    if (!chip) return;
    strip.scrollTo({ left: chip.offsetLeft - strip.clientWidth / 2 + chip.clientWidth / 2, behavior: reduce ? 'auto' : 'smooth' });
  }, [active, reduce]);

  return (
    <nav
      aria-label="Settings sections"
      className={cn(
        // min-w-0: as a grid item it would otherwise grow to the strip's full width, so the strip never scrolls.
        'sticky top-0 z-20 -mx-4 min-w-0 border-b border-line bg-canvas/90 px-4 py-2 backdrop-blur-md sm:-mx-6 sm:px-6',
        'lg:top-6 lg:mx-0 lg:self-start lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none',
      )}
    >
      <p className="label-mono mb-3 hidden text-ink-faint lg:block">Index</p>
      <ol ref={stripRef} className="flex gap-1 overflow-x-auto scrollbar-none lg:flex-col lg:gap-0.5 lg:overflow-visible">
        {SECTIONS.map((s, i) => {
          const on = active === s.id;
          return (
            <li key={s.id} className="shrink-0">
              <a
                href={`#${s.id}`}
                data-id={s.id}
                aria-current={on ? 'location' : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  onJump(s.id);
                }}
                className={cn(
                  'relative flex min-h-11 items-center gap-3 rounded-full px-4 text-sm font-semibold transition-colors duration-200 lg:min-h-10 lg:rounded-xl lg:px-3.5',
                  on ? 'text-ink' : 'text-ink-muted hover:text-ink',
                )}
              >
                {on && (
                  <motion.span
                    layoutId="settings-index-marker"
                    transition={spring.snappy}
                    aria-hidden="true"
                    className="absolute inset-0 rounded-full bg-rose-soft lg:rounded-xl lg:bg-surface lg:shadow-soft lg:ring-1 lg:ring-line"
                  >
                    <span className="absolute inset-y-2.5 left-0 hidden w-[3px] rounded-full bg-brand lg:block" />
                  </motion.span>
                )}
                <span className={cn('label-mono relative hidden transition-colors lg:inline', on ? 'text-brand-strong' : 'text-ink-faint')}>
                  {pad2(i + 1)}
                </span>
                <span className="relative">{s.label}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* View                                                                 */
/* ------------------------------------------------------------------ */

export default function SettingsView({ user, onUserChanged, onLogout }: SettingsViewProps) {
  const toast = useToast();
  const reduce = useReducedMotion();
  const { setTheme, theme } = useTheme();
  const { profile, updateProfile } = useProfileData(user, 0);
  const { deleting, requestDelete } = useDeleteAccount(user, onLogout);
  const { notifications, unreadCount } = useNotifications();
  const { active, jumpTo } = useScrollSpy(SECTION_IDS);

  const [mode, setMode] = useState<ThemeMode>(readMode);
  const [savingAccent, setSavingAccent] = useState(false);
  const [readCleared, setReadCleared] = useState(false);

  // Apply the system theme without persisting a user choice, and follow OS changes.
  const applySystem = useCallback(() => {
    try {
      localStorage.setItem('theme', 'system');
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new CustomEvent<Theme>('curioplay-theme', { detail: systemTheme() }));
  }, []);

  useEffect(() => {
    if (mode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => window.dispatchEvent(new CustomEvent<Theme>('curioplay-theme', { detail: systemTheme() }));
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [mode]);

  const chooseMode = (next: ThemeMode) => {
    if (next === mode) return;
    setMode(next);
    if (next === 'system') applySystem();
    else setTheme(next);
  };

  // The picker updates instantly; the profile save is debounced so arrow-key browsing or
  // dragging the custom colour input doesn't fire a request per step.
  const [pendingAccent, setPendingAccent] = useState<string | null | undefined>(undefined);
  const accentTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(accentTimer.current), []);
  const currentAccent = pendingAccent !== undefined ? pendingAccent : (profile?.accentColor ?? user.accentColor ?? null);

  // The colour before this round of edits, so a failed save can put it back.
  const accentBeforeEdit = useRef<string | null | undefined>(undefined);

  const queueAccent = (value: string | null) => {
    if (accentBeforeEdit.current === undefined) accentBeforeEdit.current = user.accentColor ?? null;
    setPendingAccent(value);
    // Recolour the app immediately; the profile save follows a moment later.
    onUserChanged({ ...user, accentColor: value });
    window.clearTimeout(accentTimer.current);
    accentTimer.current = window.setTimeout(() => {
      void saveAccent(value);
    }, 650);
  };

  const saveAccent = async (value: string | null) => {
    setSavingAccent(true);
    try {
      const updated = await updateProfile({ accentColor: value });
      onUserChanged({ ...user, accentColor: updated.accentColor });
      toast.success(value ? 'Primary colour saved' : 'Primary colour reset');
    } catch (err) {
      onUserChanged({ ...user, accentColor: accentBeforeEdit.current ?? null });
      toast.error('Could not save primary colour', err instanceof Error ? err.message : undefined);
    } finally {
      accentBeforeEdit.current = undefined;
      setSavingAccent(false);
      setPendingAccent(undefined);
    }
  };

  const clearReadState = () => {
    try {
      localStorage.removeItem('readNotifications');
      setReadCleared(true);
      toast.success('Notification history cleared', 'Notifications will show as unread again after your next reload.');
    } catch {
      toast.error('Could not clear notification history');
    }
  };

  const jump = (id: string) => {
    jumpTo(id);
    document.getElementById(id)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  };

  const readCount = Math.max(0, notifications.length - unreadCount);
  const memberSince = formatSince(user.createdAt);
  const isAdmin = user.role === 'ADMIN';
  const themeLine =
    mode === 'system'
      ? `Following your device — currently ${theme}.`
      : `Always ${mode} on this device, whatever your system uses.`;

  return (
    <div className="flex flex-col gap-8 lg:gap-12">
      <PageHeader eyebrow="Account" title="Settings" description="Your profile, appearance, preferences and account controls — nothing more than what actually works." />

      <div className="grid gap-8 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-[clamp(2rem,1rem+2.5vw,4.5rem)] xl:grid-cols-[15rem_minmax(0,1fr)]">
        <SectionIndex active={active} onJump={jump} />

        {/* One column up to 2xl; from there the plates pair up (document order = reading order, so the index still tracks). */}
        <div className="grid min-w-0 gap-x-[calc(var(--grid-gap)*2)] gap-y-14 2xl:grid-cols-2 2xl:items-start">
          {/* № 01 — Profile */}
          <Plate id="settings-profile" index={1} title="Profile" description="Everything other players see on your card. Your colours are under Personalisation.">
            <ProfileEditor user={user} onUserChanged={onUserChanged} />
          </Plate>

          {/* № 02 — Appearance */}
          <Plate id="settings-appearance" index={2} title="Appearance" description="How CurioPlay looks on this device. Stored in this browser only.">
            <ThemeCards value={mode} onChange={chooseMode} />
            <p className="mt-4 flex items-center gap-2 text-sm text-ink-muted" aria-live="polite">
              <span className="label-mono text-ink-faint">Now</span>
              <span className="h-px w-4 bg-line-strong" aria-hidden="true" />
              {themeLine}
            </p>
          </Plate>

          {/* № 03 — Personalisation */}
          <Plate
            className="2xl:col-span-2"
            id="settings-personalisation"
            index={3}
            title="Personalisation"
            description="Your colours. Primary is saved to your profile; the rest stay on this device."
          >
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_12rem] xl:items-start [&>figure]:xl:sticky [&>figure]:xl:top-24">
              <PaletteEditor userId={user.id} primary={currentAccent} onPrimaryChange={queueAccent} savingPrimary={savingAccent} />

              {/* Live specimen — reads the brand tokens, so it shows exactly what the accent does. */}
              <figure className="relative cursor-default select-none overflow-hidden rounded-2xl border border-dashed border-line-strong bg-surface/60 p-4" aria-label="Colour preview">
                <figcaption className="label-mono text-ink-faint">Specimen</figcaption>
                <div className="mt-3 flex flex-col gap-2.5" aria-hidden="true">
                  <span className="inline-flex h-8 w-fit items-center rounded-lg bg-brand px-3 text-xs font-semibold text-white transition-colors duration-500">
                    Play now
                  </span>
                  <span className="text-sm font-semibold text-brand-strong underline underline-offset-4 transition-colors duration-500">Open the lab</span>
                  <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-brand-strong transition-colors duration-500">
                    <span className="size-1.5 rounded-full bg-brand" /> Live
                  </span>
                  <span className="inline-flex h-8 w-fit items-center rounded-lg bg-rose-soft px-3 text-xs font-semibold text-brand-strong transition-colors duration-500">
                    Secondary
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gold-strong transition-colors duration-500">
                    <span className="size-2.5 rotate-45 rounded-[2px] bg-gold" /> Accent highlight
                  </span>
                  <p className="text-xs leading-relaxed text-ink-muted">Muted text sits on the background.</p>
                </div>
              </figure>
            </div>
          </Plate>

          {/* № 04 — Notifications */}
          <Plate id="settings-notifications" index={4} title="Notifications" description="Which announcements you've seen is remembered in this browser.">
            <Row
              title="Read history"
              description={
                readCleared ? (
                  <>Cleared. Every notification will show as unread again after your next reload.</>
                ) : notifications.length > 0 ? (
                  <>
                    <span className="font-semibold text-ink tabular-nums">{readCount}</span> of{' '}
                    <span className="tabular-nums">{notifications.length}</span> current{' '}
                    {notifications.length === 1 ? 'notification is' : 'notifications are'} marked as read here. Clearing marks every
                    notification unread again on this device.
                  </>
                ) : (
                  <>Clearing marks every notification unread again on this device. Other devices keep their own history.</>
                )
              }
              control={
                <Button variant="outline" onClick={clearReadState} leadingIcon={<BellOff className="size-4" />} className="w-full sm:w-auto">
                  Clear read state
                </Button>
              }
            />
          </Plate>

          {/* № 05 — Account */}
          <Plate id="settings-account" index={5} title="Account" description="Who you're signed in as, and what happens when you leave.">
            <div className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 sm:p-5">
              <Avatar url={user.avatarUrl} seed={user.avatarSeed} name={user.username} className="size-14" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-bold text-ink">{user.username}</p>
                <p className="truncate text-sm text-ink-muted">{user.email}</p>
                {memberSince && <p className="label-mono mt-1.5 text-ink-faint">Member since {memberSince}</p>}
              </div>
              <Badge tone={isAdmin ? 'gold' : 'brand'} className="shrink-0 self-start sm:self-center">
                {isAdmin ? 'Admin' : user.role?.toLowerCase() || 'Player'}
              </Badge>
            </div>

            <div className="mt-6 divide-y divide-line">
              <ChangePassword user={user} />
              <Row
                title="Sign out"
                description="Ends your session on this device. Your scores, achievements and profile stay saved to your account."
                control={
                  <Button variant="outline" onClick={onLogout} leadingIcon={<LogOut className="size-4" />} className="w-full sm:w-auto">
                    Log out
                  </Button>
                }
              />
            </div>

            {/* Danger zone — restrained: a hairline, a clear list of consequences, one deliberate button. */}
            <div className="mt-8 rounded-2xl border border-red-500/25">
              <div className="flex items-start gap-3 p-5">
                <ShieldAlert className="mt-0.5 size-5 shrink-0 text-red-600 dark:text-red-400" aria-hidden="true" />
                <div className="min-w-0">
                  <h3 className="text-[15px] font-semibold text-ink">Delete account</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                    Permanently deletes <span className="font-semibold text-ink">{user.username}</span> and everything attached to it:
                  </p>
                  <ul className="mt-3 grid gap-x-6 gap-y-1.5 text-sm text-ink-muted sm:grid-cols-3">
                    {['Profile & avatar', 'Scores & leaderboard ranks', 'Unlocked achievements'].map((item) => (
                      <li key={item} className="flex items-center gap-2">
                        <span className="size-1 shrink-0 rounded-full bg-red-500/70" aria-hidden="true" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="flex flex-col gap-3 border-t border-red-500/15 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-ink-faint">You'll be asked to confirm. This can't be undone.</p>
                <Button
                  variant="outline"
                  onClick={requestDelete}
                  loading={deleting}
                  className="w-full border-red-500/40 text-red-700 hover:border-red-500 hover:text-red-700 sm:w-auto dark:text-red-400 dark:hover:text-red-300"
                >
                  Delete account…
                </Button>
              </div>
            </div>
          </Plate>

          {/* № 06 — Help & support */}
          <Plate id="settings-help" index={6} title="Help & support" description="Report a problem or reach the person who builds CurioPlay.">
            <div className="divide-y divide-line">
              <Row
                title="Report an error or bug"
                description="Something broke or looked wrong? Send a report in one tap by email or WhatsApp."
                control={
                  <ButtonLink to={contactPath('bug')} variant="outline" className="w-full sm:w-auto">
                    <Bug className="size-4" /> Report a bug
                  </ButtonLink>
                }
              />
              {!isAdmin && (
                <Row
                  title="Get an admin access key"
                  description={
                    <>
                      <b className="font-semibold text-ink">Creator accounts need an admin access key — you can get one from {CONTACT.name}.</b> Use it to sign up as a Creator.
                    </>
                  }
                  control={
                    <ButtonLink to={contactPath('admin-key')} variant="outline" className="w-full sm:w-auto">
                      <KeyRound className="size-4" /> Request a key
                    </ButtonLink>
                  }
                />
              )}
              <Row
                title="Contact & help"
                description="Login, password, sign-up and profile issues, plus every way to reach the creator."
                control={
                  <ButtonLink to={contactPath()} variant="primary" className="w-full sm:w-auto">
                    <LifeBuoy className="size-4" /> Open help desk
                  </ButtonLink>
                }
              />
            </div>
          </Plate>

          {/* № 07 — About */}
          <Plate id="settings-about" index={7} title="About">
            <div className="relative overflow-hidden rounded-2xl border border-line bg-surface p-5 sm:p-6">
              <OrbitLines animate={false} className="absolute -right-10 -top-12 size-52 opacity-70" />
              <div className="relative flex flex-wrap items-end justify-between gap-5">
                <div>
                  <Logo />
                  <p className="mt-3 max-w-xs text-sm text-ink-muted">Play, learn and compete — a field guide to curiosity.</p>
                </div>
                <dl className="flex gap-6">
                  <div>
                    <dt className="label-mono text-ink-faint">Version</dt>
                    <dd className="mt-1 font-mono text-sm font-semibold tabular-nums text-ink">{APP_VERSION}</dd>
                  </div>
                  <div>
                    <dt className="label-mono text-ink-faint">Theme</dt>
                    <dd className="mt-1 text-sm font-semibold capitalize text-ink">{mode}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </Plate>
        </div>
      </div>
    </div>
  );
}
