import { describe, expect, it } from "vitest";
import { canBuyerMarkPayment, canCancelOrderForPayment, canFarmerConfirmPayment, type PaymentWorkflowOrder } from "./payment-workflow";

const order = (overrides: Partial<PaymentWorkflowOrder> = {}): PaymentWorkflowOrder => ({
  paymentStatus: "INCOMPLETE",
  buyerPaymentMarkedAt: null,
  status: "PLACED",
  ...overrides,
});

describe("payment workflow", () => {
  it("requires a buyer-marked payment before farmer confirmation", () => {
    expect(canFarmerConfirmPayment(order())).toBe(false);
    expect(canFarmerConfirmPayment(order({ buyerPaymentMarkedAt: new Date(), status: "READY" }))).toBe(true);
  });

  it("only allows cash-on-pickup marking once the order is ready or picked up", () => {
    expect(canBuyerMarkPayment(order({ status: "ACCEPTED" }))).toBe(false);
    expect(canBuyerMarkPayment(order({ status: "READY" }))).toBe(true);
    expect(canFarmerConfirmPayment(order({ status: "COMPLETED", buyerPaymentMarkedAt: new Date() }))).toBe(true);
  });

  it("does not allow marking payments for cancelled or completed payments", () => {
    expect(canBuyerMarkPayment(order({ status: "CANCELLED" }))).toBe(false);
    expect(canFarmerConfirmPayment(order({ paymentStatus: "COMPLETED", buyerPaymentMarkedAt: new Date() }))).toBe(false);
  });

  it("prevents cancelling orders once a buyer has marked payment sent", () => {
    expect(canCancelOrderForPayment(order())).toBe(true);
    expect(canCancelOrderForPayment(order({ buyerPaymentMarkedAt: new Date() }))).toBe(false);
    expect(canCancelOrderForPayment(order({ paymentStatus: "COMPLETED" }))).toBe(false);
  });
});
