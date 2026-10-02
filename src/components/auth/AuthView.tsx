import { useCallback, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowRight, KeyRound, LifeBuoy, Lock, Mail, ShieldCheck, User as UserIcon } from 'lucide-react';
import { authApi, userApi, type User } from '@/api/api';
import { Alert } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Logo } from '@/components/ui/Logo';
import { Tabs } from '@/components/ui/Nav';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { BorderTrail } from '@/components/motion/border-trail';
import { TextMorph } from '@/components/motion/text-morph';
import { TransitionPanel } from '@/components/motion/transition-panel';
import { ease, spring } from '@/lib/motion';
import { contactPath } from '@/lib/contact';
import { cn } from '@/lib/utils';
import { AuthArt } from './AuthArt';
import { ForgotPassword } from './ForgotPassword';
import { PasswordToggle, StrengthMeter } from './PasswordBits';
import { AuthBackdrop } from './AuthBackdrop';
import { LoginCelebration, SignupCelebration } from './Celebration';
import { Spotlight } from '@/components/motion/spotlight';

/*
 * The Reading Room — login and registration are two states of one experience.
 * The night panel tells a different story per mode; the form card morphs its title,
 * slides between forms, shakes fields that need attention, and resolves into a drawn
 * check-mark before handing you to the dashboard. Auth logic is unchanged.
 */

interface AuthViewProps {
  onLoginSuccess: (user: User) => void;
}

export type AuthMode = 'login' | 'register';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Behind the sign-up popup: a quiet "setting up" line with a progress bar (no icon — the popup carries the logo). */
function SuccessState({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex flex-col items-center py-12 text-center" role="status">
      <h2 className="font-semiwide text-2xl font-extrabold text-ink">{title}</h2>
      <p className="mt-2 text-sm text-ink-muted">{text}</p>
      <div className="mt-6 h-1 w-32 overflow-hidden rounded-full bg-surface-2">
        <motion.div className="h-full bg-brand" initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 3.2, ease: 'linear' }} />
      </div>
    </div>
  );
}

/* ------------------------------ Login form ------------------------------ */

function LoginForm({ onLoginSuccess, onSwitch }: AuthViewProps & { onSwitch: () => void }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [forgot, setForgot] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await authApi.login({ identifier: identifier.trim(), password });
      setDone(user);
      setTimeout(() => onLoginSuccess(user), 1700);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected network error occurred.');
      setLoading(false);
    }
  };

  if (done) return <LoginCelebration username={done.username} />;
  if (forgot)
    return (
      <ForgotPassword
        onBack={(email) => {
          if (email) {
            setIdentifier(email);
            setPassword('');
          }
          setError('');
          setForgot(false);
        }}
      />
    );

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <Input
        label="Username or email"
        autoComplete="username"
        required
        value={identifier}
        onChange={(e) => setIdentifier(e.target.value)}
        placeholder="e.g. curious_cat"
        leading={<UserIcon className="size-4" />}
        disabled={loading}
        data-autofocus
      />
      <Input
        label="Password"
        type={show ? 'text' : 'password'}
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••••"
        leading={<Lock className="size-4" />}
        trailing={<PasswordToggle shown={show} onToggle={() => setShow((v) => !v)} />}
        error={error ? ' ' : undefined}
        disabled={loading}
      />
      <div className="-mt-2 flex justify-end">
        <button type="button" onClick={() => setForgot(true)} className="link-underline text-sm font-semibold text-brand-strong">
          Forgot password?
        </button>
      </div>
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <Alert tone="danger" title="We couldn’t sign you in">
              {error}{' '}
              <Link to={contactPath('login')} className="font-semibold underline underline-offset-2">
                Get help
              </Link>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>
      <Button
        type="submit"
        size="lg"
        className="btn-shine w-full hover:-translate-y-0.5"
        loading={loading}
        disabled={!identifier.trim() || !password}
        trailingIcon={<ArrowRight className="size-4" />}
      >
        {loading ? 'Checking…' : 'Sign in'}
      </Button>
      <p className="text-center text-sm text-ink-muted">
        New here?{' '}
        <button type="button" onClick={onSwitch} className="link-underline font-semibold text-brand-strong">
          Create an account
        </button>
      </p>
    </form>
  );
}

/* ----------------------------- Register form ----------------------------- */

