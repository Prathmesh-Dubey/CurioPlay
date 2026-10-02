import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  Bug,
  ChevronDown,
  Gamepad2,
  Github,
  Instagram,
  KeyRound,
  Linkedin,
  LockKeyhole,
  LogIn,
  Mail,
  MessageCircle,
  MessageSquareText,
  Phone,
  Trophy,
  UserPlus,
  UserX,
} from 'lucide-react';
import { Container } from '@/components/layout/Section';
import { Logo } from '@/components/ui/Logo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { CONTACT, mailtoFor, whatsappFor, type ContactTopic } from '@/lib/contact';
import { ease } from '@/lib/motion';
import { cn } from '@/lib/utils';

const REPORT_TEMPLATE = 'Username:\nDevice and browser (or Android app):\nWhat happened:\nWhat I expected:\nSteps to reproduce:\n';

interface Issue {
  id: ContactTopic;
  icon: ReactNode;
  title: string;
  /** What the person sees when they hit this. */
  symptom: string;
  steps: ReactNode[];
  subject: string;
  body?: string;
}

const ISSUES: Issue[] = [
  {
    id: 'admin-key',
    icon: <KeyRound className="size-5" />,
    title: 'Get an admin access key',
    symptom: 'Creator (admin) accounts need a registration key to sign up, and only the creator hands them out.',
    steps: [
      <>Email or WhatsApp {CONTACT.name} with the <b>username and email</b> you want to use, and a line about what you plan to publish.</>,
      <>You'll get a key back. On the sign-up page choose <b>Creator</b>, then paste it into <b>Admin registration key</b>.</>,
      'Keep the key private. Anyone who has it can create an admin account.',
    ],
    subject: 'Admin access key request',
    body: 'Hi Prathmesh, I would like an admin access key for CurioPlay.\n\nUsername:\nEmail:\nWhat I plan to publish:\n',
  },
  {
    id: 'bug',
    icon: <Bug className="size-5" />,
    title: 'Report an error or bug',
    symptom: 'Something broke, showed an error, looked wrong, or behaved differently from what you expected.',
    steps: [
      'Reload the page once. If it happens again, it is worth reporting.',
      'Note what you clicked just before it happened, and take a screenshot if you can.',
      'Send the report with the template below. Screenshots can be attached to the email or WhatsApp chat.',
    ],
    subject: 'Bug report',
    body: REPORT_TEMPLATE,
  },
  {
    id: 'login',
    icon: <LogIn className="size-5" />,
    title: "Can't log in",
    symptom: 'Sign-in says the details are wrong, the user is not found, or it keeps loading.',
    steps: [
      'You can sign in with either your username or your email. Check for typos and extra spaces.',
      'Passwords are case-sensitive. Use the eye button to see what you typed.',
      'If it says the account does not exist, it may have been deleted. Create a new one or contact us.',
      'If it loads forever, check your internet connection. The server may also be waking up, so wait 30 seconds and try again.',
    ],
    subject: 'Login problem',
    body: 'Username or email I use:\nError message shown:\nDevice and browser:\n',
  },
  {
    id: 'password',
    icon: <LockKeyhole className="size-5" />,
    title: 'Forgot or change your password',
    symptom: 'You can reset a forgotten password yourself, or change it any time from Settings.',
    steps: [
      <>Forgot it? On the sign-in page tap <b>Forgot password?</b>, type the <b>email on your account</b>, and choose a new password.</>,
      <>Signed in and want a new one? Go to <b>Settings → Account → Change password</b>. You'll need your current password.</>,
      'New passwords need at least 6 characters, and both password boxes must match.',
      "If it says the server didn't accept the new password, contact us. Never send your old password.",
    ],
    subject: 'Password reset request',
    body: 'Username:\nEmail on the account:\n',
  },
  {
    id: 'signup',
    icon: <UserPlus className="size-5" />,
    title: "Can't sign up",
    symptom: 'Sign-up says the username or email is taken, the admin key is wrong, or nothing happens.',
    steps: [
      'Usernames and emails must be unique. Try another username, or log in if you already have an account.',
      <>Signing up as a Creator? The admin key must match exactly. <b>Ask for one</b> under “Get an admin access key” above.</>,
      'Every field with an error message has to be fixed before the button works.',
    ],
    subject: 'Sign-up problem',
    body: 'Username I tried:\nEmail I tried:\nError message shown:\n',
  },
  {
    id: 'profile',
    icon: <UserX className="size-5" />,
    title: 'Profile or player ID not found',
    symptom: '“Player not found” appears, or a profile link opens an empty page.',
    steps: [
      'The player may have deleted their account, or the link may be from before a change. Open them again from the leaderboard.',
      'If your own profile is missing, sign out and sign back in to refresh your session.',
      'Still missing? Send us your username and the link you opened.',
    ],
    subject: 'Profile not found',
    body: 'My username:\nThe profile or link I opened:\n',
  },
  {
    id: 'scores',
    icon: <Trophy className="size-5" />,
    title: 'Scores, medals or leaderboard not updating',
    symptom: "A score you finished with doesn't appear, or a medal didn't unlock.",
    steps: [
      'Scores are saved when the game reports them. Finish the round instead of closing the game early.',
      'Leaderboards refresh after a few seconds. Reload the page to check again.',
      'Tell us the game, the score and roughly when you played.',
    ],
    subject: 'Score or medal missing',
    body: 'Username:\nGame:\nScore:\nWhen I played:\n',
  },
  {
    id: 'experience',
    icon: <Gamepad2 className="size-5" />,
    title: "A game or simulator won't load",
    symptom: 'It stays blank, shows an error inside the player, or the controls do nothing.',
    steps: [
      'Close it and launch it again. On phones, try landscape for wide games.',
      'Click inside the game once so it receives your keyboard.',
      'Report the game name. If you see an error message inside the player, include it.',
    ],
    subject: 'Game or simulator not loading',
    body: 'Game or simulator name:\nWhat I see:\nDevice and browser:\n',
  },
  {
    id: 'other',
    icon: <MessageSquareText className="size-5" />,
    title: 'Something else',
    symptom: 'Ideas, feedback, collaboration or anything not listed here.',
    steps: ['Write to us. Every message is read.'],
    subject: 'Hello',
  },
];

