interface OrderLike {
  id: string;
  customerName: string;
  item: string;
  price: number;
  createdAt: string | Date;
}

export interface Anomaly {
  type: "PRICE_OUTLIER" | "DUPLICATE_ORDER" | "RAPID_ORDERS";
  order: OrderLike;
  detail: string;
}

// Flags orders priced way above the trader's typical order,
// and customers placing near-duplicate orders in a short window.
export function detectAnomalies(orders: OrderLike[]): Anomaly[] {
  if (orders.length < 3) return []; // not enough history to judge "unusual"

  const anomalies: Anomaly[] = [];
  const avgPrice = orders.reduce((sum, o) => sum + o.price, 0) / orders.length;
  const threshold = avgPrice * 2.5;

  for (const order of orders) {
    if (order.price > threshold) {
      anomalies.push({
        type: "PRICE_OUTLIER",
        order,
        detail: `₦${order.price.toLocaleString()} is well above the usual ₦${Math.round(avgPrice).toLocaleString()} order.`,
      });
    }
  }

  // Duplicate/rapid orders: same customer + item within 10 minutes
  const sorted = [...orders].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const minutesApart =
      (new Date(curr.createdAt).getTime() - new Date(prev.createdAt).getTime()) / 60000;

    if (
      prev.customerName === curr.customerName &&
      prev.item === curr.item &&
      minutesApart < 10
    ) {
      anomalies.push({
        type: "DUPLICATE_ORDER",
        order: curr,
        detail: `Same customer ordered "${curr.item}" twice within ${Math.round(minutesApart)} minutes — could be a duplicate entry.`,
      });
    }
  }

  return anomalies;
}