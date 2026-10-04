"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { X } from "lucide-react";
import { z } from "zod";

import Field from "./Field";
import { addDays } from "@/lib/utils";

const rechargeTypes = ["MOBILE", "BROADBAND", "OTHER"] as const;

const rechargeFormSchema = z
  .object({
    label: z.string().trim().min(1, "Give it a name so you can tell it apart"),
    provider: z.string().trim().min(1, "Provider is required"),
    type: z.enum(rechargeTypes),
    phone: z
      .string()
      .trim()
      .optional()
      .refine((v) => !v || /^[\d\s+()-]{7,15}$/.test(v), {
        message: "That doesn't look like a valid phone number",
      }),
    amount: z.coerce
      .number({ message: "Enter an amount" })
      .positive("Amount must be greater than 0")
      .refine(
        // Floating-point multiplication isn't exact (e.g. 1296.88 * 100 ===
        // 129688.00000000001 in JS), so comparing against the *nearest*
        // integer within a tiny epsilon — rather than requiring an exact
        // integer — is what actually checks "at most two decimal places".
        (value) => Math.abs(Math.round(value * 100) - value * 100) < 1e-6,
        "Use at most two decimal places"
      ),
    cycleDays: z.coerce.number().int().positive("Pick a billing cycle"),
    lastRecharge: z
      .string()
      .min(1, "Last recharge date is required")
      .refine((v) => !Number.isNaN(new Date(v).getTime()), {
        message: "Invalid date",
      }),
    leadDays: z.coerce
      .number()
      .int()
      .min(0, "Can't be negative")
      .max(30, "Keep the reminder window under 30 days"),
  })
  .refine((data) => data.leadDays < data.cycleDays, {
    message: "Reminder days must be fewer than the billing cycle",
    path: ["leadDays"],
  });

export type RechargeFormValues = z.infer<typeof rechargeFormSchema>;
type RechargeFormInput = z.input<typeof rechargeFormSchema>;

const toggleBtn = (active: boolean) =>
  `flex-1 rounded-md py-1.5 px-1 transition-colors cursor-pointer ${active ? "bg-white text-ink shadow-sm" : "text-ink-soft"
  }`;

