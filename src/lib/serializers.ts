import type { RechargeItem, Reminder } from "@prisma/client";
import { computeDue, computeReminderDue, paiseToRupees } from "@/lib/utils";

/**
 * Shape sent to the browser. The due/status maths lives on the server so the
 * client never duplicates it (and is always in IST — see utils.ts).
 */
export function serializeRecharge(item: RechargeItem) {
  const { lastNotifiedFor: _lastNotifiedFor, ...rest } = item;
  void _lastNotifiedFor;
  return { ...rest, amount: paiseToRupees(item.amount), ...computeDue(item) };
}

export function serializeReminder(item: Reminder) {
  const { lastNotifiedFor: _lastNotifiedFor, userId: _userId, ...rest } = item;
  void _lastNotifiedFor;
  void _userId;
  return { ...rest, ...computeReminderDue(item) };
}
