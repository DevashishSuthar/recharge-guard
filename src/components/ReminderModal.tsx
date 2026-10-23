"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import Field from "./Field";
import { Modal } from "./Modal";
import { addDays, dateFromIstDay, istDayNumber, toIstDateInput } from "@/lib/utils";
import {
  MAX_LEAD_DAYS,
  QUICK_DUE_DAYS,
  REMINDER_LIMITS,
  REPEAT_OPTIONS,
} from "@/lib/constants";

const reminderFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Give the reminder a title")
      .max(REMINDER_LIMITS.titleMax, `Keep it under ${REMINDER_LIMITS.titleMax} characters`),
    note: z
      .string()
      .trim()
      .max(REMINDER_LIMITS.noteMax, `Keep the note under ${REMINDER_LIMITS.noteMax} characters`)
      .optional(),
    dueDate: z
      .string()
      .min(1, "Pick a due date")
      .refine((v) => !Number.isNaN(new Date(v).getTime()), { message: "Invalid date" }),
    /** 0 = one-time. The page converts that to `null` for the API. */
    repeatDays: z.coerce.number().int().min(0),
    leadDays: z.coerce
      .number()
      .int()
      .min(0, "Can't be negative")
      .max(MAX_LEAD_DAYS, `Keep the reminder window to ${MAX_LEAD_DAYS} days or less`),
  })
  .refine((d) => d.repeatDays === 0 || d.leadDays < d.repeatDays, {
    message: "Reminder days must be fewer than the repeat interval",
    path: ["leadDays"],
  });

export type ReminderFormValues = z.infer<typeof reminderFormSchema>;
type ReminderFormInput = z.input<typeof reminderFormSchema>;

/** "yyyy-mm-dd" for N days from today (IST), used by the quick-pick chips. */
function inDays(n: number) {
  return toIstDateInput(dateFromIstDay(istDayNumber(addDays(new Date(), n))));
}

export function ReminderModal({
  initialValues,
  isEditing,
  saving,
  onSave,
  onClose,
}: {
  initialValues: ReminderFormValues;
  isEditing: boolean;
  saving: boolean;
  onSave: (data: ReminderFormValues) => void | Promise<void>;
  onClose: () => void;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ReminderFormInput, unknown, ReminderFormValues>({
    resolver: zodResolver(reminderFormSchema),
    defaultValues: initialValues,
    mode: "onBlur",
  });

  return (
    <Modal
      title={isEditing ? "Edit reminder" : "Add a reminder"}
      titleId="reminder-modal-title"
      onClose={onClose}
    >
      <form onSubmit={handleSubmit((data) => onSave(data))} noValidate>
        <div className="space-y-3">
          <Field label="What should we remind you about?" htmlFor="reminder-title" error={errors.title?.message}>
            <input
              id="reminder-title"
              className="input"
              placeholder="e.g. Renew car insurance"
              maxLength={REMINDER_LIMITS.titleMax}
              {...register("title")}
            />
          </Field>

          <Field label="Note (optional)" htmlFor="reminder-note" error={errors.note?.message}>
            <textarea
              id="reminder-note"
              className="input min-h-20 resize-y"
              placeholder="Policy number, who to call, anything you'll want to remember…"
              {...register("note")}
            />
          </Field>

          <Field label="Due on" htmlFor="reminder-due" error={errors.dueDate?.message}>
            <input id="reminder-due" type="date" className="input" {...register("dueDate")} />
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="text-xs text-ink-soft self-center mr-0.5">Or in</span>
              {QUICK_DUE_DAYS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() =>
                    setValue("dueDate", inDays(n), { shouldValidate: true, shouldDirty: true })
                  }
                  className="rounded-md border border-line px-2.5 py-1 text-xs font-semibold text-ink hover:bg-paper-dim cursor-pointer"
                >
                  {n} days
                </button>
              ))}
            </div>
          </Field>

          <div className="flex flex-col sm:flex-row gap-3">
            <Field label="Repeat" htmlFor="reminder-repeat" className="sm:flex-1">
              <select id="reminder-repeat" className="input" {...register("repeatDays")}>
                {REPEAT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label="Remind me (days before)"
              htmlFor="reminder-lead"
              error={errors.leadDays?.message}
              className="sm:flex-1"
            >
              <input
                id="reminder-lead"
                type="number"
                min={0}
                max={MAX_LEAD_DAYS}
                className="input"
                {...register("leadDays")}
              />
            </Field>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full mt-5 cursor-pointer border-none bg-brand-strong hover:brightness-110 transition text-white font-semibold text-sm rounded-lg py-3 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving…" : isEditing ? "Save changes" : "Add reminder"}
        </button>
      </form>
    </Modal>
  );
}
