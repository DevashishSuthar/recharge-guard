import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { trackServerEvent } from "@/lib/analyticsServer";
import { badRequest, parseBody, unauthorized } from "@/lib/http";

const schema = z.object({
  endpoint: z.url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
});

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return unauthorized();
  }

  const body = await parseBody(req, schema);
  if (!body.ok) {
    return badRequest("Invalid subscription payload");
  }

  const { endpoint, keys } = body.data;

  // Upsert on endpoint: the same browser re-subscribing (e.g. after
  // clearing site data) should replace the old row, not duplicate it.
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { userId, p256dh: keys.p256dh, auth: keys.auth },
    create: { userId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
  });

  trackServerEvent("push_enabled", userId);

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return unauthorized();
  }

  const body = await parseBody(req, z.object({ endpoint: z.string().min(1) }));
  if (!body.ok) {
    return body.response;
  }
  await prisma.pushSubscription.deleteMany({ where: { endpoint: body.data.endpoint, userId } });

  return NextResponse.json({ ok: true });
}
