import {
  amountOutstanding,
  buildCreditBook,
  daysLate,
  daysUntilDue,
  type CreditOrder,
} from "./credit";

/**
 * Notifications are derived from the credit book, not stored.
 *
 * A trader's real alerts are all facts about time and money that are already in
 * the data — a debt tipping over its due date is not an event anyone writes a
 * row for, it just becomes true. Deriving them means the bell can never show a
 * stale alert for a debt that was settled five minutes ago.
 */

export type NotificationKind = "overdue" | "due_soon" | "payment" | "part_payment";

export interface Notification {
  /** Stable across rebuilds so "read" state can be remembered client-side. */
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  orderId: string;
  /** Drives ordering and the "2h ago" label. */
  at: string;
  severity: "high" | "medium" | "low";
}

const DAY = 86_400_000;

export function buildNotifications(
  orders: CreditOrder[],
  now: Date = new Date()
): Notification[] {
  const book = buildCreditBook(orders, now);
  const items: Notification[] = [];

  // Overdue debts — the thing a trader most needs pushed at them.
  for (const order of book.overdue) {
    const late = daysLate(order, now);
    items.push({
      // Includes the day count so crossing into another day resurfaces it.
      id: `overdue:${order.id}:${late}`,
      kind: "overdue",
      title: `${order.customerName} is ${late} day${late === 1 ? "" : "s"} late`,
      body: `${naira(amountOutstanding(order))} still owed for ${order.item}.`,
      orderId: order.id,
      at: new Date(new Date(order.dueDate!).getTime() + late * DAY).toISOString(),
      severity: late >= 7 ? "high" : "medium",
    });
  }

  // Falling due within two days — early enough to act, late enough to matter.
  for (const order of book.dueThisWeek) {
    const days = daysUntilDue(order, now) ?? 0;
    if (days > 2) continue;
    items.push({
      id: `due:${order.id}:${days}`,
      kind: "due_soon",
      title:
        days === 0
          ? `${order.customerName}'s payment is due today`
          : `${order.customerName} owes you in ${days} day${days === 1 ? "" : "s"}`,
      body: `${naira(amountOutstanding(order))} for ${order.item}.`,
      orderId: order.id,
      at: new Date(now.getTime() - days * 1000).toISOString(),
      severity: days === 0 ? "medium" : "low",
    });
  }

  // Money that landed in the last 48 hours.
  const since = now.getTime() - 2 * DAY;
  for (const order of orders) {
    if (!order.paidAt) continue;
    const paidAt = new Date(order.paidAt);
    if (paidAt.getTime() < since || paidAt.getTime() > now.getTime()) continue;
    items.push({
      id: `paid:${order.id}`,
      kind: "payment",
      title: `${order.customerName} paid ${naira(order.price)}`,
      body: `${order.item} is settled in full.`,
      orderId: order.id,
      at: paidAt.toISOString(),
      severity: "low",
    });
  }

  // Part payments still carrying a balance.
  for (const order of orders) {
    const owing = amountOutstanding(order);
    if (order.amountPaid <= 0 || owing <= 0) continue;
    items.push({
      id: `part:${order.id}:${order.amountPaid}`,
      kind: "part_payment",
      title: `${order.customerName} part-paid ${naira(order.amountPaid)}`,
      body: `${naira(owing)} still outstanding on ${order.item}.`,
      orderId: order.id,
      at: new Date(order.createdAt).toISOString(),
      severity: "low",
    });
  }

  const rank = { high: 0, medium: 1, low: 2 } as const;
  return items
    .sort(
      (a, b) =>
        rank[a.severity] - rank[b.severity] ||
        new Date(b.at).getTime() - new Date(a.at).getTime()
    )
    .slice(0, 20);
}

function naira(n: number): string {
  return `₦${Math.round(n).toLocaleString()}`;
}
