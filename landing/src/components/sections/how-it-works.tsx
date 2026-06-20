'use client';

import { Code2, Play, Database, Shield } from 'lucide-react';

export default function HowItWorks() {
  const steps = [
    {
      num: '01',
      title: 'Write with defineAgent',
      description: 'Your team writes an agent using the @helm/agent contract.',
      icon: Code2,
    },
    {
      num: '02',
      title: 'Deploy with one command',
      description: 'Run `npx helm deploy`. The CLI bundles and sends it to your control plane.',
      icon: Play,
    },
    {
      num: '03',
      title: 'Auto-provisioned execution',
      description: 'Your agent runs in an isolated child process. A per-agent Convex DB provisions automatically.',
      icon: Database,
    },
    {
      num: '04',
      title: 'IT governs everything',
      description: 'Dashboard shows scope, token spend, and per-agent kill switches. No agent runs without governance.',
      icon: Shield,
    },
  ];

  return (
    <section className="py-20 px-6 border-t border-surface-dark border-opacity-30">
      <div className="max-w-6xl mx-auto">
        <h2 className="font-sora font-bold text-4xl mb-16 text-center">How it works</h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={index}
                className="relative p-8 bg-surface-dark bg-opacity-20 border border-surface-dark border-opacity-30 rounded-sm"
              >
                <div className="text-sm font-mono text-text-muted mb-4">{step.num}</div>
                <Icon size={24} className="mb-6 text-accent" />
                <h3 className="font-sora font-semibold text-lg mb-3">
                  {step.title}
                </h3>
                <p className="text-text-muted text-sm leading-relaxed">
                  {step.description}
                </p>

                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 w-6 h-px bg-surface-dark bg-opacity-30 -translate-y-1/2" />
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-16 p-8 bg-surface-dark bg-opacity-10 border border-surface-dark border-opacity-30 rounded-sm">
          <div className="font-mono text-sm text-text-muted mb-4">Architecture</div>
          <div className="text-accent font-mono text-sm leading-relaxed space-y-1">
            <div>@helm/core → cost & policy engine</div>
            <div>@helm/agent → defineAgent contract</div>
            <div>@helm/runtime → execution & metering</div>
            <div>@helm/cli → deploy & auth</div>
          </div>
        </div>
      </div>
    </section>
  );
}