function RegisterForm({ onLoginSuccess, onSwitch }: AuthViewProps & { onSwitch: () => void }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [role, setRole] = useState<'USER' | 'ADMIN'>('USER');
  const [adminKey, setAdminKey] = useState('');
  const [show, setShow] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');
  const [done, setDone] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const continueIn = useCallback(() => {
    if (done) onLoginSuccess(done);
  }, [done, onLoginSuccess]);

  const errors = {
    username: !username.trim()
      ? 'Choose a username.'
      : /\s/.test(username.trim())
        ? 'Username cannot contain spaces.'
        : username.trim().length < 3
          ? 'Use at least 3 characters.'
          : '',
    email: !EMAIL_RE.test(email.trim()) ? 'Enter a valid email address.' : '',
    password: password.length < 6 ? 'Use at least 6 characters.' : '',
    confirm: confirm !== password ? 'Passwords do not match.' : '',
    adminKey: role === 'ADMIN' && !adminKey.trim() ? 'Admin key is required.' : '',
  };
  const valid = !Object.values(errors).some(Boolean);
  const blur = (k: string) => setTouched((t) => ({ ...t, [k]: true }));
  const show_ = (k: keyof typeof errors) => (touched[k] ? errors[k] : '');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched({ username: true, email: true, password: true, confirm: true, adminKey: true });
    setError('');
    if (!valid) return;
    setLoading(true);
    try {
      // The backend enforces uniqueness; this pre-check just gives a friendlier message.
      try {
        const existing = await userApi.getAll();
        if (existing.some((u) => u.username.toLowerCase() === username.trim().toLowerCase())) {
          setError(`Username "${username.trim()}" is already taken. Please choose another.`);
          setLoading(false);
          return;
        }
      } catch (checkErr) {
        console.warn('User uniqueness check skipped:', checkErr);
      }
      const user = await authApi.register({
        username: username.trim(),
        email: email.trim(),
        password,
        role,
        adminKey: role === 'ADMIN' ? adminKey.trim() : undefined,
      });
      setDone(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected network error occurred.');
      setLoading(false);
    }
  };

  if (done)
    return (
      <>
        <SuccessState title="Your field guide is ready" text="Setting up your dashboard…" />
        <SignupCelebration username={done.username} onContinue={continueIn} />
      </>
    );

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Username"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onBlur={() => blur('username')}
          error={show_('username')}
          placeholder="curious_cat"
          leading={<UserIcon className="size-4" />}
          disabled={loading}
        />
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => blur('email')}
          error={show_('email')}
          placeholder="you@example.com"
          leading={<Mail className="size-4" />}
          disabled={loading}
        />
      </div>
      <Input
        label="Password"
        type={show ? 'text' : 'password'}
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onBlur={() => blur('password')}
        error={show_('password')}
        placeholder="At least 6 characters"
        leading={<Lock className="size-4" />}
        trailing={<PasswordToggle shown={show} onToggle={() => setShow((v) => !v)} />}
        disabled={loading}
      />
      <StrengthMeter value={password} />
      <Input
        label="Confirm password"
        type={show ? 'text' : 'password'}
        autoComplete="new-password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        onBlur={() => blur('confirm')}
        error={show_('confirm')}
        placeholder="Repeat your password"
        leading={<Lock className="size-4" />}
        disabled={loading}
      />

      <fieldset className="space-y-2">
        <legend className="mb-1.5 text-[13px] font-semibold text-ink">Account type</legend>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ['USER', 'Explorer', 'Play, learn & compete'],
              ['ADMIN', 'Creator', 'Publish experiences'],
            ] as const
          ).map(([value, label, hint]) => (
            <label
              key={value}
              className={cn(
                'relative cursor-pointer rounded-2xl border p-3.5 transition-colors has-[:focus-visible]:shadow-[var(--cp-ring)]',
                role === value ? 'border-brand bg-brand-soft/60' : 'border-line-strong hover:border-brand/40',
              )}
            >
              <input type="radio" name="role" value={value} checked={role === value} onChange={() => setRole(value)} className="sr-only" disabled={loading} />
              <span className="flex items-center justify-between">
                <span className="text-sm font-semibold text-ink">{label}</span>
                <span className={cn('grid size-4 place-items-center rounded-full border', role === value ? 'border-brand' : 'border-line-strong')}>
                  {role === value && <motion.span layoutId="role-dot" transition={spring.snappy} className="size-2 rounded-full bg-brand" />}
                </span>
              </span>
              <span className="mt-1 block text-xs text-ink-muted">{hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <AnimatePresence initial={false}>
        {role === 'ADMIN' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: ease.out }}
            className="overflow-hidden px-px pb-px"
          >
            <Input
              label="Admin registration key"
              type="password"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              onBlur={() => blur('adminKey')}
              error={show_('adminKey')}
              placeholder="Provided by the CurioPlay team"
              leading={<KeyRound className="size-4" />}
              hint={
                <>
                  Don't have a key?{' '}
                  <Link to={contactPath('admin-key')} className="font-bold text-brand-strong underline underline-offset-2">
                    Get an admin access key
                  </Link>
                </>
              }
              disabled={loading}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <Alert tone="danger" title="We couldn’t create your account">
              {error}{' '}
              <Link to={contactPath('signup')} className="font-semibold underline underline-offset-2">
                Get help
              </Link>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>
      <Button type="submit" size="lg" className="btn-shine w-full hover:-translate-y-0.5" loading={loading} trailingIcon={<ArrowRight className="size-4" />}>
        {loading ? 'Creating your account…' : 'Create account'}
      </Button>
      <p className="text-center text-sm text-ink-muted">
        Already have an account?{' '}
        <button type="button" onClick={onSwitch} className="link-underline font-semibold text-brand-strong">
          Sign in
        </button>
      </p>
    </form>
  );
}

