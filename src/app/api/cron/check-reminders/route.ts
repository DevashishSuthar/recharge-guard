import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeDue } from "@/lib/utils";
import { sendPushToSubscription, sendTelegramMessage, StaleSubscriptionError } from "@/lib/notify";
import { formatRupees } from "@/lib/utils";

/**
 * Runs once a day (see vercel.json). For every recharge that's due soon or
 * overdue, notify via every channel the user has configured:
 *   - always try push (one send per registered device)
 *   - also try Telegram if the user connected a chat ID
 * `lastNotifiedFor` makes this idempotent: once we've notified for a given
 * due date, we don't notify again until the item is recharged (which clears
 * it) or the due date itself changes.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await prisma.rechargeItem.findMany({
    include: {
      user: { include: { pushSubscriptions: true } },
    },
  });

  let notified = 0;
  let skipped = 0;

  for (const item of items) {
    const { due, status } = computeDue(item);
    if (status === "ok") {
      skipped++;
      continue;
    }

    const alreadyNotifiedForThisDue =
      item.lastNotifiedFor && item.lastNotifiedFor.getTime() === due.getTime();
    if (alreadyNotifiedForThisDue) {
      skipped++;
      continue;
    }

    const dueLabel = due.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
    const message =
      status === "overdue"
        ? `⚠️ ${item.label}'s ${item.provider} recharge was due ${dueLabel} — it's overdue.`
        : `⏰ ${item.label}'s ${item.provider} recharge (₹${formatRupees(item.amount)}) is due ${dueLabel}.`;

    // Push: send to every device this user has registered, dropping stale ones.
    for (const sub of item.user.pushSubscriptions) {
      try {
        await sendPushToSubscription(sub, { title: "Recharge Guard", body: message });
      } catch (err) {
        if (err instanceof StaleSubscriptionError) {
          await prisma.pushSubscription.delete({ where: { endpoint: err.endpoint } });
        } else {
          console.error(`Push failed for user ${item.userId}`, err);
        }
      }
    }

    // Telegram: only if the user connected it. Independent of push — one
    // channel failing (or being absent) never blocks the other.
    if (item.user.telegramChatId) {
      try {
        await sendTelegramMessage(item.user.telegramChatId, message);
      } catch (err) {
        console.error(`Telegram failed for user ${item.userId}`, err);
      }
    }

    await prisma.rechargeItem.update({
      where: { id: item.id },
      data: { lastNotifiedFor: due },
    });
    notified++;
  }

  return NextResponse.json({ checked: items.length, notified, skipped });
}
