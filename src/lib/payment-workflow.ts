import type { OrderStatus } from "@/lib/order-workflow";

export type PaymentWorkflowOrder = {
  paymentStatus: "INCOMPLETE" | "COMPLETED";
  buyerPaymentMarkedAt: Date | null;
  status: OrderStatus;
};

export function canCancelOrderForPayment(order: PaymentWorkflowOrder) {
  return order.paymentStatus === "INCOMPLETE" && !order.buyerPaymentMarkedAt;
}

export function canBuyerMarkPayment(order: PaymentWorkflowOrder) {
  if (order.paymentStatus !== "INCOMPLETE" || order.buyerPaymentMarkedAt || order.status === "CANCELLED") return false;
  return order.status === "READY" || order.status === "COMPLETED";
}

export function canFarmerConfirmPayment(order: PaymentWorkflowOrder) {
  if (order.paymentStatus !== "INCOMPLETE" || !order.buyerPaymentMarkedAt || order.status === "CANCELLED") return false;
  return order.status === "READY" || order.status === "COMPLETED";
}
