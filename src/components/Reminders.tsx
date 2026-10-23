"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { ReminderModal, type ReminderFormValues } from "@/components/ReminderModal";
import { CompletedReminderRow, ReminderCard } from "@/components/ReminderCard";
import { RechargeCardSkeleton } from "@/components/RechargeCardSkeleton";
import { useToast } from "@/components/Toast";
import type { ReminderItem } from "@/lib/types";
import { formatDueDate, todayIstInput, toIstDateInput } from "@/lib/utils";

async function errorMessage(res: Response, fallback: string) {
  try {
    const data = await res.json();
    return typeof data?.error === "string" ? data.error : fallback;
  } catch {
    return fallback;
  }
}

/** The "Reminders" section of the dashboard: simple day-based notes. */
export function Reminders({ defaultLeadDays }: { defaultLeadDays: number }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<ReminderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [initialValues, setInitialValues] = useState<ReminderFormValues | null>(null);
  const [saving, setSaving] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/reminders");
      if (!res.ok) throw new Error(String(res.status));
      setItems(await res.json());
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    load();
  }, [load]);

  const { active, completed } = useMemo(
    () => ({
      active: items
        .filter((i) => !i.completedAt)
        .sort((a, b) => a.daysLeft - b.daysLeft),
      completed: items
        .filter((i) => i.completedAt)
        .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? "")),
    }),
    [items]
  );

  function openAdd() {
    setEditingId(null);
    setInitialValues({
      title: "",
      note: "",
      dueDate: todayIstInput(),
      repeatDays: 0,
      leadDays: defaultLeadDays,
    });
    setModalOpen(true);
  }

  function openEdit(item: ReminderItem) {
    setEditingId(item.id);
    setInitialValues({
      title: item.title,
      note: item.note ?? "",
      dueDate: toIstDateInput(item.dueDate),
      repeatDays: item.repeatDays ?? 0,
      leadDays: item.leadDays,
    });
    setModalOpen(true);
  }

  async function handleSave(data: ReminderFormValues) {
    setSaving(true);
    try {
      const payload = {
        title: data.title,
        // PATCH needs explicit nulls to clear a field.
        note: data.note || null,
        dueDate: data.dueDate,
        repeatDays: data.repeatDays || null,
        leadDays: data.leadDays,
      };
      const res = await fetch(editingId ? `/api/reminders/${editingId}` : "/api/reminders", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setModalOpen(false);
        showToast(editingId ? "Reminder updated." : "Reminder added.");
        await load();
      } else {
        showToast(await errorMessage(res, "Couldn't save that reminder. Try again."), "error");
      }
    } catch {
      showToast("Couldn't reach the server. Check your connection and try again.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDone(item: ReminderItem) {
    setMarkingId(item.id);
    try {
      const res = await fetch(`/api/reminders/${item.id}/done`, { method: "POST" });
      if (res.ok) {
        const updated: ReminderItem = await res.json();
        showToast(
          updated.completedAt
            ? `${item.title} marked as done.`
            : `${item.title} done — next one on ${formatDueDate(updated.dueDate)}.`
        );
      } else {
        showToast(await errorMessage(res, "Couldn't mark that as done. Try again."), "error");
      }
      await load();
    } catch {
      showToast("Couldn't reach the server. Check your connection and try again.", "error");
    } finally {
      setMarkingId(null);
    }
  }

  async function handleDelete(item: ReminderItem) {
    if (!window.confirm(`Delete the reminder "${item.title}"?`)) return;
    try {
      const res = await fetch(`/api/reminders/${item.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      showToast("Reminder deleted.");
      await load();
    } catch {
      showToast("Couldn't delete that reminder. Try again.", "error");
    }
  }

  const overdueCount = active.filter((i) => i.status === "overdue").length;
  const soonCount = active.filter((i) => i.status === "soon").length;

  return (
    <section aria-labelledby="reminders-heading" className="mt-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5">
        <div>
          <h2 id="reminders-heading" className="font-display text-2xl font-semibold text-ink m-0">
            Reminders
          </h2>
          <p className="text-sm text-ink-soft mt-1.5">
            {active.length === 0
              ? "Anything that isn't a recharge — policies, filters, renewals."
              : overdueCount > 0
                ? `${overdueCount} overdue, ${soonCount} due soon`
                : soonCount > 0
                  ? `${soonCount} due soon`
                  : "Nothing due soon"}
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center justify-center gap-1.5 bg-brand-strong hover:brightness-110 transition text-white text-sm font-semibold border-none rounded-lg px-4 py-2.5 cursor-pointer w-full sm:w-auto"
        >
          <Plus size={15} aria-hidden /> Add reminder
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RechargeCardSkeleton />
        </div>
      ) : loadError ? (
        <div className="border border-dashed border-line rounded-xl p-8 text-center text-sm text-ink-soft">
          Couldn&apos;t load your reminders.{" "}
          <button onClick={load} className="font-semibold underline cursor-pointer">
            Try again
          </button>
        </div>
      ) : active.length === 0 ? (
        <div className="border border-dashed border-line rounded-xl p-10 text-center text-ink-soft text-sm">
          No reminders yet. Add one for anything that comes around every so many days.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {active.map((item) => (
            <ReminderCard
              key={item.id}
              item={item}
              marking={markingId === item.id}
              onDone={() => handleDone(item)}
              onEdit={() => openEdit(item)}
              onDelete={() => handleDelete(item)}
            />
          ))}
        </div>
      )}

      {completed.length > 0 && (
        <details className="mt-5">
          <summary className="cursor-pointer text-sm font-semibold text-ink-soft select-none">
            Completed ({completed.length})
          </summary>
          <ul className="mt-3 space-y-2">
            {completed.map((item) => (
              <CompletedReminderRow key={item.id} item={item} onDelete={() => handleDelete(item)} />
            ))}
          </ul>
        </details>
      )}

      {modalOpen && initialValues && (
        <ReminderModal
          initialValues={initialValues}
          isEditing={Boolean(editingId)}
          saving={saving}
          onSave={handleSave}
          onClose={() => setModalOpen(false)}
        />
      )}
    </section>
  );
}
