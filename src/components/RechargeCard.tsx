import {
    CircleDollarSign,
    Pencil,
    Smartphone,
    Trash2,
    Wifi,
    type LucideIcon
} from "lucide-react";
import { StatusPanel } from "@/components/StatusPanel";
import type {
    RechargeItem,
    RechargeType
} from "@/lib/types";
import { formatDueDate, formatRupeeAmount, istDayNumber } from "@/lib/utils";

const TYPE_ICONS: Record<RechargeType, LucideIcon> = {
    MOBILE: Smartphone,
    BROADBAND: Wifi,
    OTHER: CircleDollarSign,
};

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
    const TypeIcon = TYPE_ICONS[item.type];

    // "Done" rolls the cycle forward from the due date, so an early recharge can
    // leave lastRecharge in the future, and a same-day tap can't move the date any
    // further. Block a second Done in both cases — otherwise a double-click would
    // skip an entire cycle. Compared as IST calendar days, like the server does.
    const alreadyDone = istDayNumber(item.lastRecharge) >= istDayNumber(new Date());

    return (
        <div className="relative bg-white border border-line rounded-xl flex overflow-visible shadow-sm">
            <div className="flex-1 p-4 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-paper-dim flex items-center justify-center shrink-0">
                            <TypeIcon size={15} className="text-ink-soft" aria-hidden />
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
                            aria-label={`Edit ${item.label}`}
                            className="size-6.5 flex items-center justify-center rounded-md border-none cursor-pointer bg-transparent hover:bg-paper-dim"
                        >
                            <Pencil size={13} className="text-ink-soft" aria-hidden />
                        </button>
                        <button
                            onClick={onDelete}
                            aria-label={`Delete ${item.label}`}
                            className="size-6.5 flex items-center justify-center rounded-md border-none bg-transparent cursor-pointer hover:bg-paper-dim"
                        >
                            <Trash2 size={13} className="text-ink-soft" aria-hidden />
                        </button>
                    </div>
                </div>

                <div className="mt-4 pt-3 border-t border-dashed border-line flex items-end justify-between">
                    <div>
                        <div className="text-[10px] text-ink-soft mb-0.5">Amount</div>
                        <div className="font-mono font-semibold text-lg text-ink">
                            ₹{formatRupeeAmount(item.amount)}
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-[10px] text-ink-soft mb-0.5">Due</div>
                        <div className="font-mono font-semibold text-sm text-ink">
                            {formatDueDate(item.due)}
                        </div>
                    </div>
                </div>
            </div>

            <StatusPanel
                status={item.status}
                daysLeft={item.daysLeft}
                onDone={onDone}
                marking={marking}
                doneLabel="Done"
                doneDisabled={alreadyDone}
                doneDisabledLabel="Recharged"
                doneDisabledTitle="Already recharged for the current cycle"
                ariaLabel={alreadyDone ? "Already recharged for this cycle" : `Mark ${item.label} as recharged`}
            />
        </div>
    );
}