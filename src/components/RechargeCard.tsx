import {
    Check,
    Loader2,
    Pencil,
    Trash2,
    Smartphone,
    Wifi,
} from "lucide-react";
import type {
    DueStatus,
    RechargeItem
} from "@/lib/types";
import { formatRupeeAmount } from "@/lib/utils";

const statusStyles: Record<DueStatus, { text: string; bg: string; label: string }> = {
    ok: { text: "text-teal", bg: "bg-teal-soft", label: "Upcoming" },
    soon: { text: "text-amber", bg: "bg-amber-soft", label: "Due soon" },
    overdue: { text: "text-rose", bg: "bg-rose-soft", label: "Overdue" },
};

/** Same calendar day, regardless of time-of-day. */
function isToday(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
    );
}

export function RechargeCard({
    item,
    onDone,
    onEdit,
    onDelete,
    marking = false
}: {
    item: RechargeItem;
    onDone: () => void;
    onEdit: () => void;
    onDelete: () => void;
        /** True while a "Done" request for this card is in flight. */
        marking?: boolean;
}) {
    const s = statusStyles[item.status];
    const due = new Date(item.due);
    const dueLabel = due.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
    const TypeIcon = item.type === "BROADBAND" ? Wifi : Smartphone;

    // Recharging again the same day it was already marked done is a no-op
    // (the due date can't move any further forward), which used to leave
    // the "Done" button looking unresponsive — nothing on the card visibly
    // changed. Instead of letting that click silently do nothing, the
    // button swaps to a disabled "Recharged" state so it's clear the click
    // already registered and there's nothing further to do today.
    // Done now rolls the cycle forward from the due date, so an early recharge
    // can leave lastRecharge in the future. Block a second Done in that case too,
    // otherwise a double-click would skip an entire cycle.
    const alreadyDoneToday =
        isToday(item.lastRecharge) || new Date(item.lastRecharge) > new Date();

    // const { due, daysLeft, status } = dueInfo(item);

    return (
        <div
            className="relative bg-white border border-line rounded-xl flex overflow-visible shadow-sm"
        >
            <div className="flex-1 p-4 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-paper-dim flex items-center justify-center shrink-0">
                            <TypeIcon size={15} className="text-ink-soft" />
                        </div>
                        <div className="min-w-0">
                            <div className="font-display font-semibold text-[15px] text-ink truncate">
                                {item.label}
                            </div>
                            <div className="text-xs text-ink-soft mt-0.5 truncate">
                                {item.provider}
                                {item.phone ? ` · ${item.phone}` : ""}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-1 shrink-0">
                        <button
                            onClick={onEdit}
                            aria-label="Edit"
                            className="size-6.5 flex items-center justify-center rounded-md border-none cursor-pointer bg-transparent hover:bg-paper-dim"
                        >
                            <Pencil size={13} className="text-ink-soft" />
                        </button>
                        <button
                            onClick={onDelete}
                            aria-label="Delete"
                            className="size-6.5 flex items-center justify-center rounded-md border-none bg-transparent cursor-pointer hover:bg-paper-dim"
                        >
                            <Trash2 size={13} className="text-ink-soft" />
                        </button>
                    </div>
                </div>

                <div className="mt-4 pt-3 border-t border-dashed border-line flex items-end justify-between">
                    <div>
                        <div className="text-[10px] text-ink-soft mb-0.5">Amount</div>
                        <div className="font-mono font-semibold text-lg text-ink">₹{formatRupeeAmount(item.amount)}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-[10px] text-ink-soft mb-0.5">Due</div>
                        <div className="font-mono font-semibold text-sm text-ink">{dueLabel}</div>
                    </div>
                </div>
            </div>

            <div className={`relative w-20 sm:w-24 shrink-0 border-l border-dashed border-line flex flex-col items-center justify-center gap-2 px-2 py-3 rounded-r-xl ${s.bg}`}>
                <VoucherNotch side="left" />
                <div className={`font-mono text-xl font-semibold leading-none ${s.text}`}>
                    {item.status === "overdue" ? `+${Math.abs(item.daysLeft)}` : item.daysLeft}
                </div>
                <div className={`text-[10px] font-semibold text-center leading-tight ${s.text}`}>
                    {item.status === "overdue" ? "days late" : "days left"}
                </div>
                <button
                    onClick={onDone}
                    disabled={alreadyDoneToday || marking}
                    aria-label={alreadyDoneToday ? "Already recharged for this cycle" : "Mark as recharged"}
                    title={alreadyDoneToday ? "Already recharged for the current cycle" : undefined}
                    className={`mt-1 flex items-center gap-1 text-[10px] font-semibold rounded-md px-2 py-1 transition-colors ${alreadyDoneToday
                        ? "bg-paper-dim text-ink-soft cursor-default"
                        : marking
                            ? "bg-brand-light text-white cursor-wait opacity-80"
                            : "text-white bg-brand hover:bg-brand-light cursor-pointer"
                        }`}
                >
                    {marking ? (
                        <Loader2 size={11} className="animate-spin" />
                    ) : (
                        <Check size={11} />
                    )}
                    {alreadyDoneToday ? "Recharged" : "Done"}
                </button>
            </div>
        </div>
    );
}

/**
 * The perforated "torn voucher" notch between the recharge details and the
 * status panel. The Tailwind conversion had dropped the actual left/right
 * offset — the original inline style used a dynamic `[side]: -9` (px) to
 * cut the notch into whichever edge it sat on, but the converted className
 * never set `left`/`right` at all, so the notch just sat wherever the
 * default `absolute` position happened to land instead of appearing to
 * bite into the card's edge. Restored with the equivalent arbitrary-value
 * Tailwind classes.
 */
function VoucherNotch({ side }: { side: "left" | "right" }) {
    return (
        <div 
            className={`absolute top-1/2 -translate-y-1/2 size-4.5 rounded-full bg-paper border border-line ${side === "left" ? "-left-2.25" : "-right-2.25"}`} 
        />
    );
}