'use client';

import { useState } from 'react';
import { ArrowRight } from 'lucide-react';

export default function CTA() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (email) {
      setSubmitted(true);
      setEmail('');
      setTimeout(() => setSubmitted(false), 3000);
    }

    setLoading(false);
  };

  return (
    <section
      id="cta"
      className="py-24 px-6 border-t border-surface-dark border-opacity-30"
    >
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="font-sora font-bold text-5xl mb-6 leading-tight">
          Deploy your first agent
        </h2>

        <p className="text-text-muted mb-12 text-lg leading-relaxed">
          Helm is in private beta. Join the waitlist to get early access and see how governance changes everything.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 mb-4">
          <input
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="flex-1 px-4 py-3 bg-surface-dark bg-opacity-30 border border-surface-dark rounded-xs text-accent placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-accent transition-all"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-accent text-bg-dark font-jakarta font-semibold rounded-xs hover:bg-accent-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap"
          >
            {loading ? 'Joining...' : 'Join waitlist'}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        {submitted && (
          <p className="text-accent text-sm">
            Check your email for early access details.
          </p>
        )}

        <p className="text-text-muted text-sm mt-8">
          No spam. Just launch updates and governance insights.
        </p>
      </div>
    </section>
  );
}
