/**
 * Single source of truth for option lists that used to be repeated across the
 * edit form, the API validators, the settings page and the card components.
 * Add a new recharge type / cycle / repeat option HERE and every dropdown,
 * zod schema and type picks it up. (The Prisma `RechargeType` enum in
 * schema.prisma must be kept in sync — it needs a migration.)
 */

// Recharge types
export const RECHARGE_TYPES = ["MOBILE", "BROADBAND", "OTHER"] as const;
export type RechargeType = (typeof RECHARGE_TYPES)[number];

export const RECHARGE_TYPE_OPTIONS: ReadonlyArray<{ value: RechargeType; label: string }> = [
  { value: "MOBILE", label: "Mobile" },
  { value: "BROADBAND", label: "Broadband / Fiber" },
  { value: "OTHER", label: "Other" },
];

// Recharge cycle
export const CYCLE_OPTIONS: ReadonlyArray<{ value: number; label: string }> = [
  { value: 28, label: "28 days" },
  { value: 30, label: "30 days" },
  { value: 84, label: "84 days" },
  { value: 365, label: "Yearly" },
];
export const DEFAULT_CYCLE_DAYS = 28;
export const MAX_CYCLE_DAYS = 3650;

// Reminder lead time
export const DEFAULT_LEAD_DAYS = 3;
export const MAX_LEAD_DAYS = 30;
/** Choices offered for the account-wide default in Settings. */
export const LEAD_DAY_OPTIONS = [1, 2, 3, 5, 7] as const;

// Reminders (simple day-based notes)
/** 0 means "one-time" in the form; the API stores that as null. */
export const REPEAT_OPTIONS: ReadonlyArray<{ value: number; label: string }> = [
  { value: 0, label: "Don't repeat" },
  { value: 7, label: "Every week (7 days)" },
  { value: 15, label: "Every 15 days" },
  { value: 30, label: "Every 30 days" },
  { value: 90, label: "Every 3 months (90 days)" },
  { value: 180, label: "Every 6 months (180 days)" },
  { value: 365, label: "Every year" },
];
/** "Due in N days" shortcut chips in the reminder form. */
export const QUICK_DUE_DAYS = [7, 30, 90] as const;

export const REMINDER_LIMITS = { titleMax: 80, noteMax: 500 } as const;
export const MAX_REPEAT_DAYS = 3650;

// Per-account caps (abuse guard)
export const MAX_RECHARGES_PER_USER = 50;
export const MAX_REMINDERS_PER_USER = 100;
