export type OrderStatus = "PENDING" | "PAID" | "DELIVERED";

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  item: string;
  price: number;
  status: OrderStatus;
  paymentRef?: string | null;
  createdAt: string;
  paidAt?: string | null;
  deliveredAt?: string | null;
}