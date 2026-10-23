import { CalendarCheck, Pencil, Repeat, StickyNote, Trash2 } from "lucide-react";
import type { ReminderItem } from "@/lib/types";
import { formatDueDate } from "@/lib/utils";
import { StatusPanel } from "@/components/StatusPanel";

export function ReminderCard({
  item,
  onDone,
  onEdit,
  onDelete,
  marking = false,
}: {
  item: ReminderItem;
  onDone: () => void;
  onEdit: () => void;
  onDelete: () => void;
  marking?: boolean;
}) {
  // Same rule as the server: a repeating reminder can only be completed once
  // its window has started, so a double-tap can't skip a whole cycle.
  const notDueYet = item.repeatDays !== null && item.status === "ok";

  return (
    <div className="relative bg-white border border-line rounded-xl flex overflow-visible shadow-sm">
      <div className="flex-1 p-4 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-paper-dim flex items-center justify-center shrink-0">
              <StickyNote size={15} className="text-ink-soft" aria-hidden />
            </div>
            <div className="min-w-0">
              <div className="font-display font-semibold text-[15px] text-ink wrap-break-word">
                {item.title}
              </div>
              <div className="text-xs text-ink-soft mt-0.5 flex items-center gap-1">
                <Repeat size={11} aria-hidden />
                {item.repeatDays ? `Every ${item.repeatDays} days` : "One-time"}
              </div>
            </div>
          </div>

          <div className="flex gap-1 shrink-0">
            <button
              onClick={onEdit}
              aria-label={`Edit ${item.title}`}
              className="size-6.5 flex items-center justify-center rounded-md border-none cursor-pointer bg-transparent hover:bg-paper-dim"
            >
              <Pencil size={13} className="text-ink-soft" aria-hidden />
            </button>
            <button
              onClick={onDelete}
              aria-label={`Delete ${item.title}`}
              className="size-6.5 flex items-center justify-center rounded-md border-none bg-transparent cursor-pointer hover:bg-paper-dim"
            >
              <Trash2 size={13} className="text-ink-soft" aria-hidden />
            </button>
          </div>
        </div>

        {item.note && (
          <p className="mt-3 text-sm text-ink-soft leading-snug line-clamp-3 whitespace-pre-line">
            {item.note}
          </p>
        )}

        <div className="mt-4 pt-3 border-t border-dashed border-line flex items-end justify-between">
          <div className="text-[10px] text-ink-soft">
            Reminds {item.leadDays} {item.leadDays === 1 ? "day" : "days"} before
          </div>
          <div className="text-right">
            <div className="text-[10px] text-ink-soft mb-0.5">Due</div>
            <div className="font-mono font-semibold text-sm text-ink">{formatDueDate(item.dueDate)}</div>
          </div>
        </div>
      </div>

      <StatusPanel
        status={item.status}
        daysLeft={item.daysLeft}
        onDone={onDone}
        marking={marking}
        doneLabel="Done"
        doneDisabled={notDueYet}
        doneDisabledLabel="Not due"
        doneDisabledTitle="You can mark this done once the reminder window starts"
        ariaLabel={notDueYet ? "Not due yet" : `Mark ${item.title} as done`}
      />
    </div>
  );
}

/** A finished one-time reminder, shown muted in the "Completed" list. */
export function CompletedReminderRow({
  item,
  onDelete,
}: {
  item: ReminderItem;
  onDelete: () => void;
}) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-line bg-white/60 px-4 py-2.5 text-sm">
      <span className="flex items-center gap-2 min-w-0 text-ink-soft">
        <CalendarCheck size={14} className="shrink-0" aria-hidden />
        <span className="truncate line-through">{item.title}</span>
      </span>
      <span className="flex items-center gap-3 shrink-0">
        <span className="font-mono text-xs text-ink-soft">
          {item.completedAt ? formatDueDate(item.completedAt) : ""}
        </span>
        <button
          onClick={onDelete}
          aria-label={`Delete ${item.title}`}
          className="size-6.5 flex items-center justify-center rounded-md border-none bg-transparent cursor-pointer hover:bg-paper-dim"
        >
          <Trash2 size={13} className="text-ink-soft" aria-hidden />
        </button>
      </span>
    </li>
  );
}
