import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { addDays, computeDue, paiseToRupees } from "@/lib/utils";

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
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.rechargeItem.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const now = new Date();
  const currentDue = addDays(existing.lastRecharge, existing.cycleDays);
  const nextStart = currentDue > now ? currentDue : now;

  const updated = await prisma.rechargeItem.update({
    where: { id },
    data: { lastRecharge: nextStart, lastNotifiedFor: null },
  });

  return NextResponse.json({
    ...updated,
    amount: paiseToRupees(updated.amount),
    ...computeDue(updated),
  });
}
