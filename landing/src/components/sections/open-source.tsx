import { Check } from 'lucide-react';

export default function OpenSource() {
  const columns = [
    {
      name: 'Run it yourself',
      description: 'Clone the monorepo and run the control plane on your own infrastructure.',
      points: [
        'MIT licensed, no usage limits',
        'No account, no key, no telemetry',
        'Codex CLI by default, or bring your own LLM',
        'Per-agent Convex database provisioned on deploy',
      ],
    },
    {
      name: 'Governance included',
      description: 'Every control ships in the repo. Nothing is held back behind a tier.',
      points: [
        'Per-agent tool and domain scoping',
        'Per-run checks and monthly admission budgets',
        'Recorded monthly usage checked before new runs',
        'Run history and per-agent controls to disable new runs',
      ],
    },
    {
      name: 'Built to be read',
      description: 'The repo is the documentation: architecture notes, research, and tests.',
      points: [
        'Unit tests across core, agent, runtime, and CLI',
        'Architecture and market research in docs/',
        'Contribution guide and issue templates',
        'Open to PRs and design discussion',
      ],
    },
  ];

  return (
    <section id="open-source" className="py-20 px-6 border-t border-border-dark/60">
      <div className="max-w-6xl mx-auto">
        <h2 className="font-semibold text-4xl mb-4 text-center">Free and open source</h2>
        <p className="text-text-muted text-center mb-16 max-w-2xl mx-auto">
          Helm is MIT licensed and self-hosted. There is no paid tier, no seat count, and
          nothing to talk to sales about.
        </p>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {columns.map((column, index) => (
            <div
              key={index}
              className="p-8 rounded-sm border border-border-dark bg-surface-dark/40"
            >
              <h3 className="font-semibold text-2xl mb-4">{column.name}</h3>

              <p className="text-sm text-text-muted mb-8 leading-relaxed">
                {column.description}
              </p>

              <div className="space-y-3">
                {column.points.map((point, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <Check size={18} className="text-text-muted flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-text-muted leading-relaxed">{point}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-3 px-4 py-3 rounded-xs border border-border-dark bg-surface-dark/60 font-mono text-sm mb-6">
            <span className="text-text-muted">$</span>
            <span className="text-text-primary">
              git clone https://github.com/nikolas-sapa/helm
            </span>
          </div>

          <div>
            <a
              href="https://github.com/nikolas-sapa/helm"
              className="inline-block py-3 px-6 rounded-xs font-semibold bg-accent text-white hover:bg-accent-hover transition-colors"
            >
              View the source on GitHub
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
