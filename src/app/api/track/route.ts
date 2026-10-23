import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { deviceFromUserAgent, isBot, visitorHash } from "@/lib/analyticsServer";
import { getClientIp } from "@/lib/http";

const bodySchema = z.object({
  name: z.enum(["page_view", "cta_click"]),
  path: z.string().startsWith("/").max(200),
  label: z.string().max(60).optional(),
  referrer: z.string().max(500).optional(),
  utmSource: z.string().max(80).optional(),
  utmMedium: z.string().max(80).optional(),
  utmCampaign: z.string().max(120).optional(),
});

const noContent = () => new Response(null, { status: 204 });

/**
 * Receives page views / CTA clicks from the browser (sendBeacon). Always
 * answers 204 — a tracking failure should never surface to the visitor.
 */
export async function POST(req: NextRequest) {
  const userAgent = req.headers.get("user-agent");
  if (isBot(userAgent)) return noContent();

  // Cheap abuse guard: only accept beacons sent from our own pages.
  const host = req.headers.get("host");
  const origin = req.headers.get("origin");
  try {
    if (origin && new URL(origin).host !== host) return noContent();
  } catch {
    return noContent();
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return noContent();
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return noContent();
  const d = parsed.data;

  // Don't count the analytics page itself or API paths.
  if (d.path.startsWith("/admin") || d.path.startsWith("/api")) return noContent();

  // Keep only the referring *hostname*, and drop self-referrals.
  let referrer: string | null = null;
  if (d.referrer) {
    try {
      const refHost = new URL(d.referrer).host;
      if (refHost && refHost !== host) referrer = refHost.replace(/^www\./, "");
    } catch {
      /* malformed referrer — ignore */
    }
  }

  const ip = getClientIp(req);
  const userId = await getSessionUserId();

  try {
    await prisma.analyticsEvent.create({
      data: {
        name: d.name,
        path: d.path,
        label: d.label ?? null,
        visitorId: visitorHash(ip, userAgent ?? ""),
        userId,
        referrer,
        utmSource: d.utmSource ?? null,
        utmMedium: d.utmMedium ?? null,
        utmCampaign: d.utmCampaign ?? null,
        country: req.headers.get("x-vercel-ip-country"),
        device: deviceFromUserAgent(userAgent ?? ""),
      },
    });
  } catch (err) {
    console.error("analytics: failed to record beacon", err);
  }

  return noContent();
}