const TOPICS = new Set<string>(ISSUES.map((i) => i.id));

const channelClass =
  'group flex min-h-14 items-center gap-3.5 rounded-xl px-3 py-2.5 transition-colors hover:bg-surface-2 focus-visible:bg-surface-2';

function Channel({ href, icon, label, value, external }: { href: string; icon: ReactNode; label: string; value: string; external?: boolean }) {
  return (
    <li>
      <a href={href} {...(external ? { target: '_blank', rel: 'noreferrer' } : {})} className={channelClass}>
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-strong transition-colors group-hover:bg-brand group-hover:text-white">
          {icon}
        </span>
        <span className="min-w-0">
          <span className="label-mono block text-ink-faint">{label}</span>
          <span className="block text-sm font-semibold text-ink [overflow-wrap:anywhere]">{value}</span>
        </span>
      </a>
    </li>
  );
}

function ReportButtons({ issue, compact }: { issue: Issue; compact?: boolean }) {
  const size = compact ? 'h-9 px-3.5 text-sm' : 'h-11 px-5 text-sm';
  return (
    <div className="flex flex-wrap gap-2">
      <a
        href={mailtoFor(issue.subject, issue.body)}
        className={cn('inline-flex items-center gap-2 rounded-xl bg-brand font-semibold text-white transition-colors hover:bg-brand-strong', size)}
      >
        <Mail className="size-4" /> Email
      </a>
      <a
        href={whatsappFor(issue.body ? `${issue.subject}\n\n${issue.body}` : issue.subject)}
        target="_blank"
        rel="noreferrer"
        className={cn(
          'inline-flex items-center gap-2 rounded-xl border border-line-strong bg-surface font-semibold text-ink transition-colors hover:border-brand/60 hover:text-brand-strong',
          size,
        )}
      >
        <MessageCircle className="size-4" /> WhatsApp
      </a>
    </div>
  );
}

