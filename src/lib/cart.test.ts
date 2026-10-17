import { describe, expect, it } from "vitest";
import { calculateTotal, isValidCart } from "./cart";

describe("cart helpers", () => {
  it("calculates totals in minor currency units", () => {
    expect(
      calculateTotal([
        { price: 3200, quantity: 2 },
        { price: 2400, quantity: 1 },
      ]),
    ).toBe(8800);
  });

  it("rejects empty, malformed, and excessive carts", () => {
    expect(isValidCart([])).toBe(false);
    expect(isValidCart([{ productId: "tee", quantity: 11 }])).toBe(false);
    expect(isValidCart([{ productId: "tee", quantity: 1 }])).toBe(true);
  });
});
