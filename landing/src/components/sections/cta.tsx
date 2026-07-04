import { ArrowRight } from 'lucide-react';

export default function CTA() {
  return (
    <section
      id="cta"
      className="py-24 px-6 border-t border-border-dark/60"
    >
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="font-semibold text-5xl mb-6 leading-tight">
          Deploy your first agent
        </h2>

        <p className="text-text-muted mb-12 text-lg leading-relaxed">
          Helm is in private beta. Email us and we&apos;ll get you in.
        </p>

        {/* TODO: swap mailto for real capture provider */}
        <a
          href="mailto:sapalidis.giannis@gmail.com?subject=Helm%20early%20access"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-accent text-white font-semibold rounded-xs hover:bg-accent-hover transition-colors"
        >
          Get early access
          <ArrowRight size={18} />
        </a>
      </div>
    </section>
  );
}
