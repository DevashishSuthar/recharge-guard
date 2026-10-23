import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Limit = { key: string; limit: number; windowSeconds: number };

/**
 * Fixed-window rate limiter backed by Postgres, so it works across serverless
 * instances (an in-memory counter would reset on every cold start). One atomic
 * upsert per check. Fails OPEN: if the database hiccups, users can still log in.
 */
async function hit({ key, limit, windowSeconds }: Limit): Promise<number | null> {
  const resetAt = new Date(Date.now() + windowSeconds * 1000);
  const rows = await prisma.$queryRaw<{ count: number; resetAt: Date }[]>`
    INSERT INTO "rate_limits" ("key", "count", "resetAt")
    VALUES (${key}, 1, ${resetAt}::timestamp)
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "rate_limits"."resetAt" <= (now() AT TIME ZONE 'UTC')
                     THEN 1 ELSE "rate_limits"."count" + 1 END,
      "resetAt" = CASE WHEN "rate_limits"."resetAt" <= (now() AT TIME ZONE 'UTC')
                       THEN ${resetAt}::timestamp ELSE "rate_limits"."resetAt" END
    RETURNING "count"::int AS "count", "resetAt"`;

  const row = rows[0];
  if (!row || row.count <= limit) return null;
  // Postgres hands back the stored UTC timestamp as a Date.
  const secondsLeft = Math.ceil((new Date(row.resetAt).getTime() - Date.now()) / 1000);
  return Number.isFinite(secondsLeft) ? Math.max(1, secondsLeft) : windowSeconds;
}

/** Returns a ready-to-send 429 response when any limit is exceeded, otherwise null. */
export async function checkRateLimits(limits: Limit[]): Promise<NextResponse | null> {
  for (const l of limits) {
    try {
      const retryAfter = await hit(l);
      if (retryAfter !== null) {
        return NextResponse.json(
          { error: "Too many attempts. Please wait a few minutes and try again." },
          { status: 429, headers: { "Retry-After": String(retryAfter) } }
        );
      }
    } catch (err) {
      console.error("rate limit check failed (allowing request)", err);
    }
  }
  return null;
}
