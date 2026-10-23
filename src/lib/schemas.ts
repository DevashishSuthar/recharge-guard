import { z } from "zod";
import {
  MAX_CYCLE_DAYS,
  MAX_LEAD_DAYS,
  MAX_REPEAT_DAYS,
  RECHARGE_TYPES,
  REMINDER_LIMITS,
} from "@/lib/constants";

/** Request-body validators shared by the collection and item API routes. */

// Recharges
const rechargeFields = {
  label: z.string().trim().min(1).max(60),
  provider: z.string().trim().min(1).max(40),
  type: z.enum(RECHARGE_TYPES),
  phone: z.string().trim().max(20).nullable(),
  amount: z.number().positive(),
  cycleDays: z.number().int().positive().max(MAX_CYCLE_DAYS),
  lastRecharge: z.coerce.date(),
  leadDays: z.number().int().min(0).max(MAX_LEAD_DAYS),
};

export const createRechargeSchema = z.object({
  ...rechargeFields,
  type: rechargeFields.type.default("MOBILE"),
  phone: rechargeFields.phone.optional(),
  // Omitted → the account's default lead time is used (resolved in the route).
  leadDays: rechargeFields.leadDays.optional(),
});

export const patchRechargeSchema = z.object(rechargeFields).partial();

// Reminders
const reminderFields = {
  title: z.string().trim().min(1, "Give the reminder a title").max(REMINDER_LIMITS.titleMax),
  note: z.string().trim().max(REMINDER_LIMITS.noteMax).nullable(),
  dueDate: z.coerce.date(),
  repeatDays: z.number().int().positive().max(MAX_REPEAT_DAYS).nullable(),
  leadDays: z.number().int().min(0).max(MAX_LEAD_DAYS),
};

export const createReminderSchema = z.object({
  ...reminderFields,
  note: reminderFields.note.optional(),
  repeatDays: reminderFields.repeatDays.optional(),
  leadDays: reminderFields.leadDays.optional(),
});

export const patchReminderSchema = z.object(reminderFields).partial();

/** Lead time must be shorter than the cycle, otherwise it would nag forever. */
export const LEAD_TOO_LONG_MESSAGE = "Reminder days must be fewer than the cycle length";
