import {
  amountOutstanding,
  buildCreditBook,
  daysLate,
  daysUntilDue,
  isSettled,
  type CreditOrder,
} from "./credit";

/**
 * End-of-day performance summary, as a WhatsApp-ready message.
 *
 * Pure: takes orders and a balance, returns text. The manual "Send today's
 * summary" button and any future scheduled job both call this, so moving to a
 * cron is a matter of calling it from a scheduler rather than a click handler.
 */

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function naira(n: number): string {
  return `₦${Math.round(n).toLocaleString()}`;
}

export function composeDailySummary(
  orders: CreditOrder[],
  walletBalance: number | null,
  now: Date = new Date()
): string {
  const today = orders.filter((o) => sameDay(new Date(o.createdAt), now));
  const salesToday = today.reduce((sum, o) => sum + o.price, 0);

  const paidToday = orders.filter((o) => o.paidAt && sameDay(new Date(o.paidAt), now));
  const collectedToday = paidToday.reduce(
    (sum, o) => sum + (o.price - amountOutstanding(o)),
    0
  );

  const newDebts = today.filter((o) => o.isCredit && !isSettled(o));
  const newDebtValue = newDebts.reduce((sum, o) => sum + amountOutstanding(o), 0);

  const book = buildCreditBook(orders, now);
  // Falls due tomorrow, plus anything already overdue — both need chasing.
  const dueTomorrow = book.dueThisWeek.filter((o) => daysUntilDue(o, now) === 1);

  const lines: string[] = [`Tracko — ${now.toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "short" })}`, ""];

  lines.push(
    today.length
      ? `Sales today: ${today.length} order${today.length === 1 ? "" : "s"}, ${naira(salesToday)}`
      : "Sales today: none yet"
  );

  lines.push(
    collectedToday > 0
      ? `Money received: ${naira(collectedToday)}`
      : "Money received: nothing today"
  );

  if (newDebts.length) {
    lines.push(`New credit given: ${newDebts.length} (${naira(newDebtValue)})`);
  }

  lines.push(`Total owed to you: ${naira(book.totalOutstanding)}`);

  if (walletBalance != null) {
    lines.push(`BMONI wallet: ${naira(walletBalance)}`);
  }

  if (book.overdue.length) {
    lines.push("", `Overdue (${book.overdue.length}) — chase first:`);
    for (const order of book.overdue.slice(0, 5)) {
      lines.push(
        `• ${order.customerName} — ${naira(amountOutstanding(order))}, ${daysLate(order, now)} day${daysLate(order, now) === 1 ? "" : "s"} late`
      );
    }
  }

  if (dueTomorrow.length) {
    lines.push("", "Due tomorrow:");
    for (const order of dueTomorrow.slice(0, 5)) {
      lines.push(`• ${order.customerName} — ${naira(amountOutstanding(order))}`);
    }
  }

  if (!book.overdue.length && !dueTomorrow.length && book.totalOutstanding === 0) {
    lines.push("", "Nothing outstanding. Books are clean.");
  }

  return lines.join("\n");
}
