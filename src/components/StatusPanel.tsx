import { Check, Loader2 } from "lucide-react";
import type { DueStatus } from "@/lib/types";

const statusStyles: Record<DueStatus, { text: string; bg: string }> = {
  ok: { text: "text-teal", bg: "bg-teal-soft" },
  soon: { text: "text-amber", bg: "bg-amber-soft" },
  overdue: { text: "text-rose", bg: "bg-rose-soft" },
};

/**
 * The tear-off stub on the right of every card: big "days left" number plus a
 * Done button. Shared by recharge and reminder cards so they stay identical.
 */
export function StatusPanel({
  status,
  daysLeft,
  onDone,
  doneLabel,
  doneDisabled = false,
  doneDisabledLabel,
  doneDisabledTitle,
  marking = false,
  ariaLabel,
}: {
  status: DueStatus;
  daysLeft: number;
  onDone: () => void;
  /** Text on the button while it is usable, e.g. "Done". */
  doneLabel: string;
  doneDisabled?: boolean;
  /** Text on the button once it is disabled, e.g. "Recharged". */
  doneDisabledLabel?: string;
  doneDisabledTitle?: string;
  /** True while the Done request is in flight. */
  marking?: boolean;
  ariaLabel: string;
}) {
  const s = statusStyles[status];
  const disabled = doneDisabled || marking;

  return (
    <div className={`relative w-20 sm:w-24 shrink-0 border-l border-dashed border-line flex flex-col items-center justify-center gap-2 px-2 py-3 rounded-r-xl ${s.bg}`}>
      <VoucherNotch />
      <div className={`font-mono text-xl font-semibold leading-none ${s.text}`}>
        {status === "overdue" ? `+${Math.abs(daysLeft)}` : daysLeft}
      </div>
      <div className={`text-[10px] font-semibold text-center leading-tight ${s.text}`}>
        {status === "overdue" ? "days late" : daysLeft === 1 ? "day left" : "days left"}
      </div>
      <button
        onClick={onDone}
        disabled={disabled}
        aria-label={ariaLabel}
        title={doneDisabled ? doneDisabledTitle : undefined}
        className={`mt-1 flex items-center gap-1 text-[10px] font-semibold rounded-md px-2 py-1 transition-colors ${
          doneDisabled
            ? "bg-paper-dim text-ink-soft cursor-default"
            : marking
              ? "bg-brand-strong text-white cursor-wait opacity-80"
              : "text-white bg-brand-strong hover:brightness-110 cursor-pointer"
        }`}
      >
        {marking ? (
          <Loader2 size={11} className="animate-spin" aria-hidden />
        ) : (
          <Check size={11} aria-hidden />
        )}
        {doneDisabled ? (doneDisabledLabel ?? doneLabel) : doneLabel}
      </button>
    </div>
  );
}

/** The perforated "torn voucher" notch cut into the left edge of the stub. */
function VoucherNotch() {
  return (
    <div className="absolute top-1/2 -translate-y-1/2 -left-2.25 size-4.5 rounded-full bg-paper border border-line" />
  );
}
