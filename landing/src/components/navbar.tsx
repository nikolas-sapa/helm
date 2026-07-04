'use client';

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border-dark/60 backdrop-blur-sm bg-bg-dark/80">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="font-semibold text-lg tracking-tight">
          Helm
        </div>
        <div className="flex items-center gap-8">
          <a href="#pricing" className="text-sm text-text-muted hover:text-text-primary transition-colors">
            Pricing
          </a>
        </div>
      </div>
    </nav>
  );
}
