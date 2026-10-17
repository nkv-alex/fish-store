import { expect, test } from "@playwright/test";

test.skip(
  !process.env.STRIPE_SECRET_KEY,
  "Set STRIPE_SECRET_KEY to run the hosted checkout flow.",
);

test("customer pays for an item and sees the confirmed order", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "La colección" })).toBeVisible();
  await page.getByRole("button", { name: /Añadir a la bolsa/ }).first().click();
  await expect(page.getByRole("heading", { name: /Tu bolsa \(1\)/ })).toBeVisible();
  await page.getByLabel("Correo para la confirmación").fill("buyer@example.com");
  await page.getByRole("button", { name: "Continuar al pago" }).click();
  await expect(page).toHaveURL(/checkout\.stripe\.com/);

  await page.getByLabel(/email/i).fill("buyer@example.com");
  await page.getByLabel(/card number/i).fill("4242424242424242");
  await page.getByLabel(/expiration/i).fill("1234");
  await page.getByLabel(/cvc/i).fill("123");
  await page.getByLabel(/country/i).selectOption({ label: "United States" });
  await page.getByRole("button", { name: /pay/i }).click();

  await expect(page).toHaveURL(/\/order\/success\?session_id=/, { timeout: 90_000 });
  await expect(page.getByText("PAGO CONFIRMADO")).toBeVisible();
  await expect(page.getByText("Pedido", { exact: false })).toBeVisible();
});
