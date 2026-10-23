"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";
import {
  analyticsEnabled,
  getConsent,
  setConsent,
  trackPageView,
} from "@/lib/analytics";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
// Guard against a mistyped env var ending up inside an inline <script>.
const GA_ID_OK = GA_ID && /^G-[A-Z0-9]{4,}$/.test(GA_ID) ? GA_ID : null;

/**
 * Mount once in the root layout. Does three things:
 *  1. Loads Google Analytics 4 in Consent Mode: analytics storage is DENIED
 *     until the visitor accepts, so no GA cookies are set before consent.
 *  2. Sends a first-party page view on every route change.
 *  3. Shows a small consent banner (only when GA is configured).
 */
export function Analytics() {
  const pathname = usePathname();

  useEffect(() => {
    trackPageView(pathname);
  }, [pathname]);

  return (
    <>
      {GA_ID_OK && process.env.NODE_ENV === "production" && (
        <>
          <Script id="ga-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = gtag;
              var stored = null;
              try { stored = localStorage.getItem('rg_consent'); } catch (e) {}
              gtag('consent', 'default', {
                analytics_storage: stored === 'granted' ? 'granted' : 'denied',
                ad_storage: 'denied',
                ad_user_data: 'denied',
                ad_personalization: 'denied'
              });
              gtag('js', new Date());
              gtag('config', '${GA_ID_OK}');
            `}
          </Script>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID_OK}`}
            strategy="afterInteractive"
          />
        </>
      )}
      {GA_ID_OK && <ConsentBanner />}
    </>
  );
}

function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Read localStorage after mount to keep server and client HTML identical.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of browser-only state
    if (analyticsEnabled() && getConsent() === null) setVisible(true);
  }, []);

  if (!visible) return null;

  function choose(value: "granted" | "denied") {
    setConsent(value);
    setVisible(false);
  }

  return (
    <div
      role="region"
      aria-label="Analytics consent"
      className="fixed inset-x-0 bottom-0 z-40 p-4 sm:left-6 sm:bottom-6 sm:right-auto sm:p-0 sm:max-w-sm"
    >
      <div className="rounded-xl border border-line bg-white p-4 shadow-lg">
        <p className="text-sm text-ink leading-snug">
          Can we use Google Analytics cookies to see which pages are useful? Basic,
          anonymous visit counts are kept either way.
        </p>
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => choose("granted")}
            className="flex-1 rounded-lg bg-brand-strong px-3 py-2 text-sm font-semibold text-white hover:brightness-110 cursor-pointer"
          >
            Accept
          </button>
          <button
            onClick={() => choose("denied")}
            className="flex-1 rounded-lg border border-line px-3 py-2 text-sm font-semibold text-ink hover:bg-paper-dim cursor-pointer"
          >
            No thanks
          </button>
        </div>
      </div>
    </div>
  );
}
