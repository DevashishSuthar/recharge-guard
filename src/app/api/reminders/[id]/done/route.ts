import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { trackServerEvent } from "@/lib/analyticsServer";
import { isRecordNotFound, notFound, unauthorized } from "@/lib/http";
import { serializeReminder } from "@/lib/serializers";
import { computeReminderDue, dateFromIstDay, istDayNumber } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

/**
 * "Done" on a reminder.
 *  - One-time: stamps `completedAt`; it moves to the Completed list.
 *  - Repeating: pushes the due date forward by `repeatDays`. Like a recharge,
 *    finishing on time keeps the schedule (next = due + repeat); finishing
 *    late restarts from today (next = today + repeat).
 * A repeating reminder can only be marked done once it is inside its lead
 * window (or overdue), so a double-tap can't silently skip a whole cycle.
 */
export async function POST(_req: NextRequest, { params }: Params) {
  const userId = await getSessionUserId();
  if (!userId) {
    return unauthorized();
  }

  const { id } = await params;
  const existing = await prisma.reminder.findFirst({ where: { id, userId } });
  if (!existing) {
    return notFound();
  }
  if (existing.completedAt) {
    return NextResponse.json(serializeReminder(existing)); // idempotent
  }

  let data: { dueDate?: Date; completedAt?: Date; lastNotifiedFor: null };
  if (existing.repeatDays) {
    if (computeReminderDue(existing).status === "ok") {
      return NextResponse.json(
        { error: "Not due yet — you can mark it done once the reminder window starts" },
        { status: 409 }
      );
    }
    const baseDay = Math.max(istDayNumber(existing.dueDate), istDayNumber(new Date()));
    data = { dueDate: dateFromIstDay(baseDay + existing.repeatDays), lastNotifiedFor: null };
  } else {
    data = { completedAt: new Date(), lastNotifiedFor: null };
  }

  try {
    const updated = await prisma.reminder.update({ where: { id, userId }, data });
    trackServerEvent("reminder_marked_done", userId);
    return NextResponse.json(serializeReminder(updated));
  } catch (err) {
    if (isRecordNotFound(err)) {
      return notFound();
    }
    throw err;
  }
}
