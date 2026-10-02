import { useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowRight, CheckCircle2, Lock, Mail } from 'lucide-react';
import type { User } from '@/api/api';
import { Alert } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { findAccountByEmail, MIN_PASSWORD, setNewPassword } from '@/lib/password';
import { ease, spring } from '@/lib/motion';
import { PasswordToggle, StrengthMeter } from './PasswordBits';

type Step = 'email' | 'reset' | 'done';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const stepMotion = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 },
  transition: { duration: 0.3, ease: ease.out },
};

/**
 * Forgot password, inside the sign-in card: type the account's email → choose a new password → sign in.
 * `onBack` returns to the sign-in form, pre-filling the email once the reset is done.
 */
export function ForgotPassword({ onBack }: { onBack: (email?: string) => void }) {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [account, setAccount] = useState<User | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const findAccount = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!EMAIL_RE.test(email.trim())) {
      setError('Enter the email address you signed up with.');
      return;
    }
    setLoading(true);
    const found = await findAccountByEmail(email);
    setLoading(false);
    if (!found) {
      setError('No account uses that email. Check the spelling, or create a new account.');
      return;
    }
    setAccount(found);
    setStep('reset');
  };

  const pwError = password.length < MIN_PASSWORD ? `Use at least ${MIN_PASSWORD} characters.` : '';
  const confirmError = confirm !== password ? 'Passwords do not match.' : '';

  const savePassword = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    setError('');
    if (!account || pwError || confirmError) return;
    setLoading(true);
    try {
      await setNewPassword(account, password);
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change the password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <AnimatePresence mode="wait" initial={false}>
        {step === 'email' && (
          <motion.form key="email" {...stepMotion} onSubmit={findAccount} className="space-y-5" noValidate>
            <div>
              <h2 className="text-lg font-bold text-ink">Forgot your password?</h2>
              <p className="mt-1 text-sm text-ink-muted">Type the email on your account and you can set a new password.</p>
            </div>
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              leading={<Mail className="size-4" />}
              error={error ? ' ' : undefined}
              disabled={loading}
              autoFocus
            />
            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <Alert tone="danger" title="Account not found">
                    {error}
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>
            <Button
              type="submit"
              size="lg"
              className="btn-shine w-full hover:-translate-y-0.5"
              loading={loading}
              disabled={!email.trim()}
              trailingIcon={<ArrowRight className="size-4" />}
            >
              {loading ? 'Looking you up…' : 'Continue'}
            </Button>
          </motion.form>
        )}

        {step === 'reset' && account && (
          <motion.form key="reset" {...stepMotion} onSubmit={savePassword} className="space-y-5" noValidate>
            <div>
              <h2 className="text-lg font-bold text-ink">Choose a new password</h2>
              <p className="mt-1 text-sm text-ink-muted">
                For <span className="font-semibold text-ink">{account.username}</span> ({account.email})
              </p>
            </div>
            <div className="space-y-2">
              <Input
                label="New password"
                type={show ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setTouched(true)}
                placeholder={`At least ${MIN_PASSWORD} characters`}
                leading={<Lock className="size-4" />}
                trailing={<PasswordToggle shown={show} onToggle={() => setShow((v) => !v)} />}
                error={touched ? pwError : ''}
                disabled={loading}
                autoFocus
              />
              <StrengthMeter value={password} />
            </div>
            <Input
              label="Confirm new password"
              type={show ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat the new password"
              leading={<Lock className="size-4" />}
              error={touched ? confirmError : ''}
              disabled={loading}
            />
            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <Alert tone="danger" title="Password not changed">
                    {error}
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>
            <Button type="submit" size="lg" className="btn-shine w-full hover:-translate-y-0.5" loading={loading}>
              {loading ? 'Saving…' : 'Save new password'}
            </Button>
          </motion.form>
        )}

        {step === 'done' && account && (
          <motion.div key="done" {...stepMotion} className="flex flex-col items-center py-4 text-center" role="status">
            <motion.span
              className="grid size-16 place-items-center rounded-full bg-brand-soft text-brand-strong"
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={spring.pop}
            >
              <CheckCircle2 className="size-8" />
            </motion.span>
            <h2 className="mt-5 text-xl font-extrabold text-ink">Password changed</h2>
            <p className="mt-1.5 text-sm text-ink-muted">You can now sign in with your new password.</p>
            <Button size="lg" className="btn-shine mt-6 w-full hover:-translate-y-0.5" onClick={() => onBack(account.email)} trailingIcon={<ArrowRight className="size-4" />}>
              Sign in now
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {step !== 'done' && (
        <button
          type="button"
          onClick={() => onBack()}
          className="group mx-auto mt-5 flex items-center gap-1.5 text-sm font-semibold text-ink-muted transition-colors hover:text-brand-strong"
        >
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" /> Back to sign in
        </button>
      )}
    </div>
  );
}
