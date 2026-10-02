import { useEffect } from 'react';
import { LandingNav } from '@/components/landing/LandingNav';
import { Hero } from '@/components/landing/Hero';
import { Collection } from '@/components/landing/Collection';
import { Exhibits } from '@/components/landing/Exhibits';
import { LabChapter } from '@/components/landing/LabChapter';
import { Capabilities } from '@/components/landing/Capabilities';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { TechStack } from '@/components/landing/TechStack';
import { Voices } from '@/components/landing/Voices';
import { FAQ } from '@/components/landing/FAQ';
import { FinalCTA } from '@/components/landing/FinalCTA';
import { SiteFooter } from '@/components/landing/SiteFooter';

/*
 * The landing page reads like a field guide, in numbered chapters:
 * Plate I hero · 01 collection · 02 exhibit hall (games) · 03 laboratory (simulators)
 * 04 capabilities · 05 how it works · instruments · 06 field notes & team · 07 questions · 08 finale.
 */
export default function LandingPage() {
  useEffect(() => {
    if (!window.location.hash) window.scrollTo(0, 0);
  }, []);

  // overflow-x clip (not hidden): no scroll container, so the sticky chapters keep working, and mobile Chrome
  // no longer widens the page for the orrery's off-canvas chips.
  return (
    <div className="min-h-screen overflow-x-clip bg-canvas text-ink">
      <a
        href="#explore"
        className="sr-only z-[200] rounded-lg bg-surface px-4 py-2 text-sm font-semibold focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <LandingNav />
      <main>
        <Hero />
        <Collection />
        <Exhibits />
        <LabChapter />
        <Capabilities />
        <HowItWorks />
        <TechStack />
        <Voices />
        <FAQ />
        <FinalCTA />
      </main>
      <SiteFooter />
    </div>
  );
}
