/*
 * Settings → Profile. Everything other players see on your card, edited in one place: identity fields and the
 * portrait. (The accent colour lives under Personalisation.) The form follows fresh data until you change something;
 * a save bar appears once there are unsaved changes.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Globe, MapPin } from 'lucide-react';
import { userApi, type User } from '@/api/api';
import { useProfileData } from '@/hooks/useProfileData';
import { cn } from '@/lib/utils';
import { dur, ease, spring } from '@/lib/motion';
import { Alert, Avatar, Button, Divider, Input, Textarea, Thumb, useToast } from '@/components/ui';

const AVATAR_SEEDS = ['Felix', 'Aneka', 'Jasper', 'Bandit', 'Luna', 'Oliver', 'Maya', 'Zane'];
const dicebear = (seed: string) => `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(seed)}`;

interface FormState {
  username: string;
  email: string;
  bio: string;
  location: string;
  website: string;
  dob: string;
  avatarUrl: string;
  avatarSeed: string;
}

type FieldErrors = Partial<Record<'username' | 'email' | 'avatarUrl', string>>;

function validate(f: FormState): FieldErrors {
  const e: FieldErrors = {};
  const username = f.username.trim();
  if (!username) e.username = 'Username is required.';
  else if (/\s/.test(username)) e.username = 'Username cannot contain spaces.';
  const email = f.email.trim();
  if (!email) e.email = 'Email is required.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email address.';
  const avatar = f.avatarUrl.trim();
  if (avatar && !/^(https?:\/\/|data:image\/)/i.test(avatar)) e.avatarUrl = 'Use a full image link starting with https://';
  return e;
}

export function ProfileEditor({ user, onUserChanged }: { user: User; onUserChanged: (u: User) => void }) {
  const toast = useToast();
  const { profile, updateProfile } = useProfileData(user, 0);

  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState('');
  const [usernameTaken, setUsernameTaken] = useState('');

  const usernameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const avatarUrlRef = useRef<HTMLInputElement>(null);
  const seedGroupRef = useRef<HTMLDivElement>(null);

  const fromData = useCallback(
    (): FormState => ({
      username: user.username || '',
      email: user.email || '',
      bio: profile?.bio || '',
      location: profile?.location || '',
      website: profile?.website || '',
      dob: profile?.dateOfBirth || '',
      avatarUrl: profile?.avatarUrl || user.avatarUrl || '',
      avatarSeed: profile?.avatarSeed || user.avatarSeed || '',
    }),
    [profile, user],
  );

  const baseline = fromData();
  const baselineKey = JSON.stringify(baseline);
  const [form, setForm] = useState<FormState>(baseline);

  // Follow fresh data (profile arriving, a save elsewhere) as long as you haven't changed anything yourself.
  const prevBaseline = useRef(baselineKey);
  useEffect(() => {
    if (prevBaseline.current === baselineKey) return;
    const previous = prevBaseline.current;
    prevBaseline.current = baselineKey;
    setForm((f) => (JSON.stringify(f) === previous ? (JSON.parse(baselineKey) as FormState) : f));
  }, [baselineKey]);

  const dirty = JSON.stringify(form) !== baselineKey;
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const errors = useMemo<FieldErrors>(() => {
    const all = validate(form);
    // Before the first save attempt only the instantly-obvious rule speaks up.
    const shown: FieldErrors = submitted ? all : { username: /\s/.test(form.username.trim()) ? all.username : undefined };
    if (usernameTaken && !shown.username) shown.username = usernameTaken;
    return shown;
  }, [form, submitted, usernameTaken]);

  const reset = () => {
    setForm(fromData());
    setSubmitted(false);
    setServerError('');
    setUsernameTaken('');
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    const invalid = validate(form);
    if (invalid.username || invalid.email || invalid.avatarUrl) {
      (invalid.username ? usernameRef : invalid.email ? emailRef : avatarUrlRef).current?.focus();
      return;
    }
    setServerError('');
    setUsernameTaken('');
    setSaving(true);
    try {
      const updatedUser = await userApi.update(user.id, { username: form.username.trim(), email: form.email.trim() });
      const updatedProfile = await updateProfile({
        bio: form.bio,
        location: form.location,
        website: form.website,
        dateOfBirth: form.dob || null,
        avatarUrl: form.avatarUrl.trim(),
        // Sent unchanged so the accent chosen under Personalisation is kept.
        accentColor: profile?.accentColor ?? user.accentColor ?? null,
        avatarSeed: form.avatarSeed,
      });
      onUserChanged({
        ...updatedUser,
        avatarUrl: updatedProfile.avatarUrl,
        accentColor: updatedProfile.accentColor,
        avatarSeed: updatedProfile.avatarSeed,
      });
      setSubmitted(false);
      toast.success('Profile updated');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile.';
      setServerError(msg);
      if (/username/i.test(msg)) {
        setUsernameTaken(msg);
        usernameRef.current?.focus();
      }
      toast.error('Could not save profile', msg);
    } finally {
      setSaving(false);
    }
  };

  const onSeedKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    if (!(e.key in step)) return;
    e.preventDefault();
    const cur = Math.max(0, AVATAR_SEEDS.indexOf(form.avatarSeed));
    const next = (cur + step[e.key] + AVATAR_SEEDS.length) % AVATAR_SEEDS.length;
    setForm((f) => ({ ...f, avatarSeed: AVATAR_SEEDS[next], avatarUrl: '' }));
    seedGroupRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]?.focus();
  };

  const seedSelected = !form.avatarUrl && AVATAR_SEEDS.includes(form.avatarSeed);

  return (
    <form noValidate onSubmit={handleSave} aria-label="Edit profile" className="flex flex-col gap-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          ref={usernameRef}
          label="Username"
          value={form.username}
          onChange={(e) => {
            set('username', e.target.value);
            if (usernameTaken) setUsernameTaken('');
          }}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          hint="No spaces — this is your public handle."
          error={errors.username}
        />
        <Input ref={emailRef} label="Email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} autoComplete="email" error={errors.email} />
        <div className="sm:col-span-2">
          <Textarea
            label="Bio"
            optional
            rows={3}
            maxLength={280}
            showCount
            value={form.bio}
            onChange={(e) => set('bio', e.target.value)}
            placeholder="A short line about you"
            className="pb-7"
          />
        </div>
        <Input
          label="Location"
          optional
          value={form.location}
          onChange={(e) => set('location', e.target.value)}
          leading={<MapPin className="size-4" />}
          autoComplete="address-level2"
        />
        <Input
          label="Website"
          optional
          value={form.website}
          onChange={(e) => set('website', e.target.value)}
          leading={<Globe className="size-4" />}
          placeholder="example.com"
          inputMode="url"
          autoCapitalize="none"
          spellCheck={false}
        />
        <Input label="Date of birth" optional type="date" value={form.dob} onChange={(e) => set('dob', e.target.value)} />
      </div>

      <Divider />

      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-4">
          <Avatar key={`${form.avatarUrl}|${form.avatarSeed}`} url={form.avatarUrl} seed={form.avatarSeed} name={form.username || user.username} className="size-14 rounded-2xl" />
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold text-ink">Portrait</h3>
            <p className="mt-0.5 text-sm text-ink-muted">Pick a character, or paste a link to your own image.</p>
          </div>
        </div>
        <div ref={seedGroupRef} role="radiogroup" aria-label="Avatar character" onKeyDown={onSeedKey} className="grid grid-cols-4 gap-3 sm:grid-cols-8">
          {AVATAR_SEEDS.map((seed, i) => {
            const active = !form.avatarUrl && form.avatarSeed === seed;
            return (
              <button
                key={seed}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={seed}
                tabIndex={active || (!seedSelected && i === 0) ? 0 : -1}
                onClick={() => setForm((f) => ({ ...f, avatarSeed: seed, avatarUrl: '' }))}
                className={cn(
                  'relative aspect-square rounded-2xl transition-transform duration-200 ease-out-expo hover:-translate-y-0.5 active:scale-95',
                  !active && 'opacity-80 hover:opacity-100',
                )}
              >
                {active && (
                  <motion.span layoutId="settings-portrait-seed" transition={spring.snappy} aria-hidden="true" className="absolute -inset-1 rounded-[20px] border-2 border-brand" />
                )}
                <Thumb
                  src={dicebear(seed)}
                  className="size-full rounded-2xl border border-line bg-brand-soft object-cover"
                  fallback={
                    <span className="grid size-full place-items-center rounded-2xl border border-line bg-brand-soft text-sm font-bold text-brand-strong">
                      {seed.charAt(0).toUpperCase()}
                    </span>
                  }
                />
              </button>
            );
          })}
        </div>
        <Input
          ref={avatarUrlRef}
          label="Custom image link"
          optional
          type="url"
          value={form.avatarUrl}
          onChange={(e) => set('avatarUrl', e.target.value)}
          placeholder="https://…"
          hint="Leave blank to use the selected character."
          error={errors.avatarUrl}
          autoCapitalize="none"
          spellCheck={false}
        />
      </div>

      {serverError && (
        <Alert tone="danger" title="Your profile wasn’t saved">
          {serverError}
        </Alert>
      )}

      <AnimatePresence initial={false}>
        {(dirty || saving) && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8, transition: { duration: dur.micro } }}
            transition={{ duration: dur.base, ease: ease.out }}
            className="sticky bottom-4 z-20 -mx-2 flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface/95 p-2.5 pl-4 shadow-float backdrop-blur sm:-mx-3 md:bottom-6"
          >
            <p className="flex min-w-0 items-center gap-2 text-sm font-medium text-ink-muted" aria-live="polite">
              <span className="size-2 shrink-0 rounded-full bg-brand" aria-hidden="true" />
              <span className="truncate">Unsaved changes</span>
            </p>
            <div className="flex shrink-0 gap-2">
              <Button variant="ghost" onClick={reset} disabled={saving}>
                Discard
              </Button>
              <Button type="submit" loading={saving}>
                Save<span className="hidden sm:inline">&nbsp;changes</span>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}
