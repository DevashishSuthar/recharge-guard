"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { trackCta } from "@/lib/analytics";

type TrackedLinkProps = ComponentProps<typeof Link> & {
  /** Where the link sits, e.g. "hero_get_started". Shows up in analytics. */
  label: string;
};

/**
 * A next/link that records a `cta_click` (Google Analytics + first-party)
 * before navigating. Lets server components like Landing stay server
 * components — only this tiny wrapper ships client JS.
 */
export function TrackedLink({ label, onClick, ...props }: TrackedLinkProps) {
  return (
    <Link
      {...props}
      onClick={(e) => {
        trackCta(label);
        onClick?.(e);
      }}
    />
  );
}
