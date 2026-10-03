import { useState } from 'react';
import { Mail } from 'lucide-react';
import { Container, SectionHeading } from '@/components/layout/Section';
import { gamepadAnchor } from './gamepad/gamepadStore';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/motion/accordion';
import { cn } from '@/lib/utils';

/*
 * № 07 — Questions. Numbered entries like an appendix. One open at a time; the plus
 * rotates into a minus, height eases open, the open row gets a sage wash.
 */

const faqs = [
  {
    q: 'What is CurioPlay?',
    a: 'CurioPlay is a collection of interactive simulators, browser games and coding experiences. Everything runs directly in your browser — nothing to download or install.',
  },
  {
    q: 'Do I need an account?',
    a: 'You can browse the collection without one. To launch experiences, save scores, earn achievements and appear on leaderboards, create a free account.',
  },
  {
    q: 'Can I publish my own game or simulator?',
    a: 'Yes. Creator (admin) accounts can open the Creator Studio, paste a single-file React TSX component, and publish it as a game or simulator that runs instantly.',
  },
  {
    q: 'Does it work on my phone?',
    a: 'Yes. CurioPlay is fully responsive on the web, and it also ships as an Android app built with Capacitor.',
  },
  {
    q: 'Is my progress saved?',
    a: 'Scores, play sessions and unlocked achievements are stored with your account, so your history follows you across devices.',
  },
];

function PlusMinus({ open }: { open: boolean }) {
  return (
    <span className="relative grid size-9 shrink-0 place-items-center rounded-full border border-line-strong transition-colors group-hover:border-brand/50">
      <span className="absolute h-[1.5px] w-3.5 rounded-full bg-ink" />
      <span
        className={cn('absolute h-3.5 w-[1.5px] rounded-full bg-ink transition-transform duration-500 ease-out-expo', open && 'rotate-90 scale-y-0')}
      />
    </span>
  );
}

export function FAQ() {
  const [open, setOpen] = useState<React.Key | null>(faqs[0].q);
  return (
    <section id="faq" className="scroll-mt-24 border-t border-line py-24 sm:py-32">
      <Container className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-32" data-gamepad-sticky>
            <SectionHeading index="07" eyebrow="Questions" size="title" title="Good questions." />
            <a
              href="mailto:prathmdubey217@gmail.com"
              className="group mt-8 flex items-center gap-4 rounded-[20px] border border-line bg-surface p-5 transition-[border-color,box-shadow] hover:border-brand/40 hover:shadow-card"
            >
              <span className="grid size-11 place-items-center rounded-2xl bg-rose-soft text-brand-strong">
                <Mail className="size-5" />
              </span>
              <span className="leading-tight">
                <span className="block font-semibold text-ink">Still curious?</span>
                <span className="link-underline mt-1 inline-block text-sm text-ink-muted">Write to the team</span>
              </span>
            </a>
            {/* 3D controller waypoint (desktop) */}
            <div aria-hidden="true" {...gamepadAnchor('faq', 7, 'restRight')} className="mt-12 hidden aspect-[4/3] w-60 lg:block" />
          </div>
        </div>

        <div className="lg:col-span-8">
          <Accordion
            expandedValue={open}
            onValueChange={setOpen}
            className="border-t border-ink/80"
            transition={{ type: 'spring', stiffness: 220, damping: 30 }}
            variants={{ expanded: { opacity: 1, height: 'auto' }, collapsed: { opacity: 0, height: 0 } }}
          >
            {faqs.map((f, i) => {
              const isOpen = open === f.q;
              return (
                <AccordionItem
                  key={f.q}
                  value={f.q}
                  className={cn('border-b border-line transition-colors duration-500', isOpen && 'bg-rose-soft/40')}
                >
                  <AccordionTrigger className="w-full px-2 py-6 text-left sm:px-4">
                    <span className="flex items-center gap-5">
                      <span className="label-mono w-10 shrink-0 text-gold-strong">Q.{String(i + 1).padStart(2, '0')}</span>
                      <span className="flex-1 text-lg font-semibold text-ink sm:text-xl">{f.q}</span>
                      <PlusMinus open={isOpen} />
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="max-w-2xl pb-7 pl-[4.25rem] pr-14 text-[15px] leading-relaxed text-ink-muted sm:pl-[5.25rem]">{f.a}</p>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>
      </Container>
    </section>
  );
}
