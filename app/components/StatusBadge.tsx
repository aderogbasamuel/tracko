import type { DisplayStatus } from "@/lib/credit";

const styles: Record<DisplayStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  CREDIT: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300",
  PARTIALLY_PAID: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  PAID: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  DELIVERED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  OVERDUE: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};

const labels: Record<DisplayStatus, string> = {
  PENDING: "Pending",
  CREDIT: "On credit",
  PARTIALLY_PAID: "Part paid",
  PAID: "Paid",
  DELIVERED: "Delivered",
  OVERDUE: "Overdue",
};

export default function StatusBadge({
  status,
  daysLate,
}: {
  status: DisplayStatus;
  daysLate?: number;
}) {
  return (
    <span
      className={`inline-block text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ${styles[status]}`}
    >
      {labels[status]}
      {status === "OVERDUE" && daysLate ? ` · ${daysLate}d` : ""}
    </span>
  );
}
