// The credit book. Pure functions, no IO — every number the dashboard, the AI
// prompts and the WhatsApp summary quote comes from here, so there is exactly
// one definition of "outstanding" and "late" in the codebase.

export type OrderStatus =
  | "PENDING" // cash sale, payment not received yet
  | "CREDIT" // sold on credit, still within terms
  | "PARTIALLY_PAID" // part payment received, balance still owed
  | "PAID" // settled in full, not yet handed over
  | "DELIVERED"; // settled and handed over

// OVERDUE is never stored — a debt becomes overdue by the clock moving, not by
// anyone writing a row, so storing it would go stale the moment nobody looks.
export type DisplayStatus = OrderStatus | "OVERDUE";

export interface CreditOrder {
  id: string;
  customerName: string;
  customerPhone: string;
  item: string;
  price: number;
  status: OrderStatus;
  isCredit: boolean;
  dueDate?: string | Date | null;
  amountPaid: number;
  createdAt: string | Date;
  paidAt?: string | Date | null;
  deliveredAt?: string | Date | null;
}

const MS_PER_DAY = 86_400_000;

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Naira amounts are whole-ish; round to kobo so float dust never shows in the UI. */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** price - amountPaid, never negative (an overpayment is not a debt to the customer). */
export function amountOutstanding(order: CreditOrder): number {
  return round2(Math.max(0, order.price - (order.amountPaid ?? 0)));
}

/**
 * The single source of truth for "has this order been paid for?".
 * Replaces the old `status !== "PENDING"` check, which counted DELIVERED — and
 * every status added after it — as paid.
 */
export function isSettled(order: CreditOrder): boolean {
  return amountOutstanding(order) === 0;
}

/** Whole days past the due date. 0 when settled, undated, or not yet due. */
export function daysLate(order: CreditOrder, now: Date = new Date()): number {
  const due = toDate(order.dueDate);
  if (!due || isSettled(order)) return 0;
  const diff = now.getTime() - due.getTime();
  return diff <= 0 ? 0 : Math.floor(diff / MS_PER_DAY);
}

export function isOverdue(order: CreditOrder, now: Date = new Date()): boolean {
  return daysLate(order, now) > 0;
}

/** Days until the debt falls due. Negative once it is late; null when undated. */
export function daysUntilDue(order: CreditOrder, now: Date = new Date()): number | null {
  const due = toDate(order.dueDate);
  if (!due) return null;
  return Math.ceil((due.getTime() - now.getTime()) / MS_PER_DAY);
}

/** What the badge should say right now, given the clock. */
export function displayStatus(order: CreditOrder, now: Date = new Date()): DisplayStatus {
  if (isOverdue(order, now)) return "OVERDUE";
  return order.status;
}

// ---------------------------------------------------------------------------
// Transitions
// ---------------------------------------------------------------------------

/** A credit sale starts as a debt; a cash sale starts as awaiting payment. */
export function initialStatus(isCredit: boolean): OrderStatus {
  return isCredit ? "CREDIT" : "PENDING";
}

/**
 * Where an order lands once `totalPaid` has been received against it.
 * DELIVERED is terminal — money arriving late on a handed-over order must not
 * walk the status backwards.
 */
export function statusAfterPayment(
  order: Pick<CreditOrder, "price" | "status">,
  totalPaid: number
): OrderStatus {
  if (order.status === "DELIVERED") return "DELIVERED";
  if (totalPaid >= order.price) return "PAID";
  if (totalPaid > 0) return "PARTIALLY_PAID";
  return order.status;
}

// ---------------------------------------------------------------------------
// Aggregates
// ---------------------------------------------------------------------------

export interface CustomerCredit {
  customerName: string;
  customerPhone: string;
  ordersTotal: number;
  timesTookCredit: number;
  timesPaidLate: number;
  timesCurrentlyOverdue: number;
  outstanding: number;
  worstDaysLate: number;
  averageDaysLate: number;
  /** Late on at least half of their settled credit, with 2+ instances to judge on. */
  isRisky: boolean;
}

