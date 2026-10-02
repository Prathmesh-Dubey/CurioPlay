import { useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { KeyRound, Lock } from 'lucide-react';
import type { User } from '@/api/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Feedback';
import { PasswordToggle, StrengthMeter } from '@/components/auth/PasswordBits';
import { MIN_PASSWORD, passwordWorks, setNewPassword } from '@/lib/password';
import { ease } from '@/lib/motion';

/** Settings → Account: change password (current password required), opened in place. */
export function ChangePassword({ user }: { user: User }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [touched, setTouched] = useState(false);
  const [currentError, setCurrentError] = useState('');
  const [saving, setSaving] = useState(false);

  const nextError = next.length < MIN_PASSWORD ? `Use at least ${MIN_PASSWORD} characters.` : next === current ? 'Choose a password different from the current one.' : '';
  const confirmError = confirm !== next ? 'Passwords do not match.' : '';

  const reset = () => {
    setCurrent('');
    setNext('');
    setConfirm('');
    setTouched(false);
    setCurrentError('');
    setShow(false);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    setCurrentError('');
    if (!current || nextError || confirmError) return;
    setSaving(true);
    try {
      if (!(await passwordWorks(user, current))) {
        setCurrentError('That is not your current password.');
        return;
      }
      await setNewPassword(user, next);
      toast.success('Password changed', 'Use your new password next time you sign in.');
      reset();
      setOpen(false);
    } catch (err) {
      toast.error('Password not changed', err instanceof Error ? err.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="py-5 first:pt-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
        <div className="min-w-0 max-w-xl">
          <h3 className="text-[15px] font-semibold text-ink">Change password</h3>
          <p className="mt-1 text-sm leading-relaxed text-ink-muted">
            You'll need your current password. Forgot it? Sign out and use “Forgot password?” on the sign-in page.
          </p>
        </div>
        {!open && (
          <Button variant="outline" onClick={() => setOpen(true)} leadingIcon={<KeyRound className="size-4" />} className="w-full shrink-0 sm:w-auto">
            Change password
          </Button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.form
            onSubmit={submit}
            noValidate
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: ease.out }}
            className="overflow-hidden px-px"
          >
            <div className="mt-5 grid max-w-md gap-4 pb-px">
              <Input
                label="Current password"
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                value={current}
                onChange={(e) => {
                  setCurrent(e.target.value);
                  setCurrentError('');
                }}
                leading={<Lock className="size-4" />}
                trailing={<PasswordToggle shown={show} onToggle={() => setShow((v) => !v)} />}
                error={currentError || (touched && !current ? 'Enter your current password.' : '')}
                disabled={saving}
                autoFocus
              />
              <div className="space-y-2">
                <Input
                  label="New password"
                  type={show ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={next}
                  onChange={(e) => setNext(e.target.value)}
                  placeholder={`At least ${MIN_PASSWORD} characters`}
                  leading={<Lock className="size-4" />}
                  error={touched ? nextError : ''}
                  disabled={saving}
                />
                <StrengthMeter value={next} />
              </div>
              <Input
                label="Confirm new password"
                type={show ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                leading={<Lock className="size-4" />}
                error={touched ? confirmError : ''}
                disabled={saving}
              />
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <Button
                  variant="ghost"
                  onClick={() => {
                    reset();
                    setOpen(false);
                  }}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={saving} className="btn-shine">
                  {saving ? 'Saving…' : 'Save new password'}
                </Button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
