import WaitlistForm from './waitlist-form';

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
          Helm is in private beta. Join the waitlist and we&apos;ll get you in.
        </p>

        <WaitlistForm />
      </div>
    </section>
  );
}
