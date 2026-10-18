import { expect, test } from "@playwright/test";

test("product artwork is shown uncropped with its name and price overlaid", async ({ page }) => {
  await page.goto("/");

  const productImage = page.locator(".fish-card-image img").first();
  await expect(productImage).toBeVisible();
  await expect(productImage).toHaveCSS("object-fit", "contain");
  await expect(page.locator(".fish-card-info h3").first()).toBeVisible();
  await expect(page.locator(".fish-card-info .fish-price").first()).toBeVisible();
});

test("registration requires matching password confirmation", async ({ page }) => {
  await page.goto("/account");
  await page.getByRole("tab", { name: "Crear cuenta" }).click();
  await page.getByLabel("Nombre").fill("Browser Test");
  await page.getByLabel("Correo electrónico").fill("browser-test@example.com");
  await page.getByLabel("Contraseña", { exact: true }).fill("a-long-test-password");
  await page.getByLabel("Confirmar contraseña").fill("a-different-password");
  await page.getByRole("button", { name: "Crear mi cuenta" }).click();

  await expect(page.locator(".account-error")).toHaveText("Las contraseñas no coinciden.");
  await expect(page).toHaveURL(/\/account$/);
});

test("legal information pages are available", async ({ page }) => {
  const legalPages = [
    { path: "/privacy", heading: "Política de privacidad" },
    { path: "/cookies", heading: "Política de cookies" },
    { path: "/terms", heading: "Términos de servicio" },
  ];

  for (const { path, heading } of legalPages) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
  }
});
