import { expect, test } from "@playwright/test";

test("product artwork is shown uncropped with its name and price overlaid", async ({ page }) => {
  await page.goto("/");

  const productImage = page.locator(".fish-card-image img").first();
  await expect(productImage).toBeVisible();
  await expect(productImage).toHaveCSS("object-fit", "contain");
  await expect(page.locator(".fish-card-info h3").first()).toBeVisible();
  await expect(page.locator(".fish-card-info .fish-price").first()).toBeVisible();
});

test("the full catalog displays nineteen large product cards", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Pescado" }).click();

  const cards = page.locator(".market-card");
  await expect(cards).toHaveCount(19);
  await expect(cards.first()).toBeInViewport();
  const imageBox = await cards.first().locator(".market-card-image").boundingBox();
  expect(imageBox?.height).toBeGreaterThan(200);
});

test("unknown routes and invalid checkout links show the branded 404 page", async ({ page }) => {
  for (const path of ["/this-page-does-not-exist", "/order/success"]) {
    const response = await page.goto(path);

    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole("heading", {
        name: "Esta página se ha perdido en el mar.",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Volver a la tienda" }),
    ).toHaveAttribute("href", "/");
    await expect(
      page.getByRole("link", { name: "Ver el pescado" }),
    ).toHaveAttribute("href", "/#lonja");
  }
});

test("language selector updates the page language and persists the choice", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Idioma").selectOption("fr");

  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await expect(page.locator(".hero h1")).toContainText("De la mer.");
  await expect
    .poll(() => page.evaluate(() => document.cookie))
    .toContain("fish-store-locale=fr");
});

test("floating chat opens and closes without requiring provider configuration", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Abrir chat de ayuda" }).click();

  await expect(page.getByRole("dialog")).toBeVisible();
  const chat = page.getByRole("dialog");
  await expect(chat.getByRole("heading", { name: "Ayuda de Pezcado" })).toBeVisible();
  await chat.getByRole("button", { name: "Cerrar chat" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("cart is a separate page and keeps products added from the collection", async ({ page }) => {
  await page.goto("/");
  await page.locator(".market-add").first().click();
  await page.getByRole("link", { name: /Carrito/ }).click();

  const cart = page.locator(".cart-page");
  await expect(cart).toBeVisible();
  await expect(cart.locator(".cart-item-list li")).toHaveCount(1);
  await expect(
    cart.getByRole("heading", { level: 1, name: "Tu carrito" }),
  ).toBeVisible();
  await cart.getByRole("button", { name: /Aumentar cantidad/ }).click();
  await expect(cart.locator(".cart-quantity-control span")).toHaveText("2");
  await page.reload();
  await expect(page.locator(".cart-quantity-control span")).toHaveText("2");
  await page.getByRole("button", { name: "Quitar" }).click();
  await expect(page.locator(".cart-empty-state")).toBeVisible();
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

test("account settings require an active account session", async ({ page }) => {
  await page.goto("/account/settings");

  await expect(page).toHaveURL(/\/account$/);
});

test("administrator panel is not accessible without an administrator session", async ({ page }) => {
  await page.goto("/admin/accounts");

  await expect(page).toHaveURL(/\/account$/);
});

test("load balancer health endpoints report process and database status", async ({ request }) => {
  const live = await request.get("/api/health/live");
  await expect(live).toBeOK();
  await expect(live.json()).resolves.toEqual({ status: "ok" });

  const ready = await request.get("/api/health/ready");
  await expect(ready).toBeOK();
  await expect(ready.json()).resolves.toEqual({ status: "ready" });
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

  await page.goto("/privacy");
  const privacyList = page.locator(".legal-content ul");
  await expect(privacyList).toHaveCSS("list-style-type", "none");
  await expect(privacyList.locator("li")).toHaveCount(5);
  await expect(privacyList.getByText(/Al crear una cuenta/)).toBeVisible();
});

test("optional anonymous metrics require consent and can be disabled later", async ({ page }) => {
  const metricRequests: string[] = [];
  await page.route("**/api/metrics", async (route) => {
    metricRequests.push(route.request().postData() ?? "");
    await route.fulfill({ status: 204 });
  });

  await page.goto("/privacy");
  await expect(page.getByRole("heading", { name: "Cookies con cabeza." })).toBeVisible();
  expect(metricRequests).toHaveLength(0);

  const consentedMetric = page.waitForRequest("**/api/metrics");
  await page.getByRole("button", { name: "Aceptar todas" }).click();
  await consentedMetric;
  expect(metricRequests).toEqual(['{"path":"/privacy"}']);
  await expect
    .poll(() => page.evaluate(() => document.cookie))
    .toContain("fish-store-cookie-consent=all");

  await page.getByRole("button", { name: "Cookies" }).click();
  await page.getByRole("checkbox", { name: /Métricas anónimas/ }).uncheck();
  await page.getByRole("button", { name: "Guardar selección" }).click();
  await page.goto("/terms");

  expect(metricRequests).toHaveLength(1);
  await expect
    .poll(() => page.evaluate(() => document.cookie))
    .toContain("fish-store-cookie-consent=essential");
});
