import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { addDays } from "@/lib/utils";
import { trackServerEvent } from "@/lib/analyticsServer";
import { isRecordNotFound, notFound, unauthorized } from "@/lib/http";
import { serializeRecharge } from "@/lib/serializers";

type Params = { params: Promise<{ id: string }> };

/**
 * The "Done" button on the dashboard card. Rolls the cycle forward from the
 * date the user entered: the new cycle starts on the current due date
 * (lastRecharge + cycleDays), so recharging early doesn't lose the days left
 * on the current pack. If the item is already overdue, the new cycle starts
 * today instead (the pack's validity can't have started in the past).
 * Also clears lastNotifiedFor so the cron job notifies again for the new cycle.
 */
export async function POST(_req: NextRequest, { params }: Params) {
  const userId = await getSessionUserId();
  if (!userId) {
    return unauthorized();
  }

  const { id } = await params;
  const existing = await prisma.rechargeItem.findFirst({ where: { id, userId } });
  if (!existing) {
    return notFound();
  }

  const now = new Date();
  const currentDue = addDays(existing.lastRecharge, existing.cycleDays);
  const nextStart = currentDue > now ? currentDue : now;

  try {
    const updated = await prisma.rechargeItem.update({
      where: { id, userId },
      data: { lastRecharge: nextStart, lastNotifiedFor: null },
    });

    trackServerEvent("recharge_marked_done", userId);
    return NextResponse.json(serializeRecharge(updated));
  } catch (err) {
    if (isRecordNotFound(err)) {
      return notFound();
    }
    throw err;
  }
}