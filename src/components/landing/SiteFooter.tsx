import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowUp, Github, Mail } from 'lucide-react';
import { Container } from '@/components/layout/Section';
import { Logo } from '@/components/ui/Logo';
import { ease } from '@/lib/motion';
import { gamepadAnchor } from './gamepad/gamepadStore';

/*
 * Colophon. Night surface, link columns with drawn underlines, and the wordmark set huge
 * in outline at the foot of the page — it rises into place once, like a title card.
 */

type FooterLink = { label: string; href?: string; to?: string };

const columns: { title: string; links: FooterLink[] }[] = [
  {
    title: 'Explore',
    links: [
      { label: 'The collection', href: '#explore' },
      { label: 'Games', href: '#games' },
      { label: 'Simulators', href: '#simulators' },
      { label: 'How it works', href: '#how' },
    ],
  },
  {
    title: 'Platform',
    links: [
      { label: 'Capabilities', href: '#features' },
      { label: 'Instruments', href: '#technology' },
      { label: 'Log in', to: '/login' },
      { label: 'Create an account', to: '/login' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Questions', href: '#faq' },
      { label: 'The team', href: '#about' },
      { label: 'Contact & help', to: '/contact' },
      { label: 'Report a bug', to: '/contact?topic=bug' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', to: '/legal/privacy' },
      { label: 'Terms', to: '/legal/terms' },
      { label: 'Cookies', to: '/legal/cookies' },
    ],
  },
];

const linkClass = 'link-underline text-sm text-white/65 transition-colors hover:text-white';

export function SiteFooter() {
  return (
    <footer id="footer" className="relative overflow-hidden bg-navy text-white">
      <Container className="pt-20">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Link to="/" className="inline-flex items-center gap-2.5" aria-label="CurioPlay home">
              <Logo className="h-16" />
            </Link>
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/60">
              A field guide to curiosity — simulators, games and code you can pick up and play.
            </p>
            <div className="mt-6 flex gap-2">
              <a
                href="https://github.com/Prathmesh-Dubey"
                target="_blank"
                rel="noreferrer"
                aria-label="CurioPlay on GitHub"
                className="grid size-11 place-items-center rounded-xl border border-white/15 text-white/70 transition-[color,background-color,border-color] hover:border-white/30 hover:bg-white/10 hover:text-white"
              >
                <Github className="size-4.5" />
              </a>
              <a
                href="mailto:prathmdubey217@gmail.com"
                aria-label="Email the CurioPlay team"
                className="grid size-11 place-items-center rounded-xl border border-white/15 text-white/70 transition-[color,background-color,border-color] hover:border-white/30 hover:bg-white/10 hover:text-white"
              >
                <Mail className="size-4.5" />
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:col-span-8">
            {columns.map((col) => (
              <nav key={col.title} aria-label={col.title}>
                <h3 className="label-mono text-night-sage/60">{col.title}</h3>
                <ul className="mt-5 space-y-3">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      {l.to ? (
                        <Link to={l.to} className={linkClass}>
                          {l.label}
                        </Link>
                      ) : (
                        <a href={l.href} className={linkClass}>
                          {l.label}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-16 flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-6 text-xs text-white/45 sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} CurioPlay. All rights reserved.</p>
          <p className="label-mono">Learn it · Play it · Experience it</p>
          <a
            href="#top"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3.5 py-2 text-white/70 transition-colors hover:border-white/30 hover:text-white"
          >
            Back to top <ArrowUp className="size-3.5" />
          </a>
        </div>
      </Container>

      <div className="relative mt-10 overflow-hidden" aria-hidden="true">
        {/* 3D controller finale: it touches down here as the scroll ends */}
        <div
          {...gamepadAnchor('footer', 8, 'finale')}
          className="pointer-events-none absolute bottom-[18%] left-1/2 aspect-[4/3] w-[clamp(170px,24vw,330px)] -translate-x-1/2"
        />
        <motion.p
          initial={{ y: '45%', opacity: 0 }}
          whileInView={{ y: '18%', opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: ease.out }}
          className="select-none whitespace-nowrap text-center font-wide text-[19vw] font-extrabold leading-[0.8] text-transparent [-webkit-text-stroke:1px_rgb(205_232_255/0.22)]"
        >
          CurioPlay
        </motion.p>
      </div>
    </footer>
  );
}
