import { describe, expect, it } from "vitest";
import { canTransitionOrder } from "./order-workflow";

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