function IssueItem({ issue, index, open, onToggle }: { issue: Issue; index: number; open: boolean; onToggle: () => void }) {
  return (
    <li id={`issue-${issue.id}`} className="scroll-mt-24">
      <div className={cn('rounded-2xl border bg-surface transition-[border-color,box-shadow]', open ? 'border-brand/50 shadow-soft' : 'border-line')}>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={`issue-${issue.id}-body`}
          className="flex w-full items-start gap-4 p-4 text-left sm:p-5"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-brand-strong">{issue.icon}</span>
          <span className="min-w-0 flex-1">
            <span className="label-mono block text-ink-faint">Issue {String(index + 1).padStart(2, '0')}</span>
            <span className="mt-0.5 block text-base font-bold text-ink">{issue.title}</span>
            <span className="mt-1 block text-sm leading-relaxed text-ink-muted">{issue.symptom}</span>
          </span>
          <ChevronDown className={cn('mt-3 size-5 shrink-0 text-ink-faint transition-transform duration-300', open && 'rotate-180')} />
        </button>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              id={`issue-${issue.id}-body`}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: ease.out }}
              className="overflow-hidden"
            >
              <div className="border-t border-line px-4 pb-5 pt-4 sm:px-5 sm:pl-[4.75rem]">
                <p className="label-mono text-ink-faint">What to do</p>
                <ol className="mt-3 space-y-2.5">
                  {issue.steps.map((step, i) => (
                    <li key={i} className="flex gap-3 text-sm leading-relaxed text-ink-muted">
                      <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-brand-soft text-[11px] font-bold text-brand-strong">
                        {i + 1}
                      </span>
                      <span className="min-w-0 [&_b]:font-semibold [&_b]:text-ink">{step}</span>
                    </li>
                  ))}
                </ol>
                <p className="mt-5 text-sm font-semibold text-ink">Still stuck? Report it:</p>
                <div className="mt-2.5">
                  <ReportButtons issue={issue} compact />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </li>
  );
}

