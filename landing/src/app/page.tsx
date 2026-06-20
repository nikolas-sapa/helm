import Hero from '@/components/sections/hero';
import Problem from '@/components/sections/problem';
import HowItWorks from '@/components/sections/how-it-works';
import Governance from '@/components/sections/governance';
import Pricing from '@/components/sections/pricing';
import CTA from '@/components/sections/cta';
import Navbar from '@/components/navbar';

export default function Home() {
  return (
    <main className="overflow-x-hidden">
      <Navbar />
      <Hero />
      <Problem />
      <HowItWorks />
      <Governance />
      <Pricing />
      <CTA />
    </main>
  );
}
