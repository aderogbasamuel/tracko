import { OrderStatus } from "../types/order";

const styles: Record<OrderStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  PAID: "bg-blue-100 text-blue-800",
  DELIVERED: "bg-green-100 text-green-800",
};

export default function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-block text-xs font-medium px-2 py-1 rounded-full ${styles[status]}`}>
      {status}
    </span>
  );
}