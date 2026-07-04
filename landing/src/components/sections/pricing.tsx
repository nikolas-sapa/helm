'use client';

import { Check } from 'lucide-react';

export default function Pricing() {
  const tiers = [
    {
      name: 'Free',
      price: '$0',
      agents: '3 agents included',
      description: 'Perfect for eval and small teams',
      features: [
        '3 agents',
        'Basic governance (scoping + caps)',
        'Kill switch per agent',
        'Audit log retention',
        'Community support',
      ],
      cta: 'Start free',
      highlight: false,
    },
    {
      name: 'Growth',
      price: '$299',
      period: '/mo',
      agents: 'Unlimited agents',
      description: 'For teams shipping agents to production',
      features: [
        'Unlimited agents',
        'Full governance tooling',
        'Priority support',
        'Custom domain scoping',
        'Advanced audit trails',
        'Per-agent spend reporting',
      ],
      cta: 'Get started',
      highlight: true,
    },
    {
      name: 'Enterprise',
      price: '$999',
      period: '/mo',
      agents: 'Custom deployment',
      description: 'For large teams and complex governance needs',
      features: [
        'Unlimited agents',
        'White-label control plane',
        'On-premise or private cloud',
        'SSO & SAML',
        'Custom compliance integrations',
        'Dedicated support',
      ],
      cta: 'Contact sales',
      highlight: false,
    },
  ];

  const note =
    'All tiers include per-agent token spend metering and scaling. Enterprise includes custom overage pricing.';

  return (
    <section id="pricing" className="py-20 px-6 border-t border-border-dark/60">
      <div className="max-w-6xl mx-auto">
        <h2 className="font-semibold text-4xl mb-4 text-center">Simple pricing</h2>
        <p className="text-text-muted text-center mb-16 max-w-2xl mx-auto">
          Pay for what you use. Scale without negotiation.
        </p>

        <div className="grid md:grid-cols-3 gap-8 mb-8">
          {tiers.map((tier, index) => (
            <div
              key={index}
              className={`relative p-8 rounded-sm border transition-all ${
                tier.highlight
                  ? 'bg-surface-dark/60 border-border-dark ring-1 ring-border-dark'
                  : 'bg-surface-dark/40 border-border-dark'
              }`}
            >
              {tier.highlight && (
                <div className="absolute -top-3 left-6 px-3 py-1 bg-text-primary text-bg-dark text-xs font-semibold rounded-xs">
                  Most popular
                </div>
              )}

              <h3 className="font-semibold text-2xl mb-2">
                {tier.name}
              </h3>
              <div className="mb-4">
                <div className="text-3xl font-semibold text-text-primary">
                  {tier.price}
                  {tier.period && <span className="text-lg text-text-muted">{tier.period}</span>}
                </div>
                <div className="text-sm text-text-muted mt-2">
                  {tier.agents}
                </div>
              </div>

              <p className="text-sm text-text-muted mb-8 leading-relaxed">
                {tier.description}
              </p>

              <a
                href="#cta"
                className={`block w-full py-3 px-4 rounded-xs text-center font-semibold mb-8 transition-colors ${
                  tier.highlight
                    ? 'bg-accent text-white hover:bg-accent-hover'
                    : 'bg-accent/10 text-accent hover:bg-accent/20'
                }`}
              >
                {tier.cta}
              </a>

              <div className="space-y-3">
                {tier.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <Check size={18} className="text-text-muted flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-text-muted leading-relaxed">
                      {feature}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-text-muted text-center max-w-2xl mx-auto">
          {note}
        </p>
      </div>
    </section>
  );
}
