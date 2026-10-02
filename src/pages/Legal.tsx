import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Container } from '@/components/layout/Section';
import { Logo } from '@/components/ui/Logo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

const docs: Record<string, { title: string; sections: { h: string; p: string }[] }> = {
  privacy: {
    title: 'Privacy',
    sections: [
      {
        h: 'What CurioPlay stores',
        p: 'When you create an account we store your username, email address and a secured password. Your profile (bio, avatar, location, website, date of birth and accent colour) is stored only if you add it.',
      },
      {
        h: 'Activity',
        p: 'To power scores, leaderboards and achievements we store the scores you submit, the sessions you start and end, and the achievements you unlock. Usernames and avatars appear on public leaderboards.',
      },
      {
        h: 'On your device',
        p: 'Your sign-in session, theme preference, and notification read-state are kept in your browser’s local storage so the app can remember you.',
      },
      {
        h: 'Your choices',
        p: 'You can edit your profile at any time and permanently delete your account and associated data from the Profile page.',
      },
    ],
  },
  terms: {
    title: 'Terms',
    sections: [
      {
        h: 'Using CurioPlay',
        p: 'CurioPlay is a platform for interactive simulators and games. Use it respectfully and do not attempt to disrupt the service or other users.',
      },
      {
        h: 'Content you publish',
        p: 'Creators who publish games or simulators are responsible for their code and must have the right to share it. Content that is harmful, infringing or malicious may be removed.',
      },
      {
        h: 'Accounts',
        p: 'You are responsible for activity on your account and for keeping your credentials safe.',
      },
      {
        h: 'Availability',
        p: 'The service is provided as is. Features may change as the platform evolves.',
      },
    ],
  },
  cookies: {
    title: 'Cookies',
    sections: [
      {
        h: 'How we remember you',
        p: 'CurioPlay uses your browser’s local storage rather than tracking cookies to remember your session, theme and notification read-state.',
      },
      {
        h: 'Third-party images',
        p: 'Avatars may be loaded from the DiceBear service and game thumbnails from the URLs creators provide. Those hosts receive a normal image request from your browser.',
      },
    ],
  },
};

export default function Legal() {
  const { doc } = useParams();
  const content = doc ? docs[doc] : undefined;
  if (!content) return <Navigate to="/" replace />;

  const others = Object.entries(docs).filter(([k]) => k !== doc);

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
      <Container className="grid gap-12 py-14 lg:grid-cols-12 lg:py-20">
        <aside className="lg:col-span-3">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-strong">
            <ArrowLeft className="size-4" /> Back to CurioPlay
          </Link>
          <nav aria-label="Legal documents" className="mt-8 hidden lg:block">
            <p className="label-mono mb-3 text-ink-faint">Appendix</p>
            <ul className="space-y-1">
              {Object.entries(docs).map(([k, d]) => (
                <li key={k}>
                  <Link
                    to={`/legal/${k}`}
                    aria-current={k === doc ? 'page' : undefined}
                    className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${k === doc ? 'bg-brand-soft text-brand-strong' : 'text-ink-muted hover:bg-surface-2 hover:text-ink'}`}
                  >
                    {d.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
        <article className="max-w-2xl lg:col-span-7">
          <p className="label-mono text-gold-strong">Appendix · {content.title}</p>
          <h1 className="mt-4 font-wide text-5xl font-extrabold leading-[0.95] sm:text-6xl">{content.title}</h1>
          <div className="mt-12 divide-y divide-line border-y border-line">
            {content.sections.map((s, i) => (
              <section key={s.h} className="grid gap-2 py-7 sm:grid-cols-[3rem_1fr]">
                <span className="label-mono pt-1 text-ink-faint">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <h2 className="text-xl font-bold">{s.h}</h2>
                  <p className="mt-2 leading-relaxed text-ink-muted">{s.p}</p>
                </div>
              </section>
            ))}
          </div>
          <p className="mt-10 text-sm text-ink-faint">
            Questions? Email{' '}
            <a className="link-underline font-semibold text-brand-strong" href="mailto:prathmdubey217@gmail.com">
              prathmdubey217@gmail.com
            </a>
            .
          </p>
          <div className="mt-10 flex flex-wrap gap-2 lg:hidden">
            {others.map(([k, d]) => (
              <Link key={k} to={`/legal/${k}`} className="rounded-full border border-line-strong px-4 py-2 text-sm font-semibold text-ink-muted">
                {d.title}
              </Link>
            ))}
          </div>
        </article>
      </Container>
    </div>
  );
}
