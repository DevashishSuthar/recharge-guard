import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/lib/auth";
import { trackServerEvent } from "@/lib/analyticsServer";
import { MAX_LEAD_DAYS } from "@/lib/constants";
import { parseBody, unauthorized, notFound } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return unauthorized();
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      telegramChatId: true,
      defaultLeadDays: true,
      _count: { select: { pushSubscriptions: true } },
    },
  });

  if (!user) {
    return notFound();
  }

  return NextResponse.json({
    id: user.id,
    email: user.email,
    telegramChatId: user.telegramChatId,
    defaultLeadDays: user.defaultLeadDays,
    pushDeviceCount: user._count.pushSubscriptions,
  });
}

const telegramChatIdSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() || null : value),
  z.union([z.string().regex(/^-?\d+$/, "Enter a valid Telegram chat ID"), z.null()])
);

const patchSchema = z.object({
  telegramChatId: telegramChatIdSchema.optional(),
  defaultLeadDays: z.number().int().min(0).max(MAX_LEAD_DAYS).optional(),
});

export async function PATCH(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return unauthorized();
  }

  const body = await parseBody(req, patchSchema);
  if (!body.ok) {
    return body.response;
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: body.data,
  });

  if (body.data.telegramChatId) trackServerEvent("telegram_connected", userId);

  return NextResponse.json({
    telegramChatId: user.telegramChatId,
    defaultLeadDays: user.defaultLeadDays,
  });
}