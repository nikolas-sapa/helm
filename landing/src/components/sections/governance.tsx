'use client';

import { useState } from 'react';
import { ToggleRight, Lock, TrendingDown, Eye } from 'lucide-react';

export default function Governance() {
  const [killSwitchOn, setKillSwitchOn] = useState(true);

  const proof_points = [
    {
      icon: Lock,
      title: 'Tool & domain scoping',
      description: 'Each agent runs with an explicit allowlist of which APIs and domains it can reach.',
    },
    {
      icon: TrendingDown,
      title: 'Per-agent spend caps',
      description: 'Set a hard token budget. When it hits zero, the agent stops. No exceptions.',
    },
    {
      icon: ToggleRight,
      title: 'Hard kill switch',
      description: 'One click in the dashboard stops any agent mid-run.',
    },
    {
      icon: Eye,
      title: 'Full audit trail',
      description: 'Every execution logged. Token spend tracked. Who changed what and when.',
    },
  ];

  return (
    <section className="py-20 px-6 border-t border-border-dark/60">
      <div className="max-w-6xl mx-auto">
        <h2 className="font-semibold text-4xl mb-4 text-center">IT sees and controls every agent</h2>
        <p className="text-text-muted text-center mb-16 max-w-2xl mx-auto">
          This is what separates Helm from "just run it on a VM." IT controls what every agent can do, how much it costs, and when it stops.
        </p>

        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {proof_points.map((point, index) => {
            const Icon = point.icon;
            return (
              <div
                key={index}
                className="p-8 bg-surface-dark/40 border border-border-dark rounded-sm"
              >
                <Icon size={24} className="mb-6 text-text-primary" />
                <h3 className="font-semibold text-lg mb-3">
                  {point.title}
                </h3>
                <p className="text-text-muted leading-relaxed">
                  {point.description}
                </p>
              </div>
            );
          })}
        </div>

        <div className="max-w-2xl mx-auto p-8 bg-surface-dark/60 border border-border-dark rounded-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h4 className="font-semibold text-lg mb-2">
                Agent: invoice-processor
              </h4>
              <div className="text-sm text-text-muted">Budget: $10 / mo</div>
            </div>
            <button
              onClick={() => setKillSwitchOn(!killSwitchOn)}
              className="flex items-center gap-3 px-4 py-2 bg-accent/10 rounded-xs hover:bg-accent/20 transition-colors"
            >
              <ToggleRight
                size={20}
                className={`transition-colors ${killSwitchOn ? 'text-accent' : 'text-text-muted'}`}
              />
              <span className="text-sm font-medium">
                {killSwitchOn ? 'Running' : 'Killed'}
              </span>
            </button>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className="flex justify-between py-2 border-b border-border-dark/60">
              <span className="text-text-muted">Spend to date</span>
              <span className="text-text-primary">$3.47</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border-dark/60">
              <span className="text-text-muted">Remaining budget</span>
              <span className="text-text-primary">$6.53</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-text-muted">Status</span>
              <span className={killSwitchOn ? 'text-accent' : 'text-text-muted'}>
                {killSwitchOn ? 'Active' : 'Terminated'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
