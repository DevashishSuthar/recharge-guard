/**
 * Client-side analytics helpers. Two independent sinks:
 *   1. Google Analytics 4 (window.gtag) — loaded by <Analytics /> and gated
 *      by the visitor's consent choice.
 *   2. First-party beacon to /api/track — cookieless and unaffected by ad
 *      blockers, so it is the more reliable *count* of visits.
 *
 * Nothing is sent in development unless NEXT_PUBLIC_ANALYTICS_DEBUG=1, and
 * nothing is sent from browsers that send Do-Not-Track / Global Privacy Control.
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export const CONSENT_KEY = "rg_consent";
export type Consent = "granted" | "denied";

export function analyticsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  const live =
    process.env.NODE_ENV === "production" ||
    process.env.NEXT_PUBLIC_ANALYTICS_DEBUG === "1";
  if (!live) return false;

  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  if (nav.doNotTrack === "1" || nav.globalPrivacyControl === true) return false;
  return true;
}

export function getConsent(): Consent | null {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

export function setConsent(value: Consent) {
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch {
    /* private mode — the choice just won't persist */
  }
  window.gtag?.("consent", "update", { analytics_storage: value });
}

type CustomEvent = {
  name: "page_view" | "cta_click";
  path: string;
  label?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
};

function sendCustom(event: CustomEvent) {
  const body = JSON.stringify(event);
  try {
    if (navigator.sendBeacon?.("/api/track", new Blob([body], { type: "application/json" }))) {
      return;
    }
  } catch {
    /* fall through to fetch */
  }
  fetch("/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}

// document.referrer never changes on client-side navigations, so only the
// first page view of a load may carry it — otherwise every page would be
// credited to the original referrer.
let referrerSent = false;

export function trackPageView(path: string) {
  if (!analyticsEnabled()) return;

  const params = new URLSearchParams(window.location.search);
  const referrer = referrerSent ? undefined : document.referrer || undefined;
  referrerSent = true;

  sendCustom({
    name: "page_view",
    path,
    referrer,
    utmSource: params.get("utm_source") ?? undefined,
    utmMedium: params.get("utm_medium") ?? undefined,
    utmCampaign: params.get("utm_campaign") ?? undefined,
  });
}

export function trackCta(label: string) {
  if (!analyticsEnabled()) return;
  window.gtag?.("event", "cta_click", { label });
  sendCustom({ name: "cta_click", path: window.location.pathname, label });
}

/** A Google Analytics event only (e.g. the recommended `sign_up` / `login`). */
export function trackGA(name: string, params?: Record<string, string | number | boolean>) {
  if (!analyticsEnabled()) return;
  window.gtag?.("event", name, params);
}
