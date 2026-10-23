import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { trackServerEvent } from "@/lib/analyticsServer";
import { DEFAULT_LEAD_DAYS, MAX_RECHARGES_PER_USER } from "@/lib/constants";
import { badRequest, parseBody, unauthorized } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { createRechargeSchema, LEAD_TOO_LONG_MESSAGE } from "@/lib/schemas";
import { serializeRecharge } from "@/lib/serializers";
import { rupeesToPaise } from "@/lib/utils";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return unauthorized();

  const items = await prisma.rechargeItem.findMany({
    where: { userId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });

  return NextResponse.json(items.map(serializeRecharge));
}

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return unauthorized();
  }

  const body = await parseBody(req, createRechargeSchema);
  if (!body.ok) {
    return body.response;
  }
  const data = body.data;

  let amountInPaise: number;
  try {
    amountInPaise = rupeesToPaise(data.amount);
  } catch (error) {
    return badRequest((error as Error).message);
  }

  const [count, user] = await Promise.all([
    prisma.rechargeItem.count({ where: { userId } }),
    data.leadDays === undefined
      ? prisma.user.findUnique({ where: { id: userId }, select: { defaultLeadDays: true } })
      : null,
  ]);
  if (count >= MAX_RECHARGES_PER_USER) {
    return badRequest(`You can track up to ${MAX_RECHARGES_PER_USER} recharges`);
  }

  const leadDays = data.leadDays ?? user?.defaultLeadDays ?? DEFAULT_LEAD_DAYS;
  if (leadDays >= data.cycleDays) {
    return badRequest(LEAD_TOO_LONG_MESSAGE);
  }

  const item = await prisma.rechargeItem.create({
    data: { ...data, phone: data.phone || null, leadDays, amount: amountInPaise, userId },
  });

  trackServerEvent("recharge_created", userId);

  return NextResponse.json(serializeRecharge(item), { status: 201 });
}
