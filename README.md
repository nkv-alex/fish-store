# Marea Store

Tienda de ejemplo con Next.js, TypeScript, PostgreSQL, Prisma y Stripe Checkout en modo test.

## Modelo de datos

El schema Prisma está en [prisma/schema.prisma](./prisma/schema.prisma). `Product` guarda precio en unidades menores (centavos) y moneda; `Order` conserva correo, total, estado y referencia única de Stripe. `OrderItem` registra cantidad y precio unitario al comprar para preservar el importe histórico. `User` es opcional para el pedido, de modo que el checkout de ejemplo permite comprar como invitado.

## Requisitos

- Node.js 22+
- Docker y Docker Compose
- Una cuenta de Stripe para pagos de prueba

## Desarrollo local

1. Instala dependencias y prepara variables:

   ```bash
   npm ci
   cp .env.example .env
   ```

2. Arranca PostgreSQL:

   ```bash
   docker compose up -d db
   ```

3. Aplica migraciones, carga el catálogo y arranca Next.js:

   ```bash
   npm run db:generate
   npm run db:deploy
   npm run db:seed
   npm run dev
   ```

La tienda estará en [http://localhost:3000](http://localhost:3000). Para usar Neon, sustituye `DATABASE_URL` por la cadena de conexión pooled del proyecto y conserva `sslmode=require`. El formulario crea una sesión de Stripe Checkout; el cliente no envía precios y el total se calcula con datos de la base de datos. Usa las claves `sk_test_...` y `whsec_...` de Stripe; esta demo rechaza claves Stripe live. Para probar el webhook localmente, ejecuta `stripe listen --forward-to localhost:3000/api/webhooks/stripe` y copia el secreto que Stripe CLI imprime a `STRIPE_WEBHOOK_SECRET`. El pedido solo se marca como pagado tras validar el pago completado.

Al cambiar `prisma/schema.prisma`, genera una migración con `npm run db:migrate -- --name nombre_del_cambio`; aplica las migraciones pendientes localmente con `npm run db:deploy`.

Para levantar app y base de datos en contenedores:

```bash
docker compose up --build
```

El contenedor aplica las migraciones al iniciar. Ejecuta el seed una vez después de que el servicio esté listo con `docker compose exec app npm run db:seed`.

## Pruebas y CI

```bash
npm test
npm run typecheck
npx playwright install chromium
npm run test:e2e
```

Vitest comprueba utilidades de carrito y rutas API. Playwright realiza el checkout real con tarjeta de prueba si `STRIPE_SECRET_KEY` y una base PostgreSQL con migraciones y seed están configurados. Para habilitar ese E2E en GitHub Actions, configura el secreto `STRIPE_TEST_SECRET_KEY`. La CI ejecuta typecheck, tests y build; al hacer push a `main`, construye y publica la imagen en GitHub Container Registry.

Tarjeta de prueba Stripe: `4242 4242 4242 4242`, cualquier fecha futura y CVC de tres dígitos.

## Despliegue en AWS

El workflow publica `ghcr.io/<owner>/<repo>:latest`. Para AWS, usa ECS/ECS Express Mode y publica la imagen en ECR mediante una integración OIDC de GitHub Actions; App Runner solo está disponible para clientes actuales y no es la ruta recomendada para cuentas nuevas. Para un entorno real, provisiona PostgreSQL administrado, configura `DATABASE_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` y `NEXT_PUBLIC_APP_URL` como secretos/variables del servicio y configura el webhook HTTPS de Stripe. No uses claves de prueba en producción. El despliegue cloud requiere cuenta, permisos y secretos de AWS y se configura cuando estén disponibles.