/**
 * A credit order counts as "paid late" once settled if it cleared after its due
 * date. Orders still outstanding past their date count separately as currently
 * overdue — a customer who is late right now has not yet earned a paid-late mark.
 */
function paidLate(order: CreditOrder): boolean {
  const due = toDate(order.dueDate);
  const paid = toDate(order.paidAt);
  if (!due || !paid || !isSettled(order)) return false;
  return paid.getTime() > due.getTime();
}

function lateBy(order: CreditOrder): number {
  const due = toDate(order.dueDate);
  const paid = toDate(order.paidAt);
  if (!due || !paid) return 0;
  return Math.max(0, Math.floor((paid.getTime() - due.getTime()) / MS_PER_DAY));
}

export function customerCreditHistory(
  orders: CreditOrder[],
  now: Date = new Date()
): CustomerCredit[] {
  const byCustomer = new Map<string, CreditOrder[]>();
  for (const order of orders) {
    const key = order.customerName.trim().toLowerCase();
    const bucket = byCustomer.get(key);
    if (bucket) bucket.push(order);
    else byCustomer.set(key, [order]);
  }

  const history: CustomerCredit[] = [];

  for (const group of byCustomer.values()) {
    const credit = group.filter((o) => o.isCredit);
    const late = credit.filter(paidLate);
    const settledCredit = credit.filter(isSettled);
    const currentlyOverdue = credit.filter((o) => isOverdue(o, now));
    const lateDays = late.map(lateBy);

    history.push({
      customerName: group[0].customerName,
      customerPhone: group[0].customerPhone,
      ordersTotal: group.length,
      timesTookCredit: credit.length,
      timesPaidLate: late.length,
      timesCurrentlyOverdue: currentlyOverdue.length,
      outstanding: round2(group.reduce((sum, o) => sum + amountOutstanding(o), 0)),
      worstDaysLate: Math.max(0, ...lateDays, ...currentlyOverdue.map((o) => daysLate(o, now))),
      averageDaysLate: lateDays.length
        ? Math.round(lateDays.reduce((a, b) => a + b, 0) / lateDays.length)
        : 0,
      // Judging someone on a single late payment is how you lose a customer.
      isRisky:
        settledCredit.length + currentlyOverdue.length >= 2 &&
        late.length + currentlyOverdue.length >= 2 &&
        (late.length + currentlyOverdue.length) / Math.max(1, credit.length) >= 0.5,
    });
  }

  return history.sort((a, b) => b.outstanding - a.outstanding);
}

export interface CreditBook {
  totalOutstanding: number;
  /** Unsettled and past due, worst offender first. */
  overdue: CreditOrder[];
  /** Unsettled, not yet due, falling due within the next 7 days. */
  dueThisWeek: CreditOrder[];
  /** Owed to the trader over the coming 7 days — the cash-flow-gap numerator. */
  expectedThisWeek: number;
  customers: CustomerCredit[];
}

export function buildCreditBook(orders: CreditOrder[], now: Date = new Date()): CreditBook {
  const unsettled = orders.filter((o) => !isSettled(o));

  const overdue = unsettled
    .filter((o) => isOverdue(o, now))
    .sort((a, b) => daysLate(b, now) - daysLate(a, now));

  const dueThisWeek = unsettled
    .filter((o) => {
      const days = daysUntilDue(o, now);
      return days !== null && days >= 0 && days <= 7;
    })
    .sort((a, b) => (daysUntilDue(a, now) ?? 0) - (daysUntilDue(b, now) ?? 0));

  return {
    totalOutstanding: round2(unsettled.reduce((sum, o) => sum + amountOutstanding(o), 0)),
    overdue,
    dueThisWeek,
    // Overdue money is money you should already have, so it counts toward the week.
    expectedThisWeek: round2(
      [...overdue, ...dueThisWeek].reduce((sum, o) => sum + amountOutstanding(o), 0)
    ),
    customers: customerCreditHistory(orders, now),
  };
}