export default function Contact() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  // React Router stores the history index; 0 means this page was opened directly.
  const canGoBack = ((window.history.state as { idx?: number } | null)?.idx ?? 0) > 0;
  const requested = params.get('topic');
  const initial = requested && TOPICS.has(requested) ? (requested as ContactTopic) : null;
  const [open, setOpen] = useState<ContactTopic | null>(initial);

  // Deep links (/contact?topic=login) open that issue and bring it into view.
  useEffect(() => {
    if (!initial) return;
    setOpen(initial);
    const t = window.setTimeout(() => document.getElementById(`issue-${initial}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 250);
    return () => window.clearTimeout(t);
  }, [initial]);

  const adminIssue = ISSUES[0];

  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <header className="pt-safe sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur-xl">
        <Container className="flex h-16 items-center justify-between">
          <Link to="/" aria-label="CurioPlay home">
            <Logo />
          </Link>
          <ThemeToggle />
        </Container>
      </header>

      <Container className="py-12 lg:py-16">
        <button
          type="button"
          onClick={() => (canGoBack ? navigate(-1) : navigate('/'))}
          className="inline-flex items-center gap-2 text-sm font-semibold text-brand-strong"
        >
          <ArrowLeft className="size-4" /> Back
        </button>

        <p className="label-mono mt-8 text-gold-strong">Help desk</p>
        <h1 className="mt-3 font-wide text-4xl font-extrabold leading-[0.95] sm:text-6xl">Contact &amp; help</h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-muted">
          Found an error, can't sign in, or need an admin key? Pick your issue below, or contact the creator directly.
        </p>

        {/* The one thing most people come here for. */}
        <section aria-labelledby="admin-key-title" className="relative mt-10 overflow-hidden rounded-[24px] bg-navy p-6 text-white sm:p-8">
          <div className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-brand/40 blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/10 text-night-gold">
                <KeyRound className="size-6" />
              </span>
              <div>
                <p className="label-mono text-night-sage/70">Main · Admin login</p>
                <h2 id="admin-key-title" className="mt-1.5 text-xl font-extrabold leading-snug sm:text-2xl">
                  <b>You can get the access key for admin login from {CONTACT.name}.</b>
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/70">
                  Creator accounts publish games and simulators and need a registration key to sign up. Send your username and email,
                  and you'll get a key to paste into <b className="text-white">Admin registration key</b> on the sign-up page.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2 lg:flex-col">
              <a
                href={mailtoFor(adminIssue.subject, adminIssue.body)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-navy transition-colors hover:bg-night-sage"
              >
                <Mail className="size-4" /> Request by email
              </a>
              <a
                href={whatsappFor(`${adminIssue.subject}\n\n${adminIssue.body}`)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/20 px-5 text-sm font-semibold text-white transition-colors hover:border-white/40 hover:bg-white/10"
              >
                <MessageCircle className="size-4" /> Request on WhatsApp
              </a>
            </div>
          </div>
        </section>

        <div className="mt-12 grid gap-10 lg:grid-cols-12">
          {/* Contact person */}
          <aside className="lg:col-span-4">
            <div className="rounded-[24px] border border-line bg-surface p-5 shadow-soft lg:sticky lg:top-24">
              <div className="flex items-center gap-4 px-1">
                <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-brand font-wide text-lg font-extrabold text-white">PD</span>
                <div className="min-w-0">
                  <p className="text-lg font-extrabold leading-tight text-ink">{CONTACT.name}</p>
                  <p className="mt-1 inline-flex rounded-full bg-gold-soft px-2.5 py-0.5 text-xs font-bold text-gold-strong">{CONTACT.role}</p>
                </div>
              </div>
              <ul className="mt-5 space-y-0.5 border-t border-line pt-3">
                <Channel href={`mailto:${CONTACT.email}`} icon={<Mail className="size-4.5" />} label="Email" value={CONTACT.email} />
                <Channel href={`tel:${CONTACT.phoneIntl}`} icon={<Phone className="size-4.5" />} label="Phone" value={CONTACT.phone} />
                <Channel href={`https://wa.me/${CONTACT.whatsappIntl}`} icon={<MessageCircle className="size-4.5" />} label="WhatsApp" value={CONTACT.phone} external />
                <Channel href={CONTACT.github} icon={<Github className="size-4.5" />} label="GitHub" value="Prathmesh-Dubey" external />
                <Channel href={CONTACT.linkedin} icon={<Linkedin className="size-4.5" />} label="LinkedIn" value="prathmesh-dubey" external />
                <Channel href={CONTACT.instagram} icon={<Instagram className="size-4.5" />} label="Instagram" value="@prathm_dubey_" external />
              </ul>
            </div>
          </aside>

          {/* Issues */}
          <section aria-labelledby="issues-title" className="lg:col-span-8">
            <h2 id="issues-title" className="text-2xl font-extrabold text-ink">
              Common issues
            </h2>
            <p className="mt-1.5 text-ink-muted">Open one to see what to do, then report it in one tap if it's still happening.</p>
            <ul className="mt-6 space-y-3">
              {ISSUES.map((issue, i) => (
                <IssueItem key={issue.id} issue={issue} index={i} open={open === issue.id} onToggle={() => setOpen((o) => (o === issue.id ? null : issue.id))} />
              ))}
            </ul>

            <div className="mt-8 rounded-2xl border border-dashed border-line-strong p-5">
              <h3 className="font-bold text-ink">A good report includes</h3>
              <ul className="mt-3 grid gap-2 text-sm text-ink-muted sm:grid-cols-2">
                {['Your username', 'Device and browser, or the Android app', 'What you did and what happened', 'A screenshot, if you can'].map((t) => (
                  <li key={t} className="flex items-center gap-2">
                    <span className="size-1.5 shrink-0 rounded-full bg-brand" aria-hidden="true" />
                    {t}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-ink-faint">Never send your password. We will never ask for it.</p>
            </div>
          </section>
        </div>
      </Container>
    </div>
  );
}
