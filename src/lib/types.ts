import type { RechargeType } from "./constants";

export type { RechargeType };
export type DueStatus = "ok" | "soon" | "overdue";

export type RechargeItem = {
  id: string;
  label: string;
  provider: string;
  type: RechargeType;
  phone: string | null;
  amount: number;
  cycleDays: number;
  lastRecharge: string;
  leadDays: number;
  due: string;
  daysLeft: number;
  status: DueStatus;
};

export type FormState = {
  label: string;
  provider: string;
  type: RechargeType;
  phone: string;
  amount: string;
  cycleDays: number;
  lastRecharge: string; // yyyy-mm-dd
  leadDays: number;
};

export type ReminderItem = {
  id: string;
  title: string;
  note: string | null;
  dueDate: string;
  /** null = one-time reminder. */
  repeatDays: number | null;
  leadDays: number;
  completedAt: string | null;
  daysLeft: number;
  status: DueStatus;
};