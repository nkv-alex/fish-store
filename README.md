# Pezcado

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

La tienda estará en [http://localhost:3000](http://localhost:3000). `npm run dev` mantiene Next.js en primer plano: no cierres esa terminal si quieres que la app siga activa. Para dejarla ejecutándose en segundo plano y reiniciarla si el contenedor falla, usa Docker Compose:

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f app
```

Para detenerla explícitamente, usa `docker compose down`. Para desarrollo local, `DATABASE_URL` y `DIRECT_URL` apuntan al PostgreSQL de Docker. En Neon, la app usa `DATABASE_URL` (conexión pooled) y Prisma CLI usa `DIRECT_URL` (conexión directa para migraciones); la selección del adaptador es automática por hostname.

### Autenticación

La ruta `/account` permite registrarse e iniciar sesión con correo y contraseña o con Google OAuth. Las contraseñas se guardan como hashes bcrypt (nunca reversiblemente cifradas ni en texto plano), y el formulario de registro pide confirmar la contraseña. Para Google, crea un OAuth client de tipo Web y configura `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `AUTH_SECRET` y `NEXTAUTH_URL=https://fish-store-jet.vercel.app` como variables en Vercel. En Google Cloud Console → **APIs & Services** → **Credentials** → tu OAuth client → **Authorized redirect URIs**, añade `https://fish-store-jet.vercel.app/api/auth/callback/google`; para desarrollo local añade `http://localhost:3000/api/auth/callback/google`. La URI debe usar el mismo dominio que `NEXTAUTH_URL` y no lleva barra final. Genera el secreto con `openssl rand -base64 32`. El login por contraseña funciona aunque Google no esté configurado. Es necesario iniciar sesión o crear una cuenta para comprar; los pedidos quedan asociados a la cuenta y aparecen en `/orders`.

Las páginas informativas están disponibles en `/privacy`, `/cookies` y `/terms`. Sus textos son un borrador basado en las funciones actuales de la aplicación. Antes de publicar o aceptar ventas, completa y verifica la identidad legal y contacto del titular, los territorios de venta y las condiciones de envío, desistimiento, devoluciones y reembolsos con asesoramiento adecuado.

### Conectar Neon con Vercel

1. En Vercel, abre el proyecto y ve a **Storage** → **Create Database** → **Neon Postgres**. Crea la base y conéctala a `fish-store` al menos para **Production** (y Preview si vas a usar esas vistas previas).
2. En Neon, abre **Connect** y copia las dos cadenas de la misma rama/base/rol. Usa la cadena **pooled** como `DATABASE_URL` y la cadena **direct** (sin `-pooler` en el host) como `DIRECT_URL`. Guárdalas en Vercel → **Settings** → **Environment Variables** para Production (y Preview si corresponde). No pongas las cadenas en el código ni las compartas públicamente.
3. Para crear el esquema y los productos iniciales, configura ambas variables en tu `.env` local (no sobrescribas las claves Stripe) y ejecuta:

   ```bash
   npm run db:deploy
   npm run db:seed
   ```

4. Deja el Build Command de Vercel en su valor predeterminado para que detecte `vercel-build`. En producción, ese script ejecuta `prisma migrate deploy` usando `DIRECT_URL` y luego el seed idempotente; las previews no escriben en la base de producción. Redeploya la aplicación. Comprueba `https://fish-store-jet.vercel.app/api/products`: debería responder con el catálogo en JSON.

Vercel/Neon no puede crear la base por el mero hecho de conocer la URL de la web; el paso de **Storage** requiere que inicies sesión y autorices la integración en tu cuenta. Si la integración completa ya añadió `DATABASE_URL`, añade manualmente `DIRECT_URL` desde Neon para que las migraciones usen una conexión directa.

Después de añadir o cambiar modelos Prisma, la migración se ejecutará automáticamente en el siguiente despliegue de producción. El seed actualiza el catálogo de demostración de forma idempotente y desactiva los productos de ejemplo anteriores sin borrar productos ni pedidos.

El formulario crea una sesión de Stripe Checkout; el cliente no envía precios y el total se calcula con datos de la base de datos. Usa las claves `sk_test_...` y `whsec_...` de Stripe; esta demo rechaza claves Stripe live. Para probar el webhook localmente, ejecuta `stripe listen --forward-to localhost:3000/api/webhooks/stripe` y copia el secreto que Stripe CLI imprime a `STRIPE_WEBHOOK_SECRET`. El pedido solo se marca como pagado tras validar el pago completado.

Al cambiar `prisma/schema.prisma`, genera una migración con `npm run db:migrate -- --name nombre_del_cambio`; aplica las migraciones pendientes localmente con `npm run db:deploy`.

Para levantar app y base de datos en contenedores:

```bash
docker compose up -d --build
```

El contenedor aplica las migraciones al iniciar y Compose lo reinicia si se detiene inesperadamente. Sigue su salida con `docker compose logs -f app`. Ejecuta el seed una vez después de que el servicio esté listo con `docker compose exec app npm run db:seed`.

## Pruebas y CI

```bash
npm test
npm run typecheck
npx playwright install chromium
npm run test:e2e
```

Vitest comprueba utilidades de carrito y rutas API. Playwright comprueba la presentación de productos sin recortar, la confirmación de contraseña y las páginas legales. También realiza el checkout real con tarjeta de prueba si `STRIPE_SECRET_KEY` y una base PostgreSQL con migraciones y seed están configurados. Para habilitar ese flujo de pago en GitHub Actions, configura el secreto `STRIPE_TEST_SECRET_KEY`; las demás pruebas de navegador se ejecutan aunque no esté configurado. La CI ejecuta typecheck, tests unitarios, pruebas de navegador y build; al hacer push a `main`, construye y publica la imagen en GitHub Container Registry.

Tarjeta de prueba Stripe: `4242 4242 4242 4242`, cualquier fecha futura y CVC de tres dígitos.

## Despliegue en AWS

El workflow publica `ghcr.io/<owner>/<repo>:latest`. Para AWS, usa ECS/ECS Express Mode y publica la imagen en ECR mediante una integración OIDC de GitHub Actions; App Runner solo está disponible para clientes actuales y no es la ruta recomendada para cuentas nuevas. Para un entorno real, provisiona PostgreSQL administrado, configura `DATABASE_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` y `NEXT_PUBLIC_APP_URL` como secretos/variables del servicio y configura el webhook HTTPS de Stripe. No uses claves de prueba en producción. El despliegue cloud requiere cuenta, permisos y secretos de AWS y se configura cuando estén disponibles.
