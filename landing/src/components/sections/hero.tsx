'use client';

import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';

export default function Hero() {
  const [displayText, setDisplayText] = useState('');
  const commandText = 'npx helm deploy';

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      if (index < commandText.length) {
        setDisplayText(commandText.slice(0, index + 1));
        index++;
      }
    }, 50);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="pt-32 pb-20 px-6">
      <div className="max-w-4xl mx-auto text-center">
        <div className="inline-block mb-6 px-3 py-1 bg-surface-dark/50 rounded-xs border border-border-dark text-text-muted text-sm">
          self-hosted control plane · keyless by default · per-agent DB included
        </div>

        <h1 className="font-semibold text-6xl md:text-7xl mb-6 leading-tight tracking-tight">
          Deploy an internal agent in one command
        </h1>

        <p className="text-xl text-text-muted mb-12 max-w-2xl mx-auto leading-relaxed">
          Every internal agent — hosted, metered, and scoped — without anyone touching a Kubernetes cluster.
        </p>

        <div className="flex flex-col items-center gap-8">
          <div className="w-full max-w-xl">
            <div className="bg-surface-dark/40 border border-border-dark rounded-sm p-6 font-mono text-text-primary relative overflow-hidden">
              <div className="flex items-center gap-2">
                <span className="text-text-muted">$</span>
                <span>{displayText}</span>
                <span className="animate-pulse">_</span>
              </div>
            </div>
          </div>

          <a
            href="#cta"
            className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white font-semibold rounded-xs hover:bg-accent-hover transition-colors group"
          >
            Get early access
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </a>
        </div>
      </div>
    </section>
  );
}
