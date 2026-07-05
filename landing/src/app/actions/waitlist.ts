"use server";

import { Resend } from "resend";

const PRODUCT = "Helm";

const ipBucket = new Map<string, { count: number; resetAt: number }>();
const RATE_WINDOW_MS = 5 * 60 * 1000;
const RATE_LIMIT = 3;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipBucket.get(ip);
  if (!entry || now > entry.resetAt) {
    ipBucket.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

const EMAIL_RE = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']{2,}$/;

function escapeHtml(s: unknown): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type WaitlistResult =
  | { ok: true }
  | { ok: false; error: "honeypot" | "timing" | "invalid_email" | "rate_limit" | "send_failed" };

function adminHtml(email: string, ip: string, time: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>New ${PRODUCT} early-access signup</title></head>
<body style="margin:0;padding:32px 20px;background:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
    <tr>
      <td style="background:#0a0a0a;padding:20px 28px;">
        <span style="color:#006bff;font-size:13px;font-weight:700;letter-spacing:0.05em;">${PRODUCT.toUpperCase()} — EARLY ACCESS</span>
      </td>
    </tr>
    <tr>
      <td style="padding:28px;">
        <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#9aa5b4;letter-spacing:0.06em;text-transform:uppercase;">New signup</p>
        <p style="margin:0 0 20px;font-size:20px;font-weight:700;color:#0a0a0a;">${escapeHtml(email)}</p>
        <table cellpadding="0" cellspacing="0" style="font-size:13px;color:#4a5568;">
          <tr><td style="padding:3px 0;color:#9aa5b4;width:80px;">Product</td><td style="padding:3px 0;font-weight:600;">${PRODUCT}</td></tr>
          <tr><td style="padding:3px 0;color:#9aa5b4;">Email</td><td style="padding:3px 0;">${escapeHtml(email)}</td></tr>
          <tr><td style="padding:3px 0;color:#9aa5b4;">Time</td><td style="padding:3px 0;">${time} (Europe/Athens)</td></tr>
          <tr><td style="padding:3px 0;color:#9aa5b4;">IP</td><td style="padding:3px 0;">${escapeHtml(ip)}</td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function joinWaitlist(formData: FormData): Promise<WaitlistResult> {
  if (formData.get("website")) return { ok: false, error: "honeypot" };

  const renderedAt = Number(formData.get("rendered_at") ?? 0);
  if (!renderedAt || Date.now() - renderedAt < 2000) return { ok: false, error: "timing" };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) return { ok: false, error: "invalid_email" };

  const { headers } = await import("next/headers");
  const headersList = await headers();
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headersList.get("x-real-ip") ??
    "unknown";

  if (!checkRateLimit(ip)) return { ok: false, error: "rate_limit" };

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[waitlist] RESEND_API_KEY not set — skipping send, returning success");
    return { ok: true };
  }

  const resend = new Resend(apiKey);

  // Add to Resend Audience — firstName prefixed with the product so the list is taggable
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (audienceId) {
    await resend.contacts
      .create({ email, audienceId, unsubscribed: false, firstName: PRODUCT })
      .catch((err: unknown) => {
        console.warn("[waitlist] audience add failed:", err);
      });
  }

  const time = new Date().toLocaleString("en-GB", {
    timeZone: "Europe/Athens",
    dateStyle: "medium",
    timeStyle: "short",
  });

  // Admin notification only — the per-product tag lives in the subject line
  const adminResult = await resend.emails.send({
    from: `${PRODUCT} Waitlist <hello@trypadelup.com>`,
    to: "hello@trypadelup.com",
    subject: `[${PRODUCT}] early-access signup: ${email}`,
    html: adminHtml(email, ip, time),
  });

  if (adminResult.error) {
    console.error("[waitlist] admin send failed:", adminResult.error);
    return { ok: false, error: "send_failed" };
  }

  return { ok: true };
}
