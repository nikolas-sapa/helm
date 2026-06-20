'use client';

import { Code2 } from 'lucide-react';

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-surface-dark border-opacity-30 backdrop-blur-sm bg-bg-dark bg-opacity-80">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="font-sora font-bold text-lg tracking-tight">
          Helm
        </div>
        <div className="flex items-center gap-8">
          <a href="#pricing" className="text-sm text-text-muted hover:text-accent transition-colors">
            Pricing
          </a>
          <a
            href="https://github.com/nikolas-sapa/helm"
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-muted hover:text-accent transition-colors"
          >
            <Code2 size={18} />
          </a>
        </div>
      </div>
    </nav>
  );
}
