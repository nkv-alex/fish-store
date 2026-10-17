export type CartLine = {
  productId: string;
  quantity: number;
};

export function calculateTotal(
  lines: Array<{ price: number; quantity: number }>,
): number {
  return lines.reduce((total, line) => total + line.price * line.quantity, 0);
}

export function isValidCart(value: unknown): value is CartLine[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 50) {
    return false;
  }

  return value.every(
    (line) =>
      typeof line === "object" &&
      line !== null &&
      "productId" in line &&
      typeof line.productId === "string" &&
      line.productId.length > 0 &&
      line.productId.length <= 100 &&
      "quantity" in line &&
      typeof line.quantity === "number" &&
      Number.isInteger(line.quantity) &&
      line.quantity >= 1 &&
      line.quantity <= 10,
  );
}
