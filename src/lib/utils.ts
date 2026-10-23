import type { DueStatus } from "./types";

/**
 * All "which day is it" maths is done in India Standard Time, not in whatever
 * timezone the server happens to run in (UTC on Vercel). Without this, between
 * 00:00 and 05:30 IST a server in UTC still thinks it is "yesterday" and every
 * "days left" counter is off by one.
 */
export const IST_TIME_ZONE = "Asia/Kolkata";
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 86_400_000;

/** Whole-day arithmetic on absolute timestamps (India has no DST, so this is exact). */
export function addDays(date: Date, n: number) {
  return new Date(date.getTime() + n * DAY_MS);
}

/** Days since the epoch of the IST calendar day that `d` falls on. */
export function istDayNumber(d: Date | string | number): number {
  return Math.floor((new Date(d).getTime() + IST_OFFSET_MS) / DAY_MS);
}

/** Inverse of istDayNumber — a timestamp that lies inside that IST day. */
export function dateFromIstDay(n: number): Date {
  return new Date(n * DAY_MS);
}

/** "yyyy-mm-dd" for the IST calendar day of `d` (for <input type="date">). */
export function toIstDateInput(d: Date | string): string {
  return dateFromIstDay(istDayNumber(d)).toISOString().slice(0, 10);
}

export function todayIstInput(): string {
  return toIstDateInput(new Date());
}

/** "04 Oct" (or "04 Oct 2026") in IST, regardless of the viewer's timezone. */
export function formatDueDate(d: Date | string, withYear = false): string {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
    timeZone: IST_TIME_ZONE,
  });
}

export function statusFor(daysLeft: number, leadDays: number): DueStatus {
  if (daysLeft < 0) return "overdue";
  if (daysLeft <= leadDays) return "soon";
  return "ok";
}

export function computeDue(item: {
  lastRecharge: Date;
  cycleDays: number;
  leadDays: number;
}) {
  const due = addDays(item.lastRecharge, item.cycleDays);
  const daysLeft = istDayNumber(due) - istDayNumber(new Date());
  return { due, daysLeft, status: statusFor(daysLeft, item.leadDays) };
}

export function computeReminderDue(item: { dueDate: Date; leadDays: number }) {
  const daysLeft = istDayNumber(item.dueDate) - istDayNumber(new Date());
  return { daysLeft, status: statusFor(daysLeft, item.leadDays) };
}

export function rupeesToPaise(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Amount must be a positive number with at most two decimal places");
  }

  const match = String(amount).match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) {
    throw new Error("Amount must have at most two decimal places");
  }

  const wholeRupees = Number(match[1]);
  const paise = Number((match[2] ?? "").padEnd(2, "0"));
  const amountInPaise = wholeRupees * 100 + paise;
  if (!Number.isSafeInteger(amountInPaise)) {
    throw new Error("Amount is too large");
  }

  return amountInPaise;
}

export function paiseToRupees(amount: number): number {
  return amount / 100;
}

export function formatRupees(amountInPaise: number): string {
  return paiseToRupees(amountInPaise).toFixed(2).replace(/\.00$/, "");
}

export function formatRupeeAmount(amount: number): string {
  return amount.toFixed(2).replace(/\.00$/, "");
}