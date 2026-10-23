import { after } from "next/server";
import { createHmac } from "node:crypto";
import { prisma } from "@/lib/prisma";

export type ServerEventName =
  | "signup"
  | "login"
  | "recharge_created"
  | "recharge_marked_done"
  | "push_enabled"
  | "telegram_connected"
  | "reminder_created"
  | "reminder_marked_done";

/**
 * Records a product event for a signed-in user. Runs inside `after()` so it
 * never delays the API response, and never throws — analytics must not be able
 * to break signup or a recharge update.
 *
 * Done server-side on purpose: ad blockers can't block it, and it can't be
 * faked from the browser.
 */
export function trackServerEvent(name: ServerEventName, userId: string) {
  after(async () => {
    try {
      await prisma.analyticsEvent.create({ data: { name, userId } });
    } catch (err) {
      console.error(`analytics: failed to record "${name}"`, err);
    }
  });
}

const BOT_RE =
  /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse|pingdom|uptime|monitor|curl|wget|python-requests|node-fetch|axios|go-http/i;

export function isBot(userAgent: string | null): boolean {
  return !userAgent || BOT_RE.test(userAgent);
}

export function deviceFromUserAgent(ua: string): "mobile" | "tablet" | "desktop" {
  if (/ipad|tablet|playbook|silk/i.test(ua) || (/android/i.test(ua) && !/mobile/i.test(ua))) {
    return "tablet";
  }
  if (/mobi|iphone|ipod|android|windows phone/i.test(ua)) return "mobile";
  return "desktop";
}

/**
 * Anonymous, cookieless visitor id: HMAC(secret, utc-day | ip | user-agent).
 * The day is part of the input, so the id changes every UTC midnight — it can
 * answer "how many different visitors today" but cannot track a person across
 * days. The raw IP and user-agent are never stored.
 */
export function visitorHash(ip: string, userAgent: string): string {
  const secret = process.env.ANALYTICS_SALT || process.env.AUTH_SECRET || "dev-only-salt";
  const day = new Date().toISOString().slice(0, 10);
  return createHmac("sha256", secret).update(`${day}|${ip}|${userAgent}`).digest("hex").slice(0, 32);
}
