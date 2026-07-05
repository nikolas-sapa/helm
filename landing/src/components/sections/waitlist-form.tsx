'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, Loader2 } from 'lucide-react';
import { joinWaitlist, type WaitlistResult } from '@/app/actions/waitlist';

type Status = 'idle' | 'submitting' | 'success' | 'error';

const ERROR_MESSAGES: Record<string, string> = {
  invalid_email: 'Enter a valid email address.',
  rate_limit: 'Too many requests — try again in a few minutes.',
  send_failed: 'Something went wrong. Try again in a moment.',
  default: 'Something went wrong. Please try again.',
};

export default function WaitlistForm() {
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [email, setEmail] = useState('');
  const renderedAtRef = useRef<number>(0);

  useEffect(() => {
    renderedAtRef.current = Date.now();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === 'submitting') return;

    setStatus('submitting');
    setErrorMsg('');

    const data = new FormData(e.currentTarget);
    data.set('rendered_at', String(renderedAtRef.current));

    let result: WaitlistResult;
    try {
      result = await joinWaitlist(data);
    } catch {
      setStatus('error');
      setErrorMsg(ERROR_MESSAGES.default);
      return;
    }

    if (result.ok) {
      setStatus('success');
      return;
    }

    // Silently succeed for honeypot and timing — don't signal to bots
    if (result.error === 'honeypot' || result.error === 'timing') {
      setStatus('success');
      return;
    }

    setStatus('error');
    setErrorMsg(ERROR_MESSAGES[result.error] ?? ERROR_MESSAGES.default);
  }

  if (status === 'success') {
    return (
      <div
        aria-live="polite"
        className="inline-flex items-center gap-2.5 px-5 py-3 rounded-sm border border-border-dark bg-surface-dark text-text-primary"
      >
        <Check size={18} className="text-accent" />
        <span className="text-sm">
          You&apos;re on the list — we&apos;ll email you at launch.
        </span>
      </div>
    );
  }

  const isSubmitting = status === 'submitting';

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="mx-auto flex w-full max-w-md flex-col items-stretch gap-3 sm:flex-row"
    >
      {/* Honeypot — visually hidden, bots fill it, humans don't */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none' }}
      />

      <div className="flex flex-1 flex-col gap-1.5 text-left">
        <label htmlFor="waitlist-email" className="sr-only">
          Email address
        </label>
        <input
          id="waitlist-email"
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          required
          autoComplete="email"
          disabled={isSubmitting}
          aria-invalid={status === 'error'}
          aria-describedby={status === 'error' ? 'waitlist-error' : undefined}
          className="w-full rounded-xs border border-border-dark bg-surface-dark px-4 py-3 text-sm text-text-primary placeholder:text-text-muted outline-none transition-colors focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex items-center justify-center gap-2 rounded-xs bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Joining
          </>
        ) : (
          <>
            Get early access
            <ArrowRight size={16} />
          </>
        )}
      </button>

      <p
        id="waitlist-error"
        role="alert"
        aria-live="polite"
        className={
          status === 'error' && errorMsg
            ? 'basis-full text-left text-sm text-[#ea001d]'
            : 'sr-only'
        }
      >
        {errorMsg}
      </p>
    </form>
  );
}