/* --------------------------------- View --------------------------------- */

export default function AuthView({ onLoginSuccess }: AuthViewProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const index = mode === 'login' ? 0 : 1;
  const variants = useMemo(
    () => ({
      enter: { opacity: 0, x: index === 0 ? -28 : 28, filter: 'blur(3px)' },
      center: { opacity: 1, x: 0, filter: 'blur(0px)' },
      exit: { opacity: 0, x: index === 0 ? 28 : -28, filter: 'blur(3px)' },
    }),
    [index],
  );

  return (
    <div className="grid min-h-dvh bg-canvas text-ink lg:grid-cols-[1.05fr_1fr]">
      <AuthArt mode={mode} />

      <div className="relative flex min-h-dvh flex-col">
        <AuthBackdrop />
        <div className="pt-safe relative flex items-center justify-between px-5 py-4 sm:px-8">
          <Link to="/" className="group inline-flex h-10 items-center gap-2 rounded-lg text-sm font-semibold text-ink-muted transition-colors hover:text-ink">
            <ArrowLeft className="size-4 transition-transform duration-300 group-hover:-translate-x-1" /> Back to site
          </Link>
          <ThemeToggle />
        </div>

        <div className="relative flex flex-1 flex-col items-center justify-center px-5 pb-12 sm:px-8">
          {/* Phones and tablets don't get the art panel, so the logo sits big above the form. */}
          <Link to="/" aria-label="CurioPlay home" className="mb-6 rounded-3xl lg:hidden">
            <Logo className="h-auto w-56 drop-shadow-[0_16px_32px_rgb(0_0_0/0.35)] sm:w-72" />
          </Link>
          <motion.div
            layout
            transition={spring.soft}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="group/card relative isolate w-full max-w-[480px] rounded-[28px] border border-line bg-surface/85 p-6 shadow-float backdrop-blur-xl transition-[box-shadow,border-color] duration-500 hover:border-brand/30 hover:shadow-[0_30px_80px_-24px_rgb(37_99_235/0.35)] sm:p-9"
          >
            <Spotlight size={320} className="-z-10 from-brand/15 via-[#e8a5b3]/10 to-transparent dark:from-brand/25" />
            <BorderTrail
              size={110}
              className="bg-gradient-to-l from-brand via-gold to-transparent"
              transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
            />

            <div className="mb-7">
              <p className="label-mono text-brand-strong">{mode === 'login' ? 'Sign in' : 'New explorer'}</p>
              <h1 className="mt-2 font-semiwide text-[2rem] font-extrabold leading-tight text-ink">
                <TextMorph as="span">{mode === 'login' ? 'Welcome back' : 'Join CurioPlay'}</TextMorph>
              </h1>
              <p className="mt-1.5 text-ink-muted">
                {mode === 'login' ? 'Pick up exactly where you left off.' : 'Create an account to save scores and earn medals.'}
              </p>
            </div>

            <Tabs
              variant="segmented"
              label="Authentication mode"
              value={mode}
              onChange={(v) => setMode(v as AuthMode)}
              className="mb-7 w-full [&>button]:flex-1 [&>button]:justify-center"
              items={[
                { value: 'login', label: 'Log in' },
                { value: 'register', label: 'Sign up' },
              ]}
            />

            <TransitionPanel activeIndex={index} transition={{ duration: 0.35, ease: ease.out }} variants={variants}>
              {[
                <LoginForm key="login" onLoginSuccess={onLoginSuccess} onSwitch={() => setMode('register')} />,
                <RegisterForm key="register" onLoginSuccess={onLoginSuccess} onSwitch={() => setMode('login')} />,
              ]}
            </TransitionPanel>

            <div className="mt-7 flex flex-col items-center gap-3 border-t border-line pt-5">
              <Link
                to={contactPath(mode === 'login' ? 'login' : 'signup')}
                className="group inline-flex h-10 items-center gap-2 rounded-xl border border-line-strong px-4 text-sm font-semibold text-ink-muted transition-[color,border-color,transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:border-brand/60 hover:text-brand-strong hover:shadow-soft"
              >
                <LifeBuoy className="size-4 transition-transform duration-500 group-hover:rotate-180" />
                {mode === 'login' ? 'Trouble signing in? Contact us' : 'Trouble signing up? Contact us'}
              </Link>
              <p className="flex items-center justify-center gap-1.5 text-center text-xs text-ink-faint">
                <ShieldCheck className="size-3.5" /> Your session is stored only on this device.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