export function EditModal({
  initialValues,
  isEditing,
  saving,
  onSave,
  onClose,
}: {
  initialValues: RechargeFormValues;
  isEditing: boolean;
  saving: boolean;
  onSave: (data: RechargeFormValues) => void | Promise<void>;
  onClose: () => void;
}) {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<RechargeFormInput, unknown, RechargeFormValues>({
    resolver: zodResolver(rechargeFormSchema),
    defaultValues: initialValues,
    mode: "onBlur",
  });

  // Most people have no idea when they last recharged — but their provider's
  // app/SMS tells them exactly when the current pack expires. So instead of
  // forcing everyone to reconstruct "last recharged on", offer that as an
  // alternative: enter the expiry date and derive lastRecharge from it
  // (expiry - cycleDays), clamped so it never lands in the future.
  const [dateMode, setDateMode] = useState<"last" | "expiry">(isEditing ? "last" : "expiry");
  const [expiryInput, setExpiryInput] = useState<string>(() => {
    if (!initialValues.lastRecharge) return "";
    const d = new Date(initialValues.lastRecharge);
    if (Number.isNaN(d.getTime())) return "";
    return addDays(d, initialValues.cycleDays).toISOString().slice(0, 10);
  });
  const [expiryError, setExpiryError] = useState<string | null>(null);

  const cycleDaysValue = useWatch({ control, name: "cycleDays" });
  const lastRechargeValue = useWatch({ control, name: "lastRecharge" });

  useEffect(() => {
    if (dateMode !== "expiry" || !expiryInput) return;
    const cycleDays = Number(cycleDaysValue);
    if (!cycleDays || Number.isNaN(cycleDays)) return;
    const expiry = new Date(expiryInput);
    if (Number.isNaN(expiry.getTime())) return;

    const computed = addDays(expiry, -cycleDays);

    setValue("lastRecharge", computed.toISOString().slice(0, 10), {
      shouldValidate: true,
      shouldDirty: true,
    });
  }, [dateMode, expiryInput, cycleDaysValue, setValue]);

  const renewsOnLabel = (() => {
    const cycleDays = Number(cycleDaysValue);
    if (!lastRechargeValue || !cycleDays || Number.isNaN(cycleDays)) return null;
    const start = new Date(lastRechargeValue);
    if (Number.isNaN(start.getTime())) return null;
    return addDays(start, cycleDays).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  })();

  const submit = handleSubmit((data) => {
    if (dateMode === "expiry" && !expiryInput) {
      setExpiryError("Enter the pack's expiry date");
      return;
    }
    onSave(data);
  });

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/40 flex items-center justify-center p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recharge-modal-title"
    >
      <div className="w-full max-w-md max-h-[88vh] overflow-y-auto bg-white rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2
            id="recharge-modal-title"
            className="font-display text-xl font-semibold text-ink"
          >
            {isEditing ? "Edit recharge" : "Add a recharge"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="size-7 flex items-center justify-center rounded-md border-none cursor-pointer hover:bg-paper-dim"
          >
            <X size={17} className="text-ink-soft" />
          </button>
        </div>

        <form onSubmit={submit} noValidate>
          <div className="space-y-3">
            <Field
              label="Who's this for"
              htmlFor="label"
              error={errors.label?.message}
            >
              <input
                id="label"
                className="input"
                placeholder="e.g. Papa, Wife, Home"
                {...register("label")}
              />
            </Field>

            <div className="flex flex-col sm:flex-row gap-3">
              <Field
                label="Type"
                htmlFor="type"
                className="sm:flex-1"
              >
                <select
                  id="type"
                  className="input"
                  {...register("type")}
                >
                  <option value="MOBILE">Mobile</option>
                  <option value="BROADBAND">Broadband / Fiber</option>
                  <option value="OTHER">Other</option>
                </select>
              </Field>
              <Field
                label="Provider"
                htmlFor="provider"
                error={errors.provider?.message}
                className="sm:flex-1"
              >
                <input
                  id="provider"
                  className="input"
                  placeholder="Jio, Airtel, Vi..."
                  {...register("provider")}
                />
              </Field>
            </div>

            <Field
              label="Number (optional)"
              htmlFor="phone"
              error={errors.phone?.message}
            >
              <input
                id="phone"
                className="input"
                placeholder="98290 xxxxx"
                {...register("phone")}
              />
            </Field>

            <div className="flex flex-col sm:flex-row gap-3">
              <Field
                label="Amount (₹)"
                htmlFor="amount"
                error={errors.amount?.message}
                className="sm:flex-1"
              >
                <input
                  id="amount"
                  type="number"
                  className="input"
                  step="0.01"
                  {...register("amount")}
                />
              </Field>
              <Field label="Cycle"
                htmlFor="cycleDays"
                className="sm:flex-1"
              >
                <select
                  id="cycleDays"
                  className="input"
                  {...register("cycleDays")}
                >
                  <option value={28}>28 days</option>
                  <option value={30}>30 days</option>
                  <option value={84}>84 days</option>
                  <option value={365}>Yearly</option>
                </select>
              </Field>
            </div>

            <Field label="When did this cycle start">
              <div
                role="group"
                aria-label="How do you want to enter the cycle start"
                className="flex rounded-lg border border-line p-0.5 bg-paper-dim/50 text-[11px] font-semibold">
                <button
                  type="button"
                  aria-pressed={dateMode === "last"}
                  onClick={() => setDateMode("last")}
                  className={toggleBtn(dateMode === "last")}
                >
                  I know the last recharge date
                </button>
                <button
                  type="button"
                  aria-pressed={dateMode === "expiry"}
                  onClick={() => {
                    setDateMode("expiry");
                    setExpiryError(null);
                  }}
                  className={toggleBtn(dateMode === "expiry")}
                >
                  I only know the expiry date
                </button>
              </div>
            </Field>

            <div className="flex flex-col sm:flex-row gap-3">
              {dateMode === "expiry" ? (
                <Field
                  label="Current pack expires on"
                  htmlFor="expiry"
                  error={expiryError ?? undefined}
                  className="sm:flex-1">
                  <input
                    id="expiry"
                    type="date"
                    className="input"
                    value={expiryInput}
                    onChange={(e) => {
                      setExpiryInput(e.target.value);
                      setExpiryError(null);
                    }}
                  />
                </Field>
              ) : (
                <Field
                  label="Last recharged on"
                  htmlFor="lastRecharge"
                  error={errors.lastRecharge?.message}
                  className="sm:flex-1">
                  <input
                    id="lastRecharge"
                    type="date"
                    className="input"
                    {...register("lastRecharge")}
                  />
                </Field>
              )}
              <Field
                label="Remind me (days before)"
                htmlFor="leadDays"
                error={errors.leadDays?.message}
                className="sm:flex-1">
                <input
                  type="number"
                  className="input"
                  {...register("leadDays")}
                />
              </Field>
            </div>

            {renewsOnLabel && (
              <p className="text-xs text-ink-soft -mt-1">
                {dateMode === "expiry" ? "We'll " : "This "}renews on{" "}
                <span className="font-semibold text-ink">{renewsOnLabel}</span>.
              </p>
            )}

          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full mt-5 cursor-pointer border-none bg-brand hover:bg-brand-light transition-colors text-white font-semibold text-sm rounded-lg py-3 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving…" : isEditing ? "Save changes" : "Add recharge"}
          </button>
        </form>

      </div>
    </div>
  );
}