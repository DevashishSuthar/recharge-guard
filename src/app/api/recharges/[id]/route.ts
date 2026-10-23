import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { rupeesToPaise } from "@/lib/utils";
import { badRequest, isRecordNotFound, notFound, parseBody, unauthorized } from "@/lib/http";
import { LEAD_TOO_LONG_MESSAGE, patchRechargeSchema } from "@/lib/schemas";
import { serializeRecharge } from "@/lib/serializers";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  const body = await parseBody(req, patchRechargeSchema);
  if (!body.ok) return body.response;
  const data = body.data;

  let amountInPaise: number | undefined;
  if (data.amount !== undefined) {
    try {
      amountInPaise = rupeesToPaise(data.amount);
    } catch (error) {
      return badRequest((error as Error).message);
    }
  }

  // The lead-time rule needs the final values, so fill gaps from the stored row.
  if (data.leadDays !== undefined || data.cycleDays !== undefined) {
    const existing = await prisma.rechargeItem.findFirst({
      where: { id, userId },
      select: { leadDays: true, cycleDays: true },
    });
    if (!existing) return notFound();
    const leadDays = data.leadDays ?? existing.leadDays;
    const cycleDays = data.cycleDays ?? existing.cycleDays;
    if (leadDays >= cycleDays) return badRequest(LEAD_TOO_LONG_MESSAGE);
  }

  try {
  // `{ id, userId }` makes ownership part of the single UPDATE — no separate lookup.
    const updated = await prisma.rechargeItem.update({
      where: { id, userId },
      data: {
        ...data,
        ...(data.phone === undefined ? {} : { phone: data.phone || null }),
        ...(amountInPaise === undefined ? {} : { amount: amountInPaise }),
      },
    });
    return NextResponse.json(serializeRecharge(updated));
  } catch (err) {
    if (isRecordNotFound(err)) return notFound();
    throw err;
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  const { count } = await prisma.rechargeItem.deleteMany({ where: { id, userId } });
  if (count === 0) return notFound();

  return NextResponse.json({ ok: true });
}
