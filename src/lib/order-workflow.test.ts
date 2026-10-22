import { describe, expect, it } from "vitest";
import { canTransitionOrder, transitionOrderWithInventory, type OrderStatus } from "./order-workflow";

describe("order status transitions", () => {
  it("allows the forward fulfillment path", () => {
    expect(canTransitionOrder("PLACED", "ACCEPTED")).toBe(true);
    expect(canTransitionOrder("ACCEPTED", "READY")).toBe(true);
    expect(canTransitionOrder("READY", "COMPLETED")).toBe(true);
  });

  it("allows cancellation before completion only", () => {
    expect(canTransitionOrder("PLACED", "CANCELLED")).toBe(true);
    expect(canTransitionOrder("READY", "CANCELLED")).toBe(true);
    expect(canTransitionOrder("COMPLETED", "CANCELLED")).toBe(false);
    expect(canTransitionOrder("CANCELLED", "ACCEPTED")).toBe(false);
  });

  it("rejects skipped or backwards fulfillment steps", () => {
    expect(canTransitionOrder("PLACED", "READY")).toBe(false);
    expect(canTransitionOrder("READY", "ACCEPTED")).toBe(false);
  });
});

describe("order inventory transitions", () => {
  const order = { id: "order-1", listingId: "listing-1", quantity: 4, status: "PLACED" as OrderStatus };

  function createOperations(stock: number) {
    let available = stock;
    const calls: string[] = [];
    const operations = {
      reserveStock: async (listingId: string, quantity: number) => {
        calls.push(`reserve:${listingId}:${quantity}`);
        if (available < quantity) return false;
        available -= quantity;
        return true;
      },
      releaseStock: async (listingId: string, quantity: number) => {
        calls.push(`release:${listingId}:${quantity}`);
        available += quantity;
      },
      updateStatus: async (orderId: string, from: OrderStatus, to: OrderStatus) => {
        calls.push(`status:${orderId}:${from}:${to}`);
        return true;
      },
    };
    return { operations, calls, get available() { return available; } };
  }

  it("does not reserve stock again when a farmer accepts an order", async () => {
    const state = createOperations(6);

    await transitionOrderWithInventory(state.operations, { ...order, stockReservedAt: new Date() }, "ACCEPTED");

    expect(state.available).toBe(6);
    expect(state.calls).toEqual(["status:order-1:PLACED:ACCEPTED"]);
  });

  it("reserves stock when accepting a legacy placed order", async () => {
    const state = createOperations(6);

    await transitionOrderWithInventory(state.operations, order, "ACCEPTED");

    expect(state.available).toBe(2);
    expect(state.calls).toEqual(["reserve:listing-1:4", "status:order-1:PLACED:ACCEPTED"]);
  });

  it("releases stock when a placed order is cancelled", async () => {
    const state = createOperations(2);

    await transitionOrderWithInventory(state.operations, { ...order, stockReservedAt: new Date() }, "CANCELLED");

    expect(state.available).toBe(6);
    expect(state.calls).toEqual(["release:listing-1:4", "status:order-1:PLACED:CANCELLED"]);
  });

  it("releases reserved stock when an accepted order is cancelled", async () => {
    const state = createOperations(2);

    await transitionOrderWithInventory(state.operations, { ...order, status: "ACCEPTED", stockReservedAt: new Date() }, "CANCELLED");

    expect(state.available).toBe(6);
    expect(state.calls).toEqual(["release:listing-1:4", "status:order-1:ACCEPTED:CANCELLED"]);
  });

  it("signals stale updates so the enclosing transaction can roll back inventory changes", async () => {
    const state = createOperations(6);
    state.operations.updateStatus = async () => false;

    await expect(transitionOrderWithInventory(state.operations, { ...order, stockReservedAt: new Date() }, "ACCEPTED"))
      .rejects.toMatchObject({ reason: "CONCURRENT_UPDATE" });
  });
});