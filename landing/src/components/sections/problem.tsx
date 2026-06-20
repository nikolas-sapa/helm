'use client';

export default function Problem() {
  const problems = [
    {
      title: "Engineers write agents. Then what?",
      description: "Agents ship as ad-hoc scripts, notebooks, or—worse—unsandboxed processes. Nobody knows how many are running or what they access.",
    },
    {
      title: "IT has no visibility",
      description: "Spend is unmetered. Tool access is unconstrained. When things break, there is no audit trail. Kill switches do not exist.",
    },
    {
      title: "The gap is a compliance nightmare",
      description: "Teams build in secret. IT finds out when something goes wrong. By then, the agent has already run wild.",
    },
  ];

  return (
    <section className="py-20 px-6 border-t border-surface-dark border-opacity-30">
      <div className="max-w-5xl mx-auto">
        <h2 className="font-sora font-bold text-4xl mb-12 text-center">The problem</h2>

        <div className="grid md:grid-cols-3 gap-8">
          {problems.map((problem, index) => (
            <div
              key={index}
              className="p-8 bg-surface-dark bg-opacity-20 border border-surface-dark border-opacity-30 rounded-sm"
            >
              <h3 className="font-sora font-semibold text-lg mb-3 leading-snug">
                {problem.title}
              </h3>
              <p className="text-text-muted leading-relaxed">
                {problem.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
