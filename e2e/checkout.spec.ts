import { expect, test } from "@playwright/test";

test.skip(
  !process.env.STRIPE_SECRET_KEY,
  "Set STRIPE_SECRET_KEY to run the hosted checkout flow.",
);

test("customer pays for an item and sees the confirmed order", async ({ page }) => {
  const email = `buyer-${Date.now()}@example.com`;
  await page.goto("/account");
  await page.getByRole("tab", { name: "Crear cuenta" }).click();
  await page.getByLabel("Nombre").fill("Fish Buyer");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill("a-long-test-password");
  await page.getByLabel("Confirmar contraseña").fill("a-long-test-password");
  await page.getByRole("button", { name: "Crear mi cuenta" }).click();
  await expect(page).toHaveURL(/\/orders$/);

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "La lonja." })).toBeVisible();
  await page.locator(".market-add").first().click();
  await page.getByRole("link", { name: /Carrito/ }).click();
  await expect(page).toHaveURL(/\/cart$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Tu carrito" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Pagar con Stripe" }).click();
  await expect(page).toHaveURL(/checkout\.stripe\.com/);

  await page.getByLabel(/email/i).fill("buyer@example.com");
  await page.getByLabel(/card number/i).fill("4242424242424242");
  await page.getByLabel(/expiration/i).fill("1234");
  await page.getByLabel(/cvc/i).fill("123");
  await page.getByLabel(/country/i).selectOption({ label: "United States" });
  await page.getByRole("button", { name: /pay/i }).click();

  await expect(page).toHaveURL(/\/order\/success\?session_id=/, { timeout: 90_000 });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Gracias por elegir\nun poco de mar.",
  );
  await expect(page.getByText("Pedido", { exact: false })).toBeVisible();
});
