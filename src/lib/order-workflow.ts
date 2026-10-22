export type OrderStatus = "PLACED" | "ACCEPTED" | "READY" | "COMPLETED" | "CANCELLED";

type OrderToTransition = {
  id: string;
  listingId: string;
  quantity: number;
  status: OrderStatus;
};

type InventoryOperations = {
  releaseStock: (listingId: string, quantity: number) => Promise<void>;
  updateStatus: (orderId: string, from: OrderStatus, to: OrderStatus) => Promise<boolean>;
};

export class OrderTransitionError extends Error {
  constructor(readonly reason: "INVALID_TRANSITION" | "INSUFFICIENT_STOCK" | "CONCURRENT_UPDATE") {
    super(reason);
    this.name = "OrderTransitionError";
  }
}

const transitions: Record<OrderStatus, OrderStatus[]> = {
  PLACED: ["ACCEPTED", "CANCELLED"],
  ACCEPTED: ["READY", "CANCELLED"],
  READY: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransitionOrder(from: OrderStatus, to: OrderStatus) {
  return transitions[from].includes(to);
}

export async function transitionOrderWithInventory(
  operations: InventoryOperations,
  order: OrderToTransition,
  nextStatus: OrderStatus,
) {
  if (!canTransitionOrder(order.status, nextStatus)) {
    throw new OrderTransitionError("INVALID_TRANSITION");
  }

  if (nextStatus === "CANCELLED") {
    await operations.releaseStock(order.listingId, order.quantity);
  }

  if (!(await operations.updateStatus(order.id, order.status, nextStatus))) {
    throw new OrderTransitionError("CONCURRENT_UPDATE");
  }
}