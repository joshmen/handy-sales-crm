import { Client, Product, User } from "./index";

export interface Order {
  id: string;
  code: string;
  clientId: string;
  client: Client;
  userId: string;
  user: User;
  status:
    | "draft"
    | "pending"
    | "confirmed"
    | "in_progress"
    | "delivered"
    | "cancelled";
  priority: "low" | "normal" | "high" | "urgent";
  orderDate: Date;
  deliveryDate?: Date;
  completedDate?: Date;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  notes?: string;
  address?: string;
  paymentMethod: "cash" | "credit" | "transfer" | "check";
  paymentStatus: "pending" | "partial" | "paid";
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  product: Product;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
  notes?: string;
}

export interface OrderSummary {
  totalOrders: number;
  totalValue: number;
  pendingOrders: number;
  deliveredOrders: number;
  averageOrderValue: number;
}
